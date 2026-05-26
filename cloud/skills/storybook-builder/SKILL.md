---
name: storybook-builder
description: End-to-end Storybook builder for any repo. Sets up branding (logo, colors, fonts, design tokens), primitives (Button/Input/Label), components (Cards/Forms/Headers/Sidebars), layouts (AppShell/LandingShell/SplitShell/EmptyState/LoadingShell), screens (full route compositions), and mock infrastructure (MSW + React Query + MemoryRouter decorators). Use when the user says "add storybook", "set up storybook", "build design system in storybook", "create screen stories", "turn routes into stories", "mock data for stories", "port components to ui package", "set up brand tokens", or wants a complete design-system Storybook. Includes a curated addon index so you pick the right plugin per use case.
---

# Storybook Builder

A complete playbook for building a design-system Storybook from scratch. Outputs every layer of a UI package:

- **Branding** — colors, fonts, design tokens, logo, theme switcher
- **Primitives** — Button, Input, Label, Tooltip, etc. (shadcn-style)
- **Components** — Cards, lists, navigation, forms, headers, sidebars
- **Layouts** — AppShell, LandingShell, SplitShell, EmptyState, LoadingShell
- **Screens** — full route compositions (Login, Signup, Home, Community, Playground, etc.)
- **Mock pipeline** — MSW + QueryClient + MemoryRouter decorators
- **Addons** — Figma, theme toggle, docs, tag badges (curated per use case)

This skill encodes patterns from a real port of a fiddle-factory monorepo: 5 layout primitives, 5 screen components, MSW + MemoryRouter + QueryClient decorators, and a full 1776-line community module port from `apps/web` to `packages/ui`.

## When to use this skill

- Repo has **no Storybook** and you need to add it from scratch.
- Repo has Storybook but lacks a **branding/token system** (no design tokens, ad-hoc colors).
- Repo has Storybook but no **screen-level** stories (only primitives/components).
- You want to **port heavy modules** from app → UI pkg so they're testable in isolation.
- A real route renders fine in the app but **can't render in Storybook** because of hooks, services, or singletons.
- You want **e2e fidelity** — the Storybook screen must look identical to the production route.
- You need to pick the right Storybook addon for a use case (data mocking, design, theming, organize).

## Workflow

The full workflow is a 6-phase pipeline. Run phases in order; phases 3-7 can run in parallel via agents.

### Phase 0 — Audit the repo

Before writing any code:

1. Find route files: `find apps/*/app/routes -type f -o -name "_index.*" -o -name "pages/*"`
2. Find existing UI package: look for `packages/ui`, `packages/design-system`, or `packages/components`
3. Check current Storybook state: `ls packages/*/.storybook/ 2>/dev/null`
4. For each route, list its direct imports — anything from `~/services`, `~/lib/e2b`, `~/store`, singletons, or React Query hooks is **mock-required**.
5. Decide tradeoff per route:
   - **Simple route** (1-2 hooks) → refactor route to call new screen, mock the hooks in story
   - **Complex route** (5+ hooks, e2b/canvas/sandbox coupling) → extract a **presentational shell** with slots; production keeps using its layout, Storybook gets a fixture-fed twin
   - **Heavy module with shared sub-components** (framer-motion canvas, custom rendering) → **port the whole module** into the UI package; both production and Storybook consume from there

### Phase 1 — Install Storybook (greenfield)

If `packages/ui/.storybook/` doesn't exist:

```bash
# In the target package directory (NOT repo root)
pnpm --filter @your-scope/ui dlx storybook@latest init --type react
```

After init, immediately add:

```bash
pnpm --filter @your-scope/ui add -D \
  msw msw-storybook-addon \
  @tanstack/react-query \
  react-router-dom \
  @storybook/test
```

Then initialize the MSW worker (writes `public/mockServiceWorker.js`):

```bash
pnpm --filter @your-scope/ui exec msw init public/ --save
```

**Note on remix-react-router addon:** `storybook-addon-remix-react-router@6.x` targets react-router v7 + storybook v10. If the host repo uses react-router v6 + storybook v9, install it but **don't register it** in `main.ts` — write a thin `MemoryRouter` decorator instead (see `references/mock-router-template.tsx`).

