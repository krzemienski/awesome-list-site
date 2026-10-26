import { useLayoutEffect, useRef, useState } from "react";
import SEOHead from "@/components/layout/SEOHead";
import { handoffFocusOnUnmount } from "@/hooks/focus-handoff";
import StatePanel, { RetryButton } from "@/components/layout/StatePanel";

/**
 * A page whose primary query was paused because the browser is offline.
 * TanStack Query pauses such a fetch instead of failing it, so without this
 * state the page saw "no data" and told the visitor the page does not exist.
 * The query resumes by itself on reconnect; Retry is the manual path.
 */
export default function OfflinePageState({ onRetry, testId }: { onRetry: () => void; testId: string }) {
  const [stillOffline, setStillOffline] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  // Reconnecting (or Retry) unmounts this state from under the visitor's
  // focus. A layout cleanup still runs while the panel is in the DOM, so it
  // can tell whether focus was inside and pass it to the loaded page's h1.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    return () => {
      const active = document.activeElement;
      if (active instanceof HTMLElement && panel?.contains(active)) handoffFocusOnUnmount(active);
    };
  }, []);
  return (
    <>
      <SEOHead title="You're offline" description="This page will load when your connection is back." noindex />
      <StatePanel
        ref={panelRef}
        tone="error"
        label="Offline"
        title="You're offline"
        headingLevel={1}
        testId={testId}
        actions={
          <RetryButton
            handoffFocus={false}
            onRetry={() => {
              if (navigator.onLine === false) {
                setStillOffline(true);
                return;
              }
              onRetry();
            }}
            testId={`${testId}-retry`}
          />
        }
      >
        This page couldn&apos;t load because your device has no connection. It will
        load on its own when you reconnect.
        {stillOffline && (
          <p className="system-state-note" data-testid={`${testId}-still-offline`}>
            Still offline — reconnect and try again.
          </p>
        )}
      </StatePanel>
    </>
  );
}
