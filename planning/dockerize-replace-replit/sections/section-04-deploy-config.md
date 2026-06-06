# Section 04 — Phase 4: Production Deploy Config (Railway + DigitalOcean)

## Background

The repo already ships two deploy configs, both partly wrong for a long-lived Express + SSR container:

- `railway.json`: `build.builder = "DOCKERFILE"` (correct), `deploy.healthcheckPath = "/health"`, `restartPolicyType = "ON_FAILURE"`, `restartPolicyMaxRetries = 10`, `startCommand = "node dist/index.js"`.
- `vercel.json`: `@vercel/node` serverless function wrapping `dist/index.js` with `maxDuration: 10`.

The app serves its health endpoint at **`/api/health`** (`server/routes.ts:3769`), **not** `/health`. So `railway.json`'s healthcheck path is a **MISMATCH** — Railway would poll a route that 404s and mark every deploy unhealthy. `vercel.json` also routes a dead `/health`.

Decision **D2** = config-only, **NO LIVE DEPLOY** this phase. Decision **D3** = author BOTH Railway + DigitalOcean App Platform shapes, then **delete `vercel.json`** (a 10s-maxDuration serverless function is a dead end for a persistent Express + SSR server that holds DB connections and serves SSR'd HTML).

Research scoring: Railway **8.9** (config already present, runtime-env secret injection, ~$10-20/mo) > DO App Platform **7.9** (managed Postgres with automated backups + point-in-time recovery). Both are authored so the operator can pick at deploy time.

## Requirements

- `railway.json` `deploy.healthcheckPath` fixed to `/api/health`; `build.builder` stays `DOCKERFILE`.
- `.do/app.yaml` authored and schema-valid (App Platform spec).
- `vercel.json` deleted.
- No secret VALUES committed anywhere; all secrets externalized to platform runtime config.
- Monitoring (health endpoints, log streams, restart policy) documented in `docs/DEPLOYMENT.md`.

## Dependencies

- **Requires section-03 PASS** — section-03 proves `/api/health` responds and the container the configs point at actually boots and serves. Pointing deploy configs at an unverified app is wasted work.
- **Blocks: nothing.** Terminal phase alongside section-05; the two can run in parallel.

## Implementation steps

1. **Railway** — edit `railway.json`: set `deploy.healthcheckPath` to `"/api/health"`. Confirm `build.builder` is still `"DOCKERFILE"` and `build.dockerfilePath` is `"Dockerfile"`. Leave `restartPolicyType`/`restartPolicyMaxRetries`/`startCommand` untouched. Document in `docs/DEPLOYMENT.md`: Railway's managed Postgres add-on auto-injects `DATABASE_URL` at runtime; the remaining secrets (`SESSION_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `GITHUB_TOKEN`, `ANTHROPIC_API_KEY`) are set as **Railway variables** — runtime env, never baked into the image.

2. **DigitalOcean** — author `.do/app.yaml` (App Platform spec). One `service` built from the `Dockerfile` (`dockerfile_path: Dockerfile`); `http_port: 5000`; `health_check.http_path: /api/health`. All secrets declared as env entries with `type: SECRET` (`SESSION_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `GITHUB_TOKEN`, `ANTHROPIC_API_KEY`); `NODE_ENV: production` as a plain RUN_AND_BUILD_TIME var. Provision Postgres via a `databases:` block (DO Managed Postgres) which injects `DATABASE_URL`, OR document an external `DATABASE_URL` set as a SECRET. Document DO Managed Postgres **automated daily backups + point-in-time recovery (PITR)** as the differentiator vs Railway.

3. **Delete `vercel.json`.** Persistent Express + SSR container does not fit a 10s serverless function; keeping it invites a broken deploy target.

4. **Monitoring** — in `docs/DEPLOYMENT.md`, document: health-check endpoint is `/api/health` on both platforms; logs go to each platform's log stream (Railway deploy/runtime logs, DO App Platform runtime logs / `doctl apps logs`); restart policy is already encoded in `railway.json` (`ON_FAILURE`, max 10 retries) and DO App Platform auto-restarts unhealthy containers by default.

5. **Secrets doc** — update `docs/DEPLOYMENT.md` with a table of every env var, marking which are SECRET (`SESSION_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `GITHUB_TOKEN`, `ANTHROPIC_API_KEY`, `DATABASE_URL`) vs non-secret (`NODE_ENV`, `PORT`), and state explicitly that **none are baked into the image** — all injected at runtime by the platform.

## Validation gate VG-4 (blocking)

**Prerequisites:** section-03 PASS.

**Capture** (run from repo root; write evidence under `e2e-evidence/phase4/`):

```bash
mkdir -p e2e-evidence/phase4 && cd e2e-evidence/phase4

# railway.json shape
jq -e '.deploy.healthcheckPath=="/api/health" and .build.builder=="DOCKERFILE"' \
  ../../railway.json | tee railway-check.txt

# DO spec validity: prefer doctl, fall back to YAML parse
if command -v doctl >/dev/null 2>&1; then
  doctl apps spec validate ../../.do/app.yaml 2>&1 | tee do-spec-check.txt
else
  python3 -c "import yaml,sys; yaml.safe_load(open('../../.do/app.yaml')); print('yaml-ok')" \
    2>&1 | tee do-spec-check.txt
fi

# vercel.json must be gone
ls ../../vercel.json 2>&1 | tee vercel-removed.txt

# no non-/api "/health" route refs remain (docs + evidence excluded)
rg '"/health"' ../.. --glob '!*.md' --glob '!e2e-evidence/**' \
  2>&1 | tee health-path-refs.txt || echo "(no matches)" | tee health-path-refs.txt

# no committed secret VALUES (scan tracked files for assigned secret-looking values)
git -C ../.. grep -nE '(SESSION_SECRET|ADMIN_PASSWORD|GITHUB_TOKEN|ANTHROPIC_API_KEY|DATABASE_URL)\s*[:=]\s*["'\'']?[A-Za-z0-9_./+-]{12,}' \
  -- ':!*.md' ':!.do/app.yaml' ':!railway.json' \
  2>&1 | tee committed-secrets.txt || echo "(none)" | tee committed-secrets.txt
```

**Pass criteria:**
- `railway-check.txt` == `true` (jq exit 0).
- `do-spec-check.txt` shows `yaml-ok` OR doctl reports the spec valid.
- `vercel-removed.txt` contains `No such file` (deletion confirmed).
- `health-path-refs.txt` has no non-`/api` `/health` route references (the placeholder route is gone).
- `committed-secrets.txt` empty / `(none)` — no secret values in tracked files.

**Mock guard:** `doctl` may be absent on the runner. The accepted fallback is `python3 yaml.safe_load` + the documented DO field checklist (service from Dockerfile, `http_port: 5000`, `health_check.http_path: /api/health`, all secrets `type: SECRET`). Capture whichever validator **actually ran** into `do-spec-check.txt`. Do **NOT** fabricate a `doctl`-valid verdict when doctl never executed — a YAML-only PASS must say so in the evidence file.

## Acceptance criteria

- [ ] `railway.json` `deploy.healthcheckPath == "/api/health"` and `build.builder == "DOCKERFILE"`.
- [ ] `.do/app.yaml` exists, parses, declares service-from-Dockerfile, `http_port: 5000`, `health_check.http_path: /api/health`, secrets as `type: SECRET`.
- [ ] DO Managed Postgres backups + PITR documented (or external `DATABASE_URL` path documented).
- [ ] `vercel.json` deleted.
- [ ] No `/health` (non-`/api`) route references remain outside docs.
- [ ] No secret VALUES committed; secrets externalized to platform runtime + documented in `docs/DEPLOYMENT.md`.
- [ ] Monitoring (health endpoints, log streams, restart policy) documented.
- [ ] VG-4 evidence captured under `e2e-evidence/phase4/`.

## Files to create / modify / delete

- **Create:** `.do/app.yaml`
- **Modify:** `railway.json` (healthcheckPath), `docs/DEPLOYMENT.md` (secrets table + monitoring + DO/Railway provisioning notes)
- **Delete:** `vercel.json`
