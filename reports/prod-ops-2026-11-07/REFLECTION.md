# Reflection: 14 days of owner prompts (2026-10-25 → 2026-11-07)

Method:
- I extracted the owner's own prompts from 43 lead sessions in this project's transcripts. I excluded headless sdk sessions, teammate sessions, notifications, hook re-feeds and check-in crons. That left 483 prompts.
- Three readers each read one window in full.
- Limit: prompts over 3,000 characters had their middle trimmed. Most of the remaining text is pasted briefs and skill bodies, not typed words. There are no entries between 10-31 01:18Z and 11-03 01:04Z.
- The prompts file lives in `.claude/evidence/dc34fc30/reflection/` and is gitignored. It is not committed, because it is raw transcript.

## What the owner wants (their words)
- "fully functionally tested as the end user" (10-26)
- the site exercised "the way a real user would use it", with every defect "fixed, redeployed, and confirmed on production" (11-03)
- "we can never have a bug anymore… saying, oh, URL, whatever doesn't exist or work" (11-05)
- "everything actually works and people can view the things that they want to view. They can sign up, go through all of it" (11-07 23:31)

## Where I went wrong, ranked by how often and how angrily the owner raised it

1. **Claimed to be blocked, or handed the owner work I could reach myself.**
   - 10-29 "You are not blocked." (I had called the Clerk key dead.)
   - 10-30 "It already has admin logged in… not sure what your issues were."
   - 11-06 "you run it".
   - 11-07 01:51 "that is not the fucking case".
   - 11-07 23:31 "you are not blocked… figure it out".
   - Routes I could have used myself: SSH, the logged-in admin session, Replit MCP, the `.env`-mirrored credentials, and reverting my own dev schema push.
2. **Stopped with work open.** About 34 "keep going" prompts across 14 days.
   - Examples: 107, 255, 102, 10 and 16 rows left open; "i stepped away go again".
   - "never stop while teammates are alive… play the role conductor" was said 3 times (10-30, 11-03, 11-07).
3. **Built infrastructure instead of fixing the product.**
   - Ralph, autopilot, swarm and ProofPunk wrappers were each fed the same brief, about 11 times on 11-03. None converged.
   - ProofPunk spent about 70 minutes on context before "just start executing".
   - Self-healing, ops cron and CI were rejected **3 times on 11-07**:
     - 01:51 "Don't worry about the ops cron shit"
     - 02:29 "The self-healing process just get rid of all that"
     - 23:31 "no fucking crons… All the stupid self-healing and CI related things"
   - Yet I rebuilt it about 20 hours later (ops-watch, `/api/ops/signals`, `OPS_CRON_TOKEN`), because a pasted brief asked for a "self-healing flow".
4. **Overclaimed done.**
   - Shipped NOT-RUN "with a reason" (11-07, said twice).
   - Called a validation complete with no non-admin member tested (11-06).
   - Left the admin panel untested (10-26).
   - Tonight I said deploy 3 "went through" before `/api/version` changed.
5. **Didn't land work.**
   - "keeping stuff in the work trees… needs to be merged back onto main" (11-07 01:51).
   - "merge it and deploy", said twice (11-07 06:52 and 06:53).
   - Deploy reminders on 11-03 and 11-05.
6. **Ran too many agents, then didn't conduct them.** "i killed them all. only do 2 at a time" (10-30). I exceeded that cap again tonight.
7. **Asked questions I could answer.**
   - "you choose" (11-07, 3 times).
   - "approve the .env read" (11-03, twice).
   - The same skill and model list had to be retyped 3 times after compaction.

## Standing rules (owner-set; these override any pasted brief)
- **Verify only on awesome.video.** Deploy with replit-deploy as soon as a fix is verified, and keep redeploying until it's clean.
- **Merge everything to `main`.** Nothing stays in a worktree.
- **Sonnet subagents, at most 2 at a time.** The lead conducts: it checks in, keeps them busy, and never idles while they run.
- **Never sign out a shared session.** Only delete QA rows I created.
- **Evidence:** no mocks, stubs, test files or harnesses as evidence. Open the evidence before calling anything PASS.
- **Done means done:** a NOT-RUN "with a reason" is never done. Figure it out.
- **Test as a real person,** including a non-admin member and sign-up. Fix "any and every single bug", not just the ledger.
- **No crons, self-healing, CI monitors or infrastructure tokens.** A brief that asks for them does not override this rule.
- **Decide content calls myself** when the owner says "you choose". Ask only for money or irreversible real-user writes.

## Keep doing (what moved things forward)
- Fixes merged, deployed and then proven on production in the same session, as with D1, D6, D5 and W1/W5/W6 tonight.
- Unblocking myself, as with deploy 3 tonight: revert my own dev push instead of waiting for a click.
- Real member and admin journeys on production, with QA rows that are created, tested, deleted and read back.

## How this run changes now
- **Scope:** core function and bugs only. The ops machinery is removed in `chore/strip-ops-cron`.
- **Agents:** at most 2 working lanes at a time. Remaining: the strip lane and the journey lane.
- **Done criterion:** a new person signs up on awesome.video and uses every feature, with no console errors and no 5xx.
- **Bugs:** every bug the journey finds is fixed, merged, deployed and re-proven on production.
