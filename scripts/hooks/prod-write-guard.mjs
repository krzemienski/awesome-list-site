#!/usr/bin/env node
// PreToolUse(Bash) guard for production writes. Reads the hook JSON on stdin.
// Prints a permissionDecision ("ask" or "deny"); prints nothing to pass. Fails open on any error.
const ADMIN = /\/api\/admin\//;
const ROUTINE = /^\/api\/admin\/(?:qa-rows(?:[/?]|$)|database-backups\/?(?:\?|$))/;
const HAS_AUTH = /(?:^|\s)(?:-b|--cookie|-u|--user)[\s=]|(?:^|\s)(?:-H|--header)[\s=]*["']?(?:@|\$)|(?:cookie|authorization)\s*:/i;
// A local target is decided by the URL host only, so a query string or path that says "localhost" does not count.
const LOCAL_URL = /^(?:\w+:\/\/)?(?:[^@/]*@)?(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(?::\d+)?(?:[/?]|$)/;
const LOCAL_SOCKET_URL = /^\w+:\/\/\/[^?]*\?(?:[^#]*&)?host=\/tmp(?:[/&]|$)/;
const ADMIN_TARGET = /((?:\w+:\/\/)?[^\s'"/]*)\/api\/admin\//g;
const HEREDOC = /<<-?\s*(['"]?)(\w+)\1[^\n]*\n[\s\S]*?\n\s*\2\s*(?:\n|$)/g;
const BOUNDARY = String.raw`(?:^|[;&|(\n\`{]|\$\(|\b(?:do|then|else)\s)\s*(?:(?:sudo|env|time|command|\w+=\S*)\s+)*`;
const WRITE_METHOD = /(?:^|\s)-[A-Za-z]*X\s*=?\s*['"]?(POST|PUT|PATCH|DELETE)\b|--request[\s=]+['"]?(POST|PUT|PATCH|DELETE)\b/i;
const ANY_METHOD = /(?:^|\s)-[A-Za-z]*X\s*=?\s*['"]?([A-Z]+)|--request[\s=]+['"]?([A-Z]+)/i;
const DATA_FLAG = /(?:^|\s)(?:-d|--data(?:-raw|-binary|-urlencode|-ascii)?|--json|-F|--form|-T|--upload-file)(?:[\s=]|$)/;
const REMOTE_DANGER = /db:push|drizzle-kit|\bDROP\s|\bTRUNCATE\b|\bDELETE\s+FROM\b|\brm\s+-[A-Za-z]*(?:rf|fr)\b/i;

// Text of one shell segment starting at `from`, ending at an unquoted ; & | ) or newline.
function segment(cmd, from) {
  let q = null;
  for (let i = from; i < cmd.length; i++) {
    const c = cmd[i];
    if (q) { if (c === '\\' && q === '"') i++; else if (c === q) q = null; continue; }
    if (c === '\\') { i++; continue; }
    if (c === "'" || c === '"') q = c;
    else if (';&|)\n'.includes(c)) return cmd.slice(from, i);
  }
  return cmd.slice(from);
}

const segmentsAfter = (cmd, word) => {
  const out = [];
  const re = new RegExp(BOUNDARY + '(' + word + ')\\b', 'g');
  for (let m; (m = re.exec(cmd)); ) out.push(segment(cmd, m.index + m[0].length - m[1].length));
  return out;
};

// Substitute NAME=value assignments seen earlier in the command so $B/api/... resolves.
function expandVars(seg, cmd) {
  const vars = {};
  for (const m of cmd.matchAll(/(?:^|[;&\s])(\w+)=(["']?)([^\s"';&|]+)\2/g)) vars[m[1]] = m[3];
  return seg.replace(/\$\{?(\w+)\}?/g, (all, n) => vars[n] ?? all);
}

const mask = (cmd) => cmd.replace(/'[^']*'|"(?:\\.|[^"\\])*"/g, (s) => ' '.repeat(s.length));
const decide = (permissionDecision, permissionDecisionReason) =>
  console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision, permissionDecisionReason } }));

function check(raw) {
  const joined = raw.replace(/\\\n/g, ' ');
  const cmd = joined.replace(HEREDOC, '\n');

  // 3. ssh to the Replit workspace running a schema or destructive command, also when the script is a heredoc body.
  const sshSegs = segmentsAfter(cmd, 'ssh').filter((s) => /\bawesome-replit\b/.test(s));
  const sshRaw = segmentsAfter(joined, 'ssh').filter((s) => /\bawesome-replit\b/.test(s));
  const heredocText = sshRaw.length ? (joined.match(HEREDOC) || []).join('\n') : '';
  for (const s of [...sshSegs, heredocText]) {
    const hit = s.match(REMOTE_DANGER);
    if (hit) return ['ask', `Remote command on the production Replit workspace contains "${hit[0].trim()}". ` +
      'replit-deploy runs `npm run db:push` here only when the diff touches shared/schema.ts, and publish applies the same schema to production. ' +
      'Approve only if that is the intended deploy step; otherwise deny.'];
  }

  // 2. Local drizzle-kit push / db:push must carry an inline local DATABASE_URL.
  let rest = cmd;
  for (const s of sshSegs) rest = rest.replace(s, ' ');
  const masked = mask(rest);
  const pushRe = new RegExp(BOUNDARY + '((?:npx\\s+)?drizzle-kit\\s+push|npm\\s+run\\s+db:push)\\b', 'g');
  for (let m; (m = pushRe.exec(masked)); ) {
    const start = masked.lastIndexOf('\n', m.index) + 1;
    const prefix = rest.slice(start, m.index + m[0].length);
    const url = [...prefix.matchAll(/DATABASE_URL=(["']?)(\S+?)\1(?:\s|$)/g)].pop();
    if (!url || !(LOCAL_URL.test(url[2]) || LOCAL_SOCKET_URL.test(url[2]))) {
      return ['deny', 'drizzle-kit push / npm run db:push needs an inline throwaway local database, or it targets whatever DATABASE_URL the shell or dotenv file provides (Neon or production). ' +
        'Prefix the command: DATABASE_URL=postgresql://localhost:5432/<throwaway_db> npx drizzle-kit push --force. ' +
        'The production schema change goes through the replit-deploy skill, not from here.'];
    }
  }

  // 1. Non-GET curl against /api/admin/ on production (or a host held in a variable).
  for (const raw1 of segmentsAfter(cmd, 'curl')) {
    const seg = expandVars(raw1, cmd);
    const explicit = seg.match(ANY_METHOD);
    const method = (seg.match(WRITE_METHOD) || [])[1] || (seg.match(WRITE_METHOD) || [])[2]
      || (!explicit && !/(?:^|\s)-G\b/.test(seg) && DATA_FLAG.test(seg) ? 'POST' : null);
    if (!method || !ADMIN.test(seg)) continue;
    const hosts = [...seg.matchAll(ADMIN_TARGET)].map((m) => m[1]);
    if (hosts.length && hosts.every((h) => LOCAL_URL.test(h))) continue;
    if (!HAS_AUTH.test(seg)) continue;
    const paths = seg.match(/\/api\/admin\/[^\s'"?]*/g);
    if (paths.every((x) => ROUTINE.test(x))) continue;
    const path = paths.find((x) => !ROUTINE.test(x)).replace(/\d{3,}|user_\w+/g, ':id');
    const unresolved = /https?:\/\/\$/.test(seg) || /(?:^|\s)\$\w+\/api/.test(seg);
    return ['ask', `Production admin write: ${method.toUpperCase()} ${path}${unresolved ? ' (host is an unresolved variable, treated as production)' : ''}. ` +
      'Confirm the target is a [QA-qa-audit-<RUN_ID>] row or an audit account, never owner data. /api/admin/qa-rows and POST /api/admin/database-backups (any; one per deploy is a written rule, not enforced) are exempt.'];
  }
  return null;
}

let input = '';
process.stdin.on('data', (d) => (input += d));
process.stdin.on('end', () => {
  try {
    const p = JSON.parse(input);
    if (p.tool_name && p.tool_name !== 'Bash') return;
    const r = check(String(p.tool_input?.command ?? ''));
    if (r) decide(...r);
  } catch { /* fail open */ }
});
