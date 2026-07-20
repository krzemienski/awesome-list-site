import { readFileSync } from "node:fs";
const BASE="http://127.0.0.1:5000";
const results=[]; const rec=(id,name,pass,detail="")=>results.push({id,name,pass,detail});
function jarFrom(res){const sc=res.headers.get("set-cookie");if(!sc)return null;const m=sc.match(/connect\.sid=[^;]+/);return m?m[0]:null;}
async function req(method,path,{jar,body}={}){const h={};let p;if(body!==undefined){p=JSON.stringify(body);h["content-type"]="application/json";}if(jar)h["cookie"]=jar;const res=await fetch(BASE+path,{method,headers:h,body:p,redirect:"manual"});let json=null,text=null;try{text=await res.text();json=JSON.parse(text);}catch{}return{status:res.status,json,text,jar:jarFrom(res)};}
async function main(){
  const s=JSON.parse(readFileSync("/tmp/run24a-sess.json","utf8"));
  const { jarA, curPw, qaEmail, qaPw, qaPw2 } = s;
  // jarA session survives the restart (sessions are stored in the DB).
  const preA=await req("GET","/api/auth/user",{jar:jarA});
  rec("_setup","jarA survives restart (DB session)", preA.status===200 && preA.json?.isAuthenticated===true, `status ${preA.status} auth ${preA.json?.isAuthenticated}`);
  // Fresh limiter after restart → single login for the 2nd session.
  const b=await req("POST","/api/auth/local/login",{body:{email:qaEmail,password:curPw}});
  const jarB=b.jar;
  rec("_setup","QA login jarB (2nd session)", b.status===200 && !!jarB, `status ${b.status}`);
  if(!jarB){ dump(); return; }
  const pre=await req("GET","/api/auth/user",{jar:jarB});
  rec("_setup","jarB live before change", pre.status===200 && pre.json?.isAuthenticated===true, `status ${pre.status}`);
  const newPw = curPw===qaPw ? qaPw2 : qaPw;
  const chg=await req("POST","/api/user/change-password",{jar:jarA,body:{currentPassword:curPw,newPassword:newPw}});
  rec("R5-028","change-password 200 + reports invalidated", chg.status===200 && (chg.json?.otherSessionsInvalidated??0)>=1, `status ${chg.status} invalidated ${chg.json?.otherSessionsInvalidated}`);
  const postB=await req("GET","/api/auth/user",{jar:jarB});
  rec("R5-028","jarB invalidated after change", postB.status===200 && postB.json?.isAuthenticated===false, `status ${postB.status} auth ${postB.json?.isAuthenticated}`);
  const postA=await req("GET","/api/auth/user",{jar:jarA});
  rec("R5-028","jarA (current) still alive", postA.status===200 && postA.json?.isAuthenticated===true, `status ${postA.status} auth ${postA.json?.isAuthenticated}`);
  dump();
}
function dump(){const fails=results.filter(x=>!x.pass);console.log(JSON.stringify({phase:"2b",results},null,2));console.log(fails.length?"FAILS: "+fails.map(f=>`${f.id} ${f.name}: ${f.detail}`).join(" | "):"PHASE2b ALL PASS");}
main().catch(e=>{console.error("FATAL",e);process.exit(1);});
