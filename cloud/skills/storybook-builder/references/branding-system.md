# Branding System — Tokens, Colors, Fonts, Logo

The branding layer is the foundation. Everything else (primitives, components, screens) consumes these tokens. Set it up FIRST.

## What "branding" includes

| Asset | Output |
|---|---|
| Color palette | CSS custom properties + Tailwind theme |
| Typography | Self-hosted fonts + Tailwind font families |
| Spacing scale | Tailwind extends or design token vars |
| Shadow / radius / blur | Tailwind theme extends |
| Logo (SVG / PNG / wordmark) | `public/` assets + `src/brand/logo/` component |
| Theme switcher | Dark/light toggle decorator |
| Brand colors stories | `Brand/Colors`, `Brand/Typography`, `Brand/Logo` stories |

## Step 1: Define design tokens

Two formats are common. Pick ONE based on the host framework:

### Option A: CSS custom properties (Tailwind v4, Vite, anything)

```css
/* packages/ui/src/styles/tokens.css */
:root {
  /* Color scale — pick semantic names */
  --fiddle-color-background-depth-1: #0a0a0a;
  --fiddle-color-background-depth-2: #171717;
  --fiddle-color-background-depth-3: #262626;
  --fiddle-color-text-primary: #ffffff;
  --fiddle-color-text-secondary: rgba(255, 255, 255, 0.6);
  --fiddle-color-text-tertiary: rgba(255, 255, 255, 0.3);
  --fiddle-color-border: rgba(255, 255, 255, 0.1);
  --fiddle-color-border-active: rgba(255, 255, 255, 0.3);
  --fiddle-color-button-primary-bg: #ffffff;
  --fiddle-color-button-primary-bg-hover: #f5f5f5;
  --fiddle-color-button-primary-text: #000000;
  --fiddle-color-accent: #ff3001;
  --fiddle-color-success: #10b981;
  --fiddle-color-error: #ef4444;
  --fiddle-color-warning: #f59e0b;

  /* Spacing scale */
  --fiddle-space-xs: 4px;
  --fiddle-space-sm: 8px;
  --fiddle-space-md: 16px;
  --fiddle-space-lg: 24px;
  --fiddle-space-xl: 48px;

  /* Border radius */
  --fiddle-radius-sm: 4px;
  --fiddle-radius-md: 8px;
  --fiddle-radius-lg: 12px;
  --fiddle-radius-full: 9999px;

  /* Typography */
  --fiddle-font-display: 'IBM Plex Sans', system-ui, sans-serif;
  --fiddle-font-body: 'Inter', system-ui, sans-serif;
  --fiddle-font-mono: 'IBM Plex Mono', ui-monospace, monospace;

  /* Shadows */
  --fiddle-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.4);
  --fiddle-shadow-md: 0 4px 12px rgba(0, 0, 0, 0.5);
  --fiddle-shadow-lg: 0 12px 32px rgba(0, 0, 0, 0.6);
}

/* Light theme override */
[data-theme="light"] {
  --fiddle-color-background-depth-1: #ffffff;
  --fiddle-color-background-depth-2: #f5f5f5;
  --fiddle-color-background-depth-3: #e5e5e5;
  --fiddle-color-text-primary: #0a0a0a;
  --fiddle-color-text-secondary: rgba(0, 0, 0, 0.6);
  --fiddle-color-text-tertiary: rgba(0, 0, 0, 0.3);
  --fiddle-color-border: rgba(0, 0, 0, 0.1);
  --fiddle-color-border-active: rgba(0, 0, 0, 0.3);
  --fiddle-color-button-primary-bg: #000000;
  --fiddle-color-button-primary-bg-hover: #171717;
  --fiddle-color-button-primary-text: #ffffff;
}
```

### Option B: Tailwind v3 config

