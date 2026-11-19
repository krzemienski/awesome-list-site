# Clerk auth appearance

The Clerk sign-in, sign-up, and recovery cards are owned by Clerk's hosted
component stylesheet. Their appearance is therefore assembled in
`client/src/lib/clerk-appearance.ts`, not by reaching into generated Clerk
class names from the shared design-system stylesheet.

## Runtime token mapping

`useClerkAppearance()` resolves the active custom properties from `<html>` and
passes plain values to Clerk. Clerk parses the values before deriving its own
hover, active, focus, and alpha ramps; passing `var(--token)` directly does
not work.

| Design-system source | Resolver role | Clerk destination | Notes |
| --- | --- | --- | --- |
| `--accent` | `palette.accent` | `variables.colorPrimary`, `variables.colorRing` | Primary controls and focus follow the selected accent. |
| `--color-destructive` | `palette.danger` | `variables.colorDanger`, `elements.formFieldErrorText` | Validation errors retain the canonical semantic error color independently of accent. |
| `--bg` | `palette.background` | `variables.colorBackground`, `elements.cardBox.backgroundColor` | `cardBox` owns the one visible auth surface. |
| `--text` | `palette.ink` | `variables.colorForeground`, `variables.colorInputForeground`, button/input/icon/label element colors | Main auth ink. |
| `--text-3` | `palette.mutedInk` | `variables.colorMutedForeground`, `elements.headerSubtitle` | Placeholder and supporting copy. |
| `--border-strong` | `palette.border` | `variables.colorNeutral`, `variables.colorBorder` | `colorBorder` is resolved at full opacity because Clerk applies its own hairline ramp. |
| `--surface` | `palette.fieldSurface` | `variables.colorMuted`, `variables.colorInput`, social/input backgrounds | Keeps fields and provider controls on the active system surface. |
| `--radius` | `radii.card` | `elements.cardBox.borderRadius` | The outer clipping surface follows the card radius. |
| `--radius-sm` | `radii.control` | `variables.borderRadius` | Clerk derives its control ladder from the active control radius. |
| `--font-body` | `typography.body` | `variables.fontFamily`, `variables.fontFamilyButtons`, label/header element fonts | Uses the active system body stack. |
| `--font-display` | `typography.display` | `elements.headerTitle.fontFamily` | Keeps the auth heading on the active display stack. |
| `--font-mono` | `typography.mono` | `variables.fontFamilyMono` | Covers OTP and other monospace Clerk controls. |

Color values with alpha are composited over `--bg` before being handed to
Clerk. The exception is `--border-strong` when used as `colorBorder`: its
alpha is deliberately dropped so Clerk's own 3–11% hairline ramp does not get
composited twice. Lengths and font stacks skip color canonicalization.

The appearance also sets `cssLayerName: "clerk"`. The card and footer are
transparent inner surfaces so `cardBox` is the sole visible surface; this
prevents a second dark-theme card patch from obscuring the active DS
background. Interactive controls retain the existing 44px minimum touch
target. Provider icon and block variants receive the same treatment because
Clerk chooses the rendered OAuth variant at runtime.

The observer watches `<html data-system>` and `<html data-accent>`, so every
resolved color, radius, and font stack is rebuilt after a theme picker change.
When a token is unavailable (including during SSR or before the dev stylesheet
has loaded), that individual Clerk variable is omitted and Clerk's dark base
theme remains the fallback.

## Verification

No auth-return script exists. Verify by hand against `npm run dev` on `:5000`:
anonymous deep-page redirects keep `redirect_url`, a signed-in user returns to
the requested route (including the admin guard), and account recovery
completes. Check the sign-in and sign-up routes at 375px and 1440px after each
representative system/accent selection.