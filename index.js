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

    _encapsulateError(err) {
        if (err instanceof Error) {
            return err;
        }

        return new Error(err);
    }

    connect(...args) {
        return new Promise((resolve, reject) => {
            pEvent(this, 'connect').then(() => {
                resolve();
            }).catch(error => {
                reject(this._encapsulateError(error));
            });

            pEvent(this, 'timeout').then(() => {
                reject(new Error('Timeout while trying to conenct.'));
            }).catch(error => {
                reject(this._encapsulateError(error));
            });

            super.connect(...args);
        });
    }

    writeReadUntil(writeMessage, finishRegex) {
        return new Promise(async (resolve, reject) => {
            pEvent(this, 'error').then(err => {
                reject(this._encapsulateError(err));
            }).catch(error => {
                reject(new Error('Unkown error.'));
            });

            pEvent(this, 'timeout').then(() => {
                reject(new Error('Socket timed out.'));
            }).catch(error => {
                reject(new Error('Unkown error.'));
            });

            this.write(writeMessage);
            let message = '';
            const asyncIterator = pEvent.iterator(this, 'data');
            for await (const event of asyncIterator) {
                message += event;
                if (finishRegex.test(event)) {
                    break;
                }
            }

            resolve(message);
        });
    }
}

module.exports = PromisedSocket;
