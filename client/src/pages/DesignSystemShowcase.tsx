import { useContext, useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Check, Layers, Palette, Shapes, SlidersHorizontal, Sparkles, Type, Zap } from "lucide-react";
import { ThemeProviderContext } from "@/components/ui/theme-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import SEOHead from "@/components/layout/SEOHead";
import { PRODUCT_PROFILES } from "@/lib/design-system";
import "@/styles/pages/system.css";

/**
 * Design-system showcase (Task #346) — the living anatomy of the runtime
 * 5-system × 10-accent design system. Everything on this page reads the SAME
 * CSS custom properties the app itself consumes (via the shadcn↔DS bridge in
 * client/src/index.css), so the page can never drift from the code: resolved
 * token values are read live from getComputedStyle after every switch.
 *
 * Docs counterpart: docs/DESIGN-SYSTEM.md (catalog) + docs/AGENTS.md (contract).
 */

/** Token groups rendered in the catalog. Names must match design-system.css. */
const TOKEN_GROUPS: { group: string; note: string; tokens: { name: string; kind: "color" | "text" }[] }[] = [
  {
    group: "Surfaces",
    note: "Background ladder — page, raised page, three translucent surface steps.",
    tokens: [
      { name: "--bg", kind: "color" },
      { name: "--bg-2", kind: "color" },
      { name: "--surface", kind: "color" },
      { name: "--surface-2", kind: "color" },
      { name: "--surface-3", kind: "color" },
    ],
  },
  {
    group: "Borders",
    note: "Hairline < border < border-strong; widths are per-system tokens.",
    tokens: [
      { name: "--hairline", kind: "color" },
      { name: "--border", kind: "color" },
      { name: "--border-strong", kind: "color" },
      { name: "--border-w", kind: "text" },
      { name: "--hairline-w", kind: "text" },
    ],
  },
  {
    group: "Ink tiers",
    note: "text = primary ink · text-2 = secondary/long-form muted · text-3/4 = meta ONLY, never body copy.",
    tokens: [
      { name: "--text", kind: "color" },
      { name: "--text-2", kind: "color" },
      { name: "--text-3", kind: "color" },
      { name: "--text-4", kind: "color" },
    ],
  },
  {
    group: "Accent",
    note: "One accent moment per surface. Ink on accent fills is always near-black.",
    tokens: [
      { name: "--accent", kind: "color" },
      { name: "--accent-2", kind: "color" },
    ],
  },
  {
    group: "Typography",
    note: "Three faces per system plus display metrics; the Font override picker can swap --font-body at runtime.",
    tokens: [
      { name: "--font-body", kind: "text" },
      { name: "--font-display", kind: "text" },
      { name: "--font-mono", kind: "text" },
      { name: "--display-weight", kind: "text" },
      { name: "--display-tracking", kind: "text" },
      { name: "--display-leading", kind: "text" },
      { name: "--body-leading", kind: "text" },
      { name: "--eyebrow-tracking", kind: "text" },
      { name: "--mono-size-step", kind: "text" },
    ],
  },
  {
    group: "Radius ladder",
    note: "radius > radius-sm > radius-xs; pill for chips. Terminal/Brutalist collapse to 0.",
    tokens: [
      { name: "--radius", kind: "text" },
      { name: "--radius-sm", kind: "text" },
      { name: "--radius-xs", kind: "text" },
      { name: "--radius-pill", kind: "text" },
    ],
  },
  {
    group: "Shadow ladder",
    note: "Per-system personality: Editorial soft falloff, Terminal glow, Geist ring, Brutalist hard offset, Swiss none.",
    tokens: [
      { name: "--shadow-sm", kind: "text" },
      { name: "--shadow", kind: "text" },
      { name: "--shadow-lg", kind: "text" },
      { name: "--shadow-accent", kind: "text" },
    ],
  },
  {
    group: "Atmosphere & motion",
    note: "Page atmosphere + grain per system; motion tokens are Replit additions consumed by primitives.",
    tokens: [
      { name: "--grain-opacity", kind: "text" },
      { name: "--motion-fast", kind: "text" },
      { name: "--motion-base", kind: "text" },
      { name: "--motion-slow", kind: "text" },
      { name: "--motion-ease", kind: "text" },
    ],
  },
];

