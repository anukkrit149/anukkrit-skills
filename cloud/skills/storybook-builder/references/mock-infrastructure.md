# Mock Infrastructure — Full Code Reference

Drop-in templates for the entire mock pipeline. Every file below goes into `packages/ui/src/test-utils/` or `.storybook/` as noted.

## 1. `src/test-utils/mock-query-client.tsx`

```tsx
import type { Decorator } from '@storybook/react-vite'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

/**
 * Fresh QueryClient per story render. Disables retries + GC so each
 * story starts from a clean slate — no cache leaks between stories.
 *
 * Override per-story by setting `parameters.queryClient.defaultOptions`.
 */
export const withQueryClient: Decorator = (Story, ctx) => {
  const overrides = (ctx.parameters as any)?.queryClient?.defaultOptions ?? {}
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0, ...overrides.queries },
      mutations: { retry: false, ...overrides.mutations },
    },
  })
  return (
    <QueryClientProvider client={client}>
      <Story />
    </QueryClientProvider>
  )
}
```

## 2. `src/test-utils/mock-router.tsx`

```tsx
import type { Decorator } from '@storybook/react-vite'
import React from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

export type StoryRouterParams = {
  initialEntries?: string[]
  initialIndex?: number
  path?: string
}

export const withRouter: Decorator = (Story, ctx) => {
  const params = ((ctx.parameters as any)?.router ?? {}) as StoryRouterParams
  const initialEntries = params.initialEntries ?? ['/']
  const initialIndex = params.initialIndex ?? 0
  const path = params.path ?? '*'

  return (
    <MemoryRouter initialEntries={initialEntries} initialIndex={initialIndex}>
      <Routes>
        <Route path={path} element={<Story />} />
      </Routes>
    </MemoryRouter>
  )
}
```

**React Router v7 variant** — if the host repo is on v7, swap to:

```tsx
import { createMemoryRouter, RouterProvider } from 'react-router'

export const withRouter: Decorator = (Story, ctx) => {
  const params = ((ctx.parameters as any)?.router ?? {})
  const router = createMemoryRouter(
    [{ path: params.path ?? '*', element: <Story /> }],
    { initialEntries: params.initialEntries ?? ['/'] }
  )
  return <RouterProvider router={router} />
}
```

**Next.js variant** — use `storybook-addon-next-router`:

```tsx
import { RouterContext } from 'next/dist/shared/lib/router-context'
export const withRouter: Decorator = (Story, ctx) => (
  <RouterContext.Provider value={{
    push: () => Promise.resolve(true),
    replace: () => Promise.resolve(true),
    pathname: (ctx.parameters as any)?.router?.pathname ?? '/',
    query: (ctx.parameters as any)?.router?.query ?? {},
    /* ... full mock ... */
  }}>
    <Story />
  </RouterContext.Provider>
)
```

## 3. `src/test-utils/mock-handlers.ts`

```ts
import type { RequestHandler } from 'msw'

/**
 * Default MSW handlers applied to every story. Keep this empty —
 * stories override via `parameters.msw.handlers = [...]`.
 *
 * Compose with defaults:
 *
 *   import { http, HttpResponse } from 'msw'
 *   import { defaultHandlers } from '~/test-utils'
 *
 *   MyStory.parameters = {
 *     msw: {
 *       handlers: [
 *         ...defaultHandlers,
 *         http.get('/api/user', () => HttpResponse.json({ id: '1' })),
 *       ],
 *     },
 *   }
 *
 * msw-storybook-addon automatically resets handlers between stories.
 */
export const defaultHandlers: RequestHandler[] = []
```

## 4. `src/test-utils/index.ts`

```ts
export { withQueryClient } from './mock-query-client'
export { withRouter, type StoryRouterParams } from './mock-router'
export { defaultHandlers } from './mock-handlers'
```

## 5. `.storybook/preview.ts`

```ts
import type { Preview } from '@storybook/react-vite'
import React from 'react'
import { initialize, mswLoader } from 'msw-storybook-addon'

import { withQueryClient } from '../src/test-utils/mock-query-client'
import { withRouter } from '../src/test-utils/mock-router'
import { defaultHandlers } from '../src/test-utils/mock-handlers'

// Theme CSS imports
import '../src/styles/tailwind-preset.css'
import '../src/styles/index.css'

// Boot MSW once. 'bypass' lets non-mocked requests pass through silently —
// safe for design-system stories that don't fetch. Switch to 'warn' in dev
// or 'error' in CI / Chromatic to catch forgotten handlers.
initialize({ onUnhandledRequest: 'bypass' })

const preview: Preview = {
  parameters: {
    controls: { disable: true },
    actions: { disable: true },
    viewport: { defaultViewport: 'responsive' },
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#171717' },
        { name: 'light', value: '#ffffff' },
      ],
    },
    layout: 'centered',
    msw: { handlers: defaultHandlers },
  },
  loaders: [mswLoader],
  decorators: [
    withQueryClient,
    withRouter,
    (Story: any) => {
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', 'dark')
        document.body.style.backgroundColor = '#171717'
      }
      return React.createElement(Story)
    },
  ],
}

export default preview
```

