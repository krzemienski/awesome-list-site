import { useContext } from "react";
import { Link } from "wouter";
import { ArrowLeft, Check, Palette, Type } from "lucide-react";
import { ThemeProviderContext, FONT_OPTIONS } from "@/components/ui/theme-provider";
import { useToast } from "@/hooks/use-toast";

export default function ThemeSettings() {
  const { activeFont, setFont, activeTheme, setThemeByValue, presets } = useContext(ThemeProviderContext);
  const { toast } = useToast();

  const handlePickFont = (value: string, label: string) => {
    setFont(value);
    toast({ title: "Font applied", description: `${label} is now the active font.` });
  };

  const handlePickTheme = (value: string, label: string) => {
    setThemeByValue(value);
    toast({ title: "Theme applied", description: `${label} is now the active color theme.` });
  };

  const colorPresets = presets.filter((p) =>
    ["cyberpunk", "limes", "black-pink", "flat-pink", "purples", "flat-purples"].includes(p.value)
  );

  return (
    <div className="max-w-4xl space-y-10">
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
          <Palette className="h-6 w-6 text-[var(--accent)]" />
          {/* MR-DS-15 — step h1 down one tier (was text-3xl sm:text-4xl) */}
          <h1 className="font-sans font-bold text-2xl sm:text-2xl tracking-tight">
            Theme Settings
          </h1>
        </div>
        {/* MR-DS-16 — append active-preset readout to header copy */}
        <p className="text-sm sm:text-base text-[color:var(--text-2)] mt-2">
          Customize the font and color theme of the site to match your preference.{" "}
          <span className="text-[color:var(--text-3)]" data-testid="text-active-preset">
            Active: {activeTheme.name}
          </span>
        </p>
      </div>

      {/* Font Picker */}
      <section aria-label="Font picker" data-testid="font-picker">
        <div className="flex items-center gap-2 mb-4">
          <Type className="h-5 w-5 text-[var(--accent)]" />
          <h2 className="font-sans font-semibold text-xl tracking-tight">Font</h2>
        </div>
        <div role="radiogroup" aria-label="Font" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {FONT_OPTIONS.map((font) => {
            const isActive = font.value === activeFont;
            return (
              <button
                key={font.value}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => handlePickFont(font.value, font.label)}
                data-testid={`font-option-${font.value}`}
                className="text-left rounded-[var(--radius)] border bg-[var(--surface)] p-4 transition-colors hover:border-[var(--border-strong)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] cursor-pointer"
                style={{
                  borderColor: isActive ? "var(--accent)" : "var(--border)",
                  boxShadow: isActive
                    ? "0 0 0 1px var(--accent), 0 0 16px color-mix(in srgb, var(--accent) 25%, transparent)"
                    : "none",
                }}
              >
                {/* MR-DS-11 — tile order: name → description → sample */}
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm">{font.label}</span>
                  {isActive && <Check className="h-4 w-4 text-[var(--accent)]" />}
                </div>
                <p className="text-xs text-[color:var(--text-2)] mb-2">{font.description}</p>
                {/* MR-DS-14 — append digits to sample sentence */}
                <p
                  className="text-base"
                  style={{ fontFamily: font.family }}
                >
                  The quick brown fox jumps over the lazy dog. 0123456789
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Color Theme Picker */}
      <section aria-label="Color theme picker" data-testid="color-theme-picker">
        <div className="flex items-center gap-2 mb-4">
          <Palette className="h-5 w-5 text-[var(--accent)]" />
          <h2 className="font-sans font-semibold text-xl tracking-tight">Color Theme</h2>
        </div>
        <div role="radiogroup" aria-label="Color theme" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {colorPresets.map((preset) => {
            const isActive = preset.value === activeTheme.value;
            // MR-DS-01 — ThemePreset exposes `name` + `preview.{accent,secondary,bg}`.
            // Previous reader looked for `label` + `dark?/light?` (which don't exist
            // on this shape), so every card rendered empty labels + identical
            // fallback swatches.
            // DS-OK: preview-only theme picker — hex fallbacks below come from the
            // preset registry intent, not from runtime DS tokens.
            const primary = preset.preview?.accent || "#000";
            const secondary = preset.preview?.secondary || "#444";
            const bg = preset.preview?.bg || "#888";
            return (
              <button
                key={preset.value}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => handlePickTheme(preset.value, preset.name)}
                data-testid={`theme-option-${preset.value}`}
                className="text-left rounded-[var(--radius)] border bg-[var(--surface)] p-4 transition-colors hover:border-[var(--border-strong)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] cursor-pointer"
                style={{
                  borderColor: isActive ? primary : "var(--border)",
                  boxShadow: isActive
                    ? `0 0 0 1px ${primary}, 0 0 16px color-mix(in srgb, ${primary} 25%, transparent)`
                    : "none",
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm">{preset.name}</span>
                  {isActive && <Check className="h-4 w-4" style={{ color: primary }} />}
                </div>
                <p className="text-xs text-[color:var(--text-2)] mb-2">{preset.description}</p>
                <div className="flex h-10 w-full overflow-hidden rounded-[var(--radius-sm)] mb-2">
                  <div aria-hidden style={{ flex: 2, background: primary }} />
                  <div aria-hidden style={{ flex: 1, background: secondary }} />
                  <div aria-hidden style={{ flex: 1, background: bg }} />
                </div>
                <code className="block font-mono text-[10.5px] text-[color:var(--text-2)] tracking-wider">
                  {primary}
                </code>
              </button>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-[color:var(--text-2)]">
          Selections persist across reloads. The Editorial atmosphere stays intact &mdash; only the accent color shifts.
        </p>
      </section>
    </div>
  );
}
