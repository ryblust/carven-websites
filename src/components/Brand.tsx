import { Link } from '@tanstack/react-router';
import { localizedPath, type Locale } from '../lib/i18n';

export function Brand({ locale = 'zh' }: { locale?: Locale }) {
  return (
    <Link
      className="wordmark"
      to={localizedPath('/', locale)}
      aria-label={locale === 'en' ? 'Carven home' : 'Carven 首页'}
    >
      <span>Carven</span>
    </Link>
  );
}
