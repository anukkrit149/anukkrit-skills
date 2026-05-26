# Case Handlers — What to Do When You Hit X

Specific case-by-case fixes for the edge cases you'll actually encounter. Search this file for the error message or symptom.

## Setup cases

### Case: Repo has no Storybook at all

Run:
```bash
cd <target-package>
pnpm dlx storybook@latest init --type react
```

Storybook detects the framework. After init, check that `.storybook/main.ts` has the correct `framework.name`:
- React + Vite → `@storybook/react-vite`
- Next.js → `@storybook/nextjs`
- React + Webpack → `@storybook/react-webpack5`
- Vue 3 → `@storybook/vue3-vite`
- SvelteKit → `@storybook/sveltekit`

### Case: Repo has Storybook but old version (≤ 7)

Upgrade one major version at a time. Never skip.

```bash
npx storybook@8 upgrade
# verify it boots
npx storybook@9 upgrade
```

In v7 → v8 jumps, `@storybook/addon-essentials` becomes auto-included. Remove from `main.ts addons` if explicitly listed.

### Case: Monorepo with multiple packages — where does Storybook live?

Default: ONE Storybook per design-system package (`packages/ui` or `packages/design-system`).
- Component-level stories live in `packages/ui/src/components/**/*.stories.tsx`
- Screen-level stories live in `packages/ui/src/screens/**/*.stories.tsx`
- App-level (`apps/web`) does NOT have Storybook — too coupled to real services

### Case: Repo uses Yarn / npm not pnpm

Replace all `pnpm` commands with the host package manager:

```bash
# pnpm
pnpm --filter @scope/ui add -D msw

# yarn workspaces
yarn workspace @scope/ui add -D msw

# npm workspaces
npm install --workspace @scope/ui --save-dev msw
```

For `dlx` equivalents:
- pnpm: `pnpm dlx <pkg>`
- yarn: `yarn dlx <pkg>` (yarn 2+) or `npx <pkg>` (yarn 1)
- npm: `npx <pkg>`

### Case: Vite alias `~` or `@` doesn't resolve in Storybook

Storybook uses its own Vite config (`sb-vite.config.ts` if customized). Either:

1. Add the alias to `sb-vite.config.ts`:
   ```ts
   import path from 'node:path'
   export default defineConfig({
     resolve: {
       alias: {
         '@': path.resolve(import.meta.dirname, 'src'),
         '~': path.resolve(import.meta.dirname, 'src'),
       },
     },
   })
   ```

2. OR (preferred for UI pkg) **don't use `~`** — only relative paths. Less magic, more portable.

## Mocking cases

### Case: `useNavigate is not defined` / `useParams is not defined`

The component renders before `<MemoryRouter>` wraps it. Fix: add `withRouter` to `preview.ts` decorators.

If the decorator IS added but error persists, check that the component isn't being rendered OUTSIDE the Story:
```tsx
// WRONG — renders before withRouter wraps
const myComp = <MyComponent />
export const Default: Story = { render: () => myComp }

// RIGHT
export const Default: Story = { render: () => <MyComponent /> }
```

### Case: `useQuery` errors with "No QueryClient set"

Same root cause — add `withQueryClient` to `preview.ts`. Verify decorator order: QueryClient must wrap Router.

### Case: Story makes a real HTTP request to localhost

MSW isn't intercepting. Check:
1. `public/mockServiceWorker.js` exists
2. `staticDirs: ['../public']` in `main.ts`
3. `initialize()` called at module top level in `preview.ts`
4. `mswLoader` in `preview.ts` `loaders` array
5. `parameters.msw.handlers` includes a matching handler

Open browser devtools → Application → Service Workers — should show `mockServiceWorker.js` activated.

### Case: MSW handler doesn't match the request URL

Three common gotchas:
1. **Path params:** `http.get('/api/users/:id', ...)` — use `:id` not `/users/123`
2. **Base URL:** if your code calls `https://api.example.com/foo`, the handler must match the full URL: `http.get('https://api.example.com/foo', ...)`
3. **Trailing slash:** `/api/foo` ≠ `/api/foo/` — MSW matches exactly

Switch to `initialize({ onUnhandledRequest: 'warn' })` temporarily to see what's slipping through.

### Case: Story works alone but fails in the sidebar after switching

Cross-story state leak. Causes + fixes:
- **QueryClient leak** — verify `mock-query-client.tsx` creates a fresh client in the decorator body (not at module scope)
- **localStorage leak** — add a `beforeEach` resetting `localStorage.clear()`
- **MSW handler leak** — msw-storybook-addon resets between stories by default; if not, check addon version
- **Module-level singleton** — refactor the consuming component to accept the singleton via prop or context

### Case: Component reads `window.matchMedia` and breaks in Storybook

Add a polyfill in `preview.ts`:
```ts
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false, media: query, onchange: null,
    addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
    dispatchEvent: () => false,
  } as MediaQueryList)
}
```

