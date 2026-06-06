#!/usr/bin/env bash
cd /Users/nick/Desktop/awesome-list-site || exit 1
SRC=client/src
echo "================ A11Y STATIC SWEEP $(date) ================"
echo
echo "### [1] ICON-ONLY BUTTONS size=icon ###"
grep -rnE 'size="icon"' "$SRC" --include='*.tsx' 2>/dev/null
echo
echo "### [1b] square button patterns h-8/9/10 w-8/9/10 ###"
grep -rnE 'className="[^"]*(h-8 w-8|w-8 h-8|h-9 w-9|w-9 h-9|h-10 w-10|w-10 h-10)' "$SRC" --include='*.tsx' 2>/dev/null
echo
echo "### [3] min-h-[44px] / min-w-[44px] tap targets ###"
grep -rnE 'min-(h|w)-\[44px\]' "$SRC" --include='*.tsx' 2>/dev/null
echo
echo "### [5a] <img tags ###"
grep -rnE '<img' "$SRC" --include='*.tsx' 2>/dev/null
echo
echo "### [5b] form inputs ###"
grep -rnE '<(Input|input|Select|select|Textarea|textarea)' "$SRC" --include='*.tsx' 2>/dev/null
echo
echo "### [6] hardcoded marketing numbers ###"
grep -rniE '(2000|1900|2,000|thousands|hundreds of|over 2000)' "$SRC" --include='*.tsx' 2>/dev/null | grep -vE 'z-\[|2000ms|timeout|setTimeout|delay|duration|ms\)'
echo
echo "### [2] heading tags h1/h2/h3 per page ###"
grep -rnE '<h[1-3]' "$SRC/pages" --include='*.tsx' 2>/dev/null
exit 0
