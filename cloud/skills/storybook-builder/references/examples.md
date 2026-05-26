# Examples — Real Worked Cases

Concrete, complete examples from the fiddle-factory monorepo port. Use as reference patterns.

## Example 1: Signup screen (Strategy A — full route refactor)

### Production route BEFORE

```tsx
// apps/web/app/routes/signup.tsx (before)
import { useState } from 'react'
import { useSignUp } from '~/services/auth'

function SignUp() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { mutateAsync: signUp } = useSignUp()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await signUp({ email, password })
    if (error) setError(error.message)
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
      <button type="submit">Sign Up</button>
      {error && <p>{error}</p>}
    </form>
  )
}

export { SignUp as Component }
```

### Screen component

```tsx
// packages/ui/src/screens/signup.screen.tsx
import React from 'react'
import { LandingShell } from '../components/layout/landing-shell'

export type SignupScreenProps = {
  email: string
  password: string
  error?: string | null
  isSubmitting?: boolean
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  logo?: React.ReactNode
  navLinks?: { label: string; href: string }[]
}

const DEFAULT_LINKS = [
  { label: 'FOLLOW ON X', href: 'https://x.com/fiddle_factory' },
  { label: 'JOIN SLACK', href: '#' },
]

export function SignupScreen({
  email, password, error, isSubmitting = false,
  onEmailChange, onPasswordChange, onSubmit,
  logo, navLinks = DEFAULT_LINKS,
}: SignupScreenProps) {
  return (
    <LandingShell navLinks={navLinks} logo={logo}>
      <form
        onSubmit={onSubmit}
        className="w-[360px] flex flex-col gap-4 rounded-md border border-fiddle-elements-borderColor bg-fiddle-elements-background-depth-2 p-6"
        aria-label="Sign up form"
      >
        <h1 className="font-mono text-sm tracking-[0.12em] text-fiddle-elements-textPrimary uppercase">
          Create account
        </h1>

        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] tracking-widest uppercase text-fiddle-elements-textSecondary">
            Email
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="you@example.com"
            required
            disabled={isSubmitting}
            className="bg-fiddle-elements-background-depth-1 border border-fiddle-elements-borderColor rounded px-3 py-2 text-sm text-fiddle-elements-textPrimary placeholder:text-fiddle-elements-textSecondary focus:outline-none focus:border-fiddle-elements-textPrimary disabled:opacity-50"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] tracking-widest uppercase text-fiddle-elements-textSecondary">
            Password
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            placeholder="••••••••"
            required
            disabled={isSubmitting}
            className="bg-fiddle-elements-background-depth-1 border border-fiddle-elements-borderColor rounded px-3 py-2 text-sm text-fiddle-elements-textPrimary placeholder:text-fiddle-elements-textSecondary focus:outline-none focus:border-fiddle-elements-textPrimary disabled:opacity-50"
          />
        </label>

        {error ? (
          <p role="alert" className="text-xs text-red-400 font-mono tracking-wide border border-red-900/40 bg-red-950/30 rounded px-3 py-2">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 font-mono text-xs tracking-[0.12em] uppercase border border-fiddle-elements-borderColor rounded px-4 py-2.5 text-fiddle-elements-textPrimary hover:bg-fiddle-elements-background-depth-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Creating…' : 'Sign up'}
        </button>
      </form>
    </LandingShell>
  )
}
```

### Production route AFTER

```tsx
// apps/web/app/routes/signup.tsx (after refactor)
import { useState } from 'react'
import { SignupScreen } from '@fiddle-factory/ui'
import { useSignUp } from '~/services/auth'

function SignUp() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { mutateAsync: signUp, isPending } = useSignUp()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const { error } = await signUp({ email, password })
    if (error) setError(error.message)
  }

  return (
    <SignupScreen
      email={email}
      password={password}
      error={error}
      isSubmitting={isPending}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onSubmit={handleSubmit}
    />
  )
}

export { SignUp as Component }
```

