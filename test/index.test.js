const { expect } = require('chai');
const { encode, decode } = require('../index');

describe('zstd-wasm', () => {
  describe('#encode/#decode', () => {
    const buffer = Buffer.from('test');

    it('compresses the data', () => {
      expect(decode(encode(buffer))).to.deep.equal(buffer);
    });
  });
});
