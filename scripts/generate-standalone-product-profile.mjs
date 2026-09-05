import fs from "node:fs";

const checkOnly = process.argv.includes("--check");
const entryPath = "awesome-list-site-ds/index.html";
const siteCssPath = "awesome-list-site-ds/styles.css";
const profileCssPath = "shared/styles/product-profiles.css";
const outputPath = "awesome-list-site-ds/index.standalone.html";
const startMarker = "/* GENERATED PRODUCT PROFILE: START */";
const endMarker = "/* GENERATED PRODUCT PROFILE: END */";

const read = (path) => fs.readFileSync(path, "utf8");
const entry = read(entryPath);
const siteCss = read(siteCssPath);
const profileCss = read(profileCssPath).trim();
const current = read(outputPath);

const profileMatch = entry.match(/<html\b[^>]*\bdata-product-profile="([^"]+)"/i);
if (!profileMatch) {
  throw new Error(`${entryPath} must declare data-product-profile`);
}
const profile = profileMatch[1];

const consumerRules = [];
const rulePattern = /(?:^|})\s*([^@{}][^{}]*)\{([^{}]*var\(--profile-[^{}]*)\}/gm;
for (const match of siteCss.matchAll(rulePattern)) {
  consumerRules.push(`${match[1].trim()} {\n${match[2].trim()}\n}`);
}
if (!consumerRules.length) {
  throw new Error(`${siteCssPath} does not contain any product-profile consumers`);
}

const compiledCss = [
  startMarker,
  `/* Generated from ${profileCssPath} and profile-token consumers in ${siteCssPath}. */`,
  profileCss,
  consumerRules.join("\n\n"),
  endMarker,
].join("\n");

const styleBlock = `  <style id="generated-product-profile">\n${compiledCss
  .split("\n")
  .map((line) => `    ${line}`)
  .join("\n")}\n  </style>`;

const scriptBlock = [
  "    const profileContract = doc.createElement('style');",
  "    profileContract.id = 'generated-product-profile';",
  `    profileContract.textContent = ${JSON.stringify(compiledCss)};`,
  "    doc.head.appendChild(profileContract);",
].join("\n");

function generate(source) {
  let result = source;
  result = result.replace(
    /<html\b[^>]*>/i,
    `<html data-product-profile="${profile}" data-system="editorial" data-accent="crimson">`,
  );

  const generatedStylePattern =
    /\s*<style id="generated-product-profile">[\s\S]*?\/\* GENERATED PRODUCT PROFILE: END \*\/\s*<\/style>/;
  if (generatedStylePattern.test(result)) {
    result = result.replace(generatedStylePattern, `\n${styleBlock}`);
  } else {
    result = result.replace(
      /(<title>Awesome Video — Editorial<\/title>)/,
      `$1\n${styleBlock}`,
    );
  }

  const generatedScriptPattern =
    /\s*const profileContract = doc\.createElement\('style'\);[\s\S]*?doc\.head\.appendChild\(profileContract\);/;
  if (generatedScriptPattern.test(result)) {
    result = result.replace(generatedScriptPattern, `\n${scriptBlock}`);
  } else {
    result = result.replace(
      /(const doc = new DOMParser\(\)\.parseFromString\(template, 'text\/html'\);)/,
      `$1\n${scriptBlock}`,
    );
  }

  result = result.replace(
    /\n\s*const profileRoot = getComputedStyle\(document\.documentElement\);[\s\S]*?(?=const doc = new DOMParser)/,
    "\n    ",
  );
  result = result.replace(
    /\n\s*doc\.documentElement\.setAttribute\('data-product-profile', 'standalone-exports'\);[\s\S]*?(?=const profileContract)/,
    `\n    doc.documentElement.setAttribute('data-product-profile', ${JSON.stringify(profile)});\n    `,
  );
  return result.replace(/[ \t]+$/gm, "");
}

const generated = generate(current);
if (generated === current) {
  console.log(`Standalone product profile: up to date (${consumerRules.length} consumer rules)`);
  process.exit(0);
}

if (checkOnly) {
  console.error(
    `Standalone product profile is stale. Run: npm run generate:standalone-product-profile`,
  );
  process.exit(1);
}

fs.writeFileSync(outputPath, generated);
console.log(`Generated ${outputPath} (${consumerRules.length} consumer rules)`);