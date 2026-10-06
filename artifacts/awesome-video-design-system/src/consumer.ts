import tokens from "../tokens.json";
import type {
  Accent,
  AccentId,
  DesignSystem,
  SystemId,
} from "../../../client/src/lib/design-system";

export * from "../../../client/src/lib/design-system";

/*
  The canonical registry (client/public/ds/design-system.js) as projected into
  tokens.json by scripts/generate-design-system-artifact.mjs. The app reads the
  same tables from window globals at runtime; this package renders without
  loading that script, so it reads the checked projection instead.
*/
const themes = Object.entries(tokens.themes);

export const DESIGN_SYSTEMS = Object.fromEntries(
  themes.map(([id, theme]): [string, DesignSystem] => [
    id,
    { name: theme.name, tag: theme.tag, desc: theme.description, vars: theme.tokens },
  ]),
) as Record<SystemId, DesignSystem>;

export const ACCENTS: Accent[] = Object.entries(tokens.accents).map(([id, accent]) => ({
  id: id as AccentId,
  name: accent.name,
  primary: accent.primary,
  secondary: accent.secondary,
}));

export const SYSTEM_DEFAULT_ACCENT = Object.fromEntries(
  themes.map(([id, theme]): [string, AccentId] => [id, theme.defaultAccent as AccentId]),
) as Record<SystemId, AccentId>;
