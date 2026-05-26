# Story Templates — Interactive vs Static Patterns

Every screen story should hit these patterns. Pick the one matching the screen's interaction model.

## Pattern 1: Pure presentational primitive (stateless)

For primitives like `LoadingShell`, `EmptyState`, `Button`.

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite'
import { LoadingShell } from '.'

const meta: Meta<typeof LoadingShell> = {
  title: 'Layout/LoadingShell',
  component: LoadingShell,
  parameters: { layout: 'fullscreen' },
}
export default meta

type Story = StoryObj<typeof LoadingShell>

export const Default: Story = { args: {} }
export const WithMessage: Story = { args: { message: 'Booting sandbox' } }
export const WithLogo: Story = { args: { logoSrc: '/logo.png', message: 'Loading project' } }
```

## Pattern 2: Stateful screen + interactive driver

For forms, toggles, anything with user input. Always provide a `useState`-driven driver.

```tsx
function InteractiveSignup({ initialError = null, initialSubmitting = false }: { initialError?: string | null; initialSubmitting?: boolean }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(initialError)
  const [isSubmitting, setIsSubmitting] = useState(initialSubmitting)

  return (
    <SignupScreen
      email={email}
      password={password}
      error={error}
      isSubmitting={isSubmitting}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onSubmit={(e) => {
        e.preventDefault()
        setError(null)
        setIsSubmitting(true)
        setTimeout(() => {
          setIsSubmitting(false)
          if (!email.includes('@')) setError('Enter a valid email address.')
        }, 800)
      }}
    />
  )
}

// One factory hydrates multiple variants
export const Default: Story = { render: () => <InteractiveSignup /> }
export const WithError: Story = { render: () => <InteractiveSignup initialError="Email already registered." /> }
export const Submitting: Story = { render: () => <InteractiveSignup initialSubmitting /> }

// Static variant for arg-table testing + Chromatic snapshots
export const Static: Story = {
  args: {
    email: 'designer@fiddle.dev',
    password: 'hunter2hunter2',
    error: null,
    isSubmitting: false,
    onEmailChange: () => {},
    onPasswordChange: () => {},
    onSubmit: (e) => e.preventDefault(),
  },
}
```

**Why both interactive + static?**
- **Interactive:** users can type, click, see real form behavior — best for QA + design review
- **Static:** Chromatic / visual regression tests need deterministic args, not stateful renders

## Pattern 3: Multi-state screen with all states as args

For dashboards, lists, anything driven entirely by data shape.

```tsx
const SAMPLE_PROJECTS = [
  { id: 'p-1', name: 'Hero variant', updatedAt: '2 hours ago' },
  { id: 'p-2', name: 'Onboarding flow', updatedAt: 'Yesterday' },
  // ...
]

export const Default: Story = {
  args: {
    sidePanel: <FixtureSidePanel />,
    projects: SAMPLE_PROJECTS,
    hasSelectedRepo: true,
    onProjectClick: (p) => console.log('open', p.id),
    onNewProject: () => console.log('new project'),
  },
}

export const Empty: Story = {
  args: { sidePanel: <FixtureSidePanel />, projects: [], hasSelectedRepo: true, onNewProject: () => {} },
}

export const Loading: Story = {
  args: { sidePanel: <FixtureSidePanel />, projects: [], isLoading: true, hasSelectedRepo: true },
}

export const NoRepoSelected: Story = {
  args: { sidePanel: <FixtureSidePanel />, projects: [], hasSelectedRepo: false },
}

export const NoTemplatesAvailable: Story = {
  args: { sidePanel: <FixtureSidePanel />, projects: [], hasSelectedRepo: false, noTemplatesAvailable: true },
}
```

## Pattern 4: MSW-backed story (real React Query lifecycle)

For when you want the screen to actually call its hooks, with mocked HTTP.

```tsx
import { http, HttpResponse, delay } from 'msw'
import { defaultHandlers } from '../test-utils'

const REPOS_HAPPY = [{ id: '1', slug: 'community', name: 'Community' }]

export const WithRepos: Story = {
  parameters: {
    msw: {
      handlers: [
        ...defaultHandlers,
        http.get('/api/github/repos', () => HttpResponse.json(REPOS_HAPPY)),
        http.get('/api/projects', () => HttpResponse.json([])),
      ],
    },
  },
  render: () => <HomePage preSelectedRepoSlug="community" />,
}

export const LoadingRepos: Story = {
  parameters: {
    msw: {
      handlers: [
        ...defaultHandlers,
        http.get('/api/github/repos', async () => {
          await delay(60_000) // never resolves within story view
          return HttpResponse.json([])
        }),
      ],
    },
  },
  render: () => <HomePage preSelectedRepoSlug={null} />,
}

export const ApiError: Story = {
  parameters: {
    msw: {
      handlers: [
        ...defaultHandlers,
        http.get('/api/github/repos', () => HttpResponse.json({ error: 'Server error' }, { status: 500 })),
      ],
    },
  },
  render: () => <HomePage preSelectedRepoSlug={null} />,
}
```

**Tradeoff:** MSW-backed stories are slower and flakier than presentational twins. Use only when:
- The screen IS the production component (no twin)
- You want to test loading/error transitions visually
- You need real network timing for animations (skeleton → data fade)

## Pattern 5: Router-aware story

When the screen reads route params or navigates.

```tsx
export const OnTemplatePage: Story = {
  parameters: {
    router: {
      initialEntries: ['/t/community'],
      path: '/t/:templateName',
    },
  },
  render: () => <TemplateHomePage />, // reads useParams().templateName
}

