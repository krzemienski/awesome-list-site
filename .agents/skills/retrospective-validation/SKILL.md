---
name: retrospective-validation
description: |
  Validate methodology effectiveness using historical data without live deployment.
  Use when: rich historical data exists (100+ instances), methodology targets observable patterns, live deployment has high friction, need statistical rigor in hours not weeks
  Covers: four-phase process (data collection, pattern definition, validation execution, confidence assessment), D*A*L confidence formula, sample validation, prevention rate calculation
  Keywords: retrospective, historical-validation, confidence-calculation, pattern-matching, error-prevention, statistical-rigor
allowed-tools: Read, Grep, Glob, Bash
---

# Retrospective Validation

**Validate methodologies with historical data, not live deployment.**

> When you have 1,000 past errors, you don't need to wait for 1,000 future errors to prove your methodology works.

---

## When to Use This Skill

Use this skill when:
- 📊 **Rich historical data**: 100+ instances (errors, test failures, performance issues)
- 🎯 **Observable patterns**: Methodology targets detectable issues
- 🔍 **Pattern matching feasible**: Clear detection heuristics, measurable false positive rate
- ⚡ **High deployment friction**: CI/CD integration costly, user studies time-consuming
- 📈 **Statistical rigor needed**: Want confidence intervals, not just hunches
- ⏰ **Time constrained**: Need validation in hours, not weeks

**Don't use when**:
- ❌ Insufficient data (<50 instances)
- ❌ Emergent effects (human behavior change, UX improvements)
- ❌ Pattern matching unreliable (>20% false positive rate)
- ❌ Low deployment friction (1-2 hour CI/CD integration)

---

## Quick Start (30 minutes)

### Step 1: Check Historical Data (5 min)

```bash
# Example: Error data for meta-cc
meta-cc query-tools --status error | jq '. | length'
# Output: 1336 errors ✅ (>100 threshold)

# Example: Test failures from CI logs
grep "FAILED" ci-logs/*.txt | wc -l
# Output: 427 failures ✅
```

**Threshold**: ≥100 instances for statistical confidence

### Step 2: Define Detection Rule (10 min)

```yaml
Tool: validate-path.sh
Prevents: "File not found" errors
Detection:
  - Error message matches: "no such file or directory"
  - OR "cannot read file"
  - OR "file does not exist"
Confidence: High (90%+) - deterministic check
```

### Step 3: Apply Rule to Historical Data (10 min)

```bash
# Count matches
grep -E "(no such file|cannot read|does not exist)" errors.log | wc -l
# Output: 163 errors (12.2% of total)

# Sample manual validation (30 errors)
# True positives: 28/30 (93.3%)
# Adjusted: 163 * 0.933 = 152 preventable ✅
```

### Step 4: Calculate Confidence (5 min)

```
Confidence = Data Quality × Accuracy × Logical Correctness
           = 0.85 × 0.933 × 1.0
           = 0.79 (High confidence)
```

**Result**: Tool would have prevented 152 errors with 79% confidence.

---

## Four-Phase Process

### Phase 1: Data Collection

**1. Identify Data Sources**

For Claude Code / meta-cc:
```bash
# Error history
meta-cc query-tools --status error

# User pain points
meta-cc query-user-messages --pattern "error|fail|broken"

# Error context
meta-cc query-context --error-signature "..."
```

For other projects:
- Git history (commits, diffs, blame)
- CI/CD logs (test failures, build errors)
- Application logs (runtime errors)
- Issue trackers (bug reports)

**2. Quantify Baseline**

Metrics needed:
- **Volume**: Total instances (e.g., 1,336 errors)
- **Rate**: Frequency (e.g., 5.78% error rate)
- **Distribution**: Category breakdown (e.g., file-not-found: 12.2%)
- **Impact**: Cost (e.g., MTTD: 15 min, MTTR: 30 min)

### Phase 2: Pattern Definition

**1. Create Detection Rules**

For each tool/methodology:
```yaml
what_it_prevents: Error type or failure mode
detection_rule: Pattern matching heuristic
confidence: Estimated accuracy (high/medium/low)
```

**2. Define Success Criteria**

```yaml
prevention: Message matches AND tool would catch it
speedup: Tool faster than manual debugging
reliability: No false positives/negatives in sample
```

### Phase 3: Validation Execution

**1. Apply Rules to Historical Data**

```bash
# Pseudo-code
for instance in historical_data:
  category = classify(instance)
  tool = find_applicable_tool(category)
  if would_have_prevented(tool, instance):
    count_prevented++

prevention_rate = count_prevented / total * 100
```

**2. Sample Manual Validation**

```
Sample size: 30 instances (95% confidence)
For each: "Would tool have prevented this?"
Calculate: True positive rate, False positive rate
Adjust: prevention_claim * true_positive_rate
```

**Example** (Bootstrap-003):
```
Sample: 30/317 claimed prevented
True positives: 28 (93.3%)
Adjusted: 317 * 0.933 = 296 errors
Confidence: High (93%+)
```

**3. Measure Performance**

```bash
# Tool time
time tool.sh < test_input
# Output: 0.05s

# Manual time (estimate from historical data)
# Average debug time: 15 min = 900s

# Speedup: 900 / 0.05 = 18,000x
```

