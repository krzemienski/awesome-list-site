#!/usr/bin/env node
// PreToolUse(Bash) guard for production writes. Reads the hook JSON on stdin.
// Prints a permissionDecision ("ask" or "deny"); prints nothing to pass. Denies invalid input or inspection errors.
const ADMIN = /^\/api\/admin(?:\/|$)/i;
const QA_DELETE = /^\/api\/admin\/qa-rows\/(?:resources|resource_edits|bookmark_collections)\/[1-9]\d*\/?$/;
// A local target is decided by the URL host only, so a query string or path that says "localhost" does not count.
const LOCAL_URL = /^(?:\w+:\/\/)?(?:[^@/]*@)?(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(?::\d+)?(?:[/?]|$)/;
const HEREDOC = /<</;
const COMMAND_PREFIX = String.raw`[ \t]*(?:(?:sudo|env|time|command|\w+=[^\s;&|()]*)[ \t]+)*`;
const BOUNDARY = String.raw`(?:^|[;&|(\n\`{!]|\$\(|\b(?:do|then|else|if|elif|while|until)\s)${COMMAND_PREFIX}`;
// Recognize quoted commands, executable paths, and commands inside shell strings.
const CURL_COMMAND = new RegExp(String.raw`(?:${BOUNDARY}|(["'])${COMMAND_PREFIX})(?:[^\s'";&|()]*\/)?curl\b(\1)?`, 'g');
const SHELL_COMMAND = new RegExp(String.raw`(?:${BOUNDARY}|(["'])${COMMAND_PREFIX})(?:[^\s'";&|()]*\/)?(?:sh|bash|zsh|dash|ash|ksh|fish|eval)\b(\1)?`, 'g');
const SSH_COMMAND = new RegExp(String.raw`(?:${BOUNDARY}|(["'])${COMMAND_PREFIX})(?:[^\s'";&|()]*\/)?ssh\b(\1)?`, 'g');
const REMOTE_DANGER = /db:push|drizzle-kit|\bDROP\s|\bTRUNCATE\b|\bDELETE\s+FROM\b|\brm\s+-[A-Za-z]*r[A-Za-z]*\b|\bgit\s+reset\s+--hard\b/i;

// Text of one shell segment, ending at an unquoted separator or its enclosing shell-string quote.
function segment(cmd, from, endQuote) {
  let q = null;
  for (let i = from; i < cmd.length; i++) {
    const c = cmd[i];
    if (q) { if (c === '\\' && q === '"') i++; else if (c === q) q = null; continue; }
    if (c === '\\') { i++; continue; }
    if (c === endQuote) return cmd.slice(from, i);
    if (c === "'" || c === '"') q = c;
    else if (';&|)\n'.includes(c)) return cmd.slice(from, i);
  }
  return cmd.slice(from);
}

// Only a small, literal curl grammar earns an exemption. Everything ambiguous asks.
function curlRequest(text) {
  if (/`|\$\(/.test(text)) return null;
  const args = [];
  let word = '', quote = null, started = false;
  for (const c of text) {
    if (c === '\\' && quote !== "'") return null;
    if (quote) { if (c === quote) quote = null; else word += c; }
    else if (c === '"' || c === "'") { quote = c; started = true; }
    else if (/\s/.test(c)) {
      if (started) { args.push(word); word = ''; started = false; }
    } else {
      if (';&|<>(){}[]*?$`#'.includes(c)) return null;
      word += c;
      started = true;
    }
  }
  if (quote) return null;
  if (started) args.push(word);
  // curl reads ~/.curlrc before CLI arguments; only a leading -q disables it.
  if (args[0] !== '-q' && args[0] !== '--disable') return null;

  let method = null, data = false;
  const targets = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (/^-[sSf]+$/.test(arg) || ['-q', '--disable', '--silent', '--show-error', '--fail', '--compressed'].includes(arg)) continue;
    if (arg === '-X' || arg === '--request' || arg === '-I' || arg === '--head') {
      if (method) return null;
      method = arg === '-I' || arg === '--head' ? 'HEAD' : args[++i];
      if (!/^(GET|HEAD|OPTIONS|POST|PUT|PATCH|DELETE)$/.test(method ?? '')) return null;
    } else if (['-H', '--header', '-b', '--cookie', '-A', '--user-agent', '-o', '--output'].includes(arg)) {
      if (++i >= args.length) return null;
    } else if (['-d', '--data', '--data-raw', '--data-binary', '--data-urlencode', '--data-ascii', '--json'].includes(arg)) {
      if (++i >= args.length) return null;
      data = true;
    } else if (arg === '--url') {
      if (++i >= args.length) return null;
      targets.push(args[i]);
    } else if (arg.startsWith('-')) return null;
    else targets.push(arg);
  }
  if (!targets.length) return null;
  try {
    const urls = targets.map((target) => {
      const absolute = target.startsWith('//') ? `http:${target}`
        : target.includes('://') ? target : `http://${target}`;
      // Curl expands quoted globs too; only a literal IPv6 host may contain brackets.
      const withoutIpv6Host = absolute.replace(/^(https?:\/\/(?:[^@/?#]*@)?)\[[a-f0-9:.]+\](?=[:/?#]|$)/i, '$1');
      if (target.startsWith('@') || /[$`\\{}*]/.test(target) || withoutIpv6Host.includes('[') || withoutIpv6Host.includes(']')) throw new Error('Dynamic curl target');
      const url = new URL(absolute);
      if (!/^https?:$/.test(url.protocol) || url.pathname.includes('%')) throw new Error('Ambiguous curl target');
      return url;
    });
    return { method: method ?? (data ? 'POST' : 'GET'), urls };
  } catch { return null; }
}

const decide = (permissionDecision, permissionDecisionReason) =>
  console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision, permissionDecisionReason } }));

function check(raw) {
  const cmd = raw.replace(/\\\n/g, '');

  // 3. ssh to the Replit workspace running a schema or destructive command, also when the script is a heredoc body.
  let unrecognizedSsh = cmd;
  const sshSegs = [];
  for (const m of cmd.matchAll(SSH_COMMAND)) {
    const text = segment(cmd, m.index + m[0].length, m[2] ? null : m[1]);
    const end = m.index + m[0].length + text.length;
    unrecognizedSsh = unrecognizedSsh.slice(0, m.index) + ' '.repeat(end - m.index) + unrecognizedSsh.slice(end);
    if (/\bawesome-replit\b/.test(text)) sshSegs.push(text);
  }
  if (/\bssh\b/i.test(unrecognizedSsh.replace(/["']/g, '')) && /\bawesome-replit\b/.test(unrecognizedSsh)) {
    return ['ask', 'An unrecognized SSH wrapper may run a command on the production Replit workspace. Confirm the complete invocation before continuing.'];
  }
  const heredocText = sshSegs.length && HEREDOC.test(cmd) ? cmd : '';
  for (const s of [...sshSegs, heredocText]) {
    const hit = s.match(REMOTE_DANGER);
    if (hit) return ['ask', `Remote command on the production Replit workspace contains "${hit[0].trim()}". ` +
      'replit-deploy runs `npm run db:push` here only when the diff touches shared/schema.ts, and publish applies the same schema to production. ' +
      'Approve only if that is the intended deploy step; otherwise deny.'];
    const readOnly = /^\s*awesome-replit\s+(?:pwd|ls|git\s+(?:status|diff|show|log|rev-parse))(?:\s+[^;&|\n]*)?\s*$/.test(s);
    if (!readOnly) {
      return ['ask', 'Production SSH is allowed without review only for complete read-only pwd, ls, and git status/diff/show/log/rev-parse commands. Confirm any deploy, mutation, or unrecognized remote command.'];
    }
  }

  // 2. Schema pushes have no local exemption: dotenv, inherited environment,
  // wrappers and CLI options can change the effective target after prefix checks.
  let rest = cmd;
  for (const s of sshSegs) rest = rest.replace(s, ' ');
  // Inspect shell-wrapper bodies directly; never let them hide a schema push.
  for (const m of rest.matchAll(SHELL_COMMAND)) {
    const body = segment(rest, m.index + m[0].length, m[2] ? null : m[1]);
    if (/db:push|\bdrizzle-kit\b/i.test(body)) {
      return ['deny', 'A shell wrapper contains db:push or drizzle-kit. Run the schema command directly with an inline throwaway local DATABASE_URL so the guard can inspect it.'];
    }
  }
  if (/db:push|\bdrizzle-kit\b[^;&|()\n]*\bpush\b/i.test(rest.replace(/["']/g, ''))) {
    return ['deny', 'Schema pushes are denied by this guard because dotenv, inherited environment, wrappers and CLI options can change the effective database target. Production schema changes go through the reviewed replit-deploy flow.'];
  }

  // 1. All nonlocal admin curl requests ask, except exact routine method/path pairs.
  let unrecognizedCurl = cmd;
  for (const m of cmd.matchAll(CURL_COMMAND)) {
    const text = segment(cmd, m.index + m[0].length, m[2] ? null : m[1]);
    const end = m.index + m[0].length + text.length;
    unrecognizedCurl = unrecognizedCurl.slice(0, m.index) + ' '.repeat(end - m.index) + unrecognizedCurl.slice(end);
    const request = curlRequest(text);
    if (request) {
      if (!request.urls.some((url) => ADMIN.test(url.pathname))) continue;
      if (request.urls.every((url) => LOCAL_URL.test(url.href))) continue;
      const pathname = request.urls[0].pathname;
      const routine = (request.method === 'GET' && ['/api/admin/qa-rows', '/api/admin/qa-rows/'].includes(pathname))
        || (['GET', 'POST'].includes(request.method) && ['/api/admin/database-backups', '/api/admin/database-backups/'].includes(pathname))
        || (request.method === 'DELETE' && QA_DELETE.test(pathname));
      if (request.urls.length === 1 && routine) continue;
    }
    return ['ask', 'Nonlocal admin curl, or a curl command whose target/options cannot be safely parsed, requires approval. ' +
      'Confirm the target and method concern a [QA-qa-audit-<RUN_ID>] row or an audit account, never owner data. ' +
      'Only exact GET qa-rows, DELETE qa-rows/<allowed-table>/<positive-id>, and GET/POST database-backups routes are routine exemptions. ' +
      'Unparsed options, attached options and unresolved variables never earn an exemption. An unattended lane records this ask as a pending row and continues with other work.'];
  }
  if (/\bcurl\b/i.test(unrecognizedCurl.replace(/["']/g, ''))) {
    return ['ask', 'An unrecognized curl command or wrapper may target the admin API. Run curl directly so the guard can inspect its target, method and exact routine exemption; otherwise confirm the complete invocation.'];
  }
  if (HEREDOC.test(cmd)) return ['ask', 'Command contains a heredoc or here-string whose contents may execute. Confirm the complete command and its input do not write production data.'];
  return null;
}

let input = '';
process.stdin.on('data', (d) => (input += d));
process.stdin.on('end', () => {
  try {
    const p = JSON.parse(input);
    if (typeof p?.tool_name === 'string' && p.tool_name && p.tool_name !== 'Bash') return;
    if (typeof p?.tool_input?.command !== 'string') {
      decide('deny', 'Bash hook input must include a string tool_input.command so the production write guard can inspect it.');
      return;
    }
    const r = check(p.tool_input.command);
    if (r) decide(...r);
  } catch {
    decide('deny', 'The production write guard could not parse or inspect the hook input; an unchecked command cannot run.');
  }
});
