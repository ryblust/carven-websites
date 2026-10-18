import { existsSync, mkdirSync, realpathSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const localSource = process.env.CARVEN_SOURCE_DIR;
const source = resolve(root, localSource || '.deps/carven');
const windows = process.platform === 'win32';
const env = { ...process.env, CARVEN_SOURCE_DIR: source };

function run(command, args, shell = false) {
  const result = spawnSync(command, args, { cwd: root, env, stdio: 'inherit', shell });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (!localSource) {
  let ref = 'HEAD';
  if (existsSync(source)) {
    const checkoutRoot = execFileSync('git', ['-C', source, 'rev-parse', '--show-toplevel'], {
      cwd: root,
      encoding: 'utf8',
    }).trim();
    if (realpathSync(checkoutRoot) !== realpathSync(source)) {
      throw new Error(`Compiler checkout is not a Git repository root: ${source}.`);
    }
    const changes = execFileSync('git', ['-C', source, 'status', '--porcelain'], {
      cwd: root,
      encoding: 'utf8',
    });
    if (changes.trim()) {
      throw new Error(
        `Compiler checkout has local changes at ${source}. Keep or move them before syncing.`,
      );
    }

    run('git', ['-C', source, 'fetch', '--depth', '1', 'origin', 'main']);
    ref = 'FETCH_HEAD';
  } else {
    mkdirSync(dirname(source), { recursive: true });
    run('git', [
      'clone',
      '--depth',
      '1',
      '--branch',
      'main',
      'https://github.com/ryblust/carven.git',
      source,
    ]);
  }

  run('git', ['-C', source, 'checkout', '--detach', ref]);
}

for (const script of ['playground:build', 'build', 'test', 'check:links']) {
  run(windows ? 'pnpm.cmd' : 'pnpm', ['run', script], windows);
}
