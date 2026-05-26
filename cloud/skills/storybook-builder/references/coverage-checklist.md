# Coverage Checklist — Greenfield Storybook Setup

A runnable checklist for adding Storybook to a fresh repo. Walk this top-to-bottom and tick each item. Skip with `N/A` only when justified.

## Phase 0 — Repo audit

- [ ] Repo type identified: monorepo (turborepo/pnpm/nx) vs single app
- [ ] Target package decided: `packages/ui` / `packages/design-system` / new package
- [ ] Existing Storybook check: `find . -name '.storybook' -type d -not -path '*/node_modules/*'`
- [ ] Framework identified: react-vite / nextjs / sveltekit / vue3 / angular
- [ ] Routing library identified: react-router-dom (v6/v7) / next/navigation / vue-router / @tanstack/router
- [ ] Data layer identified: TanStack Query / Apollo / urql / SWR / Redux / Zustand / nanostores
- [ ] Auth / singleton coupling audited (Supabase, Firebase, e2b, Pusher) — these will need careful handling

## Phase 1 — Storybook install

- [ ] `pnpm dlx storybook@latest init` (or yarn/npm equivalent) run in target pkg
- [ ] Framework correct (`@storybook/react-vite`, `@storybook/nextjs`, etc.)
- [ ] `.storybook/main.ts` exists with correct `framework.name`
- [ ] `.storybook/preview.ts` exists with `parameters`
- [ ] First sample story runs: `pnpm storybook` boots to HTTP 200
- [ ] Stories glob covers all expected dirs: `primitives/**`, `components/**`, `screens/**`

## Phase 2 — Theming

- [ ] Project's CSS imported in `preview.ts` (Tailwind preset, design tokens, fonts)
- [ ] `data-theme` attribute set in decorator if app uses dark/light
- [ ] `backgrounds` parameter values match theme colors
- [ ] At least 2 viewports configured if responsive design matters
- [ ] Custom `parameters.layout` set per story type (`fullscreen` for screens, `centered` for components)

## Phase 3 — Mocking infrastructure

