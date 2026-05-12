const express = require('express');
const cors = require('cors');

const formsRoutes = require('./routes/forms.routes');
const responsesRoutes = require('./routes/responses.routes');

const processLogs = require('./labs/streamProcessor');
const AuthProxy = require('./labs/authProxy');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

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

app.get('/api/proxy-demo', async (req, res) => {
    const proxy = new AuthProxy({ token: 'demo-token-123', rateLimit: 10 });
    try {
        const data = await proxy.get('http://jsonplaceholder.typicode.com/todos/1');
        res.json({ source: 'через AuthProxy', data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(3000, async () => {
    console.log('Сервер запущено на порту 3000');
    console.log('\n[StreamProcessor] Читаємо попередні логи...');
    const logs = await processLogs();
    console.log(`[StreamProcessor] Прочитано ${logs.length} записів з лог-файлу\n`);
});
