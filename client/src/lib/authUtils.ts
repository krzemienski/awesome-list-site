// Authentication utility functions
import { currentReturnPath, normalizeReturnPath } from "@/lib/returnUrl";

export function redirectToLogin(returnTo?: string) {
  // Path + query + #fragment (admin tabs live in the hash), validated.
  const currentPath = normalizeReturnPath(returnTo) ?? currentReturnPath();
  // Task #307: sign-in is served by the Clerk-backed /sign-in page.
  window.location.href = `/sign-in?redirect_url=${encodeURIComponent(currentPath)}`;
}
