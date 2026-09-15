import { localeOf, localizedPath, pathWithoutBase, translate } from '../lib/i18n';
import { Link, useLocation } from '@tanstack/react-router';

export default function NotFound() {
  const pathname = useLocation({
    select: (location) => pathWithoutBase(location.pathname, import.meta.env.BASE_URL),
  });
  const locale = localeOf(pathname);
  const t = translate(locale);
  return (
    <div className="error-page container">
      <p className="intro-label">404</p>
      <h1>{t('这条路径还没有内容。', 'There is no page at this address.')}</h1>
      <p>
        {t(
          '可以回到首页，或者从第一个程序开始学习 Carven。',
          'Return home or start learning Carven with your first program.',
        )}
      </p>
      <div className="hero-actions">
        <Link className="button button-primary" to={localizedPath('/', locale)}>
          {t('返回首页', 'Return home')}
        </Link>
        <Link className="text-link" to={localizedPath('/learn/', locale)}>
          {t('开始学习 →', 'Start learning →')}
        </Link>
      </div>
    </div>
  );
}
