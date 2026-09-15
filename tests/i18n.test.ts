import { describe, it, assert } from '@effect/vitest';
import { articles, articlePaths } from '../src/generated/manifest';
import { localizedPath, localeOf, pathWithoutBase } from '../src/lib/i18n';

describe('bilingual navigation', () => {
  it('round-trips every article without falling back to the home page', () => {
    for (const path of articlePaths) {
      const other = localizedPath(path, localeOf(path) === 'en' ? 'zh' : 'en');
      assert.notInclude(['/', '/zh/'], other);
      assert.property(articles, other);
      assert.equal(localizedPath(other, localeOf(path)), path);
    }
  });
  it('strips only the complete deployment prefix', () => {
    assert.equal(pathWithoutBase('/carven/zh/reference/', '/carven/'), '/zh/reference/');
    assert.equal(pathWithoutBase('/carven-extra/zh/', '/carven/'), '/carven-extra/zh/');
    assert.equal(pathWithoutBase('/zh/learn/', '/'), '/zh/learn/');
  });
});
