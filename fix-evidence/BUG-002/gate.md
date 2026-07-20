# VG-002 — Header controls unreachable at 768–917px (HIGH) — PASS

## Root cause
With the pinned 256px sidebar, header content space at 768–917px is only 512–661px, but the header's md-range minimums summed past it: breadcrumb `md:min-w-[160px]` + search `md:min-w-[200px]` + 18px gaps + trigger/separator/padding + the shrink-0 action cluster (Theme 44px + Sign in 91px). The flex row clipped from the right — Theme and Sign in rendered at x≈825–916 regardless of viewport (before screenshots: fully hidden at 768, half-clipped at 900) with no drawer fallback and no scrollable overflow.

## Fix (`client/src/components/layout/new/AppHeader.tsx`)
The wide-layout floors now apply only from lg (1024px) up, so run19 BUG-004 / run16 BUG-047 fixes are preserved verbatim at lg+ while md fits:
- header gap: `gap-2 lg:gap-[18px]` (was md)
- breadcrumb floor: `md:min-w-[80px] lg:min-w-[160px]` (80px still fits the collapsed "Home › … › current" trail — no run19 0px-clip regression)
- search floor: `md:min-w-[110px] lg:min-w-[200px]` (short "Search..." label already md-only)
- "/" kbd hint: `lg:flex` (was md)

## Evidence (dev, real browser, July 19, 2026)
- Before: `vg002-before-768.png` (Theme + Sign in fully off-screen), `vg002-before-900.png` (Sign in half-clipped). Probe: signIn right=916px, inView:false at 768/800/850/900.
- After probe (all inView:true, overflow 0): 768px signIn 653–744; 800px 685–776; 850px 735–826; 900px 785–876. Screenshots `vg002-after-{768,800,850,900}.png`.
- Controls exercised for real at each of the 4 widths: Theme click → `/settings/theme`, Sign in click → `/login` (`vg002-login-768.png`).
- Sidebar toggle usable at 768 (width 255→47 on trigger click, `vg002-drawer-toggled-768.png`); mobile 375 drawer opens (`vg002-drawer-375.png`) and header Sign in/Theme in view (`vg002-after-375.png`).
- Horizontal overflow sweep 320→1920 in 50px steps + exact boundaries (320/767/768/917/1023/1024/1279/1280/1440/1920): **zero failures** (overflow 0, Sign in + Theme in view everywhere probed at md+; below md Sign in stays as the icon button, in view).
- Desktop 1440 unchanged (`vg002-after-1440.png`).

## Verdict: PASS → BUG-003
