const fs = require('fs');
const path = require('path');
const { randomUUID: uuid } = require('crypto');

const queue = require('../labs/priorityQueue');
const { asyncMap } = require('../labs/asyncArray');
const log = require('../labs/logger');
const emitter = require('../labs/eventEmitter');

const RESP_PATH = path.join(__dirname, '../data/responses.json');
const FORMS_PATH = path.join(__dirname, '../data/forms.json');

function readResponses() {
    try { return JSON.parse(fs.readFileSync(RESP_PATH, 'utf8')); }
    catch { return []; }
}

function readForms() {
    try { return JSON.parse(fs.readFileSync(FORMS_PATH, 'utf8')); }
    catch { return []; }
}

async function scoreAnswer(question, answer) {
    const correct = question.correctAnswers;
    if (!correct || correct.length === 0) return null;

    if (question.type === 'single') {
        return correct.includes(answer) ? 1 : 0;
    }
    if (question.type === 'multiple') {
        const userSet = new Set(Array.isArray(answer) ? answer : []);
        const corrSet = new Set(correct);
        return userSet.size === corrSet.size && [...corrSet].every(c => userSet.has(c)) ? 1 : 0;
    }
    if (question.type === 'text') {
        return correct.some(a =>
            a.toLowerCase().trim() === String(answer || '').toLowerCase().trim()
        ) ? 1 : 0;
    }
    return null;
}

const loggedScore = log('DEBUG')(scoreAnswer);

exports.sendResponse = async (req, res) => {
    const { formId } = req.params;
    const { answers } = req.body;

    if (!Array.isArray(answers)) {
        return res.status(400).json({ error: 'answers має бути масивом' });
    }

    const forms = readForms();
    const form = forms.find(f => f.id === formId);

    let score = 0;
    let maxScore = 0;

    if (form?.questions) {
        const scored = await asyncMap(form.questions, async (q) => {
            const answerObj = answers.find(a => a.questionId === q.id);
            if (!answerObj) return null;
            return loggedScore(q, answerObj.value);
        });

        scored.forEach(result => {
            if (result !== null) {
                maxScore++;
                score += result;
            }
        });
    }

    const response = {
        id: uuid(),
        formId,
        answers,
        score: maxScore > 0 ? score : undefined,
        maxScore: maxScore > 0 ? maxScore : undefined,
        createdAt: new Date().toISOString()
    };

    const responses = readResponses();
    responses.push(response);
    fs.writeFileSync(RESP_PATH, JSON.stringify(responses, null, 2));
    const priority = maxScore > 0 ? score / maxScore : 0;
    queue.enqueue(response, priority);
    emitter.emit('response_added', {
        formId,
        score: response.score,
        maxScore: response.maxScore,
        queueSize: queue.size
    });

    res.json({
        message: 'Збережено',
        score: response.score,
        maxScore: response.maxScore
    });
};

exports.getResponses = (req, res) => {
    const responses = readResponses();
    res.json(responses.filter(r => r.formId === req.params.formId));
};

exports.getNextInQueue = (req, res) => {
    const mode = req.query.mode || 'highest';
    const peeked = queue.peek(mode);
    if (!peeked) return res.json({ message: 'Черга порожня', size: 0 });
    res.json({ next: peeked, size: queue.size });
};
