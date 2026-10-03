import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { parseCrafts, parseManifest } from '../../src/playground/wasi.ts';

const directory = resolve('public/playground-assets');
try {
  const manifest = parseManifest(
    JSON.parse(await readFile(resolve(directory, 'manifest.json'), 'utf8')),
  );
  for (const descriptor of [manifest.wasm, manifest.crafts]) {
    const bytes = await readFile(resolve(directory, descriptor.path));
    if (
      bytes.length !== descriptor.bytes ||
      createHash('sha256').update(bytes).digest('hex') !== descriptor.sha256
    ) {
      throw new Error(`${descriptor.path} does not match the compiler manifest.`);
    }
    if (descriptor === manifest.crafts) parseCrafts(JSON.parse(bytes.toString('utf8')));
  }
  console.log(`Verified browser compiler ${manifest.compilerRevision.slice(0, 8)}.`);
} catch (error) {
  throw new Error(
    'Browser compiler assets are missing or invalid. Run ./sitew playground:build before building the website.',
    { cause: error },
  );
}
