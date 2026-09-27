import { afterEach, describe, expect, it, vi } from 'vitest';
import { pageHead } from '../src/lib/head';
import { siteUrl } from '../src/lib/site-url';

afterEach(() => vi.unstubAllEnvs());

describe('published language alternatives', () => {
  it.each(['/', '/carven-websites/'])('publishes reciprocal language links on base %s', (base) => {
    vi.stubEnv('BASE_URL', base);
    vi.stubEnv('SITE_ORIGIN', 'https://example.com');

    const expected = [
      { rel: 'alternate', hrefLang: 'zh-CN', href: `https://example.com${base}zh/learn/` },
      { rel: 'alternate', hrefLang: 'en', href: `https://example.com${base}learn/` },
      { rel: 'alternate', hrefLang: 'x-default', href: `https://example.com${base}learn/` },
    ];
    for (const path of ['/learn/', '/zh/learn/']) {
      const { links } = pageHead(undefined, undefined, path);
      expect(links).toHaveLength(expected.length);
      expect(links).toEqual(expect.arrayContaining(expected));
    }
    for (const path of ['/', '/zh/']) {
      const { links } = pageHead(undefined, undefined, path);
      expect(links).toHaveLength(3);
      expect(links).toEqual(
        expect.arrayContaining([
          { rel: 'alternate', hrefLang: 'zh-CN', href: `https://example.com${base}zh/` },
          { rel: 'alternate', hrefLang: 'en', href: `https://example.com${base}` },
          { rel: 'alternate', hrefLang: 'x-default', href: `https://example.com${base}` },
        ]),
      );
    }
  });

  it('does not invent a published origin during local development', () => {
    vi.stubEnv('SITE_ORIGIN', '');
    expect(pageHead(undefined, undefined, '/learn/').links).toEqual([]);
  });

  it('omits page-specific alternatives when no route is provided', () => {
    vi.stubEnv('SITE_ORIGIN', 'https://example.com');
    expect(pageHead().links).toEqual([]);
  });
});

describe('public site URLs', () => {
  it.each(['https://example.com', 'http://example.com:8080'])(
    'accepts HTTP(S) origin %s with or without a trailing slash',
    (origin) => {
      for (const input of [origin, `${origin}/`]) {
        expect(siteUrl('/learn/', '/', input)).toBe(`${origin}/learn/`);
        expect(siteUrl('/zh/learn/', '/docs/', input)).toBe(`${origin}/docs/zh/learn/`);
      }
    },
  );

  it('leaves publication URLs absent when no origin is configured', () => {
    expect(siteUrl('/learn/', '/docs/')).toBeUndefined();
    expect(siteUrl('/learn/', '/docs/', '')).toBeUndefined();
  });

  it.each([
    'not-a-url',
    '/relative-origin',
    'file:///tmp/site',
    'https://user:password@example.com',
    'https://example.com/docs/',
    'https://example.com/?token=private',
    'https://example.com/#fragment',
  ])('rejects an invalid publication origin: %s', (origin) => {
    expect(() => siteUrl('/learn/', '/', origin)).toThrow();
  });
});
