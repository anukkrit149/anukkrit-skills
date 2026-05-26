# Components Catalog — What to Build & How

Between primitives (Button, Input) and screens (Login, Home), the middle layer is "components" — reusable feature-aware building blocks. This catalog lists what every UI package should have.

## Layer order

```
1. Tokens         (Brand/Colors, Brand/Typography)
2. Primitives     (Button, Input, Label, Tooltip, Popover)
3. Components     (← THIS LAYER — Cards, Forms, Nav, Headers)
4. Layouts        (AppShell, LandingShell, SplitShell)
5. Screens        (Signup, Home, Community)
```

Components combine primitives. Screens compose components + layouts.

## Components every UI package should have

### Cards

| Component | Use case | Variants |
|---|---|---|
| `ProjectCard` | Browse projects in a grid | `new` (CTA tile), `existing` (data), `skeleton` |
| `ProfileCard` | Display user / member | `compact`, `expanded`, `skeleton` |
| `MetricCard` | Dashboard KPI tile | `number`, `chart`, `comparison` |
| `MediaCard` | Image / video preview | `thumbnail`, `playable`, `loading` |
| `LinkCard` | External link preview | `default`, `with-favicon`, `compact` |

### Lists

| Component | Use case |
|---|---|
| `List` | Generic vertical list with item slots |
| `MenuList` | Dropdown / popover menu items |
| `TabList` | Horizontal tab navigation |
| `Stepper` | Multi-step flow indicator |
| `Timeline` | Vertical time-ordered events |

### Navigation

| Component | Use case |
|---|---|
| `Header` | Top app bar with logo + actions |
| `Sidebar` | Vertical nav rail (collapsible) |
| `Breadcrumb` | Hierarchical path display |
| `Pagination` | Page number navigation |
| `BackButton` | Universal back arrow |
| `LandingNav` | Marketing/landing top nav |

### Forms

| Component | Use case |
|---|---|
| `LoginForm` | Email + password sign-in |
| `SignupForm` | Email + password sign-up |
| `SearchInput` | Input with search icon + clear |
| `FormField` | Label + Input + ErrorMessage wrapper |
| `FormSection` | Grouped form fields with title |

### Dialogs / overlays

| Component | Use case |
|---|---|
| `ConfirmDialog` | Yes/no confirmation modal |
| `AlertDialog` | Informational alert with action |
| `Drawer` | Side-sliding panel |
| `Sheet` | Bottom sheet (mobile) |
| `Toast` | Transient notification |

### Feedback

| Component | Use case |
|---|---|
| `Spinner` | Inline loading indicator |
| `ProgressBar` | Determinate progress |
| `Skeleton` | Content placeholder |
| `EmptyState` | No-data placeholder (also in Layouts) |
| `ErrorBoundary` | Error fallback UI |

### Data display

| Component | Use case |
|---|---|
| `Avatar` | User profile image |
| `Badge` | Small label / tag |
| `Pill` | Status indicator |
| `KeyValue` | Definition list pairs |
| `Stat` | Number with label |
| `CodeBlock` | Syntax-highlighted code |
| `Markdown` | Markdown renderer |

### Chat / collaboration (if applicable)

| Component | Use case |
|---|---|
| `ChatMessage` | Single message bubble |
| `ChatPanel` | Scrollable message list + input |
| `ChatInput` | Composer with autocomplete |
| `MentionMenu` | @-mention dropdown |

## Per-component contract

Each component should ship with:

1. **One folder** under `packages/ui/src/components/<category>/<name>/`:
   - `index.tsx` (named export)
   - `<name>.stories.tsx`
   - `<name>.test.tsx` (optional)

2. **Named exports** — no default exports.

3. **TypeScript prop interface exported** with `<ComponentName>Props` suffix.

