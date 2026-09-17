import type { ReactNode } from "react";
import { Link } from "wouter";
import type { Resource } from "@/types/awesome-list";
import type { ResourceKind } from "@shared/resourceKinds";
import { STRIP_KINDS, type ResourceKindCounts } from "@/lib/static-data";
import { Badge } from "@/components/ui/badge";
import { ChipButton } from "@/components/ui/chip-button";
import { Button } from "@/components/ui/button";

export interface HomeSubcategoryView {
  name: string;
  slug: string;
  count: number;
  nestedCount: number;
}

export interface HomeCategoryView {
  name: string;
  slug: string;
  count: number;
  icon: ReactNode;
  subcategories: HomeSubcategoryView[];
  description?: string;
  teaserDescription?: string;
  teaserTitle?: string;
}

export interface HomeStats {
  total: number;
  categories: number;
  subcategories: number;
  nestedGroups: number;
  featured: number;
  approvedThisWeek: number;
}

export interface HomePresentationProps {
  layout: "index" | "curated";
  categories: HomeCategoryView[];
  recent: Resource[];
  featured: Resource[];
  stats: HomeStats;
  kindCounts?: ResourceKindCounts;
  kindCountsLoading?: boolean;
  kindCountsError?: boolean;
  selectedKind?: ResourceKind | null;
  onKindChange?: (kind: ResourceKind | null) => void;
  selectedTags: string[];
  onClearFilters: () => void;
  filters?: ReactNode;
  emptyTagParamNotice?: ReactNode;
  accountFeatures?: ReactNode;
}

const KIND_LABELS: Record<string, string> = {
  tools: "Tools & SDKs",
  libraries: "Libraries",
  standards: "Standards",
  events: "Events",
  protocols: "Protocols",
};

const COUNT_WORDS = [
  "Zero",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
  "Twenty",
] as const;

function resourceTags(resource: Resource): string[] {
  const direct = Array.isArray(resource.tags) ? resource.tags : [];
  if (direct.length > 0) return direct.filter((tag): tag is string => typeof tag === "string");
  const metadataTags = resource.metadata?.tags;
  return Array.isArray(metadataTags)
    ? metadataTags.filter((tag): tag is string => typeof tag === "string")
    : [];
}

function resourceHref(resource: Resource): string {
  const id = String(resource.id);
  return /^\d+$/.test(id) && Number(id) > 0 ? `/resource/${id}` : resource.url;
}

function categoryShortName(resource: Resource): string {
  return resource.category?.trim() || "Index";
}

function formatCount(value: number): string {
  return Number.isFinite(value) ? value.toLocaleString() : "—";
}

function formatCountWord(value: number): string {
  if (Number.isInteger(value) && value >= 0 && value < COUNT_WORDS.length) {
    return COUNT_WORDS[value];
  }
  return formatCount(value);
}

function HomeArrow({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 8 H14 M10 4 L14 8 L10 12" />
    </svg>
  );
}

