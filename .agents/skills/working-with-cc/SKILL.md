---
name: working-with-cc
description: |
  Comprehensive official documentation reference for all Claude Code features.
  Use when: creating plugins, configuring hooks, setting up MCP servers, writing skills, troubleshooting Claude Code, configuring settings
  Covers: 40+ reference docs (plugins, hooks, skills, commands, MCP, settings, CLI, integrations, security, networking, model config)
  Keywords: claude-code, plugins, hooks, skills, mcp, settings, cli, configuration, troubleshooting
---

# Working with Claude Code

## Overview

This skill provides complete, authoritative documentation for Claude Code directly from docs.claude.com. Instead of guessing about configuration paths, API structures, or feature capabilities, read the official docs stored in this skill's references directory.

## When to Use

Use this skill when:
- Creating or configuring Claude Code plugins
- Setting up MCP servers
- Working with hooks (pre-commit, session-start, etc.)
- Writing or testing skills
- Configuring Claude Code settings
- Troubleshooting Claude Code issues
- Understanding CLI commands
- Setting up integrations (VS Code, JetBrains, etc.)
- Configuring networking, security, or enterprise features

## Quick Reference

| Task | Read This File |
|------|---------------|
| Create a plugin | `plugins.md` then `plugins-reference.md` |
| Set up MCP server | `mcp.md` |
| Configure hooks | `hooks.md` then `hooks-guide.md` |
| Write a skill | `skills.md` |
| CLI commands | `cli-reference.md` |
| Troubleshoot issues | `troubleshooting.md` |
| General setup | `setup.md` or `quickstart.md` |
| Configuration options | `settings.md` |

## Documentation Organization

All documentation is stored as individual markdown files in `references/`. Use the Read tool to access specific documentation:

```
references/
├── overview.md              # Claude Code introduction
├── quickstart.md           # Getting started guide
├── setup.md                # Installation and setup
├── plugins.md              # Plugin development
├── plugins-reference.md    # Plugin API reference
├── plugin-marketplaces.md  # Plugin marketplaces
├── skills.md               # Skill creation
├── mcp.md                  # MCP server integration
├── hooks.md                # Hooks overview
├── hooks-guide.md          # Hooks implementation guide
├── slash-commands.md       # Slash command reference
├── sub-agents.md           # Subagent usage
├── settings.md             # Configuration reference
├── cli-reference.md        # CLI command reference
├── common-workflows.md     # Common usage patterns
├── interactive-mode.md     # Interactive mode guide
├── headless.md             # Headless mode guide
├── output-styles.md        # Output customization
├── statusline.md           # Status line configuration
├── memory.md               # Memory and context management
├── checkpointing.md        # Checkpointing feature
├── analytics.md            # Usage analytics
├── costs.md                # Cost tracking
├── monitoring-usage.md     # Usage monitoring
├── data-usage.md           # Data usage policies
├── security.md             # Security features
├── iam.md                  # IAM integration
├── network-config.md       # Network configuration
├── terminal-config.md      # Terminal configuration
├── model-config.md         # Model configuration
├── llm-gateway.md          # LLM gateway setup
├── amazon-bedrock.md       # AWS Bedrock integration
├── google-vertex-ai.md     # Google Vertex AI integration
├── vs-code.md              # VS Code integration
├── jetbrains.md            # JetBrains integration
├── devcontainer.md         # Dev container support
├── github-actions.md       # GitHub Actions integration
├── gitlab-ci-cd.md         # GitLab CI/CD integration
├── third-party-integrations.md  # Other integrations
├── legal-and-compliance.md # Legal information
├── troubleshooting.md      # Troubleshooting guide
└── migration-guide.md      # Migration guide
```

## Workflow

### For Specific Questions

1. Identify the relevant documentation file from the list above
2. Use Read tool to load: `@references/filename.md`
3. Find the answer in the official documentation
4. Apply the solution

**Example:**
```
User: "How do I create a Claude Code plugin?"
→ Read @references/plugins.md
→ Follow the official plugin creation steps
```

