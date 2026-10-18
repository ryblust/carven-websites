import type { ArticlePath } from '../generated/manifest';
import { localizedPath, type Locale } from './i18n';

const groups = [
  {
    id: 'basics',
    title: { zh: '基础程序', en: 'First programs' },
    chapters: ['first-program', 'values', 'control', 'functions', 'aggregates'],
  },
  {
    id: 'interfaces',
    title: { zh: '数据与接口', en: 'Data and interfaces' },
    chapters: ['ownership', 'text', 'formatting', 'modules', 'failures', 'closures'],
  },
  {
    id: 'execution',
    title: { zh: '测试、编译期与异步', en: 'Tests, compile time, and async' },
    chapters: ['testing', 'constants', 'async'],
  },
  {
    id: 'native',
    title: { zh: '原生集成', en: 'Native integration' },
    chapters: ['interop', 'pointers'],
  },
  {
    id: 'projects',
    title: { zh: '练习与项目', en: 'Practice and projects' },
    chapters: ['project', 'data-pipeline', 'workflow', 'lsp'],
  },
] as const;

export function learnNavigationGroups(locale: Locale) {
  return groups.map((group) => ({
    id: group.id,
    title: group.title[locale],
    entries: group.chapters.map((chapter) => ({
      path: localizedPath(`/learn/${chapter}/`, locale) as ArticlePath,
    })),
  }));
}
