# Screen Strategies — Decision Tree + Worked Examples

For each production route, pick exactly ONE strategy. The decision rests on **what the route renders**, not how big the route file is.

## Decision tree

```
Does the route file mostly just call useState + handlers, then render one JSX block?
├─ YES → Strategy A: Refactor route to call screen, mock hooks in story
└─ NO ↓

Does the route call into a heavy app-only system (e2b sandbox, supabase realtime, websocket)?
├─ YES ↓
│   Are there 3+ such children rendered side-by-side?
│   ├─ YES → Strategy D: Slot-based shell (canvas/sidebar/panels as opaque slots)
│   └─ NO  → Strategy B: Presentational twin (props-only screen, route stays as-is)
│
└─ NO ↓ (route just uses React Query + simple hooks)
    Does the rendered tree contain a custom framer-motion / canvas / SVG sub-system?
    ├─ YES → Strategy C: Port the module to UI pkg, both route + story use it
    └─ NO  → Strategy A: Refactor route to call screen
```

## Strategy A: Refactor route → use screen

**When:** signup, login, simple forms, contact pages. Route is `useState` + form + 1-2 hooks.

**Cost:** Low. ~30 mins per route.

**Fidelity:** Identical — production literally renders the new screen.

### Worked example: signup

**Before** (`apps/web/app/routes/signup.tsx`):

```tsx
function SignUp() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { mutateAsync: signUp, isPending } = useSignUp()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await signUp({ email, password })
    if (error) setError(error.message)
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      <button type="submit">Sign Up</button>
      {error && <p>{error}</p>}
    </form>
  )
}
export { SignUp as Component }
```

**Step 1:** Build `packages/ui/src/screens/signup.screen.tsx`:

```tsx
import { LandingShell } from '../components/layout/landing-shell'

export type SignupScreenProps = {
  email: string
  password: string
  error?: string | null
  isSubmitting?: boolean
  onEmailChange: (v: string) => void
  onPasswordChange: (v: string) => void
  onSubmit: (e: React.FormEvent) => void
  logo?: React.ReactNode
  navLinks?: { label: string; href: string }[]
}

export function SignupScreen({ email, password, error, isSubmitting, onEmailChange, onPasswordChange, onSubmit, logo, navLinks }: SignupScreenProps) {
  return (
    <LandingShell navLinks={navLinks ?? []} logo={logo}>
      <form onSubmit={onSubmit} className="w-[360px] flex flex-col gap-4 rounded-md border border-fiddle-elements-borderColor bg-fiddle-elements-background-depth-2 p-6">
        <h1 className="font-mono text-sm tracking-[0.12em] uppercase">Create account</h1>
        {/* labeled inputs with design tokens */}
        {/* error block with role="alert" */}
        {/* submit button with disabled state */}
      </form>
    </LandingShell>
  )
}
```

**Step 2:** Refactor route:

```tsx
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

**Step 3:** Story with interactive variant:

```tsx
function InteractiveSignup({ initialError = null, initialSubmitting = false }) {
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
        setIsSubmitting(true)
        setTimeout(() => {
          setIsSubmitting(false)
          if (!email.includes('@')) setError('Enter a valid email.')
        }, 800)
      }}
    />
  )
}

