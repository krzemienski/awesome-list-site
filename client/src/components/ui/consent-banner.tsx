import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAppBottomInset } from "@/hooks/use-app-bottom-inset";
import {
  getAnalyticsConsent,
  setAnalyticsConsent,
  initGA,
  optOutGA,
  trackPageView,
} from "@/lib/analytics";
import { initMixpanel, optOutMixpanel } from "@/lib/mixpanel";
import { initPosthog, optOutPosthog } from "@/lib/posthog";
import { initAmplitude, optOutAmplitude } from "@/lib/amplitude";

// R5-025 (run24): custom event that re-opens the consent banner. Dispatched
// by the "Cookie settings" links in Footer and /privacy via
// openCookieSettings() so users can change a persisted consent choice.
const OPEN_COOKIE_SETTINGS_EVENT = "open-cookie-settings";
export function openCookieSettings() {
  window.dispatchEvent(new CustomEvent(OPEN_COOKIE_SETTINGS_EVENT));
}

// BUG-020 (run13): analytics consent banner. Google Analytics loads ONLY
// after an explicit "Accept" (see the consent gate inside initGA); declining
// keeps the site fully functional with zero analytics. The choice persists in
// localStorage, so the banner appears once per browser.
export default function ConsentBanner() {
  const [choiceMade, setChoiceMade] = useState(
    () => getAnalyticsConsent() !== null,
  );
  // NB-003 (run18): at very small widths (<360px, e.g. 320×568) the stacked
  // banner grew tall enough to sit over the /login submit button. Track a
  // compact breakpoint so we can render a single-row, reduced-copy bar there.
  // R4-042: ALSO go compact on short viewports (<500px tall, e.g. 812×375
  // landscape) — the two-row banner covered the Sign-in CTA there; the compact
  // single-row bar is short enough to leave it reachable at first paint.
  const isCompactViewport = () =>
    typeof window !== "undefined" &&
    (window.innerWidth < 360 || window.innerHeight < 500);
  const [isCompact, setIsCompact] = useState(isCompactViewport);
  const bannerRef = useRef<HTMLDivElement | null>(null);
  // Two consumers of the same node: `bannerRef` for the focus move on re-open,
  // and state so the inset hook re-observes if React ever swaps the element.
  const [bannerEl, setBannerEl] = useState<HTMLDivElement | null>(null);
  const attachBanner = useCallback((node: HTMLDivElement | null) => {
    bannerRef.current = node;
    setBannerEl(node);
  }, []);

  // Task #380: the banner no longer reaches into layout it does not own. It is
  // a row of the #root column (index.css) — `order-first` in flow at the top
  // below 640px, `sticky bottom-0` from 640px up — so normal flow keeps page
  // content and the footer clear of it without any padding written onto body,
  // #root or the footer's container. The one thing flow cannot move is
  // viewport-fixed UI, which reads the shell's --app-bottom-inset instead.
  useAppBottomInset(bannerEl, !choiceMade);

  useEffect(() => {
    const onResize = () => setIsCompact(isCompactViewport());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // R4-071 / BUG-054 (run26): the banner used to steal focus on mount, which
  // made its Privacy link the page's FIRST tab stop — ahead of the skip link
  // (WCAG 2.4.1). It no longer autofocuses on initial appearance (it renders
  // after the router in App.tsx, so keyboard users reach its controls right
  // after the page content); focus IS moved here on the explicit
  // "Cookie settings" re-open below, because that's a user-initiated action.
  // R5-025 (run24): Escape is dismiss-ONLY — it hides the banner for this
  // session without persisting any choice (the old behavior silently wrote a
  // permanent "denied" the user never knowingly made). The banner returns on
  // the next visit because localStorage stays null.
  useEffect(() => {
    if (choiceMade) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setChoiceMade(true);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [choiceMade]);

  // R5-025 (run24): consent-reset path. "Cookie settings" links (Footer,
  // /privacy) dispatch this event to re-open the banner so a persisted choice
  // (or an Escape dismissal) can always be revisited in-product.
  useEffect(() => {
    const onOpen = () => {
      setChoiceMade(false);
      // Re-focus after the banner re-renders.
      setTimeout(() => bannerRef.current?.focus(), 0);
    };
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, onOpen);
  }, []);

  if (choiceMade) return null;

  const decide = (value: "granted" | "denied") => {
    setAnalyticsConsent(value);
    setChoiceMade(true);
    if (value === "granted") {
      initGA();
      initMixpanel();
      initPosthog();
      initAmplitude();
      // The initial mount happened before this first-time grant, so it could
      // not queue a page view. Record the current page once consent exists.
      trackPageView(window.location.href);
    } else {
      // Consent revoked (possibly after a prior grant via Cookie settings):
      // stop every vendor immediately and clear any app-side pending events.
      optOutGA();
      optOutMixpanel();
      optOutPosthog();
      optOutAmplitude();
    }
  };

  // NB-003 (run18): condensed single-row bar for <360px viewports. Reduced
  // padding, trimmed copy and inline Accept/Decline buttons keep the banner
  // short (and max-h capped) so it no longer covers the centred /login submit
  // button at 320×568. The bar is in flow either way, so the form keeps its
  // own space; the compact variant just gives the page more of the viewport.
  if (isCompact) {
    return (
      <div
        ref={attachBanner}
        role="region"
        aria-label="Analytics consent"
        tabIndex={-1}
        className="relative order-first border-b border-[var(--border)] bg-[var(--bg)] shadow-lg outline-none sm:sticky sm:bottom-0 sm:z-50 sm:order-none sm:border-b-0 sm:border-t"
        data-testid="consent-banner"
      >
        <div className="mx-auto flex w-full max-w-[1280px] max-h-[30vh] items-center gap-2 overflow-hidden px-3 py-2">
          <p className="min-w-0 flex-1 truncate text-xs text-[color:var(--text-2)]">
            Analytics cookies?{" "}
            <Link
              href="/privacy"
              className="inline-flex min-h-10 items-center align-middle underline hover:text-[color:var(--text)]"
              data-testid="consent-privacy-link"
            >
              Privacy
            </Link>
          </p>
          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="min-h-[36px] px-2 text-xs"
              onClick={() => decide("denied")}
              data-testid="consent-decline"
            >
              Decline
            </Button>
            <Button
              size="sm"
              className="min-h-[36px] px-2 text-xs"
              onClick={() => decide("granted")}
              data-testid="consent-accept"
            >
              Accept
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={attachBanner}
      role="region"
      aria-label="Analytics consent"
      tabIndex={-1}
      className="relative order-first border-b border-[var(--border)] bg-[var(--bg)] shadow-lg outline-none sm:sticky sm:bottom-0 sm:z-50 sm:order-none sm:border-b-0 sm:border-t"
      data-testid="consent-banner"
    >
      {/* Run16 BUG-062: shrink the mobile footprint (tighter padding, second
          sentence hidden on xs) so the bar takes less of the viewport at
          375px, where it sits in flow at the top and scrolls away. */}
      <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 md:px-12 py-2 sm:py-3 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
        <p className="text-xs sm:text-sm text-[color:var(--text-2)] flex-1">
          We use analytics (Google Analytics, Mixpanel, PostHog and Amplitude)
          to understand how the site is used — only if you allow it.{" "}
          <span className="hidden sm:inline">
            Decline and none of them load. Allow and, if you are signed in,
            your name and email are attached to your analytics profile.{" "}
          </span>
          See our{" "}
          {/* Run17 BUG-048: inline-flex + min-h keeps the tap target ≥24px. */}
          <Link
            href="/privacy"
            className="underline hover:text-[color:var(--text)] inline-flex min-h-10 items-center align-middle"
            data-testid="consent-privacy-link"
          >
            Privacy Policy
          </Link>
          .
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="min-h-[44px]"
            onClick={() => decide("denied")}
            data-testid="consent-decline"
          >
            Decline
          </Button>
          <Button
            size="sm"
            className="min-h-[44px]"
            onClick={() => decide("granted")}
            data-testid="consent-accept"
          >
            Allow analytics
          </Button>
        </div>
      </div>
    </div>
  );
}
