import { mkdtemp, mkdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { createServer, type ViteDevServer } from 'vite';
import { contentPlugin } from '../scripts/content/vite';

const article = (body: string) =>
  `---\ntitle: Guide\ndescription: Example guide\nsection: philosophy\nsource: docs/guide.md\n---\n\n${body}\n`;

async function fixture(initialBody?: string) {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'carven-content-vite-')));
  await mkdir(join(root, 'src/content/zh'), { recursive: true });
  const writePair = async (name: string, body: string) => {
    await Promise.all(
      ['', 'zh/'].map((prefix) =>
        writeFile(join(root, 'src/content', `${prefix}${name}.md`), article(body)),
      ),
    );
  };
  if (initialBody !== undefined) await writePair('guide', initialBody);
  const server = await createServer({
    root,
    configFile: false,
    plugins: [contentPlugin()],
    server: { middlewareMode: true, watch: null, ws: false },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  let readId = 0;
  const html = async (name: string) => {
    const file = join(root, 'src/generated/articles', `${name}.ts`);
    const module = await import(/* @vite-ignore */ `${pathToFileURL(file).href}?read=${++readId}`);
    return module.default as string;
  };
  return { root, server, writePair, html };
}

async function change(server: ViteDevServer, event: string, file: string) {
  const send = vi.spyOn(server.ws, 'send').mockImplementation(() => {});
  try {
    server.watcher.emit('all', event, file);
    return await vi.waitFor(
      () => {
        expect(send).toHaveBeenCalled();
        return send.mock.calls[0]![0];
      },
      { timeout: 5000 },
    );
  } finally {
    send.mockRestore();
  }
}

describe('content development output', () => {
  it('publishes current content on startup and regenerates it after a server restart', async () => {
    const { root, server, writePair, html } = await fixture('Content before startup.');
    let restarted: ViteDevServer | undefined;
    try {
      expect(await html('guide')).toContain('Content before startup.');
      expect(await html('zh/guide')).toContain('Content before startup.');
      await server.close();
      await writePair('guide', 'Current content before restart.');
      restarted = await createServer({
        root,
        configFile: false,
        plugins: [contentPlugin()],
        server: { middlewareMode: true, watch: null, ws: false },
        optimizeDeps: { noDiscovery: true, include: [] },
      });
      expect(await html('guide')).toContain('Current content before restart.');
      expect(await html('guide')).not.toContain('Content before startup.');
      expect(await html('zh/guide')).toContain('Current content before restart.');
    } finally {
      await restarted?.close();
      await server.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('publishes authored additions, changes and removals before requesting a reload', async () => {
    const { root, server, writePair, html } = await fixture();
    try {
      await writePair('guide', 'Initial guide.');
      expect(await change(server, 'add', join(root, 'src/content/guide.md'))).toEqual({
        type: 'full-reload',
      });
      expect(await html('guide')).toContain('Initial guide.');
      expect(await html('zh/guide')).toContain('Initial guide.');

      await writePair('guide', 'Updated guide.');
      expect(await change(server, 'change', join(root, 'src/content/guide.md'))).toEqual({
        type: 'full-reload',
      });
      expect(await html('guide')).toContain('Updated guide.');
      expect(await html('guide')).not.toContain('Initial guide.');

      await writePair('second', 'Second guide.');
      await change(server, 'add', join(root, 'src/content/second.md'));
      await Promise.all(
        ['', 'zh/'].map((prefix) => rm(join(root, 'src/content', `${prefix}guide.md`))),
      );
      expect(await change(server, 'unlink', join(root, 'src/content/guide.md'))).toEqual({
        type: 'full-reload',
      });
      await expect(readFile(join(root, 'src/generated/articles/guide.ts'))).rejects.toMatchObject({
        code: 'ENOENT',
      });
      expect(await html('second')).toContain('Second guide.');
      const { articles } = await import(
        /* @vite-ignore */ pathToFileURL(join(root, 'src/generated/manifest.ts')).href
      );
      expect(Object.keys(articles)).toEqual(expect.arrayContaining(['/second/', '/zh/second/']));
      expect(articles).not.toHaveProperty('/guide/');
      expect(articles).not.toHaveProperty('/zh/guide/');
    } finally {
      await server.close();
      await rm(root, { recursive: true, force: true });
    }
  });

  it('reports an authored error without replacing content and reloads after a correction', async () => {
    const { root, server, writePair, html } = await fixture();
    const errors = vi.spyOn(server.config.logger, 'error').mockImplementation(() => {});
    try {
      await writePair('guide', 'Published guide.');
      await change(server, 'add', join(root, 'src/content/guide.md'));
      await writeFile(join(root, 'src/content/guide.md'), '# Missing frontmatter');
      expect(await change(server, 'change', join(root, 'src/content/guide.md'))).toMatchObject({
        type: 'error',
        err: { message: expect.stringContaining('Missing frontmatter') },
      });
      expect(await html('guide')).toContain('Published guide.');
      expect(errors).toHaveBeenCalledWith(expect.stringContaining('Missing frontmatter'));

      await writePair('guide', 'Corrected guide.');
      expect(await change(server, 'change', join(root, 'src/content/guide.md'))).toEqual({
        type: 'full-reload',
      });
      expect(await html('guide')).toContain('Corrected guide.');
    } finally {
      errors.mockRestore();
      await server.close();
      await rm(root, { recursive: true, force: true });
    }
  });
});
