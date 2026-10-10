import fs from "node:fs";
const { builtinRules } = await import("/home/runner/workspace/node_modules/eslint/lib/unsupported-api.js");
const prob = new Set([...builtinRules].filter(([,r])=>r.meta?.type==="problem").map(([k])=>k));
const C = new Set(["react-hooks/rules-of-hooks","react-hooks/exhaustive-deps","@typescript-eslint/no-floating-promises","@typescript-eslint/no-misused-promises","@typescript-eslint/only-throw-error","@typescript-eslint/prefer-promise-reject-errors","@typescript-eslint/unbound-method","@typescript-eslint/no-unused-expressions","@typescript-eslint/no-array-delete","@typescript-eslint/no-implied-eval","@typescript-eslint/await-thenable","@typescript-eslint/no-for-in-array","react/jsx-key","react/jsx-no-comment-textnodes","react/jsx-no-duplicate-props","react/jsx-no-undef","react/jsx-no-target-blank","react/no-children-prop","react/no-danger-with-children","react/no-direct-mutation-state","react/no-string-refs","react/no-unknown-property","react/require-render-return"]);
for (const f of process.argv.slice(2)) {
  const res = JSON.parse(fs.readFileSync(f,"utf8"));
  const area = {}, corr = {}, top = {};
  for (const r of res) { const file = r.filePath.replace("/home/runner/workspace/",""); const a = file.split("/")[0];
    for (const m of r.messages) { const k = m.fatal ? "(fatal)" : (m.ruleId ?? "(eslint-directive)");
      area[a] = (area[a]??0)+1; top[k]=(top[k]??0)+1;
      const app = /^(client|server|shared|artifacts\/awesome-video-design-system)\//.test(file);
      if (app && (C.has(k)||prob.has(k)||k.startsWith("("))) { corr[k]=(corr[k]??0)+1; } } }
  const tot = Object.values(area).reduce((a,b)=>a+b,0);
  console.log("==",f,"total",tot); console.log("by area",JSON.stringify(area));
  console.log("app correctness",Object.values(corr).reduce((a,b)=>a+b,0),JSON.stringify(Object.entries(corr).sort((a,b)=>b[1]-a[1])));
  console.log("top rules",JSON.stringify(Object.entries(top).sort((a,b)=>b[1]-a[1]).slice(0,10)));
}
