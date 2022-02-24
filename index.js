const { promises } = require('fs');
const { init, compress, decompress } = require('@bokuweb/zstd-wasm');

function encode(buffer) {
  return compress(buffer);
}

function decode(buffer) {
  return decompress(buffer);
}

(async () => {
  await init();
})();

module.exports = { encode, decode };
