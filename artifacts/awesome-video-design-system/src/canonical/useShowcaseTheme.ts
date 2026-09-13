import { useEffect, useState } from "react";
import tokens from "../../tokens.json";

type System = keyof typeof tokens.themes;
type Accent = keyof typeof tokens.accents;
type Theme = { system: System; accent: Accent };
const storageKey = "awesome-video-design-system:theme";
const defaults: Theme = { system: "editorial", accent: "crimson" };

function readTheme(): Theme {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(storageKey) || "null");
    if (saved && typeof saved === "object" && "system" in saved && "accent" in saved
      && typeof saved.system === "string" && Object.hasOwn(tokens.themes, saved.system)
      && typeof saved.accent === "string" && Object.hasOwn(tokens.accents, saved.accent)) {
      return saved as Theme;
    }
  } catch {
    // Invalid or unavailable storage does not prevent in-memory switching.
  }
  return defaults;
}

/** Artifact preferences must never invoke the app's persisting theme applier. */
export function useShowcaseTheme() {
  const [theme, setTheme] = useState<Theme>(readTheme);
  useEffect(() => {
    document.documentElement.dataset.system = theme.system;
    document.documentElement.dataset.accent = theme.accent;
    try { localStorage.setItem(storageKey, JSON.stringify(theme)); } catch {
      // Storage denial still allows the current document to change themes.
    }
  }, [theme]);
  const setSystem = (system: System) => {
    if (!Object.hasOwn(tokens.themes, system)) return;
    setTheme(previous => ({
      system,
      accent: previous.accent === tokens.themes[previous.system].defaultAccent
        ? tokens.themes[system].defaultAccent as Accent : previous.accent,
    }));
  };
  const setAccent = (accent: Accent) => {
    if (Object.hasOwn(tokens.accents, accent)) setTheme(previous => ({ ...previous, accent }));
  };
  return { ...theme, setSystem, setAccent };
}