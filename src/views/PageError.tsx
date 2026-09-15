import { localeOf, localizedPath, pathWithoutBase, translate } from '../lib/i18n';
import { Link, useLocation, type ErrorComponentProps } from '@tanstack/react-router';

export default function PageError({ reset }: ErrorComponentProps) {
  const pathname = useLocation({
    select: (location) => pathWithoutBase(location.pathname, import.meta.env.BASE_URL),
  });
  const locale = localeOf(pathname);
  const t = translate(locale);
  return (
    <div className="error-page container">
      <h1>{t('页面暂时无法显示。', 'This page could not be displayed.')}</h1>
      <p>
        {t('可以重新尝试，或回到首页继续阅读。', 'Try again or return home to continue reading.')}
      </p>
      <div className="hero-actions">
        <button type="button" className="button button-primary" onClick={reset}>
          {t('重新尝试', 'Try again')}
        </button>
        <Link className="text-link" to={localizedPath('/', locale)}>
          {t('返回首页 →', 'Return home →')}
        </Link>
      </div>
    </div>
  );
}
