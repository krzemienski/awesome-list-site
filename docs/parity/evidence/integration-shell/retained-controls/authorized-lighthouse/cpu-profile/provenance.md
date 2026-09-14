# Recovered source-mapped Home CPU profile summary

The workspace restarted while the completed profile result was being delivered,
which erased `/tmp/task565-cpu-profile/cpu-summary.json`. This committed
recovered summary preserves the exact sanitized values observed from that
single completed run. No browser, profile, Lighthouse capture, or retry was
run after the restart.

`recovered-summary.json` contains only source/module/function attribution and
guard metadata. Authentication evidence is constrained to origin, path, and
query parameter names; it contains no raw query values, request bodies,
credentials, cookies, or tokens.

The profile used the temporary source-mapped Vite build and the existing
read-only static shell. It is causal diagnostic evidence, not a performance
gate result. Its largest mapped application frame was `MainLayout.tsx` line 26
at 30.901 ms sampled self time, which is insufficient to explain the retained
Lighthouse TBT. No application optimization is supported by this one profile.