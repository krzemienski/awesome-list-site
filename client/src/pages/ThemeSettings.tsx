import { useContext, useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Check, Palette, Layers, Eye, Sparkles, Zap, Type } from "lucide-react";
import { ThemeProviderContext } from "@/components/ui/theme-provider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

// I1 — Font override picker. Writes --font-sans on <html>; persists across reloads.
const FONT_OPTIONS = [
  { id: "system", name: "System default", stack: "" },
  { id: "inter", name: "Inter", stack: "'Inter', system-ui, sans-serif" },
  { id: "dm-sans", name: "DM Sans", stack: "'DM Sans', system-ui, sans-serif" },
  { id: "source-sans", name: "Source Sans 3", stack: "'Source Sans 3', 'Source Sans Pro', system-ui, sans-serif" },
  { id: "ibm-plex", name: "IBM Plex Sans", stack: "'IBM Plex Sans', system-ui, sans-serif" },
  { id: "jetbrains", name: "JetBrains Mono", stack: "'JetBrains Mono', ui-monospace, monospace" },
];
const FONT_LS_KEY = "ds-font-override";
function applyFontOverride(id: string) {
  const opt = FONT_OPTIONS.find((f) => f.id === id) ?? FONT_OPTIONS[0];
  if (opt.id === "system" || !opt.stack) {
    document.documentElement.style.removeProperty("--font-sans");
  } else {
    document.documentElement.style.setProperty("--font-sans", opt.stack);
  }
}

