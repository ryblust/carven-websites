import { translate, type Locale } from '../lib/i18n';
import {
  diagnosticParts,
  diagnosticSelection,
  type DiagnosticLocation,
} from '../playground/diagnostics';

export default function PlaygroundDiagnostics({
  text,
  stdout = '',
  source,
  files,
  locale,
  onSelect,
}: {
  text: string;
  stdout?: string;
  source: string;
  files?: Record<string, string>;
  locale: Locale;
  onSelect: (location: DiagnosticLocation) => void;
}) {
  const t = translate(locale);
  return (
    <>
      {stdout && (
        <>
          <div className="playground-result-label">{t('标准输出', 'Standard output')}</div>
          <pre tabIndex={0} aria-label={t('标准输出', 'Standard output')}>
            {stdout}
          </pre>
        </>
      )}
      {stdout && text && <div className="playground-result-label">{t('诊断', 'Diagnostics')}</div>}
      {text && (
        <pre tabIndex={0} className="playground-diagnostics" aria-label={t('诊断', 'Diagnostics')}>
          {diagnosticParts(text, files ? Object.keys(files) : undefined).map((part, index) =>
            part.location &&
            diagnosticSelection(
              files?.[part.location.file ?? 'main.cv'] ?? source,
              part.location,
            ) ? (
              <button
                key={index}
                type="button"
                className="playground-diagnostic-location"
                aria-label={t(
                  `定位到 ${part.location.file ?? 'main.cv'} 第 ${part.location.line} 行，第 ${part.location.column} 字节列`,
                  `Go to ${part.location.file ?? 'main.cv'} line ${part.location.line}, byte column ${part.location.column}`,
                )}
                onClick={() => onSelect(part.location!)}
              >
                {part.text}
              </button>
            ) : (
              part.text
            ),
          )}
        </pre>
      )}
    </>
  );
}
