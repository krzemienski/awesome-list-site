// Authentication utility functions

export function redirectToLogin(returnTo?: string) {
  const currentPath = returnTo || window.location.pathname + window.location.search;
  // Store the return path in session storage
  sessionStorage.setItem('authReturnTo', currentPath);
  // Task #307: sign-in is served by the Clerk-backed /sign-in page.
  window.location.href = `/sign-in?redirect_url=${encodeURIComponent(currentPath)}`;
}
