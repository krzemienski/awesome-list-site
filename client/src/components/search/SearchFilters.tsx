import { useMemo, useState } from "react";
import { Check, Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  RESOURCE_FORMAT_LABELS, RESOURCE_PROVIDER_LABELS, RESOURCE_SEARCH_SORT_LABELS,
  RESOURCE_SKILL_LEVEL_LABELS, type ResourceFormat, type ResourceProvider,
  type ResourceSearchSort, type ResourceSkillLevel, type ResourceSearchFacets,
} from "@shared/resourceFacets";

type State = { category: string; subcategory: string; subSubcategory: string; tags: string[]; provider: string; format: string; skillLevel: string; sort: string };
type Props = {
  state: State;
  facets?: ResourceSearchFacets;
  onChange: (key: keyof State, value: string | string[]) => void;
  onClear: () => void;
  /** Taxonomy listings already establish their category scope. */
  hideTaxonomyFacets?: boolean;
};
type Count = { value: string; count: number };

const label = (value: string) => value === "unknown" ? "Not yet classified" : value.replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
const fieldLabel = (value: string) => value
  .replace(/([a-z])([A-Z])/g, "$1 $2")
  .replace(/[-_]/g, " ")
  .replace(/\b\w/g, c => c.toUpperCase());
const options = (counts: Count[] | undefined, selected: string | string[], labels?: Record<string, string>) => {
  const values = new Map((counts ?? []).map(c => [c.value, c.count]));
  const selectedValues = Array.isArray(selected) ? selected : selected ? [selected] : [];
  for (const value of selectedValues) {
    if (!values.has(value)) values.set(value, 0);
  }
  return [...values].map(([value, count]) => ({ value, count, label: labels?.[value] ?? label(value) }));
};

function FacetList({ title, items, value, onSelect, testid, collapseInert = false }: { title: string; items: { value: string; count: number; label: string }[]; value: string; onSelect: (v: string) => void; testid: string; collapseInert?: boolean }) {
  if (!items.length) return null;
  // P-07: when the ONLY option a facet offers is "Not yet classified" (i.e. the
  // whole catalog is unclassified for this dimension), the filter can't narrow
  // anything — collapse the group so the taxonomy-page sidebar isn't cluttered
  // with an inert, single-option filler row. Only applied on taxonomy listings
  // (collapseInert): the /search page keeps every facet clickable so the
  // ?provider=unknown deep-link workflow (pinned by url-params-audit) still
  // works. A deep-linked ?provider=unknown selection still renders here (so its
  // active state / removal chip stays reachable); the API + chips are untouched.
  const onlyUnclassified = items.every((item) => item.value === "unknown");
  if (collapseInert && onlyUnclassified && value !== "unknown") return null;
  return <fieldset className="min-w-0 space-y-1" data-testid={testid}><legend className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</legend>
    <div className={cn(items.length > 6 && "max-h-64 overflow-y-auto overscroll-contain pr-1")}>
      {items.map(item => <button type="button" key={item.value} onClick={() => onSelect(value === item.value ? "" : item.value)} className={cn("flex min-h-11 w-full items-center justify-between gap-2 rounded-md px-2 text-left text-sm transition-colors hover:bg-muted", value === item.value && "bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)]")} aria-pressed={value === item.value} aria-label={`${value === item.value ? "Remove" : "Apply"} ${item.label} ${title.toLowerCase()} filter, ${item.count} results`} data-testid={`facet-${testid}-${item.value}`}>
        <span className="flex min-w-0 items-center gap-2">{value === item.value ? <Check className="h-3.5 w-3.5 shrink-0" /> : <span className="w-3.5" />}<span className="truncate">{item.label}</span></span><span className="shrink-0 font-mono text-xs text-muted-foreground">{item.count}</span>
      </button>)}
    </div>
  </fieldset>;
}

