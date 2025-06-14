// Utility functions for handling routing with GitHub Pages base path

// Get the base path from Vite configuration
export const BASE_PATH = import.meta.env.BASE_URL || '/';

// Helper to create proper paths for GitHub Pages
export function createPath(path: string): string {
  // Remove leading slash from path if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  // For production builds with base path, prepend it
  if (BASE_PATH !== '/' && import.meta.env.PROD) {
    // Remove trailing slash from BASE_PATH if present
    const cleanBase = BASE_PATH.endsWith('/') ? BASE_PATH.slice(0, -1) : BASE_PATH;
    return `${cleanBase}/${cleanPath}`;
  }
  
  // For development or when no base path, just return the path
  return `/${cleanPath}`;
}

// Helper to check if we're on the home page
export function isHomePage(pathname: string): boolean {
  // Remove base path if present
  const cleanPath = pathname.replace(BASE_PATH, '').replace(/^\//, '');
  return cleanPath === '' || cleanPath === '/';
}

// Helper to extract route params accounting for base path
export function extractPath(pathname: string): string {
  // Remove base path if present
  if (BASE_PATH !== '/' && pathname.startsWith(BASE_PATH)) {
    return pathname.slice(BASE_PATH.length);
  }
  return pathname;
}