4. **Variants via discriminated union or `cva`** — not boolean prop explosion:
   ```tsx
   // GOOD
   type Props =
     | { variant: 'new'; onClick: () => void }
     | { variant: 'existing'; project: Project; onClick: (p: Project) => void }
     | { variant: 'skeleton' }

   // BAD
   type Props = {
     isNew?: boolean
     isExisting?: boolean
     isSkeleton?: boolean
     project?: Project
     onClick?: (p?: Project) => void
   }
   ```

5. **Design tokens only** — no `bg-#xxx`, no `text-rgb(...)`, no raw color values.

6. **Accessibility baseline:**
   - Semantic HTML (`<button>`, `<a>`, `<h1>`, `<input>`)
   - `aria-label` on icon-only buttons
   - `role` on non-semantic interactive elements
   - Focus states visible (`focus-visible:` Tailwind variants)
   - Keyboard navigation works (Tab, Enter, Esc)

## Worked example: ProjectCard

### Component

```tsx
// packages/ui/src/components/cards/project-card/index.tsx
import { useRef, useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/primitives/popover'

export type ProjectCardProject = { id: string; name: string; updatedAt: string }

type ProjectCardProps =
  | { variant: 'new'; onClick: () => void; isLoading?: boolean }
  | {
      variant: 'existing'
      project: ProjectCardProject
      onClick: (project: ProjectCardProject) => void
      onEdit?: (project: ProjectCardProject) => void
      onDelete?: (project: ProjectCardProject) => void
    }
  | { variant: 'skeleton' }

export function ProjectCard(props: ProjectCardProps) {
  if (props.variant === 'skeleton') {
    return (
      <div className="aspect-[4/3] rounded-xl border border-fiddle-elements-borderColor bg-fiddle-elements-background-depth-2 animate-pulse" />
    )
  }

  if (props.variant === 'new') {
    return (
      <button
        type="button"
        onClick={props.isLoading ? undefined : props.onClick}
        disabled={props.isLoading}
        className="group w-full flex flex-col bg-fiddle-elements-background-depth-2 rounded-xl border border-fiddle-elements-borderColor overflow-hidden transition-all hover:border-fiddle-elements-borderColorActive disabled:opacity-70"
      >
        <div className="aspect-[4/3] flex items-center justify-center">
          <div className={`text-2xl ${props.isLoading ? 'icon-[ph--spinner] animate-spin' : 'icon-[ph--plus] group-hover:text-fiddle-elements-textPrimary'}`} />
        </div>
        <div className="px-4 py-3 text-sm text-fiddle-elements-textPrimary">New project</div>
      </button>
    )
  }

  // variant === 'existing'
  const { project, onClick, onEdit, onDelete } = props
  return (
    <button
      type="button"
      onClick={() => onClick(project)}
      className="group w-full flex flex-col bg-fiddle-elements-background-depth-2 rounded-xl border border-fiddle-elements-borderColor overflow-hidden hover:border-fiddle-elements-borderColorActive text-left"
    >
      <div className="aspect-[4/3] bg-fiddle-elements-background-depth-1" />
      <div className="px-4 py-3 flex items-center justify-between">
        <div>
          <div className="font-medium text-sm text-fiddle-elements-textPrimary truncate">{project.name}</div>
          <div className="text-xs text-fiddle-elements-textSecondary mt-1">{project.updatedAt}</div>
        </div>
        {(onEdit || onDelete) && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                className="w-7 h-7 rounded hover:bg-white/[0.08] flex items-center justify-center"
                aria-label="Project actions"
              >
                <div className="icon-[ph--dots-three-vertical] text-fiddle-elements-textSecondary" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-40 p-1">
              {onEdit && (
                <button onClick={() => onEdit(project)} className="w-full text-left px-3 py-2 text-sm hover:bg-fiddle-elements-background-depth-3 rounded">Edit</button>
              )}
              {onDelete && (
                <button onClick={() => onDelete(project)} className="w-full text-left px-3 py-2 text-sm text-fiddle-elements-error hover:bg-fiddle-elements-background-depth-3 rounded">Delete</button>
              )}
            </PopoverContent>
          </Popover>
        )}
      </div>
    </button>
  )
}
```

