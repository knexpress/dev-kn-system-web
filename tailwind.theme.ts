import plugin from 'tailwindcss/plugin';
import colors from 'tailwindcss/colors';
import type { AccentId } from './src/lib/theme';

/**
 * Theme-aware colour utilities.
 *
 * Neutral and tinted shades used for surfaces and text (bg-white, bg-slate-50,
 * text-slate-700, bg-emerald-50, border-slate-200 …) resolve through CSS
 * variables, so existing class names flip automatically under `.dark`.
 * Solid mid shades (bg-emerald-600, bg-slate-900 …) are left untouched so
 * coloured buttons and dark tiles keep their contrast.
 */

type Palette = Record<string, string>;
type Rgb = [number, number, number];

const DARK_CANVAS = '#0E1016';
const DARK_SURFACE = '#161923';
const DARK_POPOVER = '#1B1E29';

const NEUTRALS = ['slate', 'gray', 'zinc', 'neutral', 'stone'] as const;
const HUES = [
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
] as const;

const ACCENT_PALETTES: Record<AccentId, Palette> = {
  violet: {
    50: '#F2F1FE',
    100: '#E5E3FD',
    200: '#CCC8FB',
    300: '#AAA3F8',
    400: '#8378F6',
    500: '#5B4EF5',
    600: '#4A3DE3',
    700: '#3D31C0',
    800: '#332A9A',
    900: '#2B2678',
    950: '#1C1850',
  },
  blue: colors.blue,
  emerald: colors.emerald,
  teal: colors.teal,
  rose: colors.rose,
  orange: colors.orange,
};

