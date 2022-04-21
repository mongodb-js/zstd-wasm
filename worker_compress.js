const { parentPort, workerData } = require('worker_threads');
const { init, compress } = require('@bokuweb/zstd-wasm');

(async () => {
  await init();
  const output = compress(workerData);
  parentPort.postMessage(output);
})();
