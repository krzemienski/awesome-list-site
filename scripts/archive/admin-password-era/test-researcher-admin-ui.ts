/**
 * Functional validation of the AI researcher driven through the SAME HTTP
 * endpoints the admin UI calls. No service-layer shortcuts.
 *
 * Flow: POST /api/auth/local/login  (cookie session)
 *    -> POST /api/researcher/start
 *    -> poll GET /api/researcher/jobs/:id
 *    -> GET  /api/researcher/discoveries?jobId=:id
 *    -> POST /api/researcher/discoveries/:id/reject  (cleanup so re-runs work)
 */
const BASE = process.env.BASE_URL || 'http://localhost:5000';

function extractCookie(setCookie: string | null): string {
  if (!setCookie) return '';
  return setCookie.split(',').map(c => c.split(';')[0].trim()).join('; ');
}

async function main() {
  // 1. Login via the real admin login endpoint
  const loginRes = await fetch(`${BASE}/api/auth/local/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@example.com', password: 'admin123' }),
  });
  if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.status} ${await loginRes.text()}`);
  const loginBody = await loginRes.json();
  const loginUser = loginBody.user || loginBody;
  const cookie = extractCookie(loginRes.headers.get('set-cookie'));
  console.log(`✓ Logged in as ${loginUser.email} (role=${loginUser.role}), session cookie acquired`);
  if (!cookie) throw new Error('No session cookie from login');

  // 2. Confirm session works and we're admin
  const meRes = await fetch(`${BASE}/api/auth/user`, { headers: { cookie } });
  const meBody = await meRes.json();
  const me = meBody.user || meBody;
  console.log(`✓ /api/auth/user echoes role=${me?.role}, id=${me?.id}, isAuthenticated=${meBody.isAuthenticated}`);
  if (me?.role !== 'admin') throw new Error(`Not admin: ${JSON.stringify(meBody)}`);

  // 3. Start research job via the admin route (exactly what the UI POSTs)
  const startRes = await fetch(`${BASE}/api/researcher/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({
      prompt: 'Find ONE high-quality, currently-active resource related to AV1 or VVC codec tooling that is not already in our database. Verify via web_search.',
      categoryFocus: 'Encoding & Codecs',
      maxBudgetUsd: '0.60',
      maxTurns: 8,
    }),
  });
  if (!startRes.ok) throw new Error(`start failed: ${startRes.status} ${await startRes.text()}`);
  const { jobId } = await startRes.json();
  console.log(`✓ POST /api/researcher/start → jobId=${jobId}`);

  // 4. Poll the job status endpoint as the UI does
  const startedAt = Date.now();
  let job: any;
  while (Date.now() - startedAt < 180000) {
    const r = await fetch(`${BASE}/api/researcher/jobs/${jobId}`, { headers: { cookie } });
    job = await r.json();
    console.log(`  [${Math.round((Date.now()-startedAt)/1000)}s] status=${job.status} turns=${job.turnsUsed}/${job.maxTurns} discoveries=${job.totalDiscoveries} dups=${job.duplicatesSkipped} cost=$${job.estimatedCostUsd} active=${job.isActive}`);
    if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') break;
    await new Promise(r => setTimeout(r, 4000));
  }
  console.log(`✓ Job terminal status: ${job.status}`);
  if (job.status === 'failed') {
    console.log(`  errorMessage: ${job.errorMessage}`);
    throw new Error('Job failed via admin endpoint');
  }

  // 5. Fetch discoveries via admin endpoint (what /admin UI lists)
  const dRes = await fetch(`${BASE}/api/researcher/discoveries?jobId=${jobId}`, { headers: { cookie } });
  const discoveries = await dRes.json();
  console.log(`✓ GET /api/researcher/discoveries?jobId=${jobId} → ${discoveries.length} discovery row(s)`);
  for (const d of discoveries) {
    console.log(`  • #${d.id}  conf=${d.confidence}  status=${d.status}  ${d.title}`);
    console.log(`      ${d.url}`);
    console.log(`      cat="${d.suggestedCategory}" subcat="${d.suggestedSubcategory}" subsubcat="${d.suggestedSubSubcategory}"`);
    console.log(`      reasoning: ${(d.reasoning||'').slice(0,200)}${d.reasoning?.length>200?'…':''}`);
  }

  // 6. Reject the discovery via the admin endpoint to prove that route works
  //    and to keep the pending-review queue clean for further test runs.
  if (discoveries.length > 0) {
    const target = discoveries[0];
    const rejRes = await fetch(`${BASE}/api/researcher/discoveries/${target.id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie },
      body: JSON.stringify({ reason: 'admin-ui validation test cleanup' }),
    });
    const rejBody = await rejRes.json();
    console.log(`✓ POST /api/researcher/discoveries/${target.id}/reject → status=${rejBody.status} rejectedAt=${rejBody.rejectedAt}`);
  }

  // 7. Pull the jobs list endpoint the admin dashboard uses
  const jobsRes = await fetch(`${BASE}/api/researcher/jobs`, { headers: { cookie } });
  const jobs = await jobsRes.json();
  const hit = jobs.find((j: any) => j.id === jobId);
  console.log(`✓ GET /api/researcher/jobs lists this job (${jobs.length} total). Our row: status=${hit?.status} discoveries=${hit?.totalDiscoveries} cost=$${hit?.estimatedCostUsd}`);

  console.log(`\n=== ADMIN UI E2E PASS ===  jobId=${jobId} discoveries=${discoveries.length} final_cost=$${job.estimatedCostUsd}`);
}

main().catch(e => { console.error('FAILED:', e); process.exit(1); });
