import { assert, describe, it } from 'vitest';
import { articleDestination } from '../src/lib/article-links';

describe('static Markdown navigation', () => {
  it.each(['/', '/carven-websites/'])('resolves relative article links on base %s', (base) => {
    assert.deepStrictEqual(
      articleDestination(
        '../../learn/values/#%E7%A4%BA%E4%BE%8B',
        `https://local.test${base}features/cpp-generation/`,
        base,
      ),
      {
        to: '/learn/values/',
        hash: '示例',
      },
    );
  });

  it.each(['/learn/values/', '/zh/learn/values/'])(
    'accepts a known article %s without requiring a fragment',
    (path) => {
      assert.deepStrictEqual(
        articleDestination(`/docs${path}`, 'https://local.test/docs/', '/docs/'),
        { to: path, hash: '' },
      );
    },
  );

  it('preserves native handling for external links, local anchors and unknown pages', () => {
    const current = 'https://local.test/learn/';
    for (const target of [
      '#hello',
      '/learn/',
      'https://other.test/learn/values/',
      '/unknown/',
      '/learn/values/?mode=print',
    ]) {
      assert.isUndefined(articleDestination(target, current, '/'));
    }
  });

  it('does not intercept article-shaped paths outside the deployment prefix', () => {
    for (const path of ['/learn/values/', '/docs-extra/learn/values/']) {
      assert.isUndefined(articleDestination(path, 'https://local.test/docs/', '/docs/'));
    }
  });
});