export const Default = { render: () => <InteractiveSignup /> }
export const WithError = { render: () => <InteractiveSignup initialError="Email already registered." /> }
export const Submitting = { render: () => <InteractiveSignup initialSubmitting /> }
```

**Rebuild UI pkg dist** (`pnpm --filter ui build`) so apps/web can import the new exports.

## Strategy B: Presentational twin

**When:** route calls a heavy production component (HomePage, Dashboard) that uses 5+ hooks (React Query + auth + services). You want a Storybook version but don't want to touch the production tree.

**Cost:** Medium. ~1 hour per route.

**Fidelity:** Same JSX structure, fixture data.

### Worked example: HomePage

**Production** (`apps/web/app/shared/components/HomePage.tsx`):

```tsx
function HomePage({ preSelectedRepoSlug }) {
  const navigate = useNavigate()
  const { selectedRepo, isLoading, handleRepoSelect } = useGithubRepo(preSelectedRepoSlug)
  const { data: currentUser } = useCurrentUser()
  const createProjectMutation = useCreateProject()
  const deleteProjectMutation = useDeleteProject()
  const { data: projects, isLoading: loadingProjects } = useProjects(currentUser?.id, selectedRepo?.templateId)
  // ...handlers...

  return (
    <div className="flex h-full w-full">
      <SidePanel selectedRepo={selectedRepo} onRepoSelect={handleRepoSelect} activeTab="home" />
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between px-6 pt-6">
          <h1 className="text-2xl font-semibold">Home</h1>
          {selectedRepo && <button onClick={handleNewProject}>New Project</button>}
        </div>
        <div className="px-6 pt-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
            {(!projects?.length && selectedRepo) && <ProjectCard variant="new" onClick={handleNewProject} />}
            {projects?.map((p) => <ProjectCard key={p.id} variant="existing" project={p} ... />)}
          </div>
        </div>
      </div>
    </div>
  )
}
```

**Twin screen** (`packages/ui/src/screens/home.screen.tsx`) — same JSX, props instead of hooks:

```tsx
import { ProjectCard, type ProjectCardProject } from '../components/cards/project-card'

export type HomeScreenProps = {
  sidePanel: React.ReactNode      // ← consumer provides SidePanel; story provides fixture
  hasSelectedRepo?: boolean
  isLoading?: boolean
  projects: ProjectCardProject[]
  onProjectClick?: (p: ProjectCardProject) => void
  onNewProject?: () => void
  isCreatingProject?: boolean
  noTemplatesAvailable?: boolean
  // ...edit/delete handlers...
}

export function HomeScreen({ sidePanel, hasSelectedRepo, isLoading, projects, ...handlers }: HomeScreenProps) {
  return (
    <div className="flex h-full w-full">
      {sidePanel}
      <div className="flex-1 bg-fiddle-elements-background-depth-1 flex flex-col">
        <div className="flex items-center justify-between px-6 pt-6">
          <h1 className="text-fiddle-elements-textPrimary text-2xl font-semibold">Home</h1>
          {hasSelectedRepo && (
            <button onClick={handlers.onNewProject} disabled={handlers.isCreatingProject}
              className="flex items-center gap-2 bg-fiddle-elements-button-primary-background ...">
              {/* same button JSX as production */}
            </button>
          )}
        </div>
        <div className="px-6 pt-6 overflow-y-auto flex-1">
          {/* SAME grid + ProjectCard JSX as production */}
        </div>
      </div>
    </div>
  )
}
```

**Story** — provide a `FixtureSidePanel` and fixture projects:

```tsx
function FixtureSidePanel() {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <div style={{ width: collapsed ? 64 : 240 }} className="h-full flex flex-col border-r ...">
      <button onClick={() => setCollapsed((c) => !c)}>toggle</button>
      {/* Render real SidebarNavButton + SidebarFooterLink primitives */}
      <SidebarNavButton icon="icon-[ph--house]" label="Home" active collapsed={collapsed} />
    </div>
  )
}

