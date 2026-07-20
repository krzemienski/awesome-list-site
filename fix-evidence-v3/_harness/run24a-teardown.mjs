const BASE="http://127.0.0.1:5000";
function jarFrom(res){const sc=res.headers.get("set-cookie");if(!sc)return null;const m=sc.match(/connect\.sid=[^;]+/);return m?m[0]:null;}
async function req(method,path,{jar,body}={}){const h={};let p;if(body!==undefined){p=JSON.stringify(body);h["content-type"]="application/json";}if(jar)h["cookie"]=jar;const res=await fetch(BASE+path,{method,headers:h,body:p,redirect:"manual"});let json=null;try{json=JSON.parse(await res.text());}catch{}return{status:res.status,json,jar:jarFrom(res)};}
async function main(){
  const a=await req("POST","/api/auth/local/login",{body:{email:"admin@example.com",password:process.env.ADMIN_PASSWORD}});
  if(a.status!==200){ console.log("admin login failed",a.status); return; }
  const jar=a.jar;
  const who=await req("GET","/api/auth/user",{jar}); // warmup: let the session store commit
  console.log("admin session:",who.status,who.json?.user?.role);
  const resIds=[187114,187115,187116];
  const userIds=["c995866b-49a4-4cd9-ac26-82fd853e8804","7dba9e3d-d366-41db-982d-abf183f3a0fb"];
  for(const id of resIds){ const r=await req("DELETE",`/api/admin/resources/${id}`,{jar}); console.log("del resource",id,r.status); }
  for(const id of userIds){ const r=await req("DELETE",`/api/admin/users/${id}`,{jar}); console.log("del user",id,r.status); }
}
main().catch(e=>{console.error("FATAL",e);process.exit(1);});
