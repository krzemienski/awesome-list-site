const BASE="http://127.0.0.1:5000";
const out=[]; const rec=(id,name,pass,detail="")=>out.push({id,name,pass,detail});
function jarFrom(r){const s=r.headers.get("set-cookie");if(!s)return null;const m=s.match(/connect\.sid=[^;]+/);return m?m[0]:null;}
async function req(method,path,{jar,body}={}){const h={};let p;if(body!==undefined){p=JSON.stringify(body);h["content-type"]="application/json";}if(jar)h["cookie"]=jar;const r=await fetch(BASE+path,{method,headers:h,body:p,redirect:"manual"});let j=null,t=null;try{t=await r.text();j=JSON.parse(t);}catch{}return{status:r.status,json:j,text:t,jar:jarFrom(r)};}
async function main(){
  const a=await req("POST","/api/auth/local/login",{body:{email:"admin@example.com",password:process.env.ADMIN_PASSWORD}});
  if(a.status!==200){console.log("admin login failed",a.status);return;}
  const jar=a.jar;
  const who=await req("GET","/api/auth/user",{jar}); // warmup so session store commits
  rec("_setup","admin session",who.status===200&&who.json?.user?.role==="admin",`status ${who.status}`);
  // ---- R4-016: edit paths reject http:// ----
  const rid=187906;
  const g=await req("GET",`/api/resources/${rid}`,{jar});
  const origUrl=g.json?.url;
  rec("_setup",`GET resource ${rid} url captured`, g.status===200 && !!origUrl, `status ${g.status} url ${origUrl}`);
  const putHttp=await req("PUT",`/api/admin/resources/${rid}`,{jar,body:{url:"http://example.com/run24a-http-probe"}});
  rec("R4-016","admin PUT http:// url -> 400", putHttp.status===400 && /https/i.test(JSON.stringify(putHttp.json)), `status ${putHttp.status} ${JSON.stringify(putHttp.json).slice(0,120)}`);
  const httpsUrl="https://example.com/run24a-https-probe";
  const putHttps=await req("PUT",`/api/admin/resources/${rid}`,{jar,body:{url:httpsUrl}});
  rec("R4-016","admin PUT https:// url -> 200", putHttps.status===200, `status ${putHttps.status}`);
  // restore original url (byte-equal skip lets a legacy http:// original pass)
  const restore=await req("PUT",`/api/admin/resources/${rid}`,{jar,body:{url:origUrl}});
  rec("_teardown","restored original url", restore.status===200, `status ${restore.status}`);
  const gAfter=await req("GET",`/api/resources/${rid}`,{jar});
  rec("_teardown","resource url back to original", gAfter.json?.url===origUrl, `now ${gAfter.json?.url}`);
  // ---- R5-021: researcher budget cap 100 ----
  const prompt="Find modern open-source video transcoding libraries for streaming.";
  const b101=await req("POST","/api/researcher/start",{jar,body:{prompt,maxBudgetUsd:101,maxTurns:10}});
  rec("R5-021","budget=101 -> 400 at most 100", b101.status===400 && /at most 100/.test(JSON.stringify(b101.json)), `status ${b101.status} ${JSON.stringify(b101.json).slice(0,120)}`);
  // budget=100 must PASS the cap; use invalid maxTurns so it 400s AFTER the budget check (no real run started)
  const b100=await req("POST","/api/researcher/start",{jar,body:{prompt,maxBudgetUsd:100,maxTurns:1}});
  rec("R5-021","budget=100 passes cap (fails later on maxTurns)", b100.status===400 && /maxTurns/.test(JSON.stringify(b100.json)) && !/at most 100/.test(JSON.stringify(b100.json)), `status ${b100.status} ${JSON.stringify(b100.json).slice(0,140)}`);
  const fails=out.filter(x=>!x.pass);
  console.log(JSON.stringify({phase:"2c",results:out},null,2));
  console.log(fails.length?"FAILS: "+fails.map(f=>`${f.id} ${f.name}: ${f.detail}`).join(" | "):"PHASE2c ALL PASS");
}
main().catch(e=>{console.error("FATAL",e);process.exit(1);});
