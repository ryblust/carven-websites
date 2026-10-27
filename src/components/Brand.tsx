import { Link } from '@tanstack/react-router';
import { localizedPath, type Locale } from '../lib/i18n';
import { href } from '../lib/site';
import mark from '../assets/carven-mark.svg?raw';

export function Wordmark({ priority = false }: { priority?: boolean }) {
  return (
    <span className="brand-image" aria-hidden="true">
      <img
        src={href('/brand/carven-wordmark.webp')}
        alt=""
        width={2001}
        height={786}
        decoding="async"
        fetchPriority={priority ? 'high' : undefined}
      />
    </span>
  );
}

export function Brand({
  locale = 'zh',
  iconOnly = false,
}: {
  locale?: Locale;
  iconOnly?: boolean;
}) {
  return (
    <Link
      className="wordmark"
      to={localizedPath('/', locale)}
      aria-label={locale === 'en' ? 'Carven home' : 'Carven 首页'}
    >
      <span
        className="brand-symbol"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: mark }}
      />
      {!iconOnly && <Wordmark />}
    </Link>
  );
}
