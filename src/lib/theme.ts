export const themeColors = { light: '#faf8f4', dark: '#17191e' } as const;

export function applyTheme(theme: keyof typeof themeColors) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColors[theme]);
  window.dispatchEvent(new Event('carven-theme-change'));
}

// Run after head metadata, before paint. Blocked storage must not prevent rendering.
export const themeScript = `(()=>{let t;try{t=localStorage.getItem('carven-theme')}catch{}t=t==='light'||t==='dark'?t:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=t;document.querySelector('meta[name="theme-color"]')?.setAttribute('content',${JSON.stringify(themeColors)}[t])})()`;