### Phase 2 — Build the mock infrastructure

Create `packages/ui/src/test-utils/`:

- `mock-query-client.tsx` — `withQueryClient` decorator. Fresh `QueryClient` per render with `retry: false`, `gcTime: 0`, `staleTime: 0`. Override via `parameters.queryClient.defaultOptions`.
- `mock-router.tsx` — `withRouter` decorator using `MemoryRouter`. Override `initialEntries`, `initialIndex`, `path` via `parameters.router`.
- `mock-handlers.ts` — exports `defaultHandlers: RequestHandler[] = []`. Stories compose: `[...defaultHandlers, http.get(...)]`.
- `index.ts` — barrel.

Wire into `.storybook/preview.ts`:

```ts
import { initialize, mswLoader } from 'msw-storybook-addon'
import { withQueryClient } from '../src/test-utils/mock-query-client'
import { withRouter } from '../src/test-utils/mock-router'

initialize({ onUnhandledRequest: 'bypass' })

const preview: Preview = {
  loaders: [mswLoader],
  decorators: [withQueryClient, withRouter, /* existing theme decorator */],
  parameters: { msw: { handlers: [] } /* ... */ },
}
```

Add `screens/**` glob to `.storybook/main.ts`:

```ts
stories: [
  '../src/primitives/**/*.stories.@(ts|tsx)',
  '../src/components/**/*.stories.@(ts|tsx)',
  '../src/screens/**/*.stories.@(ts|tsx)',  // ← add this
]
```

Add `.storybook/types.d.ts` to type-augment `Parameters` for IDE autocomplete (see `references/types-augmentation.ts`).

**Full code templates** for all 4 test-util files: see `references/mock-infrastructure.md`.

### Phase 3 — Build layout primitives

Create 5 framework-free primitives in `packages/ui/src/components/layout/`:

| Primitive | Props | Purpose |
|---|---|---|
| `AppShell` | `header?`, `children`, `className?` | Top-level page shell (vertical flex, header + content) |
| `LandingShell` | `navLinks[]`, `logo?`, `children`, `interactive?` | Auth/marketing chrome (dot-grid + nav + centered card) |
| `SplitShell` | `sidebar`, `main`, `sidebarSide?`, `sidebarWidth?`, `hideSidebar?` | Sidebar + main pane |
| `EmptyState` | `title`, `description?`, `action?`, `icon?`, `compact?` | Empty/no-data state |
| `LoadingShell` | `logoSrc?`, `message?` | Full-screen loading w/ spinner (`role="status"`) |

**Rules:**
- Use only design tokens (`bg-fiddle-elements-*` or whatever the host repo uses)
- No routing, no data-fetching, no hooks
- Each in its own folder: `app-shell/index.tsx` + `app-shell.stories.tsx`
- Export from `components/layout/index.ts`

**Full code:** see `references/layout-primitives.md`.

### Phase 4 — Decide screen strategy per route

For each route, pick ONE strategy:

| Strategy | When to use | Cost | Fidelity |
|---|---|---|---|
| **A. Refactor route → use screen** | Route is mostly state + form (signup, simple forms) | Low | Identical |
| **B. Presentational twin** | Route renders an existing complex component (HomePage, dashboard) | Med | Same JSX structure, fixture data |
| **C. Port module to UI pkg** | Heavy custom rendering (framer-motion canvas, custom SVG, themed sub-components) | High | Pixel-identical |
| **D. Slot-based shell** | Route wires 3+ heavy children (canvas + chat + panels) | Med | Visual scaffold, no real children |

**Strategy A example** — signup screen:

```tsx
// packages/ui/src/screens/signup.screen.tsx
export function SignupScreen(props: SignupScreenProps) { /* form JSX */ }

// apps/web/app/routes/signup.tsx (refactored)
function SignUp() {
  const [email, setEmail] = useState('')
  // ... state + handlers
  return <SignupScreen email={email} ... />
}
```

**Strategy C example** — port a module:

