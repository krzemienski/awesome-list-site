import { useContext } from "react";
import { Link } from "wouter";
import { ArrowLeft, Check, Palette, Layers } from "lucide-react";
import { ThemeProviderContext } from "@/components/ui/theme-provider";
import { useToast } from "@/hooks/use-toast";

export default function ThemeSettings() {
  const { systemId, accentId, setSystem, setAccent, systems, accents } =
    useContext(ThemeProviderContext);
  const { toast } = useToast();

  const activeSystem = systems[systemId];
  const activeAccent = accents.find((a) => a.id === accentId);

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
          <Palette className="h-6 w-6 text-[var(--accent)]" />
          <h1 className="font-sans font-bold text-2xl sm:text-2xl tracking-tight">
            Theme Settings
          </h1>
        </div>
        <p className="text-sm sm:text-base text-[color:var(--text-2)] mt-2">
          Pick a design system and an accent. Changes apply instantly and persist across reloads.{" "}
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
    </div>
  );
}
