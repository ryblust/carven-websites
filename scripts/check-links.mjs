import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, join, extname } from 'node:path';
import { plainInlineText } from '../src/lib/inline-code.ts';
import { articles } from '../src/generated/manifest.ts';
import { playgroundExamples } from '../src/playground/examples.ts';

const root = resolve('dist/client');
const base = `/${(process.env.BASE_PATH || '').replace(/^\/+|\/+$/g, '')}`.replace(/\/$/, '');
const failures = [];
const documents = new Map();

async function collect(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collect(path)));
    else if (['.html', '.css'].includes(extname(entry.name))) files.push(path);
  }
  return files;
}

function decode(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');
}

const outputFiles = await collect(root);
for (const file of outputFiles.filter((file) => extname(file) === '.html')) {
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
      decode(descriptions[0]?.[1] ?? '') !== plainInlineText(article.description))
  ) {
    failures.push(`${file}: document metadata does not match its article`);
  }
}

let checked = 0;
const references = new Map(
  [...documents].map(([file, { html }]) => [
    file,
    [...html.matchAll(/\b(?:href|src)="([^"]+)"/g)].map((match) => decode(match[1])),
  ]),
);
for (const file of outputFiles.filter((file) => extname(file) === '.css')) {
  const css = await readFile(file, 'utf8');
  references.set(
    file,
    [...css.matchAll(/url\(\s*(?:"([^"]+)"|'([^']+)'|([^\s)]+))\s*\)/g)].map(
      (match) => match[1] ?? match[2] ?? match[3],
    ),
  );
}
for (const [file, urls] of references) {
  const relative = file.slice(root.length).replace(/\/index\.html$/, '/');
  const current = new URL(`${base}${relative}`, 'http://local.test');
  for (const reference of urls) {
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
        const params = new URLSearchParams(id);
        const exampleLink =
          ['/playground/', '/zh/playground/'].includes(pathname) &&
          params.size === 1 &&
          playgroundExamples.some((example) => example.id === params.get('example'));
        if (!exampleLink && !documents.get(targetFile).ids.has(id))
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