### Stories

```tsx
// packages/ui/src/components/cards/project-card/project-card.stories.tsx
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ProjectCard } from '.'

const meta: Meta<typeof ProjectCard> = {
  title: 'Components/Cards/ProjectCard',
  component: ProjectCard,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div className="w-[280px]">
        <Story />
      </div>
    ),
  ],
}
export default meta

type Story = StoryObj<typeof ProjectCard>

export const New: Story = {
  args: { variant: 'new', onClick: () => console.log('new clicked') },
}

export const NewLoading: Story = {
  args: { variant: 'new', isLoading: true, onClick: () => {} },
}

export const Existing: Story = {
  args: {
    variant: 'existing',
    project: { id: 'p-1', name: 'Hero variant exploration', updatedAt: '2 hours ago' },
    onClick: (p) => console.log('open', p.id),
    onEdit: (p) => console.log('edit', p.id),
    onDelete: (p) => console.log('delete', p.id),
  },
}

export const ExistingNoActions: Story = {
  args: {
    variant: 'existing',
    project: { id: 'p-2', name: 'Read-only view', updatedAt: '1 day ago' },
    onClick: () => {},
  },
}

export const Skeleton: Story = {
  args: { variant: 'skeleton' },
}

export const Grid: Story = {
  decorators: [
    (Story) => (
      <div className="w-[900px] grid grid-cols-3 gap-4">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <>
      <ProjectCard variant="new" onClick={() => {}} />
      <ProjectCard variant="existing" project={{ id: '1', name: 'Project Alpha', updatedAt: 'Yesterday' }} onClick={() => {}} />
      <ProjectCard variant="existing" project={{ id: '2', name: 'Project Beta', updatedAt: '3 days ago' }} onClick={() => {}} />
      <ProjectCard variant="skeleton" />
      <ProjectCard variant="skeleton" />
      <ProjectCard variant="skeleton" />
    </>
  ),
}
```

## Building order

Don't build every component up front. Build on-demand as screens need them:

1. Build branding tokens first (entire foundation depends on them).
2. Build primitives the team is most likely to use (Button, Input, Label).
3. For each new screen, **identify required components** during the screen design.
4. Build those components (with stories) BEFORE the screen.
5. The screen then composes existing primitives + components + layouts.

Don't build "all 30 components" speculatively. Cost > value.

## Components vs screens — the line

| It's a component if... | It's a screen if... |
|---|---|
| Reused in multiple places | Specific to one route |
| Takes data as a prop | Owns layout composition |
| Doesn't know about routing | Wraps content in a shell |
| Renders inside a viewport | Defines the viewport |
| Has < 8 props | Has slot props for sub-areas |

If a component grows past ~10 props or starts orchestrating sub-children, it might be a screen instead.

## Auditing your catalog

Run periodically:

- [ ] Every component has a story
- [ ] Every story covers default + edge cases (loading, error, empty if applicable)
- [ ] No component imports from `apps/web` or app-specific paths
- [ ] No component uses raw hex/rgb where tokens exist
- [ ] Every interactive component has a focus-visible state
- [ ] Every icon-only button has `aria-label`
- [ ] Component folder structure consistent (kebab-case, `index.tsx`, `<name>.stories.tsx`)
- [ ] Components export their own props interface

## Component-to-screen dependency map

When you build a screen, ALL its component deps should already exist. Example:

| Screen | Required components |
|---|---|
| `Signup` | LandingShell, FormField, Input, Label, Button, ErrorMessage |
| `Login` | LandingShell, LoginForm (or FormField), Button, Link |
| `Home` | AppShell, Sidebar (collapsible), Header, ProjectCard, EmptyState, Dialog |
| `Community` | CommunityCardsCanvas (ported), CommunityGalleryHeader, ClaimableDots |
| `Playground` | PlaygroundScreen (slot-based), Header, ChatPanel, FloatingRightPanel |

Build dependencies first, then the screen.
