# Troubleshooting — Symptom → Fix Lookup

Search this file by error message or symptom.

## Boot-time errors

### `Error: Cannot find module 'msw-storybook-addon'`
Missing dep. `pnpm --filter ui add -D msw-storybook-addon`.

### `Error: Cannot resolve 'react-router-dom'`
UI pkg doesn't have react-router. `pnpm --filter ui add -D react-router-dom`. Add as dev dep, not regular dep — UI pkg shouldn't ship it.

### `unable to find package.json for radix-ui`
Storybook 9 warning. Harmless if you're using `radix-ui` as an umbrella package. Ignore.

### `[vite] Internal server error: Failed to resolve import "~/..."`
The `~` alias isn't configured in Storybook's Vite config. Either add it to `sb-vite.config.ts` or remove the import (UI pkg should use relative paths).

### `storybook-addon-remix-react-router@6 requires storybook@10`
Peer-dep warning. Install the addon but don't register in `main.ts`. Use a plain `MemoryRouter` decorator instead. See `mock-infrastructure.md` Section 2.

### `[vite] new dependencies optimized: @tanstack/react-query, react-router-dom`
Normal. Vite is pre-bundling deps the first time they're imported. Storybook will auto-reload — wait for it.

## Component render errors

### `useNavigate() may be used only in the context of a <Router> component`
Add `withRouter` decorator to `preview.ts`. Verify order: router wraps theme (`[withQueryClient, withRouter, withTheme]`).

### `No QueryClient set, use QueryClientProvider to set one`
Add `withQueryClient` decorator. Verify it's outer to anything calling `useQuery`.

### `ReferenceError: window is not defined`
SSR-only check leaking into Storybook. Wrap in `typeof window !== 'undefined'` or move to `useEffect`.

### `TypeError: Cannot read properties of null (reading 'useState')`
React duplicates. In monorepo, `react` is being resolved from multiple `node_modules`. Add to `sb-vite.config.ts`:
```ts
resolve: { dedupe: ['react', 'react-dom'] }
```

### `Cannot find name 'JSX'`
TypeScript 5+ moved JSX namespace. Add `"jsx": "react-jsx"` to tsconfig OR use `React.JSX.Element` explicitly.

### `Component is rendered as a child of <Suspense>` warnings
Wrap the story's render in `<Suspense>`:
```tsx
render: () => (
  <Suspense fallback={<LoadingShell />}>
    <MyComponent />
  </Suspense>
)
```

### Component renders blank, no error
1. Check browser console for swallowed errors
2. Check Network tab for failing fetches (might be silently caught)
3. Add a temporary `console.log` in the component to verify it mounts
4. Verify the story's `render` returns the component, not a non-rendering value

## MSW / network errors

### Real fetch happens despite MSW
Check service worker registration in browser devtools → Application → Service Workers. If missing:
1. Verify `public/mockServiceWorker.js` exists
2. Verify `staticDirs: ['../public']` in `main.ts`
3. Verify `initialize()` runs at module top level (not inside a function)

### Handler defined but doesn't intercept
1. **Exact URL match required.** `http.get('/api/foo', ...)` ≠ requests to `https://api.com/api/foo`
2. **Path params syntax:** use `:id` not `/123`
3. **Method mismatch.** GET handler doesn't intercept POST
4. **Trailing slash matters:** `/api/foo` ≠ `/api/foo/`

Switch to `initialize({ onUnhandledRequest: 'warn' })` temporarily — console will log what slipped through.

### `[MSW] Cannot intercept request to ...`
MSW worker isn't activated. Hard refresh browser (Cmd+Shift+R). If still failing, check Service Worker is allowed for the origin.

## State / store issues

### Stories share state between renders
- **QueryClient** at module scope → fix: create inside decorator body
- **Nanostores / Zustand** not reset → add `withStoreReset` decorator
- **localStorage** persists → add `beforeEach: () => localStorage.clear()`

### Component re-renders infinitely
Usually a `useState` callback being recreated each render. Common cause: passing `onChange` inline to a memoized child. Use `useCallback` or move handler outside.

In stories: ensure interactive driver components don't re-create handlers each render:
```tsx
function InteractiveDriver() {
  const [value, setValue] = useState('')
  const handleChange = useCallback((v: string) => setValue(v), []) // ← useCallback
  return <MyComponent onChange={handleChange} />
}
```

## TypeScript errors

### `Property 'X' does not exist on type 'Parameters'`
Add type augmentation in `.storybook/types.d.ts`:
```ts
declare module '@storybook/react-vite' {
  interface Parameters {
    X?: YourType
  }
}
export {}
```

### `Type 'undefined' is not assignable to type 'RequestHandler[]'`
`defaultHandlers` typing — declare explicitly:
```ts
export const defaultHandlers: RequestHandler[] = []
```

### `Cannot find module '@/utils'`
The `@` alias maps to `src` in `sb-vite.config.ts`. Either configure it or import relatively.

