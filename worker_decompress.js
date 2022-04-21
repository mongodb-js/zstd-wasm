const { parentPort, workerData } = require('worker_threads');
const { init, decompress } = require('@bokuweb/zstd-wasm');

(async () => {
  await init();
  const output = decompress(workerData);
  parentPort.postMessage(output);
})();