function isoWeekNumber(date: Date): number {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  return Math.ceil(((utcDate.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

function StatStrip({ stats, layout }: { stats: HomeStats; layout: "index" | "curated" }) {
  const items =
    layout === "index"
      ? [
          ["RESOURCES", formatCount(stats.total), `+${formatCount(stats.approvedThisWeek)} this week`],
          ["CATEGORIES", formatCount(stats.categories), `${formatCount(stats.subcategories)} subcategories`],
          ["NESTED GROUPS", formatCount(stats.nestedGroups), "L3 depth"],
          ["FEATURED", formatCount(stats.featured), "hand-picked"],
        ]
      : [
          ["RESOURCES", formatCount(stats.total), `+${formatCount(stats.approvedThisWeek)} this week`],
          ["CATEGORIES", formatCount(stats.categories), `${formatCount(stats.subcategories)} subcategories`],
          ["FEATURED", formatCount(stats.featured), "hand-picked"],
          ["APPROVED THIS WEEK", formatCount(stats.approvedThisWeek), "newly indexed"],
        ];

  return (
    <div
      className="home-stat-strip"
      data-testid="home-stat-strip"
      aria-label="Catalog statistics"
    >
      {items.map(([name, value, sub]) => (
        <div className="home-stat-cell" key={name} data-testid={`home-stat-${name.toLowerCase().replaceAll(" ", "-")}`}>
          <div className="home-stat-label mono">{name}</div>
          <div className="home-stat-value display-h">{value}</div>
          <div className="home-stat-sub">{sub}</div>
        </div>
      ))}
    </div>
  );
}

function KindStrip({
  counts,
  isLoading,
  isError,
  selectedKind,
  onKindChange,
}: {
  counts?: ResourceKindCounts;
  isLoading?: boolean;
  isError?: boolean;
  selectedKind?: ResourceKind | null;
  onKindChange?: (kind: ResourceKind | null) => void;
}) {
  return (
    <div
      className="home-kind-strip"
      data-testid="home-kind-strip"
      aria-label="Content types in this index"
    >
      {STRIP_KINDS.map((kind) => (
        <ChipButton
          key={kind}
          type="button"
          className="home-kind-chip"
          data-testid={`home-kind-chip-${kind}`}
          aria-label={`${KIND_LABELS[kind]} — ${counts ? formatCount(counts[kind]) : "loading"} resources`}
          title={`Browse ${KIND_LABELS[kind]}`}
          aria-pressed={selectedKind === kind}
          onClick={() => onKindChange?.(selectedKind === kind ? null : kind)}
        >
          <span>{KIND_LABELS[kind]}</span>
          <span className="home-kind-count mono">
            {isLoading ? "…" : isError ? "—" : formatCount(counts?.[kind] ?? 0)}
          </span>
        </ChipButton>
      ))}
      {/* "other" is intentionally not a sixth visual chip: the canonical
          strip has five content types. Keep its full-set count available to
          assistive technology and QA so the visible counts can be reconciled
          with the endpoint total. */}
      <span className="sr-only" data-testid="home-kind-count-other">
        other — {isLoading ? "loading" : isError ? "unavailable" : formatCount(counts?.other ?? 0)} resources
      </span>
    </div>
  );
}

function PageMeta({
  layout,
  stats,
  kindCounts,
  kindCountsLoading,
  kindCountsError,
  selectedKind,
  onKindChange,
}: {
  layout: "index" | "curated";
  stats: HomeStats;
  kindCounts?: ResourceKindCounts;
  kindCountsLoading?: boolean;
  kindCountsError?: boolean;
  selectedKind?: ResourceKind | null;
  onKindChange?: (kind: ResourceKind | null) => void;
}) {
  const eyebrow =
    layout === "index"
      ? `INDEX · ${formatCount(stats.total)} ENTRIES · UPDATED TODAY`
      : `CURATED · WEEK ${isoWeekNumber(new Date())} · ${formatCount(stats.total)} INDEXED`;
  return (
    <div className="home-meta-row">
      <div className="home-eyebrow eyebrow">
        <span className="home-live-dot" aria-hidden="true" />
        {eyebrow}
      </div>
      <KindStrip
        counts={kindCounts}
        isLoading={kindCountsLoading}
        isError={kindCountsError}
        selectedKind={selectedKind}
        onKindChange={onKindChange}
      />
    </div>
  );
}

function ResourceLink({
  resource,
  children,
  className,
  dataTestId,
}: {
  resource: Resource;
  children: ReactNode;
  className?: string;
  dataTestId?: string;
}) {
  const href = resourceHref(resource);
  if (href.startsWith("/")) {
    return (
      <Link href={href} className={className} data-testid={dataTestId}>
        {children}
      </Link>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      data-testid={dataTestId}
    >
      {children}
      <span className="sr-only"> (opens in new tab)</span>
    </a>
  );
}

function ResourceCard({
  resource,
  featured = false,
  selectedKind,
}: {
  resource: Resource;
  featured?: boolean;
  selectedKind?: ResourceKind | null;
}) {
  const tags = resourceTags(resource);
  const tagHref = (tag: string) => {
    const query = new URLSearchParams({ tags: tag });
    if (selectedKind) query.set("kind", selectedKind);
    return `/?${query.toString()}`;
  };
  return (
    <article className="home-resource-card card hoverable glow" data-testid={`card-home-resource-${resource.id}`}>
      <div className="home-resource-card-top">
        <div className="home-resource-mark" aria-hidden="true">
          ◆
        </div>
        {featured ? <Badge className="home-featured-chip">★ FEATURED</Badge> : null}
      </div>
      <h3 className="home-resource-title">
        <ResourceLink
          resource={resource}
          className="hover:text-[var(--accent)] transition-colors"
          dataTestId={`link-home-resource-${resource.id}`}
        >
          {resource.title}
        </ResourceLink>
      </h3>
      <p className="home-resource-description">{resource.description}</p>
      <div className="home-resource-tags" aria-label={`Tags for ${resource.title}`}>
        {tags.slice(0, 3).map((tag) => (
          <Link key={tag} href={tagHref(tag)} className="home-resource-tag chip mono">
            #{tag}
          </Link>
        ))}
      </div>
    </article>
  );
}

function SectionHeader({
  eyebrow,
  title,
  sub,
  aside,
}: {
  eyebrow?: string;
  title: ReactNode;
  sub?: string;
  aside?: ReactNode;
}) {
  return (
    <div className="home-section-header">
      <div>
        {eyebrow ? <div className="eyebrow home-section-eyebrow">{eyebrow}</div> : null}
        <h2 className="display-h home-section-title">{title}</h2>
        {sub ? <p className="home-section-sub">{sub}</p> : null}
      </div>
      {aside}
    </div>
  );
}

function CategoryHeading({
  category,
  selectedTags,
  selectedKind,
}: {
  category: HomeCategoryView;
  selectedTags: string[];
  selectedKind?: ResourceKind | null;
}) {
  const query = new URLSearchParams();
  if (selectedTags.length > 0) query.set("tags", selectedTags.join(","));
  if (selectedKind) query.set("kind", selectedKind);
  const tagsQuery = query.toString() ? `?${query.toString()}` : "";
  return (
    <Link
      href={`/category/${category.slug}${tagsQuery}`}
      className="home-category-heading"
      data-testid={`link-category-${category.slug}`}
      aria-label={`View ${category.name} category with ${category.count} resources`}
    >
      <span className="home-category-icon" aria-hidden="true">
        {category.icon}
      </span>
      <h3>{category.name}</h3>
      <span className="home-category-count mono" data-testid={`badge-count-${category.slug}`}>
        {formatCount(category.count)}
      </span>
    </Link>
  );
}

function CategoryIndex({ categories, selectedTags, selectedKind, onClearFilters }: {
  categories: HomeCategoryView[];
  selectedTags: string[];
  selectedKind?: ResourceKind | null;
  onClearFilters: () => void;
}) {
  if (categories.length === 0) {
    return (
      <div className="home-empty-categories" data-testid="empty-categories">
        <p>No categories match the selected filters.</p>
        <Button variant="outline" size="sm" onClick={onClearFilters} data-testid="button-clear-filters">
          Clear filters
        </Button>
      </div>
    );
  }

  return (
    <div className="home-category-grid" data-testid="list-categories">
      {categories.map((category) => (
        <section className="home-category-section" key={category.slug}>
          <CategoryHeading
            category={category}
            selectedTags={selectedTags}
            selectedKind={selectedKind}
          />
          {category.teaserDescription ? (
            <span className="sr-only" data-testid={`text-category-teaser-${category.slug}`}>
              <span className="font-medium">
                {category.teaserTitle ? `Featured: ${category.teaserTitle} — ` : ""}
              </span>
              {category.teaserDescription}
            </span>
          ) : null}
          <div className="home-subcategory-list">
            {category.subcategories.map((subcategory) => (
              <Link
                key={subcategory.slug}
                href={(() => {
                  const query = new URLSearchParams();
                  if (selectedTags.length > 0) query.set("tags", selectedTags.join(","));
                  if (selectedKind) query.set("kind", selectedKind);
                  return `/subcategory/${subcategory.slug}${query.toString() ? `?${query.toString()}` : ""}`;
                })()}
                className="home-subcategory-row"
                data-testid={`link-subcategory-${subcategory.slug}`}
              >
                <span className="home-subcategory-name">{subcategory.name}</span>
                {subcategory.nestedCount > 0 ? (
                  <span className="home-nested-count mono" title={`${subcategory.nestedCount} nested groups`}>
                    +{subcategory.nestedCount}
                  </span>
                ) : (
                  <span aria-hidden="true" />
                )}
                <span className="home-subcategory-count mono">{formatCount(subcategory.count)}</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function RecentRail({ recent }: { recent: Resource[] }) {
  return (
    <aside className="home-index-rail">
      <div>
        <div className="eyebrow home-rail-eyebrow">── RECENTLY INDEXED</div>
        <div className="home-recent-list">
          {recent.slice(0, 5).map((resource, index) => (
            <ResourceLink
              key={String(resource.id)}
              resource={resource}
              className="home-recent-row"
              dataTestId={`link-home-recent-${resource.id}`}
            >
              <span className="home-recent-number mono">{String(index + 1).padStart(2, "0")}</span>
              <span className="home-recent-copy">
                <span className="home-recent-title">{resource.title}</span>
                <span className="home-recent-meta">
                  {categoryShortName(resource)} · {resourceTags(resource)[0]}
                </span>
              </span>
            </ResourceLink>
          ))}
        </div>
      </div>
      <div className="home-contribute-card card">
        <div className="eyebrow home-rail-eyebrow">── CONTRIBUTE</div>
        <p>Know a tool, spec, or event that belongs here? Submissions are reviewed weekly.</p>
        <Button asChild className="w-full">
          <Link href="/submit" data-testid="link-submit-resource">
            Submit a resource
          </Link>
        </Button>
      </div>
    </aside>
  );
}

function IndexLayout({
  categories,
  recent,
  stats,
  selectedTags,
  selectedKind,
  onClearFilters,
}: Pick<HomePresentationProps, "categories" | "recent" | "stats" | "selectedTags" | "selectedKind" | "onClearFilters">) {
  return (
    <>
      <StatStrip stats={stats} layout="index" />
      <div className="home-index-grid">
        <CategoryIndex
          categories={categories}
          selectedTags={selectedTags}
          selectedKind={selectedKind}
          onClearFilters={onClearFilters}
        />
        <RecentRail recent={recent} />
      </div>
    </>
  );
}

function CuratedLayout({
  categories,
  recent,
  featured,
  stats,
  selectedTags,
  selectedKind,
}: Pick<HomePresentationProps, "categories" | "recent" | "featured" | "stats" | "selectedTags" | "selectedKind">) {
  const query = new URLSearchParams();
  if (selectedTags.length > 0) query.set("tags", selectedTags.join(","));
  if (selectedKind) query.set("kind", selectedKind);
  const tagSearch = query.toString() ? `?${query.toString()}` : "";
  return (
    <>
      <StatStrip stats={stats} layout="curated" />
      <div className="home-curated-section home-curated-featured">
        <SectionHeader
          eyebrow="── FEATURED"
          title={
            <>
              Hand-picked <span className="serif-italic home-accent-italic">highlights</span>
            </>
          }
          aside={
            <Button asChild variant="ghost">
              <Link href={`/categories${tagSearch}`}>
                Browse all →
              </Link>
            </Button>
          }
        />
        {featured.length > 0 ? (
          <div className="home-resource-grid">
            {featured.slice(0, 6).map((resource) => (
              <ResourceCard
                key={String(resource.id)}
                resource={resource}
                featured
                selectedKind={selectedKind}
              />
            ))}
          </div>
        ) : (
          <p className="home-empty-section" data-testid="home-featured-empty">
            No featured resources have been selected yet.
          </p>
        )}
      </div>

      <div className="home-curated-section home-curated-recent">
        <SectionHeader eyebrow="── RECENTLY INDEXED" title="Fresh from the index" />
        <div className="home-recent-table card">
          {recent.slice(0, 5).map((resource, index) => {
            const category = categoryShortName(resource);
            return (
              <ResourceLink
                key={String(resource.id)}
                resource={resource}
                className="home-curated-recent-row"
                dataTestId={`link-home-curated-recent-${resource.id}`}
              >
                <span className="home-recent-number mono">{String(index + 1).padStart(2, "0")}</span>
                <span className="home-curated-recent-copy">
                  <span className="home-curated-recent-title">
                    <span className="home-curated-recent-title-text">{resource.title}</span>
                    <span className="home-curated-category chip muted">{category}</span>
                  </span>
                  <span className="home-curated-recent-description">{resource.description}</span>
                </span>
                <HomeArrow className="home-recent-arrow" />
              </ResourceLink>
            );
          })}
        </div>
      </div>

      <div className="home-curated-section home-curated-categories">
        <SectionHeader
          eyebrow="── CATEGORIES"
          title={
            <>
              {formatCountWord(stats.categories)} domains,{" "}
              <span className="serif-italic home-muted-italic">one taxonomy</span>
            </>
          }
        />
        <div className="home-curated-category-grid" data-testid="list-categories">
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/category/${category.slug}${tagSearch}`}
              className="home-curated-category card hoverable glow"
              data-testid={`link-category-${category.slug}`}
            >
              <div className="home-curated-category-top">
                <span className="home-category-icon" aria-hidden="true">
                  {category.icon}
                </span>
                <span className="home-category-count mono">{formatCount(category.count)}</span>
              </div>
              <h3>{category.name}</h3>
              <p>{category.description ?? `Explore ${formatCount(category.count)} resources in ${category.name}.`}</p>
              <span className="home-curated-explore">
                Explore <HomeArrow className="h-3 w-3" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}

export default function HomePresentation({
  layout,
  categories,
  recent,
  featured,
  stats,
  kindCounts,
  kindCountsLoading,
  kindCountsError,
  selectedKind,
  onKindChange,
  selectedTags,
  onClearFilters,
  filters,
  emptyTagParamNotice,
  accountFeatures,
}: HomePresentationProps) {
  return (
    <div className="home-page" data-testid={`home-layout-${layout}`}>
      <h1 className="sr-only">Awesome Video Resources</h1>
      <PageMeta
        layout={layout}
        stats={stats}
        kindCounts={kindCounts}
        kindCountsLoading={kindCountsLoading}
        kindCountsError={kindCountsError}
        selectedKind={selectedKind}
        onKindChange={onKindChange}
      />
      {emptyTagParamNotice}
      {layout === "index" ? (
        <IndexLayout
          categories={categories}
          recent={recent}
          stats={stats}
          selectedTags={selectedTags}
          selectedKind={selectedKind}
          onClearFilters={onClearFilters}
        />
      ) : (
        <CuratedLayout
          categories={categories}
          recent={recent}
          featured={featured}
          stats={stats}
          selectedTags={selectedTags}
          selectedKind={selectedKind}
        />
      )}
      {filters}
      {accountFeatures}
    </div>
  );
}
