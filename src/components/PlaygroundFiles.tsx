import { useState } from 'react';
import { translate, type Locale } from '../lib/i18n';

export default function PlaygroundFiles({
  locale,
  files,
  stdout,
}: {
  locale: Locale;
  files: { path: string; content: string }[];
  stdout?: string;
}) {
  const t = translate(locale);
  const [selected, setSelected] = useState('');
  const file = files.find((item) => item.path === selected) ?? files[0];
  function download() {
    if (!file) return;
    const url = URL.createObjectURL(new Blob([file.content], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = file.path.split('/').at(-1)!;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <>
      <p className="playground-files-note">
        {t(
          '文件仅保留在本次运行的内存中。点击「下载」才会保存到电脑。',
          'Files stay in memory for this run. Choose Download to save a file to your computer.',
        )}
      </p>
      {file ? (
        <>
          <div className="playground-artifact-toolbar">
            <label className="sr-only" htmlFor="playground-file-output">
              {t('生成的文件', 'Generated file')}
            </label>
            <select
              id="playground-file-output"
              value={file.path}
              onChange={(event) => setSelected(event.target.value)}
            >
              {files.map((item) => (
                <option key={item.path}>{item.path}</option>
              ))}
            </select>
            <button onClick={download}>{t('下载', 'Download')}</button>
          </div>
          <pre tabIndex={0} aria-label={file.path}>
            {file.content}
          </pre>
        </>
      ) : (
        <div className="playground-files-empty">
          <h2>{t('让程序生成一份文件。', 'Let your program write a file.')}</h2>
          <p>
            {t(
              '运行后，在这里查看和下载新建或修改的文本文件。每次运行都使用独立的文件环境。',
              'Run the program to open and download new or modified text files here. Each run starts with its own filesystem.',
            )}
          </p>
        </div>
      )}
      {stdout && <div className="playground-file-stdout">{stdout}</div>}
    </>
  );
}
