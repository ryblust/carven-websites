import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useHydrated } from '@tanstack/react-router';

export function MobileChapters({
  label,
  title,
  closeLabel,
  children,
}: {
  label: string;
  title: string;
  closeLabel: string;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const ready = useHydrated();
  const dialogId = useId();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const wide = window.matchMedia('(min-width: 801px)');
    const closeOnWide = () => {
      if (wide.matches) dialog.current?.close();
    };
    wide.addEventListener('change', closeOnWide);
    return () => wide.removeEventListener('change', closeOnWide);
  }, []);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);
  return (
    <div className="mobile-chapters">
      {ready ? (
        <button
          className="chapter-toggle"
          type="button"
          aria-haspopup="dialog"
          aria-controls={dialogId}
          aria-expanded={open}
          onClick={() => {
            dialog.current?.showModal();
            setOpen(true);
          }}
        >
          <span className="menu-lines" aria-hidden="true" />
          {title}
          <span className="chapter-toggle-label">{label}</span>
        </button>
      ) : (
        <details>
          <summary>{title}</summary>
          {children}
        </details>
      )}
      <dialog
        ref={dialog}
        id={dialogId}
        className="chapter-drawer"
        aria-label={`${label} · ${title}`}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <div className="chapter-drawer-panel">
          <div className="chapter-drawer-heading">
            <strong>{label}</strong>
            <button type="button" aria-label={closeLabel} onClick={() => dialog.current?.close()}>
              ×
            </button>
          </div>
          <div
            onClick={(event) => {
              if (event.target instanceof Element && event.target.closest('a'))
                dialog.current?.close();
            }}
          >
            {children}
          </div>
        </div>
      </dialog>
    </div>
  );
}
