const express = require('express');
const cors = require('cors');

const formsRoutes = require('./routes/forms.routes');
const responsesRoutes = require('./routes/responses.routes');

const processLogs = require('./labs/streamProcessor');
const authProxy = require('./labs/authProxy');

const app = express();

app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());

app.get('/auth/google', (req, res) => {
    const url = authProxy.getAuthUrl();
    console.log('[Auth] Редірект на Google...');
    res.redirect(url);
});

app.get('/auth/google/callback', async (req, res) => {
    const { code, error } = req.query;

    if (error) {
        console.log('[Auth] Користувач відмінив вхід');
        return res.redirect('/login.html?error=cancelled');
    }

    try {
        const tokens = await authProxy.exchangeCode(code);

        const user = await authProxy.getUserInfo(tokens.access_token);

        const sessionId = authProxy.createSession(user, tokens);

        res.setHeader('Set-Cookie', `sessionId=${sessionId}; Path=/; HttpOnly; Max-Age=86400`);

        console.log(`[Auth] Успішний вхід: ${user.email}`);
        res.redirect('/');
    } catch (err) {
        console.error('[Auth] Помилка:', err.message);
        res.redirect('/login.html?error=auth_failed');
    }
});

app.get('/auth/logout', (req, res) => {
    const cookie    = req.headers.cookie || '';
    const match     = cookie.match(/sessionId=([^;]+)/);
    const sessionId = match ? match[1] : null;

    if (sessionId) authProxy.deleteSession(sessionId);

    res.setHeader('Set-Cookie', 'sessionId=; Path=/; Max-Age=0');
    res.redirect('/login.html');
});

app.get('/auth/me', (req, res) => {
    const cookie    = req.headers.cookie || '';
    const match     = cookie.match(/sessionId=([^;]+)/);
    const sessionId = match ? match[1] : null;
    const session   = sessionId ? authProxy.getSession(sessionId) : null;

    if (!session) return res.json({ loggedIn: false });

    res.json({
        loggedIn: true,
        user: {
            name:    session.user.name,
            email:   session.user.email,
            picture: session.user.picture
        }
    });
});

app.get('/auth/stats', (req, res) => {
    res.json(authProxy.getStats());
});


app.use(express.static('public'));
app.use('/api', authProxy.requireAuth());
app.use('/api/forms', formsRoutes);
app.use('/api/responses', responsesRoutes);

app.get('/api/logs', async (req, res) => {
    try {
        const logs = await processLogs();
        res.json({ count: logs.length, logs });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(3000, async () => {
    console.log('Сервер запущено: http://localhost:3000');
    console.log('Google OAuth: http://localhost:3000/auth/google\n');

    const logs = await processLogs();
    console.log(`[StreamProcessor] Прочитано ${logs.length} записів з лог-файлу\n`);
});
