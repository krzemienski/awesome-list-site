#!/bin/bash
echo "===All /api/ endpoints in JS bundle==="
grep -oE '"/api/[a-z/]+"' .audit/evidence/index.js | sort -u
echo ""
echo "===All /api/admin/* specifically==="
grep -oE '"/api/admin[a-z/]*"' .audit/evidence/index.js | sort -u
echo ""
echo "===Search for /api/ + admin|approve|reject|pending|submissions==="
grep -oE '"/api/[^"]+"' .audit/evidence/index.js | sort -u | grep -iE "(admin|approv|reject|pend|submi)"