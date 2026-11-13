# awesome.video: one-page owner brief (draft)

**What the site does for people.** Visitors browse nine categories, search, open a resource page and click through to it. All 4,074 public resources are in the sitemap, so search engines can find them. You grow the catalog through the approvals queue, editing, the AI Researcher and the daily dead-link scan. All of it works today. (§1)

**Three things that could hurt most**
1. Backups are manual, and only one exists. (B1)
2. Daily jobs run only while the site is awake. The link scan has skipped days, once for six. (B2)
3. Nobody can search the production logs; an agent sees about two hours. (B3)

**What we propose.** One read-only checker that tests the site after every publish and every six hours. Scheduled backups, plus one before each publish. A searchable log service. An outside timer that wakes the jobs. A repair loop that opens issues; nothing merges or deploys without you. (§5–7)

**The five decisions that matter most** (§10)
- **1. Allow the checker.** An exception to your no-validation-scripts rule; the rest depends on it.
- **2. Daily backups, kept 14 days, plus one before each publish.** Closes the biggest data-loss risk.
- **3. Axiom for logs.** You create the account and tokens.- **11. Wake jobs from cron-job.org (free).** Fixes the missed scans and digests.
- **15. Clear the waiting submissions yourself.** 23 are waiting, the oldest for 73 days, plus 27 duplicate pairs. The tables are in `lanes/owner-queues.md`.
