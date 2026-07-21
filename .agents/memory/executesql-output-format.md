---
name: executeSql callback output format
description: How the code_execution executeSql() callback returns rows (text, not objects) and how to parse it reliably.
---

The `executeSql({ sqlQuery })` callback in the code_execution sandbox does NOT
return parsed rows. It returns `{ success, output, exitCode, exitReason }` where
`output` is a **CSV-quoted text table** (psql `\copy`-style), header line first.

- `.rows` / array access do NOT exist — `result.rows` is undefined; `.map` on the
  result throws.
- Single scalar: `output === "n\n6\n"` (header `n`, then value).
- A JSON column comes back CSV-escaped: `j\n"{""a"" : 1}"\n` — the value is wrapped
  in double-quotes with inner `"` doubled.

**Reliable parse pattern:** ask Postgres to emit one JSON blob, then unwrap:
```js
const jval = async (sqlQuery) => {
  const r = await executeSql({ sqlQuery });
  if (!r.success) throw new Error(r.output);
  let data = r.output.split('\n').slice(1).join('\n').trim();      // drop header
  if (data.startsWith('"') && data.endsWith('"'))
    data = data.slice(1, -1).replace(/""/g, '"');                   // CSV-unquote
  return JSON.parse(data);
};
// usage: await jval(`SELECT json_build_object('users',(SELECT count(*) FROM users)) AS j`)
```

**Why:** discovered while writing a net-zero DB reconcile; blind `.rows`/`.map`
access failed repeatedly. Wrapping counts in `json_build_object(...)` (or
`json_agg(...)` for lists) makes the single-cell output trivially parseable and
sidesteps multi-column delimiter guessing.

**How to apply:** for any read-only DB check via code_execution, prefer one
`json_build_object`/`json_agg` query + the `jval` unwrap above. For DB **writes**
(DELETE/UPDATE) prefer a `tsx` script using the project's drizzle `db.execute`
(has DATABASE_URL) rather than executeSql — writes via executeSql may be blocked
or awkward, and drizzle gives proper FK-ordered control.
