import fs from "fs";
import path from "path";
import { type Server } from "http";
import { type Express } from "express";
import { createLogger, createServer as createViteServer } from "vite";
import viteConfig from "../vite.config";

const viteLogger = createLogger();

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    // Preserve `watch.ignored` and other configured server fields. Replacing
    // the block makes Replit's frequently updated local state trigger reloads.
    ...(viteConfig.server ?? {}),
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  // eslint-disable-next-line @typescript-eslint/no-misused-promises -- Express 4 accepts async handlers; errors are forwarded via next()
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(import.meta.dirname, "..", "client", "index.html");
      const template = await fs.promises.readFile(clientTemplate, "utf-8");
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (error) {
      vite.ssrFixStacktrace(error as Error);
      next(error);
    }
  });
}
