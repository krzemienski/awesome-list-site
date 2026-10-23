import { useEffect } from "react";
import { Helmet } from "react-helmet";
import StatePanel, { RetryButton } from "@/components/layout/StatePanel";
import { trackSiteError } from "@/lib/analytics";

interface ErrorPageProps {
  error: Error | unknown;
  /** Refetch in place; without it Retry reloads the page. */
  onRetry?: () => void;
}

export default function ErrorPage({ error, onRetry }: ErrorPageProps) {
  // The raw message names internal request URLs; keep it in the console for
  // debugging rather than on the page.
  useEffect(() => {
    console.error("[ErrorPage]", error);
    trackSiteError("page_load_failed");
  }, [error]);
  return (
    <>
      <Helmet>
        <title>Error — Awesome Video</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <StatePanel
        tone="error"
        label="Error · unavailable"
        title="Something went wrong"
        headingLevel={1}
        actions={<RetryButton onRetry={onRetry ?? (() => window.location.reload())} testId="button-error-page-retry" />}
      >
        The catalog couldn&apos;t be loaded. This is usually a brief network or
        server problem. Please try again.
      </StatePanel>
    </>
  );
}