/** DS status semantics — global across all systems (see docs/DESIGN-SYSTEM.md). */
/* DS-OK: status color literals mirror design-system.css .chip.ok/.warn/.bad verbatim. */
const STATUS_COLORS = [
  { label: "ok", hex: "#34d08c", desc: "success / healthy" },
  { label: "warn", hex: "#ffb84d", desc: "warning / attention" },
  { label: "bad", hex: "#ff5c7a", desc: "error / destructive" },
] as const;

/** What each system's skin layer changes structurally (tokens can't express these). */
const SKIN_NOTES: Record<string, string[]> = {
  editorial: [
    "Italic Fraunces display drops; <em> inside .display-h tints accent.",
    "Eyebrows are accent-colored and bold.",
    "Cards lift on hover (translateY −2px) with a soft shadow.",
  ],
  terminal: [
    "Everything squares off — border-radius forced to 0.",
    "Chips/badges gain [brackets] and uppercase; eyebrows gain a '> ' prompt.",
    "Primary buttons become accent-outlined with a text glow; cards glow on hover instead of lifting.",
  ],
  geist: [
    "Chips drop the mono uppercase treatment for quiet sentence-case body face.",
    "Cards get a ring + large soft shadow on hover; buttons at weight 500.",
  ],
  brutalist: [
    "Radius 0 everywhere; borders jump to 2px in the ink color.",
    "Buttons go uppercase/tracked; hover translates −2px,−2px with a hard 4px offset shadow.",
    "Cards hover with a 6px offset slab shadow.",
  ],
  swiss: [
    "Hairline discipline — 0.5px borders on cards, buttons, and inputs.",
    "No transforms or shadows on hover; state changes are color-only.",
    "Eyebrows demote to --text-3 mono at weight 500.",
  ],
};

const SECTION_HEADING = "system-showcase-heading";

