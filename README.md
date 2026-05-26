# anukkrit-skills

Personal skill marketplace for Claude Code and Cowork. Two installable plugins live in one repo:

| Plugin | Skills | Use in |
|---|---|---|
| `anukkrit-skills-cowork` | 50 | Cowork desktop (curated subset — no dev-only skills) |
| `anukkrit-skills-cloud`  | 105 | Claude Code cloud sandbox (full library) |

## Repo layout

```
anukkrit-skills/
├── .claude-plugin/
│   └── marketplace.json        # Lists both plugins
├── cowork/                     # Cowork plugin (50 skills)
│   ├── .claude-plugin/plugin.json
│   └── skills/
└── cloud/                      # Cloud plugin (105 skills)
    ├── .claude-plugin/plugin.json
    └── skills/
```

## Install

### From this marketplace (recommended)

In Claude Code or Cowork:

```
/plugin marketplace add <your-git-url>
/plugin install anukkrit-skills-cowork@anukkrit-skills    # for Cowork
/plugin install anukkrit-skills-cloud@anukkrit-skills     # for cloud sandbox
```

### Direct from a plugin folder

```
/plugin install ./cowork    # from inside this repo
/plugin install ./cloud
```

## Updating

Edit any `SKILL.md`, commit, push. Then in either env:

```
/plugin marketplace update anukkrit-skills
/plugin update anukkrit-skills-cowork
```

## What lives where

- **Cowork bundle:** document tooling (pdf, pptx, marp, obsidian, excalidraw), research (web-research, arxiv, competitor-analysis), planning + triage, skill meta + prompt engineering, data/SQL/GPU.
- **Cloud bundle:** everything above + LangChain/LangGraph/LangSmith stack, deep-agents, GitNexus, Storybook, Vercel, React/frontend, testing, PR workflow.

Categorization is in this README — when adding a new skill, place its folder under whichever bundle makes sense (or both via symlink).
