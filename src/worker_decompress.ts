import { parentPort } from 'worker_threads';
import { decompressSync, ZstdError } from './index.js';

if(!parentPort) {
    throw new ZstdError('Compress Worker has no parentPort');
}
parentPort.addListener('message', (data: Uint8Array) => {
    if(!parentPort) {
        throw new ZstdError('Compress Worker has no parentPort');
    }
    const output = decompressSync(data)
    parentPort.postMessage(output, [output.buffer])
})
parentPort.unref()
