/**
 * Static data handling for production builds
 * 
 * In static builds, data is pre-fetched and stored in public/data/
 * In development, data is fetched from the API server
 */

import { AwesomeList } from '@/types/awesome-list';

export async function fetchStaticAwesomeList(): Promise<any> {
  // Check if we already have data from SSR
  if (typeof window !== 'undefined') {
    // Check for SSR injected data
    if (window.__INITIAL_DATA__) {
      const data = window.__INITIAL_DATA__;
      // Clear it after first use to prevent stale data
      window.__INITIAL_DATA__ = undefined;
      return data;
    }
  }

  // In production/static builds, fetch from pre-generated data
  if (import.meta.env.MODE === 'production' || import.meta.env.VITE_STATIC_BUILD === 'true') {
    try {
      const response = await fetch('/data/awesome-list.json');
      if (!response.ok) {
        throw new Error(`Failed to fetch static data: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to load static data, falling back to API:', error);
      // Fallback to API if static data is not available
    }
  }
  
  // Development mode or fallback - fetch from API
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