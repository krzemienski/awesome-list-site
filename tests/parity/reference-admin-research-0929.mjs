import fs from "node:fs";
import crypto from "node:crypto";
import esbuild from "esbuild";
import postcss from "postcss";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";

const FILES = {
  researcher: "client/src/components/admin/ResearcherTab.tsx",
  workspace: "client/src/components/admin/ResearchWorkspace.tsx",
  queues: "client/src/components/admin/queues-agent.css",
  primitives: "client/src/components/admin/AdminOpsPrimitives.tsx",
  primitiveCss: "client/src/components/admin/admin-ops-primitives.css",
  utils: "client/src/lib/utils.ts",
  button: "client/src/components/ui/button.tsx",
  profiles: "shared/styles/product-profiles.css",
  bridge: "client/src/styles/app-bridge.css",
};
const read = (file) => fs.readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");
const requireMatch = (source, pattern, label) => {
  const match = source.match(pattern);
  if (!match) throw new Error(`0929 admin research source drift: ${label}`);
  return match;
};
const compile = (source, bindings, result) => new Function(...Object.keys(bindings),
  esbuild.transformSync(source.replace(/\bexport /g, ""), { loader: "tsx", jsx: "transform", format: "cjs" }).code + `\nreturn ${result};`,
)(...Object.values(bindings));
const cn = (...values) => values.filter(Boolean).join(" ");

export function getResearcherQuery0929() {
  const source = read(FILES.researcher);
  const limit = Number(requireMatch(source, /const \[jobsLimit, setJobsLimit\] = useState\((\d+)\);/, "initial jobs window")[1]);
  const rows = Number(requireMatch(source, /^const CANONICAL_JOB_ROWS = (\d+);$/m, "visible job rows")[1]);
  for (const token of [
    "fetch(`/api/researcher/jobs?limit=${jobsLimit}`, { credentials: 'include' })",
    "const [showAllJobs, setShowAllJobs] = useState(false);",
    "const visibleJobs = showAllJobs ? (jobs ?? []) : (jobs ?? []).slice(0, CANONICAL_JOB_ROWS);",
    "const hasMoreJobs = !!jobs && (jobs.length > visibleJobs.length || jobsTotal > jobs.length);",
  ]) {
    if (!source.includes(token)) throw new Error(`0929 researcher query source drift: ${token}`);
  }
  if (!Number.isInteger(limit) || limit < rows || rows < 1) throw new Error("0929 researcher query window is invalid");
  return { route: `/api/researcher/jobs?limit=${limit}`, limit, rows };
}

/**
 * Only the settled, initially visible canonical form/table and closed disclosure
 * are rendered. The JSX, date/cost formatters, primitives and initial field
 * values are compiled from source, not copied from a screenshot or fixtures.
 */