**Decorator order matters.** Storybook applies right-to-left, so:

```ts
decorators: [withQueryClient, withRouter, withTheme]
// applies as: <QueryClient><Router><Theme><Story /></Theme></Router></QueryClient>
```

Provider-style decorators (Query, Router) first; theme/styling decorators last.

## 6. `.storybook/main.ts`

```ts
import type { StorybookConfig } from '@storybook/react-vite'

const config: StorybookConfig = {
  stories: [
    '../src/primitives/**/*.stories.@(js|jsx|mjs|ts|tsx|mdx)',
    '../src/components/**/*.stories.@(js|jsx|mjs|ts|tsx|mdx)',
    '../src/screens/**/*.stories.@(js|jsx|mjs|ts|tsx|mdx)',
  ],
  // NOTE: storybook-addon-remix-react-router is installed but intentionally
  // NOT registered — its v6 release targets react-router v7 + storybook 10,
  // while many repos run react-router v6 + storybook 9. We wrap stories with
  // src/test-utils/mock-router.tsx (a thin MemoryRouter decorator) instead.
  addons: ['msw-storybook-addon'],
  staticDirs: ['../public'],
  framework: { name: '@storybook/react-vite', options: {} },
}

export default config
```

## 7. `.storybook/types.d.ts` — type-augment Parameters

```ts
import type { QueryClientConfig } from '@tanstack/react-query'
import type { RequestHandler } from 'msw'
import type { StoryRouterParams } from '../src/test-utils/mock-router'

declare module '@storybook/react-vite' {
  interface Parameters {
    msw?: { handlers: RequestHandler[] }
    router?: StoryRouterParams
    queryClient?: { defaultOptions?: QueryClientConfig['defaultOptions'] }
  }
}

export {}
```

After adding this, `parameters.router.initialEntries` will autocomplete in IDE.

## 8. Initializing the MSW worker

Run **once** during setup:

```bash
pnpm --filter @your-scope/ui exec msw init public/ --save
```

This writes `public/mockServiceWorker.js` (~9KB) and adds `"msw": { "workerDirectory": ["public"] }` to package.json so future `msw init` re-uses the same path.

The worker is **gitignored** by default in some setups — verify it's committed, otherwise CI Storybook builds will fail silently.

## 9. Resetting per-story state

Some stories mutate `localStorage`, `document.cookie`, or global stores. Reset in `beforeEach` via Storybook's experimental `beforeEach` hook (v8+):

```ts
// In a story file
import { beforeEach } from '@storybook/test'

const meta: Meta = {
  // ...
  beforeEach: async () => {
    localStorage.clear()
    sessionStorage.clear()
    document.cookie.split(';').forEach((c) => {
      document.cookie = c.replace(/^ +/, '').replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`)
    })
  },
}
```

For nanostores / zustand / redux, add a `withStoreReset` decorator that calls a `resetAll()` helper exported from your stores module.

## 10. Nanostores reset pattern

If the host repo uses nanostores:

```ts
// src/test-utils/mock-stores.tsx
import type { Decorator } from '@storybook/react-vite'
import React from 'react'
// Import each store's reset helper
import { resetEditorStore } from '../stores/editor'
import { resetWorkbenchStore } from '../stores/workbench'

export const withStoreReset: Decorator = (Story) => {
  React.useMemo(() => {
    resetEditorStore()
    resetWorkbenchStore()
  }, [])
  return <Story />
}
```

Add to `preview.ts` decorators array (innermost — runs after provider setup).

## 11. Verifying the pipeline

After all 7 files are in place, run:

```bash
pnpm --filter @your-scope/ui typecheck
pnpm --filter @your-scope/ui storybook --no-open --quiet
```

In another terminal:

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:6006/
# Expect: 200
curl -s http://localhost:6006/index.json | jq '.entries | length'
# Expect: > 0
```

If 0 stories, check that `stories:` globs in `main.ts` actually match files. Glob bug is the #1 cause of "no stories shown".
