import { useEffect, useState } from 'react';
import type { articleHeadings } from '../lib/article-headings';

// Marks the section being read; the outline remains ordinary fragment links.
export function PageOutline({
  headings,
  label,
  backLabel,
}: {
  headings: ReturnType<typeof articleHeadings>;
  label: string;
  backLabel: string;
}) {
  const [active, setActive] = useState<string>();
  const ids = headings.map((heading) => heading.id).join(' ');
  useEffect(() => {
    const targets = ids
      .split(' ')
      .map((id) => document.getElementById(id))
      .filter((target): target is HTMLElement => target !== null);
    if (targets.length === 0) return;
    const update = () => {
      const line = window.innerHeight * 0.25;
      let current: string | undefined;
      for (const target of targets) {
        if (target.getBoundingClientRect().top > line) break;
        current = target.id;
      }
      setActive(current);
    };
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [ids]);

  return (
    <aside className="page-outline" aria-label={label}>
      <div className="page-outline-inner">
        <p className="nav-group-label">{label}</p>
        <nav>
          {headings.map((heading) => (
            <a
              key={heading.id}
              className={heading.level === 3 ? 'outline-nested' : undefined}
              href={`#${heading.id}`}
              aria-current={active === heading.id ? 'location' : undefined}
            >
              {heading.title}
            </a>
          ))}
        </nav>
        <a className="back-top" href="#main">
          {backLabel}
        </a>
      </div>
    </aside>
  );
}
