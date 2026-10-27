import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(root, process.env.CARVEN_SOURCE_DIR || '.deps/carven');
const sdk = resolve(root, process.env.WASI_SDK_PATH || '.deps/wasi-sdk');
const windows = process.platform === 'win32';
const wrapper = resolve(source, windows ? 'xmakew.ps1' : 'xmakew');

if (!existsSync(wrapper)) {
  throw new Error(
    `Compiler checkout not found at ${source}. Run pnpm sync or set CARVEN_SOURCE_DIR.`,
  );
}
if (!existsSync(resolve(sdk, 'share/wasi-sysroot/share/libc++/v1/std.cppm'))) {
  throw new Error(`WASI SDK not found at ${sdk}. Install it there or set WASI_SDK_PATH.`);
}

if (!process.env.CARVEN_SOURCE_DIR) {
  const compiler = JSON.parse(readFileSync(resolve(root, 'carven-version.json'), 'utf8'));
  const revision = execFileSync('git', ['-C', source, 'rev-parse', 'HEAD'], {
    encoding: 'utf8',
  }).trim();
  const changes = execFileSync('git', ['-C', source, 'status', '--porcelain'], {
    encoding: 'utf8',
  }).trim();
  if (revision !== compiler.revision || changes) {
    throw new Error('Compiler checkout differs from carven-version.json. Run pnpm sync.');
  }
}

console.log(`Building Playground from ${source}`);
const result = spawnSync(
  windows ? 'powershell.exe' : wrapper,
  windows ? ['-NoProfile', '-File', wrapper, 'build'] : ['build'],
  {
    cwd: root,
    env: { ...process.env, CARVEN_SOURCE_DIR: source, WASI_SDK_PATH: sdk },
    stdio: 'inherit',
  },
);
if (result.error) throw result.error;
process.exit(result.status ?? 1);