export const OnProjectPage: Story = {
  parameters: {
    router: {
      initialEntries: ['/t/community/chat/proj-123'],
      path: '/t/:templateName/chat/:projectId',
    },
  },
  render: () => <PlaygroundLayout />,
}
```

## Pattern 6: Decorator-wrapped sized story

For components that need a fixed-size container (cards, panels, popovers).

```tsx
const wrapper = (Story: React.ComponentType) => (
  <div className="h-[480px] w-[640px] border border-fiddle-elements-borderColor rounded-md bg-fiddle-elements-background-depth-1">
    <Story />
  </div>
)

export const Default: Story = {
  args: { title: 'No projects yet' },
  decorators: [wrapper],
}
```

## Pattern 7: Compose multiple sub-states via composition

For complex screens with multiple controllable axes.

```tsx
type Variant = {
  description: string
  args: Partial<CommunityScreenProps>
}

const VARIANTS: Record<string, Variant> = {
  populated: { description: '24 cards, idle', args: { cards: SAMPLE_CARDS, pendingState: null } },
  empty: { description: 'no cards yet', args: { cards: [] } },
  building: { description: 'user just claimed', args: { cards: SAMPLE_CARDS, pendingState: 'building' } },
  timeout: { description: 'building timed out', args: { cards: SAMPLE_CARDS, pendingState: 'timeout' } },
  userHasCard: { description: 'returning user, sees GET STARTED', args: { cards: SAMPLE_CARDS, userHasCard: true } },
  creating: { description: 'project being created', args: { cards: SAMPLE_CARDS, isCreating: true } },
}

const SHARED_HANDLERS = { onNavigateHome: () => {}, onGetStarted: () => {} }

export const Populated: Story = { args: { ...SHARED_HANDLERS, ...VARIANTS.populated.args } }
export const Empty: Story = { args: { ...SHARED_HANDLERS, ...VARIANTS.empty.args } }
export const Building: Story = { args: { ...SHARED_HANDLERS, ...VARIANTS.building.args } }
// ... etc.
```

## Pattern 8: Play function for interaction testing

For testing flows (Storybook 8+ with `@storybook/test`).

```tsx
import { within, userEvent, expect } from '@storybook/test'

export const SubmitsSuccessfully: Story = {
  render: () => <InteractiveSignup />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.type(canvas.getByPlaceholderText('you@example.com'), 'designer@example.com')
    await userEvent.type(canvas.getByPlaceholderText('••••••••'), 'hunter2hunter2')
    await userEvent.click(canvas.getByRole('button', { name: /sign up/i }))
    await expect(canvas.getByText(/creating/i)).toBeInTheDocument()
  },
}
```

These also double as visual-regression-aware interaction tests in Chromatic / Test Runner.

## Hygiene checklist

For every story file:

- [ ] `title` follows `Screens/X` or `Layout/X` convention
- [ ] `Meta<typeof Component>` is typed (catches arg type errors)
- [ ] `parameters.layout: 'fullscreen'` for screens, `'centered'` for components
- [ ] `parameters.docs.description.component` explains what's being shown
- [ ] At least one story per meaningful state (default, loading, error, empty, submitting)
- [ ] One interactive variant per stateful screen
- [ ] No imports from app code (`~/services`, `~/store`, etc.)
- [ ] Handler args have inline arrow functions, NOT `fn()` mocks — those go in `args` for action logger
- [ ] Sized stories use a `decorators` wrapper, don't inline the container

## Story title naming convention

```
Layout/AppShell           ← reusable shell primitives
Layout/EmptyState
Layout/LoadingShell

Components/Header         ← reusable UI components
Components/ProjectCard
Components/SidebarMenu

Screens/Signup            ← full page-level compositions
Screens/Home
Screens/Community
Screens/Playground

Primitives/Button         ← Radix/shadcn wrappers
Primitives/Input
```

The slash creates a nested folder in the Storybook sidebar. Keep depth ≤ 2 levels for findability.

## Action handlers in args

Storybook's Actions panel auto-records `on*` props if `actions: { argTypesRegex: '^on[A-Z].*' }` is set in `preview.ts`. Then:

```tsx
export const Default: Story = {
  args: {
    onProjectClick: undefined, // ← Storybook will auto-create an action logger
    onNewProject: undefined,
  },
}
```

If you want explicit logging:

```tsx
import { fn } from '@storybook/test'

export const Default: Story = {
  args: {
    onProjectClick: fn(),
    onNewProject: fn(),
  },
}
```

`fn()` creates a spy that logs to the Actions panel AND can be asserted in `play` functions.

## Story file template (copy-paste)

```tsx
import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { MyScreen, type MyScreenProps } from './my-screen.screen'

const meta: Meta<typeof MyScreen> = {
  title: 'Screens/MyScreen',
  component: MyScreen,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'One-line description of what this screen mirrors and which production route it corresponds to.',
      },
    },
  },
}

export default meta

type Story = StoryObj<typeof MyScreen>

// — Static variants —
export const Default: Story = {
  args: {
    // ... static props
  },
}

export const Loading: Story = {
  args: { ...Default.args, isLoading: true },
}

export const Empty: Story = {
  args: { ...Default.args, items: [] },
}

// — Interactive driver —
function InteractiveDriver() {
  const [value, setValue] = useState('')
  return <MyScreen value={value} onChange={setValue} />
}

export const Interactive: Story = {
  render: () => <InteractiveDriver />,
}
```
