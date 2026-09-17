import { useEffect, useMemo, useRef } from "react";
import { useQueries } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { AlertTriangle, Bookmark, BookmarkX, CloudUpload, LogIn } from "lucide-react";
import SEOHead from "@/components/layout/SEOHead";
import ResourceCard from "@/components/resource/ResourceCard";
import { ResourceCardSkeleton } from "@/components/ui/skeletons";
import { Button } from "@/components/ui/button";
import { queryClient, ApiError } from "@/lib/queryClient";
import type { Resource } from "@shared/schema";
import type { ResourceKind } from "@shared/resourceKinds";
import {
  GUEST_BOOKMARK_CAP,
  isGuestStorePersistent,
  removeGuestBookmarkIds,
  useGuestBookmarks,
} from "@/lib/guestBookmarks";
import { trackAuthPromptShown } from "@/lib/analytics";
import "@/styles/pages/account.css";

// The public resource detail endpoint adds read-time kind resolution to the
// database row. Keep this response type additive: the server supplies the
// value, so the client does not infer or fabricate a fallback kind.
type GuestPublicResource = Resource & {
  resolvedKind: ResourceKind;
};

// Task #329: the guest view of /bookmarks. Signed-out visitors with ≥1
// on-device save see their list plus a "sign in to keep these everywhere"
// prompt instead of the old blind auth-wall redirect. Plain saves only —
// notes, statuses, and collections stay account features (the upsell names
// them). On sign-in, GuestBookmarkMerge pushes these into the account.
export default function GuestBookmarks() {
  const [, setLocation] = useLocation();
  const entries = useGuestBookmarks();
  const persistent = isGuestStorePersistent();

  const sortedEntries = useMemo(
    () =>
      [...entries].sort((a, b) =>
        a.savedAt < b.savedAt ? 1 : a.savedAt > b.savedAt ? -1 : b.id - a.id,
      ),
    [entries],
  );

  // Funnel: one prompt impression per visit to this page.
  const promptTrackedRef = useRef(false);
  useEffect(() => {
    if (!promptTrackedRef.current && entries.length > 0) {
      promptTrackedRef.current = true;
      trackAuthPromptShown("bookmarks_page", entries.length);
    }
  }, [entries.length]);

  // One cached query per saved id (default key[0] fetcher hits the public
  // detail endpoint), so removing one card never refetches the rest.
  const results = useQueries({
    queries: sortedEntries.map((entry) => ({
      queryKey: [`/api/resources/${entry.id}`],
      staleTime: 5 * 60 * 1000,
    })),
  });

  // Self-healing: a 404 means the resource is gone — drop that save. Network
  // or server errors keep the save (never silently lose a guest's list).
  const deadIds = useMemo(
    () =>
      results
        .map((result, index) =>
          result.error instanceof ApiError && result.error.status === 404
            ? sortedEntries[index]?.id
            : undefined,
        )
        .filter((id): id is number => typeof id === "number"),
    [results, sortedEntries],
  );
  useEffect(() => {
    if (deadIds.length > 0) removeGuestBookmarkIds(deadIds);
  }, [deadIds]);

  const failedIds = results
    .map((result, index) =>
      result.error && !(result.error instanceof ApiError && result.error.status === 404)
        ? sortedEntries[index]?.id
        : undefined,
    )
    .filter((id): id is number => typeof id === "number");

  const retryFailed = () => {
    for (const id of failedIds) {
      queryClient.invalidateQueries({ queryKey: [`/api/resources/${id}`] });
    }
  };

  const goAuth = (path: "/sign-in" | "/sign-up") =>
    setLocation(`${path}?redirect_url=${encodeURIComponent("/bookmarks")}`);

  const count = entries.length;

  if (count === 0) {
    return (
      <div className="account-page account-page--wide space-y-6">
        <SEOHead
          title="Saved on This Device"
          description="Resources you saved as a guest — sign in to keep them in your account"
          noindex
        />
        <div className="text-center py-12">
          <div className="account-empty-icon p-6 mb-6 inline-flex">
            <BookmarkX className="h-12 w-12 text-primary" aria-hidden="true" />
          </div>
          <h1 className="display-h text-2xl mb-2">Nothing saved on this device</h1>
          <p className="text-muted-foreground mb-5">
            Tap the bookmark icon on any resource to save it — no account needed.
            Sign in to keep your saves across devices.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild className="min-h-11">
              <Link href="/">Explore resources</Link>
            </Button>
            <Button
              variant="outline"
              className="min-h-11"
              onClick={() => goAuth("/sign-in")}
              data-testid="button-guest-empty-signin"
            >
              <LogIn className="mr-2 h-4 w-4" aria-hidden="true" /> Sign in
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="account-page account-page--wide space-y-6">
      <SEOHead
        title="Saved on This Device"
        description="Resources you saved as a guest — sign in to keep them in your account"
        noindex
      />

      <header className="space-y-2">
        <div className="eyebrow" aria-hidden>
          {"// Saved on this device"}
        </div>
        <div className="flex items-center gap-3">
          <Bookmark className="h-8 w-8 text-primary" aria-hidden="true" />
          <h1 className="display-h text-3xl sm:text-4xl">
            Saved, <em className="not-italic text-primary">for now.</em>
          </h1>
        </div>
        <p className="mt-2 text-muted-foreground" data-testid="text-guest-save-count">
          {count === 1 ? "1 resource is" : `${count} resources are`} saved in this
          browser only.
        </p>
      </header>

      <section
        aria-label="Keep your saved resources"
        className="account-callout account-callout--accent p-4 sm:p-5"
        data-testid="banner-guest-signin-prompt"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <CloudUpload className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <div className="min-w-0">
              <h2 className="font-semibold">Sign in to keep these everywhere</h2>
              <p className="text-sm text-muted-foreground">
                {count === 1
                  ? "Your saved resource will move to your account automatically"
                  : `Your ${count} saved resources will move to your account automatically`}{" "}
                — and you'll unlock notes, watch-next statuses, and collections.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              className="min-h-11"
              onClick={() => goAuth("/sign-up")}
              data-testid="button-guest-create-account"
            >
              Create free account
            </Button>
            <Button
              variant="outline"
              className="min-h-11"
              onClick={() => goAuth("/sign-in")}
              data-testid="button-guest-signin"
            >
              <LogIn className="mr-2 h-4 w-4" aria-hidden="true" /> Sign in
            </Button>
          </div>
        </div>
        {!persistent && (
          <p
            className="account-callout--danger mt-3 flex items-start gap-1.5 text-sm"
            data-testid="text-guest-storage-warning"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            Browser storage is unavailable, so these saves last only for this
            visit. Sign in to keep them.
          </p>
        )}
        {persistent && count >= GUEST_BOOKMARK_CAP && (
          <p className="mt-3 text-sm text-muted-foreground" data-testid="text-guest-cap-notice">
            You've reached the {GUEST_BOOKMARK_CAP}-save limit for this device.
            Your account library has no limit.
          </p>
        )}
      </section>

      {failedIds.length > 0 && (
        <div
          role="alert"
          className="account-callout account-callout--danger flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
          data-testid="banner-guest-load-failed"
        >
          <span>
            {failedIds.length === 1
              ? "One saved resource couldn't load."
              : `${failedIds.length} saved resources couldn't load.`}{" "}
            {failedIds.length === 1 ? "It's" : "They're"} still saved on this device.
          </span>
          <Button
            variant="outline"
            size="sm"
            className="min-h-10"
            onClick={retryFailed}
            data-testid="button-guest-retry-failed"
          >
            Retry
          </Button>
        </div>
      )}

      <section
        aria-label="Saved resources"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {sortedEntries.map((entry, index) => {
          const result = results[index];
          if (!result || result.isPending) {
            return <ResourceCardSkeleton key={entry.id} />;
          }
           const resource = result.data as GuestPublicResource | undefined;
          // 404 rows are pruned by the effect above; other failures surface
          // in the banner. Either way there's no card to render yet.
          if (!resource) return null;
          return (
            <ResourceCard
              key={entry.id}
              resource={{
                id: String(resource.id),
                name: resource.title,
                url: resource.url,
                description: resource.description ?? undefined,
                category: resource.category ?? undefined,
                // NB-012: tags live in metadata.tags — no top-level column.
                tags: Array.isArray(resource.metadata?.tags)
                  ? (resource.metadata.tags as string[])
                  : [],
                 kind: resource.kind,
                 resolvedKind: resource.resolvedKind,
                 metadata: resource.metadata ?? undefined,
                isBookmarked: true,
              }}
              fullResource={resource}
            />
          );
        })}
      </section>
    </div>
  );
}
