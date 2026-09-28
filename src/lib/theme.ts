export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';
export type AccentId = 'violet' | 'blue' | 'emerald' | 'rose' | 'orange' | 'teal';

export const THEME_STORAGE_KEY = 'knex-theme';
export const ACCENT_STORAGE_KEY = 'knex-accent';
export const DEFAULT_ACCENT: AccentId = 'violet';

export const ACCENT_OPTIONS: { id: AccentId; label: string; swatch: string }[] = [
  { id: 'violet', label: 'Violet', swatch: '#5B4EF5' },
  { id: 'blue', label: 'Ocean', swatch: '#3B82F6' },
  { id: 'emerald', label: 'Emerald', swatch: '#10B981' },
  { id: 'teal', label: 'Lagoon', swatch: '#14B8A6' },
  { id: 'rose', label: 'Rose', swatch: '#F43F5E' },
  { id: 'orange', label: 'Sunset', swatch: '#F97316' },
];

export const isAccentId = (value: unknown): value is AccentId =>
  ACCENT_OPTIONS.some((option) => option.id === value);

/** Runs before hydration so the first paint already has the right theme and accent. */
export const THEME_BOOT_SCRIPT = `(function(){try{var d=document.documentElement;var m=localStorage.getItem('${THEME_STORAGE_KEY}')||'light';var dark=m==='dark'||(m==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);d.classList.toggle('dark',dark);d.style.colorScheme=dark?'dark':'light';var a=localStorage.getItem('${ACCENT_STORAGE_KEY}');d.setAttribute('data-accent',${JSON.stringify(
  ACCENT_OPTIONS.map((o) => o.id)
)}.indexOf(a)>-1?a:'${DEFAULT_ACCENT}');}catch(e){}})();`;
