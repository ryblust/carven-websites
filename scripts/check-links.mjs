import { glob, readFile, stat } from 'node:fs/promises';
import { resolve, join, extname } from 'node:path';
import { htmlToDOM } from 'html-react-parser';
import { findAll, getElementsByTagName, textContent } from 'domutils';
import { plainInlineText } from '../src/lib/inline-code.ts';
import { articles } from '../src/generated/manifest.ts';
import { playgroundExamples } from '../src/playground/examples.ts';

const root = resolve('dist/client');
const base = `/${(process.env.BASE_PATH || '').replace(/^\/+|\/+$/g, '')}`.replace(/\/$/, '');
const failures = [];
const documents = new Map();

const outputFiles = await Array.fromAsync(glob('**/*.{html,css}', { cwd: root }), (file) =>
  join(root, file),
);
if (!outputFiles.includes(join(root, 'index.html'))) {
  throw new Error(
    `Website build output is missing at ${root}. Run pnpm build before checking links.`,
  );
}
for (const file of outputFiles.filter((file) => extname(file) === '.html')) {
  const html = await readFile(file, 'utf8');
  const dom = htmlToDOM(html);
  documents.set(file, {
    dom,
    ids: new Set(
      findAll((element) => Boolean(element.attribs.id), dom).map((element) => element.attribs.id),
    ),
  });
  const h1Count = getElementsByTagName('h1', dom).length;
  if (h1Count !== 1) failures.push(`${file}: expected one h1, got ${h1Count}`);
  const expectedLanguage = file.slice(root.length).startsWith('/zh/') ? 'zh-CN' : 'en';
  if (getElementsByTagName('html', dom)[0]?.attribs.lang !== expectedLanguage)
    failures.push(`${file}: incorrect document language, expected ${expectedLanguage}`);
  const titles = getElementsByTagName('title', dom);
  const descriptions = getElementsByTagName('meta', dom).filter(
    (element) => element.attribs.name === 'description',
  );
  if (titles.length !== 1) failures.push(`${file}: expected one title, got ${titles.length}`);
  if (descriptions.length !== 1)
    failures.push(`${file}: expected one description, got ${descriptions.length}`);
  const route = file.slice(root.length).replace(/\/index\.html$/, '/');
  const article = articles[route];
  if (
    article &&
    ((titles[0] ? textContent(titles[0]) : '') !== `${article.title} · Carven` ||
      descriptions[0]?.attribs.content !== plainInlineText(article.description))
  ) {
    failures.push(`${file}: document metadata does not match its article`);
  }
}

let checked = 0;
const references = new Map(
  [...documents].map(([file, { dom }]) => [
    file,
    findAll((element) => Boolean(element.attribs.href || element.attribs.src), dom).flatMap(
      (element) => [element.attribs.href, element.attribs.src].filter(Boolean),
    ),
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
