import { writeFileSync } from "node:fs";
const BASE="http://127.0.0.1:5000";
const results=[]; const rec=(id,name,pass,detail="")=>results.push({id,name,pass,detail});
function jarFrom(res){const sc=res.headers.get("set-cookie");if(!sc)return null;const m=sc.match(/connect\.sid=[^;]+/);return m?m[0]:null;}
async function req(method,path,{jar,body}={}){const h={};let p;if(body!==undefined){p=JSON.stringify(body);h["content-type"]="application/json";}if(jar)h["cookie"]=jar;const res=await fetch(BASE+path,{method,headers:h,body:p,redirect:"manual"});let json=null,text=null;try{text=await res.text();json=JSON.parse(text);}catch{}return{status:res.status,json,text,jar:jarFrom(res)};}
const BIDI_TITLE="safe\u202Ecoded name",NUL_TITLE="clean\u0000name";
const qaEmail="__qa_test_run24a_user@example.com",qaPw="Vr9!kq2#Zt8mQx",qaPw2="Wt3@np7$Yb1kLd";
async function main(){
  let r=await req("POST","/api/auth/local/login",{body:{email:qaEmail,password:qaPw}});
  let curPw=qaPw;
  if(r.status!==200){ r=await req("POST","/api/auth/local/login",{body:{email:qaEmail,password:qaPw2}}); curPw=qaPw2; }
  const jarA=r.jar;
  rec("_setup","QA login jarA",r.status===200&&!!jarA,`status ${r.status}`);
  if(jarA){
    const r1=await req("POST","/api/resources",{jar:jarA,body:{title:NUL_TITLE,url:"https://example.com/a",description:"a fine description for the queue",category:"General"}});
    rec("R5-019","submit NUL title -> 400 (not 500)",r1.status===400,`got ${r1.status}`);
    const r2=await req("POST","/api/resources",{jar:jarA,body:{title:BIDI_TITLE,url:"https://example.com/b",description:"a fine description for the queue",category:"General"}});
    rec("R5-038","submit bidi title -> 400",r2.status===400,`got ${r2.status}`);
    writeFileSync("/tmp/run24a-sess.json",JSON.stringify({jarA,curPw,qaEmail,qaPw,qaPw2}));
  }
  const fails=results.filter(x=>!x.pass);
  console.log(JSON.stringify({phase:"2a",results},null,2));
  console.log(fails.length?"FAILS: "+fails.map(f=>`${f.id} ${f.name}: ${f.detail}`).join(" | "):"PHASE2a OK");
}
main().catch(e=>{console.error("FATAL",e);process.exit(1);});
