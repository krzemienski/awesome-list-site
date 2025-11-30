import type { Express, Request, Response, NextFunction } from "express";
import { renderToString } from "react-dom/server";
import fs from "fs";
import path from "path";
import { storage } from "./storage";

export async function handleSSR(req: Request, res: Response, next: NextFunction) {
  try {
    const url = req.originalUrl;
    
    // Skip API routes and static assets
    if (url.startsWith('/api') || url.includes('.')) {
      return next();
    }

    // Load the HTML template
    // In production (Docker): use dist/public/index.html
    // In development: use client/index.html
    const templatePath = process.env.NODE_ENV === 'production'
      ? path.resolve(import.meta.dirname, "..", "dist", "public", "index.html")
      : path.resolve(import.meta.dirname, "..", "client", "index.html");
    let template = await fs.promises.readFile(templatePath, "utf-8");

    // SSR: Client-side fetches data from /api/categories and /api/resources
    // No server-side data injection needed - React Query handles data fetching

    // In production, we need to load the built server bundle
    // In development, this won't be used as Vite handles it
    if (process.env.NODE_ENV === 'production') {
      // For production, we'll need a built server bundle
      // We'll create a simple fallback for now
      const appHtml = await renderAppWithData(null, url);
      
      // Inject the rendered HTML
      template = template.replace(
        '<div id="root"></div>',
        `<div id="root">${appHtml}</div>`
      );

      // No server-side data injection - client fetches from APIs

      res.status(200).set({ "Content-Type": "text/html" }).send(template);
    } else {
      // In development, let Vite handle it
      next();
    }
  } catch (error) {
    console.error('SSR Error:', error);
    next();
  }
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