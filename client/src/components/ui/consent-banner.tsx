import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useAppBottomInset } from "@/hooks/use-app-bottom-inset";
import {
  ANALYTICS_VENDORS,
  getAnalyticsConsent,
  setAnalyticsConsent,
  initGA,
  optOutGA,
  trackPageView,
} from "@/lib/analytics";
import { initMixpanel, optOutMixpanel } from "@/lib/mixpanel";
import { initPosthog, optOutPosthog } from "@/lib/posthog";
import { initAmplitude, optOutAmplitude } from "@/lib/amplitude";
import "@/styles/pages/system-overlays.css";
import { useHomeBoot } from "@/lib/home-boot";

// R5-025 (run24): custom event that re-opens the consent banner. Dispatched
// by the "Cookie settings" links in Footer and /privacy via
// openCookieSettings() so users can change a persisted consent choice.
const OPEN_COOKIE_SETTINGS_EVENT = "open-cookie-settings";
export function openCookieSettings() {
  window.dispatchEvent(new CustomEvent(OPEN_COOKIE_SETTINGS_EVENT));
}

/** False when this build has no analytics vendor keys, so there is nothing to consent to. */
export const hasAnalyticsVendors = ANALYTICS_VENDORS.length > 0;

const vendorList = new Intl.ListFormat("en", { type: "conjunction" }).format(ANALYTICS_VENDORS);

