import { useContext } from "react";
import { ThemeProviderContext } from "@/components/ui/theme-provider";

/*
 * Awesome.Video Design System — runtime hook.
 *
 * Returns { systemId, accentId, setSystem, setAccent, systems, accents,
 * systemDefaultAccent } from ThemeProviderContext. Token application is
 * CSS-attribute-driven via applyDesignSystem(systemId, accentId) in
 * client/src/lib/design-system.ts — see /settings/theme for the picker UI
 * and replit.md MR-DS-13 carve-out #3 for the full architecture.
 */
export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
