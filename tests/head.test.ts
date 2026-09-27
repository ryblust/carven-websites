import { afterEach, describe, expect, it, vi } from 'vitest';
import { pageHead } from '../src/lib/head';
import { siteUrl } from '../src/lib/site-url';

afterEach(() => vi.unstubAllEnvs());

describe('published language alternatives', () => {
  it.each(['/', '/carven-websites/'])('keeps both locales and the sitemap on base %s', (base) => {
    vi.stubEnv('BASE_URL', base);
    vi.stubEnv('SITE_ORIGIN', 'https://example.com');

    const expected = [
      { rel: 'alternate', hrefLang: 'zh-CN', href: `https://example.com${base}zh/learn/` },
      { rel: 'alternate', hrefLang: 'en', href: `https://example.com${base}learn/` },
      { rel: 'alternate', hrefLang: 'x-default', href: `https://example.com${base}learn/` },
    ];
    expect(pageHead('Learn', 'Description', '/learn/').links).toEqual(expected);
    expect(pageHead('学习', '说明', '/zh/learn/').links).toEqual(expected);
    expect(siteUrl('/zh/learn/', base, 'https://example.com/')).toBe(
      `https://example.com${base}zh/learn/`,
    );
    expect(siteUrl('/learn/', base, 'https://example.com/')).toBe(
      `https://example.com${base}learn/`,
    );
    expect(pageHead(undefined, undefined, '/').links.map((link) => link.href)).toEqual([
      `https://example.com${base}zh/`,
      `https://example.com${base}`,
      `https://example.com${base}`,
    ]);
  });

  it('does not invent a published origin during local development', () => {
    vi.stubEnv('SITE_ORIGIN', '');
    const head = pageHead('Learn', 'Description', '/learn/');
    expect(head.links).toEqual([]);
    expect(head.meta).toEqual([
      { title: 'Learn · Carven' },
      { name: 'description', content: 'Description' },
    ]);
    expect(siteUrl('/learn/', '/carven-websites/')).toBeUndefined();
  });

  it('rejects SITE_URL values that are not public HTTP origins', () => {
    for (const origin of [
      'file:///tmp/site',
      'https://user:password@example.com',
      'https://example.com/docs/',
      'https://example.com/?token=private',
      'https://example.com/#fragment',
    ]) {
      expect(() => siteUrl('/learn/', '/', origin)).toThrow('SITE_URL must be an HTTP(S) origin');
    }
  });
});
