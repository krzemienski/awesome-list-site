import Bookmarks from "@/pages/Bookmarks";
import GuestBookmarks from "@/pages/GuestBookmarks";
import { useAuth } from "@/hooks/useAuth";

// Task #329: /bookmarks is no longer a blind auth wall.
// - Signed in            → the full library (unchanged).
// - Guest                → the device library + optional account upgrade.
export default function BookmarksGate() {
  const { isAuthenticated, isLoading } = useAuth();

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
  return <GuestBookmarks />;
}