export default function ThemeSettings() {
  const { systemId, accentId, setSystem, setAccent, systems, accents } =
    useContext(ThemeProviderContext);
  const { toast } = useToast();

  const activeSystem = systems[systemId];
  const activeAccent = accents.find((a) => a.id === accentId);

  // I1 — Font override state
  const [fontId, setFontId] = useState<string>(() => {
    if (typeof window === "undefined") return "system";
    return localStorage.getItem(FONT_LS_KEY) || "system";
  });
  useEffect(() => {
    applyFontOverride(fontId);
    localStorage.setItem(FONT_LS_KEY, fontId);
  }, [fontId]);

  const handlePickFont = (id: string) => {
    setFontId(id);
    const name = FONT_OPTIONS.find((f) => f.id === id)?.name ?? id;
    toast({ title: "Font applied", description: `${name} is now active.` });
  };

  const handlePickSystem = (id: string) => {
    setSystem(id);
    const label = systems[id]?.name ?? id;
    toast({ title: "Design system applied", description: `${label} is now active.` });
  };

  const handlePickAccent = (id: string) => {
    setAccent(id);
    const label = accents.find((a) => a.id === id)?.name ?? id;
    toast({ title: "Accent applied", description: `${label} is now the active accent.` });
  };

  return (
    <div className="max-w-5xl space-y-10">
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-[color:var(--text-2)] hover:text-[var(--text)] mb-4"
          data-testid="link-back-home"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <div className="flex items-center gap-3">
          {/* P5 — sparkle icon to match ref 08 */}
          <Sparkles className="h-6 w-6 text-[var(--accent)]" />
          <h1 className="font-sans font-bold text-2xl sm:text-2xl tracking-tight">
            Theme Settings
          </h1>
        </div>
        <p className="text-sm sm:text-base text-[color:var(--text-2)] mt-2">
          Pick a design system, accent, and (optionally) override the font. Changes apply instantly and persist across reloads.{" "}
          <span className="text-[color:var(--text-3)]" data-testid="text-active-preset">
            Active: {activeSystem?.name ?? systemId} · {activeAccent?.name ?? accentId}
          </span>
        </p>
      </div>

      {/* System Picker — 5 cards */}
      <section aria-label="Design system picker" data-testid="system-picker">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="h-5 w-5 text-[var(--accent)]" />
          <h2 className="font-sans font-semibold text-xl tracking-tight">Design System</h2>
        </div>
        <div
          role="radiogroup"
          aria-label="Design system"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
        >
          {Object.entries(systems).map(([id, sys]) => {
            const isActive = id === systemId;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => handlePickSystem(id)}
                data-testid={`system-option-${id}`}
                className="text-left rounded-[var(--radius)] border bg-[var(--surface)] p-4 transition-colors hover:border-[var(--border-strong)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] cursor-pointer"
                style={{
                  borderColor: isActive ? "var(--accent)" : "var(--border)",
                  boxShadow: isActive
                    ? "0 0 0 1px var(--accent), 0 0 16px color-mix(in srgb, var(--accent) 25%, transparent)"
                    : "none",
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm">{sys.name}</span>
                  {isActive && <Check className="h-4 w-4 text-[var(--accent)]" />}
                </div>
                <code className="block font-mono text-[10.5px] text-[color:var(--text-3)] tracking-wider uppercase mb-2">
                  {sys.tag}
                </code>
                <p className="text-xs text-[color:var(--text-2)]">{sys.desc}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Accent Picker — 10 swatches */}
      <section aria-label="Accent picker" data-testid="accent-picker">
        <div className="flex items-center gap-2 mb-4">
          <Palette className="h-5 w-5 text-[var(--accent)]" />
          <h2 className="font-sans font-semibold text-xl tracking-tight">Accent</h2>
        </div>
        <div
          role="radiogroup"
          aria-label="Accent"
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
        >
          {accents.map((a) => {
            const isActive = a.id === accentId;
            return (
              <button
                key={a.id}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => handlePickAccent(a.id)}
                data-testid={`accent-option-${a.id}`}
                className="text-left rounded-[var(--radius)] border bg-[var(--surface)] p-3 transition-colors hover:border-[var(--border-strong)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] cursor-pointer"
                style={{
                  borderColor: isActive ? a.primary : "var(--border)",
                  boxShadow: isActive
                    ? `0 0 0 1px ${a.primary}, 0 0 14px color-mix(in srgb, ${a.primary} 25%, transparent)`
                    : "none",
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm">{a.name}</span>
                  {isActive && <Check className="h-4 w-4" style={{ color: a.primary }} />}
                </div>
                <div className="flex h-9 w-full overflow-hidden rounded-[var(--radius-sm)] mb-2">
                  <div aria-hidden style={{ flex: 2, background: a.primary }} />
                  <div aria-hidden style={{ flex: 1, background: a.secondary }} />
                </div>
                <code className="block font-mono text-[10.5px] text-[color:var(--text-3)] tracking-wider">
                  {a.primary}
                </code>
              </button>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-[color:var(--text-2)]">
          Switching systems keeps your accent unless you were on that system&rsquo;s natural default
          &mdash; in which case the accent nudges to the new system&rsquo;s natural default.
        </p>
      </section>

      {/* I1 — Font override picker (hybrid: keeps 5×10 picker above, adds per-system font override) */}
      <section aria-label="Font override picker" data-testid="font-picker">
        <div className="flex items-center gap-2 mb-2">
          <Type className="h-5 w-5 text-[var(--accent)]" />
          <h2 className="font-sans font-semibold text-xl tracking-tight">Font</h2>
        </div>
        <p className="text-xs text-[color:var(--text-2)] mb-4">
          Override the system&rsquo;s default font. &ldquo;System default&rdquo; falls back to the active design system&rsquo;s bundled font.
        </p>
        <div
          role="radiogroup"
          aria-label="Font override"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
        >
          {FONT_OPTIONS.map((f) => {
            const isActive = f.id === fontId;
            return (
              <button
                key={f.id}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => handlePickFont(f.id)}
                data-testid={`font-option-${f.id}`}
                className="text-left rounded-[var(--radius)] border bg-[var(--surface)] p-4 transition-colors hover:border-[var(--border-strong)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] cursor-pointer"
                style={{
                  borderColor: isActive ? "var(--accent)" : "var(--border)",
                  boxShadow: isActive
                    ? "0 0 0 1px var(--accent), 0 0 14px color-mix(in srgb, var(--accent) 25%, transparent)"
                    : "none",
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm">{f.name}</span>
                  {isActive && <Check className="h-4 w-4 text-[var(--accent)]" />}
                </div>
                <p
                  className="text-sm text-[color:var(--text-2)]"
                  style={{ fontFamily: f.stack || undefined }}
                >
                  The quick brown fox jumps over the lazy dog. 0123456789
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Live Preview — current system × accent applied to real shadcn primitives */}
      <section aria-label="Live preview" data-testid="theme-preview">
        <div className="flex items-center gap-2 mb-4">
          <Eye className="h-5 w-5 text-[var(--accent)]" />
          <h2 className="font-sans font-semibold text-xl tracking-tight">Live Preview</h2>
          <span className="ml-2 text-xs text-[color:var(--text-3)]">
            {activeSystem?.name ?? systemId} · {activeAccent?.name ?? accentId}
          </span>
        </div>

        <Card className="p-6 space-y-6 bg-[var(--surface)] border-[color:var(--border)]" data-testid="preview-card">
          {/* Typography */}
          <div className="space-y-2">
            <code className="block font-mono text-[10.5px] text-[color:var(--text-3)] tracking-wider uppercase">
              Typography
            </code>
            <h1 className="font-display text-3xl font-bold tracking-tight">
              The quick brown fox <em className="text-[var(--accent)]">jumps</em> over
            </h1>
            <h3 className="font-sans text-lg font-semibold">Section heading</h3>
            <p className="text-sm text-[color:var(--text-2)] max-w-2xl">
              Body copy renders in the system&rsquo;s primary sans face. Accent color drives links,
              focus rings, and emphasized words — try a different accent above to see this paragraph
              re-tint instantly.
            </p>
            <code className="block font-mono text-xs text-[color:var(--text-3)]">
              0123456789 · const x = await fetch(&apos;/api/resources&apos;);
            </code>
          </div>

          {/* Buttons */}
          <div className="space-y-2">
            <code className="block font-mono text-[10.5px] text-[color:var(--text-3)] tracking-wider uppercase">
              Buttons
            </code>
            <div className="flex flex-wrap gap-2">
              <Button data-testid="preview-btn-default">
                <Sparkles className="h-4 w-4 mr-1.5" />
                Primary action
              </Button>
              <Button variant="secondary" data-testid="preview-btn-secondary">Secondary</Button>
              <Button variant="outline" data-testid="preview-btn-outline">Outline</Button>
              <Button variant="ghost" data-testid="preview-btn-ghost">Ghost</Button>
              <Button variant="destructive" data-testid="preview-btn-destructive">Destructive</Button>
              <Button size="icon" variant="outline" aria-label="Icon button" data-testid="preview-btn-icon">
                <Zap className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Badges */}
          <div className="space-y-2">
            <code className="block font-mono text-[10.5px] text-[color:var(--text-3)] tracking-wider uppercase">
              Badges
            </code>
            <div className="flex flex-wrap gap-2">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="destructive">Destructive</Badge>
              <Badge className="bg-[var(--accent)] text-[var(--bg)] hover:bg-[var(--accent)]">
                Accent
              </Badge>
            </div>
          </div>

          {/* Input + Surface chips */}
          <div className="space-y-2">
            <code className="block font-mono text-[10.5px] text-[color:var(--text-3)] tracking-wider uppercase">
              Form &amp; Surface
            </code>
            <div className="grid sm:grid-cols-2 gap-3">
              <Input placeholder="Search resources…" data-testid="preview-input" />
              <div className="flex items-center gap-2 rounded-[var(--radius)] border border-[color:var(--border)] bg-[var(--bg)] px-3 py-2 text-xs">
                <span className="text-[color:var(--text-3)]">Try</span>
                <kbd className="kbd font-mono">⌘K</kbd>
                <span className="text-[color:var(--text-3)]">to open command palette</span>
              </div>
            </div>
          </div>

          {/* Token swatches — proves the actual computed values */}
          <div className="space-y-2">
            <code className="block font-mono text-[10.5px] text-[color:var(--text-3)] tracking-wider uppercase">
              Active Tokens
            </code>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
              {[
                { label: "bg", varName: "--bg" },
                { label: "surface", varName: "--surface" },
                { label: "border", varName: "--border" },
                { label: "accent", varName: "--accent" },
                { label: "accent-2", varName: "--accent-2" },
              ].map((t) => (
                <div
                  key={t.varName}
                  className="rounded-[var(--radius-sm)] border border-[color:var(--border)] p-2"
                  data-testid={`preview-token-${t.label}`}
                >
                  <div
                    className="h-8 w-full rounded-[var(--radius-sm)] mb-1.5 border border-[color:var(--border)]"
                    style={{ background: `var(${t.varName})` }}
                  />
                  <div className="font-mono text-[10.5px] text-[color:var(--text-3)]">{t.label}</div>
                  <div className="font-mono text-[10.5px] text-[color:var(--text-2)]">{t.varName}</div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
