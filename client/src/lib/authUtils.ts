// Authentication utility functions

export function isUnauthorizedError(error: unknown): boolean {
  if (!error) return false;
  
  // Check for HTTP 401 status
  if (error instanceof Response) {
    return error.status === 401;
  }
  
  // Check for error object with status property
  if (typeof error === 'object' && 'status' in error) {
    return (error as any).status === 401;
  }
  
  // Check for fetch error with 401
  if (error instanceof Error) {
    return error.message.includes('401') || error.message.toLowerCase().includes('unauthorized');
  }
  
  return false;
}

export function redirectToLogin(returnTo?: string) {
  const currentPath = returnTo || window.location.pathname + window.location.search;
  // Store the return path in session storage
  sessionStorage.setItem('authReturnTo', currentPath);
  // Redirect to login page
  window.location.href = '/login';
}

export function getReturnPath(): string {
  const returnPath = sessionStorage.getItem('authReturnTo');
  if (returnPath) {
    sessionStorage.removeItem('authReturnTo');
    return returnPath;
  }
  return '/';
}