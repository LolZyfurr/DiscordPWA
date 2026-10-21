export class Dispatcher {
    constructor() {
        this.callbacks = {};
        this.lastId = 0;
    }
    register(callback) {
        const id = 'ID_' + (++this.lastId);
        this.callbacks[id] = callback;
        return id;
    }
    dispatch(action) {
        for (let id in this.callbacks) {
            this.callbacks[id](action);
        }
    }
}

export const AppDispatcher = new Dispatcher();