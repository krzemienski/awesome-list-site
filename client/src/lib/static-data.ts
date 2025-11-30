/**
 * Data fetching for awesome list
 * 
 * All data is now served from the PostgreSQL database via /api/awesome-list
 * Static JSON files have been deprecated in favor of database-driven content
 */

export async function fetchStaticAwesomeList(): Promise<any> {
  // Check if we already have data from SSR
  if (typeof window !== 'undefined') {
    // Check for SSR injected data
    if ((window as any).__INITIAL_DATA__) {
      const data = (window as any).__INITIAL_DATA__;
      // Clear it after first use to prevent stale data
      (window as any).__INITIAL_DATA__ = undefined;
      return data;
    }
  }
  
  // Always fetch from database-backed API
  const response = await fetch('/api/awesome-list');
  if (!response.ok) {
    throw new Error(`Failed to fetch from API: ${response.status}`);
  }
  return await response.json();
}

export async function fetchSitemapData(): Promise<any> {
  try {
    const response = await fetch('/data/sitemap.json');
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch (error) {
    console.warn('Sitemap data not available:', error);
    return null;
  }
}