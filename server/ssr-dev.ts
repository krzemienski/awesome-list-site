import type { ViteDevServer } from 'vite';
import type { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { storage } from './storage';

export async function setupSSRDev(vite: ViteDevServer) {
  return async function ssrMiddleware(req: Request, res: Response, next: NextFunction) {
    const url = req.originalUrl;
    
    // Skip API routes, static assets, and Vite HMR
    if (
      url.startsWith('/api') ||
      url.includes('.') ||
      url.startsWith('/@') ||
      url.startsWith('/node_modules')
    ) {
      return next();
    }

    try {
      // Load the HTML template
      const templatePath = path.resolve(process.cwd(), 'client', 'index.html');
      let template = await fs.promises.readFile(templatePath, 'utf-8');
      
      // Transform HTML with Vite
      template = await vite.transformIndexHtml(url, template);
      
      // Load the server entry module
      const { render } = await vite.ssrLoadModule('/src/entry-server.tsx');

      // SSR: Client-side fetches data from APIs - no server-side injection
      // Render the app without pre-fetched data
      const { html, dehydratedState } = render({
        url,
        awesomeListData: null
      });
      
      // Replace the HTML placeholder with rendered content
      template = template.replace(
        '<!--app-html-->',
        html
      );
      
      // Inject the dehydrated state
      template = template.replace(
        '</head>',
        `<script>window.__DEHYDRATED_STATE__ = ${JSON.stringify(dehydratedState).replace(/</g, '\\u003c')}</script></head>`
      );
      
      // Send the rendered HTML
      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (error) {
      // If SSR fails, let Vite handle it normally
      console.error('SSR error:', error);
      vite.ssrFixStacktrace(error as Error);
      next(error);
    }
  };
}