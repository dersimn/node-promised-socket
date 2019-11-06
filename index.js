const net = require('net');
const pEvent = require('p-event');

class PromisedSocket extends net.Socket {
    constructor(...args) {
        super(...args);

        this._connected = false;
        this.on('connect', () => {
            this._connected = true;
        });
        this.on('error', err => {
            this._connected = false;
        });
        this.on('close', () => {
            this._connected = false;
        });

        return this;
    }

    get connected() {
        return this._connected;
    }

    async connect(...args) {
        return new Promise((resolve, reject) => {
            pEvent(this, 'connect').then(() => {
                resolve();
            }).catch((err) => {
                reject(err);
            });

            pEvent(this, 'timeout').then(() => {
                reject(new Error('Timeout while trying to conenct.'));
            }).catch((err) => {
                reject(err);
            });

            super.connect(...args);
        });
    }
    async writeReadUntil(writeMessage, finishRegex) {
        this.write(writeMessage);

        try {
            let message = '';
            const asyncIterator = pEvent.iterator(this, 'data');
            for await (const event of asyncIterator) {
                message += event;
                if (finishRegex.test(event)) break;
            }
            return message;
        } catch(err) {
            if (err instanceof Error) {
                throw err;
            } else {
                throw new Error(err);
            }
        }
    }
}

module.exports = PromisedSocket;