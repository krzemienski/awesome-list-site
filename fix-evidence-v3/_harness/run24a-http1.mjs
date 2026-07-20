import { writeFileSync } from "node:fs";
const BASE = "http://127.0.0.1:5000";
const results = [];
const rec = (id, name, pass, detail = "") => { results.push({ id, name, pass, detail }); };
function jarFrom(res){ const sc=res.headers.get("set-cookie"); if(!sc) return null; const m=sc.match(/connect\.sid=[^;]+/); return m?m[0]:null; }
async function req(method, path, { jar, body, rawBody, headers } = {}) {
  const h = { ...(headers||{}) }; let payload;
  if (rawBody!==undefined){ payload=rawBody; h["content-type"]=h["content-type"]||"application/json"; }
  else if (body!==undefined){ payload=JSON.stringify(body); h["content-type"]="application/json"; }
  if (jar) h["cookie"]=jar;
  const res = await fetch(BASE+path,{method,headers:h,body:payload,redirect:"manual"});
  let json=null,text=null; try{ text=await res.text(); json=JSON.parse(text); }catch{}
  return { status:res.status, json, text, jar:jarFrom(res) };
}
const BIDI_TITLE="safe\u202Ecoded name";
const NUL_TITLE="clean\u0000name";
const qaEmail="__qa_test_run24a_user@example.com", qaPw="Vr9!kq2#Zt8mQx", qaPw2="Wt3@np7$Yb1kLd";

async function main(){
  // PHASE A: anonymous
  for (const m of ["PUT","DELETE","PATCH","POST"]) {
    const r=await req(m,"/api/admin/resources/1",{body:{title:"x"}});
    rec("R5-060",`anon ${m} /api/admin/resources/1 -> 401`, r.status===401, `got ${r.status}`);
  }
  { const r=await req("GET","/api/resources/check-url?url=https://example.com/none-"+Date.now());
    const keys=r.json?Object.keys(r.json):[];
    const ok=r.status===200 && keys.length>=1 && keys.every(k=>k==="exists"||k==="normalizedUrl");
    rec("R5-045","check-url returns only {exists}", ok && typeof r.json?.exists==="boolean", `status ${r.status} keys ${JSON.stringify(keys)}`); }
  { const r=await req("POST","/api/telemetry/dead-link",{body:{path:"/some/missing",referrer:"/"}});
    rec("R5-059","telemetry dead-link accepted", r.status===200||r.status===204, `got ${r.status}`); }
  { const big=JSON.stringify({path:"/x",blob:"a".repeat(200*1024)});
    const r=await req("POST","/api/telemetry/dead-link",{rawBody:big});
    rec("R5-047","200KB body -> 413", r.status===413, `got ${r.status}`); }
  { const r=await req("POST","/api/telemetry/dead-link",{rawBody:"{not valid json"});
    rec("R5-047","malformed JSON -> 400", r.status===400, `got ${r.status}`); }

  // PHASE B: admin
  const adminPw=process.env.ADMIN_PASSWORD;
  const alogin=await req("POST","/api/auth/local/login",{body:{email:"admin@example.com",password:adminPw}});
  const adminJar=alogin.jar;
  rec("_setup","admin login", alogin.status===200 && !!adminJar, `status ${alogin.status}`);
  if (adminJar){
    for (const q of ["offset=100000000000000000000","limit=-1","resourceId=1.5"]) {
      const r=await req("GET","/api/admin/audit-logs?"+q,{jar:adminJar});
      rec("R5-020",`audit-logs ${q} -> 400`, r.status===400, `got ${r.status}`);
    }
    { const r=await req("GET","/api/admin/audit-logs?limit=5&offset=0",{jar:adminJar});
      rec("R5-020","audit-logs valid -> 200", r.status===200, `got ${r.status}`); }
    const list=await req("GET","/api/resources?limit=1",{jar:adminJar});
    const rid=Array.isArray(list.json)?list.json[0]?.id:(list.json?.resources?.[0]?.id);
    rec("_setup","got a resource id", Number.isInteger(rid), `id ${rid}`);
    if (Number.isInteger(rid)){
      const r=await req("PUT",`/api/admin/resources/${rid}`,{jar:adminJar,body:{title:BIDI_TITLE}});
      rec("R5-038","admin PUT bidi title -> 400", r.status===400, `got ${r.status}`);
      const cur=await req("GET",`/api/resources/${rid}`,{jar:adminJar});
      rec("_setup","resource still readable after rejected PUT", cur.status===200, `got ${cur.status}`);
    }
    { const r=await req("POST","/api/researcher/start",{jar:adminJar,body:{count:-5,topic:""}});
      rec("R5-021","researcher/start invalid -> 400", r.status===400, `got ${r.status}`); }
    { const r=await req("POST","/api/claude/analyze",{jar:adminJar,body:{url:"https://not-an-allowlisted-domain.example.org/page"}});
      rec("R5-030","analyze non-allowlisted -> 4xx", r.status>=400 && r.status<500, `got ${r.status}`); }
  }

  // PHASE C part 1: QA local user session A
  const reg=await req("POST","/api/auth/register",{body:{email:qaEmail,password:qaPw,displayName:"QA Run24A"}});
  rec("_setup","QA register", [200,201,409].includes(reg.status), `status ${reg.status}`);
  const la=await req("POST","/api/auth/local/login",{body:{email:qaEmail,password:qaPw}});
  const jarA=la.jar;
  rec("_setup","QA login jarA", la.status===200 && !!jarA, `status ${la.status}`);
  if (jarA){
    const r1=await req("POST","/api/resources",{jar:jarA,body:{title:NUL_TITLE,url:"https://example.com/a",description:"a fine description for the queue",category:"General"}});
    rec("R5-019","submit NUL title -> 400 (not 500)", r1.status===400, `got ${r1.status}`);
    const r2=await req("POST","/api/resources",{jar:jarA,body:{title:BIDI_TITLE,url:"https://example.com/b",description:"a fine description for the queue",category:"General"}});
    rec("R5-038","submit bidi title -> 400", r2.status===400, `got ${r2.status}`);
    // Confirm jarA live for the follow-up session test.
    const who=await req("GET","/api/auth/user",{jar:jarA});
    rec("_setup","jarA live", who.status===200 && who.json?.isAuthenticated===true, `status ${who.status}`);
  }

  writeFileSync("/tmp/run24a-jars.json", JSON.stringify({ adminJar, jarA, qaEmail, qaPw, qaPw2 }));
  console.log(JSON.stringify({phase:"1", total:results.length, pass:results.filter(r=>r.pass).length, results},null,2));
  const fails=results.filter(r=>!r.pass);
  console.log(fails.length? "\nFAILURES:\n"+fails.map(f=>`${f.id} ${f.name}: ${f.detail}`).join("\n") : "\nPHASE1 ALL PASS");
}
main().catch(e=>{console.error("FATAL",e);process.exit(1);});
