import type { ReactNode } from "react";
import { Link } from "wouter";
import type { AwesomeListNavNode } from "@/lib/static-data";
import type { Resource } from "@/types/awesome-list";
import { ParityPage } from "./ParityPage";

export type HomeLayout = "index" | "curated";
export type ResourceKind = "tools" | "libraries" | "standards" | "events" | "protocols" | "other";

export const RESOURCE_KINDS: ReadonlyArray<{ id: ResourceKind; label: string }> = [
  { id: "tools", label: "Tools & SDKs" },
  { id: "libraries", label: "Libraries" },
  { id: "standards", label: "Standards" },
  { id: "events", label: "Events" },
  { id: "protocols", label: "Protocols" },
  { id: "other", label: "Other" },
];

type HomeResource = Resource & { featured?: boolean; resolvedKind?: ResourceKind | null; kind?: ResourceKind | null };
type CategoryItem = {
  name: string;
  slug: string;
  displayCount: number;
  subcategories?: AwesomeListNavNode[];
  preview: HomeResource[];
};

interface HomePresentationProps {
  layout: HomeLayout;
  onLayoutChange: (layout: HomeLayout) => void;
  totalResources: number;
  totalCategories: number;
  totalSubcategories: number;
  nestedGroupCount: number;
  featuredCount: number;
  categories: CategoryItem[];
  featured: HomeResource[];
  recent: HomeResource[];
  activeKind: ResourceKind | null;
  kindCounts: Record<ResourceKind, number>;
  onKindChange: (kind: ResourceKind | null) => void;
  preservedFilterSearch: string;
  filtersActive: boolean;
  onClearFilters: () => void;
  controls?: ReactNode;
  notices?: ReactNode;
  accountContent?: ReactNode;
  recommendations?: ReactNode;
}

function resourceHref(resource: HomeResource) {
  return `/resource/${encodeURIComponent(String(resource.id))}`;
}

