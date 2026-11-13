1. **Lead stays present with a recurring check.** Principle: an orchestrator that launches background workers must stay present. It arms a recurring check (a monitor or cron) that inspects each worker's real state, corrects drift and advances the pipeline. Idle notices from workers are not supervision.
   - Evidence: turn 36, the owner: "always find or put yourself in a monitor or a loop… don't just sit around like this ever… I've already said it to you numerous times". The LEAD CHECK-IN cron that followed is the fix.
   - Routing: swarm/SKILL.md (plugin cache 0.9.94). Add a "lead stays present" section: arm a cron or Monitor after spawning, check each worker with ListAgents plus git status and log, and delete the cron when no agents remain.

2. **A model-policy change covers live agents too.** Principle: a standing owner rule on delegation ("all agents sonnet") applies to the whole spawn lifecycle, including resumes and agents already running, from the moment the owner states it.
   - Evidence: the owner said "all of your agents should be sonnet" twice. Running Opus fixers were allowed to finish, which the trail reviewer flagged, and the last Opus agent was later stopped.
   - Routing: swarm/SKILL.md. On a model-policy change, list live agents and stop or respawn any off-policy ones. Pass `model` on every spawn and resume.

3. **Gate the merged tree, and read the real exit code.** Principle: type-check main plus the PR, and read the tool's own exit code. Piping into `tail` hides it, and a per-PR check proves nothing about the combined tree.
   - Evidence: the #61 merge broke tsc (scrollLabel on the shared Table). The command `tsc | tail; echo $?` hid the failure. Fixed in 6d4c6049.
   - Routing: swarm/SKILL.md, review gate: a merge-tree gate in a scratch worktree, checking the exit code directly.

4. **No merge before an independent review.** Principle: an independent review must pass before the lead merges. A pending or skipped review is not a pass, and every merge records who reviewed it.
   - Evidence: #66 was merged outside the session before its review, and the owner asked "did you actually merge changes".
   - Routing: swarm/SKILL.md. Partly applied already. Also cover merges made by other sessions.

5. **Confirm the clone is current before editing skill or config files.** Principle: a stale checkout holds older untracked copies, and editing those reverts newer content. Before committing, check `git diff --stat` for unexpected deletions.
   - Evidence: the first commit of reflect PR #79 edited stale copies at e12a4e67, which would have reverted #47. A -69-line diff exposed it.
   - Routing: reflect/SKILL.md. Before applying edits, verify the target is the tracked, current version. Use diff direction and size as a smoke check.

6. **The lead owns shared TTL credentials.** Principle: the lead mints a shared credential with a TTL once and notes its expiry. Workers report BLOCKED instead of logging in or signing out. Cookie-jar parsing has traps, such as the `#HttpOnly_` prefix.
   - Evidence: the cookie expired at 21:18Z and 3 auditors were BLOCKED, correctly. The first re-mint missed `av_admin_session` because of the `#HttpOnly_` prefix.
   - Routing: project verify/SKILL.md. Already added in #79. Also add a pre-spawn check that enough TTL remains, and scheduled re-mints.

7. **A deploy is proven only by the live endpoint.** Principle: "build ok", "synced" or "worker says live" is not deploy evidence. Proof is the live version endpoint serving the target SHA, plus readiness 200. An agent's claim that a publish is stuck is a claim, not a fact.
   - Evidence: the lead relayed Replit Agent's "stuck publish" claim, and production went live a minute later.
   - Routing: replit-deploy/SKILL.md. Poll /api/version before reporting a stall. Check for a pending schema change before calling publish_app (#78).

8. **Check on-screen claims against their source.** Principle: a "clean" or "by design" verdict needs a source check. A fix is verified only where users get it. Warning text and numbers on screen must be checked against the data source.
   - Evidence: AI-29, a warning claim that was false because some costs had a null basis (estimated).
   - Routing: full-ui-experience-audit/SKILL.md. Cross-check static copy and warning claims against the code path that computes them.

9. **Plan for workers that cannot write files.** Principle: subagents often cannot write report files, so the lead saves each final message as the findings file. Say this in the brief.
   - Evidence: "Subagents cannot Write report files."
   - Routing: swarm/SKILL.md, brief template.

10. **Declare structural isolation in the brief.** Principle: parallel workers need isolation spelled out in the brief: one owner per file, one branch per worker, separate DB clones and ports. A cross-scope fix goes through a message to the file's owner.
    - Evidence: FIXER-RULES.md. The AuditTab.tsx request on AO-17.
    - Routing: swarm/SKILL.md, with an explicit cross-scope edit protocol.

11. **Keep a roster so a quota kill is a resume.** Principle: a quota failure kills every in-flight agent at once. Record each agent's task, worktree, branch and PR before it happens, so recovery is a resume rather than a rediscovery.
    - Evidence: the Opus 429 at 17:44Z killed 11 agents.
    - Routing: campaign-state/SKILL.md. Keep an in-flight agent table and update it at every spawn.

12. **Write the decision log live.** Principle: write the log as decisions happen. Rebuilding it afterwards loses fidelity.
    - Evidence: the first 35 rows were reconstructed, and the owner had to invoke /show-me-your-work by hand.
    - Routing: show-me-your-work/SKILL.md. Trigger at the start of autonomous multi-agent runs, and add a row per merge or deploy.

13. **Large fan-outs hit pane limits.** Principle: terminal multiplexer limits cap named teammates. Use unnamed agents plus a roster for large fan-outs.
    - Evidence: "no space for a new pane".
    - Routing: swarm/SKILL.md, a fallback note.

14. **Encode the loop's stop condition.** Principle: if the owner keeps repeating "keep going", the loop has no durable stop condition. Encode the end condition and continue automatically.
    - Evidence: "keep going until all phases are done" was sent about 8 times.
    - Routing: tune description of full-ui-experience-audit/SKILL.md. Loop control: start the next cycle immediately while defects remain above the threshold.
