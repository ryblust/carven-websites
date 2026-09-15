import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, join, extname } from 'node:path';
import { articles } from '../src/generated/manifest.ts';

const root = resolve('dist/client');
const base = `/${(process.env.BASE_PATH || '').replace(/^\/+|\/+$/g, '')}`.replace(/\/$/, '');
const failures = [];
const documents = new Map();

async function collect(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collect(path)));
    else if (extname(entry.name) === '.html') files.push(path);
  }
  return files;
}

function decode(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');
}

for (const file of await collect(root)) {
  const html = await readFile(file, 'utf8');
  documents.set(file, {
    html,
    ids: new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((match) => decode(match[1]))),
  });
  const h1Count = [...html.matchAll(/<h1(?:\s|>)/g)].length;
  if (h1Count !== 1) failures.push(`${file}: expected one h1, got ${h1Count}`);
  const expectedLanguage = file.slice(root.length).startsWith('/zh/') ? 'zh-CN' : 'en';
  if (!new RegExp(`<html[^>]* lang="${expectedLanguage}"`).test(html))
    failures.push(`${file}: incorrect document language, expected ${expectedLanguage}`);
  const titles = [...html.matchAll(/<title>([^<]+)<\/title>/g)];
  const descriptions = [
    ...html.matchAll(/<meta\s+name="description"\s+content="([^"]+)"\s*\/?>(?:<\/meta>)?/g),
  ];
  if (titles.length !== 1) failures.push(`${file}: expected one title, got ${titles.length}`);
  if (descriptions.length !== 1)
    failures.push(`${file}: expected one description, got ${descriptions.length}`);
  const route = file.slice(root.length).replace(/\/index\.html$/, '/');
  const article = articles[route];
  if (
    article &&
    (decode(titles[0]?.[1] ?? '') !== `${article.title} · Carven` ||
      decode(descriptions[0]?.[1] ?? '') !== article.description)
  ) {
    failures.push(`${file}: document metadata does not match its article`);
  }
}

let checked = 0;
for (const [file, { html }] of documents) {
  const relative = file.slice(root.length).replace(/\/index\.html$/, '/');
  const current = new URL(`${base}${relative}`, 'http://local.test');
  for (const [, raw] of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const reference = decode(raw);
    const target = new URL(reference, current);
    if (target.origin !== current.origin) continue;
    checked++;
    let pathname = decodeURIComponent(target.pathname);
    if (base && !pathname.startsWith(`${base}/`) && pathname !== base) {
      failures.push(`${file}: link escapes configured base: ${reference}`);
      continue;
    }
    pathname = pathname.slice(base.length);
    let targetFile = resolve(root, `.${pathname}`);
    if (!targetFile.startsWith(`${root}/`) && targetFile !== root) {
      failures.push(`${file}: link escapes output: ${reference}`);
      continue;
    }
    try {
      if ((await stat(targetFile)).isDirectory()) targetFile = join(targetFile, 'index.html');
      await stat(targetFile);
      if (target.hash && documents.has(targetFile)) {
        const id = decodeURIComponent(target.hash.slice(1));
        if (!documents.get(targetFile).ids.has(id))
          failures.push(`${file}: missing anchor ${reference}`);
      }
    } catch {
      failures.push(`${file}: missing local target ${reference}`);
    }
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(
    `Checked ${documents.size} pages and ${checked} local links/assets. No broken targets or anchors.`,
  );
}
