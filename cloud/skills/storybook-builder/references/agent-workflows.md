# Agent Workflows — Parallelizing the Pipeline

When the skill runs on a fresh repo, the work can be split across multiple agents running in parallel to compress wall-clock time. This file maps every phase to the right agent type with example briefs.

## Overall topology

```
                  Phase 0: audit (single agent, sequential)
                          ↓
              ┌─────────────────────────────┐
              ↓                             ↓
   Phase 1: install Storybook       Phase 2: mock infra
   (general-purpose)                (general-purpose)
              └──────────┬──────────────────┘
                         ↓
          Phase 3: layout primitives (ui-ux-designer)
                         ↓
        ┌──────────────────────────────────────┐
        ↓             ↓               ↓        ↓
   Strategy A    Strategy B      Strategy C  Strategy D
   screens       screens         port module screens
   (parallel)    (parallel)      (heavier)  (parallel)
        └──────────┬──────────────────┬───────┘
                   ↓                  ↓
        Phase 7: write stories (per-screen, parallel)
                            ↓
              ┌─────────────────────────┐
              ↓                         ↓
   Audit 1: story quality       Audit 2: mock pipeline
   (architect-reviewer)         (code-reviewer)
              └─────────┬───────────────┘
                        ↓
                Phase 10: verify
                (main thread)
```

## Phase 0 — Audit (main thread, no spawn)

The orchestrating agent (main) does this. Don't delegate — too much context-specific routing.

Actions:
- `find` route files
- `grep` for singletons + service imports per route
- Build the strategy table

## Phase 1 — Install Storybook

**Subagent type:** `general-purpose`
**Why:** purely shell commands + config edits, no design judgment

**Example brief:**

```
You are installing Storybook in a fresh monorepo.

Repo: /path/to/repo
Target package: packages/ui
Framework: react-vite
Routing: react-router-dom v6
Data: @tanstack/react-query v5

Tasks:
1. Run `pnpm --filter @scope/ui dlx storybook@latest init --type react`. If the binary already exists, skip and report.
2. Install dev deps: msw, msw-storybook-addon, @tanstack/react-query, react-router-dom
3. Run `pnpm --filter @scope/ui exec msw init public/ --save`
4. Verify .storybook/main.ts has framework.name === '@storybook/react-vite'
5. Add screens/** glob to main.ts stories array
6. Report: files modified, deps installed, any peer-dep warnings

DO NOT touch src/test-utils/ or src/screens/ — those are other agents' work.
```

## Phase 2 — Mock infrastructure

**Subagent type:** `general-purpose`
**Why:** mechanical file creation following templates

**Example brief:**

```
You are creating Storybook mock infrastructure files.

Repo: /path/to/repo
Target dir: packages/ui/src/test-utils/

Read the template at: ~/.claude/skills/storybook-screen-builder/references/mock-infrastructure.md

Create exactly these files (full code in the reference):
- mock-query-client.tsx
- mock-router.tsx
- mock-handlers.ts
- index.ts

Then update:
- .storybook/preview.ts (merge with existing — don't drop theme decorator)
- .storybook/main.ts (add 'msw-storybook-addon' to addons array)
- Create .storybook/types.d.ts with Parameters augmentation

Verify by running `pnpm --filter ui typecheck`. Report any errors.
```

## Phase 3 — Layout primitives

**Subagent type:** `ui-ux-designer`
**Why:** needs design judgment on tokens, spacing, accessibility

**Example brief:**

```
You are building 5 reusable layout primitives in the fiddle UI package.

Repo: /path/to/repo
Target dir: packages/ui/src/components/layout/
Design tokens: bg-fiddle-elements-* (already in repo)
Reference: ~/.claude/skills/storybook-screen-builder/references/layout-primitives.md

Build:
- app-shell/ (index.tsx + app-shell.stories.tsx)
- landing-shell/ (depends on existing dot-grid-background + landing-nav)
- split-shell/
- empty-state/
- loading-shell/

Then update packages/ui/src/components/layout/index.ts to re-export.

Verify with `pnpm --filter ui typecheck`. Report files created + typecheck result.
```

## Phase 4-6 — Screen implementations (parallel)

Spawn ONE agent per screen. Each agent is independent.

### Strategy A screens

**Subagent type:** `typescript-pro` or `general-purpose`
**Why:** form-heavy refactor, needs strong TS

**Example brief (signup):**