function ResourceCard({ resource }: { resource: HomeResource }) {
  const tags = resource.tags ?? resource.metadata?.tags ?? [];
  return (
    <Link href={resourceHref(resource)} className="parity-resource-card" data-testid={`home-resource-${resource.id}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="parity-eyebrow">{resource.resolvedKind ?? resource.kind ?? "other"}</span>
        {resource.featured ? <span className="chip accent">★ Featured</span> : null}
      </div>
      <h3>{resource.title}</h3>
      <p>{resource.description || "No description available."}</p>
      <footer>{tags.slice(0, 3).map((tag) => <span key={tag} className="chip mono">#{tag}</span>)}</footer>
    </Link>
  );
}

export function HomePresentationSkeleton() {
  return (
    <ParityPage className="parity-home-page" aria-busy="true" aria-live="polite">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="h-4 w-32 animate-pulse bg-muted" />
        <div className="h-11 w-44 animate-pulse bg-muted" />
      </div>
      <div className="parity-kind-strip mb-5">
        {Array.from({ length: 7 }).map((_, index) => <div className="h-11 min-w-24 animate-pulse bg-muted" key={index} />)}
      </div>
      <div className="parity-stat-strip">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="parity-stat" key={index}>
            <div className="mb-3 h-3 w-20 animate-pulse bg-muted" />
            <div className="h-7 w-14 animate-pulse bg-muted" />
          </div>
        ))}
      </div>
      <div className="parity-index-grid">
        <div className="parity-index-sections">
          {Array.from({ length: 6 }).map((_, index) => (
            <div className="parity-index-category p-5" key={index}>
              <div className="mb-4 h-6 w-1/3 animate-pulse bg-muted" />
              <div className="h-20 animate-pulse bg-muted" />
            </div>
          ))}
        </div>
        <aside className="parity-index-rail"><div className="h-72 animate-pulse bg-muted" /></aside>
      </div>
    </ParityPage>
  );
}

export function HomePresentation(props: HomePresentationProps) {
  const withFilters = (path: string) => `${path}${props.preservedFilterSearch}`;
  const allKindCount = RESOURCE_KINDS.reduce((total, kind) => total + props.kindCounts[kind.id], 0);
  const visibleFeatured = props.activeKind
    ? props.featured.filter((resource) => (resource.resolvedKind ?? resource.kind ?? "other") === props.activeKind)
    : props.featured;
  const visibleRecent = props.activeKind
    ? props.recent.filter((resource) => (resource.resolvedKind ?? resource.kind ?? "other") === props.activeKind)
    : props.recent;

  return (
    <ParityPage className="parity-home-page">
      <header className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div className="parity-eyebrow"><span className="parity-live-dot" />{props.layout} · {props.totalResources.toLocaleString()} entries</div>
        <div className="parity-view-switch" role="group" aria-label="Home layout">
          {(["index", "curated"] as const).map((layout) => (
            <button key={layout} type="button" aria-pressed={props.layout === layout} onClick={() => props.onLayoutChange(layout)} data-testid={`button-home-layout-${layout}`}>{layout}</button>
          ))}
        </div>
      </header>

      <div className="parity-kind-strip mb-5" role="group" aria-label="Filter by resource kind">
        <button type="button" aria-pressed={props.activeKind === null} onClick={() => props.onKindChange(null)} data-testid="button-kind-all">All<output>{allKindCount}</output></button>
        {RESOURCE_KINDS.map((kind) => (
          <button key={kind.id} type="button" aria-pressed={props.activeKind === kind.id} onClick={() => props.onKindChange(props.activeKind === kind.id ? null : kind.id)} data-testid={`button-kind-${kind.id}`}>
            {kind.label}<output>{props.kindCounts[kind.id]}</output>
          </button>
        ))}
      </div>

      <dl className="parity-stat-strip">
        <div className="parity-stat"><dt>Resources</dt><dd>{props.totalResources.toLocaleString()}</dd></div>
        <div className="parity-stat"><dt>Categories</dt><dd>{props.totalCategories}</dd><small>{props.totalSubcategories} subcategories</small></div>
        <div className="parity-stat"><dt>Nested groups</dt><dd>{props.nestedGroupCount}</dd></div>
        <div className="parity-stat"><dt>Featured</dt><dd>{props.featuredCount}</dd></div>
      </dl>

      {props.notices}
      {props.accountContent}
      {props.controls}

      {props.categories.length === 0 && props.filtersActive ? (
        <div className="card p-8 text-center" data-testid="empty-categories">
          <p className="mb-3 text-sm text-[color:var(--text-2)]">No categories match the selected filters.</p>
          <button type="button" className="btn secondary" onClick={props.onClearFilters} data-testid="button-clear-filters">Clear filters</button>
        </div>
      ) : props.layout === "index" ? (
        <div className="parity-index-grid">
          <div className="parity-index-sections" data-testid="list-categories">
            {props.categories.map((category) => (
              <section className="parity-index-category" key={category.slug}>
                <Link href={withFilters(`/category/${category.slug}`)} data-testid={`link-category-${category.slug}`}>
                  <h2>{category.name}</h2><span className="mono" data-testid={`badge-count-${category.slug}`}>{category.displayCount}</span>
                </Link>
                <ul className="parity-index-sublist">
                  {(category.subcategories ?? []).map((subcategory) => (
                    <li key={subcategory.slug ?? subcategory.name}>
                      <Link href={withFilters(`/subcategory/${subcategory.slug}`)}>
                        <span>{subcategory.name}</span>
                        {(subcategory.subSubcategories?.length ?? 0) > 0 ? <span className="chip mono">+{subcategory.subSubcategories!.length}</span> : <span />}
                        <span className="mono">{subcategory.resourceCount}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                {category.preview.length > 0 ? (
                  <ol className="parity-category-preview" aria-label={`${category.name} resource preview`}>
                    {category.preview.slice(0, 3).map((resource) => (
                      <li key={resource.id}><Link href={resourceHref(resource)}><strong>{resource.title}</strong><span aria-hidden="true">↗</span></Link></li>
                    ))}
                  </ol>
                ) : null}
              </section>
            ))}
          </div>
          <aside className="parity-index-rail" aria-label="Index highlights">
            <section>
              <div className="parity-eyebrow mb-3">── Recently indexed</div>
              <ol className="parity-recent-list">
                {visibleRecent.slice(0, 5).map((resource, index) => (
                  <li key={resource.id}><Link href={resourceHref(resource)}><span className="mono">{String(index + 1).padStart(2, "0")}</span><span><strong>{resource.title}</strong><small>{resource.category}</small></span></Link></li>
                ))}
              </ol>
            </section>
            {visibleFeatured.length > 0 ? <section><div className="parity-eyebrow mb-3">── Featured</div><div className="grid gap-3">{visibleFeatured.slice(0, 2).map((resource) => <ResourceCard key={resource.id} resource={resource} />)}</div></section> : null}
            <section className="card p-5"><div className="parity-eyebrow mb-2">── Contribute</div><p className="text-sm text-[color:var(--text-2)] mb-3">Know a resource that belongs in this index? Every submission is reviewed.</p><Link href="/submit" className="btn primary w-full text-center">Submit a resource</Link></section>
          </aside>
        </div>
      ) : (
        <>
          <section>
            <div className="parity-section-heading"><div><div className="parity-eyebrow">── Featured</div><h2>Hand-picked <em className="serif-italic text-[var(--accent)]">highlights</em></h2></div></div>
            {visibleFeatured.length > 0 ? <div className="parity-resource-grid">{visibleFeatured.slice(0, 6).map((resource) => <ResourceCard key={resource.id} resource={resource} />)}</div> : <div className="card p-8 text-center text-[color:var(--text-2)]" data-testid="empty-featured">No featured resources match this filter.</div>}
          </section>
          <section>
            <div className="parity-section-heading"><div><div className="parity-eyebrow">── Recently indexed</div><h2>Fresh from the index</h2></div></div>
            <ol className="parity-recent-list card px-5">{visibleRecent.slice(0, 6).map((resource, index) => <li key={resource.id}><Link href={resourceHref(resource)}><span className="mono">{String(index + 1).padStart(2, "0")}</span><span><strong>{resource.title}</strong><small>{resource.category}</small></span></Link></li>)}</ol>
          </section>
          <section>
            <div className="parity-section-heading"><div><div className="parity-eyebrow">── Categories</div><h2>Browse the taxonomy</h2></div></div>
            <div className="parity-category-grid" data-testid="list-categories">{props.categories.map((category) => <Link key={category.slug} href={withFilters(`/category/${category.slug}`)} className="parity-resource-card" data-testid={`link-category-${category.slug}`}><div className="flex justify-between gap-3"><h3>{category.name}</h3><span className="chip mono" data-testid={`badge-count-${category.slug}`}>{category.displayCount}</span></div><p>{category.subcategories?.length ?? 0} subcategories</p></Link>)}</div>
          </section>
        </>
      )}
      {props.recommendations}
    </ParityPage>
  );
}