import { fork } from 'node:child_process';
import { mkdir, open, readFile, writeFile, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const directory = fileURLToPath(new URL('../', import.meta.url));
const stateFile = new URL('../.site/dev.json', import.meta.url);
const command = process.argv[2] || 'start';
const saved = await readFile(stateFile, 'utf8')
  .then(JSON.parse)
  .catch(() => undefined);
const alive =
  saved &&
  (await fetch(new URL('_carven/dev', saved.url), { signal: AbortSignal.timeout(1500) })
    .then((response) => response.json())
    .then((state) => state.project === 'carven-website' && state.pid === saved.pid)
    .catch(() => false));

if (command === 'stop') {
  if (alive) {
    const response = await fetch(new URL('_carven/dev', saved.url), {
      method: 'POST',
      headers: { 'x-carven-preview-token': saved.token },
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) throw new Error(`Could not stop preview: ${response.status}`);
  }
  await rm(stateFile, { force: true });
  console.log('Carven preview stopped.');
} else if (command === 'status') {
  console.log(alive ? `Carven preview: ${saved.url}` : 'Carven preview is not running.');
} else if (alive) {
  console.log(`Carven preview already running: ${saved.url}`);
} else {
  await mkdir(new URL('../.site/', import.meta.url), { recursive: true });
  const log = await open(new URL('../.site/dev.log', import.meta.url), 'a');
  const token = randomUUID();
  const child = fork(fileURLToPath(new URL('./dev-worker.mjs', import.meta.url)), [], {
    cwd: directory,
    detached: true,
    stdio: ['ignore', log.fd, log.fd, 'ipc'],
    env: { ...process.env, CARVEN_DEV_TOKEN: token },
  });
  try {
    const ready = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        child.kill();
        reject(new Error('Preview startup timed out; see .site/dev.log'));
      }, 30000);
      child.once('message', (message) => {
        clearTimeout(timeout);
        message.ready ? resolve(message) : reject(new Error(message.error));
      });
      child.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      child.once('exit', (code) => {
        clearTimeout(timeout);
        reject(new Error(`Preview exited (${code}); see .site/dev.log`));
      });
    });
    await writeFile(stateFile, JSON.stringify({ pid: child.pid, url: ready.url, token }), {
      mode: 0o600,
    });
    child.disconnect();
    child.unref();
    console.log(`Carven preview: ${ready.url}\nStop: ./sitew stop`);
  } finally {
    await log.close();
  }
}
