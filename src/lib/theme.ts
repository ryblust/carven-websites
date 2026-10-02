export const themeColors = { light: '#faf8f4', dark: '#17191e' } as const;
export type ThemePreference = 'system' | keyof typeof themeColors;

export function observeTheme(onChange: (preference: ThemePreference) => void) {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  let preference: ThemePreference = 'system';
  const read = () => {
    try {
      const saved = localStorage.getItem('carven-theme');
      preference = saved === 'light' || saved === 'dark' ? saved : 'system';
    } catch {
      // Retain the current visit's choice when storage is unavailable.
    }
  };
  const sync = () => {
    applyTheme(preference === 'system' ? (media.matches ? 'dark' : 'light') : preference);
    onChange(preference);
  };
  const storageChanged = (event: StorageEvent) => {
    if (event.key !== null && event.key !== 'carven-theme') return;
    if (event.storageArea !== null && event.storageArea !== localStorage) return;
    read();
    sync();
  };
  read();
  sync();
  media.addEventListener('change', sync);
  window.addEventListener('storage', storageChanged);
  return {
    setPreference(next: ThemePreference) {
      preference = next;
      try {
        localStorage.setItem('carven-theme', next);
      } catch {
        // The switch remains usable when browser storage is disabled.
      }
      sync();
    },
    dispose() {
      media.removeEventListener('change', sync);
      window.removeEventListener('storage', storageChanged);
    },
  };
}

export function applyTheme(theme: keyof typeof themeColors) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColors[theme]);
  window.dispatchEvent(new Event('carven-theme-change'));
}

// Run after head metadata, before paint. Blocked storage must not prevent rendering.
export const themeScript = `(()=>{let t;try{t=localStorage.getItem('carven-theme')}catch{}t=t==='light'||t==='dark'?t:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=t;document.querySelector('meta[name="theme-color"]')?.setAttribute('content',${JSON.stringify(themeColors)}[t])})()`;
