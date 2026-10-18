import { describe, expect, it, vi } from 'vitest';

const fixture = vi.hoisted(() => ({
  articles: {
    '/reference/aggregates/': { title: 'Container forms', description: 'Tuples and records' },
    '/reference/bindings/': { title: 'Let bindings', description: 'Declare names' },
    '/reference/json/': { title: 'Payload values', description: 'Build encoded data' },
    '/learn/first-program/': { title: 'Start the sample', description: 'Write output' },
    '/philosophy/': { title: 'Design goals', description: 'Choices explained' },
    '/zh/reference/json/': { title: '数据值', description: '构造数据' },
    '/zh/learn/first-program/': { title: '开始示例', description: '输出结果' },
  },
  referenceSearch: {
    '/reference/aggregates/': [{ id: 'example', title: 'Example', symbols: 'let record' }],
    '/reference/json/': [
      {
        id: 'members-1',
        title: 'Members',
        symbols:
          'Packet Packet::item_at item_at Issue Issue.kind Mode Mode::Pending CV-FIXTURE-CODE',
      },
    ],
    '/zh/reference/json/': [
      { id: '方法-1', title: '方法', symbols: 'Packet Packet::item_at item_at' },
    ],
  },
}));

vi.mock('../src/generated/manifest', () => ({
  articles: fixture.articles,
  articlePaths: Object.keys(fixture.articles),
}));
vi.mock('../src/generated/reference-search', () => ({ referenceSearch: fixture.referenceSearch }));

import { searchArticles } from '../src/lib/document-search';

const paths = (query: string) => searchArticles('en', query).map((match) => match.path);

describe('document search', () => {
  it('normalizes case and whitespace, and searches tutorial and design metadata', () => {
    expect(paths('  START THE SAMPLE  ')).toEqual(['/learn/first-program/']);
    expect(paths('choices explained')).toEqual(['/philosophy/']);
    expect(searchArticles('en', 'no-such-document')).toEqual([]);
  });

  it('filters by locale and returns all documents in that locale for an empty query', () => {
    expect(searchArticles('en', ' ').map((match) => match.path)).toEqual(
      Object.keys(fixture.articles).filter((path) => !path.startsWith('/zh/')),
    );
    expect(searchArticles('zh', '').map((match) => match.path)).toEqual([
      '/zh/reference/json/',
      '/zh/learn/first-program/',
    ]);
    expect(searchArticles('zh', 'start the sample')).toEqual([]);
    expect(searchArticles('en', '开始示例')).toEqual([]);
  });

  it('places a matching topic ahead of an incidental body symbol', () => {
    expect(paths('let')).toEqual(['/reference/bindings/', '/reference/aggregates/']);
    expect(searchArticles('en', 'let')[0]?.matchedTerms).toEqual([]);
  });

  it('finds bare and qualified symbols and returns their section destination', () => {
    for (const query of [
      'item_at',
      ' Packet::ITEM_AT ',
      'kind',
      'Issue.kind',
      'Pending',
      'Mode::Pending',
      'CV-FIXTURE-CODE',
    ]) {
      const matches = searchArticles('en', query);
      expect(matches).toHaveLength(1);
      expect(matches[0]).toMatchObject({
        path: '/reference/json/',
        section: { id: 'members-1', title: 'Members' },
      });
      expect(matches[0]?.matchedTerms.length).toBeGreaterThan(0);
    }

    expect(searchArticles('zh', 'Packet::item_at')[0]).toMatchObject({
      path: '/zh/reference/json/',
      section: { id: '方法-1', title: '方法' },
    });
    expect(searchArticles('en', 'Packet::missing_member')).toEqual([]);
  });

  it('includes the matching keyword when the title and description do not contain it', () => {
    const matches = searchArticles('en', 'scope');
    expect(matches).toHaveLength(1);
    expect(matches[0]?.path).toBe('/reference/bindings/');
    expect(matches[0]?.matchedTerms).toContain('scope');
  });
});
