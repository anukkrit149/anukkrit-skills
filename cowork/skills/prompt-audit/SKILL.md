---
name: prompt-audit
description: Audit and improve AI system prompts stored in fallback.json. Extracts prompts, dispatches parallel expert review teams (prompt engineer + AI engineer per skill), collects findings, applies fixes via Node.js scripts, validates with second-pass review, and queries Datadog for production evidence. Use when prompts need quality improvement, output quality is poor, adding design thinking, auditing tool lists, fixing pre-read contradictions, reviewing prompt changes before deploy, or checking context bleed. Triggers on "audit prompts", "review prompts", "improve AI output", "prompt quality", "fix prompts", "prompt engineering review", "check prompt bleed".
---

Audit and improve AI system prompts through parallel expert review, production data analysis, and automated fixes.

## Workflow

### Phase 1: Extract

Run the extraction script to pull all prompts from `fallback.json` into readable review files:

```bash
node scripts/extract-prompts.js
```

Creates `docs/prompt-review-input/prompt-{type}.txt` for each prompt type + runtime components (classifier, registry, cache-strategy).

### Phase 2: Review — Parallel expert teams

Dispatch one `prompt-engineer` agent per prompt type. Each team reads its extracted file and produces structured findings.

**Team checklist per prompt:**
1. Tool list matches `packages/ai/src/skills/registry.ts` toolNames — no phantom tools, no missing real tools
2. All examples end with `done()`, no unnecessary `readFile` when source is pre-loaded
3. No contradictions between sections (pre-loaded vs "always read first")
4. Anti-patterns have design reasoning ("NEVER X — because Y")
5. Pre-read pipeline awareness (model knows source is already loaded)
6. genEditor label→paramName mapping is clear
7. Skill-mode awareness for shared prompts (edit serves 3 skills)
8. Context isolation — no bleed from previous messages

**Teams to dispatch (all in parallel):**
- Team 1-6: One per prompt type (animate, edit, spot_edit, general, create_component, compose_component)
- Team 7: Runtime review (classifier + registry + cache-strategy + executor)

Each team writes findings to a shared doc. Use the finding format from [references/finding-format.md](references/finding-format.md).

### Phase 3: Fix — Apply via Node.js

Use the update script to modify prompt sections programmatically (avoids JSON long-line edit issues):

```bash
node scripts/update-prompt.js <prompt-type> <section-key> "new content here"
```

For multi-section updates, use the batch script with a JSON patch file:

```bash
node scripts/batch-update-prompts.js patches/my-fixes.json
```

Always validate after changes:
```bash
node scripts/validate-prompts.js
```

### Phase 4: Validate — Second pass

Re-extract and dispatch validation teams. These check all previous findings are resolved and no new issues introduced.

### Phase 5: Datadog evidence (optional)

Query production data to ground the audit. See [references/datadog-queries.md](references/datadog-queries.md) for ready-to-use queries for skill efficiency, frustration signals, and tool errors.

## Key Rules

- **Pre-read pipeline**: Source is pre-loaded by prefetch. Say "analyze the pre-loaded source" not "read the file first."
- **ZERO TEXT BETWEEN TOOL CALLS**: Action skills execute silently. Design thinking goes in role/guidance (internalized), not output text.
- **Context isolation**: Previous messages don't influence current edits unless user explicitly says "same as before."
- **Tool lists match registry.ts**: The `tools` section describes HOW to use tools. SDK controls WHICH tools exist.
- **Every NEVER needs a WHY**: "NEVER use bounce easing — feels dated, draws attention to animation itself."
- **animate is sacred**: Highest eval score (4.68/5.0). Be surgical — add, don't remove without provenance.
- **Skill-mode detection**: edit prompt serves 3 skills. Use tool availability to detect mode (genEditor → visual, writeFile → code).

## Design Patterns Reference

See [references/design-patterns.md](references/design-patterns.md) for impeccable design thinking to inject into prompts.