### Story args don't autocomplete
Use `Meta<typeof Component>` and `StoryObj<typeof Component>`:
```tsx
const meta: Meta<typeof MyComponent> = { ... }
type Story = StoryObj<typeof MyComponent>
```

### `Function lacks ending return statement and return type does not include 'undefined'`
Adding type narrowing. Or set explicit return type `: ReactNode` on the component.

## Tailwind / CSS issues

### Tailwind classes don't apply
1. Tailwind CSS imported in `preview.ts`?
2. `tailwind.config.ts content` glob includes stories?
3. PostCSS config exists?
4. v3 vs v4 syntax mismatch?

For Tailwind v4:
```ts
// tailwind.config.ts is replaced by @theme blocks in CSS
// Storybook just needs the CSS file imported
```

### Custom CSS variables undefined
Verify the CSS file is imported in `preview.ts`:
```ts
import '../src/styles/tokens.css'
```

### Font not loading
1. `<link>` preload in `.storybook/preview-head.html`, OR
2. `@font-face` declaration in the imported CSS, OR
3. Self-hosted font in `public/fonts/`

### Dark mode toggle doesn't work
- Check that the toggle decorator sets `data-theme` on `documentElement`, not body
- Check CSS uses `[data-theme="dark"] .x` selectors, not media queries
- Some addons toggle `class="dark"` instead — coordinate with your design system

## Build / CI errors

### `pnpm build-storybook` runs out of memory
```bash
NODE_OPTIONS=--max-old-space-size=8192 pnpm build-storybook
```

### Chromatic snapshots show empty pages
MSW worker not committed. `git add -f public/mockServiceWorker.js` OR run `msw init` in CI before build.

### Different rendering in CI vs local
- Font loading: ensure self-hosted fonts, not Google Fonts CDN (might be blocked)
- Date locale: pin via `parameters.date` or set a fixed date in `beforeEach`
- `matchMedia` polyfill needed for SSR-prerendered Storybook

## Routing issues

### `useParams` returns empty object
The `Routes`/`Route` setup in the decorator must match the URL pattern.

```tsx
// In story
parameters: {
  router: { initialEntries: ['/t/community'], path: '/t/:templateName' }
}
```

The `path` MUST contain the param syntax. `initialEntries` MUST be the actual URL.

### `<Link>` clicks navigate but story doesn't update
Storybook isolates each story — navigating triggers a new story load if the URL maps elsewhere. For in-story navigation, render the entire route tree:
```tsx
<MemoryRouter initialEntries={['/']}>
  <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/details/:id" element={<Details />} />
  </Routes>
</MemoryRouter>
```

## Performance issues

### Storybook boots in 30+ seconds
- Reduce `stories` glob breadth (start specific)
- Remove unused addons
- Add `optimizeDeps.exclude` for known-large deps that don't need pre-bundling
- Check `node_modules/.vite` cache — `rm -rf` if corrupt

### HMR slow
- `optimizeDeps.include` for frequently-used deps speeds up cold start
- Check `vite.config.ts` HMR options
- Some plugins (e.g. `@vitejs/plugin-react` with old refresh) can slow HMR

### Stories list takes forever to populate
Single huge `stories.tsx` files (>50 stories) → split into smaller files.

## Module port issues (Strategy C)

### Ported component imports break with relative paths
After moving file from `apps/web/app/modules/X/Y/Z.tsx` to `packages/ui/src/components/X/Y/Z.tsx`, every `~/modules/X/...` import needs to become a relative path. Run:
```bash
grep -rn "from '~/" packages/ui/src/
```
Fix each one. Then re-grep until zero results.

### Ported framer-motion component doesn't animate
- Ensure `framer-motion` is in UI pkg's deps (might be in apps/web only)
- Ensure version matches between apps/web and UI pkg to avoid duplicates

### Canvas rendering blank after port
- Canvas ref isn't attached on first render. Add `useEffect` to set up after mount.
- DPR setup missing → looks pixelated.

### CSS animations don't run
- CSS file not imported in screen
- Tailwind purged the class → add the source file to `content` glob

## Audit findings — common patterns

### `<div onClick>` instead of `<button>`
Always fix. Add keyboard handler too:
```tsx
<button type="button" onClick={...}>...</button>
```

### `<h2>` on a route-level screen
Route gets `<h1>`. Components inside use `<h2>`, `<h3>`.

### Raw `text-red-400` instead of token
If a red palette exists in tokens, use it. If not, add it OR document the raw color is intentional.

### Empty `aria-label` on icon-only button
`<button aria-label="...">` is required when only an icon child renders.

### Story without interactive variant for stateful screen
Add an `InteractiveX` wrapper using `useState`. See `story-templates.md` Pattern 2.

## When all else fails

1. `rm -rf node_modules .vite` and reinstall
2. Compare against a working setup — clone https://github.com/storybookjs/template-bootstraps for reference
3. Run `pnpm storybook --debug-webpack` (or `--debug` for Vite) for verbose output
4. Check Storybook GitHub issues for the exact error string
5. If MSW-specific, check https://github.com/mswjs/examples for working configs