```bash
# Find all files
find apps/web/app/modules/community -type f

# Copy each file to packages/ui/src/components/community/, replacing:
#   ~/modules/community/X    →   relative ../X
#   ~/shared/hooks/useViewportSize  →  ../../../hooks/useViewportSize (move it too)
# Keep public-net hooks (polling/preload) in apps/web; they don't go to UI pkg.
```

**Full decision tree + code patterns:** see `references/screen-strategies.md`.

### Phase 5 — Write stories with interactivity

Every screen story should have:

1. **Static variants** — `args:` for each meaningful state (default, loading, error, empty, submitting)
2. **One Interactive variant** — wraps the screen in a `useState`-driven local component so users can actually type/click

```tsx
function InteractiveSignup() {
  const [email, setEmail] = useState('')
  // ...
  return <SignupScreen email={email} onEmailChange={setEmail} ... />
}

export const Default: Story = { render: () => <InteractiveSignup /> }
export const WithError: Story = { args: { /* static error state */ } }
```

**Storybook hygiene checklist:**
- `title: 'Screens/X'` (or `Layout/X` for primitives)
- `parameters: { layout: 'fullscreen' }` for full-page screens
- `Meta<typeof Component>` typed
- At least one story per meaningful UI state
- One interactive variant if the screen has user input
- `docs.description.component` explains what the screen mirrors

**Full templates:** see `references/story-templates.md`.

### Phase 6 — Audit checklist

Before declaring done, walk this list (also runnable as 2 parallel review agents):

**Story quality:**
- [ ] States covered: default, loading, error, empty, submitting, populated (where applicable)
- [ ] Props completeness: every documented prop exercised
- [ ] Interactivity: at least one `useState`-driven variant per stateful screen
- [ ] Design tokens: no raw hex/rgb where tokens exist (exceptions: intentional brand colors like `#040404` for community → document)
- [ ] No AI slop: distinctive fonts, purposeful motion, no generic purple-on-white gradients
- [ ] Accessibility: semantic HTML (`button` not `div`), `aria-label` on icon-only buttons, `role="status"` on spinners, h1 for page titles
- [ ] Coupling: primitives don't import from screens/; screens may import from layout/; no react-router or @tanstack/react-query imports in components (those live in decorators)

**Mock pipeline:**
- [ ] `initialize({ onUnhandledRequest: 'bypass' })` — or `'warn'` in dev / `'error'` in CI
- [ ] Fresh QueryClient per render (decorator body, not module scope)
- [ ] `MemoryRouter` not `BrowserRouter`
- [ ] Decorator order correct (Storybook applies right-to-left)
- [ ] MSW worker in public dir, `staticDirs` includes it
- [ ] `parameters.msw.handlers` override pattern works across stories
- [ ] Existing primitive stories still render (no nested-router collision)

**Typecheck + boot:**
- [ ] `pnpm --filter @your-scope/ui typecheck` clean
- [ ] `pnpm --filter @your-scope/ui storybook` boots, HTTP 200 on assigned port
- [ ] All screen stories appear in sidebar

## Addon Index — pick the right plugin per use case

When stories need a capability, check this index before writing custom code. Categories link to the upstream tag pages.

### [Data & State](https://storybook.js.org/addons/tag/data-state) — mock APIs, network, time, contexts

| Use case | Addon | npm |
|---|---|---|
| Mock HTTP fetch/XHR (recommended default) | Mock Service Worker | `msw-storybook-addon` |
| Mock fetch only (lighter) | Mock fetch() | `storybook-addon-fetch-mock` |
| Mock arbitrary API responses | Mock API Request | `storybook-addon-mock` |
| Freeze JS `Date` per story | Mocking Date | `storybook-addon-mock-date` |
| Apollo GraphQL queries | Apollo Client | `storybook-addon-apollo-client` |
| urql GraphQL queries | urql | `@urql/storybook-addon` |
| Manipulate React Context | storybook-react-context | `storybook-react-context` |
| Mock Next.js router | Next.js router | `storybook-addon-next-router` |
| Set `document.cookie` | Cookie | `storybook-addon-cookie` |
| Mock backend with MirageJS | MirageJS | `storybook-mirage` |
| Event-tracking visualization | walkerOS | `@walkeros/storybook-addon` |

