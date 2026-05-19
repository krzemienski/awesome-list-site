import { useContext } from "react";
import { ThemeProviderContext } from "@/components/ui/theme-provider";

/*
 * DS Migration WP-1 — Option A (Terminal-only).
 *
 * The legacy multi-preset theme system is parked behind this no-op surface so
 * existing imports keep compiling. Live token control now flows through
 * `applyDesignSystem(systemId, accentId)` exported from
 * `client/src/lib/design-system.ts`, and the picker UI lives at
 * `/settings/theme`. The provider's side-effects (applyTheme/applyFont) are
 * gated to no-op when `system === 'terminal'` (see theme-provider.tsx).
 */
export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