export const Default = { args: { sidePanel: <FixtureSidePanel />, projects: SAMPLE_PROJECTS, hasSelectedRepo: true } }
export const Empty = { args: { sidePanel: <FixtureSidePanel />, projects: [], hasSelectedRepo: true } }
export const Loading = { args: { sidePanel: <FixtureSidePanel />, projects: [], isLoading: true } }
```

**Important:** the production HomePage still works — you didn't change it. The Storybook story uses the parallel HomeScreen. Both render the same `ProjectCard` primitive, so visual fidelity is identical.

**Future cleanup:** when the team is ready, refactor HomePage to ALSO use HomeScreen — passing the real SidePanel + React-Query-fetched projects. But that's optional.

## Strategy C: Port module to UI pkg

**When:** route renders a heavy custom rendering subsystem (framer-motion canvas, custom SVG, themed multi-component module). Sub-components share constants, layout utils, and custom hooks that aren't reusable outside the module.

**Cost:** High. 2-4 hours depending on module size.

**Fidelity:** Pixel-identical — production and Storybook render the same component.

### Worked example: Community gallery (1776 lines)

The community module had:

- `constants.ts` (CardManifestEntry, spacings)
- `utils/communityGalleryLayout.ts` (spiral math)
- `utils/generateSpiralOffsets.ts`
- `claimable-dots/` (canvas renderer + seed + tokens)
- `components/ClaimableDotsGraphic.tsx` (canvas + raf loop)
- `components/CardIframe.tsx`, `CardPlaceholder.tsx`
- `components/CommunityGalleryCards.tsx` (5 card type components)
- `components/CommunityCardsCanvas.tsx` (framer-motion drag canvas)
- `components/CommunityGalleryHeader.tsx`
- `hooks/useCommunityGalleryMotion.ts` (springs, drag, find-spot animation)
- `styles/community-gallery.css`

**Port plan:**

1. **Inventory imports** — for each file, list which imports cross the UI/app boundary:
   - `~/modules/community/X` → internal, becomes relative path
   - `~/shared/hooks/useViewportSize` → small hook, **move it too** (`packages/ui/src/hooks/`)
   - `~/services/api` → data layer, **stays in apps/web** (route owns polling, screen takes data as prop)
   - `~/utils/constants` → string constants, **stays in apps/web** (URLs are app-specific)

2. **Create target tree** in UI pkg:
   ```
   packages/ui/src/components/community/
   ├── constants.ts
   ├── utils/
   │   ├── communityGalleryLayout.ts
   │   ├── generateSpiralOffsets.ts
   │   └── hexToRgb.ts
   ├── claimable-dots/
   │   ├── claimableDotsRenderer.ts
   │   ├── claimableDotsSeed.ts
   │   └── claimableDotsTokens.ts
   ├── components/
   │   ├── ClaimableDotsGraphic.tsx
   │   ├── CardIframe.tsx
   │   ├── CardPlaceholder.tsx
   │   ├── CommunityCardsCanvas.tsx
   │   ├── CommunityGalleryCards.tsx
   │   └── CommunityGalleryHeader.tsx
   ├── gallery/
   │   └── GridCell.tsx
   ├── hooks/
   │   └── useCommunityGalleryMotion.ts
   ├── styles/
   │   └── community-gallery.css
   └── index.ts
   ```

3. **Copy each file verbatim**, replacing imports:
   - `from '~/modules/community/constants'` → `from '../constants'` (adjust depth)
   - `from '~/modules/community/utils/X'` → `from '../utils/X'`
   - `from '~/shared/hooks/useViewportSize'` → `from '../../../hooks/useViewportSize'` (after moving the hook)

4. **Add escape hatches for app-specific URLs.** The production `CardIframe` hard-coded `/api/community/storybook/...`. Add an optional `iframeBaseUrl` prop so Storybook can pass a different URL:
   ```tsx
   export function CardIframe({ storyId, name, width, height, commitHash, iframeBaseUrl, onReady }) {
     const baseRoot = iframeBaseUrl ?? '/api/community/storybook'
     // ...
   }
   ```
   Same pattern for the center-card `logoSrc` and header `slackUrl`.

5. **Build the screen** that uses the ported components:
   ```tsx
   // packages/ui/src/screens/community.screen.tsx
   import { CommunityCardsCanvas, CommunityGalleryHeader, useCommunityGalleryMotion, generateSpiralOffsets, getTotalSlots } from '../components/community'
   import '../components/community/styles/community-gallery.css'

   export function CommunityScreen({ cards, pendingState, onNavigateHome, onGetStarted, /* etc */ }: CommunityScreenProps) {
     const allCards = useMemo(() => cards ?? [], [cards])
     const totalSlots = getTotalSlots(allCards.length)
     const spiralOffsets = useMemo(() => generateSpiralOffsets(totalSlots), [totalSlots])

     const motion = useCommunityGalleryMotion({ spiralOffsets, allCards, fetchedCards: allCards, pendingState, pendingCardId: null })

     return (
       <div className="min-h-screen bg-[#040404] text-white antialiased overflow-hidden font-mono">
         <CommunityGalleryHeader onNavigateHome={onNavigateHome} />
         <CommunityCardsCanvas
           containerRef={motion.containerRef}
           scale={motion.scale}
           springX={motion.springX}
           springY={motion.springY}
           allCards={allCards}
           totalSlots={totalSlots}
           spiralOffsets={spiralOffsets}
           pendingState={pendingState}
           onFindSpot={motion.findSpot}
           onGetStarted={onGetStarted}
           onDragDelta={motion.handleDragDelta}
           onRecenter={motion.recenter}
         />
       </div>
     )
   }
   ```

6. **Stories** drive the screen with fixture cards:
   ```tsx
   const SAMPLE_CARDS = Array.from({ length: 24 }, (_, i) => ({
     id: `card-${i + 1}`, name: `Member ${i + 1}`, username: `user_${i}`,
   }))
   export const Default = { args: { cards: SAMPLE_CARDS, pendingState: null, onNavigateHome: () => {}, onGetStarted: () => {} } }
   export const Empty = { args: { cards: [], pendingState: null, ... } }
   export const Building = { args: { cards: SAMPLE_CARDS, pendingState: 'building', ... } }
   ```

7. **Verify no `~/` imports remain** in the ported tree:
   ```bash
   grep -rn "from '~/" packages/ui/src/components/community/
   # Expect: zero results
   ```

8. **Optional cleanup** — once stable, update the production route to import from `@your-scope/ui` instead of its local copy, then delete the local files. This step is optional; for migration safety, leave both for a few sprints.

## Strategy D: Slot-based shell

**When:** route wires 3+ heavy children (canvas + chat + floating panels). Each child has tight coupling that can't be cleanly mocked.

**Cost:** Medium. ~1 hour for the shell + story fixtures.

**Fidelity:** Visual scaffold only — children are placeholder slots in stories.

### Worked example: Playground (canvas + chat + right panel)

**Production layout:**

```tsx
export function PlaygroundLayout({ canvasData, templateName }: Props) {
  const { chatWidth, handleMouseDown } = useChatPanelResize()
  const panelsHidden = useStore(chatPanelCollapsedAtom)
  const projectId = getProjectIdFromUrl()

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="absolute inset-0">
        <TldrawCanvas projectId={projectId} projectData={canvasData} />
      </div>
      <div className="absolute inset-0 pb-3 pointer-events-none" style={{ zIndex: 299, transform: panelsHidden ? 'translateX(...)' : 'translateX(0)' }}>
        <FloatingRightPanel />
      </div>
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 300 }}>
        <div style={{ width: `${chatWidth}px`, transform: panelsHidden ? 'translateX(...)' : 'translateX(0)' }} className="pointer-events-auto absolute left-3 top-3 bottom-3 ...">
          <div onMouseDown={handleMouseDown} className="absolute right-0 top-0 h-full w-2 cursor-ew-resize" />
          <Header chatWidth={chatWidth} />
          <ChatSidebar />
        </div>
      </div>
    </div>
  )
}
```

**Slot-based shell:**

```tsx
// packages/ui/src/screens/playground.screen.tsx
export type PlaygroundScreenProps = {
  canvas: ReactNode
  sidebar: ReactNode
  rightPanel?: ReactNode
  sidebarWidth?: number
  panelsHidden?: boolean
  onSidebarResizeStart?: (e: React.MouseEvent) => void
  debugPanel?: ReactNode
  className?: string
}