**Default for new repos:** `msw-storybook-addon` covers ~95% of HTTP needs.

### [Design](https://storybook.js.org/addons/tag/design) — Figma, design tokens, pixel-perfect, layout overlays

| Use case | Addon | npm |
|---|---|---|
| Embed Figma frame in addon panel | Designs (official) | `@storybook/addon-designs` |
| Embed Figma frame (community) | Designs | `storybook-addon-designs` |
| Show design tokens (DTCG) | Swatchbook | `@unpunnyfuns/swatchbook-addon` |
| Design token tables in docs | Design token tables | `@etchteam/storybook-addon-design-token-tables` |
| Manipulate CSS custom props live | CSS Custom Properties | `@ljcl/storybook-addon-cssprops` |
| Inspect CSS box-model | Measure | `@junk-temporary-prototypes/addon-measure` |
| Column grid overlay | Column Guides | `storybook-addon-grid` |
| Responsive breakpoint preview | Breakpoints | `storybook-addon-breakpoints` |
| Pixel-perfect Figma overlay | Pixel Perfect | `@lagosta/pixel-perfect-storybook-addon` |
| Resize iframe with handles | Resizr | `@liip/storybook-addon-resizr` |
| Color picker palette | Color picker | `storybook-color-picker` |
| Theme switcher (CSS vars) | CSS Variables Theme | `@etchteam/storybook-addon-css-variables-theme` |
| Tailwind config → docs | Tailwind Autodocs | `storybook-addon-tailwind-autodocs` |
| Zeplin integration | storybook-zeplin | `storybook-zeplin` |
| Configure styling (Tailwind/Emotion/etc.) | Styling | `@storybook/addon-styling` |
| AI-powered Figma diff | UI Review | `@uicopilot/storybook-addon` |

**Default for new repos:** `@storybook/addon-designs` for Figma + `@storybook/addon-styling` for Tailwind/Emotion.

### [Appearance](https://storybook.js.org/addons/tag/appearance) — themes, dark mode, highlights, viewports

| Use case | Addon | npm |
|---|---|---|
| Dark/light mode toggle (community-maintained) | storybook-dark-mode | `storybook-dark-mode` |
| Highlight DOM nodes | Highlight (official) | `@storybook/addon-highlight` |
| Tailwind dark mode toggle | Tailwind dark mode | (search npm — multiple forks) |
| Theme + provider + true dark | Facelift | `storybook-facelift` |
| Pixel-perfect overlay | Pixel Perfect | `storybook-addon-pixel-perfect` |
| Visual regression (commercial) | Applitools Eyes | `@applitools/eyes-storybook-addon` |
| Embed iframe inside story | iFrame | `storybook-addon-iframe` |
| Render component permutations as table | Permutation | `storybook-addon-permutation` |
| Toolbar action buttons | Toolbar actions | (community) |
| Render CSS outlines on elements | Outline | `storybook-addon-outline` |

**Default for new repos:** `@storybook/addon-highlight` (built-in in Essentials in v8+) + dark-mode addon if your design system has both themes.

### [Organize](https://storybook.js.org/addons/tag/organize) — docs, navigation, sidebar metadata

| Use case | Addon | npm |
|---|---|---|
| Auto-generate component docs | Docs (official, in Essentials) | `@storybook/addon-docs` |
| Link stories together | Links (official) | `@storybook/addon-links` |
| Tag badges in sidebar | Tag Badges | `storybook-addon-tag-badges` |
| Component status (draft/stable/deprecated) | Status | `@etchteam/storybook-addon-status` |
| Story badges (e.g. "WIP") | Badges | `storybook-addon-badges` |
| Open component source in VS Code | storybook-vscode-component | `storybook-vscode-component` |
| TOC for MDX docs | Table of contents | `storybook-docs-toc` |
| Switch git branches in Storybook | Branch switcher | `storybook-branch-switcher` |
| Full-text search across MDX | Text Search | `@tchwrks/storybook-text-search` |
| Browse dependency tree of stories | Component dependency tree | `storybook-addon-dependencies` |
| Folder-based config | Storybook include | `storybook-include` |
| Markdown docs alongside stories | storybook-addon-markdown-docs | `storybook-addon-markdown-docs` |

