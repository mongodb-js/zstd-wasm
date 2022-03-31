namespace ZSTD {
    export type Pointer = number;
    export declare function _malloc(size: number): Pointer;
    export declare function _free(pointer: Pointer, size: number): void;
    export declare function _ZSTD_isError(code: number): boolean;
    export declare function _ZSTD_compressBound(size: number): number;
    export declare function _ZSTD_getFrameContentSize(src: Pointer, size: number): number;
    export declare function _ZSTD_compress(compressed: Pointer, bound: number, src: Pointer, size: number, level: number): number;
    export declare function _ZSTD_decompress(heap: Pointer, size: number, src: Pointer, destSize: number): number;
    export declare const HEAP8: Uint8Array;
    export declare const HEAPU8: Uint8Array;
    export declare var onRuntimeInitialized: () => void;
}

interface ZSTDModuleInit {
    (): Promise<typeof ZSTD>;
}

declare const init_module: ZSTDModuleInit;
export = init_module;
