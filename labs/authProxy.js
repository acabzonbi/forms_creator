const https = require('https');
const http = require('http');
const crypto = require('crypto');

const GOOGLE_CLIENT_ID     = '824819519682-4vd1hm9bio3n99jsc7p5ftobhr1nergp.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = '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';
const REDIRECT_URI         = 'http://localhost:3000/auth/google/callback';

const GOOGLE_AUTH_URL  = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USER_URL  = 'https://www.googleapis.com/oauth2/v2/userinfo';

const sessions = new Map();

function httpsPost(url, data) {
    return new Promise((resolve, reject) => {
        const body = new URLSearchParams(data).toString(); 
        const parsed = new URL(url);

        const options = {
            hostname: parsed.hostname,
            path: parsed.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(body)
            }
        };

        const req = https.request(options, res => {
            let raw = '';
            res.on('data', chunk => (raw += chunk));
            res.on('end', () => {
                try { resolve(JSON.parse(raw)); }
                catch { reject(new Error('Невалідна відповідь від Google')); }
            });
        });

        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

function httpsGet(url, accessToken) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);

        const options = {
            hostname: parsed.hostname,
            path: parsed.pathname + parsed.search,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        };

        const req = https.request(options, res => {
            let raw = '';
            res.on('data', chunk => (raw += chunk));
            res.on('end', () => {
                try { resolve(JSON.parse(raw)); }
                catch { reject(new Error('Невалідна відповідь')); }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

class AuthProxy {

    getAuthUrl() {
        const params = new URLSearchParams({
            client_id:     GOOGLE_CLIENT_ID,
            redirect_uri:  REDIRECT_URI,
            response_type: 'code', 
            scope: 'openid email profile', 
            access_type: 'offline', 
        });

        return `${GOOGLE_AUTH_URL}?${params.toString()}`;
    }

    async exchangeCode(code) {
        console.log('[AuthProxy] Обмін code на токени...');

        const tokens = await httpsPost(GOOGLE_TOKEN_URL, {
            code,
            client_id:     GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            redirect_uri:  REDIRECT_URI,
            grant_type:    'authorization_code'
        });

        if (tokens.error) {
            throw new Error(`Google OAuth помилка: ${tokens.error_description}`);
        }

        console.log('[AuthProxy] Токени отримано');
        return tokens;
    }

    async getUserInfo(accessToken) {
        console.log('[AuthProxy] Отримуємо дані користувача...');

        const user = await httpsGet(GOOGLE_USER_URL, accessToken);

        console.log(`[AuthProxy] Користувач: ${user.email} ✓`);
        return user;
    }

    createSession(user, tokens) {
        const sessionId = crypto.randomBytes(32).toString('hex');
        sessions.set(sessionId, {
            user,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiresAt: Date.now() + (tokens.expires_in * 1000),
            requestCount: 0,
            createdAt: new Date().toISOString()
        });

        console.log(`[AuthProxy] Сесію створено для ${user.email}`);
        return sessionId;
    }

    getSession(sessionId) {
        return sessions.get(sessionId) || null;
    }

    deleteSession(sessionId) {
        sessions.delete(sessionId);
        console.log('[AuthProxy] Сесію видалено (вихід)');
    }

    async renewToken(sessionId) {
        const session = sessions.get(sessionId);
        if (!session?.refreshToken) throw new Error('Немає refresh token');

        console.log('[AuthProxy] Оновлення токена...');

        const tokens = await httpsPost(GOOGLE_TOKEN_URL, {
            client_id:     GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            refresh_token: session.refreshToken,
            grant_type:    'refresh_token'
        });

        if (tokens.error) throw new Error(`Помилка оновлення: ${tokens.error}`);

        session.accessToken = tokens.access_token;
        session.expiresAt   = Date.now() + (tokens.expires_in * 1000);
        sessions.set(sessionId, session);

        console.log('[AuthProxy] Токен оновлено');
        return tokens.access_token;
    }

    isTokenExpired(sessionId) {
        const session = sessions.get(sessionId);
        if (!session) return true;
        return Date.now() > session.expiresAt;
    }

    requireAuth() {
        return (req, res, next) => {
            const sessionId = this._getSessionId(req);
            const session   = sessionId ? this.getSession(sessionId) : null;

            if (!session) {
                if (req.path.startsWith('/api')) {
                    return res.status(401).json({
                        error: 'Потрібна авторизація',
                        loginUrl: '/auth/google'
                    });
                }
                return res.redirect('/login.html');
            }

            req.user      = session.user;
            req.sessionId = sessionId;

            session.requestCount++;
            sessions.set(sessionId, session);

            console.log(`[AuthProxy] Запит від ${session.user.email} (всього: ${session.requestCount})`);
            next();
        };
    }

    _getSessionId(req) {
        const cookieHeader = req.headers.cookie || '';
        const match = cookieHeader.match(/sessionId=([^;]+)/);
        return match ? match[1] : null;
    }

    getStats() {
        const all = [...sessions.entries()].map(([id, s]) => ({
            email:        s.user.email,
            name:         s.user.name,
            createdAt:    s.createdAt,
            requestCount: s.requestCount,
            tokenExpired: Date.now() > s.expiresAt
        }));
        return { activeSessions: sessions.size, sessions: all };
    }
}

module.exports = new AuthProxy();