**Default for new repos:** `@storybook/addon-docs` + `storybook-addon-tag-badges` if you have multiple statuses per component.

### [Essentials](https://storybook.js.org/addons/tag/essentials) — the bundle

Storybook 8+ ships `@storybook/addon-essentials` bundling: `@storybook/addon-docs`, `@storybook/addon-controls`, `@storybook/addon-actions`, `@storybook/addon-viewport`, `@storybook/addon-backgrounds`, `@storybook/addon-toolbars`, `@storybook/addon-measure`, `@storybook/addon-outline`, `@storybook/addon-highlight`.

**In Storybook 9** these are folded into core. Don't install separately unless on v7 or earlier.

## Coverage Checklist — for greenfield Storybook setup

When adding Storybook to a fresh repo, walk this checklist. Tick each item as covered.

### Setup

- [ ] Storybook init run via `dlx storybook@latest init`
- [ ] Target framework correct (`react-vite`, `nextjs`, `sveltekit`, etc.)
- [ ] `staticDirs: ['../public']` set
- [ ] `tailwind-preset.css` / design-token CSS imported in `preview.ts`

### Branding (see references/branding-system.md)

- [ ] `src/styles/tokens.css` — all design tokens defined
- [ ] `src/styles/tailwind-preset.css` — Tailwind mapping
- [ ] `src/styles/fonts.css` — self-hosted fonts loaded
- [ ] `public/logo.svg` (+ mark / wordmark variants)
- [ ] `src/brand/logo/` component + story
- [ ] `Brand/Colors` palette story
- [ ] `Brand/Typography` scale story
- [ ] Dark/light theme toggle wired
- [ ] No raw hex/rgb in components — tokens only

### Components (see references/components-catalog.md)

- [ ] Primitives (Button, Input, Label, Tooltip, Popover)
- [ ] Cards (ProjectCard, ProfileCard, MetricCard as needed)
- [ ] Navigation (Header, Sidebar, Breadcrumb)
- [ ] Forms (FormField, LoginForm, SearchInput)
- [ ] Feedback (Spinner, ProgressBar, Skeleton, Toast)
- [ ] Data display (Avatar, Badge, KeyValue, CodeBlock)
- [ ] Each component has its own folder + story file

### Mocking

- [ ] MSW installed + worker initialized in `public/`
- [ ] `withQueryClient` decorator (fresh client per render)
- [ ] `withRouter` decorator (MemoryRouter; correct version of react-router)
- [ ] `mock-handlers.ts` with `defaultHandlers: []` composition pattern documented
- [ ] `parameters.msw.handlers` override pattern works
- [ ] localStorage / sessionStorage reset between stories (decorator or `beforeEach`)

### Design tokens & theme

- [ ] Dark/light theme decorator wired
- [ ] `data-theme` attribute set on `documentElement`
- [ ] `backgrounds` parameter mirrors theme colors
- [ ] Design tokens accessible via Tailwind preset or CSS vars

### Layout primitives

- [ ] AppShell (header + content)
- [ ] LandingShell (marketing/auth chrome)
- [ ] SplitShell (sidebar + main)
- [ ] EmptyState (no data)
- [ ] LoadingShell (full-screen spinner)
- [ ] Each primitive has its own story file

### Screens (one per route)

- [ ] Each route audited (which strategy A/B/C/D applies)
- [ ] Each screen has at least: Default + 1 error/empty state + 1 loading state
- [ ] Stateful screens have an `InteractiveX` variant using `useState`
- [ ] Production route updated to use the screen (Strategy A only)
- [ ] Modules ported to UI pkg use **relative imports**, no `~/` aliases

### Quality

