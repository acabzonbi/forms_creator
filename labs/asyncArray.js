
// Promise version
function asyncMap(array, asyncFn, signal) {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) {
            return reject(new Error('Скасовано до початку'));
        }

        const onAbort = () => reject(new Error('asyncMap скасовано'));
        signal?.addEventListener('abort', onAbort, { once: true });

        Promise.all(
            array.map((item, index) => {
                if (signal?.aborted) return Promise.reject(new Error('Скасовано'));
                return asyncFn(item, index);
            })
        )
        .then(result => {
            signal?.removeEventListener('abort', onAbort);
            resolve(result);
        })
        .catch(err => {
            signal?.removeEventListener('abort', onAbort);
            reject(err);
        });
    });
}


// Callback version
function callbackMap(array, asyncFn, done, signal) {
    if (signal?.aborted) return done(null, new Error('Скасовано до початку'));

    const results = new Array(array.length);
    let completed = 0;
    let aborted = false;

    signal?.addEventListener('abort', () => {
        aborted = true;
        done(null, new Error('callbackMap скасовано'));
    }, { once: true });

    array.forEach((item, index) => {
        asyncFn(item, index, (value) => {
            if (aborted) return;
            results[index] = value;
            completed++;
            if (completed === array.length) done(results, null);
        });
    });
}

async function demo() {
    const questions = ['Питання 1', 'Питання 2', 'Питання 3'];

    const validated = await asyncMap(questions, async (q, i) => {
        return { index: i, text: q, valid: q.trim().length > 0 };
    });
    console.log('[asyncMap] Результат:', validated);

    callbackMap(questions, (q, i, cb) => {
        cb({ index: i, text: q, length: q.length });
    }, (results, err) => {
        if (err) return console.error('[callbackMap] Помилка:', err.message);
        console.log('[callbackMap] Результат:', results);
    });

    const controller = new AbortController();
    setTimeout(() => controller.abort(), 10);

    try {
        await asyncMap(['a', 'b', 'c'], async (item) => {
            await new Promise(r => setTimeout(r, 100));
            return item.toUpperCase();
        }, controller.signal);
    } catch (err) {
        console.log('[asyncMap] Скасовано:', err.message);
    }
}

module.exports = { asyncMap, callbackMap, demo };
