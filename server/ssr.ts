import type { Express, Request, Response, NextFunction } from "express";
import { renderToString } from "react-dom/server";
import fs from "fs";
import path from "path";
import { storage } from "./storage";

export async function handleSSR(req: Request, res: Response, next: NextFunction) {
  // CRITICAL FIX: Disable SSR in production until we have proper server bundle
  // SSR was blocking serveStatic middleware, causing white screen
  // The client/index.html references /src/main.tsx which doesn't exist in dist/
  // Let serveStatic serve the actual built Vite assets instead
  return next();
}

async function renderAppWithData(awesomeListData: any, url: string): Promise<string> {
  // Dynamic import to avoid issues in development
  try {
    // We'll render a basic HTML structure with the data
    // This ensures the initial HTML has the content
    if (!awesomeListData) {
      return '';
    }

    const { title, description, resources, categories } = awesomeListData;
    
    // Build basic HTML with the actual data
    let html = `
      <div class="flex min-h-screen w-full">
        <aside class="sidebar">
          <div class="sidebar-header">
            <h2>Awesome Video Resources</h2>
          </div>
          <nav class="sidebar-nav">
            <ul>
    `;

    // Add categories to sidebar
    if (categories && categories.length > 0) {
      categories.forEach((category: any) => {
        html += `
          <li>
            <a href="/category/${category.slug || category.name.toLowerCase().replace(/\s+/g, '-')}" 
               data-testid="category-${category.slug || category.name.toLowerCase().replace(/\s+/g, '-')}">
              <span>${category.name}</span>
              <span class="count">${category.resources?.length || 0}</span>
            </a>
        `;
        
        // Add subcategories if present
        if (category.subcategories && category.subcategories.length > 0) {
          html += '<ul class="subcategories">';
          category.subcategories.forEach((sub: any) => {
            html += `
              <li>
                <a href="/subcategory/${sub.slug}">
                  <span>${sub.name}</span>
                  <span class="count">${sub.resources?.length || 0}</span>
                </a>
              </li>
            `;
          });
          html += '</ul>';
        }
        
        html += '</li>';
      });
    }

    html += `
            </ul>
          </nav>
        </aside>
        <main class="flex-1">
          <div class="container">
            <header>
              <h1>${title || 'Awesome Video Resources'}</h1>
              <p>${resources?.length || 0} Resources</p>
            </header>
            <div class="resources-grid" data-testid="resources-container">
    `;

    // Add some initial resources
    if (resources && resources.length > 0) {
      const initialResources = resources.slice(0, 24); // First 24 resources
      initialResources.forEach((resource: any) => {
        html += `
          <div class="resource-card" data-testid="resource-${resource.title?.toLowerCase().replace(/\s+/g, '-')}">
            <h3>${resource.title}</h3>
            <p>${resource.description || ''}</p>
            <div class="meta">
              <span class="category">${resource.category || ''}</span>
              ${resource.subcategory ? `<span class="subcategory">${resource.subcategory}</span>` : ''}
            </div>
          </div>
        `;
      });
    }

    html += `
            </div>
          </div>
        </main>
      </div>
    `;

    return html;
  } catch (error) {
    console.error('Error rendering app with data:', error);
    return '';
  }
}