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
        return new Promise(async (resolve, reject) => {
            // Process given options
            if (options instanceof RegExp) {
                options = {
                    breakCond: options
                };
            } else {
                options = options || {
                    limit: 1
                };
            }

            // Sanity check
            if (!('breakCond' in options) && !('limit' in options)) {
                reject(new Error('Either breakCond or limit must be specified.'));
            }

            // Set up rejection event Promises
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

            // Send out request and try to collect answer
            this.write(writeMessage, options.encoding);
            const asyncIterator = pEvent.iterator(this, 'data', options);
            let message = '';
            for await (const event of asyncIterator) {
                message += event;
                if (options.breakCond instanceof RegExp && options.breakCond.test(event)) {
                    break;
                }
            }

            resolve(message);
        });
    }
}

module.exports = PromisedSocket;
