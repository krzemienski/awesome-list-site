<overview>
Scan validation state across all phases and compile a project-wide status report.
</overview>

<steps>
**Step 1: Gather evidence.**
```bash
for dir in .planning/phases/*/; do
  phase=$(basename "$dir")
  if ls "$dir"*-VALIDATION.md 1>/dev/null 2>&1; then
    echo "$phase: VALIDATED"
  elif ls "$dir"*-SUMMARY.md 1>/dev/null 2>&1; then
    echo "$phase: COMPLETED (not validated)"
  else
    echo "$phase: IN PROGRESS"
  fi
done
find .planning/phases -name "evidence" -type d -exec sh -c 'echo "  Evidence: $(ls "$1" | wc -l) files in $1"' _ {} \;
```

**Step 2: Compile report.** Project-wide status: phase statuses, evidence chain, regression status, outstanding failures.

**Step 3: Present with next steps.** All validated → "Ready to ship." | In progress → "Phase {N} has {X} gates remaining." | Failures → "Gate VG-{N} in Phase {X} is FAILING. Evidence: {path}"
</steps>

<done_when>
- All phases scanned
- Evidence counted and referenced
- Failures highlighted with paths
- Next steps provided
</done_when>
