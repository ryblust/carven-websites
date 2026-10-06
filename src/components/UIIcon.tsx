import type { LucideIcon } from 'lucide-react';

// Decorative icons share the site's ink weight; controls own their accessible labels.
export function UIIcon({ icon: Icon, className = '' }: { icon: LucideIcon; className?: string }) {
  return (
    <Icon
      className={`ui-icon ${className}`.trim()}
      size={16}
      strokeWidth={1.5}
      aria-hidden="true"
      focusable="false"
    />
  );
}
