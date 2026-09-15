# Guest sign-in password visibility follow-up

Scope: existing anonymous sign-in screen only. No auth submission, provider activation, user creation, admin action, source change, or custom/full-suite test was run.

Widget selectors:
- Password input: `input[name="password"]`
- Toggle: `button[aria-label="Show password"]` / `button[aria-label="Hide password"]`

## 375px native browser

- Filled only synthetic probe `__qa_test_probe__` into `input[name="password"]`; initial type was `password`.
- Pointer click on `button[aria-label="Show password"]` **worked**. It changed input type to `text`, retained the probe, and replaced the accessible control with `Hide password`.
- Clicked `Hide password`; input returned to type `password`; cleared the field to empty.
- No pointer interception occurred. The post-click lookup of the former Show selector naturally returned no button because it was replaced; its fallback hit-test sampled the analytics consent banner DIV, not a blocked password widget.
- Evidence: `k7rvcp` (filled/masked), `bntev2` (revealed), `x93kjy` (cleared).

## 1440px native browser

- Initial DOM geometry: `input[name="password"]` rect x=556, y=480.953125, w=240, h=44; Show button rect x=761, y=483.953125, w=32, h=38. Initial center hit-test reported the underlying INPUT before the interaction, but this did not prevent the real click.
- Filled only `__qa_test_probe__`; pointer click on `button[aria-label="Show password"]` **worked**.
- After click: input type `text`, value remained the probe, control was `Hide password`; hit-test targeted `BUTTON` class `cl-formFieldInputShowPasswordButton cl-button cl-internal-lrq6e`, rect x=843, y=593.9375, w=32, h=38.
- Clicked Hide password; input returned to type `password`; cleared to empty. URL stayed `/sign-in?redirect_url=%2Fterms`.
- Evidence: `9xkjn5` (revealed probe), `d1ed14` (cleared/final desktop state).

## Result / warnings

The suspected `cl-card` pointer interception was **not reproduced** at either viewport. The actual password visibility widget is clickable by pointer and toggles correctly. No keyboard fallback was needed or used. Browser warnings observed: Clerk development-key warning and missing password `autocomplete` warning suggesting `current-password`. No app navigation, auth result, console/page error, HTTP error, or request cancellation was observed during this targeted pass. Analytics consent remained visible and was not activated.

Screenshot file export is unavailable in the native notebook; artifact IDs above are retained instead. This temporary report contains no secret, identity, cookie, or auth-state data.
