import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseCrafts } from '../src/playground/wasi.ts';

const directory = resolve('public/playground-assets');
try {
  const [wasm, crafts] = await Promise.all([
    readFile(resolve(directory, 'carven.wasm')),
    readFile(resolve(directory, 'crafts.json'), 'utf8'),
    readFile(resolve(directory, 'LICENSE.txt')),
    readFile(resolve(directory, 'THIRD-PARTY-NOTICES.txt')),
  ]);
  await WebAssembly.compile(wasm);
  parseCrafts(JSON.parse(crafts));
  console.log('WASM compiler assets ready.');
} catch (error) {
  throw new Error(
    'WASM compiler assets are missing or invalid. Run pnpm playground:build before building the website.',
    { cause: error },
  );
}