export default function SearchFilters({ state, facets, onChange, onClear, hideTaxonomyFacets = false }: Props) {
  const [open, setOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState("");
  const applyChange = (key: keyof State, value: string | string[]) => {
    setOpen(false);
    onChange(key, value);
  };
  const clear = () => {
    setOpen(false);
    onClear();
  };
  const activeCount = [state.category, state.subcategory, state.subSubcategory, state.provider, state.format, state.skillLevel].filter(Boolean).length + state.tags.length;
  const tags = useMemo(() => options(facets?.tags, state.tags).filter(x => x.label.toLowerCase().includes(tagSearch.toLowerCase())), [facets?.tags, state.tags, tagSearch]);
  const content = <div className="space-y-6">
    <div className="flex items-center justify-between"><div><p className="text-sm font-semibold">Narrow results</p><p className="text-xs text-muted-foreground">Counts update for this combination.</p></div>{activeCount > 0 && <Button variant="ghost" size="sm" onClick={clear} data-testid="button-clear-filters">Clear all</Button>}</div>
    {!hideTaxonomyFacets && <FacetList title="Category" items={options(facets?.categories, state.category)} value={state.category} onSelect={v => applyChange("category", v)} testid="category" />}
    {!hideTaxonomyFacets && <FacetList title="Subcategory" items={options(facets?.subcategories, state.subcategory)} value={state.subcategory} onSelect={v => applyChange("subcategory", v)} testid="subcategory" />}
    {!hideTaxonomyFacets && <FacetList title="Sub-subcategory" items={options(facets?.subSubcategories, state.subSubcategory)} value={state.subSubcategory} onSelect={v => applyChange("subSubcategory", v)} testid="sub-subcategory" />}
    <FacetList title="Provider" items={options(facets?.providers, state.provider, RESOURCE_PROVIDER_LABELS)} value={state.provider} onSelect={v => applyChange("provider", v)} testid="provider" collapseInert={hideTaxonomyFacets} />
    <FacetList title="Format" items={options(facets?.formats, state.format, RESOURCE_FORMAT_LABELS)} value={state.format} onSelect={v => applyChange("format", v)} testid="format" collapseInert={hideTaxonomyFacets} />
    <FacetList title="Skill level" items={options(facets?.skillLevels, state.skillLevel, RESOURCE_SKILL_LEVEL_LABELS)} value={state.skillLevel} onSelect={v => applyChange("skillLevel", v)} testid="skill-level" collapseInert={hideTaxonomyFacets} />
    <fieldset className="min-w-0 space-y-2"><legend className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Tags</legend>
      <div className="relative"><Search className="absolute left-2.5 top-3.5 h-4 w-4 text-muted-foreground" /><Input value={tagSearch} onChange={e => setTagSearch(e.target.value)} placeholder="Find a tag" className="h-11 pl-8" aria-label="Search tags" data-testid="input-search-tags" /></div>
      <div className="max-h-56 overflow-y-auto pr-1">{tags.slice(0, 80).map(item => {
        const selected = state.tags.some(t => t.toLowerCase() === item.value.toLowerCase());
        return <button type="button" key={item.value} className="flex min-h-11 w-full items-center justify-between gap-2 rounded-md px-2 text-left text-sm hover:bg-muted" aria-pressed={selected} aria-label={`${selected ? "Remove" : "Apply"} ${item.label} tag filter`} onClick={() => applyChange("tags", selected ? state.tags.filter(t => t.toLowerCase() !== item.value.toLowerCase()) : [...state.tags, item.value])}><span className="flex min-w-0 items-center gap-2"><span aria-hidden="true" className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border", selected && "border-[var(--accent)] bg-[var(--accent)] text-black")}>{selected && <Check className="h-3 w-3" />}</span><span className="truncate">{item.label}</span></span><span className="shrink-0 font-mono text-xs text-muted-foreground">{item.count}</span></button>;
      })}</div>
      {tags.length > 80 && <p className="px-2 text-xs text-muted-foreground">Showing 80 tags. Refine your tag search to see more.</p>}
    </fieldset>
  </div>;
  return <><aside className="hidden w-64 shrink-0 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 lg:block">{content}</aside>
    <div className="lg:hidden"><Sheet open={open} onOpenChange={setOpen}><SheetTrigger asChild><Button variant="outline" className="min-h-11 gap-2" data-testid="button-open-filters"><SlidersHorizontal className="h-4 w-4" /> Filters {activeCount > 0 && <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs text-black">{activeCount}</span>}</Button></SheetTrigger><SheetContent side="left" className="w-[min(90vw,360px)] overflow-y-auto"><SheetHeader><SheetTitle>Filters</SheetTitle></SheetHeader><div className="mt-5">{content}</div></SheetContent></Sheet></div></>;
}

export function ActiveFilters({ state, onChange, onClear, defaultSort = "relevance" }: { state: State; onChange: (key: keyof State, value: string | string[]) => void; onClear: () => void; defaultSort?: string }) {
  const chips: { key: keyof State; value: string; text: string }[] = [];
  (["category", "subcategory", "subSubcategory", "provider", "format", "skillLevel"] as const).forEach(key => { if (state[key]) chips.push({ key, value: state[key] as string, text: `${fieldLabel(key)}: ${label(state[key] as string)}` }); });
  if (state.sort && state.sort !== defaultSort && !(state.sort in RESOURCE_SEARCH_SORT_LABELS)) {
    chips.push({ key: "sort", value: state.sort, text: `Unsupported sort: ${state.sort}` });
  }
  state.tags.forEach(tag => chips.push({ key: "tags", value: tag, text: `Tag: ${tag}` }));
  if (!chips.length) return null;
  return <div className="flex flex-wrap items-center gap-2" data-testid="active-filter-chips">{chips.map(chip => <button type="button" key={`${chip.key}-${chip.value}`} onClick={() => onChange(chip.key, chip.key === "tags" ? state.tags.filter(t => t.toLowerCase() !== chip.value.toLowerCase()) : chip.key === "sort" ? defaultSort : "")} className="inline-flex min-h-11 items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-xs hover:border-[var(--accent)]" aria-label={`Remove ${chip.text}`}>{chip.text}<X className="h-3.5 w-3.5" /></button>)}<Button variant="link" size="sm" onClick={onClear} data-testid="button-clear-all-filters">Clear all</Button></div>;
}

export const sortLabels = RESOURCE_SEARCH_SORT_LABELS as Record<string, string>;