// BUG-020 (run13): analytics consent banner. Google Analytics loads ONLY
// after an explicit "Accept" (see the consent gate inside initGA); declining
// keeps the site fully functional with zero analytics. The choice persists in
// localStorage, so the banner appears once per browser.
export default function ConsentBanner() {
  const homeBoot = useHomeBoot();
  const isInitialHomeHydration = homeBoot?.isAnonymous === true;
  // The first client render must use the same public cookie value as SSR.
  // Legacy localStorage is reconciled after hydration by the normal decision
  // path, while new choices mirror to the cookie in setAnalyticsConsent().
  const [choiceMade, setChoiceMade] = useState(
    () => isInitialHomeHydration
      ? homeBoot?.consent !== null
      : getAnalyticsConsent() !== null,
  );
  // Cookie settings is a modal dialog, separate from the first-visit banner:
  // it shows the saved choice, lets the visitor change it, and Cancel/Escape
  // leave that choice exactly as it was.
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draft, setDraft] = useState<"granted" | "denied" | "">("");
  // NB-003 (run18): at very small widths (<360px, e.g. 320×568) the stacked
  // banner grew tall enough to sit over the /login submit button. Track a
  // compact breakpoint so we can render a single-row, reduced-copy bar there.
  // R4-042: ALSO go compact on short viewports (<500px tall, e.g. 812×375
  // landscape) — the two-row banner covered the Sign-in CTA there; the compact
  // single-row bar is short enough to leave it reachable at first paint.
  const isCompactViewport = () =>
    typeof window !== "undefined" && (window.innerWidth < 360 || window.innerHeight < 500);
  // A server cannot know the exact visual viewport. Keep the first hydrated
  // markup equal to SSR, then apply the compact breakpoint in the effect below.
  const [isCompact, setIsCompact] = useState(
    () => (isInitialHomeHydration ? false : isCompactViewport()),
  );
  const [legacyConsentReconciled, setLegacyConsentReconciled] = useState(
    () => !isInitialHomeHydration,
  );
  const bannerRef = useRef<HTMLDivElement | null>(null);
  // Two consumers of the same node: `bannerRef` for the focus move on re-open,
  // and state so the inset hook re-observes if React ever swaps the element.
  const [bannerEl, setBannerEl] = useState<HTMLDivElement | null>(null);
  const attachBanner = useCallback((node: HTMLDivElement | null) => {
    bannerRef.current = node;
    setBannerEl(node);
  }, []);
  // Closing unmounts the banner, so a keyboard user focused inside it would
  // drop to BODY. Remember who re-opened it and hand focus back there (or to
  // the main landmark when the banner appeared on its own).
  const openerRef = useRef<HTMLElement | null>(null);
  const restoreFocusRef = useRef(false);
  const closeBanner = useCallback(() => {
    const banner = bannerRef.current;
    restoreFocusRef.current = !!banner && banner.contains(document.activeElement);
    setChoiceMade(true);
  }, []);

  useEffect(() => {
    if (!choiceMade || !restoreFocusRef.current) return;
    restoreFocusRef.current = false;
    const opener = openerRef.current;
    openerRef.current = null;
    if (opener?.isConnected) {
      opener.focus();
    } else {
      document.getElementById("main")?.focus({ preventScroll: true });
    }
  }, [choiceMade]);

  // Task #380: the banner no longer reaches into layout it does not own. It is
  // the last row of the #root column (index.css), `position: sticky; bottom: 0`
  // at every width, so normal flow keeps page content and the footer clear of
  // it without any padding written onto body, #root or the footer's container.
  // Being last in the DOM and last on screen at every width keeps focus order
  // and visual order the same (WCAG 2.4.3). The one thing flow cannot move is
  // viewport-fixed UI, which reads the shell's --app-bottom-inset instead.
  useAppBottomInset(bannerEl, !choiceMade);

  useEffect(() => {
    const onResize = () => setIsCompact(isCompactViewport());
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Existing installations stored consent only in localStorage. New decisions
  // also set a small same-site cookie for SSR, while this one-time post-hydrate
  // reconciliation preserves the legacy value without a server/client mismatch.
  useEffect(() => {
    if (!homeBoot || legacyConsentReconciled) return;
    const legacyConsent = getAnalyticsConsent();
    if (homeBoot?.consent === null && legacyConsent !== null) {
      // Migrate the legacy choice to the public SSR cookie without changing
      // its analytics semantics. This is intentionally post-hydration.
      setAnalyticsConsent(legacyConsent);
      setChoiceMade(true);
    }
    setLegacyConsentReconciled(true);
  }, [homeBoot, isInitialHomeHydration, legacyConsentReconciled]);

  // The prepaint marker is only a one-render bridge. In particular it must be
  // removed once a persisted choice is reconciled, or Cookie settings would
  // reopen a banner that CSS keeps permanently invisible.
  useEffect(() => {
    if (!legacyConsentReconciled || !choiceMade || typeof document === "undefined") return;
    document.documentElement.removeAttribute("data-consent-known");
  }, [choiceMade, legacyConsentReconciled]);

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
      // An overlay that consumed this Escape (Radix dialogs, sheets and the
      // search palette preventDefault when they close) owns it; the banner
      // only dismisses on an Escape nothing else claimed.
      if (e.key !== "Escape" || e.defaultPrevented) return;
      closeBanner();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [choiceMade, closeBanner]);

  // R5-025 (run24): consent-reset path. "Cookie settings" links (Footer,
  // /privacy) dispatch this event to re-open the banner so a persisted choice
  // (or an Escape dismissal) can always be revisited in-product.
  useEffect(() => {
    const onOpen = () => {
      // The dialog preselects the saved choice; with none saved (the banner
      // was dismissed with Escape) nothing is preselected and Save waits.
      setDraft(getAnalyticsConsent() ?? "");
      setSettingsOpen(true);
    };
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, onOpen);
  }, []);

  if (!hasAnalyticsVendors) return null;

  const decide = (value: "granted" | "denied") => {
    setAnalyticsConsent(value);
    closeBanner();
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

  const settingsDialog = (
    <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
      <DialogContent data-testid="cookie-settings-dialog">
        <DialogHeader>
          <DialogTitle>Cookie settings</DialogTitle>
          <DialogDescription>
            Analytics ({vendorList}) load only if you allow them. Your current choice is selected;
            Cancel keeps it unchanged.{" "}
            <Link href="/privacy" onClick={() => setSettingsOpen(false)} className="system-consent-banner__privacy-link" data-testid="cookie-settings-privacy-link">
              Privacy Policy
            </Link>
          </DialogDescription>
        </DialogHeader>
        <RadioGroup
          value={draft}
          onValueChange={(v) => setDraft(v as "granted" | "denied")}
          aria-label="Analytics cookies"
          data-testid="cookie-settings-choice"
        >
          <div className="flex min-h-[44px] items-center gap-3">
            <RadioGroupItem value="granted" id="cookie-settings-granted" data-testid="cookie-settings-granted" />
            <Label htmlFor="cookie-settings-granted" className="flex min-h-[44px] flex-1 cursor-pointer items-center">Allow analytics</Label>
          </div>
          <div className="flex min-h-[44px] items-center gap-3">
            <RadioGroupItem value="denied" id="cookie-settings-denied" data-testid="cookie-settings-denied" />
            <Label htmlFor="cookie-settings-denied" className="flex min-h-[44px] flex-1 cursor-pointer items-center">Decline analytics</Label>
          </div>
        </RadioGroup>
        <DialogFooter className="gap-2">
          <Button variant="ghost" className="min-h-[44px]" onClick={() => setSettingsOpen(false)} data-testid="cookie-settings-cancel">Cancel</Button>
          <Button
            className="min-h-[44px]"
            disabled={draft === ""}
            onClick={() => {
              if (draft === "") return;
              if (draft !== getAnalyticsConsent()) decide(draft);
              setSettingsOpen(false);
            }}
            data-testid="cookie-settings-save"
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // NB-003 (run18): condensed single-row bar for <360px viewports. Reduced
  // padding, trimmed copy and inline Accept/Decline buttons keep the banner
  // short (and max-h capped) so it no longer covers the centred /login submit
  // button at 320×568. The bar is in flow either way, so the form keeps its
  // own space; the compact variant just gives the page more of the viewport.

  // One stable tree: the dialog stays mounted while the banner appears and
  // disappears, so saving a choice never remounts it (and drops focus return).
  const banner = choiceMade ? null : isCompact ? (
      <div
        ref={attachBanner}
        role="region"
        aria-label="Analytics consent"
        tabIndex={-1}
        className="system-consent-banner system-consent-banner--compact outline-none"
        data-testid="consent-banner"
      >
        <div className="system-consent-banner__inner mx-auto flex w-full max-h-[30vh] items-center gap-2 overflow-hidden px-3 py-2">
          <p className="system-consent-banner__copy min-w-0 flex-1 truncate text-xs">
            Analytics cookies?{" "}
            <Link
              href="/privacy"
              className="system-consent-banner__privacy-link"
              data-testid="consent-privacy-link"
            >
              Privacy
            </Link>
          </p>
          <div className="system-consent-banner__actions flex shrink-0 items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="system-consent-banner__action min-h-[36px] px-2 text-xs"
              onClick={() => decide("denied")}
              data-testid="consent-decline"
            >
              Decline
            </Button>
            <Button
              size="sm"
              className="system-consent-banner__action min-h-[36px] px-2 text-xs"
              onClick={() => decide("granted")}
              data-testid="consent-accept"
            >
              Accept
            </Button>
          </div>
        </div>
      </div>
  ) : (
    <div
      ref={attachBanner}
      role="region"
      aria-label="Analytics consent"
      tabIndex={-1}
      className="system-consent-banner outline-none"
      data-testid="consent-banner"
    >
      {/* Run16 BUG-062: shrink the mobile footprint (tighter padding, second
          sentence hidden on xs) so the pinned bar takes less of a 375px
          viewport. */}
      <div className="system-consent-banner__inner mx-auto w-full flex flex-col items-start gap-2 px-4 py-2 sm:flex-row sm:items-center sm:gap-3 sm:px-6 sm:py-3 md:px-12">
        <p className="system-consent-banner__copy flex-1 text-xs sm:text-sm">
          We use analytics ({vendorList}) to understand how the site is used — only if you allow
          it.{" "}
          <span className="hidden sm:inline">
            Decline and none of them load.
            {ANALYTICS_VENDORS.includes("Mixpanel")
              ? " Allow and, if you are signed in, your name and email are attached to your analytics profile."
              : ""}{" "}
          </span>
          See our{" "}
          {/* An inline link in running text is exempt from the 24px target
              minimum (WCAG 2.5.8); a taller box would stretch its line. */}
          <Link
            href="/privacy"
            className="system-consent-banner__privacy-link"
            data-testid="consent-privacy-link"
          >
            Privacy Policy
          </Link>
          .
        </p>
        <div className="system-consent-banner__actions flex shrink-0 items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="system-consent-banner__action min-h-[44px]"
            onClick={() => decide("denied")}
            data-testid="consent-decline"
          >
            Decline
          </Button>
          {/* Not a primary: the banner overlays pages that own their one primary action. */}
          <Button
            variant="outline"
            size="sm"
            className="system-consent-banner__action min-h-[44px]"
            onClick={() => decide("granted")}
            data-testid="consent-accept"
          >
            Allow analytics
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {settingsDialog}
      {banner}
    </>
  );
}
