const express = require('express');
const path = require('path');
const formsRouter = require('./routes/forms');
const responsesRouter = require('./routes/responses');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.use('/api/forms', formsRouter);
app.use('/api/responses', responsesRouter);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/index.html'));
});

app.get('/form/:id', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/fill.html'));
});

app.get('/form/:id/results', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/results.html'));
});

app.listen(PORT, () => {
  console.log(`SimpleForm running at http://localhost:${PORT}`);
});

module.exports = app;