### Story with interactive driver

```tsx
// packages/ui/src/screens/signup.screen.stories.tsx
import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { SignupScreen } from './signup.screen'

const meta: Meta<typeof SignupScreen> = {
  title: 'Screens/Signup',
  component: SignupScreen,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Sign-up screen. Pure presentational — state lives in the route or the story wrapper below.',
      },
    },
  },
}
export default meta

type Story = StoryObj<typeof SignupScreen>

function InteractiveSignup({
  initialError = null,
  initialSubmitting = false,
}: { initialError?: string | null; initialSubmitting?: boolean }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(initialError)
  const [isSubmitting, setIsSubmitting] = useState(initialSubmitting)

  return (
    <SignupScreen
      email={email} password={password} error={error} isSubmitting={isSubmitting}
      onEmailChange={setEmail} onPasswordChange={setPassword}
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

export const Default: Story = { render: () => <InteractiveSignup /> }
export const WithError: Story = { render: () => <InteractiveSignup initialError="Email already registered." /> }
export const Submitting: Story = { render: () => <InteractiveSignup initialSubmitting /> }

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

### Result

Storybook URL `/screens/signup--default` renders the EXACT same form as production `/signup`. The route refactor reduces production code by 0 lines (same logic) but the screen is now testable + visible in Storybook.

## Example 2: Home screen (Strategy B — twin)

### Why a twin instead of a refactor

Production `HomePage.tsx` has:
- 6 React Query hooks (`useGithubRepos`, `useCurrentUser`, `useProjects`, etc.)
- `e2bSessionManager.preWarmSandbox()` side effect
- `useNavigate()` for routing
- Multiple dialogs (`ProjectDialog`, `DeleteProjectDialog`)

Refactoring would require either:
1. Plumb all 6 hook returns + 4 mutation functions as props (12+ props), OR
2. Leave the hook calls in HomePage and add wrapper props (loses fidelity)

A twin is cleaner: render the SAME JSX with the SAME ProjectCard primitive, but accept the data as fixture props.

### Twin screen

```tsx
// packages/ui/src/screens/home.screen.tsx
import type { ReactNode } from 'react'
import { ProjectCard, type ProjectCardProject } from '../components/cards/project-card'

export type HomeProjectFixture = ProjectCardProject

export type HomeScreenProps = {
  sidePanel: ReactNode
  hasSelectedRepo?: boolean
  isLoading?: boolean
  projects: HomeProjectFixture[]
  onProjectClick?: (project: HomeProjectFixture) => void
  onEditProject?: (project: HomeProjectFixture) => void
  onDeleteProject?: (project: HomeProjectFixture) => void
  onNewProject?: () => void
  isCreatingProject?: boolean
  noTemplatesAvailable?: boolean
}

