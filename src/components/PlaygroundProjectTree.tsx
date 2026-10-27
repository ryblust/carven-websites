import { FileCode, FileText, Folder } from 'lucide-react';
import { UIIcon } from './UIIcon';
import { translate, type Locale } from '../lib/i18n';

interface Directory {
  files: string[];
  directories: Map<string, Directory>;
}

export default function PlaygroundProjectTree({
  files,
  selected,
  onSelect,
  locale,
}: {
  files: Record<string, string>;
  selected: string;
  onSelect: (path: string) => void;
  locale: Locale;
}) {
  const t = translate(locale);
  const root: Directory = { files: [], directories: new Map() };
  for (const path of Object.keys(files)) {
    const parts = path.split('/');
    let directory = root;
    for (const name of parts.slice(0, -1)) {
      if (!directory.directories.has(name))
        directory.directories.set(name, { files: [], directories: new Map() });
      directory = directory.directories.get(name)!;
    }
    directory.files.push(path);
  }
  const render = (directory: Directory) => (
    <ul>
      {[...directory.directories]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, child]) => (
          <li key={name}>
            <details open>
              <summary>
                <UIIcon icon={Folder} />
                {name}
              </summary>
              {render(child)}
            </details>
          </li>
        ))}
      {directory.files
        .sort((a, b) => (a === 'main.cv' ? -1 : b === 'main.cv' ? 1 : a.localeCompare(b)))
        .map((path) => (
          <li key={path}>
            <button
              title={path}
              aria-current={path === selected ? 'true' : undefined}
              onClick={() => onSelect(path)}
            >
              <UIIcon icon={path.endsWith('.cv') ? FileCode : FileText} />
              <span>{path.split('/').at(-1)}</span>
              {path === 'main.cv' && <small>{t('入口', 'entry')}</small>}
            </button>
          </li>
        ))}
    </ul>
  );
  return (
    <nav className="playground-project-tree" aria-label={t('项目文件树', 'Project file tree')}>
      <div className="playground-tree-heading">
        {t('项目', 'Project')} <span>{Object.keys(files).length}</span>
      </div>
      {render(root)}
    </nav>
  );
}
