import { parentPort } from 'worker_threads';
import { compressSync, ZstdError } from './index.js';

if(!parentPort) {
    throw new ZstdError('Compress Worker has no parentPort');
}
parentPort.addListener('message', (data) => {
    if(!parentPort) {
        throw new ZstdError('Compress Worker has no parentPort');
    }
    
    const output = compressSync(data)
    parentPort.postMessage(output, [output.buffer])
})
parentPort.unref()