### For Broad Topics

When exploring a topic, start with the overview document, then drill into specific files:

- **Extending Claude Code**: Start with `plugins.md`, `skills.md`, or `mcp.md`
- **Configuration**: Start with `settings.md` or `setup.md`
- **Integrations**: Check relevant integration file (vs-code.md, github-actions.md, etc.)
- **Troubleshooting**: Start with `troubleshooting.md`

### For Uncertain Topics

Use Grep tool to search across all documentation:

```bash
pattern: "search term"
path: ~/.claude/skills/working-with-claude-code/references/
```

## Updating Documentation

The skill includes `scripts/update_docs.js` to fetch the latest documentation from docs.claude.com.

Run when:
- Documentation seems outdated
- New Claude Code features are released
- Official docs have been updated

```bash
node ~/.claude/skills/working-with-claude-code/scripts/update_docs.js
```

The script:
1. Fetches llms.txt from docs.claude.com
2. Extracts all Claude Code documentation URLs
3. Downloads each page to `references/`
4. Reports success/failures

## Common Patterns

### Plugin Development

Read `plugins.md` for overview, then `plugins-reference.md` for API details.

### MCP Server Setup

Read `mcp.md` for configuration format and examples.

### Hook Configuration

Read `hooks.md` for overview, then `hooks-guide.md` for implementation details.

### Skill Creation

Read `skills.md` for the complete skill authoring guide.

## What This Skill Does NOT Do

- This skill provides **documentation access**, not procedural guidance
- For workflows on **how to build** plugins/skills, use the `extending-claude-code` skill (when available)
- This skill is a **reference library**, not a tutorial

## Red Flags

If you find yourself:
- Guessing about configuration file locations → Read `settings.md`
- Speculating about API structures → Read relevant reference doc
- Unsure about hook names → Read `hooks.md`
- Making assumptions about features → Search the docs first

**Always consult the official documentation before guessing.**

## Agent YAML Frontmatter

Reference for agent `.md` files in `.claude/agents/` or plugin `agents/` directories.

### Complete Agent Format

```markdown
---
name: agent-identifier
description: Use this agent when [triggering conditions]. Examples:

<example>
Context: [Situation description]
user: "[User request]"
assistant: "[How assistant should respond and use this agent]"
<commentary>
[Why this agent should be triggered]
</commentary>
</example>

model: inherit
color: blue
tools: ["Read", "Write", "Grep"]
---

You are [agent role description]...
```

### Frontmatter Fields

| Field | Required | Format | Example |
|-------|----------|--------|---------|
| `name` | Yes | lowercase-hyphens, 3-50 chars | `code-reviewer` |
| `description` | Yes | Text + `<example>` blocks | Use when... `<example>`... |
| `model` | Yes | `inherit`/`sonnet`/`opus`/`haiku` | `inherit` |
| `color` | Yes | `blue`/`cyan`/`green`/`yellow`/`magenta`/`red` | `blue` |
| `tools` | No | Array of tool names | `["Read", "Grep"]` |

### Description Best Practices

The `description` field is the most critical -- it controls when Claude triggers the agent.

- Include 2-4 concrete `<example>` blocks with context, user request, assistant response, and `<commentary>`
- Show proactive and reactive triggering
- Cover different phrasings of same intent
- Be specific about when NOT to use the agent
- Include "Use PROACTIVELY when" for auto-delegation

### Agent Lifecycle

- Agents in `agents/` are auto-discovered
- Namespaced automatically: `agent-name` or `plugin:subdir:agent-name`
- System prompt = markdown body (write in second person: "You are...")
- Limit tools to minimum needed (principle of least privilege)

### Color Guidelines

- Blue/cyan: Analysis, review
- Green: Success-oriented tasks
- Yellow: Caution, validation
- Red: Critical, security
- Magenta: Creative, generation

### Common Tool Sets

- Read-only analysis: `["Read", "Grep", "Glob"]`
- Code generation: `["Read", "Write", "Grep"]`
- Testing: `["Read", "Bash", "Grep"]`
- Full access: omit `tools` field

