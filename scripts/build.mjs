import { spawnSync } from 'node:child_process';
import { copyFile, rm } from 'node:fs/promises';

const run = (...args) => {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
};

run('scripts/verify-playground-assets.ts');
await rm('dist', { recursive: true, force: true });
run('scripts/content/main.ts');
run('node_modules/vite/bin/vite.js', 'build');
run('node_modules/typescript/bin/tsc', '--noEmit');
await copyFile('dist/client/404/index.html', 'dist/client/404.html');
console.log('Static website ready in dist/client/.');
