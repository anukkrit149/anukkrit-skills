# Layout Primitives — Full Code Reference

Copy-paste-ready code for 5 reusable shell primitives. All use design tokens; replace `bg-fiddle-elements-*` with your project's tokens.

Folder structure for each:

```
packages/ui/src/components/layout/<name>/
├── index.tsx              ← named export of the primitive
└── <name>.stories.tsx     ← 2-4 story variants
```

Update `packages/ui/src/components/layout/index.ts` barrel to re-export.

## 1. AppShell — top-level page shell

```tsx
// app-shell/index.tsx
import type { ReactNode } from 'react'
import { cn } from '@/utils'

export type AppShellProps = {
  header?: ReactNode
  children: ReactNode
  className?: string
}

export function AppShell({ header, children, className }: AppShellProps) {
  return (
    <div className={cn('flex flex-col h-screen w-full bg-fiddle-elements-background-depth-1', className)}>
      {header ? <div className="flex-shrink-0">{header}</div> : null}
      <div className="flex flex-1 overflow-hidden">{children}</div>
    </div>
  )
}
```

```tsx
// app-shell/app-shell.stories.tsx
import type { Meta, StoryObj } from '@storybook/react-vite'
import { AppShell } from '.'

const meta: Meta<typeof AppShell> = {
  title: 'Layout/AppShell',
  component: AppShell,
  parameters: { layout: 'fullscreen' },
}
export default meta

const Body = ({ label }: { label: string }) => (
  <div className="flex-1 flex items-center justify-center text-sm text-fiddle-elements-textSecondary">{label}</div>
)
const Header = () => (
  <div className="h-12 border-b border-fiddle-elements-borderColor flex items-center px-4 text-fiddle-elements-textPrimary text-sm font-mono">
    HEADER SLOT
  </div>
)

export const Default: StoryObj<typeof AppShell> = {
  args: { header: <Header />, children: <Body label="Main content area" /> },
}
export const NoHeader: StoryObj<typeof AppShell> = {
  args: { children: <Body label="Headerless shell" /> },
}
export const TwoPane: StoryObj<typeof AppShell> = {
  args: {
    header: <Header />,
    children: (
      <>
        <Body label="Left pane" />
        <div className="flex-shrink-0 w-80 border-l border-fiddle-elements-borderColor">
          <Body label="Right pane" />
        </div>
      </>
    ),
  },
}
```

## 2. LandingShell — auth/marketing chrome

```tsx
// landing-shell/index.tsx
import type { ReactNode } from 'react'
import { cn } from '@/utils'
import { DotGridBackground } from '../dot-grid-background'
import { LandingNav, type LandingNavLink } from '../landing-nav'

export type LandingShellProps = {
  navLinks: LandingNavLink[]
  logo?: ReactNode
  children: ReactNode
  interactive?: boolean
  className?: string
}

export function LandingShell({
  navLinks,
  logo,
  children,
  interactive = true,
  className,
}: LandingShellProps) {
  return (
    <div className={cn('relative min-h-screen w-full overflow-hidden bg-fiddle-elements-background-depth-1', className)}>
      <DotGridBackground interactive={interactive} />
      <LandingNav links={navLinks} />
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-16">
        <div className="flex flex-col items-center gap-10">
          {logo}
          {children}
        </div>
      </div>
    </div>
  )
}
```

**Dependencies:** assumes `DotGridBackground` and `LandingNav` already exist as sibling primitives. If not, scaffold simple versions:

```tsx
// dot-grid-background/index.tsx (minimal version)
export function DotGridBackground({ interactive }: { interactive?: boolean }) {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-0"
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)',
        backgroundSize: '26px 26px',
        WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 35%, rgba(0,0,0,0.5) 0%, transparent 100%)',
        maskImage: 'radial-gradient(ellipse 80% 60% at 50% 35%, rgba(0,0,0,0.5) 0%, transparent 100%)',
      }}
    />
  )
}

// landing-nav/index.tsx (minimal)
export type LandingNavLink = { label: string; href: string }
export function LandingNav({ links }: { links: LandingNavLink[] }) {
  return (
    <div className="fixed top-5 right-5 z-10 flex items-center gap-4">
      {links.map(({ label, href }) => (
        <a key={href} href={href} target="_blank" rel="noreferrer"
          className="font-mono text-[11px] tracking-[0.08em] text-fiddle-elements-textPrimary hover:underline">
          {label}
        </a>
      ))}
    </div>
  )
}
```

## 3. SplitShell — sidebar + main pane

```tsx
// split-shell/index.tsx
import type { ReactNode } from 'react'
import { cn } from '@/utils'

export type SplitShellProps = {
  sidebar: ReactNode
  main: ReactNode
  sidebarSide?: 'left' | 'right'
  sidebarWidth?: number
  hideSidebar?: boolean
  className?: string
}

export function SplitShell({
  sidebar, main,
  sidebarSide = 'right',
  sidebarWidth = 380,
  hideSidebar = false,
  className,
}: SplitShellProps) {
  const sidebarNode = hideSidebar ? null : (
    <div
      className={cn(
        'flex-shrink-0 overflow-hidden',
        sidebarSide === 'right'
          ? 'border-l border-fiddle-elements-borderColor'
          : 'border-r border-fiddle-elements-borderColor'
      )}
      style={{ width: sidebarWidth, height: '100%' }}
    >
      {sidebar}
    </div>
  )

  return (
    <div className={cn('flex flex-1 overflow-hidden', className)}>
      {sidebarSide === 'left' ? sidebarNode : null}
      <div className="flex-1 overflow-hidden">{main}</div>
      {sidebarSide === 'right' ? sidebarNode : null}
    </div>
  )
}
```

