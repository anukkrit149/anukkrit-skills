# Design Patterns Reference

Design thinking patterns from impeccable to inject into AI prompts.

## Animation

**Timing benchmarks:**
- 100-150ms: Instant feedback (button press, toggle)
- 200-300ms: State changes (hover, menu open)
- 300-500ms: Layout changes (accordion, modal)
- 500-800ms: Entrance animations (page load)
- Exit animations: 75% of enter duration

**Easing curves:**
- ease-out-quart `cubic-bezier(0.25, 1, 0.5, 1)`: Smooth, refined
- ease-out-quint `cubic-bezier(0.22, 1, 0.36, 1)`: Slightly snappier
- ease-out-expo `cubic-bezier(0.16, 1, 0.3, 1)`: Confident, decisive
- NEVER bounce/elastic — feels dated, draws attention to animation itself

**Accessibility:** Always respect `prefers-reduced-motion`. Provide non-animated fallbacks.

## Color

- Derive from component's existing palette — never invent arbitrary colors
- 60/30/10 rule: dominant (60%), secondary (30%), accent (10%)
- Use OKLCH for perceptual uniformity when generating scales
- NEVER use pure gray for neutrals — add subtle warm/cool tint
- NEVER default to purple-blue gradients (AI slop aesthetic)
- WCAG contrast: 4.5:1 for text, 3:1 for UI components

## Layout & Spacing

- Space is a design material — use with intention
- Tight grouping for related elements (8-12px)
- Generous separation between sections (48-96px)
- Use component's existing spacing scale, not arbitrary values
- Squint test: blur eyes — can you identify primary, secondary, groupings?
- Don't wrap everything in cards — spacing creates grouping naturally

## Typography

- Font sizes in rem for accessibility
- Font weights: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)
- Line height: 1.5 for body, 1.2-1.3 for headings
- Limit to 2-3 font sizes per component

## Anti-Pattern Format

Every "NEVER" rule should include design reasoning:

```
NEVER use bounce easing — feels dated and draws attention to the animation itself
NEVER hardcode hex when tokens exist — breaks design system and theming
NEVER animate layout properties — causes layout recalculation and jank, use transform
NEVER invent arbitrary colors — derive from existing palette for brand coherence
```
