import { describe, it, assert } from 'vitest';
import { articles, articlePaths } from '../src/generated/manifest';
import { localizedPath, localeOf, pathWithoutBase } from '../src/lib/i18n';

describe('bilingual navigation', () => {
  it('round-trips every article without falling back to the home page', () => {
    for (const path of articlePaths) {
      const targetLocale = localeOf(path) === 'en' ? 'zh' : 'en';
      const other = localizedPath(path, targetLocale);
      assert.notInclude(['/', '/zh/'], other);
      assert.equal(localeOf(other), targetLocale);
      assert.property(articles, other);
      assert.equal(localizedPath(other, localeOf(path)), path);
      assert.equal(localizedPath(path, localeOf(path)), path);
    }
  });

  it('maps custom pages in both directions', () => {
    for (const path of ['/', '/404/', '/playground/']) {
      assert.equal(localizedPath(path, 'zh'), `/zh${path}`);
      assert.equal(localizedPath(`/zh${path}`, 'en'), path);
    }
  });

  it('falls back to the requested language home for an unknown route', () => {
    for (const path of ['/missing/', '/zh/missing/']) {
      assert.equal(localizedPath(path, 'en'), '/');
      assert.equal(localizedPath(path, 'zh'), '/zh/');
    }
  });

  it('recognizes the Chinese locale only at the complete URL segment', () => {
    for (const path of ['/zh', '/zh/', '/zh/learn/']) assert.equal(localeOf(path), 'zh');
    for (const path of ['/', '/learn/', '/zh-extra/', '/learn/zh/']) {
      assert.equal(localeOf(path), 'en');
    }
  });

  it('strips only the complete deployment prefix', () => {
    assert.equal(pathWithoutBase('/carven', '/carven/'), '/');
    assert.equal(pathWithoutBase('/carven/', '/carven/'), '/');
    assert.equal(pathWithoutBase('/carven/zh/reference/', '/carven/'), '/zh/reference/');
    assert.equal(pathWithoutBase('/carven-extra/zh/', '/carven/'), '/carven-extra/zh/');
    assert.equal(pathWithoutBase('/zh/learn/', '/'), '/zh/learn/');
  });
});