export function HomeScreen({
  sidePanel, hasSelectedRepo = true, isLoading = false,
  projects, onProjectClick, onEditProject, onDeleteProject,
  onNewProject, isCreatingProject = false, noTemplatesAvailable = false,
}: HomeScreenProps) {
  return (
    <div className="flex h-full w-full">
      {sidePanel}

      <div className="flex-1 bg-fiddle-elements-background-depth-1 flex flex-col">
        <div className="flex items-center justify-between px-6 pt-6">
          <h1 className="text-fiddle-elements-textPrimary text-2xl font-semibold">Home</h1>
          {hasSelectedRepo && (
            <button
              type="button"
              onClick={onNewProject}
              disabled={isCreatingProject}
              className="flex items-center gap-2 bg-fiddle-elements-button-primary-background text-fiddle-elements-button-primary-text hover:bg-fiddle-elements-button-primary-backgroundHover px-4 py-2 rounded-lg min-w-[140px] justify-center cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
            >
              <div className={`${isCreatingProject ? 'icon-[ph--spinner] animate-spin' : 'icon-[ph--plus]'} text-sm`} />
              <span className="text-sm">{isCreatingProject ? 'Creating...' : 'New Project'}</span>
            </button>
          )}
        </div>

        <div className="px-6 pt-6 overflow-y-auto flex-1">
          {noTemplatesAvailable ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="text-fiddle-elements-textPrimary text-xl">No templates available</div>
              <div className="text-fiddle-elements-textSecondary mt-2">Please contact an administrator.</div>
            </div>
          ) : isLoading ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
              {Array.from({ length: 6 }).map((_, idx) => (
                <ProjectCard key={idx} variant="skeleton" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
              {(!projects || projects.length === 0) && hasSelectedRepo && onNewProject && (
                <ProjectCard variant="new" onClick={onNewProject} isLoading={isCreatingProject} />
              )}
              {projects?.map((project) => (
                <ProjectCard
                  key={project.id}
                  variant="existing"
                  project={project}
                  onClick={(p) => onProjectClick?.(p)}
                  onEdit={onEditProject ? (p) => onEditProject(p) : undefined}
                  onDelete={onDeleteProject ? (p) => onDeleteProject(p) : undefined}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

### Story with fixture SidePanel

```tsx
// packages/ui/src/screens/home.screen.stories.tsx
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { HomeScreen, type HomeProjectFixture } from './home.screen'
import { SidebarNavButton } from '../components/layout/sidebar/sidebar-nav-button'
import { SidebarFooterLink } from '../components/layout/sidebar/sidebar-footer-link'

const meta: Meta<typeof HomeScreen> = {
  title: 'Screens/Home',
  component: HomeScreen,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="h-screen w-screen bg-fiddle-elements-background-depth-1">
        <Story />
      </div>
    ),
  ],
}
export default meta

type Story = StoryObj<typeof HomeScreen>

function FixtureSidePanel({ activeTab = 'home', collapsed: initialCollapsed = false }) {
  const [collapsed, setCollapsed] = useState(initialCollapsed)
  const width = collapsed ? 64 : 240

  return (
    <div
      className="h-full flex flex-col border-r border-fiddle-elements-borderColor bg-fiddle-elements-background-depth-1 transition-[width] duration-200"
      style={{ width }}
    >
      <div className="px-3 py-3 flex items-center gap-2">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/[0.08] text-fiddle-elements-textSecondary"
        >
          <div className="icon-[ph--sidebar] text-lg" />
        </button>
        {!collapsed && <span className="text-sm font-semibold">fiddle</span>}
      </div>

      {!collapsed && (
        <div className="px-3 pb-3">
          <button className="flex items-center justify-between w-full px-3 py-2 rounded-lg border border-fiddle-elements-borderColor text-sm">
            <span className="truncate">community</span>
            <div className="icon-[ph--caret-down] text-xs text-fiddle-elements-textSecondary" />
          </button>
        </div>
      )}

      <div className="px-3 flex flex-col gap-1 flex-1">
        <SidebarNavButton icon="icon-[ph--house]" label="Home" collapsed={collapsed} active={activeTab === 'home'} />
        <SidebarNavButton icon="icon-[ph--users-three]" label="Community" collapsed={collapsed} active={activeTab === 'community'} />
      </div>

      <div className="px-3 pb-3 flex flex-col gap-1">
        <SidebarFooterLink icon="icon-[ph--book-open]" label="Docs" collapsed={collapsed} href="#" />
        <SidebarFooterLink icon="icon-[ph--x-logo]" label="Follow on X" collapsed={collapsed} href="#" />
      </div>
    </div>
  )
}

const SAMPLE_PROJECTS: HomeProjectFixture[] = [
  { id: 'p-1', name: 'Hero variant', updatedAt: '2 hours ago' },
  { id: 'p-2', name: 'Onboarding flow', updatedAt: 'Yesterday' },
  { id: 'p-3', name: 'Marketing CTA', updatedAt: '3 days ago' },
  // ...
]

export const Default: Story = {
  args: {
    sidePanel: <FixtureSidePanel />,
    projects: SAMPLE_PROJECTS,
    hasSelectedRepo: true,
  },
}

export const Empty: Story = {
  args: { sidePanel: <FixtureSidePanel />, projects: [], hasSelectedRepo: true, onNewProject: () => {} },
}

export const Loading: Story = {
  args: { sidePanel: <FixtureSidePanel />, projects: [], isLoading: true },
}

export const NoRepoSelected: Story = {
  args: { sidePanel: <FixtureSidePanel />, projects: [], hasSelectedRepo: false },
}

export const CollapsedSidebar: Story = {
  args: {
    sidePanel: <FixtureSidePanel collapsed />,
    projects: SAMPLE_PROJECTS,
  },
}
```

### Production route — UNCHANGED

`apps/web/app/shared/components/HomePage.tsx` continues to use its 6 hooks + dialogs. The Storybook screen is a parallel rendering — same `ProjectCard`, same grid, same header layout.

## Example 3: Community gallery (Strategy C — full module port)

The community gallery is the most complex case. 1776 lines, 17 files, framer-motion canvas, custom dot-grid Canvas2D renderer.

### Source tree (apps/web)

```
apps/web/app/modules/community/
├── constants.ts                                      (21 lines)
├── utils/
│   ├── communityGalleryLayout.ts                     (91)
│   ├── generateSpiralOffsets.ts                      (25)
│   ├── hexToRgb.ts                                   (4)
│   └── fetchCommunityCards.ts                        (4)
├── hooks/
│   ├── useCommunityGalleryMotion.ts                  (149)
│   ├── useCommunityPolling.ts                        (70)  ← stays in apps/web (calls /api)
│   └── useCommunityPreload.ts                        (67)  ← stays in apps/web (calls /api)
├── components/
│   ├── CardIframe.tsx                                (81)
│   ├── CardPlaceholder.tsx                           (27)
│   ├── ClaimableDotsGraphic.tsx                      (224)
│   ├── CommunityCardsCanvas.tsx                      (168)
│   ├── CommunityCardsGallery.tsx                     (149) ← stays in apps/web
│   ├── CommunityGalleryCards.tsx                     (434)
│   ├── CommunityGalleryHeader.tsx                    (37)
│   ├── CommunityReferenceActionsOverlay.tsx          (214) ← stays (uses ~/services)
│   ├── EdgeVignette.tsx                              (11)
│   ├── claimable-dots/
│   │   ├── claimableDotsRenderer.ts                  (421)
│   │   ├── claimableDotsSeed.ts                      (64)
│   │   └── claimableDotsTokens.ts                    (142)
│   └── gallery/
│       ├── CtaButton.tsx                             (48)
│       ├── GridCell.tsx                              (22)
│       └── StatusIndicators.tsx                      (32)
└── styles/
    └── community-gallery.css                         (88)
```

### Decision per file

| File | Action | Reason |
|---|---|---|
| `constants.ts` | Move | No dependencies |
| `utils/*.ts` | Move | Pure math/strings |
| `hooks/useCommunityGalleryMotion.ts` | Move | framer-motion + useViewportSize only |
| `hooks/useCommunityPolling.ts` | **STAY** | Calls `~/services/api` |
| `hooks/useCommunityPreload.ts` | **STAY** | Hits `/api/community/storybook` |
| `components/CardIframe.tsx` | Move + add `iframeBaseUrl` prop | Hard-coded URL → escape hatch |
| `components/CardPlaceholder.tsx` | Move | Pure visual |
| `components/ClaimableDotsGraphic.tsx` | Move | Canvas2D, no app deps |
| `components/CommunityCardsCanvas.tsx` | Move | Pure rendering |
| `components/CommunityGalleryCards.tsx` | Move + add `logoSrc` prop | Hard-coded `/fiddle-logo.svg` → escape hatch |
| `components/CommunityGalleryHeader.tsx` | Move + add `slackUrl` prop | Hard-coded `SOCIAL_LINKS.slack` → prop |
| `components/CommunityCardsGallery.tsx` | **STAY** | Uses `useNavigate`, `useCurrentUser`, etc. |
| `components/CommunityReferenceActionsOverlay.tsx` | **STAY** | Uses `~/services` |
| `components/EdgeVignette.tsx` | Move | Pure visual |
| `claimable-dots/*.ts` | Move | Pure render math |
| `gallery/GridCell.tsx` | Move | Pure visual |
| `gallery/StatusIndicators.tsx` | Move | Pure visual |
| `gallery/CtaButton.tsx` | Move | Pure visual |
| `styles/community-gallery.css` | Move + import in screen | CSS keyframes |
| `~/shared/hooks/useViewportSize.ts` | Move | Used by motion hook |

### Target tree (UI pkg)

```
packages/ui/src/components/community/
├── constants.ts
├── utils/
│   ├── communityGalleryLayout.ts
│   ├── generateSpiralOffsets.ts
│   └── hexToRgb.ts
├── hooks/
│   └── useCommunityGalleryMotion.ts
├── components/
│   ├── CardIframe.tsx           ← iframeBaseUrl prop added
│   ├── CardPlaceholder.tsx
│   ├── ClaimableDotsGraphic.tsx
│   ├── CommunityCardsCanvas.tsx ← iframeBaseUrl + logoSrc props
│   ├── CommunityGalleryCards.tsx ← logoSrc prop on CenterCard
│   └── CommunityGalleryHeader.tsx ← slackUrl prop
├── claimable-dots/
│   ├── claimableDotsRenderer.ts
│   ├── claimableDotsSeed.ts
│   └── claimableDotsTokens.ts
├── gallery/
│   └── GridCell.tsx
├── styles/
│   └── community-gallery.css
└── index.ts (barrel)

packages/ui/src/hooks/
└── useViewportSize.ts
```

### Import rewrite pattern

```
BEFORE: import { CardManifestEntry } from '~/modules/community/constants'
AFTER:  import { CardManifestEntry } from '../constants'

BEFORE: import { useViewportSize } from '~/shared/hooks/useViewportSize'
AFTER:  import { useViewportSize } from '../../../hooks/useViewportSize'

BEFORE: import { getCardPosition } from '~/modules/community/utils/communityGalleryLayout'
AFTER:  import { getCardPosition } from '../utils/communityGalleryLayout'
```

### Escape hatch prop pattern

```tsx
// BEFORE (apps/web)
const base = commitHash ? `/api/community/storybook/${commitHash}` : '/api/community/storybook'

// AFTER (packages/ui)
type Props = { /* ... */ iframeBaseUrl?: string }
export function CardIframe({ commitHash, iframeBaseUrl, /* ... */ }) {
  const baseRoot = iframeBaseUrl ?? '/api/community/storybook'
  const base = commitHash ? `${baseRoot}/${commitHash}` : baseRoot
  // ...
}
```

This lets Storybook pass a different URL (or skip iframes entirely) while production keeps using `/api/community/storybook`.

### Screen using ported components

```tsx
// packages/ui/src/screens/community.screen.tsx
import { useMemo } from 'react'
import { CommunityCardsCanvas } from '../components/community/components/CommunityCardsCanvas'
import { CommunityGalleryHeader } from '../components/community/components/CommunityGalleryHeader'
import { useCommunityGalleryMotion } from '../components/community/hooks/useCommunityGalleryMotion'
import { generateSpiralOffsets } from '../components/community/utils/generateSpiralOffsets'
import { getTotalSlots } from '../components/community/utils/communityGalleryLayout'
import { type CardManifestEntry } from '../components/community/constants'
import '../components/community/styles/community-gallery.css'

type PendingState = 'building' | 'found' | 'timeout' | null

export type CommunityScreenProps = {
  cards: CardManifestEntry[]
  pendingState?: PendingState
  pendingCardId?: string | null
  commitHash?: string
  iframeBaseUrl?: string
  logoSrc?: string
  slackUrl?: string
  isReturningUser?: boolean
  footer?: React.ReactNode
  userHasCard?: boolean
  isCreating?: boolean
  onNavigateHome: () => void
  onGetStarted: () => void
}

export function CommunityScreen({
  cards, pendingState = null, pendingCardId = null,
  commitHash, iframeBaseUrl, logoSrc, slackUrl,
  isReturningUser = false, footer,
  userHasCard, isCreating = false,
  onNavigateHome, onGetStarted,
}: CommunityScreenProps) {
  const allCards = useMemo(() => cards ?? [], [cards])
  const totalSlots = getTotalSlots(allCards.length)
  const spiralOffsets = useMemo(() => generateSpiralOffsets(totalSlots), [totalSlots])

  const motion = useCommunityGalleryMotion({
    spiralOffsets, allCards, fetchedCards: allCards,
    pendingState, pendingCardId,
  })

  return (
    <div className="min-h-screen bg-[#040404] text-white antialiased overflow-hidden font-mono">
      <CommunityGalleryHeader onNavigateHome={onNavigateHome} slackUrl={slackUrl} />

      <CommunityCardsCanvas
        containerRef={motion.containerRef}
        scale={motion.scale}
        springX={motion.springX}
        springY={motion.springY}
        allCards={allCards}
        totalSlots={totalSlots}
        spiralOffsets={spiralOffsets}
        pendingState={pendingState}
        commitHash={commitHash}
        iframeBaseUrl={iframeBaseUrl}
        logoSrc={logoSrc}
        isCreating={isCreating}
        userHasCard={userHasCard}
        onFindSpot={motion.findSpot}
        onGetStarted={onGetStarted}
        onDragDelta={motion.handleDragDelta}
        onRecenter={motion.recenter}
      />

      {isReturningUser && footer ? (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center py-3 bg-black border-t border-white/10">
          {footer}
        </div>
      ) : null}
    </div>
  )
}
```

### Story

```tsx
export const Default: Story = {
  args: {
    cards: Array.from({ length: 24 }, (_, i) => ({
      id: `card-${i + 1}`, name: `Member ${i + 1}`, username: `user_${i}`,
    })),
    pendingState: null,
    onNavigateHome: () => console.log('nav home'),
    onGetStarted: () => console.log('start'),
  },
}

export const Building: Story = {
  args: { ...Default.args, pendingState: 'building' },
}

export const UserHasCard: Story = {
  args: { ...Default.args, userHasCard: true },
}

// Many (80 cards) — exercises larger spiral
export const Many: Story = {
  args: {
    cards: Array.from({ length: 80 }, (_, i) => ({ id: `card-${i + 1}`, name: `Member ${i + 1}`, username: `user_${i}` })),
    onNavigateHome: () => {},
    onGetStarted: () => {},
  },
}
```

### Result

`/screens/community--default` renders the EXACT spiral gallery from production — same drag, same dot-grid canvas, same card types — but with fixture data instead of polling. Pixel-identical to production.

## Example 4: Playground (Strategy D — slots)

See `screen-strategies.md` Strategy D section for the full code.

Key takeaway: when a route has 3+ heavy children (canvas + chat + panels), use slot props. Stories provide placeholder components; production wires the real ones.

## Verifying e2e fidelity

After every screen rebuild, do a side-by-side check:

1. Run app dev server: `pnpm --filter web dev`
2. Run Storybook: `pnpm --filter ui storybook`
3. Open BOTH in browser tabs
4. Navigate production route + Storybook screen story
5. Cmd+Tab to flip between them — should look identical (modulo fixture data differences)

Specific things to compare:
- Layout: gaps, padding, alignment
- Typography: font family, size, weight, tracking
- Colors: borders, backgrounds, hover states
- Animations: timing, easing
- States: loading, empty, error, populated

If they diverge, the screen needs to match production — not the other way around. Production is the source of truth.
