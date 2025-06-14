/**
 * Static data handling for production builds
 * 
 * In static builds, data is pre-fetched and stored in public/data/
 * In development, data is fetched from the API server
 */

import { AwesomeList } from '@/types/awesome-list';

// Get base URL from Vite
const BASE_URL = import.meta.env.BASE_URL || '/';

export async function fetchStaticAwesomeList(): Promise<any> {
  // For static builds, always use the pre-generated JSON data
  try {
    const response = await fetch(`${BASE_URL}data/awesome-list.json`);
    if (!response.ok) {
      throw new Error(`Failed to load data: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    console.log('Successfully loaded static awesome list data');
    return data;
  } catch (error) {
    console.error('Failed to load awesome list data:', error);
    throw new Error(`Unable to load awesome list data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function fetchSitemapData(): Promise<any> {
  try {
    const response = await fetch(`${BASE_URL}data/sitemap.json`);
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch (error) {
    console.warn('Sitemap data not available:', error);
    return null;
  }
}