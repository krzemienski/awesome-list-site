import { useEffect, useRef } from "react";
import { Helmet } from "react-helmet";
import StatePanel, { RetryButton } from "@/components/layout/StatePanel";
import { trackSiteError } from "@/lib/analytics";
import { ApiError } from "@/lib/queryClient";

/** Delays between automatic retries of a network-level failure while online. */
const NETWORK_RETRY_DELAYS_MS = [1000, 2500, 5000];

/** fetch() itself rejected (no HTTP response): the connection, not the server, failed. */
const isNetworkFailure = (error: unknown) => !(error instanceof ApiError) && error instanceof TypeError;

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

  // The offline copy promises a page "will load on its own when you
  // reconnect". The refetch that fires on reconnect can itself fail while the
  // link is still settling, which lands here with no further trigger. So a
  // network failure retries by itself: on every `online` event, and on a short
  // backoff while the browser reports online.
  const onRetryRef = useRef(onRetry);
  onRetryRef.current = onRetry;
  const attemptsRef = useRef(0);
  useEffect(() => {
    if (!onRetryRef.current || !isNetworkFailure(error)) return;
    const retry = () => onRetryRef.current?.();
    const handleOnline = () => {
      attemptsRef.current = 0;
      retry();
    };
    window.addEventListener("online", handleOnline);
    let timer: number | undefined;
    if (navigator.onLine !== false && attemptsRef.current < NETWORK_RETRY_DELAYS_MS.length) {
      timer = window.setTimeout(retry, NETWORK_RETRY_DELAYS_MS[attemptsRef.current++]);
    }
    return () => {
      window.removeEventListener("online", handleOnline);
      window.clearTimeout(timer);
    };
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
