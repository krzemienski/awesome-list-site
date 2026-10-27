import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronRight, Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import "@/styles/components/search-filters.css";
import {
  RESOURCE_FORMAT_LABELS, RESOURCE_PROVIDER_LABELS, RESOURCE_SEARCH_SORT_LABELS,
  RESOURCE_SKILL_LEVEL_LABELS, type ResourceFormat, type ResourceProvider,
  type ResourceSearchSort, type ResourceSkillLevel, type ResourceSearchFacets,
} from "@shared/resourceFacets-core";
import { normalizeTag } from "@/lib/tags";
import { label, offeredFacets, options, orList, tagLabel, type FilterState } from "./facet-options";

type Props = {
  state: FilterState;
  facets?: ResourceSearchFacets;
  onChange: (key: keyof FilterState, value: string | string[]) => void;
  onClear: () => void;
  /** Taxonomy listings already establish their category scope. */
  hideTaxonomyFacets?: boolean;
  /** The surface's own narrowing controls outside this panel, named when no facet applies. */
  otherControls: string[];
  /** Fires when the mobile Filters sheet opens or closes. */
  onSheetOpenChange?: (open: boolean) => void;
};

/**
 * Task #379 (uxv2-08): the tag facet used to render up to 80 rows, which alone
 * outnumbered a page of results (24) three to one. One page-worth is enough to
 * browse; the search box above the list is the way to reach the rest.
 */
const TAG_LIMIT = 24;
/** Rows a scrollable facet group shows before the rest need scrolling. */
const FACET_VISIBLE_ROWS = 6;
/** Tag rows the sidebar's max-h-56 (14rem) list holds; rows are 2.75rem. */
const TAG_VISIBLE_ROWS = 5;

const fieldLabel = (value: string) => value === "subSubcategory" ? "Sub-subcategory" : value
  .replace(/([a-z])([A-Z])/g, "$1 $2")
  .replace(/[-_]/g, " ")
  .replace(/\b\w/g, c => c.toUpperCase());

/**
 * Task #379 (uxv2-08): the sidebar listed seven always-open facet groups, so on
 * /search the filter inventory reached the results only after a long run of
 * controls. Long groups now open on demand.
 *
 * The disclosure applies to the persistent desktop sidebar only — the mobile
 * sheet stays fully expanded, because opening "Filters" IS the filtering task
 * there and the sheet never sits between the visitor and the results.
 *
 * A group with an active selection always opens, so a deep-linked filter stays
 * visible and removable. After that the visitor owns the state (local `open`),
 * which is why this is not driven straight off `forceOpen`.
 */
function FacetGroup({ title, testid, collapsible, defaultOpen, forceOpen, bodyClassName, footer, children }: { title: string; testid?: string; collapsible: boolean; defaultOpen: boolean; forceOpen: boolean; bodyClassName?: string; footer?: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen || forceOpen);
  useEffect(() => { if (forceOpen) setOpen(true); }, [forceOpen]);
  if (!collapsible) {
    return <fieldset className="min-w-0 space-y-1" data-testid={testid}>
      <legend className="eyebrow mb-2">{title}</legend>
      <div className={bodyClassName}>{children}</div>
      {footer}
    </fieldset>;
  }
  return <details className="group min-w-0" data-testid={testid} open={open} onToggle={e => setOpen(e.currentTarget.open)}>
    <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
      <ChevronRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-90" />
      {title}
    </summary>
    <div role="group" aria-label={title} className={cn("mt-1 space-y-1", bodyClassName)}>{children}</div>
    {footer}
  </details>;
}

function FacetList({ title, items, value, onSelect, testid, collapseInert = false, collapsible = false, defaultOpen = true, showAll = false }: { title: string; items: { value: string; count: number; label: string }[]; value: string; onSelect: (v: string) => void; testid: string; collapseInert?: boolean; collapsible?: boolean; defaultOpen?: boolean; showAll?: boolean }) {
  if (!items.length) return null;
  // P-07 / cf-audit F307: provider, format and skill level are NOT NULL, so a
  // facet with a single option matches every result and can't narrow anything
  // (today that option is "Not yet classified" for the whole catalog) — hide
  // the inert group. An active selection (e.g. a deep-linked ?provider=unknown)
  // still renders so its pressed state and removal stay reachable.
  if (collapseInert && items.length === 1 && !value) return null;
  // A clipped list whose cut falls on a row boundary reads as complete, and
  // overlay scrollbars stay hidden until scrolled, so say that more rows exist.
  const scrolls = !showAll && items.length > FACET_VISIBLE_ROWS;
  return <FacetGroup title={title} testid={testid} collapsible={collapsible} defaultOpen={defaultOpen} forceOpen={Boolean(value)} bodyClassName={cn(scrolls && "search-facet-scroll max-h-64 overflow-y-auto overscroll-contain pr-1")}
    footer={scrolls && <p className="search-facet-scroll-hint" data-testid={`facet-${testid}-scroll-hint`}>{items.length} options · scroll the list for more</p>}>
    {items.map(item => <button type="button" key={item.value} onClick={() => onSelect(value === item.value ? "" : item.value)} className="btn ghost search-facet-option" aria-pressed={value === item.value} aria-label={`${item.label}, ${item.count} ${item.count === 1 ? "result" : "results"}`} data-testid={`facet-${testid}-${item.value}`}>
      <span className="flex min-w-0 items-center gap-2">{value === item.value ? <Check className="h-3.5 w-3.5 shrink-0" /> : <span className="w-3.5 shrink-0" aria-hidden="true" />}<span className="truncate">{item.label}</span></span>{" "}<span className="shrink-0 font-mono text-xs normal-case text-muted-foreground">{item.count}</span>
    </button>)}
  </FacetGroup>;
}

