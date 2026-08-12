#!/usr/bin/env node
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import path from "node:path";
import zlib from "node:zlib";

const staticDir = path.resolve(process.env.PERF_STATIC_DIR ?? "dist/public");
const port = Number(process.env.PERF_STATIC_PORT ?? 5101);
const apiBase = new URL(
  process.env.PERF_API_BASE_URL ?? "http://127.0.0.1:5000",
);
const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

if (!fs.existsSync(path.join(staticDir, "index.html"))) {
  console.error(
    `No production build found at ${staticDir}. Set PERF_STATIC_DIR or run npm run build.`,
  );
  process.exit(1);
}

function proxyApi(request, response, requestUrl) {
  const transport = apiBase.protocol === "https:" ? https : http;
  const upstream = transport.request(
    {
      protocol: apiBase.protocol,
      hostname: apiBase.hostname,
      port: apiBase.port,
      method: request.method,
      path: `${requestUrl.pathname}${requestUrl.search}`,
      headers: {
        ...request.headers,
        host: apiBase.host,
      },
    },
    (upstreamResponse) => {
      response.writeHead(
        upstreamResponse.statusCode ?? 502,
        upstreamResponse.headers,
      );
      upstreamResponse.pipe(response);
    },
  );
  upstream.on("error", (error) => {
    response.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(`Performance API proxy failed: ${error.message}`);
  });
  request.pipe(upstream);
}

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url ?? "/", "http://localhost");
  if (requestUrl.pathname.startsWith("/api/")) {
    proxyApi(request, response, requestUrl);
    return;
  }

  let requestedPath;
  try {
    requestedPath = decodeURIComponent(requestUrl.pathname);
  } catch {
    response.writeHead(400);
    response.end("Bad path");
    return;
  }
  let file = path.resolve(staticDir, `.${requestedPath}`);
  if (
    !file.startsWith(`${staticDir}${path.sep}`) ||
    !fs.existsSync(file) ||
    fs.statSync(file).isDirectory()
  ) {
    file = path.join(staticDir, "index.html");
  }

  const extension = path.extname(file).toLowerCase();
  const body = fs.readFileSync(file);
  const headers = {
    "Content-Type": mimeTypes[extension] ?? "application/octet-stream",
    "Cache-Control": "no-store",
  };
  const compressible = /\.(?:html|js|css|json|svg)$/.test(extension);
  if (
    compressible &&
    request.headers["accept-encoding"]?.includes("gzip")
  ) {
    headers["Content-Encoding"] = "gzip";
    headers.Vary = "Accept-Encoding";
    response.writeHead(200, headers);
    response.end(zlib.gzipSync(body, { level: 9 }));
    return;
  }
  response.writeHead(200, headers);
  response.end(body);
});

server.listen(port, "127.0.0.1", () => {
  console.log(
    `Performance build ${staticDir} on http://127.0.0.1:${port} (API ${apiBase.origin})`,
  );
});

const shutdown = () => server.close(() => process.exit(0));
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);