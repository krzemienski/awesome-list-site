<required_reading>
- references/mermaid-patterns.md (C4 and flowchart patterns especially)
- references/svg-components.md (for performance data)
- references/html-visual-templates.md (hero image)
</required_reading>

<process>

**Phase 1: Architecture Analysis**

1. Identify the system boundary — what's in scope
2. Map all components and their relationships
3. Identify data flows (request paths, event flows, data pipelines)
4. Note technology choices and WHY each was chosen
5. Identify performance characteristics and bottlenecks
6. Determine the narrative: evolution story, comparison, or clean-sheet design

**Phase 2: Diagram Generation (before writing)**

Generate in this order:
1. **System context diagram** (Mermaid C4 or styled flowchart) — the 30,000ft view
2. **Component diagram** — zoom into the main system showing internal components
3. **Sequence diagram** — show the primary request flow through the system
4. **Data flow diagram** (if applicable) — how data moves and transforms
5. **Deployment diagram** (if applicable) — where components run

Save all to `visuals/` directory.

**Phase 3: Writing**

Structure:
1. **The challenge** — What problem does this architecture solve? Why do existing approaches fail?
2. **System overview** — High-level description + context diagram inline
3. **Component deep dive** — Walk through each major component + component diagram inline
4. **Request flow** — Trace a real request through the system + sequence diagram inline
5. **Key decisions** — For each technology choice: what, why, tradeoffs, what you'd change
6. **Performance** — Real numbers with SVG charts. Load testing methodology. Bottlenecks found.
7. **Lessons** — What worked, what didn't, what you'd do differently

Every claim about performance MUST have a chart or concrete number with context.

**Phase 4: Assets**

Generate hero image, social cards, and publishing checklist per full-blog-post.md workflow.
</process>

<success_criteria>
- Minimum 3 Mermaid diagrams (context, component, sequence)
- Every technology choice has a "why" explanation
- Performance data has SVG charts with actual numbers
- Architecture is reproducible from the post alone
- Hero image and social cards generated
</success_criteria>
