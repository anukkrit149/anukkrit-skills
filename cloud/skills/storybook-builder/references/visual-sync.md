# Visual Sync — Comparing Storybook Screens to Production Routes

After building screens, **verify pixel fidelity** against the production routes. This is a mandatory step before declaring a screen "done".

The skill supports 3 tool stacks for visual sync. Pick what's available in the host environment.

## Option 1: agent-browser CLI (recommended for AI agents)

`agent-browser` (https://github.com/vercel-labs/agent-browser) is a CLI for browser automation built for AI agents. Already installed locally on user's machine.

### Setup

```bash
# Verify install
which agent-browser 2>/dev/null || command -v agent-browser
# If missing, install:
# npm i -g @vercel/agent-browser  (or follow the upstream README)
```

### Visual sync workflow

```bash
# 1. Start production dev server (in apps/web)
pnpm --filter @scope/web dev &
# Wait for it to be ready (usually localhost:3000 or :5173)

# 2. Start Storybook
pnpm --filter @scope/ui storybook &
# Wait for Storybook URL (auto-assigned port)

# 3. Use agent-browser to capture screenshots of both
agent-browser screenshot http://localhost:3000/signup --output prod-signup.png
agent-browser screenshot http://localhost:62428/?path=/story/screens-signup--default --output story-signup.png

# 4. Compare visually (open both files)
open prod-signup.png story-signup.png
```

### Automated diff loop

Wrap into a loop that screenshots every screen + its production counterpart:

```bash
# scripts/visual-sync.sh
#!/bin/bash
set -e

PROD_BASE="${PROD_BASE:-http://localhost:3000}"
SB_BASE="${SB_BASE:-http://localhost:62428}"
OUT_DIR="${OUT_DIR:-./visual-sync}"

mkdir -p "$OUT_DIR"

declare -A SCREENS=(
  [signup]="signup|screens-signup--default"
  [community]="community|screens-community--default"
  [home]="t/community|screens-home--default"
)

for name in "${!SCREENS[@]}"; do
  IFS='|' read prod_path story_id <<< "${SCREENS[$name]}"

  agent-browser screenshot "$PROD_BASE/$prod_path" \
    --output "$OUT_DIR/$name-prod.png" \
    --viewport 1440x900

  agent-browser screenshot "$SB_BASE/iframe.html?id=$story_id&viewMode=story" \
    --output "$OUT_DIR/$name-story.png" \
    --viewport 1440x900

  echo "Captured $name"
done

echo "All screenshots in $OUT_DIR — review each pair"
```

Notice: use `iframe.html?id=...&viewMode=story` to skip Storybook chrome and screenshot only the story content. Same viewport as production for fair comparison.

### Per-screen visual sync workflow

For each screen, the loop is:

1. Capture production screenshot at standard viewport (1440x900 desktop, 375x812 mobile)
2. Capture Storybook screenshot of the matching story
3. Open both in image viewer side-by-side
4. Diff visually for:
   - Layout: gaps, padding, alignment
   - Typography: font family, size, weight, tracking
   - Colors: borders, backgrounds, hover states
   - Spacing: margins, paddings
   - Content: any text drift
5. If diverged → update the Storybook screen to match production (production is the source of truth)
6. Re-screenshot, re-diff
7. Mark screen as ✅ when pixel-match (modulo fixture data differences)

## Option 2: Chrome DevTools MCP

If `chrome-devtools-mcp` plugin is installed (it is in this environment), use it for both screenshot capture AND visual auditing.

### Capturing screenshots

```ts
// Sequential workflow using MCP tools:
// 1. Open production
await mcp_chrome_devtools__navigate_page({ url: 'http://localhost:3000/signup' })
await mcp_chrome_devtools__take_screenshot({ path: 'prod-signup.png' })

// 2. Open Storybook
await mcp_chrome_devtools__navigate_page({ url: 'http://localhost:62428/iframe.html?id=screens-signup--default' })
await mcp_chrome_devtools__take_screenshot({ path: 'story-signup.png' })
```

### Per-viewport sync

```ts
// Desktop
await mcp_chrome_devtools__resize_page({ width: 1440, height: 900 })
await mcp_chrome_devtools__take_screenshot({ path: 'signup-desktop.png' })

// Mobile
await mcp_chrome_devtools__resize_page({ width: 375, height: 812 })
await mcp_chrome_devtools__take_screenshot({ path: 'signup-mobile.png' })
```

### Accessibility audit

After visual sync, run a11y audit on the Storybook screen using `chrome-devtools-mcp:a11y-debugging` skill. Catches:

- Missing alt text
- Missing aria-labels
- Low contrast ratios
- Focus state issues
- Keyboard nav gaps

### Performance audit

Use `mcp_chrome_devtools__lighthouse_audit` on the Storybook URL to catch:

- Largest Contentful Paint > 2.5s (heavy story)
- Layout shifts (CLS) > 0.1
- Total Blocking Time > 200ms

## Option 3: Playwright MCP (testing-suite plugin)

If `playwright-server` MCP is available (it is in this environment), use it for headless captures + DOM comparison.

```ts
// Capture both
await mcp_playwright__browser_navigate({ url: 'http://localhost:3000/signup' })
await mcp_playwright__browser_take_screenshot({ filename: 'prod-signup.png', fullPage: true })

await mcp_playwright__browser_navigate({ url: 'http://localhost:62428/iframe.html?id=screens-signup--default' })
await mcp_playwright__browser_take_screenshot({ filename: 'story-signup.png', fullPage: true })

// Optional: DOM snapshot for structural comparison
await mcp_playwright__browser_snapshot()
```

## When to use which

| Need | Best tool |
|---|---|
| Quick agent-driven screenshots | **agent-browser CLI** |
| Programmatic capture + a11y + perf audit | **Chrome DevTools MCP** |
| Headless CI integration | **Playwright MCP** |
| Pixel-diff regression testing | Chromatic (paid) or `pixelmatch` (manual) |
| Cross-browser parity | BrowserStack / Sauce Labs (paid) |

For most cases, **agent-browser CLI is the lightest path** — single binary, captures fast, no MCP boilerplate.

## Visual sync checklist (per screen)

- [ ] Production route renders in dev server
- [ ] Storybook story renders in Storybook
- [ ] Both captured at desktop viewport (1440×900)
- [ ] Both captured at mobile viewport (375×812)
- [ ] Side-by-side comparison — no obvious drift
- [ ] Typography matches (font family + size + weight)
- [ ] Colors match (tokens applied)
- [ ] Spacing matches (gaps + padding)
- [ ] Interactive states match (hover, focus, disabled)
- [ ] No console errors in Storybook
- [ ] Screen marked ✅ in coverage checklist

## Visual sync as part of CI

For ongoing protection against regressions, integrate into CI:

```yaml
# .github/workflows/visual-sync.yml
name: Visual Sync

on:
  pull_request:
    paths:
      - 'packages/ui/src/screens/**'
      - 'apps/web/app/routes/**'

jobs:
  visual-sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install
      - run: pnpm --filter ui build-storybook
      - run: pnpm --filter web build

      # Serve both
      - run: |
          npx serve packages/ui/storybook-static -p 6006 &
          pnpm --filter web start &
          sleep 5

      # Capture + diff
      - run: ./scripts/visual-sync.sh
        env:
          PROD_BASE: http://localhost:3000
          SB_BASE: http://localhost:6006

      # Upload diffs for human review
      - uses: actions/upload-artifact@v4
        with:
          name: visual-sync-diffs
          path: visual-sync/
```

Alternatively, use **Chromatic** (https://www.chromatic.com/) which is purpose-built for visual regression on Storybook. Free tier covers most projects.

## Visual sync as a sub-agent task

Spawn a dedicated visual-sync agent after each batch of screens is built:

```
You are running visual sync on N screens.

Setup:
- Production dev server running on http://localhost:3000
- Storybook running on http://localhost:62428
- agent-browser CLI installed

For each screen below, capture screenshots and compare:

1. signup       prod /signup           story screens-signup--default
2. community    prod /community         story screens-community--default
3. home         prod /t/community       story screens-home--default
4. playground   prod /t/community/chat/proj-1   story screens-playground--default

For each:
1. Run: agent-browser screenshot <prod-url> --output <name>-prod.png --viewport 1440x900
2. Run: agent-browser screenshot <storybook-iframe-url> --output <name>-story.png --viewport 1440x900
3. Open both files
4. Compare visually
5. Report PASS / WARN / FAIL per screen with one-line evidence

Report format: markdown table + Top 3 issues to fix.
```

## Common visual sync findings

| Finding | Fix |
|---|---|
| Storybook screen wider than production | Set `parameters.layout: 'fullscreen'` + match production viewport |
| Production has scrollbar, Storybook doesn't | Add `overflow-y-auto` to container OR remove from Storybook if production has the scroll |
| Font weights differ | Verify font CSS loaded in Storybook preview-head.html |
| Colors slightly off | Probably a missing token — production reads `--fiddle-color-X`, Storybook reads literal |
| Spacing off by 4-8px | Padding/margin mismatch — diff Tailwind classes character-by-character |
| Border radii different | Either Tailwind theme differs OR component hard-codes `rounded-md` vs `rounded-lg` |
| Hover state different | Storybook story might not exercise hover; production does. Add a Hovered variant story |
| Loading state visible only in production | Mock the loading state in Storybook (`isLoading: true` prop or MSW delay) |

## Recommended cadence

- **Per PR**: run visual sync for any screens whose underlying components changed
- **Weekly**: run full visual sync across all screens, catch slow drift
- **Pre-release**: run full visual sync + a11y audit, freeze if any diffs

## What visual sync doesn't catch

- Animation differences (use video diffing or manual review)
- Performance differences (use Lighthouse audit)
- Accessibility issues not visible (use a11y audit)
- Behavior differences (use Playwright e2e tests)
- Real network conditions (use Chrome DevTools throttling)

Visual sync is **necessary but not sufficient** — it's part of a larger quality pipeline.
