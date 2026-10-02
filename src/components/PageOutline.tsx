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
              href={`#${heading.id}`}
              aria-current={active === heading.id ? 'location' : undefined}
            >
              <span className="outline-title">
                {heading.title}
                <svg
                  className="outline-underline"
                  viewBox="0 0 100 9"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path d="M2 6 C18 2.5 30 8 48 5.2 S77 2.8 98 4.2" />
                </svg>
              </span>
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