### Phase 4: Confidence Assessment

**Confidence Formula**:

```
Confidence = D × A × L

Where:
D = Data Quality (0.5-1.0)
A = Accuracy (True Positive Rate, 0.5-1.0)
L = Logical Correctness (0.5-1.0)
```

**Data Quality** (D):
- 1.0: Complete, accurate, representative
- 0.8-0.9: Minor gaps or biases
- 0.6-0.7: Significant gaps
- <0.6: Unreliable data

**Accuracy** (A):
- 1.0: 100% true positive rate (verified)
- 0.8-0.95: High (sample validation 80-95%)
- 0.6-0.8: Medium (60-80%)
- <0.6: Low (unreliable pattern matching)

**Logical Correctness** (L):
- 1.0: Deterministic (tool directly addresses root cause)
- 0.8-0.9: High correlation (strong evidence)
- 0.6-0.7: Moderate correlation
- <0.6: Weak or speculative

**Example** (Bootstrap-003):
```
D = 0.85 (Complete error logs, minor gaps in context)
A = 0.933 (93.3% true positive rate from sample)
L = 1.0 (File validation is deterministic)

Confidence = 0.85 × 0.933 × 1.0 = 0.79 (High)
```

**Interpretation**:
- ≥0.75: High confidence (publishable)
- 0.60-0.74: Medium confidence (needs caveats)
- 0.45-0.59: Low confidence (suggestive, not conclusive)
- <0.45: Insufficient confidence (need prospective validation)

---

## Comparison: Retrospective vs Prospective

| Aspect | Retrospective | Prospective |
|--------|--------------|-------------|
| **Time** | Hours-days | Weeks-months |
| **Cost** | Low (queries) | High (deployment) |
| **Risk** | Zero | May introduce issues |
| **Confidence** | 0.60-0.95 | 0.90-1.0 |
| **Data** | Historical | New |
| **Scope** | Full history | Limited window |
| **Bias** | Hindsight | None |

**When to use each**:
- **Retrospective**: Fast validation, high data volume, observable patterns
- **Prospective**: Behavioral effects, UX, emergent properties
- **Hybrid**: Retrospective first, limited prospective for edge cases

---

## Success Criteria

Retrospective validation succeeded when:

1. **Sufficient data**: ≥100 instances analyzed
2. **High confidence**: ≥0.75 overall confidence score
3. **Sample validated**: ≥80% true positive rate
4. **Impact quantified**: Prevention % or speedup measured
5. **Time savings**: 40-60% faster than prospective validation

**Bootstrap-003 Validation**:
- ✅ Data: 1,336 errors analyzed
- ✅ Confidence: 0.79 (high)
- ✅ Sample: 93.3% true positive rate
- ✅ Impact: 23.7% error prevention
- ✅ Time: 3 hours vs 2+ weeks (prospective)

---

## When NOT to Use

- Insufficient historical data (<50 instances) -- results are anecdotal, not statistically rigorous
- Methodology targets emergent effects (human behavior change, UX improvements) that historical data cannot capture
- Pattern matching is unreliable (>20% false positive rate) -- confidence will be too low to be useful
- Deployment friction is low (1-2 hour CI/CD integration) -- just do prospective validation directly

## Anti-Patterns

| Pattern | Why It's Wrong | Do This Instead |
|---------|---------------|-----------------|
| Validating with <50 data points | Sample too small for statistical confidence; results are anecdotal, not rigorous | Require minimum 100 instances; if fewer, use prospective validation |
| Skipping sample manual validation | Automated pattern matching may have high false positive rate you never discover | Manually verify 30 random instances to calculate true positive rate |
| Claiming prevention without adjusting for accuracy | Raw count overstates impact; 93% accuracy on 317 claims = 296 actual | Always multiply prevention count by true positive rate |
| Using retrospective for behavioral/UX changes | Historical data can't capture how humans change behavior with new tools | Use prospective validation for UX, workflow changes, or team dynamics |
| Treating confidence 0.50 as "validated" | Below 0.60 is insufficient; conclusions are suggestive at best | Require >= 0.75 for publishable claims; 0.60-0.74 needs explicit caveats |

## Conflicts

- `methodology-bootstrapping`: That skill defines the overall OCA cycle; this skill provides the validation phase within that cycle
- `rapid-convergence`: That skill accelerates iteration count; this skill validates whether those iterations actually worked

## Related Skills

**Parent framework**:
- [methodology-bootstrapping](../methodology-bootstrapping/SKILL.md) - Core OCA cycle

**Complementary acceleration**:
- [rapid-convergence](../rapid-convergence/SKILL.md) - Fast iteration (uses retrospective)
- [baseline-quality-assessment](../baseline-quality-assessment/SKILL.md) - Strong iteration 0

---

## References

**Core guide**:
- [Four-Phase Process](reference/process.md) - Detailed methodology
- [Confidence Calculation](reference/confidence.md) - Statistical rigor
- [Detection Rules](reference/detection-rules.md) - Pattern matching guide

**Examples**:
- [Error Recovery Validation](examples/error-recovery-1336-errors.md) - Bootstrap-003

---

**Status**: ✅ Validated | Bootstrap-003 | 0.79 confidence | 40-60% time reduction