### Case: Component reads `import.meta.env.VITE_*`

Storybook respects Vite's env, but only vars prefixed `VITE_` (or whatever `envPrefix` is configured). Add a `.storybook/.env`:
```
VITE_API_BASE=http://localhost:3001
VITE_DD_ENV=storybook
```

### Case: Component uses `useRouter` from Next.js

Install `storybook-addon-next-router` and add `RouterContext.Provider` decorator. See `mock-infrastructure.md` Pattern 2 Next.js variant.

## Component coupling cases

### Case: Component imports a Supabase / Firebase client at module load

The client tries to connect on import → breaks Storybook startup.

Fix options:
1. **Lazy-init** the client: change `const supabase = createClient(...)` → `const getSupabase = () => createClient(...)`
2. **Mock the module** via Vite alias in `sb-vite.config.ts`:
   ```ts
   alias: { '~/lib/supabase': path.resolve(import.meta.dirname, '.storybook/mocks/supabase.ts') }
   ```
3. **Refactor to dependency injection** — pass the client as a prop or via context

Best long-term: option 3. Short-term: option 2.

### Case: Component imports an e2b / Pusher / WebSocket singleton

Same approach as Supabase. The singleton pattern is fundamentally hard to mock — refactor toward DI.

If urgent: alias-mock the singleton in `sb-vite.config.ts`:
```ts
alias: { '~/lib/e2b': path.resolve(import.meta.dirname, '.storybook/mocks/e2b.ts') }
```

In `.storybook/mocks/e2b.ts`:
```ts
export const e2bSessionManager = {
  getSandboxIdForProject: () => 'mock-sandbox-id',
  loadPreviewUrl: () => null,
  savePreviewUrl: () => {},
  // ... full mock API surface
}
```

### Case: Component imports a heavy CSS-in-JS library and Storybook errors on parsing

If the lib is `styled-components` v6 or `emotion`, you'll need to add `@storybook/addon-styling`:
```bash
pnpm --filter ui add -D @storybook/addon-styling
```
And register the addon in `main.ts`.

### Case: Tailwind classes don't apply in Storybook

Check:
1. Tailwind preset CSS imported in `preview.ts`: `import '../src/styles/tailwind-preset.css'`
2. `content` glob in `tailwind.config.ts` includes story files: `content: ['./src/**/*.{ts,tsx,stories.tsx}']`
3. PostCSS config exists in the UI pkg (or globally)

### Case: Custom font doesn't load in Storybook

Either:
1. Import the font in `preview.ts`: `import './fonts.css'`
2. OR add font preload links via `.storybook/preview-head.html`:
   ```html
   <link rel="preconnect" href="https://fonts.googleapis.com" />
   <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono" rel="stylesheet" />
   ```

## Story rendering cases

### Case: Story renders blank with no error

Usually a Suspense or async render issue. Check:
- Component uses `<Suspense>` boundary internally? Wrap story in one:
  ```tsx
  export const Default = { render: () => <Suspense fallback={null}><Component /></Suspense> }
  ```
- Component uses dynamic import that fails? Check Network tab.

### Case: Story renders but interactions don't work

- Verify `actions: { argTypesRegex: '^on[A-Z].*' }` in `preview.ts` if relying on auto-action-logging
- Handler args might be undefined — pass real fns or `fn()` mocks

### Case: Stories all have a horizontal scroll bar

`parameters.layout: 'centered'` (the default) wraps stories in a centered container. For full-bleed screens, set `layout: 'fullscreen'`:
```ts
const meta: Meta = {
  parameters: { layout: 'fullscreen' },
}
```

### Case: Decorator wraps story unexpectedly

Decorators apply right-to-left. Array `[A, B, C]` renders as `A(B(C(Story)))`. If theme should be inner-most (closest to Story), put it LAST in the array.

### Case: ResizeObserver / IntersectionObserver errors

Add polyfills to `preview.ts`:
```ts
if (typeof window !== 'undefined') {
  window.ResizeObserver ||= class { observe() {} unobserve() {} disconnect() {} } as any
  window.IntersectionObserver ||= class { observe() {} unobserve() {} disconnect() {} root = null rootMargin = '' thresholds = [] takeRecords() { return [] } } as any
}
```

### Case: framer-motion / GSAP animations don't run

framer-motion needs `LazyMotion` and `features`. In a story:
```tsx
import { LazyMotion, domMax } from 'framer-motion'
export const Default: Story = {
  render: () => (
    <LazyMotion features={domMax}>
      <AnimatedComponent />
    </LazyMotion>
  ),
}
```

Or add a global decorator wrapping in LazyMotion if every story needs it.

### Case: Canvas rendering looks pixelated

`canvas` element needs DPR-aware setup:
```ts
const dpr = window.devicePixelRatio || 1
canvas.width = width * dpr
canvas.height = height * dpr
ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
```

This is in the rendering code, not Storybook config.

