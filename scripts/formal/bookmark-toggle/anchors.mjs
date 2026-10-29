// Each anchor is a code shape BookmarkToggle.tla assumes. A failing anchor
// means the code moved under the model: re-read the named code, update the
// named action, then update the anchor. Never edit an anchor just to pass.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const HOOK = "client/src/hooks/useResourceToggle.ts";
const BUTTON = "client/src/components/resource/BookmarkButton.tsx";
const SERVER = "server/routes/domains/user-features.ts";

const anchors = [
  [HOOK, "StartReq: bookmark buildRequest picks DELETE/POST from vars.remove",
    /buildRequest: \(resourceId, vars\) =>\s*vars\.remove\s*\?\s*apiRequest\(`\/api\/bookmarks\/\$\{resourceId\}`, \{\s*method: "DELETE"/],
  [HOOK, "StartReq: onMutate sets inFlightRef then onOptimistic(!vars.remove)",
    /onMutate: \(vars: ToggleVars\) => \{\s*inFlightRef\.current = vars;\s*opts\.onOptimistic\(!vars\.remove, vars\);/],
  [HOOK, "Click: in-flight branch baseline is the in-flight target, then latest-wins",
    /const inFlightTarget = !inFlightRef\.current\.remove;\s*const desired =\s*desiredRef\.current === null \? !inFlightTarget : !desiredRef\.current;\s*desiredRef\.current = desired;\s*opts\.onOptimistic\(desired\);/],
  [HOOK, "Click: dialog intercept only when not active; otherwise mutate({ remove: isActive })",
    /if \(!opts\.isActive && options\?\.interceptActivate\?\.\(\)\) \{\s*return;\s*\}\s*mutation\.mutate\(\{ remove: opts\.isActive \}\);/],
  [HOOK, "Settle: onSuccess invalidates the list query",
    /onSuccess: \(data, vars\) => \{\s*void queryClient\.invalidateQueries\(\{ queryKey: \[config\.listKey\] \}\);/],
  [HOOK, "Settle: onError reverts and does not invalidate",
    /onError: \(error, vars\) => \{\s*opts\.onErrorRevert\?\.\(vars\);(?:(?!invalidateQueries)[\s\S])*?onSettled:/],
  [HOOK, "Settle: final state and at most one follow-up",
    /const finalState = error\s*\? vars\.remove\s*: \(\(data as any\)\?\.\[config\.serverField\] \?\? !vars\.remove\);\s*if \(desired !== finalState\) \{\s*mutation\.mutate\(\{ remove: !desired \}\);/],
  [BUTTON, "Settle: success adopts data.isBookmarked when the body has it",
    /if \(data\?\.isBookmarked !== undefined\) \{\s*setIsBookmarked\(data\.isBookmarked\);/],
  [BUTTON, "Settle: error reverts to vars.remove",
    /onErrorRevert: \(vars\) => \{[^}]*setIsBookmarked\(vars\.remove\);/],
  [BUTTON, "RefetchDeliver: list sync copies effectiveBookmarked only on change",
    /useEffect\(\(\) => \{\s*setIsBookmarked\(effectiveBookmarked\);\s*\}, \[effectiveBookmarked\]\);/],
  [BUTTON, "Click: notes dialog opens via interceptActivate",
    /interceptActivate: \(\) => \{\s*if \(!showNotesDialog\) return false;/],
  [SERVER, "Settle: POST body carries isBookmarked: true",
    /res\.json\(\{ message: 'Bookmark added successfully', isBookmarked: true/],
  [SERVER, "Settle: DELETE body carries no isBookmarked",
    /res\.json\(\{ message: 'Bookmark removed successfully' \}\)/],
];

let failed = 0;
for (const [file, label, re] of anchors) {
  const ok = re.test(readFileSync(path.join(root, file), "utf8"));
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${file}  ${label}`);
}
if (failed) {
  console.log(`\n${failed} anchor(s) no longer match: the model may not describe the code. Update the named action before trusting a TLC result.`);
  process.exit(2);
}