export function bindResearcher0929(body) {
  const query = getResearcherQuery0929();
  if (!Array.isArray(body?.jobs) || !Number.isInteger(body.total) || body.total < body.jobs.length || body.jobs.length > query.limit) {
    throw new Error(`${query.route} must return a complete { jobs, total } initial window`);
  }
  body.jobs.forEach((job, index) => {
    if (!job || !Number.isInteger(job.id) || typeof job.status !== "string" ||
      (job.prompt != null && typeof job.prompt !== "string") ||
      (job.createdAt != null && !Number.isFinite(Date.parse(job.createdAt))) ||
      (job.estimatedCostUsd != null && !Number.isFinite(Number(job.estimatedCostUsd)))) {
      throw new Error(`${query.route} malformed research job at index ${index}`);
    }
    for (const field of ["totalDiscoveries", "approvedDiscoveries", "rejectedDiscoveries", "turnsUsed", "maxTurns"]) {
      if (job[field] != null && (!Number.isInteger(job[field]) || job[field] < 0)) {
        throw new Error(`${query.route} malformed ${field} at index ${index}`);
      }
    }
  });
  const source = read(FILES.researcher);
  const canonical = requireMatch(source,
    /      <div className="queues-agent__canonical">[\s\S]*?\n      <\/div>\n      <details className="queues-agent__more">/,
    "canonical form/table boundaries")[0].split('\n      <details')[0];
  // Approved deviation: no unreviewed-publication toggle or pretend preset
  // action is introduced. Fail closed if the application later adds either.
  if (/Auto-approve|Save preset|autoApprove|savePreset/i.test(source)) {
    throw new Error("0929 researcher absence contract drift: Auto-approve / Save preset now exist");
  }
  const summary = requireMatch(source, /<summary className="btn ghost">([^<]+)<\/summary>/, "closed advanced summary")[0];
  if (!source.includes('<details className="queues-agent__more">')) throw new Error("0929 researcher disclosure must start closed");
  const primitives = read(FILES.primitives);
  const tableShell = requireMatch(primitives, /export function TableShell\([\s\S]*?\n\}(?=\n|$)/, "TableShell declaration")[0];
  const status = requireMatch(primitives, /const STATUS_VARIANTS:[\s\S]*?export function StatusChip\([\s\S]*?\n\}/, "StatusChip declaration")[0];
  const { TableShell, StatusChip } = compile(`${tableShell}\n${status}`, { React, cn }, "{ TableShell, StatusChip }");
  const button = read(FILES.button).replace(/^import .*$/gm, "").replace(/^export \{.*$/gm, "");
  const Button = compile(button, { React, Slot, cva, cn }, "Button");
  const cost = requireMatch(source, /function formatCost\([\s\S]*?\n\}/, "cost formatter")[0];
  const date = requireMatch(read(FILES.utils), /export function formatAdminDate\([\s\S]*?\n\}/, "admin date formatter")[0];
  const { formatCost, formatAdminDate } = compile(`${cost}\n${date}`, {}, "{ formatCost, formatAdminDate }");
  const maxTurns = requireMatch(source, /const \[maxTurns, setMaxTurns\] = useState\(("[^"]*")\);/, "initial max turns")[1];
  const maxBudget = requireMatch(source, /const \[maxBudget, setMaxBudget\] = useState\(("[^"]*")\);/, "initial budget")[1];
  const prompt = requireMatch(source, /const \[prompt, setPrompt\] = useState\(("[^"]*")\);/, "initial prompt")[1];
  const visibleJobs = body.jobs.slice(0, query.rows);
  const noop = () => {};
  const Render = compile(`function Render() { return (<div className="queues-agent queues-agent--research">
    ${canonical}
    <details className="queues-agent__more">${summary}</details>
  </div>); }`, {
    React, TableShell, StatusChip, Button, formatCost, formatAdminDate,
    prompt: JSON.parse(prompt), maxTurns: JSON.parse(maxTurns), maxBudget: JSON.parse(maxBudget),
    jobs: body.jobs, jobsTotal: body.total, visibleJobs,
    hasMoreJobs: body.jobs.length > visibleJobs.length || body.total > body.jobs.length,
    jobsLoading: false, showAllJobs: false, activeJobStateKnown: true,
    activeJobs: body.jobs.filter((job) => job.status === "processing" || job.status === "pending"),
    startMutation: { isPending: false }, jobsRegionRef: null, jobsMoreFocusPending: { current: false },
    setPrompt: noop, setMaxTurns: noop, setMaxBudget: noop, handleLaunch: noop,
    setJobsLimit: noop, setShowAllJobs: noop,
  }, "Render");
  return { markup: renderToStaticMarkup(React.createElement(Render)), query, total: body.total, visible: visibleJobs.length };
}

export function buildAdminResearch0929() {
  getResearcherQuery0929();
  const workspace = read(FILES.workspace);
  for (const token of ['className="admin-research-note__open w-full text-left"', "<h3 title={note.title}>{note.title}</h3>"]) {
    if (!workspace.includes(token)) throw new Error(`0929 research note structure drift: ${token}`);
  }
  const queues = postcss.parse(read(FILES.queues));
  const clamp = [];
  queues.walkRules(".admin-research-note .admin-research-note__open h3", (rule) => {
    clamp.push(...rule.nodes.filter((node) => node.type === "decl").map(({ prop, value }) => ({ prop, value })));
  });
  const clampValues = Object.fromEntries(clamp.map(({ prop, value }) => [prop, value]));
  if (clamp.length !== 5 || Object.keys(clampValues).length !== 5 ||
    clampValues["-webkit-line-clamp"] !== "2" || clampValues["-webkit-box-orient"] !== "vertical" ||
    clampValues.display !== "-webkit-box" || clampValues.overflow !== "hidden" ||
    !Number.isFinite(Number(clampValues["line-height"]))) {
    throw new Error("0929 research note two-line clamp declaration drift");
  }
  const rules = [];
  const include = (selector) => (
    selector.startsWith(".queues-agent") &&
    !/__(?:more \.grid|stat|table-shell|table-heading|table-title|table-body|control|active|graph|event)/.test(selector)
  ) || selector.startsWith(".admin-ops-table-shell") || selector.startsWith(".admin-ops-status-chip");
  for (const css of [read(FILES.primitiveCss), read(FILES.queues)]) {
    postcss.parse(css).walkRules((rule) => {
      const selectors = rule.selectors.filter(include);
      if (!selectors.length) return;
      const media = [];
      for (let parent = rule.parent; parent?.type !== "root"; parent = parent.parent) {
        if (parent.type !== "atrule" || parent.name !== "media") return;
        media.push(parent.params);
      }
      rules.push({ selector: selectors.join(", "), media,
        declarations: rule.nodes.filter((node) => node.type === "decl").map(({ prop, value, important }) => ({ prop, value, important })) });
    });
  }
  for (const selector of [".queues-agent", ".queues-agent__canonical", ".queues-agent__canonical-table--research .table", ".queues-agent__table-more"]) {
    if (!rules.some((rule) => rule.selector === selector)) throw new Error(`0929 researcher layout declaration missing: ${selector}`);
  }
  const heights = new Set([...read(FILES.profiles).matchAll(/--profile-control-height:\s*([^;]+);/g)].map((m) => m[1].trim()));
  if (heights.size !== 1 || !read(FILES.button).includes("min-h-[max(44px,var(--profile-control-height))] min-w-[44px]")) {
    throw new Error("0929 researcher Button control floor declaration drift");
  }
  const tokens = Object.fromEntries(["ok", "warn", "bad"].map((tone) => {
    const match = requireMatch(read(FILES.bridge), new RegExp(`--status-${tone}:\\s*([^;]+);`), `status ${tone} token`);
    return [`--status-${tone}`, match[1].trim()];
  }));
  return { clamp, rules, tokens, controlHeight: [...heights][0],
    sourceProof: Object.values(FILES).map((file) => ({ file, sha256: crypto.createHash("sha256").update(read(file)).digest("hex") })) };
}

export async function applyAdminResearch0929(page, reconciliation) {
  const projection = reconciliation.adminResearch0929;
  if (!projection) throw new Error("0929 admin research projection is missing");
  const result = await page.evaluate(({ clamp, rules, tokens, controlHeight }) => {
    const headings = [...document.querySelectorAll("h3")];
    const workspace = headings.find((node) => node.textContent.trim() === "Research workspace");
    const researcher = headings.find((node) => node.textContent.trim() === "Run a research task");
    if (!workspace && !researcher) return { status: "not-applicable", modified: [] };
    if (workspace && researcher) throw new Error("0929 admin research screen is ambiguous");
    if (workspace) {
      const grid = workspace.nextElementSibling?.nextElementSibling;
      if (!grid || grid.style.display !== "grid" || !grid.style.gridTemplateColumns.includes("240px")) {
        throw new Error("0929 Research workspace note-grid structure drift");
      }
      [...grid.children].forEach((card) => {
        const [eyebrow, title, meta] = card.children;
        if (card.children.length !== 3 || !eyebrow.textContent.startsWith("NOTE ·") || meta.children.length !== 2) {
          throw new Error("0929 Research workspace note-card structure drift");
        }
        clamp.forEach(({ prop, value }) => title.style.setProperty(prop, value));
      });
      return { status: "applied", modified: ["research-note-title:source-two-line-clamp-and-leading"] };
    }
    const root = researcher.parentElement?.parentElement;
    if (!root || root.children.length !== 2 || !root.querySelector("table") ||
      ![...root.querySelectorAll("label")].some((label) => label.textContent === "Auto-approve") ||
      ![...root.querySelectorAll("button")].some((button) => button.textContent === "Save preset")) {
      throw new Error("0929 Researcher canonical form/table structure drift");
    }
    const data = window.AV_RESEARCHER_0929;
    if (!data?.markup || !Number.isInteger(data.visible)) throw new Error("0929 Researcher live initial-window binding is missing");
    const template = document.createElement("template");
    template.innerHTML = data.markup;
    const replacement = template.content.firstElementChild;
    if (!replacement || replacement.querySelectorAll("tbody tr").length !== data.visible ||
      replacement.querySelector("details")?.hasAttribute("open")) {
      throw new Error("0929 Researcher rendered initial-window structure drift");
    }
    root.replaceWith(replacement);
    Object.entries(tokens).forEach(([prop, value]) => replacement.style.setProperty(prop, value));
    replacement.style.setProperty("--profile-control-height", controlHeight);
    for (const { selector, media, declarations } of rules) {
      if (!media.every((query) => matchMedia(query).matches)) continue;
      const nodes = [...replacement.querySelectorAll(selector)];
      if (replacement.matches(selector)) nodes.unshift(replacement);
      nodes.forEach((node) => declarations.forEach(({ prop, value, important }) => node.style.setProperty(prop, value, important ? "important" : "")));
    }
    replacement.querySelectorAll("button.btn").forEach((node) => {
      node.style.minHeight = "max(44px,var(--profile-control-height))";
      node.style.minWidth = "44px";
    });
    return { status: "applied", modified: [
      "researcher:source-rendered-live-initial-window-form-and-table",
      "researcher:source-approved-no-auto-approve-or-save-preset",
      "researcher:source-closed-advanced-disclosure-and-show-more",
      "researcher:source-table-horizontal-containment-and-control-floor",
    ] };
  }, projection);
  return { ...result, sourceProof: projection.sourceProof };
}
