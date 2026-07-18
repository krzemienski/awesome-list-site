import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  getAnalyticsConsent,
  setAnalyticsConsent,
  initGA,
} from "@/lib/analytics";

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
  const [isCompact, setIsCompact] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 360,
  );
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onResize = () => setIsCompact(window.innerWidth < 360);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // BUG-004 (run14): the fixed banner overlapped page content (footer links,
  // bottom pagination) until a choice was made. While visible, pad the body
  // by the banner's real height so everything stays reachable; restore on
  // dismiss/unmount. Re-measures on resize (height changes when the flex row
  // wraps on small screens).
  useEffect(() => {
    if (choiceMade) return;
    const applyPadding = () => {
      const h = bannerRef.current?.offsetHeight ?? 0;
      const pad = h > 0 ? `${h}px` : "";
      document.body.style.paddingBottom = pad;
      // BUG-026 (run19): expose the banner height so the toast viewport can
      // lift itself above the banner (toast z-[100] > banner z-50, so without
      // an offset toasts cover the Accept/Decline buttons).
      document.documentElement.style.setProperty("--consent-banner-h", pad || "0px");
      // The sidebar layout's inset column overflows body's own box (body is
      // viewport-height while the grid content scrolls past it), so body
      // padding alone never lifts the footer above the fixed banner — pad
      // the footer's flow container too.
      const inset = document.querySelector("footer")?.parentElement;
      if (inset instanceof HTMLElement) inset.style.paddingBottom = pad;
    };
    applyPadding();
    window.addEventListener("resize", applyPadding);
    return () => {
      window.removeEventListener("resize", applyPadding);
      document.body.style.paddingBottom = "";
      document.documentElement.style.removeProperty("--consent-banner-h");
      const inset = document.querySelector("footer")?.parentElement;
      if (inset instanceof HTMLElement) inset.style.paddingBottom = "";
    };
  }, [choiceMade]);

  if (choiceMade) return null;

  const decide = (value: "granted" | "denied") => {
    setAnalyticsConsent(value);
    setChoiceMade(true);
    if (value === "granted") initGA();
  };

  // NB-003 (run18): condensed single-row bar for <360px viewports. Reduced
  // padding, trimmed copy and inline Accept/Decline buttons keep the banner
  // short (and max-h capped) so it no longer covers the centred /login submit
  // button at 320×568. The body/footer padding effect above still runs, so the
  // form stays fully reachable while the bar is visible.
  if (isCompact) {
    return (
      <div
        ref={bannerRef}
        role="region"
        aria-label="Analytics consent"
        className="fixed bottom-0 inset-x-0 z-50 border-t border-[var(--border)] bg-[var(--bg)] shadow-lg"
        data-testid="consent-banner"
      >
        <div className="mx-auto flex w-full max-w-[1280px] max-h-[30vh] items-center gap-2 overflow-hidden px-3 py-2">
          <p className="min-w-0 flex-1 truncate text-xs text-[color:var(--text-2)]">
            Analytics cookies?{" "}
            <Link
              href="/privacy"
              className="underline hover:text-[color:var(--text)]"
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
      ref={bannerRef}
      role="region"
      aria-label="Analytics consent"
      className="fixed bottom-0 inset-x-0 z-50 border-t border-[var(--border)] bg-[var(--bg)] shadow-lg"
      data-testid="consent-banner"
    >
      {/* Run16 BUG-062: shrink the mobile footprint (tighter padding, second
          sentence hidden on xs) so the fixed banner obscures less of the
          viewport at 375px; body/footer padding above keeps everything
          reachable by scrolling. */}
      <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 md:px-12 py-2 sm:py-3 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
        <p className="text-xs sm:text-sm text-[color:var(--text-2)] flex-1">
          We use Google Analytics to understand aggregate usage — only if you
          allow it.{" "}
          <span className="hidden sm:inline">No personal data is sent either way. </span>
          See our{" "}
          {/* Run17 BUG-048: inline-flex + min-h keeps the tap target ≥24px. */}
          <Link
            href="/privacy"
            className="underline hover:text-[color:var(--text)] inline-flex items-center min-h-[24px] align-middle"
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
