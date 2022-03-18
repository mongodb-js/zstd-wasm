import ZSTDModuleInit = require('./zstd.js');
import { isUint8Array } from 'util/types';
import { Buffer } from 'buffer';
import { Worker } from 'worker_threads';
import { join } from 'path';
import { once } from 'events';

export type Pointer = number;

let zstd: any = null;

export async function init() {
  if (zstd != null) {
    return zstd;
  }
  zstd = await ZSTDModuleInit();
  return zstd;
}

export class ZstdError extends Error {
  get name() {
    return 'ZstdError'
  }
}

function isError(code: number) {
  return zstd._ZSTD_isError(code);
}

function compressBound (size: number)  {
  const bound = zstd['_ZSTD_compressBound'];
  return bound(size);
}

export function compressSync(buf: Uint8Array, level = 3) {
  if (!isUint8Array(buf) && !Buffer.isBuffer(buf)) {
    throw new ZstdError('Must provide Buffer or Uint8Array');
  }

  const bound = compressBound(buf.byteLength);
  const malloc = zstd['_malloc'];
  const compressed = malloc(bound);
  const src = malloc(buf.byteLength);
  zstd.HEAP8.set(buf, src);
  const free = zstd['_free'];
  try {
    /*
      @See https://zstd.docsforge.com/dev/api/ZSTD_compress/
      size_t ZSTD_compress( void* dst, size_t dstCapacity, const void* src, size_t srcSize, int compressionLevel);
      Compresses `src` content as a single zstd compressed frame into already allocated `dst`.
      Hint : compression runs faster if `dstCapacity` >=  `ZSTD_compressBound(srcSize)`.
      @return : compressed size written into `dst` (<= `dstCapacity),
                or an error code if it fails (which can be tested using ZSTD_isError()).
    */
    const _compress = zstd['_ZSTD_compress'];
    const sizeOrError = _compress(compressed, bound, src, buf.byteLength, level ?? 3);
    if (isError(sizeOrError)) {
      throw new ZstdError(`Failed to compress with code ${sizeOrError}`);
    }
    // Copy buffer
    // Uint8Array.prototype.slice() return copied buffer.
    const data = new Uint8Array(zstd.HEAPU8.buffer, compressed, sizeOrError).slice();
    free(compressed, bound);
    free(src, buf.byteLength);
    return data;
  } catch (e: unknown) {
    free(compressed, bound);
    free(src, buf.byteLength);
    throw new ZstdError(String(e));
  }
}

function getFrameContentSize(src: Pointer, size: number) {
  const getSize = zstd['_ZSTD_getFrameContentSize'];
  return getSize(src, size);
}

// Use 1MB on default if it is failed to get content size.
export function decompressSync (buf: Uint8Array, opts = { defaultHeapSize: 1024 * 1024 }) {
  if (!isUint8Array(buf) && !Buffer.isBuffer(buf)) {
    throw new ZstdError('Must provide Buffer or Uint8Array');
  }

  const malloc = zstd['_malloc'];
  const src = malloc(buf.byteLength);
  zstd
  zstd.HEAP8.set(buf, src);
  const contentSize = getFrameContentSize(src, buf.byteLength);
  const size = contentSize === -1 ? opts.defaultHeapSize : contentSize;
  const free = zstd['_free'];
  const heap = malloc(size);
  try {
    /*
      @See https://zstd.docsforge.com/dev/api/ZSTD_decompress/
      compressedSize : must be the exact size of some number of compressed and/or skippable frames.
      dstCapacity is an upper bound of originalSize to regenerate.
      If user cannot imply a maximum upper bound, it's better to use streaming mode to decompress data.
      @return: the number of bytes decompressed into dst (<= dstCapacity), or an errorCode if it fails (which can be tested using ZSTD_isError()).
    */
    const _decompress = zstd['_ZSTD_decompress'];
    const sizeOrError = _decompress(heap, size, src, buf.byteLength);
    if (isError(sizeOrError)) {
      throw new ZstdError(`Failed to compress with code ${sizeOrError}`);
    }
    // Copy buffer
    // Uint8Array.prototype.slice() return copied buffer.
    const data = new Uint8Array(zstd.HEAPU8.buffer, heap, sizeOrError).slice();
    free(heap, size);
    free(src, buf.byteLength);
    return data;
  } catch (e) {
    free(heap, size);
    free(src, buf.byteLength);
    throw new ZstdError(String(e));
  }
}

let workerCompress: Worker;
let workerDecompress: Worker;

export async function compress(data: Uint8Array): Promise<Uint8Array> {
  await init();
  if (workerCompress == null) {
    workerCompress = new Worker(join(__dirname, 'worker_compress.js'))
    workerCompress.unref()
  }
  const ownedBuffer = Buffer.allocUnsafeSlow(data.byteLength);
  ownedBuffer.set(data, 0);
  workerCompress.postMessage(ownedBuffer, [ownedBuffer.buffer])
  const [output] = await once(workerCompress, 'message')
  return output
}

export async function decompress(data: Uint8Array): Promise<Uint8Array> {
  await init();
  if (workerDecompress == null) {
    workerDecompress = new Worker(join(__dirname, 'worker_decompress.js'))
    workerDecompress.unref()
  }
  const ownedBuffer = Buffer.allocUnsafeSlow(data.byteLength);
  ownedBuffer.set(data, 0);
  workerDecompress.postMessage(ownedBuffer, [ownedBuffer.buffer])
  const [output] = await once(workerDecompress, 'message')
  return output
}