export default function SearchFilters({ state, facets, onChange, onClear, hideTaxonomyFacets = false, otherControls, onSheetOpenChange }: Props) {
  const [open, setOpenState] = useState(false);
  const setOpen = (next: boolean) => { setOpenState(next); onSheetOpenChange?.(next); };
  const [tagSearch, setTagSearch] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  // The sheet stays open while facets are toggled so counts and results update
  // in place; the Done button (or the close control) is the only way out.
  const applyChange = onChange;
  const clear = onClear;
  const activeCount = [state.category, state.subcategory, state.subSubcategory, state.provider, state.format, state.skillLevel].filter(Boolean).length + state.tags.length;
  // Task #379: selected tags sort first so a deep-linked selection is never cut
  // off by TAG_LIMIT and always stays removable from the panel.
  const allTags = useMemo(() => options(facets?.tags, state.tags, undefined, tagLabel, normalizeTag), [facets?.tags, state.tags]);
  const tags = useMemo(() => {
    const selected = new Set(state.tags.map(t => t.toLowerCase()));
    return allTags
      .filter(x => x.label.toLowerCase().includes(tagSearch.toLowerCase()))
      .sort((a, b) => Number(selected.has(b.value.toLowerCase())) - Number(selected.has(a.value.toLowerCase())));
  }, [allTags, state.tags, tagSearch]);
  const listedTags = tags.slice(0, TAG_LIMIT);
  const unlistedTags = tags.length - listedTags.length;
  // When every group would render nothing (e.g. a listing whose resources are
  // all unclassified and untagged), say so instead of opening a blank panel.
  const hasFacets = offeredFacets(facets, state, hideTaxonomyFacets).length > 0;
  // The desktop sidebar is a persistent column, so its tag list scrolls in
  // place; the mobile sheet already scrolls as a whole, so there the list
  // takes the sheet's height instead of a 224px box inside it.
  const content = (collapsible: boolean) => {
    const tagsScroll = collapsible && listedTags.length > TAG_VISIBLE_ROWS;
    return <div className="space-y-6">
    <div className="flex items-center justify-between"><div><p className="text-sm font-semibold">Narrow results</p><p className="text-xs text-muted-foreground">Counts update for this combination.</p></div>{activeCount > 0 && <Button variant="ghost" size="sm" onClick={clear} data-testid="button-clear-filters">Clear all</Button>}</div>
    {facets && !hasFacets && <p className="text-sm text-muted-foreground" role="status" data-testid="text-no-facets">No further filters apply to these results.{otherControls.length > 0 && ` Use ${orList(otherControls)} to narrow them.`}</p>}
    {/* Category is the entry point into the taxonomy, so it stays open; the two
        drill-down levels and the tag list are the long ones and open on demand. */}
    {!hideTaxonomyFacets && <FacetList title="Category" items={options(facets?.categories, state.category)} value={state.category} onSelect={v => applyChange("category", v)} testid="category" showAll />}
    {!hideTaxonomyFacets && <FacetList title="Subcategory" items={options(facets?.subcategories, state.subcategory)} value={state.subcategory} onSelect={v => applyChange("subcategory", v)} testid="subcategory" collapsible={collapsible} defaultOpen={false} />}
    {!hideTaxonomyFacets && <FacetList title="Sub-subcategory" items={options(facets?.subSubcategories, state.subSubcategory)} value={state.subSubcategory} onSelect={v => applyChange("subSubcategory", v)} testid="sub-subcategory" collapsible={collapsible} defaultOpen={false} />}
    <FacetList title="Provider" items={options(facets?.providers, state.provider, RESOURCE_PROVIDER_LABELS)} value={state.provider} onSelect={v => applyChange("provider", v)} testid="provider" collapseInert />
    <FacetList title="Format" items={options(facets?.formats, state.format, RESOURCE_FORMAT_LABELS)} value={state.format} onSelect={v => applyChange("format", v)} testid="format" collapseInert />
    <FacetList title="Skill level" items={options(facets?.skillLevels, state.skillLevel, RESOURCE_SKILL_LEVEL_LABELS)} value={state.skillLevel} onSelect={v => applyChange("skillLevel", v)} testid="skill-level" collapseInert />
    {allTags.length > 0 && <FacetGroup title="Tags" collapsible={collapsible} defaultOpen={false} forceOpen={state.tags.length > 0} bodyClassName="space-y-2">
      <div className="relative"><Search className="absolute left-2.5 top-3.5 h-4 w-4 text-muted-foreground" /><Input value={tagSearch} onChange={e => setTagSearch(e.target.value)} placeholder="Find a tag" className="h-11 pl-8" aria-label="Search tags" data-testid="input-search-tags" /></div>
      <div className={cn(tagsScroll && "search-facet-scroll max-h-56 overflow-y-auto overscroll-contain pr-1")}>{listedTags.map(item => {
        const selected = state.tags.some(t => t.toLowerCase() === item.value.toLowerCase());
        return <button type="button" key={item.value} className="btn ghost search-facet-option" aria-pressed={selected} aria-label={`${item.label}, ${item.count} ${item.count === 1 ? "result" : "results"}`} onClick={() => applyChange("tags", selected ? state.tags.filter(t => t.toLowerCase() !== item.value.toLowerCase()) : [...state.tags, item.value])}><span className="flex min-w-0 items-center gap-2"><span aria-hidden="true" className="search-facet-check" data-selected={selected}>{selected && <Check className="h-3 w-3" />}</span><span className="truncate">{item.label}</span></span>{" "}<span className="shrink-0 font-mono text-xs normal-case text-muted-foreground">{item.count}</span></button>;
      })}</div>
      {tags.length === 0 && <p className="px-2 text-xs text-muted-foreground" role="status" data-testid="text-no-matching-tags">No tags match "{tagSearch.trim()}".</p>}
      {(tagsScroll || unlistedTags > 0) && <p className="search-facet-scroll-hint" data-testid="text-tag-list-status">
        {unlistedTags > 0 ? `${listedTags.length} of ${tags.length} tags listed` : `${listedTags.length} tags`}
        {tagsScroll && " · scroll the list for more"}
        {unlistedTags > 0 && `. Search to find the other ${unlistedTags}.`}
      </p>}
    </FacetGroup>}
  </div>;
  };
  return <><aside className="hidden w-64 shrink-0 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 lg:block">{content(true)}</aside>
    <div className="lg:hidden"><Sheet open={open} onOpenChange={setOpen}><SheetTrigger asChild><Button ref={triggerRef} variant="outline" className="min-h-11 gap-2" data-testid="button-open-filters"><SlidersHorizontal className="h-4 w-4" /> Filters {activeCount > 0 && <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs text-black">{activeCount}</span>}</Button></SheetTrigger><SheetContent side="left" className="w-[min(90vw,360px)] overflow-y-auto" onCloseAutoFocus={e => { e.preventDefault(); triggerRef.current?.focus(); }}><SheetHeader><SheetTitle>Filters</SheetTitle><SheetDescription data-testid="text-active-filter-count" aria-live="polite">{activeCount === 0 ? "No filters applied." : `${activeCount} ${activeCount === 1 ? "filter" : "filters"} applied.`}</SheetDescription></SheetHeader><div className="mt-5">{content(false)}</div><div className="sticky bottom-0 -mx-6 mt-6 border-t border-[var(--border)] bg-background px-6 py-3"><Button className="min-h-11 w-full" onClick={() => setOpen(false)} data-testid="button-close-filters">Done</Button></div></SheetContent></Sheet></div></>;
}

export function ActiveFilters({ state, onChange, onClear, defaultSort = "relevance" }: { state: FilterState; onChange: (key: keyof FilterState, value: string | string[]) => void; onClear: () => void; defaultSort?: string }) {
  const chips: { key: keyof FilterState; value: string; text: string }[] = [];
  const chipLabels: Partial<Record<keyof FilterState, Record<string, string>>> = { provider: RESOURCE_PROVIDER_LABELS, format: RESOURCE_FORMAT_LABELS, skillLevel: RESOURCE_SKILL_LEVEL_LABELS };
  (["category", "subcategory", "subSubcategory", "provider", "format", "skillLevel"] as const).forEach(key => { if (state[key]) { const value = state[key] as string; chips.push({ key, value, text: `${fieldLabel(key)}: ${chipLabels[key]?.[value] ?? label(value)}` }); } });
  if (state.sort && state.sort !== defaultSort && !(state.sort in RESOURCE_SEARCH_SORT_LABELS)) {
    chips.push({ key: "sort", value: state.sort, text: `Unsupported sort: ${state.sort}` });
  }
  state.tags.forEach(tag => chips.push({ key: "tags", value: tag, text: `Tag: ${tagLabel(tag)}` }));
  if (!chips.length) return null;
  return <div className="flex flex-wrap items-center gap-2" data-testid="active-filter-chips">{chips.map(chip => <button type="button" key={`${chip.key}-${chip.value}`} onClick={() => onChange(chip.key, chip.key === "tags" ? state.tags.filter(t => t.toLowerCase() !== chip.value.toLowerCase()) : chip.key === "sort" ? defaultSort : "")} className="btn ghost search-filter-chip" aria-label={`Remove ${chip.text}`}>{chip.text}<X className="h-3.5 w-3.5" /></button>)}<Button variant="link" size="sm" onClick={onClear} data-testid="button-clear-all-filters">Clear all</Button></div>;
}

export const sortLabels = RESOURCE_SEARCH_SORT_LABELS as Record<string, string>;