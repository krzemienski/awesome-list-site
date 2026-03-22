---
name: ck:sequential-thinking
description: |
  Apply step-by-step analysis for complex problems with revision capability.
  Use when: decomposing complex problems, verifying hypotheses, adaptive planning with course correction, debugging with structured reasoning, multi-step solutions requiring context maintenance.
  Covers: MCP tool integration, revision markers, branching, dynamic total adjustment, hypothesis-driven investigation, three application modes.
  Keywords: sequential thinking, step-by-step, problem decomposition, hypothesis, revision, branching, reasoning chain
version: 1.0.0
license: MIT
argument-hint: "[problem to analyze step-by-step]"
---

# Sequential Thinking

Structured problem-solving methodology, backed by the `mcp__sequential-thinking__sequentialthinking` MCP tool for persistent thought tracking.

## MCP Tool Integration

This skill wraps the **sequentialthinking** MCP tool. Use the tool for tracked, revisable thought chains:

```
mcp__sequential-thinking__sequentialthinking({
  thought: "Step 1: Analyze the problem scope...",
  thoughtNumber: 1,
  totalThoughts: 5,
  nextThoughtNeeded: true
})
```

The MCP tool provides: persistent thought numbering, revision markers (`isRevision`, `revisesThought`), branching (`branchFromThought`, `branchId`), and dynamic total adjustment (`needsMoreThoughts`). Use it when you need an auditable reasoning trail. Apply the methodology below without the tool when lightweight reasoning suffices.

## When to Apply

- Complex problem decomposition
- Adaptive planning with revision capability
- Analysis needing course correction
- Problems with unclear/emerging scope
- Multi-step solutions requiring context maintenance
- Hypothesis-driven investigation/debugging

## Core Process

### 1. Start with Loose Estimate
```
Thought 1/5: [Initial analysis]
```
Adjust dynamically as understanding evolves.

### 2. Structure Each Thought
- Build on previous context explicitly
- Address one aspect per thought
- State assumptions, uncertainties, realizations
- Signal what next thought should address

### 3. Apply Dynamic Adjustment
- **Expand**: More complexity discovered → increase total
- **Contract**: Simpler than expected → decrease total
- **Revise**: New insight invalidates previous → mark revision
- **Branch**: Multiple approaches → explore alternatives

### 4. Use Revision When Needed
```
Thought 5/8 [REVISION of Thought 2]: [Corrected understanding]
- Original: [What was stated]
- Why revised: [New insight]
- Impact: [What changes]
```

### 5. Branch for Alternatives
```
Thought 4/7 [BRANCH A from Thought 2]: [Approach A]
Thought 4/7 [BRANCH B from Thought 2]: [Approach B]
```
Compare explicitly, converge with decision rationale.

### 6. Generate & Verify Hypotheses
```
Thought 6/9 [HYPOTHESIS]: [Proposed solution]
Thought 7/9 [VERIFICATION]: [Test results]
```
Iterate until hypothesis verified.

### 7. Complete Only When Ready
Mark final: `Thought N/N [FINAL]`

Complete when:
- Solution verified
- All critical aspects addressed
- Confidence achieved
- No outstanding uncertainties

## Application Modes

**MCP-tracked**: Use `mcp__sequential-thinking__sequentialthinking` tool for complex problems where you need revision history, branching, or an auditable trail. Each thought is a tool call with explicit numbering.

**Explicit**: Use visible thought markers in your response when complexity warrants visible reasoning or user requests breakdown. No tool calls needed.

**Implicit**: Apply methodology internally for routine problem-solving where thinking aids accuracy without cluttering response.

## Scripts (Optional)

Optional scripts for deterministic validation/tracking:
- `scripts/process-thought.js` - Validate & track thoughts with history
- `scripts/format-thought.js` - Format for display (box/markdown/simple)

See README.md for usage examples. Use when validation/persistence needed; otherwise apply methodology directly.

## References

Load when deeper understanding needed:
- `references/core-patterns.md` - Revision & branching patterns
- `references/examples-api.md` - API design example
- `references/examples-debug.md` - Debugging example
- `references/examples-architecture.md` - Architecture decision example
- `references/advanced-techniques.md` - Spiral refinement, hypothesis testing, convergence
- `references/advanced-strategies.md` - Uncertainty, revision cascades, meta-thinking

## Anti-Patterns

| NEVER | WHY | Fix |
|-------|-----|-----|
| Set `nextThoughtNeeded: false` before verifying the solution | Premature completion skips verification — answers may be wrong | Always include at least one VERIFICATION thought before final |
| Use MCP-tracked mode for trivial problems | Tool calls add overhead for problems solvable in one mental step | Use implicit mode for routine reasoning, MCP for complex auditable trails |
| Ignore revision when new evidence contradicts earlier thoughts | Linear-only thinking compounds early errors through all subsequent steps | Mark `isRevision: true` and explicitly state what changed and why |
| Start with too many thoughts estimated | Over-estimating creates pressure to fill — padding degrades quality | Start with 3-5, expand dynamically as complexity emerges |

## When NOT to Use

- Simple single-step questions with obvious answers (just answer directly)
- Problems requiring external research before reasoning (use `research` or `deep-research` first)
- Code debugging where the error message is self-explanatory (use `debug`)

## Conflicts

- **problem-solving**: Use problem-solving for systematic stuck-ness techniques; sequential-thinking for structured reasoning chains
- **debug**: Use debug for error-driven investigation; sequential-thinking for hypothesis-driven analysis

## Related Skills

- `problem-solving` — systematic techniques that pair naturally with sequential thinking for complex stuck-ness
- `deep-research` — multi-phase research that benefits from sequential breakdown
- `pdd` — prompt-driven development uses iterative sequential refinement throughout
- `debug-like-expert` — debugging root-cause tracing is a sequential hypothesis-testing process
- `root-cause-tracing` — structured causal tracing that mirrors sequential thought revision
