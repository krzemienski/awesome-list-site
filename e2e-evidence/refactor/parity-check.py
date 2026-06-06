#!/usr/bin/env python3
"""Per-wave parity gate: replay all GET routes (unauth + admin-auth) and diff
status + response top-keys against the Wave-0 baselines. Exit 1 on any drift.
Pure read-only behavior check — no mocks, real running system on :5001."""
import re, json, sys, urllib.request, urllib.error, http.cookiejar, os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BASE = os.path.join(ROOT, 'e2e-evidence', 'refactor')

def routes():
    src = open(os.path.join(ROOT,'server/routes.ts')).read()
    for extra in ('server/api/public.ts',):
        p=os.path.join(ROOT,extra)
        if os.path.exists(p): src+=open(p).read()
    # also scan any new server/routes/*.ts domain modules
    rdir=os.path.join(ROOT,'server/routes')
    if os.path.isdir(rdir):
        for f in os.listdir(rdir):
            if f.endswith('.ts'): src+=open(os.path.join(rdir,f)).read()
    return sorted(set(m.group(2) for m in re.finditer(r"app\.(get)\(\s*['\"]([^'\"]+)['\"]", src)))

def concretize(p):
    p=p.replace(':id(\\\\d+)','1949').replace(':id(\\d+)','1949')
    p=re.sub(r':resourceId','1949',p); p=re.sub(r':id','1949',p)
    p=re.sub(r':slug','encoding-codecs',p); p=re.sub(r':[A-Za-z]+','1',p)
    return p

def sig(opener,g):
    url='http://localhost:5001'+concretize(g)
    try:
        r=opener.open(url,timeout=8); body=r.read(4000).decode('utf-8','ignore'); st=r.status
    except urllib.error.HTTPError as e:
        body=e.read(2000).decode('utf-8','ignore'); st=e.code
    except Exception as ex:
        return {'path':concretize(g),'status':'ERR:'+type(ex).__name__,'topKeys':''}
    tk=''
    try:
        j=json.loads(body)
        if isinstance(j,dict): tk=','.join(sorted(j.keys())[:8])
        elif isinstance(j,list): tk=f'[list len={len(j)}]'+(','.join(sorted(j[0].keys())[:8]) if j and isinstance(j[0],dict) else '')
    except: tk='(non-json)'
    return {'path':concretize(g),'status':st,'topKeys':tk}

def admin_opener():
    jar=http.cookiejar.CookieJar(); op=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
    req=urllib.request.Request('http://localhost:5001/api/auth/local/login',
        data=json.dumps({"email":"admin@example.com","password":"admin123"}).encode(),
        headers={'Content-Type':'application/json'},method='POST')
    op.open(req,timeout=8).read(); return op

def diff(label, baseline_file, opener):
    base=json.load(open(os.path.join(BASE,baseline_file)))
    drift=[]
    for g in routes():
        cur=sig(opener,g)
        b=base.get(g)
        if b is None:
            # new route not in baseline — only flag if it's an existing path that changed; new routes are fine
            continue
        # status drift: tolerate list-len changes in topKeys only for non-1949-sensitive; but status must match
        if str(cur['status'])!=str(b['status']) or cur['topKeys']!=b['topKeys']:
            drift.append((g,b,cur))
    if drift:
        print(f"[{label}] DRIFT in {len(drift)} route(s):")
        for g,b,c in drift:
            print(f"  {g}\n    baseline: {b['status']} {b['topKeys']}\n    current : {c['status']} {c['topKeys']}")
    else:
        print(f"[{label}] OK — {len(base)} routes match baseline")
    return len(drift)

if __name__=='__main__':
    d1=diff('unauth','baseline-endpoints-unauth.json', urllib.request.build_opener())
    d2=diff('auth','baseline-endpoints-auth.json', admin_opener())
    sys.exit(1 if (d1+d2)>0 else 0)
