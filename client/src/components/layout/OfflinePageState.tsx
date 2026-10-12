import { useState } from "react";
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
  return (
    <>
      <SEOHead title="You're offline" description="This page will load when your connection is back." noindex />
      <StatePanel
        tone="error"
        label="Offline"
        title="You're offline"
        headingLevel={1}
        testId={testId}
        actions={
          <RetryButton
            handoffFocus={false}
            onRetry={(e) => {
              if (navigator.onLine === false) {
                setStillOffline(true);
                return;
              }
              handoffFocusOnUnmount(e.currentTarget);
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