```ts
// packages/ui/tailwind.config.ts
import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'fiddle-elements': {
          'background-depth-1': 'rgb(var(--bg-1) / <alpha-value>)',
          'background-depth-2': 'rgb(var(--bg-2) / <alpha-value>)',
          'textPrimary': 'rgb(var(--text-primary) / <alpha-value>)',
          'textSecondary': 'rgb(var(--text-secondary) / <alpha-value>)',
          'borderColor': 'rgb(var(--border) / <alpha-value>)',
        },
      },
      fontFamily: {
        display: ['IBM Plex Sans', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
    },
  },
} satisfies Config
```

## Step 2: Tailwind preset (v4 syntax)

```css
/* packages/ui/src/styles/tailwind-preset.css */
@import 'tailwindcss';
@import './tokens.css';

@theme {
  --color-fiddle-elements-background-depth-1: var(--fiddle-color-background-depth-1);
  --color-fiddle-elements-background-depth-2: var(--fiddle-color-background-depth-2);
  --color-fiddle-elements-textPrimary: var(--fiddle-color-text-primary);
  --color-fiddle-elements-textSecondary: var(--fiddle-color-text-secondary);
  --color-fiddle-elements-borderColor: var(--fiddle-color-border);
  --color-fiddle-elements-button-primary-background: var(--fiddle-color-button-primary-bg);
  --color-fiddle-elements-button-primary-text: var(--fiddle-color-button-primary-text);

  --font-display: var(--fiddle-font-display);
  --font-mono: var(--fiddle-font-mono);
}
```

This generates utility classes like `bg-fiddle-elements-background-depth-1`, `text-fiddle-elements-textPrimary`, `font-mono`, etc.

## Step 3: Fonts

### Self-host (preferred)

```css
/* packages/ui/src/styles/fonts.css */
@font-face {
  font-family: 'IBM Plex Sans';
  src: url('/fonts/IBMPlexSans-Regular.woff2') format('woff2');
  font-weight: 400;
  font-display: swap;
}
@font-face {
  font-family: 'IBM Plex Sans';
  src: url('/fonts/IBMPlexSans-Medium.woff2') format('woff2');
  font-weight: 500;
  font-display: swap;
}
@font-face {
  font-family: 'IBM Plex Mono';
  src: url('/fonts/IBMPlexMono-Regular.woff2') format('woff2');
  font-weight: 400;
  font-display: swap;
}
```

Place font files in `packages/ui/public/fonts/`. Import the CSS in `preview.ts`:

```ts
import '../src/styles/fonts.css'
import '../src/styles/tailwind-preset.css'
```

### Google Fonts (less preferred — slower, network-dependent)

```html
<!-- packages/ui/.storybook/preview-head.html -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
```

## Step 4: Logo component

```tsx
// packages/ui/src/brand/logo/index.tsx
import { cn } from '@/utils'

export type LogoProps = {
  variant?: 'full' | 'mark' | 'wordmark'
  className?: string
  /** Override the rendered height (width auto) */
  size?: number
}

export function Logo({ variant = 'full', className, size = 40 }: LogoProps) {
  const src = {
    full: '/logo.svg',
    mark: '/logo-mark.svg',
    wordmark: '/logo-wordmark.svg',
  }[variant]

  return (
    <img
      src={src}
      alt="Fiddle"
      style={{ height: size, width: 'auto' }}
      className={cn('select-none', className)}
      draggable={false}
    />
  )
}
```

Stories:

```tsx
// packages/ui/src/brand/logo/logo.stories.tsx
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Logo } from '.'

const meta: Meta<typeof Logo> = {
  title: 'Brand/Logo',
  component: Logo,
  parameters: { layout: 'centered' },
}
export default meta

export const Full: StoryObj<typeof Logo> = { args: { variant: 'full', size: 60 } }
export const Mark: StoryObj<typeof Logo> = { args: { variant: 'mark', size: 60 } }
export const Wordmark: StoryObj<typeof Logo> = { args: { variant: 'wordmark', size: 40 } }
export const Small: StoryObj<typeof Logo> = { args: { variant: 'full', size: 24 } }
export const Large: StoryObj<typeof Logo> = { args: { variant: 'full', size: 120 } }
```

## Step 5: Brand stories (Colors / Typography / Spacing)

