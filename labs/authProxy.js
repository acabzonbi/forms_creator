const https = require('https');
const http = require('http');

class AuthProxy {
    constructor({ token, tokenType = 'Bearer', rateLimit = 60 } = {}) {
        this.token = token;
        this.tokenType = tokenType;
        this._rateLimit = rateLimit;
        this._requestTimestamps = [];
    }

    _checkRateLimit() {
        const now = Date.now();
        this._requestTimestamps = this._requestTimestamps.filter(t => now - t < 60_000);
        if (this._requestTimestamps.length >= this._rateLimit) {
            throw new Error(`[AuthProxy] Перевищено ліміт: ${this._rateLimit} запитів/хв`);
        }
        this._requestTimestamps.push(now);
    }

    _buildHeaders(extra = {}) {
        return {
            'Authorization': `${this.tokenType} ${this.token}`,
            'Content-Type': 'application/json',
            ...extra
        };
    }

    _request(method, url, body = null) {
        this._checkRateLimit();

        const parsed = new URL(url);
        const lib = parsed.protocol === 'https:' ? https : http;
        const payload = body ? JSON.stringify(body) : null;

        console.log(`[AuthProxy] ${method} ${url}`);

        return new Promise((resolve, reject) => {
            const options = {
                method,
                hostname: parsed.hostname,
                port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
                path: parsed.pathname + parsed.search,
                headers: this._buildHeaders(
                    payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}
                )
            };

            const req = lib.request(options, res => {
                let data = '';
                res.on('data', chunk => (data += chunk));
                res.on('end', () => {
                    if (res.statusCode === 401) {
                        reject(new Error('[AuthProxy] 401 — токен недійсний або застарів'));
                    } else {
                        try { resolve(JSON.parse(data)); }
                        catch { resolve(data); }
                    }
                });
            });

            req.on('error', reject);
            if (payload) req.write(payload);
            req.end();
        });
    }

    get(url)           { return this._request('GET', url); }
    post(url, body)    { return this._request('POST', url, body); }
    put(url, body)     { return this._request('PUT', url, body); }
    delete(url)        { return this._request('DELETE', url); }

    async renewToken(refreshFn) {
        console.log('[AuthProxy] Оновлення токена...');
        this.token = await refreshFn();
        console.log('[AuthProxy] Токен оновлено');
    }
}

module.exports = AuthProxy;
