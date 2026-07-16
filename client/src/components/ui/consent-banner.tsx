import { useState } from "react";
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

  if (choiceMade) return null;

  const decide = (value: "granted" | "denied") => {
    setAnalyticsConsent(value);
    setChoiceMade(true);
    if (value === "granted") initGA();
  };

  return (
    <div
      role="region"
      aria-label="Analytics consent"
      className="fixed bottom-0 inset-x-0 z-50 border-t border-[var(--border)] bg-[var(--bg)] shadow-lg"
      data-testid="consent-banner"
    >
      <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 md:px-12 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <p className="text-xs sm:text-sm text-[color:var(--text-2)] flex-1">
          We use Google Analytics to understand aggregate usage — only if you
          allow it. No personal data is sent either way. See our{" "}
          <Link
            href="/privacy"
            className="underline hover:text-[color:var(--text)]"
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