## Performance cases

### Case: Storybook is slow to boot (10+ seconds)

Check:
- `stories` glob too broad? Narrow to specific subdirs
- Old `addon-essentials` separately listed? Remove on v8+ (it's bundled)
- `radix-ui` umbrella package? Storybook 9 logs "unable to find package.json for radix-ui" — harmless, ignore
- Vite scanning node_modules? Add `optimizeDeps.exclude` for known-slow deps

### Case: HMR doesn't pick up changes

Sometimes Vite's dependency cache gets stale. Kill Storybook and run:
```bash
rm -rf node_modules/.vite node_modules/.cache
pnpm storybook
```

### Case: Storybook build is huge (> 50MB)

- Check that production-only assets aren't being shipped (large images, fonts)
- `staticDirs` should only include necessary assets
- Use `@storybook/preset-typescript` with `transpileOnly: true` for faster builds

## Build / CI cases

### Case: Chromatic / CI Storybook build fails with "MSW worker not found"

`public/mockServiceWorker.js` is .gitignored. Add to git:
```bash
git add -f packages/ui/public/mockServiceWorker.js
```

Or run `msw init public/` in CI before build:
```yaml
# .github/workflows/storybook.yml
- run: pnpm --filter ui exec msw init public/ --save
- run: pnpm --filter ui build-storybook
```

### Case: TypeScript errors only in Storybook build, not regular typecheck

Storybook has its own tsconfig (`.storybook/tsconfig.json`). It may pull in story files that the main tsconfig excludes. Either:
- Add `**/*.stories.tsx` to the main `tsconfig.json` `include`
- OR sync the Storybook tsconfig with the main one

### Case: Storybook build OOM (out of memory)

```bash
NODE_OPTIONS=--max-old-space-size=8192 pnpm build-storybook
```

For monorepos: check that `staticDirs` isn't accidentally including `node_modules`.

## Port / module migration cases (Strategy C)

### Case: Ported component still imports `~/`

Run `grep -rn "from '~/" packages/ui/src/components/<module>/`. For each hit:
- If the dependency is small + reusable → move it to UI pkg, replace import
- If the dependency is app-specific (services, stores) → component shouldn't be in UI pkg; reconsider strategy (use B or D instead)

### Case: Ported component renders but doesn't animate / canvas blank

framer-motion v11 changed import paths. Check `import { m, LazyMotion, domMax } from 'framer-motion'` works in UI pkg. If not, downgrade or upgrade host repo to match.

For canvas: verify the canvas ref is being attached AFTER the element mounts. Use `useEffect` with the canvas ref:
```tsx
useEffect(() => {
  const canvas = canvasRef.current
  if (!canvas) return
  setupClaimableDotsCanvas(canvas, width, height)
}, [width, height])
```

### Case: Ported CSS uses Tailwind classes that aren't in UI pkg's Tailwind config

Add the source files to UI pkg `tailwind.config.ts content` glob. Otherwise classes get tree-shaken out:
```ts
content: [
  './src/**/*.{ts,tsx}',
  './src/components/community/**/*.{ts,tsx}', // explicit
]
```

### Case: Ported hook references `~/shared/hooks/useViewportSize`

That hook moves to UI pkg too. Common candidates that should ALSO move:
- `useViewportSize`
- `useClickOutside`
- `useDebouncedValue`
- `useLocalStorage`
- `useMediaQuery`

Any hook that's app-specific (uses `useNavigate`, services, stores) stays in apps/web. The screen accepts the hook's return value as a prop instead.

## Audit cases

### Case: Audit finds raw `text-red-400` instead of token

Either:
- Add a red palette to design tokens (`fiddle-elements-error-text`)
- OR accept the raw color as intentional and document it in a comment

Same for any non-tokenized color. Goal is consistency, not zero-raw-colors.

### Case: Audit finds clickable `<div>`

Convert to `<button type="button">` with explicit `onClick`. If the visual was draggable (e.g. tldraw shape), use `role="button"` + `tabIndex={0}` + keyboard handler.

### Case: Audit finds `<h2>` on a route-level screen

Route-level screens get `<h1>`. Component-level cards get `<h2>` or `<h3>`. Check heading hierarchy with a screen reader simulator.

### Case: Audit finds `as any` in test-utils

Type-augment `Parameters` (see `mock-infrastructure.md` Section 7).

## Anti-patterns to refuse

If asked to do any of these, push back:

- **"Add Storybook to apps/web"** — breaks the boundary. UI pkg owns Storybook; apps don't.
- **"Mock e2b/Supabase singleton in a story without refactoring"** — short-term works via alias-mock; long-term requires DI refactor.
- **"Make the screen import from apps/web"** — UI pkg must be standalone. If a screen needs an app type, the type moves to UI pkg.
- **"Delete the production component immediately after porting"** — leave both for 1-2 sprints. Use staged migration.
- **"Skip the typecheck"** — never.