export function PlaygroundScreen({ canvas, sidebar, rightPanel, sidebarWidth = 380, panelsHidden = false, onSidebarResizeStart }: PlaygroundScreenProps) {
  return (
    <div className="relative h-screen w-full overflow-hidden bg-fiddle-elements-background-depth-1">
      <div className="absolute inset-0">{canvas}</div>

      {rightPanel ? (
        <div className="absolute inset-0 pb-3 pointer-events-none transition-transform duration-200"
          style={{ zIndex: 299, transform: panelsHidden ? 'translateX(calc(100% + 12px))' : 'translateX(0)' }}>
          {rightPanel}
        </div>
      ) : null}

      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 300 }}>
        <div className="pointer-events-auto absolute left-3 top-3 bottom-3 flex flex-col rounded-xl border bg-fiddle-elements-background-depth-1 shadow-2xl transition-transform duration-200"
          style={{ width: `${sidebarWidth}px`, transform: panelsHidden ? 'translateX(calc(-100% - 12px))' : 'translateX(0)' }}>
          {onSidebarResizeStart ? (
            <div onMouseDown={onSidebarResizeStart} role="separator" aria-label="Resize sidebar"
              className="absolute right-0 top-0 h-full w-2 translate-x-1/2 cursor-ew-resize z-10 hover:bg-white/5 rounded-r-xl" />
          ) : null}
          {sidebar}
        </div>
      </div>
    </div>
  )
}
```

**Stories use placeholder slots:**

```tsx
const CanvasPlaceholder = () => (
  <div className="h-full w-full" style={{ backgroundImage: 'radial-gradient(...)' }}>
    <div className="text-fiddle-elements-textSecondary font-mono">[Canvas — TldrawCanvas slot]</div>
  </div>
)

