import fs from "node:fs";
import { spawnSync } from "node:child_process";

const read = (path) => fs.readFileSync(path, "utf8");
const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

const runtime = read("client/src/lib/design-system.ts");
const app = read("client/src/App.tsx");
const boot = read("client/index.html");
const vite = read("vite.config.ts");
const profileCss = read("shared/styles/product-profiles.css");
const clientCss = read("client/src/styles/design-system.css");
const mainLayout = read("client/src/components/layout/new/MainLayout.tsx");
const main = read("client/src/main.tsx");
const button = read("client/src/components/ui/button.tsx");
const card = read("client/src/components/ui/card.tsx");
const exportTools = read("client/src/components/ui/export-tools.tsx");
const awesomeEntry = read("awesome-list-site-ds/index.html");
const awesomeCss = read("awesome-list-site-ds/styles.css");
const awesomeRuntime = read("awesome-list-site-ds/design-systems.jsx");
const mockupEntry = read("artifacts/mockup-sandbox/index.html");
const mockupCss = read("artifacts/mockup-sandbox/src/index.css");
const mockupApp = read("artifacts/mockup-sandbox/src/App.tsx");

const profiles = [
  "public-discovery",
  "learning-workspace",
  "admin-operations",
  "standalone-exports",
  "embedded-integrations",
];

const profileTokens = [
  "--profile-content-gap",
  "--profile-control-height",
  "--profile-panel-padding",
  "--profile-page-measure",
  "--profile-chrome-opacity",
];

for (const profile of profiles) {
  expect(runtime.includes(`"${profile}": {`), `Missing ${profile} runtime profile`);
  expect(
    profileCss.includes(`data-product-profile="${profile}"`),
    `Missing ${profile} semantic token selector`,
  );
}

for (const token of profileTokens) {
  expect(
    profileCss.match(new RegExp(token, "g"))?.length === profiles.length + 1,
    `${token} is not declared once per profile plus the root fallback`,
  );
}

expect(
  profileCss.includes("@media (prefers-reduced-motion: reduce)") &&
    profileCss.includes("animation-duration: 0.01ms !important"),
  "Shared profile foundation does not enforce reduced-motion behavior",
);
expect(
  runtime.includes("defaultSystem: null") && runtime.includes("defaultAccent: null"),
  "Embedded integrations are not host-neutral with inherited accent",
);
expect(app.includes("resolveProductProfile(location)"), "SPA routes do not resolve a product profile");
expect(app.includes("productProfile={productProfile}"), "MainLayout does not declare its product profile");
expect(
  boot.includes("PRODUCT_PROFILE_BOOT.profiles[profile]"),
  "Pre-paint boot does not select profile defaults",
);
expect(
  runtime.includes("PRODUCT_PROFILE_ROUTE_PATTERNS") &&
    boot.includes("PRODUCT_PROFILE_BOOT.routePatterns.admin") &&
    boot.includes("PRODUCT_PROFILE_BOOT.routePatterns.learning"),
  "Runtime and pre-paint route classification do not share one generated source",
);
expect(
  main.includes('document.documentElement.getAttribute("data-system")') &&
    main.includes("loadDesignSystemFont(resolveSystemId(selectedSystemAtBoot))") &&
    !main.includes('selectedSystemAtBoot = localStorage.getItem("ds-system")'),
  "Initial font loading does not consume the profile/saved system resolved before paint",
);
expect(
  vite.includes("PRODUCT_PROFILE_BOOT_DATA") &&
    vite.includes("__AWESOME_VIDEO_PRODUCT_PROFILE_BOOT__"),
  "Vite does not inject generated product-profile boot data",
);

const surfaces = [
  {
    name: "SPA",
    entry: boot,
    profile: "public-discovery",
    adapter: clientCss,
    importPath: "../../../shared/styles/product-profiles.css",
    consumers: [
      [mainLayout, "--profile-page-measure"],
      [button, "--profile-control-height"],
      [card, "--profile-panel-padding"],
    ],
  },
  {
    name: "standalone design-system site",
    entry: awesomeEntry,
    profile: "standalone-exports",
    adapter: awesomeCss,
    importPath: "../shared/styles/product-profiles.css",
    consumers: [
      [awesomeCss, "--profile-control-height"],
      [awesomeCss, "--profile-page-measure"],
      [awesomeRuntime, "applyProductProfile('standalone-exports')"],
    ],
  },
  {
    name: "mockup sandbox",
    entry: mockupEntry,
    profile: "standalone-exports",
    adapter: mockupCss,
    importPath: "../../../shared/styles/product-profiles.css",
    consumers: [
      [mockupCss, "--profile-panel-padding"],
      [mockupCss, "--profile-content-gap"],
      [mockupCss, "--profile-page-measure"],
      [mockupApp, "profile-gallery-shell"],
    ],
  },
];

for (const surface of surfaces) {
  expect(
    surface.entry.includes(`data-product-profile="${surface.profile}"`),
    `${surface.name} does not declare ${surface.profile}`,
  );
  expect(
    surface.adapter.includes(`@import "${surface.importPath}"`),
    `${surface.name} does not import the shared profile foundation`,
  );
  for (const [source, role] of surface.consumers) {
    expect(source.includes(role), `${surface.name} does not consume ${role}`);
  }
}

expect(
  exportTools.includes('data-product-profile="standalone-exports"'),
  "Generated HTML downloads do not declare standalone-exports",
);
const standaloneGeneration = spawnSync(
  process.execPath,
  ["scripts/generate-standalone-product-profile.mjs", "--check"],
  { encoding: "utf8" },
);
expect(
  standaloneGeneration.status === 0,
  standaloneGeneration.stderr.trim() ||
    "Self-contained design-system bundle is stale",
);

if (failures.length) {
  console.error(`Product profile drift (${failures.length}):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Product profile drift: PASS (${profiles.length} approved profiles)`);