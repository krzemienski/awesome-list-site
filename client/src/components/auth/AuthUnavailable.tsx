import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const isOffline = () => typeof navigator !== "undefined" && navigator.onLine === false;

/**
 * C5-V3-01: the sign-in/up pages' honest "can't continue" state. Retry runs
 * `onRetry` only when there is a connection to retry on; offline it keeps the
 * card and says so (same contract as RouteErrorBoundary). Coming back online
 * retries on its own.
 */
export function AuthUnavailableCard({
  title,
  body,
  onRetry,
}: {
  title: string;
  body: string;
  onRetry: () => void;
}) {
  const [stillOffline, setStillOffline] = useState(false);

  useEffect(() => {
    window.addEventListener("online", onRetry);
    return () => window.removeEventListener("online", onRetry);
  }, [onRetry]);

  const handleRetry = () => {
    if (isOffline()) {
      setStillOffline(true);
      return;
    }
    onRetry();
  };

  return (
    <div
      className="flex max-w-md flex-col items-center gap-4 px-4 text-center"
      role="alert"
      data-testid="auth-unavailable"
    >
      <h1 className="display-h text-xl">{title}</h1>
      <p className="text-sm text-muted-foreground">{body}</p>
      {stillOffline && (
        <p className="text-sm font-medium text-[var(--accent-ink)]" data-testid="text-still-offline">
          Still offline — reconnect and try again.
        </p>
      )}
      <Button type="button" onClick={handleRetry} data-testid="button-auth-retry">
        Retry
      </Button>
    </div>
  );
}

// Offline, a cached Clerk UI mounts in well under a second, so a short wait
// only covers the cold-cache case; online, leave room for a slow network.
const OFFLINE_MOUNT_WAIT_MS = 3_000;
const ONLINE_MOUNT_WAIT_MS = 15_000;

const reloadPage = () => window.location.reload();

/**
 * C5-V3-01: Clerk renders this `fallback` until its <SignIn>/<SignUp> UI has
 * mounted. Clerk loads that UI from its CDN and swallows a failed chunk, so a
 * cold cache offline used to leave the page body empty with no error for any
 * React boundary to catch. Clerk also caches the rejected chunk — remounting,
 * even after reconnecting, stays blank — so recovery is a full reload.
 */
export function ClerkUiFallback({ flow }: { flow: "sign-in" | "sign-up" }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(
      () => setFailed(true),
      isOffline() ? OFFLINE_MOUNT_WAIT_MS : ONLINE_MOUNT_WAIT_MS,
    );
    return () => clearTimeout(timer);
  }, []);

  if (!failed) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        Loading {flow}…
      </p>
    );
  }
  return isOffline() ? (
    <AuthUnavailableCard
      title={`Can't load ${flow} — you're offline`}
      body="Check your connection. The form loads as soon as you're back online."
      onRetry={reloadPage}
    />
  ) : (
    <AuthUnavailableCard
      title={`Couldn't load ${flow}`}
      body="The sign-in service didn't respond. Check your connection, then retry."
      onRetry={reloadPage}
    />
  );
}
