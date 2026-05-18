class PriorityQueue {
    constructor() {
        this.items = [];
    }

    enqueue(item, priority) {
        this.items.push({ item, priority, insertedAt: Date.now() });
    }

    dequeue(mode = 'highest') {
        if (this.items.length === 0) return null;
        const sorted = this._getSorted(mode);
        const target = sorted[0];
        this.items = this.items.filter(i => i !== target);
        return target;
    }

    peek(mode = 'highest') {
        if (this.items.length === 0) return null;
        return this._getSorted(mode)[0];
    }

    _getSorted(mode) {
        const copy = [...this.items];
        switch (mode) {
            case 'highest': return copy.sort((a, b) => b.priority - a.priority);
            case 'lowest':  return copy.sort((a, b) => a.priority - b.priority);
            case 'oldest':  return copy.sort((a, b) => a.insertedAt - b.insertedAt);
            case 'newest':  return copy.sort((a, b) => b.insertedAt - a.insertedAt);
            default: throw new Error(`Невідомий режим: "${mode}". Доступні: highest, lowest, oldest, newest`);
        }
    }

    get size() {
        return this.items.length;
    }
}

module.exports = new PriorityQueue();
