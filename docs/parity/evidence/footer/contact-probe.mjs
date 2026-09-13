import { chromium } from "/home/runner/workspace/node_modules/playwright/index.mjs";
import fs from "node:fs";

const browser = await chromium.launch({
  headless: true,
  executablePath: "/home/runner/workspace/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome",
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
await page.goto("http://127.0.0.1:5000/about");
const [config, nav] = await page.evaluate(() =>
  Promise.all([
    fetch("/api/config").then((response) => response.json()),
    fetch("/api/awesome-list/nav").then((response) => response.json()),
  ]),
);
await page.evaluate(async ({ config, nav }) => {
  const source = await fetch("/src/main.tsx").then((response) => response.text());
  const reactDomUrl = source.match(/from "([^"]*react-dom_client.js[^"]*)"/)[1];
  const { default: { createRoot } } = await import(reactDomUrl);
  const { default: React } = await import(reactDomUrl.replace("react-dom_client.js", "react.js"));
  const queryModule = await import(
    "/@fs/home/runner/workspace/node_modules/.vite/deps/@tanstack_react-query.js?v=be5c9ae3"
  );
  const QueryClientProvider = queryModule.QueryClientProvider ?? queryModule.default.QueryClientProvider;
  const { queryClient } = await import("/src/lib/queryClient.ts");
  const { default: Footer } = await import("/src/components/layout/new/AppFooter.tsx");
  const host = document.createElement("div");
  document.body.replaceChildren(host);
  createRoot(host).render(
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(Footer, {
        nav,
        site: {
          name: config.site.title,
          tagline: config.site.description,
          repoUrl: "https://github.com/krzemienski/awesome-video",
          repoBranch: "master",
        },
      }),
    ),
  );
}, { config, nav });
await page.waitForSelector("[data-testid=site-footer]");
await page.waitForTimeout(1500);
const result = await page.evaluate(() => ({
  variantLinks: [...document.querySelectorAll("[data-testid^=contact-]")].map((element) => ({
    id: element.getAttribute("data-testid"),
    href: element.getAttribute("href"),
    text: element.textContent.trim(),
  })),
  issueTexts: [...document.querySelectorAll("[data-testid=site-footer] a,[data-testid=site-footer] span")]
    .map((element) => element.textContent.trim())
    .filter((text) => /report an issue/i.test(text)),
  contactChunk: [...performance.getEntriesByType("resource")]
    .some((entry) => entry.name.includes("contact-footer")),
}));
fs.writeFileSync("/tmp/contact-footer-result.json", JSON.stringify(result, null, 2));
console.log(result);
await browser.close();