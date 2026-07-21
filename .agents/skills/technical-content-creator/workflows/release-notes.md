<required_reading>
- references/mermaid-patterns.md (for change diagrams)
- references/html-visual-templates.md (hero image)
</required_reading>

<process>

**Phase 1: Change Inventory**

1. List all changes: features, fixes, breaking changes, deprecations
2. Categorize: Added, Changed, Fixed, Deprecated, Removed, Security
3. Identify the 1-3 headline changes (what users care about most)
4. For each headline change: before state, after state, migration steps

**Phase 2: Visuals**

1. **Hero image**: Version number prominent, 1-2 word feature highlight
2. **Change diagram** (if architectural): Mermaid before/after flowcharts
3. **Migration diagram** (if breaking changes): Mermaid sequence showing migration steps

**Phase 3: Writing**

Structure:
1. **Version headline** — "v2.0: Feature X + Performance Y" (one line)
2. **Highlights** — 2-3 paragraph summary of what matters most
3. **What's new** — Detailed features with code examples
4. **Breaking changes** — Exact migration steps with before/after code
5. **Bug fixes** — List with issue references
6. **Full changelog** — Link to diff or complete list

Rules:
- Breaking changes get before/after code blocks
- New features get minimal working examples
- Every entry links to relevant PR/issue if available

Save as `release_notes.md`.
</process>

<success_criteria>
- All changes categorized (Added/Changed/Fixed/Deprecated/Removed/Security)
- Breaking changes have migration code examples
- Headline features have working code examples
- Hero image generated with version number
- Concise enough to scan, detailed enough to act on
</success_criteria>
