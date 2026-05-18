const EventEmitter = require('events');

class AppEmitter extends EventEmitter {}

const emitter = new AppEmitter();

emitter.on('response_added', (data) => {
    const score = data.score !== undefined ? `${data.score}/${data.maxScore}` : 'без оцінки';
    console.log(`[EventEmitter][Log] Нова відповідь для форми "${data.formId}", результат: ${score}`);
});

emitter.on('response_added', (data) => {
    console.log(`[EventEmitter][Stats] Всього відповідей у черзі: ${data.queueSize}`);
});

emitter.on('form_created', (data) => {
    console.log(`[EventEmitter] Створено форму: "${data.title}" (${data.questionCount} питань)`);
});

function onFormDeleted(data) {
    console.log(`[EventEmitter] Форму видалено: ${data.formId}`);
}

emitter.on('form_deleted', onFormDeleted);

emitter.unsubscribeFormDeleted = () => {
    emitter.off('form_deleted', onFormDeleted);
    console.log('[EventEmitter] Відписано від form_deleted');
};

module.exports = emitter;