### Colors story

```tsx
// packages/ui/src/brand/colors.stories.tsx
import type { Meta, StoryObj } from '@storybook/react-vite'

const meta: Meta = {
  title: 'Brand/Colors',
  parameters: { layout: 'fullscreen' },
}
export default meta

const COLOR_TOKENS = [
  { name: 'Background Depth 1', token: '--fiddle-color-background-depth-1', usage: 'Primary surface (app bg)' },
  { name: 'Background Depth 2', token: '--fiddle-color-background-depth-2', usage: 'Card / panel bg' },
  { name: 'Background Depth 3', token: '--fiddle-color-background-depth-3', usage: 'Elevated surface' },
  { name: 'Text Primary', token: '--fiddle-color-text-primary', usage: 'Headings, body text' },
  { name: 'Text Secondary', token: '--fiddle-color-text-secondary', usage: 'Subtitles, captions' },
  { name: 'Border', token: '--fiddle-color-border', usage: 'Dividers, card borders' },
  { name: 'Accent', token: '--fiddle-color-accent', usage: 'Highlights, callouts' },
  { name: 'Success', token: '--fiddle-color-success', usage: 'Confirmations' },
  { name: 'Error', token: '--fiddle-color-error', usage: 'Alerts, failures' },
]

function ColorSwatch({ name, token, usage }: { name: string; token: string; usage: string }) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-md border border-fiddle-elements-borderColor bg-fiddle-elements-background-depth-2">
      <div
        className="w-16 h-16 rounded shadow-inner"
        style={{ backgroundColor: `var(${token})` }}
      />
      <div className="flex-1">
        <div className="font-medium text-fiddle-elements-textPrimary">{name}</div>
        <code className="text-xs font-mono text-fiddle-elements-textSecondary">{token}</code>
        <p className="text-xs text-fiddle-elements-textSecondary mt-1">{usage}</p>
      </div>
    </div>
  )
}

export const Palette: StoryObj = {
  render: () => (
    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-3 bg-fiddle-elements-background-depth-1 min-h-screen">
      {COLOR_TOKENS.map((c) => <ColorSwatch key={c.token} {...c} />)}
    </div>
  ),
}
```

### Typography story

```tsx
// packages/ui/src/brand/typography.stories.tsx
import type { Meta, StoryObj } from '@storybook/react-vite'

const meta: Meta = {
  title: 'Brand/Typography',
  parameters: { layout: 'fullscreen' },
}
export default meta

export const Scale: StoryObj = {
  render: () => (
    <div className="p-8 flex flex-col gap-6 bg-fiddle-elements-background-depth-1 min-h-screen text-fiddle-elements-textPrimary">
      <div>
        <span className="text-xs font-mono text-fiddle-elements-textSecondary">text-4xl · font-display · weight-600</span>
        <h1 className="text-4xl font-display font-semibold">The quick brown fox</h1>
      </div>
      <div>
        <span className="text-xs font-mono text-fiddle-elements-textSecondary">text-2xl · font-display · weight-600</span>
        <h2 className="text-2xl font-display font-semibold">The quick brown fox</h2>
      </div>
      <div>
        <span className="text-xs font-mono text-fiddle-elements-textSecondary">text-xl · font-display · weight-500</span>
        <h3 className="text-xl font-display font-medium">The quick brown fox</h3>
      </div>
      <div>
        <span className="text-xs font-mono text-fiddle-elements-textSecondary">text-base · font-display · weight-400</span>
        <p className="text-base font-display">
          The quick brown fox jumps over the lazy dog. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        </p>
      </div>
      <div>
        <span className="text-xs font-mono text-fiddle-elements-textSecondary">text-sm · font-mono · uppercase tracking-widest</span>
        <p className="text-sm font-mono uppercase tracking-widest">SYSTEM CAPS — used for labels and CTAs</p>
      </div>
      <div>
        <span className="text-xs font-mono text-fiddle-elements-textSecondary">text-xs · font-mono</span>
        <code className="text-xs font-mono">const x = 42 // code samples</code>
      </div>
    </div>
  ),
}

export const FontFamilies: StoryObj = {
  render: () => (
    <div className="p-8 flex flex-col gap-8 bg-fiddle-elements-background-depth-1 min-h-screen text-fiddle-elements-textPrimary">
      <div>
        <code className="text-xs font-mono text-fiddle-elements-textSecondary">font-display: IBM Plex Sans</code>
        <p className="text-2xl font-display">The quick brown fox</p>
        <p className="text-2xl font-display italic">The quick brown fox</p>
        <p className="text-2xl font-display font-semibold">The quick brown fox</p>
      </div>
      <div>
        <code className="text-xs font-mono text-fiddle-elements-textSecondary">font-mono: IBM Plex Mono</code>
        <p className="text-2xl font-mono">const value = 'hello'</p>
      </div>
    </div>
  ),
}
```

