import { z } from "zod";

export const RESOURCE_KIND_VALUES = [
  "tools",
  "libraries",
  "standards",
  "events",
  "protocols",
  "other",
] as const;

export const resourceKindSchema = z.enum(RESOURCE_KIND_VALUES);
export const nullableResourceKindSchema = resourceKindSchema.nullable();

export type ResourceKind = z.infer<typeof resourceKindSchema>;
export type ResourceKindCounts = Record<ResourceKind, number>;
export type ResourceKindTagMappings = Partial<Record<ResourceKind, readonly string[]>>;

const GENERIC_KIND_TAG_MAPPINGS: Record<ResourceKind, readonly string[]> = {
  tools: ["tool", "tools", "utility", "utilities", "software", "app", "application"],
  libraries: ["library", "libraries", "framework", "frameworks", "sdk", "sdks"],
  standards: ["standard", "standards", "spec", "specification", "specifications"],
  events: ["event", "events", "conference", "conferences", "meetup", "meetups"],
  protocols: ["protocol", "protocols", "transport"],
  other: [],
};

export function normalizeResourceKindTag(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildResourceKindTagMappings(
  configured: ResourceKindTagMappings = {},
): Record<ResourceKind, readonly string[]> {
  return Object.fromEntries(
    RESOURCE_KIND_VALUES.map((kind) => [
      kind,
      Array.from(
        new Set(
          [...(configured[kind] ?? []), ...GENERIC_KIND_TAG_MAPPINGS[kind]]
            .map(normalizeResourceKindTag)
            .filter(Boolean),
        ),
      ),
    ]),
  ) as unknown as Record<ResourceKind, readonly string[]>;
}

export function resolveResourceKind(
  storedKind: ResourceKind | null | undefined,
  tags: readonly unknown[] | null | undefined,
  configured: ResourceKindTagMappings = {},
): ResourceKind {
  if (storedKind && resourceKindSchema.safeParse(storedKind).success) return storedKind;
  const normalizedTags = new Set(
    (tags ?? [])
      .filter((tag): tag is string => typeof tag === "string")
      .map(normalizeResourceKindTag)
      .filter(Boolean),
  );
  const mappings = buildResourceKindTagMappings(configured);
  for (const kind of RESOURCE_KIND_VALUES) {
    if (kind === "other") continue;
    if (mappings[kind].some((tag) => normalizedTags.has(tag))) return kind;
  }
  return "other";
}

export function emptyResourceKindCounts(): ResourceKindCounts {
  return {
    tools: 0,
    libraries: 0,
    standards: 0,
    events: 0,
    protocols: 0,
    other: 0,
  };
}