- [ ] `pnpm typecheck` clean in UI pkg
- [ ] `pnpm typecheck` clean in app pkg (route refactors don't break)
- [ ] Storybook boots, HTTP 200 on assigned port
- [ ] All screen stories appear in sidebar
- [ ] No console errors on first 5 story renders
- [ ] No nested-router collisions in existing primitive stories

### Addons (pick from index above)

- [ ] Data & State: `msw-storybook-addon` (always)
- [ ] Design: `@storybook/addon-designs` if Figma is in use
- [ ] Appearance: theme toggle addon if dark/light supported
- [ ] Organize: `@storybook/addon-docs` (always)
- [ ] Visual regression: Chromatic or Applitools (optional, commercial)

### Visual Sync (see references/visual-sync.md)

- [ ] Production dev server running
- [ ] Storybook running
- [ ] Per screen: prod screenshot + storybook screenshot captured (desktop 1440×900)
- [ ] Per screen: prod screenshot + storybook screenshot captured (mobile 375×812)
- [ ] Side-by-side comparison done — diffs documented or fixed
- [ ] Tool used: `agent-browser` CLI (lightest) / Chrome DevTools MCP / Playwright MCP
- [ ] All screens marked ✅ in coverage checklist
- [ ] Optional: visual sync wired into CI for regression protection

## Common pitfalls

**`storybook-addon-remix-react-router` peer-dep mismatch** — install but don't register; use a plain `MemoryRouter` wrapper.

**MSW `bypass` masks real fetches** — for CI/Chromatic snapshots, switch to `'warn'` or `'error'`.

**`as any` on `ctx.parameters`** — type-augment `@storybook/react-vite` `Parameters` interface in `.storybook/types.d.ts`. Catches typos like `parameters.routes` vs `parameters.router`.

**Decorator order reads backwards** — array `[A, B, C]` applies as `A(B(C(Story)))`. Provider-style decorators (Query, Router) go first; theme/styling decorators go last.

**Module port forgets `~/` imports** — when copying files into UI pkg, replace every `~/modules/X` with relative path. Run `grep -r "from '~/" packages/ui/src/` after porting; should return zero results.

**Production sub-component imports app-only services** — when porting, follow imports one level deep. If a component imports `useViewportSize` from `~/shared/hooks/`, that hook moves too. If it imports `e2bSessionManager`, you have a problem — that's a sign Strategy D (slot-based shell) is the right pick instead of C.

**`unable to find package.json for radix-ui`** — harmless Storybook 9 warning when `radix-ui` umbrella package is in deps. Ignore.

## Output expectations

When invoked, this skill produces:

1. A working Storybook install in the target UI package
2. 5 layout primitives + their stories
3. N screen components (one per route) with N×3+ stories
4. Production routes refactored to consume the new screens where Strategy A applies
5. A passing typecheck across UI pkg + app pkg
6. A booted Storybook serving on a known port
7. The Coverage Checklist marked up showing what's done / skipped

## References

- `references/branding-system.md` — tokens, colors, fonts, logo, theme switcher
- `references/components-catalog.md` — what components to build per category + worked ProjectCard example
- `references/layout-primitives.md` — full code for AppShell, LandingShell, SplitShell, EmptyState, LoadingShell
- `references/mock-infrastructure.md` — full code for mock-query-client, mock-router, mock-handlers, preview.ts, types.d.ts
- `references/screen-strategies.md` — decision tree + worked examples for strategies A, B, C, D
- `references/story-templates.md` — interactive vs static story patterns, hygiene checklist
- `references/visual-sync.md` — agent-browser CLI, Chrome DevTools MCP, Playwright MCP for prod-vs-storybook comparison
- `references/agent-workflows.md` — parallel agent dispatching pattern
- `references/case-handlers.md` — symptom → fix lookup for edge cases
- `references/coverage-checklist.md` — exhaustive coverage checklist
- `references/troubleshooting.md` — error message → resolution lookup
- `references/examples.md` — real worked examples (signup, home, community, playground)
- `references/addon-index.json` — machine-readable addon index table

## Validation

After running this skill, the user should be able to:

```bash
cd packages/ui && pnpm storybook
```

And see at minimum: Layout/* (5 stories), Screens/* (one per route), plus all the existing primitive/component stories. Every screen story should render without console errors and reflect the production route visually.
