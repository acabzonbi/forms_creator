const fs = require('fs');
const path = require('path');

const LOG_PATH = path.join(__dirname, '../logs/app.log');

if (!fs.existsSync(path.dirname(LOG_PATH))) {
    fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
}

const LEVEL_ORDER = { DEBUG: 0, INFO: 1, ERROR: 2 };

function writeLog(entry) {
    const line = JSON.stringify(entry) + '\n';
    fs.appendFileSync(LOG_PATH, line);
    console.log(`[${entry.level}] ${entry.fn} (${entry.duration}ms)`);
}

function log(level = 'INFO') {
    return function (target) {
        const isAsync = target.constructor.name === 'AsyncFunction';

        if (isAsync) {
            const wrapper = async function (...args) {
                const start = Date.now();
                try {
                    const result = await target(...args);
                    if (LEVEL_ORDER[level] <= LEVEL_ORDER['INFO']) {
                        writeLog({
                            level,
                            fn: target.name || 'anonymous',
                            args: args.map(a => typeof a === 'object' ? '[object]' : a),
                            duration: Date.now() - start,
                            timestamp: new Date().toISOString()
                        });
                    }
                    return result;
                } catch (error) {
                    writeLog({
                        level: 'ERROR',
                        fn: target.name || 'anonymous',
                        error: error.message,
                        duration: Date.now() - start,
                        timestamp: new Date().toISOString()
                    });
                    throw error;
                }
            };
            Object.defineProperty(wrapper, 'name', { value: target.name });
            return wrapper;
        }

        const wrapper = function (...args) {
            const start = Date.now();
            try {
                const result = target(...args);
                if (LEVEL_ORDER[level] <= LEVEL_ORDER['INFO']) {
                    writeLog({
                        level,
                        fn: target.name || 'anonymous',
                        args: args.map(a => typeof a === 'object' ? '[object]' : a),
                        duration: Date.now() - start,
                        timestamp: new Date().toISOString()
                    });
                }
                return result;
            } catch (error) {
                writeLog({
                    level: 'ERROR',
                    fn: target.name || 'anonymous',
                    error: error.message,
                    duration: Date.now() - start,
                    timestamp: new Date().toISOString()
                });
                throw error;
            }
        };
        Object.defineProperty(wrapper, 'name', { value: target.name });
        return wrapper;
    };
}

module.exports = log;
