import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Check, Palette } from "lucide-react";
import { ACCENTS, applyDesignSystem, SYSTEM_DEFAULT_ACCENT } from "@/lib/design-system";
import { useToast } from "@/hooks/use-toast";

/*
 * WP-1 §4.12 row 1 (P0) — Terminal-only accent picker.
 *
 * Option A locks the active design system to `terminal`; this page exposes the
 * 10-accent palette and writes through `applyDesignSystem('terminal', id)`,
 * which both updates `--accent` live and persists `ds-accent` in localStorage
 * so a reload retains the selection.
 *
 * Acceptance: AC-1.9. Verification gate: G4.1-g.
 */
export default function ThemeSettings() {
  const { toast } = useToast();
  const [activeAccent, setActiveAccent] = useState<string>(() => {
    if (typeof window === "undefined") return SYSTEM_DEFAULT_ACCENT.terminal;
    try {
      return localStorage.getItem("ds-accent") || SYSTEM_DEFAULT_ACCENT.terminal;
    } catch {
      return SYSTEM_DEFAULT_ACCENT.terminal;
    }
  });

  useEffect(() => {
    /* Ensure we render in sync with whatever boot-script applied. */
    const current = document.documentElement.getAttribute("data-accent");
    if (current && current !== activeAccent) {
      setActiveAccent(current);
    }
  }, [activeAccent]);

  const handlePick = (accentId: string, accentName: string) => {
    applyDesignSystem("terminal", accentId);
    setActiveAccent(accentId);
    toast({
      title: "Accent applied",
      description: `${accentName} is now the active accent.`,
    });
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
          data-testid="link-back-home"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <div className="flex items-center gap-3">
          <Palette className="h-7 w-7" style={{ color: "var(--accent)" }} />
          <div>
            <h1 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
              Theme
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              <span
                className="mono"
                style={{ fontFamily: "var(--font-mono)", color: "var(--text-3)" }}
              >
                SYSTEM:
              </span>{" "}
              <span style={{ color: "var(--accent)" }}>Editorial</span>{" "}
              <span style={{ color: "var(--text-3)" }}>·</span>{" "}
              <span
                className="mono"
                style={{ fontFamily: "var(--font-mono)", color: "var(--text-3)" }}
              >
                ACCENT:
              </span>{" "}
              <span style={{ color: "var(--accent)" }}>
                {ACCENTS.find((a) => a.id === activeAccent)?.name ?? activeAccent}
              </span>
            </p>
          </div>
        </div>
      </div>

      <section
        data-testid="ds-picker"
        data-system-row="terminal"
        aria-label="Accent picker"
      >
        <div
          className="mb-3 flex items-center gap-3 text-xs uppercase"
          style={{
            fontFamily: "var(--font-mono)",
            letterSpacing: "var(--eyebrow-tracking)",
            color: "var(--text-3)",
          }}
        >
          <span style={{ color: "var(--accent)" }}>›</span>
          <span>Accent · {ACCENTS.length} options</span>
        </div>

        <div
          role="radiogroup"
          aria-label="Accent color"
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3"
        >
          {ACCENTS.map((accent) => {
            const isActive = accent.id === activeAccent;
            return (
              <button
                key={accent.id}
                type="button"
                role="radio"
                aria-checked={isActive}
                data-testid={`accent-swatch-${accent.id}`}
                data-accent-id={accent.id}
                onClick={() => handlePick(accent.id, accent.name)}
                className="group flex flex-col items-stretch text-left transition-colors"
                style={{
                  background: "var(--surface)",
                  border: `1px solid ${isActive ? accent.primary : "var(--border)"}`,
                  padding: "12px",
                  minHeight: "44px",
                  cursor: "pointer",
                  boxShadow: isActive
                    ? `0 0 0 1px ${accent.primary}, 0 0 16px color-mix(in srgb, ${accent.primary} 30%, transparent)`
                    : "none",
                }}
              >
                <div
                  className="flex items-center justify-between mb-3"
                  style={{ minHeight: "20px" }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "11px",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: isActive ? accent.primary : "var(--text-2)",
                    }}
                  >
                    {accent.name}
                  </span>
                  {isActive && (
                    <Check
                      className="h-3.5 w-3.5"
                      style={{ color: accent.primary }}
                      aria-hidden
                    />
                  )}
                </div>
                <div className="flex h-8 w-full overflow-hidden">
                  <div
                    aria-hidden
                    style={{
                      flex: 2,
                      background: accent.primary,
                    }}
                  />
                  <div
                    aria-hidden
                    style={{
                      flex: 1,
                      background: accent.secondary,
                    }}
                  />
                </div>
                <code
                  className="mt-2 block"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "10.5px",
                    color: "var(--text-3)",
                  }}
                >
                  {accent.primary}
                </code>
              </button>
            );
          })}
        </div>

        <p
          className="mt-6 text-xs"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--text-3)",
            lineHeight: 1.6,
          }}
        >
          The accent updates live and persists across reloads
          (<code>localStorage["ds-accent"]</code>). The Editorial system is the
          only DS skin shipped (Option A).
        </p>
      </section>
    </div>
  );
}
