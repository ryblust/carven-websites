import { articlePaths } from '../generated/manifest';

export function articleDestination(reference: string, current: string, base: string) {
  const currentUrl = new URL(current);
  const target = new URL(reference, currentUrl);
  if (
    target.origin !== currentUrl.origin ||
    target.search ||
    target.pathname === currentUrl.pathname
  )
    return;
  const prefix = base.replace(/\/$/, '');
  const path = articlePaths.find((path) => `${prefix}${path}` === target.pathname);
  if (!path) return;
  return { to: path, hash: decodeURIComponent(target.hash.slice(1)) };
}