### MSW
- [ ] `msw` + `msw-storybook-addon` installed as dev deps
- [ ] `msw init public/ --save` run (writes `mockServiceWorker.js`)
- [ ] Worker file committed to git (check `.gitignore` doesn't exclude it)
- [ ] `staticDirs: ['../public']` set in `main.ts`
- [ ] `initialize({ onUnhandledRequest: 'bypass' })` in `preview.ts`
- [ ] `mswLoader` added to `preview.ts` `loaders` array
- [ ] `mock-handlers.ts` exports `defaultHandlers: []` with override doc

### Routing
- [ ] Router lib installed in UI pkg (`react-router-dom` for v6, `react-router` for v7)
- [ ] `mock-router.tsx` decorator created (NOT `BrowserRouter` — must be `MemoryRouter`)
- [ ] `withRouter` decorator added to `preview.ts`
- [ ] `parameters.router.initialEntries / path` override pattern documented
- [ ] Test: one story renders with custom params (e.g. `parameters.router = { initialEntries: ['/x'], path: '/:slug' }`)

### React Query
- [ ] `@tanstack/react-query` installed
- [ ] `mock-query-client.tsx` decorator created (fresh client per render, `retry: false`, `gcTime: 0`)
- [ ] `withQueryClient` decorator added to `preview.ts`
- [ ] `parameters.queryClient.defaultOptions` override pattern documented

### State stores (if applicable)
- [ ] Nanostores / Zustand / Redux reset helper exists
- [ ] `withStoreReset` decorator added if shared stores leak between stories
- [ ] localStorage / sessionStorage cleared in `beforeEach` if relied upon

### TypeScript safety
- [ ] `.storybook/types.d.ts` augments `Parameters` interface for `router`, `msw`, `queryClient`
- [ ] No `as any` casts in test-utils (typed via the augmentation)

## Phase 4 — Layout primitives

For each primitive: 1 component file + 1 story file + barrel export.

- [ ] `AppShell` (header + content shell)
- [ ] `LandingShell` (auth/marketing chrome with dot-grid + nav)
- [ ] `SplitShell` (sidebar + main pane)
- [ ] `EmptyState` (no-data placeholder w/ title + description + action)
- [ ] `LoadingShell` (full-screen spinner with `role="status"`)
- [ ] Barrel updated: `packages/ui/src/components/layout/index.ts`
- [ ] Each primitive uses ONLY design tokens (no raw hex/rgb)
- [ ] Each primitive has ≥ 2 story variants
- [ ] Each primitive has a typed prop interface exported

## Phase 5 — Screen strategy decisions

For each route in the app:

- [ ] Route inventoried (file path, main component, hooks used)
- [ ] Strategy chosen (A/B/C/D — see screen-strategies.md)
- [ ] If C: target sub-tree mapped in UI pkg
- [ ] If D: slot interfaces designed

## Phase 6 — Screen implementations

For each screen:

- [ ] `<name>.screen.tsx` in `packages/ui/src/screens/`
- [ ] Props interface exported with prefix `<Name>ScreenProps`
- [ ] All data via props (no hooks except local UI state)
- [ ] All side effects via callback props
- [ ] Composed from layout primitives where possible
- [ ] Design tokens only (no raw colors)
- [ ] Semantic HTML (`button`, `h1`, `form`, `label`)
- [ ] Accessibility: `aria-label`, `role`, focus visible states

For each route:

- [ ] If Strategy A: route refactored to render the screen
- [ ] If Strategy B/D: production route unchanged
- [ ] If Strategy C: production component updated to import from UI pkg
- [ ] `pnpm typecheck` in app pkg passes after route change

## Phase 7 — Screen stories

For each screen story:

- [ ] `<name>.screen.stories.tsx` exists
- [ ] `title: 'Screens/<Name>'`
- [ ] `parameters: { layout: 'fullscreen' }`
- [ ] `Meta<typeof Component>` typed
- [ ] `parameters.docs.description.component` explains what the screen mirrors
- [ ] Default story
- [ ] Loading state story
- [ ] Empty state story (if applicable)
- [ ] Error state story (if applicable)
- [ ] Interactive variant using `useState` (if stateful)
- [ ] Action handlers wired (logged via `fn()` or inline `console.log`)
- [ ] No imports from app code (`~/services`, `~/store`)

## Phase 8 — Addons (per use case from addon index)

### Always
- [ ] `msw-storybook-addon` registered in `main.ts`
- [ ] `@storybook/addon-essentials` (Storybook 8) or default v9 essentials

### If conditions
- [ ] Figma in use → `@storybook/addon-designs`
- [ ] Tailwind in use → `@storybook/addon-styling` + (optional) `storybook-addon-tailwind-autodocs`
- [ ] Dark + light themes → `storybook-dark-mode`
- [ ] Multiple component statuses → `@etchteam/storybook-addon-status` + `storybook-addon-tag-badges`
- [ ] GraphQL (Apollo) → `storybook-addon-apollo-client`
- [ ] GraphQL (urql) → `@urql/storybook-addon`
- [ ] Next.js → `storybook-addon-next-router`
- [ ] React Router v7 → custom `createMemoryRouter` decorator (or `storybook-addon-remix-react-router` if storybook v10)
- [ ] Visual regression in CI → Chromatic OR `@applitools/eyes-storybook-addon`

## Phase 9 — Audit pass

Run these as parallel review agents (architect-reviewer + code-reviewer).

### Story quality audit
- [ ] States coverage per screen
- [ ] Props completeness (every documented prop exercised)
- [ ] Interactivity (≥1 useState variant per stateful screen)
- [ ] Design tokens (no raw hex/rgb where tokens exist)
- [ ] No AI-slop aesthetics (distinctive fonts, purposeful motion)
- [ ] Accessibility (semantic HTML, aria-*, focus states)
- [ ] Storybook hygiene (titles, layout, typed meta)
- [ ] Import coupling (primitives ⊄ screens; screens ⊃ layout; no app imports)

### Mock pipeline audit
- [ ] `onUnhandledRequest` policy correct for env (bypass dev / warn ci)
- [ ] Fresh QueryClient per render verified
- [ ] MemoryRouter not BrowserRouter
- [ ] Decorator order correct (rightmost wraps innermost)
- [ ] No `as any` (types augmented)
- [ ] MSW worker present in public/
- [ ] No cross-story cache leak in spot-check
- [ ] Decorator universality (existing component stories still render)

## Phase 10 — Verification

- [ ] `pnpm --filter @your-scope/ui typecheck` — clean
- [ ] `pnpm --filter @your-scope/web typecheck` — clean (route refactors don't break)
- [ ] `pnpm --filter @your-scope/ui build` — UI pkg `dist/` rebuilt with new exports
- [ ] `pnpm --filter @your-scope/ui storybook --no-open` — boots to HTTP 200
- [ ] Manual check: open Storybook in browser, navigate to each new `Screens/*` and `Layout/*` story
- [ ] Manual check: no console errors on first 5 story renders
- [ ] Manual check: screen stories visually match production routes (open both side-by-side)
- [ ] All audit findings addressed or documented in deferral notes

## Phase 11 — Deferred / non-goals

Document what was intentionally NOT done in this pass:

- [ ] Routes that kept their existing implementations (HomePage, complex chat layouts)
- [ ] Sub-components left in apps/web because they're tightly coupled to singletons
- [ ] Stories that don't have MSW handlers because they use fixtures only
- [ ] Visual regression tests deferred to a follow-up Chromatic setup

## Definition of done

Storybook serves at HTTP 200 with:
- N layout primitive stories (5 minimum)
- N screen stories (one per audited route)
- All preexisting component / primitive stories still render
- Typecheck passes in both UI pkg and app pkg
- Coverage checklist filled out with done/skipped/deferred for every item
