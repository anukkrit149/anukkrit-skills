# Finding Format

Use this format for each issue found during prompt review:

```markdown
### Finding [N]: [Title]
**Severity:** P0 (critical) / P1 (high) / P2 (medium) / P3 (low)
**Section:** [which section in the prompt]
**Issue:** [quote the problematic text]
**Impact on output quality:** [how this degrades what the model produces]
**Proposed fix:** [exact replacement text or specific instruction]
**Reasoning:** [prompt engineering or AI engineering reasoning for why this fix works]
```

## Severity Guide

- **P0**: Model will fail or hallucinate (wrong tool list, contradictory instructions)
- **P1**: Significant quality degradation in normal usage (missing design guidance, wrong examples)
- **P2**: Moderate issue (redundant rules, minor contradictions, cosmetic)
- **P3**: Low-impact polish (formatting, ordering, wording)