### Spacing / radius / shadow stories

Same pattern — render token values visually with labels. Helps designers verify the system at a glance.

## Step 6: Theme switcher

```tsx
// packages/ui/.storybook/preview.ts (add to decorators)
import { useEffect } from 'react'
import { useGlobals } from 'storybook/preview-api'

// Toolbar entry — adds a theme picker to Storybook toolbar
export const globalTypes = {
  theme: {
    name: 'Theme',
    description: 'Global theme',
    defaultValue: 'dark',
    toolbar: {
      icon: 'circlehollow',
      items: [
        { value: 'dark', icon: 'circle', title: 'Dark' },
        { value: 'light', icon: 'circle', title: 'Light' },
      ],
      dynamicTitle: true,
    },
  },
}

// Theme decorator
const withTheme: Decorator = (Story, context) => {
  const { theme } = context.globals
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])
  return <Story />
}
```

Or use `storybook-dark-mode` addon for an out-of-box toggle.

## Step 7: Verify branding

After setting up, run Storybook and check:

- [ ] `Brand/Colors/Palette` renders all swatches with hex codes visible
- [ ] `Brand/Typography/Scale` shows distinct heading hierarchy
- [ ] `Brand/Logo/*` renders at multiple sizes without distortion
- [ ] Dark / light toggle (if enabled) flips every story's appearance
- [ ] Custom fonts load (no FOUT flash, no fallback Arial)
- [ ] Open browser devtools → Computed → `--fiddle-color-*` variables defined on `:root`

## Common branding pitfalls

**FOUT (Flash of Unstyled Text)** — fonts load late. Fix: add `font-display: swap` in `@font-face` AND preload critical fonts in `preview-head.html`.

**Wrong font shown** — Tailwind picks first font in stack that's available. If `IBM Plex Sans` isn't loaded, you'll see the fallback. Check the `Computed` tab in devtools.

**Colors look slightly off** — CSS variables don't support alpha modifiers in older Tailwind. Use `rgb(var(--x) / <alpha-value>)` syntax instead of hex.

**Logo SVG is too dark/light for current theme** — provide separate light/dark assets OR use CSS `filter: invert()` toggled via `[data-theme]`.

**Dark mode partially applies** — components hard-code colors instead of using tokens. Audit for `bg-black`, `text-white`, hex codes. Replace with tokens.

## Branding deliverables checklist

For a "complete branding" output:

- [ ] `src/styles/tokens.css` — all design tokens defined
- [ ] `src/styles/tailwind-preset.css` — Tailwind config mapping tokens
- [ ] `src/styles/fonts.css` (or `preview-head.html`) — font loading
- [ ] `public/fonts/` — self-hosted font files (woff2 preferred)
- [ ] `public/logo.svg` + `public/logo-mark.svg` (+ `logo-wordmark.svg`)
- [ ] `src/brand/logo/index.tsx` + story
- [ ] `src/brand/colors.stories.tsx`
- [ ] `src/brand/typography.stories.tsx`
- [ ] `src/brand/spacing.stories.tsx` (optional)
- [ ] Dark/light theme toggle wired in `preview.ts`
- [ ] All primitives + components consume tokens (no raw hex/rgb)
