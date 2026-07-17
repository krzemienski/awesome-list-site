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
  const bannerRef = useRef<HTMLDivElement>(null);

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
