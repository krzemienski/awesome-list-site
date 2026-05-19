import { useContext } from "react";
import { Link } from "wouter";
import { ArrowLeft, Check, Palette, Type } from "lucide-react";
import { ThemeProviderContext, FONT_OPTIONS } from "@/components/ui/theme-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
          <Palette className="h-7 w-7 text-[var(--accent)]" />
          <h1 className="font-sans font-bold text-3xl sm:text-4xl tracking-tight">
            Theme Settings
          </h1>
        </div>
        <p className="text-sm sm:text-base text-[color:var(--text-2)] mt-2">
          Customize the font and color theme of the site to match your preference.
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
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm">{font.label}</span>
                  {isActive && <Check className="h-4 w-4 text-[var(--accent)]" />}
                </div>
                <p
                  className="text-base mb-1"
                  style={{ fontFamily: font.family }}
                >
                  The quick brown fox jumps over the lazy dog
                </p>
                <p className="text-xs text-[color:var(--text-2)]">{font.description}</p>
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
            const primary = preset.dark?.primary || preset.light?.primary || "#000";
            const secondary = preset.dark?.secondary || preset.light?.secondary || "#444";
            const accent = preset.dark?.accent || preset.light?.accent || "#888";
            return (
              <button
                key={preset.value}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => handlePickTheme(preset.value, preset.label)}
                data-testid={`theme-option-${preset.value}`}
                className="text-left rounded-[var(--radius)] border bg-[var(--surface)] p-4 transition-colors hover:border-[var(--border-strong)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] cursor-pointer"
                style={{
                  borderColor: isActive ? primary : "var(--border)",
                  boxShadow: isActive
                    ? `0 0 0 1px ${primary}, 0 0 16px color-mix(in srgb, ${primary} 25%, transparent)`
                    : "none",
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-sm">{preset.label}</span>
                  {isActive && <Check className="h-4 w-4" style={{ color: primary }} />}
                </div>
                <div className="flex h-10 w-full overflow-hidden rounded-[var(--radius-sm)] mb-2">
                  <div aria-hidden style={{ flex: 2, background: primary }} />
                  <div aria-hidden style={{ flex: 1, background: secondary }} />
                  <div aria-hidden style={{ flex: 1, background: accent }} />
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
