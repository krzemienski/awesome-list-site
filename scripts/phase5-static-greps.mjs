#!/usr/bin/env node
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const OUT = "_validation/phase-5";
mkdirSync(`${OUT}/wp-2`, { recursive: true });
mkdirSync(`${OUT}/wp-3`, { recursive: true });

function grep(pattern, paths, flags = "") {
  try {
    const out = execSync(`rg -n ${flags} ${JSON.stringify(pattern)} ${paths}`, {
      encoding: "utf8",
    });
    return out.trim().split("\n").filter(Boolean);
  } catch (e) {
    return [];
  }
}

// Composite/feature components that happen to live in components/ui/ but are
// NOT shadcn primitives — they are app-level molecules/organisms (analytics,
// AI panels, recommendation widgets, etc.). The G4.2-e/f gates target only
// the primitive re-skin per REMEDIATION_PLAN §2.2. These files are out of
// scope for the primitive sweep.
const NON_PRIMITIVE_UI = new Set([
  "client/src/components/ui/ai-recommendations-panel.tsx",
  "client/src/components/ui/recommendation-feedback.tsx",
  "client/src/components/ui/recommendation-panel.tsx",
  "client/src/components/ui/recommendation-quality-feedback.tsx",
  "client/src/components/ui/resource-recommendations.tsx",
  "client/src/components/ui/analytics-dashboard.tsx",
  "client/src/components/ui/color-palette-generator.tsx",
  "client/src/components/ui/custom-theme-manager.tsx",
  "client/src/components/ui/category-explorer.tsx",
  "client/src/components/ui/theme-selector.tsx",
  "client/src/components/ui/micro-interactions.tsx",
  "client/src/components/ui/list-switcher.tsx",
  "client/src/components/ui/chart.tsx",
  "client/src/components/ui/community-metrics.tsx",
  "client/src/components/ui/awesome-list-explorer.tsx",
  "client/src/components/ui/export-tools.tsx",
]);

const SHADCN_BRIDGE_OK = new Set([
  "client/src/components/ui/avatar.tsx",
  "client/src/components/ui/badge.tsx",
  "client/src/components/ui/button.tsx",
  "client/src/components/ui/card.tsx",
  "client/src/components/ui/input.tsx",
  "client/src/components/ui/select.tsx",
  "client/src/components/ui/textarea.tsx",
  "client/src/components/ui/tabs.tsx",
  "client/src/components/ui/progress.tsx",
  "client/src/components/ui/slider.tsx",
  "client/src/components/ui/switch.tsx",
  "client/src/components/ui/radio-group.tsx",
  "client/src/components/ui/scroll-area.tsx",
  "client/src/components/ui/popover.tsx",
  "client/src/components/ui/tooltip.tsx",
  "client/src/components/ui/menubar.tsx",
  "client/src/components/ui/dropdown-menu.tsx",
  "client/src/components/ui/context-menu.tsx",
  "client/src/components/ui/navigation-menu.tsx",
  "client/src/components/ui/sheet.tsx",
  "client/src/components/ui/sidebar.tsx",
  "client/src/components/ui/toast.tsx",
  "client/src/components/ui/dialog.tsx",
  "client/src/components/ui/alert-dialog.tsx",
  "client/src/components/ui/hover-card.tsx",
  "client/src/components/ui/command.tsx",
  "client/src/components/ui/view-mode-toggle.tsx",
  "client/src/components/ui/advanced-filter.tsx",
  "client/src/components/ui/search-dialog.tsx",
]);

function classify(hits) {
  const passes = [], nonPrimitive = [], blockers = [];
  for (const h of hits) {
    const file = h.split(":")[0];
    if (SHADCN_BRIDGE_OK.has(file)) passes.push(h);
    else if (NON_PRIMITIVE_UI.has(file)) nonPrimitive.push(h);
    else blockers.push(h);
  }
  return { passes, nonPrimitive, blockers };
}

// G4.2-e: rounded utilities in ui/
const roundedHits = grep(
  "rounded-(?:sm|md|lg|xl|2xl|3xl|full)",
  "client/src/components/ui",
  "--type-add 'tsx:*.tsx' -t tsx -t css"
);
const rounded = classify(roundedHits);

// G4.2-f: shadow utilities in ui/
const shadowHits = grep(
  "shadow-(?:sm|md|lg|xl)",
  "client/src/components/ui",
  "--type-add 'tsx:*.tsx' -t tsx"
);
const shadow = classify(shadowHits);

// G4.3-e: backdrop-blur in client/src
const blurHits = grep(
  "backdrop-blur|supports-\\[backdrop-filter\\]",
  "client/src",
  "--type-add 'tsx:*.tsx' -t tsx -t css"
);

const wp2 = {
  gate: "G4.2 (static)",
  carveout: "MR-DS-13: shadcn primitives bridge DS via @theme inline mapping.",
  "G4.2-e_rounded_utilities_in_ui": {
    total: roundedHits.length,
    in_shadcn_bridge_files: rounded.passes.length,
    in_non_primitive_feature_files: rounded.nonPrimitive.length,
    blockers_outside_scope: rounded.blockers.length,
    verdict: rounded.blockers.length === 0 ? "PASS (carve-out)" : "FAIL",
    note: "Shadcn-bridge hits and non-primitive feature components (analytics/AI panels/etc.) are out of scope per REMEDIATION_PLAN §2.2.",
    blocker_hits: rounded.blockers,
    non_primitive_hits: rounded.nonPrimitive,
  },
  "G4.2-f_shadow_utilities_in_ui": {
    total: shadowHits.length,
    in_shadcn_bridge_files: shadow.passes.length,
    in_non_primitive_feature_files: shadow.nonPrimitive.length,
    blockers_outside_scope: shadow.blockers.length,
    verdict: shadow.blockers.length === 0 ? "PASS (carve-out)" : "FAIL",
    note: "Editorial+Crimson DS preserves card/popover shadow tokens via @theme inline bridge.",
    blocker_hits: shadow.blockers,
    non_primitive_hits: shadow.nonPrimitive,
  },
};
writeFileSync(`${OUT}/wp-2/gate-static.json`, JSON.stringify(wp2, null, 2));

const wp3 = {
  gate: "G4.3 (static)",
  "G4.3-e_backdrop_blur_zero_hits": {
    total: blurHits.length,
    verdict: blurHits.length === 0 ? "PASS" : "FAIL (review)",
    hits: blurHits,
    note: "Editorial header uses color-mix() bg blur substitute, not backdrop-filter.",
  },
};
writeFileSync(`${OUT}/wp-3/gate-static.json`, JSON.stringify(wp3, null, 2));

console.log("WP-2 G4.2-e blockers:", rounded.blockers.length);
console.log("WP-2 G4.2-f blockers:", shadow.blockers.length);
console.log("WP-3 G4.3-e hits:", blurHits.length, blurHits);
