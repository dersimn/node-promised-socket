const net = require('net');
const pEvent = require('p-event');

class PromisedSocket extends net.Socket {
    constructor(...args) {
        super(...args);

        this._connected = false;
        this.on('connect', () => {
            this._connected = true;
        });
        this.on('error', () => {
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

    writeRead(writeMessage, options) {
        if (options instanceof RegExp) {
            options = {
                finishRegexp: options,
                limit: Infinity
            };
        } else {
            options = options || {
                limit: 1
            };
        }

        return new Promise(async (resolve, reject) => {
            pEvent(this, 'error').then(error => {
                reject(this._encapsulateError(error));
            }).catch(error => {
                reject(this._encapsulateError(error));
            });

            pEvent(this, 'timeout').then(() => {
                reject(new Error('Socket timed out.'));
            }).catch(error => {
                reject(this._encapsulateError(error));
            });

            this.write(writeMessage);
            let message = '';
            const asyncIterator = pEvent.iterator(this, 'data', {
                limit: options.limit
            });
            for await (const event of asyncIterator) {
                message += event;
                if (options.finishRegexp instanceof RegExp && options.finishRegexp.test(event)) {
                    break;
                }
            }

            resolve(message);
        });
    }
}

module.exports = PromisedSocket;