## 4. EmptyState — no-data placeholder

```tsx
// empty-state/index.tsx
import type { ReactNode } from 'react'
import { cn } from '@/utils'

export type EmptyStateProps = {
  title: string
  description?: string
  action?: ReactNode
  icon?: ReactNode
  compact?: boolean
  className?: string
}

export function EmptyState({
  title, description, action, icon, compact = false, className,
}: EmptyStateProps) {
  return (
    <div className={cn(
      'flex h-full w-full flex-col items-center justify-center text-center',
      compact ? 'gap-2 px-4 py-6' : 'gap-4 px-6 py-12',
      className
    )}>
      {icon ? <div className="text-fiddle-elements-textSecondary">{icon}</div> : null}
      <h3 className={cn(
        'font-medium text-fiddle-elements-textPrimary',
        compact ? 'text-sm' : 'text-base'
      )}>
        {title}
      </h3>
      {description ? (
        <p className={cn(
          'max-w-md text-fiddle-elements-textSecondary',
          compact ? 'text-xs' : 'text-sm'
        )}>
          {description}
        </p>
      ) : null}
      {action ? <div className={compact ? 'mt-1' : 'mt-2'}>{action}</div> : null}
    </div>
  )
}
```

## 5. LoadingShell — full-screen loading

```tsx
// loading-shell/index.tsx
import { cn } from '@/utils'

export type LoadingShellProps = {
  logoSrc?: string
  message?: string
  className?: string
}

export function LoadingShell({ logoSrc, message, className }: LoadingShellProps) {
  return (
    <div className={cn(
      'flex h-full min-h-screen w-full flex-col items-center justify-center gap-4 bg-fiddle-elements-background-depth-1',
      className
    )}>
      {logoSrc ? <img src={logoSrc} alt="Loading" className="h-10 w-10 opacity-80" /> : null}
      <div
        className="h-6 w-6 rounded-full border-2 border-fiddle-elements-borderColor border-t-fiddle-elements-textPrimary animate-spin"
        aria-label="Loading"
        role="status"
      />
      {message ? (
        <p className="font-mono text-[11px] tracking-[0.08em] text-fiddle-elements-textSecondary uppercase">
          {message}
        </p>
      ) : null}
    </div>
  )
}
```

**Accessibility note:** `role="status"` + `aria-label="Loading"` is the right pattern. Screen readers announce loading state. Don't replace with `role="progressbar"` unless you have actual progress to report.

## Barrel export

```ts
// packages/ui/src/components/layout/index.ts
export { Header } from './header'
export type { HeaderProps } from './header'

// existing exports...

export { DotGridBackground } from './dot-grid-background'
export type { DotGridBackgroundProps } from './dot-grid-background'
export { LandingNav } from './landing-nav'
export type { LandingNavLink, LandingNavProps } from './landing-nav'
export { AppShell } from './app-shell'
export type { AppShellProps } from './app-shell'
export { LandingShell } from './landing-shell'
export type { LandingShellProps } from './landing-shell'
export { SplitShell } from './split-shell'
export type { SplitShellProps } from './split-shell'
export { EmptyState } from './empty-state'
export type { EmptyStateProps } from './empty-state'
export { LoadingShell } from './loading-shell'
export type { LoadingShellProps } from './loading-shell'
```

## Design token mapping

If the host repo doesn't have `fiddle-elements-*` tokens, map them once. Common alternatives:

| Fiddle token | Tailwind default | Custom alt |
|---|---|---|
| `bg-fiddle-elements-background-depth-1` | `bg-neutral-900` | `bg-surface-0` |
| `bg-fiddle-elements-background-depth-2` | `bg-neutral-800` | `bg-surface-1` |
| `text-fiddle-elements-textPrimary` | `text-neutral-100` | `text-foreground` |
| `text-fiddle-elements-textSecondary` | `text-neutral-400` | `text-muted-foreground` |
| `border-fiddle-elements-borderColor` | `border-neutral-800` | `border-border` |
| `bg-fiddle-elements-button-primary-background` | `bg-white` | `bg-primary` |

Best practice: do a global find/replace in the primitives folder once, **before** writing screen components — keeps the screens portable.

## Story hygiene rules for primitives

- Title prefix: `Layout/`
- `parameters.layout`: `'fullscreen'` for full-page primitives, `'centered'` for small ones (EmptyState)
- At least 2 variants per primitive (Default + 1 alternative state)
- No `useState` decorators in primitive stories — primitives are stateless
- Wrap small primitives in a sized container decorator so they render in centered layout:

```tsx
const wrapper = (Story: React.ComponentType) => (
  <div className="h-[480px] w-[640px] border border-fiddle-elements-borderColor rounded-md bg-fiddle-elements-background-depth-1">
    <Story />
  </div>
)
export const Default: Story = { args: {...}, decorators: [wrapper] }
```
