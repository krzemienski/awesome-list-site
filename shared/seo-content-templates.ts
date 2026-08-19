import {
  RESOURCE_FORMAT_LABELS,
  type ResourceFormat,
} from "./resourceFacets";

export type TaxonomyLevel = "category" | "subcategory" | "sub-subcategory";

export interface TaxonomyIntroInput {
  name: string;
  level: TaxonomyLevel;
  totalResources: number;
  parentNames?: string[];
  childNames?: string[];
  formats?: string[];
}

export interface ResourceFactsInput {
  title: string;
  taxonomy: string[];
  provider: string;
  format: string;
  skillLevel: string;
  tags?: string[];
}

function list(items: string[], limit = 4): string {
  const values = [...new Set(items.map((item) => item.trim()).filter(Boolean))]
    .slice(0, limit);
  if (values.length === 0) return "";
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
}

function formatLabel(value: string): string {
  return (
    RESOURCE_FORMAT_LABELS[value as ResourceFormat] ??
    value.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
  );
}

export function taxonomyScopeIntro(input: TaxonomyIntroInput): string {
  const total = Number.isFinite(input.totalResources)
    ? Math.max(0, input.totalResources)
    : 0;
  const resourceCount = `${total.toLocaleString("en-US")} curated resource${total === 1 ? "" : "s"}`;
  const parents = list(input.parentNames ?? [], 2);
  const children = list(input.childNames ?? []);
  const formats = list(
    (input.formats ?? [])
      .filter((format) => format && format !== "unknown")
      .map(formatLabel),
  );

  let lead: string;
  if (input.level === "category") {
    lead = `${input.name} brings together ${resourceCount} from across the video technology landscape.`;
  } else if (input.level === "subcategory") {
    lead = `${input.name} is a focused collection within ${parents || "video technology"}, with ${resourceCount}.`;
  } else {
    lead = `${input.name} covers a specific part of ${parents || "video technology"} and includes ${resourceCount}.`;
  }

  const details = [
    children ? `Notable topics include ${children}.` : "",
    formats ? `Available formats include ${formats}.` : "",
  ].filter(Boolean);

  return [lead, ...details].join(" ");
}

export function resourceFactsSummary(input: ResourceFactsInput): string {
  const taxonomy = list(input.taxonomy, 3);
  const tags = list(input.tags ?? [], 5);
  const classification = [
    `Provider: ${input.provider}.`,
    `Format: ${input.format}.`,
    `Skill level: ${input.skillLevel}.`,
  ].join(" ");
  return [
    taxonomy
      ? `${input.title} is cataloged in ${taxonomy}.`
      : `${input.title} is part of the Awesome Video resource library.`,
    classification,
    tags ? `Its topics include ${tags}.` : "",
  ].filter(Boolean).join(" ");
}