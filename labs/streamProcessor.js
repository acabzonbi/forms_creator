const fs = require('fs');
const path = require('path');
const readline = require('readline');

const LOG_PATH = path.join(__dirname, '../logs/app.log');

async function processLogs(onLine) {
    if (!fs.existsSync(LOG_PATH)) {
        console.warn('[StreamProcessor] Лог-файл відсутній:', LOG_PATH);
        return [];
    }

    const results = [];
    const stream = fs.createReadStream(LOG_PATH);
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

    for await (const line of rl) {
        if (!line.trim()) continue;
        try {
            const parsed = JSON.parse(line);
            results.push(parsed);
            if (onLine) onLine(parsed);
        } catch {
            if (onLine) onLine(line);
            results.push(line);
        }
    }

    return results;
}

module.exports = processLogs;
