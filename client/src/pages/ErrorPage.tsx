import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import StatePanel, { RetryButton } from "@/components/layout/StatePanel";
import { focusPageHeading } from "@/hooks/focus-handoff";
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
  /** A refetch is in flight: Retry shows its busy state. */
  retrying?: boolean;
}

export default function ErrorPage({ error, onRetry, retrying }: ErrorPageProps) {
  const [offline, setOffline] = useState(() => typeof navigator !== "undefined" && navigator.onLine === false);
  const [stillOffline, setStillOffline] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const wasOffline = useRef(offline);
  useEffect(() => {
    const updateConnection = () => {
      const disconnected = navigator.onLine === false;
      if (disconnected) wasOffline.current = true;
      else setStillOffline(false);
      setOffline(disconnected);
    };
    updateConnection();
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    return () => {
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
    };
  }, []);

  // Unlike a clicked Retry, automatic recovery may start with focus on BODY.
  // Arm only for this offline error, and stop if the visitor moves elsewhere.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    const path = window.location.pathname;
    let movedElsewhere = false;
    const noteInteraction = (event: Event) => {
      if (event.type === "keydown" && event.target === document.body) return;
      if (event.target instanceof Node && !panel?.contains(event.target)) movedElsewhere = true;
    };
    document.addEventListener("focusin", noteInteraction);
    document.addEventListener("keydown", noteInteraction, true);
    document.addEventListener("pointerdown", noteInteraction, true);
    return () => {
      document.removeEventListener("focusin", noteInteraction);
      document.removeEventListener("keydown", noteInteraction, true);
      document.removeEventListener("pointerdown", noteInteraction, true);
      const active = document.activeElement;
      if (!wasOffline.current || movedElsewhere || window.location.pathname !== path ||
          (active && active !== document.body && !panel?.contains(active))) return;

      let frame = 0;
      const finish = () => {
        cancelAnimationFrame(frame);
        observer.disconnect();
        window.clearTimeout(timeout);
        document.removeEventListener("focusin", finish);
        window.removeEventListener("keydown", finish, true);
        window.removeEventListener("pointerdown", finish, true);
      };
      const check = () => {
        const focused = document.activeElement;
        if (window.location.pathname !== path ||
            (focused && focused !== document.body && focused.isConnected && !panel?.contains(focused))) return finish();
        const heading = document.querySelector<HTMLElement>("#main h1");
        if (panel?.isConnected || !heading?.getClientRects().length ||
            document.querySelector('#main [aria-busy="true"]')) return;
        finish();
        focusPageHeading();
      };
      const observer = new MutationObserver(check);
      const timeout = window.setTimeout(finish, 20000);
      observer.observe(document.body, { childList: true, subtree: true, attributes: true });
      document.addEventListener("focusin", finish);
      window.addEventListener("keydown", finish, true);
      window.addEventListener("pointerdown", finish, true);
      frame = requestAnimationFrame(check);
    };
  }, []);

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
  const handleManualRetry = () => {
    if (navigator.onLine === false) {
      setStillOffline(true);
      return;
    }
    attemptsRef.current = 0;
    if (onRetry) onRetry();
    else window.location.reload();
  };
  useEffect(() => {
    if (!onRetryRef.current || !isNetworkFailure(error)) return;
    const retry = () => {
      if (navigator.onLine !== false) onRetryRef.current?.();
    };
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
        ref={panelRef}
        tone="error"
        label={offline ? "Offline" : "Error · unavailable"}
        title={offline ? "You're offline" : "Something went wrong"}
        headingLevel={1}
        testId="error-page"
        actions={<RetryButton onRetry={handleManualRetry} handoffFocus={!wasOffline.current} busy={retrying && !offline} testId="button-error-page-retry" />}
      >
        {offline
          ? "The catalog couldn't load because your device has no connection. It will load on its own when you reconnect."
          : "The catalog couldn't be loaded. This is usually a brief network or server problem. Please try again."}
        {offline && stillOffline && (
          <p className="system-state-note" data-testid="error-page-still-offline">
            Still offline — reconnect and try again.
          </p>
        )}
      </StatePanel>
    </>
  );
}