const toRgb = (hex: string): Rgb => {
  const raw = hex.replace('#', '');
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** `weight` of colour `a` blended over `b`. */
const mix = (a: string, b: string, weight: number): Rgb => {
  const A = toRgb(a);
  const B = toRgb(b);
  return [0, 1, 2].map((i) => Math.round(A[i] * weight + B[i] * (1 - weight))) as Rgb;
};

const channels = (value: string | Rgb) => (typeof value === 'string' ? toRgb(value) : value).join(' ');

const toHsl = (value: string | Rgb) => {
  const [r, g, b] = (typeof value === 'string' ? toRgb(value) : value).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

type Role = 'bg' | 'text' | 'border';
type RoleShades = Record<Role, Record<string, string | Rgb>>;

const neutralRoles = (p: Palette): { light: RoleShades; dark: RoleShades } => ({
  light: {
    bg: { 50: p[50], 100: p[100], 200: p[200], 300: p[300], 400: p[400] },
    text: { 400: p[400], 500: p[500], 600: p[600], 700: p[700], 800: p[800], 900: p[900], 950: p[950] },
    border: { 50: p[50], 100: p[100], 200: p[200], 300: p[300], 400: p[400] },
  },
  dark: {
    bg: {
      50: mix(p[400], DARK_SURFACE, 0.05),
      100: mix(p[400], DARK_SURFACE, 0.09),
      200: mix(p[400], DARK_SURFACE, 0.15),
      300: mix(p[400], DARK_SURFACE, 0.24),
      400: mix(p[400], DARK_SURFACE, 0.36),
    },
    text: { 400: p[500], 500: p[400], 600: p[300], 700: p[200], 800: p[100], 900: p[50], 950: '#FFFFFF' },
    border: {
      50: mix(p[400], DARK_SURFACE, 0.08),
      100: mix(p[400], DARK_SURFACE, 0.12),
      200: mix(p[400], DARK_SURFACE, 0.17),
      300: mix(p[400], DARK_SURFACE, 0.26),
      400: mix(p[400], DARK_SURFACE, 0.38),
    },
  },
});

const hueRoles = (p: Palette): { light: RoleShades; dark: RoleShades } => ({
  light: {
    bg: { 50: p[50], 100: p[100], 200: p[200] },
    text: { 600: p[600], 700: p[700], 800: p[800], 900: p[900], 950: p[950] },
    border: { 100: p[100], 200: p[200], 300: p[300] },
  },
  dark: {
    bg: {
      50: mix(p[500], DARK_SURFACE, 0.12),
      100: mix(p[500], DARK_SURFACE, 0.18),
      200: mix(p[500], DARK_SURFACE, 0.28),
    },
    text: { 600: p[400], 700: p[300], 800: p[200], 900: p[100], 950: p[50] },
    border: {
      100: mix(p[500], DARK_SURFACE, 0.22),
      200: mix(p[500], DARK_SURFACE, 0.32),
      300: mix(p[500], DARK_SURFACE, 0.45),
    },
  },
});

const varName = (role: Role, color: string, shade: string) => `--c-${role}-${color}-${shade}`;
const useVar = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

const utilityColors: Record<Role, Record<string, Record<string, string> | string>> = {
  bg: {},
  text: {},
  border: {},
};
const lightVars: Record<string, string> = {};
const darkVars: Record<string, string> = {};

const register = (color: string, roles: { light: RoleShades; dark: RoleShades }) => {
  (Object.keys(roles.light) as Role[]).forEach((role) => {
    const shades: Record<string, string> = {};
    Object.keys(roles.light[role]).forEach((shade) => {
      const name = varName(role, color, shade);
      shades[shade] = useVar(name);
      lightVars[name] = channels(roles.light[role][shade]);
      darkVars[name] = channels(roles.dark[role][shade]);
    });
    utilityColors[role][color] = shades;
  });
};

NEUTRALS.forEach((name) => register(name, neutralRoles(colors[name] as Palette)));
HUES.forEach((name) => register(name, hueRoles(colors[name] as Palette)));

const brandRoleShades = hueRoles(ACCENT_PALETTES.violet);
(Object.keys(brandRoleShades.light) as Role[]).forEach((role) => {
  const shades: Record<string, string> = {};
  Object.keys(brandRoleShades.light[role]).forEach((shade) => {
    shades[shade] = useVar(varName(role, 'brand', shade));
  });
  utilityColors[role].brand = shades;
});

// bg-white is a surface; text-white stays white so coloured buttons keep contrast.
lightVars['--c-surface'] = channels('#FFFFFF');
darkVars['--c-surface'] = channels(DARK_SURFACE);
lightVars['--c-border-white'] = channels('#FFFFFF');
darkVars['--c-border-white'] = channels(mix(colors.slate[400], DARK_SURFACE, 0.12));
lightVars['--c-canvas'] = channels('#F5F6FB');
darkVars['--c-canvas'] = channels(DARK_CANVAS);

utilityColors.bg.white = useVar('--c-surface');
utilityColors.border.white = useVar('--c-border-white');

const accentVars = (palette: Palette, mode: 'light' | 'dark') => {
  const vars: Record<string, string> = {};
  Object.entries(palette).forEach(([shade, value]) => {
    vars[`--brand-${shade}`] = channels(value);
  });
  const roles = hueRoles(palette)[mode];
  (Object.keys(roles) as Role[]).forEach((role) => {
    Object.entries(roles[role]).forEach(([shade, value]) => {
      vars[varName(role, 'brand', shade)] = channels(value);
    });
  });
  vars['--primary'] = toHsl(palette[500]);
  vars['--ring'] = toHsl(palette[500]);
  vars['--chart-1'] = toHsl(palette[500]);
  if (mode === 'light') {
    vars['--accent'] = toHsl(palette[50]);
    vars['--accent-foreground'] = toHsl(palette[700]);
  } else {
    vars['--accent'] = toHsl(mix(palette[500], DARK_SURFACE, 0.16));
    vars['--accent-foreground'] = toHsl(palette[300]);
  }
  return vars;
};

const darkShadcnVars = {
  '--background': toHsl(DARK_CANVAS),
  '--foreground': toHsl('#E8EAF1'),
  '--card': toHsl(DARK_SURFACE),
  '--card-foreground': toHsl('#E8EAF1'),
  '--popover': toHsl(DARK_POPOVER),
  '--popover-foreground': toHsl('#E8EAF1'),
  '--primary-foreground': '0 0% 100%',
  '--secondary': toHsl(mix(colors.slate[400], DARK_SURFACE, 0.09)),
  '--secondary-foreground': toHsl('#E8EAF1'),
  '--muted': toHsl(mix(colors.slate[400], DARK_SURFACE, 0.09)),
  '--muted-foreground': toHsl(colors.slate[400]),
  '--destructive': '0 72% 56%',
  '--destructive-foreground': '0 0% 98%',
  '--border': toHsl(mix(colors.slate[400], DARK_SURFACE, 0.14)),
  '--input': toHsl(mix(colors.slate[400], DARK_SURFACE, 0.18)),
};

/** Mirrors the light :root values in globals.css for `.theme-light` islands and print. */
const lightShadcnVars = {
  '--background': '230 43% 97%',
  '--foreground': '230 25% 14%',
  '--card': '0 0% 100%',
  '--card-foreground': '230 25% 14%',
  '--popover': '0 0% 100%',
  '--popover-foreground': '230 25% 14%',
  '--secondary': '230 30% 95%',
  '--secondary-foreground': '230 25% 14%',
  '--muted': '230 30% 95%',
  '--muted-foreground': '230 10% 48%',
  '--destructive': '0 84% 60%',
  '--border': '230 25% 91%',
  '--input': '230 25% 90%',
};

const brandColor: Record<string, string> = { DEFAULT: useVar('--brand-500') };
Object.keys(ACCENT_PALETTES.violet).forEach((shade) => {
  brandColor[shade] = useVar(`--brand-${shade}`);
});

const accentRules: Record<string, Record<string, string>> = {};
const lightIslandRules: Record<string, Record<string, string>> = {};
const printRules: Record<string, Record<string, string>> = {};
const lightScope = { ...lightVars, ...lightShadcnVars, colorScheme: 'light' };

lightIslandRules['.dark .theme-light'] = { ...lightScope, color: 'hsl(var(--foreground))' };
printRules[':root.dark'] = lightScope;

(Object.keys(ACCENT_PALETTES) as AccentId[]).forEach((id) => {
  const lightSelector = id === 'violet' ? `:root, [data-accent="${id}"]` : `[data-accent="${id}"]`;
  const darkSelector = id === 'violet' ? `:root.dark, .dark[data-accent="${id}"]` : `.dark[data-accent="${id}"]`;
  const light = accentVars(ACCENT_PALETTES[id], 'light');
  accentRules[lightSelector] = light;
  accentRules[darkSelector] = accentVars(ACCENT_PALETTES[id], 'dark');
  lightIslandRules[`.dark[data-accent="${id}"] .theme-light`] = light;
  printRules[`.dark[data-accent="${id}"]`] = light;
});

export const themePlugin = plugin(
  ({ addBase }) => {
    addBase({
      ':root': lightVars,
      ':root.dark': { ...darkVars, ...darkShadcnVars, colorScheme: 'dark' },
    });
    addBase(accentRules);
    addBase(lightIslandRules);
    addBase({ '@media print': printRules });
  },
  {
    theme: {
      extend: {
        colors: {
          brand: brandColor,
          canvas: useVar('--c-canvas'),
        },
        backgroundColor: utilityColors.bg,
        gradientColorStops: utilityColors.bg,
        textColor: utilityColors.text,
        borderColor: utilityColors.border,
        ringColor: utilityColors.border,
      },
    },
  }
);
