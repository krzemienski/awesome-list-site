<required_reading>
- references/mermaid-patterns.md (ALWAYS read first for diagram requests)
- references/svg-components.md (for charts)
- references/html-visual-templates.md (for cards and hero images)
</required_reading>

<process>

**Step 1: Identify visual type from user request**

| Request | Generate |
|---------|----------|
| "diagram", "flowchart", "architecture", "workflow" | Mermaid diagram |
| "sequence diagram", "flow", "interaction" | Mermaid sequence diagram |
| "chart", "graph", "metrics", "comparison" | SVG chart |
| "hero image", "cover image", "banner" | HTML hero card |
| "social card", "twitter image", "linkedin image" | HTML social card |
| "code screenshot", "code card", "code image" | HTML code snippet card |
| "ER diagram", "database schema", "data model" | Mermaid ER diagram |
| "state machine", "state diagram" | Mermaid state diagram |
| "timeline", "gantt", "schedule" | Mermaid Gantt chart |
| "metric card", "stat card", "highlight" | SVG metric card |

**Step 2: Gather requirements**

For diagrams: What entities/nodes? What relationships? What direction (top-down vs left-right)?
For charts: What data? What comparison? Labels? Units?
For cards: Title? Category? Key metric? Author?

**Step 3: Generate**

- Read the appropriate reference file
- Generate the visual following the validated patterns
- For Mermaid: validate node IDs (alphanumeric+underscore only), no nested quotes, proper arrows
- For SVG: include viewBox, axes, labels, data values, professional color palette
- For HTML: inline all CSS, system fonts only, exact platform dimensions

**Step 4: Output**

Save to `visuals/` with descriptive filenames:
- Mermaid: `{description}.mermaid`
- SVG: `{description}.svg`
- HTML: `{description}.html`

Provide the raw content in the response AND save to file.
For Mermaid, also provide a preview by wrapping in ```mermaid fence.
</process>

<success_criteria>
- Visual matches user's description accurately
- Mermaid renders without syntax errors
- SVG has proper viewBox and renders responsively
- HTML is self-contained with zero external dependencies
- Colors follow the professional palette from svg-components.md
- Platform dimensions are correct (if generating social cards)
</success_criteria>
