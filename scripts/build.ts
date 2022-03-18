import * as pkg from '../package.json';
import * as fs from 'fs/promises';
import { spawn } from 'child_process';
import { once } from 'events';
import { resolve, join } from 'path';

const canAccess = (path: string) => fs.access(path).then(() => true, () => false);

const run = async (command: string, options = {}) => {
    console.log('👩‍🔬', command)
    const parts = command.split(' ')
    const program = parts[0]
    const args = parts.slice(1)
    const child = spawn(program, args, { stdio: 'inherit', ...options })
    await once(child, 'exit');
}

const nativeDependencies = pkg['@@nativeDependencies'];
const EMSDK_REPO = nativeDependencies.emsdk.repository;
const EMSDK_TAG = nativeDependencies.emsdk.version;
const ZSTD_REPO = nativeDependencies.zstd.repository;
const ZSTD_TAG = nativeDependencies.zstd.version;

async function getEmsdk(workingDirectory: string) {
    const dir = join(workingDirectory, 'emsdk')
    if (await canAccess(dir)) {
        return dir
    }
    const gitDir = join(dir, '.git')
    await run(`git clone --depth=1 ${EMSDK_REPO} -b ${EMSDK_TAG} ${dir}`)
    await run(`git --git-dir=${gitDir} switch -c branch-${EMSDK_TAG}`)
    return dir
}

async function getZstd(workingDirectory: string) {
    const dir = join(workingDirectory, 'zstd')
    if (await canAccess(dir)) {
        return dir
    }
    const gitDir = join(dir, '.git')
    await run(`git clone --depth=1 ${ZSTD_REPO} -b ${ZSTD_TAG} ${dir}`)
    await run(`git --git-dir=${gitDir} switch -c branch-${ZSTD_TAG}`)
    return dir
}

const exportedFunctions = [
    '_ZSTD_isError',
    '_ZSTD_getFrameContentSize',
    '_ZSTD_compressBound',
    '_ZSTD_decompress',
    '_ZSTD_compress',
    '_malloc',
    '_free'
]

const compileCmd = (emcc: string, cPath: string) => [
    emcc,
    cPath,
    '-flto',
    ...['-o', './lib/zstd.js'],
    '-O3',
    ...['--memory-init-file', '0'],
    ...['-s', 'MODULARIZE', '-s', 'EXPORT_NAME=zstd'],
    ...['-s', 'WASM=1'],
    // ...['--post-js', './lib/zstd.js'],
    ...['-s', `EXPORTED_FUNCTIONS=${exportedFunctions.join(',')}`],
    ...['-s', 'EXPORTED_RUNTIME_METHODS=cwrap'],
    ...['-s', 'FILESYSTEM=0'],
    ...['-s', 'ALLOW_MEMORY_GROWTH=1'],
].join(' ')

async function main() {
    await run('npx tsc')

    const workingDirectory = resolve(__dirname, '..', 'build')
    if (!(await canAccess(workingDirectory))) {
        await fs.mkdir(workingDirectory)
    }
    const emsdkPath = await getEmsdk(workingDirectory)
    const zstdPath = await getZstd(workingDirectory)

    const emccBin = join(emsdkPath, 'upstream', 'emscripten', 'emcc')
    if (!(await canAccess(emccBin))) {
        await run(`${join(emsdkPath, 'emsdk')} install ${EMSDK_TAG}`, { cwd: emsdkPath })
        await run(`${join(emsdkPath, 'emsdk')} activate ${EMSDK_TAG}`, { cwd: emsdkPath })
    }

    const cDir = join(zstdPath, 'build', 'single_file_libs')
    const libDir = resolve(zstdPath, 'lib');
    const zstdC = join(cDir, 'zstd.c')
    if (!(await canAccess(zstdC))) {
        await run(`bash ./combine.sh -r ${libDir} -o zstd.c zstd-in.c`, { cwd: cDir })
    }

    await run(compileCmd(emccBin, zstdC))
    // await run('npx eslint ./lib/zstd.js --fix')
}

main().catch(error => {
    console.error('fatal:', error)
    process.exitCode = 1;
})
