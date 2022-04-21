const { expect } = require('chai');
const { encode, decode } = require('../index');

describe('zstd-wasm', () => {
  describe('#encode/#decode', () => {
    const buffer = Buffer.from('test');

    it('compresses the data', async () => {
      const encoded = await encode(buffer);
      expect(await decode(encoded)).to.deep.equal(buffer);
    });
  });
});
