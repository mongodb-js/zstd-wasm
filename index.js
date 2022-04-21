const { promises } = require('fs');
const { join } = require('path');
const { Worker } = require('worker_threads');

let workerCompress;
let workerDecompress;

function encode(data) {
  if (workerCompress == null) {
    workerCompress = new Worker(join(__dirname, 'worker_compress.js'), {
      workerData: data
    });
    workerCompress.unref();
  }
  return new Promise((resolve, reject) => {
    workerCompress.on('message', resolve);
    workerCompress.on('error', reject);
  });
}

function decode(data) {
  if (workerDecompress == null) {
    workerDecompress = new Worker(join(__dirname, 'worker_decompress.js'), {
      workerData: data
    });
    workerDecompress.unref();
  }
  return new Promise((resolve, reject) => {
    workerDecompress.on('message', resolve);
    workerDecompress.on('error', reject);
  });
}

module.exports = { encode, decode };