export default function DesignSystemShowcase() {
  const { systemId, accentId, setSystem, setAccent, systems, accents } =
    useContext(ThemeProviderContext);

  const activeSystem = systems[systemId];
  const activeAccent = accents.find((a) => a.id === accentId);

  // Live token resolution — sample computed values from the stylesheet so the
  // catalog can never drift from code. Sampling is driven by a MutationObserver
  // on <html>'s data-system/data-accent attributes, NOT by a [systemId,
  // accentId] effect: React runs passive effects child-first, so an effect here
  // would read the OLD stylesheet values before ThemeProvider's own effect
  // applies the new attributes. The observer fires strictly after the
  // attributes change, and getComputedStyle resolves fresh values on demand.
  const [resolved, setResolved] = useState<Record<string, string>>({});
  useEffect(() => {
    const sample = () => {
      const cs = getComputedStyle(document.documentElement);
      const next: Record<string, string> = {};
      for (const g of TOKEN_GROUPS) {
        for (const t of g.tokens) next[t.name] = cs.getPropertyValue(t.name).trim();
      }
      setResolved(next);
    };
    sample(); // initial mount — boot script already applied the attributes
    const observer = new MutationObserver(sample);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-system", "data-accent", "data-font"],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="system-showcase space-y-12">
      <SEOHead
        title="Design System"
        description="The Awesome Video design system — 5 systems × 10 accents, live tokens, type scale, and core components."
        noindex
      />

      {/* ── Header ── */}
      <div>
        <Link
          href="/settings/theme"
          className="inline-flex items-center gap-1.5 text-sm text-[color:var(--text-2)] hover:text-[var(--text)] mb-4 min-h-[44px]"
          data-testid="link-back-theme-settings"
        >
          <ArrowLeft className="h-4 w-4" />
          Theme Settings
        </Link>
        <div className="flex items-center gap-3">
          <Shapes className="h-6 w-6 text-[var(--accent)]" />
          <h1 className="display-h text-3xl" data-testid="text-ds-title">Design System</h1>
        </div>
        <p className="text-sm sm:text-base text-[color:var(--text-2)] mt-2 max-w-3xl">
          The living anatomy of the runtime design system: five visual languages × ten accents
          sharing one component contract. Every value below is read live from the active
          stylesheet — switch a system or accent and watch the whole catalog re-derive.{" "}
          <span className="text-[color:var(--text-3)]" data-testid="text-ds-active">
            Active: {activeSystem?.name ?? systemId} · {activeAccent?.name ?? accentId}
          </span>
        </p>
      </div>

      {/* ── System switcher ── */}
      <section aria-label="System switcher" className="no-print space-y-4" data-testid="ds-system-switcher">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-[var(--accent)]" />
          <h2 className={SECTION_HEADING}>Systems</h2>
          <span className="text-xs text-[color:var(--text-3)]">5 personalities, one contract</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(systems).map(([id, sys]) => {
            const isActive = id === systemId;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSystem(id)}
                aria-pressed={isActive}
                data-testid={`ds-system-${id}`}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-[var(--radius-pill)] border bg-[var(--surface)] px-4 text-sm transition-colors hover:border-[var(--border-strong)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] cursor-pointer"
                style={{
                  borderColor: isActive ? "var(--accent)" : "var(--border)",
                  color: isActive ? "var(--accent)" : "var(--text-2)",
                }}
              >
                {isActive && <Check className="h-4 w-4" />}
                <span className="font-medium">{sys.name}</span>
                <code className="font-mono text-xs text-[color:var(--text-3)] uppercase hidden sm:inline">{sys.tag}</code>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-[color:var(--text-2)] max-w-3xl">{activeSystem?.desc}</p>
      </section>

      {/* ── Accent ramp ── */}
      <section aria-label="Accent ramp" className="no-print space-y-4" data-testid="ds-accent-ramp">
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-[var(--accent)]" />
          <h2 className={SECTION_HEADING}>Accent ramp</h2>
          <span className="text-xs text-[color:var(--text-3)]">10 accents · primary + secondary pair</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {accents.map((a) => {
            const isActive = a.id === accentId;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => setAccent(a.id)}
                aria-pressed={isActive}
                data-testid={`ds-accent-${a.id}`}
                className="text-left rounded-[var(--radius-sm)] border bg-[var(--surface)] p-2 transition-colors hover:border-[var(--border-strong)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] cursor-pointer"
                style={{ borderColor: isActive ? a.primary : "var(--border)" }}
              >
                <div className="flex h-7 w-full overflow-hidden rounded-[var(--radius-xs)] mb-1.5">
                  <div aria-hidden style={{ flex: 2, background: a.primary }} />
                  <div aria-hidden style={{ flex: 1, background: a.secondary }} />
                </div>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-medium truncate">{a.name}</span>
                  {isActive && <Check className="h-3.5 w-3.5 shrink-0" style={{ color: a.primary }} />}
                </div>
                <code className="block font-mono text-[10px] text-[color:var(--text-3)]">{a.primary}</code>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-[color:var(--text-2)] max-w-3xl">
          Accent discipline: one accent moment per surface — primary action, active nav, eyebrows,
          live indicators, selection. Ink on accent fills is always near-black, in every system and accent.
        </p>
      </section>

      {/* ── Token catalog ── */}
      <section aria-label="Product profiles" className="space-y-4" data-testid="ds-product-profiles">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-[var(--accent)]" />
          <h2 className={SECTION_HEADING}>Product profiles</h2>
          <span className="text-xs text-[color:var(--text-3)]">one contract, surface-specific defaults</span>
        </div>
        <div className="grid gap-[var(--profile-content-gap)] sm:grid-cols-2">
          {Object.entries(PRODUCT_PROFILES).map(([id, profile]) => (
            <Card key={id} className="p-[var(--profile-panel-padding)] bg-[var(--surface)] border-[color:var(--border)]">
              <code className="font-mono text-xs text-[var(--accent)]">{id}</code>
              <h3 className="mt-2 font-semibold">{profile.name}</h3>
              <p className="mt-1 text-xs text-[color:var(--text-2)]">
                {profile.defaultSystem ?? "host-neutral"} + {profile.defaultAccent ?? "inherited accent"} default · {profile.density} density
              </p>
            </Card>
          ))}
        </div>
        <p className="text-xs text-[color:var(--text-2)] max-w-3xl">
          Profiles set semantic density and composition defaults. The active system and accent remain
          visitor-selectable, so Editorial, Terminal, Geist, Brutalist, and Swiss stay available everywhere.
        </p>
      </section>

      {/* ── Token catalog ── */}
      <section aria-label="Token catalog" className="space-y-4" data-testid="ds-token-catalog">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5 text-[var(--accent)]" />
          <h2 className={SECTION_HEADING}>Token catalog</h2>
          <span className="text-xs text-[color:var(--text-3)]">
            resolved live for {activeSystem?.name ?? systemId} × {activeAccent?.name ?? accentId}
          </span>
        </div>
        <div className="space-y-6">
          {TOKEN_GROUPS.map((g) => (
            <Card key={g.group} className="p-4 sm:p-5 bg-[var(--surface)] border-[color:var(--border)]" data-testid={`ds-token-group-${g.group.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
              <div className="mb-3">
                <code className="block font-mono text-xs text-[var(--accent)] tracking-wider uppercase">{g.group}</code>
                <p className="text-xs text-[color:var(--text-2)] mt-1">{g.note}</p>
              </div>
              <div className="divide-y divide-[color:var(--hairline)]">
                {g.tokens.map((t) => (
                  <div key={t.name} className="system-token-row">
                    <code className="font-mono text-[color:var(--text-2)]">{t.name}</code>
                    <code
                      className="font-mono text-[color:var(--text-3)] break-all"
                      data-testid={`ds-token-value-${t.name.replace(/^--/, "")}`}
                    >
                      {resolved[t.name] || "…"}
                    </code>
                    {t.kind === "color" ? (
                      <div
                        aria-hidden
                        className="hidden sm:block h-6 w-full rounded-[var(--radius-xs)] border border-[color:var(--border)]"
                        style={{ background: `var(${t.name})` }}
                      />
                    ) : (
                      <div className="hidden sm:block" aria-hidden />
                    )}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Type scale ── */}
      <section aria-label="Type scale" className="space-y-4" data-testid="ds-type-scale">
        <div className="flex items-center gap-2">
          <Type className="h-5 w-5 text-[var(--accent)]" />
          <h2 className={SECTION_HEADING}>Type scale</h2>
        </div>
        <Card className="p-6 space-y-5 bg-[var(--surface)] border-[color:var(--border)]">
          <div className="eyebrow">── 01 / Eyebrow label</div>
          <p className="display-h text-4xl sm:text-5xl">
            Display <em className="text-[var(--accent)]">drop</em>
          </p>
          <p className="display-h text-2xl">Section display — {activeSystem?.name} metrics</p>
          <h3 className="font-sans text-lg font-semibold">Sans heading · weight 600</h3>
          <p className="text-sm text-[color:var(--text-2)] max-w-2xl">
            Body copy sits in <code className="font-mono text-xs">--font-body</code> with the
            system&rsquo;s own leading. Secondary ink (<code className="font-mono text-xs">--text-2</code>)
            carries long-form muted copy; it never drops below the readable tier.
          </p>
          <div className="space-y-1 text-sm">
            <p className="text-[color:var(--text)]">Ink tier 1 — primary copy and headings</p>
            <p className="text-[color:var(--text-2)]">Ink tier 2 — secondary and long-form muted copy</p>
            <p className="text-[color:var(--text-3)]">Ink tier 3 — meta: timestamps, counts, captions</p>
            <p className="text-[color:var(--text-2)]">
              <span aria-hidden="true" className="inline-block h-3 w-3 mr-2 rounded-[var(--radius-xs)] bg-[var(--text-4)]" />
              Ink tier 4 — faintest: decorative dividers, ghost text
            </p>
          </div>
          <code className="block font-mono text-xs text-[color:var(--text-3)]">
            mono · 0123456789 · const tokens = getComputedStyle(root);
          </code>
          <p className="text-sm">
            Keyboard hint: <kbd className="kbd font-mono">⌘K</kbd> · inline <code className="font-mono text-xs">code</code>
          </p>
        </Card>
      </section>

      {/* ── Core components ── */}
      <section aria-label="Core components" className="space-y-4" data-testid="ds-components">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[var(--accent)]" />
          <h2 className={SECTION_HEADING}>Core components</h2>
        </div>
        <p className="text-xs text-[color:var(--text-2)] -mt-2" data-testid="ds-display-only-note">
          Display-only specimens — controls below are intentionally inactive.
        </p>
        <Card
          className="p-6 space-y-6 bg-[var(--surface)] border-[color:var(--border)]"
          {...({ inert: "" } as any)}
        >
          <div className="space-y-2">
            <code className="block font-mono text-xs text-[color:var(--text-3)] tracking-wider uppercase">Buttons · data-ds-variant</code>
            <div className="flex flex-wrap gap-2">
              <Button>
                <Sparkles className="h-4 w-4 mr-1.5" />
                Primary
              </Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="link">Link</Button>
              <Button size="icon" variant="outline" aria-label="Icon button">
                <Zap className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <code className="block font-mono text-xs text-[color:var(--text-3)] tracking-wider uppercase">Badges · chip/accent emit data-ds=&quot;chip&quot;</code>
            <div className="flex flex-wrap gap-2">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="destructive">Destructive</Badge>
              <Badge variant="chip">chip</Badge>
              <Badge variant="accent">accent</Badge>
            </div>
          </div>

          <div className="space-y-2">
            <code className="block font-mono text-xs text-[color:var(--text-3)] tracking-wider uppercase">Status semantics — global, not per-theme</code>
            <div className="flex flex-wrap items-center gap-4">
              {STATUS_COLORS.map((s) => (
                <span key={s.label} className="inline-flex items-center gap-2 text-xs text-[color:var(--text-2)]">
                  <span
                    aria-hidden
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: s.hex, boxShadow: s.label === "ok" ? `0 0 8px ${s.hex}` : undefined }}
                  />
                  <code className="font-mono">{s.hex}</code> {s.desc}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <code className="block font-mono text-xs text-[color:var(--text-3)] tracking-wider uppercase">Forms</code>
            <div className="grid sm:grid-cols-2 gap-3">
              <Input placeholder="Search resources…" />
              <Textarea placeholder="Multi-line input…" className="min-h-[44px] h-[44px]" />
              <label className="flex items-center gap-2 text-sm text-[color:var(--text-2)]">
                <Switch checked aria-label="Example switch" /> Switch
              </label>
              <label className="flex items-center gap-2 text-sm text-[color:var(--text-2)]">
                <Checkbox checked aria-label="Example checkbox" /> Checkbox
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <code className="block font-mono text-xs text-[color:var(--text-3)] tracking-wider uppercase">Tabs & skeleton</code>
            <Tabs value="tokens">
              <TabsList>
                <TabsTrigger value="tokens">Tokens</TabsTrigger>
                <TabsTrigger value="skins">Skins</TabsTrigger>
                <TabsTrigger value="bridge">Bridge</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex gap-3 pt-1">
              <Skeleton className="h-16 w-1/3" />
              <Skeleton className="h-16 w-1/3" />
              <Skeleton className="h-16 w-1/3" />
            </div>
          </div>

          <div className="space-y-2">
            <code className="block font-mono text-xs text-[color:var(--text-3)] tracking-wider uppercase">Interactive card · data-ds=&quot;card-hover&quot;</code>
            <div
              data-ds="card-hover"
              className="card rounded-[var(--radius)] border border-[color:var(--border)] bg-[var(--surface)] p-4 max-w-sm"
            >
              <div className="eyebrow mb-2">── resource</div>
              <p className="font-medium text-sm">Card title resolves --text</p>
              <p className="text-xs text-[color:var(--text-2)] mt-1">
                Hover behavior is a per-system skin: lift, glow, slab shadow, or color-only.
              </p>
            </div>
          </div>
        </Card>
      </section>

      {/* ── Per-system skin notes ── */}
      <section aria-label="Skin notes" className="space-y-4" data-testid="ds-skin-notes">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-[var(--accent)]" />
          <h2 className={SECTION_HEADING}>What the {activeSystem?.name ?? systemId} skin changes</h2>
        </div>
        <Card className="p-5 bg-[var(--surface)] border-[color:var(--border)]">
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-[color:var(--text-2)]">
            {(SKIN_NOTES[systemId] ?? []).map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
          <p className="text-xs text-[color:var(--text-2)] mt-4">
            Tokens carry personality values; skins carry what tokens can&rsquo;t express (brackets,
            uppercase, pseudo-elements, hover structure). Full catalog:{" "}
            <code className="font-mono">docs/DESIGN-SYSTEM.md</code> · consumption contract:{" "}
            <code className="font-mono">docs/AGENTS.md</code>.
          </p>
        </Card>
      </section>
    </div>
  );
}