```
You are building the SignupScreen + refactoring the production route.

Repo: /path/to/repo
Read these references:
- ~/.claude/skills/storybook-screen-builder/references/screen-strategies.md (Strategy A section)
- ~/.claude/skills/storybook-screen-builder/references/story-templates.md (Pattern 2)

Files to read first:
- apps/web/app/routes/signup.tsx (current implementation)

Build:
1. packages/ui/src/screens/signup.screen.tsx (props-only, uses LandingShell)
2. packages/ui/src/screens/signup.screen.stories.tsx (Default + WithError + Submitting + Static)
3. Refactor apps/web/app/routes/signup.tsx to render <SignupScreen />

Add to packages/ui/src/screens/index.ts barrel.

Verify:
- pnpm --filter ui typecheck
- pnpm --filter ui build (rebuilds dist/)
- pnpm --filter web typecheck (verifies route refactor)

Report all file changes + any typecheck output.
```

### Strategy B screens

**Subagent type:** `typescript-pro`
**Why:** twin component, needs careful prop interface design

**Example brief (home):**

```
You are building a presentational HomeScreen twin.

Repo: /path/to/repo

Read first:
- apps/web/app/shared/components/HomePage.tsx (production component)
- packages/ui/src/components/cards/project-card/index.tsx (the real ProjectCard)
- Reference: ~/.claude/skills/storybook-screen-builder/references/screen-strategies.md (Strategy B)

Build:
1. packages/ui/src/screens/home.screen.tsx — same JSX as HomePage but with sidePanel as ReactNode slot and projects as prop. Use real ProjectCard.
2. packages/ui/src/screens/home.screen.stories.tsx — Default, Empty, Loading, NoRepoSelected, NoTemplatesAvailable, CollapsedSidebar variants. Build a FixtureSidePanel inside the story file using SidebarNavButton + SidebarFooterLink primitives (already exist in UI pkg).

DO NOT change apps/web/app/shared/components/HomePage.tsx (keep production unchanged).

Verify typecheck, report any deviations from production HomePage structure.
```

### Strategy C screens (heavy)

**Subagent type:** `typescript-pro` + main thread coordination
**Why:** large file moves, many imports to rewire

**Example brief (community):**

```
You are porting the community module from apps/web to packages/ui.

Repo: /path/to/repo
Source: apps/web/app/modules/community/ (1776 lines, 17 files)
Target: packages/ui/src/components/community/

Read first:
- All files in apps/web/app/modules/community/
- apps/web/app/shared/hooks/useViewportSize.ts (move to packages/ui/src/hooks/)
- Reference: ~/.claude/skills/storybook-screen-builder/references/screen-strategies.md (Strategy C)

Port plan:
1. Copy each file to packages/ui/src/components/community/ with the same subdir structure
2. Replace EVERY `~/modules/community/X` import with relative path
3. Move useViewportSize to packages/ui/src/hooks/, update hooks/index.ts barrel
4. Add iframeBaseUrl + logoSrc + slackUrl optional props to make components Storybook-renderable
5. Create packages/ui/src/components/community/index.ts barrel
6. Build packages/ui/src/screens/community.screen.tsx using the ported components
7. Build the story with fixture cards (24 sample cards, all pendingState variants)

Verify:
- grep -r "from '~/" packages/ui/src/components/community/ → should be ZERO results
- pnpm --filter ui typecheck
- Storybook boot test

Apps/web local copy stays untouched for now — it'll be cleaned up in a later pass.

Report: files created, files modified, typecheck output, any imports you couldn't resolve.
```

### Strategy D screens

**Subagent type:** `general-purpose` (lighter work, mostly composition)

**Example brief (playground):**

```
You are building a slot-based PlaygroundScreen.

Repo: /path/to/repo
Read:
- apps/web/app/layouts/PlaygroundLayout.tsx (production layout to mirror)
- Reference: ~/.claude/skills/storybook-screen-builder/references/screen-strategies.md (Strategy D)

Build:
1. packages/ui/src/screens/playground.screen.tsx with slots: canvas, sidebar, rightPanel?, sidebarWidth?, panelsHidden?, onSidebarResizeStart?
2. packages/ui/src/screens/playground.screen.stories.tsx with placeholder slot components: CanvasPlaceholder, SidebarPlaceholder, RightPanelPlaceholder. Variants: Default, NoRightPanel, NarrowSidebar, PanelsHidden, InteractivePanels, InteractiveResize.

DO NOT touch apps/web/app/layouts/PlaygroundLayout.tsx — production unchanged.

Verify typecheck.
```

