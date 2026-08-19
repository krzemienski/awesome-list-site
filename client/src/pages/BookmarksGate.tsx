import { useRef } from "react";
import Bookmarks from "@/pages/Bookmarks";
import GuestBookmarks from "@/pages/GuestBookmarks";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/hooks/useAuth";
import { getGuestBookmarks, useGuestBookmarks } from "@/lib/guestBookmarks";

// Task #329: /bookmarks is no longer a blind auth wall.
// - Signed in            → the full library (unchanged).
// - Guest with ≥1 save   → the guest library + "sign in to keep these" prompt.
// - Guest with none      → the classic AuthGuard toast + sign-in redirect.
export default function BookmarksGate() {
  const { isAuthenticated, isLoading } = useAuth();
  const guestEntries = useGuestBookmarks();
  // `useSyncExternalStore` will notify this route after a same-tab save, but
  // read the persisted snapshot as well. A direct navigation can mount this
  // lazy route between a localStorage write and React delivering that
  // subscription notification; treating that one render as empty would mount
  // AuthGuard and permanently redirect a guest who does have saves.
  const hasGuestSaves = guestEntries.length > 0 || getGuestBookmarks().length > 0;

  // Latch the guest branch: if a guest empties their list WHILE on the page,
  // keep the guest library mounted (it has its own empty state) instead of
  // abruptly firing the auth-wall toast + redirect mid-session.
  const hadGuestSavesRef = useRef(false);
  if (hasGuestSaves) hadGuestSavesRef.current = true;

  if (isLoading) {
    // Same shell AuthGuard shows while auth resolves.
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) return <Bookmarks />;
  if (hasGuestSaves || hadGuestSavesRef.current) return <GuestBookmarks />;
  return (
    <AuthGuard>
      <Bookmarks />
    </AuthGuard>
  );
}
