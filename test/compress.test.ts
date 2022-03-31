const { expect } = require('chai');
const { compress, decompress } = require('..');

const ZSTD_MAGIC_NUMBER = 0xfd_2f_b5_28;
const ZSTD_MAGIC_BYTES = new Uint8Array([0xfd, 0x2f, 0xb5, 0x28]);

describe('zstd-wasm', () => {
  it('should compress async', async () => {
    const data = await compress(Buffer.from('abc'));
    expect(data.slice(0, 4)).to.deep.equal(ZSTD_MAGIC_BYTES.reverse());
  });

  it('should decompress async', async () => {
    const input = new Uint8Array([0x28, 0xB5, 0x2F, 0xFD, 0x20, 0x03, 0x19, 0x00, 0x00, 0x61, 0x62, 0x63]);

    const data = await decompress(input);
    expect(Buffer.from(data).toString('utf8')).to.deep.equal('abc');
  });
});
