import { translate, type Locale } from '../lib/i18n';
import type { ExecutionResult } from '../playground/protocol';

export interface Quote {
  subtotal: number;
  saved: number;
  total: number;
}

export function readQuote(result: ExecutionResult): Quote | undefined {
  const file = result.artifacts.find((item) => item.path === 'host-result.json');
  if (!file) return;
  try {
    const value: unknown = JSON.parse(file.content);
    if (
      typeof value === 'object' &&
      value !== null &&
      ['subtotal', 'saved', 'total'].every(
        (key) => key in value && Number.isSafeInteger((value as Record<string, unknown>)[key]),
      )
    )
      return value as Quote;
  } catch {
    /* An incompatible function result is not an order quote. */
  }
}

export default function PlaygroundPreview({
  locale,
  price,
  percent,
  onPrice,
  onPercent,
  quote,
  busy,
  error,
  hosting,
  pendingSource = false,
}: {
  locale: Locale;
  price: number;
  percent: number;
  onPrice: (value: number) => void;
  onPercent: (value: number) => void;
  quote?: Quote;
  busy: boolean;
  error?: string;
  hosting?: ExecutionResult['hosting'];
  pendingSource?: boolean;
}) {
  const t = translate(locale);
  const amount = (value: number) => (value / 100).toFixed(2);
  return (
    <div className="playground-preview">
      <div className="playground-preview-heading">
        <span className="playground-eyebrow">CARVEN HOSTING</span>
        <h2>{t('你的代码，直接驱动页面。', 'Your code. A working preview.')}</h2>
        <p>
          {t(
            '金额和折扣会实时更新。修改源码后，点击「更新预览」应用规则；检查失败时继续使用上一版。',
            'Amount and discount update live. After editing source, choose Update preview to apply the rule. Failed checks keep the last valid version active.',
          )}
        </p>
      </div>
      <div className="playground-order-inputs">
        <label>
          {t('订单金额（分）', 'Order amount (cents)')}
          <input
            type="number"
            min="0"
            max="1000000"
            step="100"
            value={price}
            onChange={(event) => {
              const value = event.target.valueAsNumber;
              if (Number.isInteger(value) && value >= 0 && value <= 1000000) onPrice(value);
            }}
          />
        </label>
        <label>
          {t('折扣', 'Discount')} <span>{percent}%</span>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={percent}
            onChange={(event) => onPercent(Number(event.target.value))}
          />
        </label>
      </div>
      <div className="playground-receipt" aria-live="polite" aria-busy={busy}>
        <div>
          <span>{t('原价', 'Subtotal')}</span>
          <strong>{quote ? amount(quote.subtotal) : '—'}</strong>
        </div>
        <div>
          <span>{t('优惠', 'Savings')}</span>
          <strong>{quote ? amount(quote.saved) : '—'}</strong>
        </div>
        <div className="playground-order-total">
          <span>{t('应付', 'Total')}</span>
          <strong>{quote ? amount(quote.total) : '—'}</strong>
        </div>
        <p>
          {quote
            ? hosting?.status === 'retained'
              ? t(
                  `使用上一版有效实现 · 版本 ${hosting.revision}`,
                  `Using the last valid implementation · version ${hosting.revision}`,
                )
              : pendingSource
                ? t(
                    `源码改动尚未应用 · 版本 ${hosting?.revision ?? 1}`,
                    `Source changes not applied · version ${hosting?.revision ?? 1}`,
                  )
                : t(
                    `由 pricing.cv 中的 quote 返回 · 版本 ${hosting?.revision ?? 1}`,
                    `Returned by quote in pricing.cv · version ${hosting?.revision ?? 1}`,
                  )
            : t('等待 Carven 函数返回结果', 'Waiting for the Carven function result')}
        </p>
      </div>
      <p className="playground-preview-contract">
        <code>quote(price, percent) → Quote</code>
      </p>
      <p className="playground-preview-tip">
        {t(
          '试试修改 discounted 中的计算规则，再切到「测试结果」运行内联测试。',
          'Try changing the calculation in discounted, then choose Tests to run the inline tests.',
        )}
      </p>
      {error && (
        <pre className="playground-preview-error" role="alert">
          {error}
        </pre>
      )}
      {hosting?.diagnostics && (
        <div className="playground-reload-error" role="status">
          <strong>
            {hosting.status === 'unavailable'
              ? t('还没有可用的实现', 'No valid implementation yet')
              : t(
                  '源码未更新，上一版实现仍可处理新参数',
                  'Source update rejected. The previous implementation still handles new inputs.',
                )}
          </strong>
          <pre>{hosting.diagnostics}</pre>
        </div>
      )}
    </div>
  );
}