const SidebarPlaceholder = () => (
  <>
    <div className="h-12 border-b ...">header / project</div>
    <div className="flex-1 flex flex-col p-4 gap-3">
      <div>user: Add a hero variant.</div>
      <div className="bg-fiddle-elements-background-depth-2 rounded p-3">Created branch · building…</div>
    </div>
  </>
)

export const Default = { args: { canvas: <CanvasPlaceholder />, sidebar: <SidebarPlaceholder /> } }
export const PanelsHidden = { args: { ...Default.args, panelsHidden: true } }
```

**Interactive resize variant** — exercise `onSidebarResizeStart`:

```tsx
function InteractiveResizeSidebar() {
  const [width, setWidth] = useState(380)
  const onResizeStart = (e: React.MouseEvent) => {
    const handleMove = (ev: MouseEvent) => setWidth(Math.max(240, Math.min(640, ev.clientX - 12)))
    const handleUp = () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
  }
  return <PlaygroundScreen canvas={<CanvasPlaceholder />} sidebar={<SidebarPlaceholder />} sidebarWidth={width} onSidebarResizeStart={onResizeStart} />
}
export const InteractiveResize = { render: () => <InteractiveResizeSidebar /> }
```

## Choosing the right strategy: a cheat sheet

| Route type | Strategy |
|---|---|
| Login / signup / forgot-password | A |
| Marketing landing pages | A or C (if heavy hero animations) |
| Settings / preferences | A |
| User profile | A or B (if avatar / activity feeds) |
| Dashboard with N widgets | B |
| Project list / repo browser | B |
| Visual editor / canvas app | D |
| Chat / collab interface | D (if multi-pane), B (if single pane) |
| Custom data viz (graphs, maps, spirals) | C |
| Marketplace / gallery with motion | C |

## Anti-patterns

❌ **Don't** import from `apps/web` into `packages/ui/.storybook/*.stories.tsx`. UI pkg should be standalone.

❌ **Don't** mock singletons like `e2bSessionManager` from inside `packages/ui`. If a component needs the singleton, that component belongs in apps/web — Storybook gets a slot-based shell instead.

❌ **Don't** copy a component to UI pkg without verifying ALL transitive imports cross the boundary cleanly. Run `grep -r "from '~/" packages/ui/src/` after every port.

❌ **Don't** delete the production component immediately after porting. Leave both for 1-2 sprints to catch any missed reference.

❌ **Don't** add `useParams` / `useNavigate` to screen components. Screens take `params` as props; routes resolve them.
