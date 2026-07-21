<required_reading>
- references/svg-components.md (PRIMARY — charts are the backbone of this post type)
- references/mermaid-patterns.md (for test setup diagrams)
- references/html-visual-templates.md (hero image)
</required_reading>

<process>

**Phase 1: Data Organization**

1. Collect all metrics, benchmarks, and measurements
2. Identify the headline number (the most impressive result)
3. Organize into comparison groups: before/after, A vs B, time-series trends
4. Note methodology: hardware, software versions, sample sizes, test duration
5. Identify caveats and limitations upfront

**Phase 2: Chart Generation (FIRST — charts drive the writing)**

1. **Headline chart**: SVG bar chart showing the primary before/after or comparison result
2. **Detailed breakdown**: SVG vertical bar chart or grouped bars for multi-metric comparison
3. **Trend chart** (if time-series): SVG line chart showing improvement over time
4. **Metric cards**: SVG metric cards for 2-3 key standalone numbers
5. **Test setup diagram**: Mermaid flowchart showing the benchmark environment

Save all to `visuals/`.

**Phase 3: Writing**

Follow Benchmark template from SKILL.md:
1. **Headline result** — Lead with the chart. "We reduced X from Y to Z."
2. **Methodology** — Exact reproduction steps: hardware, versions, config, commands
3. **Raw data** — Table with all measurements + charts inline
4. **Analysis** — Why these results? What's the bottleneck? What explains outliers?
5. **Caveats** — What this does NOT prove. Edge cases. Different workloads.
6. **Reproduction** — Step-by-step to reproduce this exact benchmark

Every metric: baseline + result + context + measurement method.

**Phase 4: Assets**

Hero image with headline metric prominent. Social cards with key comparison.
</process>

<success_criteria>
- Minimum 3 SVG charts (headline comparison + breakdown + trend or metric cards)
- Methodology section enables exact reproduction
- Every number has context (baseline, measurement method, environment)
- Caveats section present and honest
- Test setup Mermaid diagram included
- Hero image highlights the headline result
</success_criteria>
