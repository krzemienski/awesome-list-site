# Admin researcher

An admin launches the AI researcher from the admin panel, watches the run, then reviews its discoveries (approve or reject). Approved discoveries become public resources. The run uses the env configuration (router endpoint, `ANTHROPIC_MODEL` orchestrator, tier-variable scouts) unless an override is typed and labelled.

## Sub-features

- AR-SIGNIN: admin access via the Clerk test account; `/admin` guard states.
- AR-CONFIG: the resolved configuration shown before launch (endpoint host, credential source, orchestrator and scout model); overrides marked.
- AR-LAUNCH: launch with a brief (auto or custom), focus and limits; confirm dialog.
- AR-LIVE: live progress (phases, scouts, events), turns and cost.
- AR-REVIEW: approve/reject discoveries; approved ones appear on the public site.
- AR-GUARDS: a plain-http override is refused without confirmation; missing env config fails before launch; cancel records real usage.

## How to get to it (user POV)

- `/admin/researcher` (or `/admin#researcher`, `/admin?tab=researcher`), or click `tab-researcher` on `/admin`.
- Signed out, any of those redirect to `/sign-in?redirect_url=…` and return to the tab after sign-in.

## Driving it with chrome-devtools MCP

Preconditions: admin context per `../SKILL.md` Admin sign-in; a throwaway clone; the shell has `ANTHROPIC_BASE_URL`, `ANTHROPIC_AUTH_TOKEN` and tier vars; the server was launched with `ANTHROPIC_MODEL`. A launch spends real tokens: use a discovery target of 2–3 and a small budget.

- **Open.** Navigate to `/admin/researcher` → `content-research` renders with the guided launcher `research-launch-guide`; `research-review-panel` exists.
- **Config before launch.** Read `research-launch-config` (the "about to run on" summary, fed by `GET /api/researcher/config`, re-queried as the advanced fields change). Read the same route in the page with `evaluate_script` `async()=>(await (await fetch('/api/researcher/config')).json())` → host `router.hack.ski`, credential "router via ANTHROPIC_BASE_URL", orchestrator `cc/claude-opus-5`, scout id from the tier variable.
- **Launch.** `button-generate-brief` (optional), set `input-target-discoveries`, click `button-launch-researcher-canonical` → `button-confirm-launch` → `POST /api/researcher/start` 2xx with a job id.
- **Watch.** Poll `GET /api/researcher/jobs/<id>` by reading the UI (phase, turns, cost, discoveries) until a terminal status. The job detail shows `research-job-config` (the config the run launched with) and `text-research-cost-basis`. `psql`: `select status, turns_used, estimated_cost_usd, cost_basis, resolved_config->>'model' from research_jobs where id=<id>` matches the UI; `select id,title,url,status from research_discoveries where job_id=<id>`.
- **Review.** In `research-review-panel`, click "Approve discovery: <title>" for one row and "Reject discovery: <title>" for another → row status changes; `psql` confirms; the approved resource opens at `/resource/<id>` and appears in its category after a no-cache reload.
- **Guards.** Open `button-toggle-advanced-researcher`, type `http://home.hack.ski:20128/v1` into `input-research-baseurl` → launch is refused until explicitly confirmed. Restart the server without one tier variable → launch fails before any job row is created, with a message naming the variable.

## Gotchas

- A second launch while a run is active must be refused: `POST /api/researcher/start` → 409 `RESEARCH_JOB_ACTIVE`, and no new `research_jobs` row.
- The clone needs migration 0058 (`resolved_config`, `cost_basis`); see `../SKILL.md` Launch.
- The main "Run job" button was dead while the inner tab was Review or History (inventory finding); test from each inner tab.
- Cancelled runs emit no SDK result message; turns and tokens must still be non-zero in the DB, and `cost_basis` reads `lower_bound`.
