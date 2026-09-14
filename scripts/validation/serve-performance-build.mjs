#!/usr/bin/env node
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import path from "node:path";
import zlib from "node:zlib";
import { load } from "cheerio";

const staticDir = path.resolve(process.env.PERF_STATIC_DIR ?? "dist/public");
const port = Number(process.env.PERF_STATIC_PORT ?? 5101);
const apiBase = new URL(
  process.env.PERF_API_BASE_URL ?? "http://127.0.0.1:5000",
);
const prerenderOrigin = process.env.PERF_PRERENDER_ORIGIN
  ? new URL(process.env.PERF_PRERENDER_ORIGIN)
  : null;
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

function contentType(file) {
  return mimeTypes[path.extname(file).toLowerCase()] ?? "application/octet-stream";
}

function isCompressible(file) {
  return /\.(?:html|js|css|json|svg)$/.test(path.extname(file).toLowerCase());
}

function staticAsset(file, identity) {
  return {
    contentType: contentType(file),
    identity,
    gzip: isCompressible(file) ? zlib.gzipSync(identity, { level: 9 }) : null,
  };
}

/**
 * This server is a measurement shell, not a development file server. Loading
 * and gzip-compressing every requested asset synchronously made its response
 * time depend on concurrent browser requests and host filesystem contention.
 * Build a byte-for-byte (gzip level 9) in-memory snapshot before listen, so
 * the measured navigation contains the app's work rather than server request
 * CPU or cold-file latency. A new build requires a new shell process.
 */
function loadStaticSnapshot(directory) {
  const assets = new Map();
  const walk = (currentDirectory) => {
    for (const entry of fs.readdirSync(currentDirectory, { withFileTypes: true })) {
      const file = path.join(currentDirectory, entry.name);
      if (entry.isDirectory()) {
        walk(file);
        continue;
      }
      if (!entry.isFile()) continue;
      const relativePath = `/${path.relative(directory, file).split(path.sep).join("/")}`;
      const identity = fs.readFileSync(file);
      assets.set(relativePath, staticAsset(file, identity));
    }
  };
  walk(directory);
  return assets;
}

async function liveHomePrerenderAsset(origin) {
  if (
    origin.protocol !== "http:" ||
    !["127.0.0.1", "localhost"].includes(origin.hostname) ||
    origin.username || origin.password
  ) {
    throw new Error("PERF_PRERENDER_ORIGIN must be an http loopback origin");
  }
  const response = await fetch(new URL("/", origin), {
    headers: { Accept: "text/html" },
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(`Live Home prerender request failed with HTTP ${response.status}`);
  }
  const identity = Buffer.from(await response.arrayBuffer());
  const document = load(identity.toString("utf8"));
  if (
    document("html").attr("data-home-ssr") !== "true" ||
    document("#root").attr("data-home-ssr") !== "true" ||
    !identity.includes("window.__HOME_SSR__=")
  ) {
    throw new Error("Live Home response is not a complete exact-SSR document");
  }
  // Keep the complete response, not only its root. The bootstrap state, HTML
  // marker, nonce-stamped inline scripts and CSP are all part of an SSR
  // navigation and cannot be reconstructed by this static adapter.
  const contentSecurityPolicy = response.headers.get("content-security-policy");
  return {
    asset: staticAsset("index.html", identity),
    bytes: identity.byteLength,
    contentSecurityPolicy,
  };
}

if (!fs.existsSync(path.join(staticDir, "index.html"))) {
  console.error(
    `No production build found at ${staticDir}. Set PERF_STATIC_DIR or run npm run build.`,
  );
  process.exit(1);
}
const staticAssets = loadStaticSnapshot(staticDir);
const indexAsset = staticAssets.get("/index.html");
if (!indexAsset) {
  console.error(`No index.html could be loaded from ${staticDir}.`);
  process.exit(1);
}
const homePrerender = prerenderOrigin
  ? await liveHomePrerenderAsset(prerenderOrigin)
  : null;

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
  // The live semantic shell is faithful only for Home. Every other route,
  // including /index.html and SPA fallbacks such as /admin, retains the
  // original empty compiled root so Home content can never appear there.
  const asset =
    request.method === "GET" && requestedPath === "/" && homePrerender
      ? homePrerender.asset
      : staticAssets.get(requestedPath) ?? indexAsset;
  const gzip = Boolean(
    asset.gzip &&
    request.headers["accept-encoding"]?.includes("gzip"),
  );
  const body = gzip ? asset.gzip : asset.identity;
  const headers = {
    "Content-Type": asset.contentType,
    "Cache-Control": "no-store",
    "Content-Length": String(body.byteLength),
  };
  if (asset === homePrerender?.asset && homePrerender.contentSecurityPolicy) {
    headers["Content-Security-Policy"] = homePrerender.contentSecurityPolicy;
  }
  if (gzip) {
    headers["Content-Encoding"] = "gzip";
    headers.Vary = "Accept-Encoding";
  }
  response.writeHead(200, headers);
  response.end(body);
});

server.listen(port, "127.0.0.1", () => {
  console.log(
    `Performance build ${staticDir} on http://127.0.0.1:${port} (API ${apiBase.origin}; ${staticAssets.size} static assets preloaded${homePrerender ? `; live Home prerender ${homePrerender.bytes} bytes` : ""})`,
  );
});

const shutdown = () => server.close(() => process.exit(0));
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);