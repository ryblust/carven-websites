import { assert, describe, it } from 'vitest';
import { articleDestination } from '../src/lib/article-links';

describe('static Markdown navigation', () => {
  it('resolves relative article links under a repository base path', () => {
    assert.deepStrictEqual(
      articleDestination(
        '../../learn/values/#示例',
        'https://local.test/carven-websites/features/cpp-generation/',
        '/carven-websites/',
      ),
      {
        to: '/learn/values/',
        hash: '示例',
      },
    );
  });
  it('preserves native handling for external links, local anchors and unknown pages', () => {
    const current = 'https://local.test/learn/';
    for (const target of [
      '#hello',
      'https://github.com/ryblust/carven',
      '/unknown/',
      '/learn/values/?mode=print',
    ]) {
      assert.isUndefined(articleDestination(target, current, '/'));
    }
  });
});
