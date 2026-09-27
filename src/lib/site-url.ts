export function siteUrl(path: string, base: string, origin?: string) {
  if (!origin) return;
  const url = new URL(origin);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      'SITE_URL must be an HTTP(S) origin without a path, credentials, query or hash.',
    );
  }
  const prefix = base.replace(/^\/+|\/+$/g, '');
  return `${url.origin}${prefix ? `/${prefix}` : ''}/${path.replace(/^\/+/, '')}`;
}
