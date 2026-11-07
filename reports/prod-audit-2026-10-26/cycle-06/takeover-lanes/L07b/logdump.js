JSON.stringify((window.__qaLog||[]).filter(r=>!/umami|clerk|analytics/.test(r.url)).map(r=>r.m+" "+r.url+" "+r.s))
