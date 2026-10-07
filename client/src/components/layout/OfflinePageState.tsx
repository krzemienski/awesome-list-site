import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/layout/SEOHead";
import { handoffFocusOnUnmount } from "@/hooks/focus-handoff";
import "@/styles/pages/system.css";

/**
 * A page whose primary query was paused because the browser is offline.
 * TanStack Query pauses such a fetch instead of failing it, so without this
 * state the page saw "no data" and told the visitor the page does not exist.
 * The query resumes by itself on reconnect; Retry is the manual path.
 */
export default function OfflinePageState({ onRetry, testId }: { onRetry: () => void; testId: string }) {
  const [stillOffline, setStillOffline] = useState(false);
  return (
    <div className="system-state" role="alert" data-testid={testId}>
      <SEOHead title="You're offline" description="This page will load when your connection is back." noindex />
      <div className="system-state-panel">
        <p className="system-state-kicker caret" aria-hidden="true">
          ~/awesome.video/offline → paused
        </p>
        <h1 className="display-h system-state-title">You're offline</h1>
        <p className="system-state-copy">
          This page couldn't load because your device has no connection. It will
          load on its own when you reconnect.
        </p>
        {stillOffline && (
          <p className="system-state-note" data-testid={`${testId}-still-offline`}>
            Still offline — reconnect and try again.
          </p>
        )}
        <div className="system-state-actions">
          <Button
            variant="outline"
            onClick={(e) => {
              if (navigator.onLine === false) {
                setStillOffline(true);
                return;
              }
              handoffFocusOnUnmount(e.currentTarget);
              onRetry();
            }}
            data-testid={`${testId}-retry`}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Try again
          </Button>
        </div>
      </div>
    </div>
  );
}