## YAML Validation

Checklist and error patterns for Claude Code resource YAML frontmatter (commands, agents, skills).

### Resource Frontmatter Formats

**Commands** (`.claude/commands/*.md`):
```yaml
---
name: command-name
description: What this command does. Use when [trigger condition].
allowed-tools: Bash, Read, Edit, Grep, Glob
argument-hint: "[arg1] [arg2]"
---
```

**Skills** (`.claude/skills/*/SKILL.md`):
```yaml
---
description: What this skill provides. Triggers on [patterns].
---
```

### Auto-Invocation Triggers

- **Commands**: `description` field enables auto-invocation when user request matches
- **Agents**: Include "Use PROACTIVELY when" in description for auto-delegation
- **Skills**: Activate when user request matches description patterns

### Validation Checklist

- [ ] YAML frontmatter present (between `---` markers)
- [ ] `name` field matches filename (for commands/agents)
- [ ] `description` present and actionable
- [ ] Model value valid: `haiku`, `sonnet`, `opus`, or `inherit`
- [ ] Tools list contains valid tool names (`Bash`, `Read`, `Edit`, `Write`, `Grep`, `Glob`, `WebSearch`, `WebFetch`, `Task`)
- [ ] No syntax errors in YAML

### Common Fixes

| Error | Fix |
|-------|-----|
| Missing frontmatter | Add `---` markers with required fields at top of file |
| Invalid model | Change `model: claude-3-sonnet` to `model: sonnet` |
| Wrong tools format | Change `tools: [Bash, Read]` to `tools: Bash, Read` |

### Quick Validation

```bash
# Check all commands have frontmatter
for f in .claude/commands/*.md; do
  head -1 "$f" | grep -q "^---" || echo "MISSING FRONTMATTER: $f"
done

# Check all agents have name field
for f in .claude/agents/*.md; do
  grep -q "^name:" "$f" || echo "MISSING NAME: $f"
done
```

## Anti-Patterns

| Pattern | Why It's Wrong | Do This Instead |
|---------|---------------|-----------------|
| Guessing config file locations or formats | Claude Code has specific paths (`~/.claude/settings.json`, `.claude/` project dir); wrong paths silently fail | Read `settings.md` for exact locations and schema |
| Putting skills/commands inside `.claude-plugin/` | That directory is ONLY for manifests (`plugin.json`, `marketplace.json`); components go at plugin root | Read `plugins.md` for correct directory structure |
| Using `model: claude-3-sonnet` in agent YAML | Invalid model value; valid values are `haiku`, `sonnet`, `opus`, or `inherit` | Use short model names as documented in the agent format section |
| Hardcoding absolute paths in plugin configs | Breaks portability across machines and users | Use `${CLAUDE_PLUGIN_ROOT}` for all paths in plugin configs |
| Assuming Claude Code features without checking docs | Features change between versions; wrong assumptions waste debugging time | Search `references/` directory first; use `scripts/update_docs.js` if outdated |

## When NOT to Use

- Non-Claude-Code AI tools (Cursor, Copilot, Windsurf) — this skill documents Claude Code specifically
- General programming questions unrelated to Claude Code configuration or extension
- Building MCP servers (use `mcp-builder`); this skill only documents how to configure them in Claude Code

## Conflicts

- `developing-cc-plugins`: That skill provides hands-on plugin development workflows; this skill provides the reference documentation those workflows are built on
- `docs-seeker`: That skill fetches live external documentation; this skill provides local copies of Claude Code docs. Use docs-seeker when local copies are outdated

## Related Skills

- `skill-creator` — iteratively creates and evaluates Claude Code skills using the authoring format documented here
- `plugin-dev:plugin-structure` — plugin development with the plugin structure documented in this skill's references
- `slash-command-factory` — generates slash commands using the format in `references/slash-commands.md`
- `docs-seeker` — fetches live documentation via Context7 when this skill's local references are outdated
- `use-mcp` — executes MCP server operations; see `references/mcp.md` in this skill for config format
