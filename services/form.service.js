const fs = require('fs');
const path = require('path');
const { randomUUID: uuid } = require('crypto');

const { asyncMap } = require('../labs/asyncArray');
const log = require('../labs/logger');
const emitter = require('../labs/eventEmitter');

const DATA_PATH = path.join(__dirname, '../data/forms.json');

function readForms() {
    try { return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8')); }
    catch { return []; }
}

function writeForms(forms) {
    fs.writeFileSync(DATA_PATH, JSON.stringify(forms, null, 2));
}

async function validateQuestion(q) {
    if (!q.text || !q.text.trim()) throw new Error('Питання не може бути порожнім');
    const type = ['single', 'multiple', 'text'].includes(q.type) ? q.type : 'text';
    return {
        id: q.id || uuid(),
        text: q.text.trim(),
        type,
        options: Array.isArray(q.options) ? q.options.filter(o => String(o).trim()) : [],
        correctAnswers: Array.isArray(q.correctAnswers)
            ? q.correctAnswers.filter(a => String(a).trim())
            : []
    };
}

const loggedValidate = log('DEBUG')(validateQuestion);

exports.getForms = (req, res) => {
    res.json(readForms());
};

exports.createForm = async (req, res) => {
    const forms = readForms();
    const { title, description = '', questions = [] } = req.body;

    if (!title || !title.trim()) {
        return res.status(400).json({ error: 'Заголовок обов\'язковий' });
    }

    let normalized;
    try {
        normalized = await asyncMap(questions, (q) => loggedValidate(q));
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }

    const newForm = {
        id: uuid(),
        title: title.trim(),
        description: description.trim(),
        questions: normalized,
        createdAt: new Date().toISOString()
    };

    forms.push(newForm);
    writeForms(forms);

    emitter.emit('form_created', {
        formId: newForm.id,
        title: newForm.title,
        questionCount: newForm.questions.length
    });

    res.json(newForm);
};

exports.getFormById = (req, res) => {
    const form = readForms().find(f => f.id === req.params.id);
    if (!form) return res.status(404).json({ error: 'Не знайдено' });
    res.json(form);
};

exports.deleteForm = (req, res) => {
    const forms = readForms();
    const exists = forms.find(f => f.id === req.params.id);
    if (!exists) return res.status(404).json({ error: 'Не знайдено' });

    writeForms(forms.filter(f => f.id !== req.params.id));

    try {
        const respPath = path.join(__dirname, '../data/responses.json');
        const responses = JSON.parse(fs.readFileSync(respPath, 'utf8'));
        fs.writeFileSync(respPath, JSON.stringify(
            responses.filter(r => r.formId !== req.params.id), null, 2
        ));
    } catch {}

    emitter.emit('form_deleted', { formId: req.params.id });

    res.json({ message: 'Видалено' });
};