## Phase 8 — Audit (run in parallel after all screens done)

### Audit 1: Story quality

**Subagent type:** `architect-reviewer`
**Why:** architectural/design judgment, no edit

**Example brief:**

```
Audit Storybook stories in the fiddle UI package against design + accessibility + completeness criteria.

Repo: /path/to/repo
READ-ONLY review — do NOT edit files.

Scope — review these story files + their components:

Primitives:
- packages/ui/src/components/layout/{app-shell,landing-shell,split-shell,empty-state,loading-shell}/

Screens:
- packages/ui/src/screens/{signup,access-denied,community,home,playground}.screen{,.stories}.tsx

Audit checklist (PASS/WARN/FAIL with one-line evidence per item):
1. State coverage
2. Prop completeness
3. Interactivity (useState driver presence)
4. Design tokens (no raw hex/rgb where tokens exist; document intentional exceptions)
5. AI-slop check
6. Accessibility (semantic HTML, aria-*, focus visible)
7. Storybook hygiene (title, layout, typed meta)
8. Coupling (no react-router or @tanstack/react-query in components)

Output: per-file markdown table + Top 3 issues to fix + Top 3 wins. Under 500 words, cite file:line for every finding.
```

### Audit 2: Mock pipeline

**Subagent type:** `code-reviewer`
**Why:** code-correctness review

**Example brief:**

```
Audit the Storybook mocking infrastructure for correctness, isolation, and integration safety.

Repo: /path/to/repo
READ-ONLY — do NOT edit.

Files:
- packages/ui/.storybook/{main.ts,preview.ts,types.d.ts}
- packages/ui/src/test-utils/{mock-query-client.tsx,mock-router.tsx,mock-handlers.ts,index.ts}
- packages/ui/public/mockServiceWorker.js
- packages/ui/package.json (devDeps)

Audit:
1. No real HTTP leaks (onUnhandledRequest policy)
2. Fresh QueryClient per render (decorator body not module scope)
3. MemoryRouter not BrowserRouter
4. Decorator order correct
5. TypeScript correctness (no `as any` where types could augment)
6. Addons array correct (no unregistered installed addons confusing readers)
7. No cross-story cache leak
8. Decorator universality (existing primitive/component stories not broken)
9. MSW worker present + staticDirs config
10. Future-proofing of mock-handlers compose pattern

Output: per-checklist PASS/WARN/FAIL with file:line + Top 3 risks + Top 3 quick wins. Under 500 words.
```

## Sequencing rules

- Phase 1 + 2 can run in parallel (independent files)
- Phase 3 must finish before any screen work starts (screens import primitives)
- All screen agents run in parallel — each writes to a different file
- Audits run in parallel after all screens are done
- Main thread applies audit fixes (cheap edits don't need spawning)
- Main thread runs `typecheck` + Storybook boot test as final verification

## Failure modes when delegating

**Agent A blocks on write permissions** — happened in real run. Solution: main thread does the writes directly using the agent's reported file contents.

**Two agents touch the same barrel file** — collisions on `packages/ui/src/screens/index.ts`. Solution: serialize barrel updates via main thread after each screen agent reports.

**Agent uses wrong package manager** — pnpm vs npm vs yarn. Solution: always specify in the brief.

**Agent imports from wrong path** — `~/` aliases that don't exist in UI pkg. Solution: brief must include the import convention rules.

**Agent skips typecheck** — common with general-purpose agents. Solution: brief explicitly says "verify with pnpm typecheck, report output".

## Worked launch example

Realistic launch order for a fresh repo from scratch:

```
1. Main thread: Phase 0 audit (5-10 min)
2. Main thread: spawn Phase 1 + Phase 2 in parallel via Agent tool (15 min)
3. Wait for both, then main thread: spawn Phase 3 (UI primitives) (10 min)
4. Wait, then main thread: spawn 4 screen agents in parallel (15-30 min)
5. Wait, then main thread: spawn Audit 1 + Audit 2 in parallel (10 min)
6. Main thread: apply audit fixes inline (5 min)
7. Main thread: final verify (typecheck + storybook boot) (5 min)
```

Total wall-clock: ~60-80 min for a fresh repo with 4-6 routes. Without parallelization: 3-4 hours.
