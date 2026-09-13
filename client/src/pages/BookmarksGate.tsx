import Bookmarks from "@/pages/Bookmarks";
import GuestBookmarks from "@/pages/GuestBookmarks";
import { useAuth } from "@/hooks/useAuth";
import "@/styles/pages/account.css";

// Task #329: /bookmarks is no longer a blind auth wall.
// - Signed in            → the full library (unchanged).
// - Guest                → the device library + optional account upgrade.
export default function BookmarksGate() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    // Same shell AuthGuard shows while auth resolves.
    return (
      <div className="account-page account-page--wide min-h-full flex items-center justify-center">
        <div className="text-center">
          <div className="account-spinner animate-spin"></div>
          <p className="account-gate-loading">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) return <Bookmarks />;
  return <GuestBookmarks />;
}
