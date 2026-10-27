import { existsSync, mkdirSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const localSource = process.env.CARVEN_SOURCE_DIR;
const compiler = JSON.parse(readFileSync(resolve(root, 'carven-version.json'), 'utf8'));
const source = resolve(root, localSource || '.deps/carven');
const windows = process.platform === 'win32';

function run(command, args, shell = false) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', shell });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (!localSource) {
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
  } else {
    mkdirSync(dirname(source), { recursive: true });
    run('git', ['init', source]);
    run('git', ['-C', source, 'remote', 'add', 'origin', 'https://github.com/ryblust/carven.git']);
  }

  run('git', ['-C', source, 'fetch', '--depth', '1', 'origin', compiler.revision]);
  run('git', ['-C', source, 'checkout', '--detach', 'FETCH_HEAD']);
  const revision = execFileSync('git', ['-C', source, 'rev-parse', 'HEAD'], {
    encoding: 'utf8',
  }).trim();
  if (revision !== compiler.revision)
    throw new Error('Fetched compiler does not match the pinned commit.');
}

for (const script of ['playground:build', 'build', 'test', 'check:links']) {
  run(windows ? 'pnpm.cmd' : 'pnpm', ['run', script], windows);
}
