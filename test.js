const PromisedSocket = require('./index.js');
const socket = new PromisedSocket();
socket.setEncoding('ascii');
socket.setTimeout(3000);

(async () => {
    try {
        console.log('connected?', socket.connected);
        await socket.connect(3493, '10.30.21.11');
        console.log('connected?', socket.connected);

        console.log(await socket.writeReadUntil('LIST VAR eaton3s\n', /\nEND/));
        console.log(await socket.writeReadUntil('GET NUMLOGINS eaton3s\n', /\nEND/));
    } catch (error) {
        console.error('my error:', error, error instanceof Error);
    }
})();