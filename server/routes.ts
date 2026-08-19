/**
 * Express route composition root.
 *
 * Endpoint implementations live in domain registrars under server/routes/.
 * This file deliberately owns only shared repository instances, authentication
 * setup, rate-limit placement, and the explicit declaration order. Changing
 * the order below is a compatibility change: terminal 405/404 handlers must
 * remain last, notification routes remain before the API backstop limiter, and
 * crawler/OG/sitemap routes remain outside the API domain routers.
 */
import type { Express, Response } from "express";
import { createServer, type Server } from "http";
import rateLimit from "express-rate-limit";
import type { Resource } from "@shared/schema";

import {
  AdminRepository,
  AuditRepository,
  CategoryRepository,
  CollectionRepository,
  EnrichmentRepository,
  GithubSyncRepository,
  LearningJourneyRepository,
  LegacyRepository,
  ResourceRepository,
  TagRepository,
  UserFeatureRepository,
  UserRepository,
} from "./repositories";
import { requireAuth as isAuthenticated } from "./clerkAuth";
import { negotiated429Handler } from "./middleware/rateLimit";
import { PgRateLimitStore } from "./middleware/pgRateLimitStore";
import { isDatabaseUnavailableError } from "./db/errors";
import { ServiceUnavailableError } from "./middleware/errors";
import { registerNotificationRoutes } from "./api/notifications";
import { recommendationEngine } from "./ai/recommendationEngine";
import { learningPathGenerator } from "./ai/learningPathGenerator";
import { SITE_URL } from "./og-middleware";
import { stripInternalResourceFields } from "./lib/publicResource";
import { parseBoundedInt } from "./validation/inputs";
import { runHeavyWork } from "./ops/heavyWork";
import { seedDatabase } from "./seed";
import {
  installApiContractRegistration,
  observeRoutes,
  registerCoreEndpointSchemas,
} from "./contracts";

import { registerAuthUserRoutes } from "./routes/domains/auth-user";
import { registerCatalogContributionsRoutes } from "./routes/domains/catalog-contributions";
import { registerUserFeatureRoutes } from "./routes/domains/user-features";
import {
  registerJourneyRoutes,
  registerRecommendationRoutes,
} from "./routes/domains/journeys-recommendations";
import { registerAdminContentRoutes } from "./routes/domains/admin-content";
import {
  registerAwesomeListDiscoveryRoutes,
  registerExportLinkHealthRoutes,
  type ExportLinkHealthContext,
} from "./routes/domains/export-link-health";
import { registerAiJobsRoutes } from "./routes/domains/ai-jobs";
import { registerNonApiRoutes } from "./routes/non-api";
import { registerOperationsRoutes } from "./routes/domains/operations";

// One instance per repository for the full process. Domain routers receive
// these through explicit contexts; none silently creates a parallel data path.
const userRepo = new UserRepository();
const resourceRepo = new ResourceRepository();
const categoryRepo = new CategoryRepository();
const tagRepo = new TagRepository();
const learningJourneyRepo = new LearningJourneyRepository();
const userFeatureRepo = new UserFeatureRepository();
const collectionRepo = new CollectionRepository();
const auditRepo = new AuditRepository();
const githubSyncRepo = new GithubSyncRepository();
const enrichmentRepo = new EnrichmentRepository();
const adminRepo = new AdminRepository();
const legacyRepo = new LegacyRepository();

function sendOperationalFailure(
  res: Response,
  error: unknown,
  fallbackMessage: string,
) {
  if (
    error instanceof ServiceUnavailableError ||
    isDatabaseUnavailableError(error)
  ) {
    return res
      .status(503)
      .set("Retry-After", "1")
      .json({ message: "Service is temporarily unavailable" });
  }
  return res.status(500).json({ message: fallbackMessage });
}

const isAdmin = async (req: any, res: Response, next: any) => {
  try {
    // req.dbUser is resolved fresh per request by clerkUserContext, so role
    // changes apply immediately (same semantics as the old per-request fetch).
    const user = req.dbUser;
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Forbidden: Admin access required" });
    }
    next();
  } catch (error) {
    sendOperationalFailure(res, error, "Error checking admin status");
  }
};

async function getPublicCatalogResources(): Promise<Resource[]> {
  const tree = await legacyRepo.getAwesomeListFromDatabase();
  const out: Resource[] = [];
  for (const category of tree?.categories ?? []) {
    out.push(...(category.resources ?? []));
    for (const subcategory of category.subcategories ?? []) {
      out.push(...(subcategory.resources ?? []));
      for (const subSubcategory of subcategory.subSubcategories ?? []) {
        out.push(...(subSubcategory.resources ?? []));
      }
    }
  }
  return out;
}

function getCategoryTitleFromSlug(slug: string): string {
  const titles: Record<string, string> = {
    "community-events": "Community & Events",
    "encoding-codecs": "Encoding & Codecs",
    "general-tools": "General Tools",
    "infrastructure-delivery": "Infrastructure & Delivery",
    "intro-learning": "Intro & Learning",
    "media-tools": "Media Tools",
    "players-clients": "Players & Clients",
    "protocols-transport": "Protocols & Transport",
    "standards-industry": "Standards & Industry",
  };
  return titles[slug] || slug;
}

function getSubcategoryTitleFromSlug(slug: string): string {
  const titles: Record<string, string> = {
    "community-groups": "Community Groups",
    "events-conferences": "Events & Conferences",
    codecs: "Codecs",
    "encoding-tools": "Encoding Tools",
    drm: "DRM",
    "ffmpeg-tools": "FFMPEG & Tools",
    "cloud-cdn": "Cloud & CDN",
    "streaming-servers": "Streaming Servers",
    introduction: "Introduction",
    "learning-resources": "Learning Resources",
    "tutorials-case-studies": "Tutorials & Case Studies",
    "ads-qoe": "Ads & QoE",
    "audio-subtitles": "Audio & Subtitles",
    "hardware-players": "Hardware Players",
    "mobile-web-players": "Mobile & Web Players",
    "adaptive-streaming": "Adaptive Streaming",
    "transport-protocols": "Transport Protocols",
    "specs-standards": "Specs & Standards",
    "vendors-hdr": "Vendors & HDR",
  };
  return titles[slug] || slug;
}

function getSubSubcategoryTitleFromSlug(slug: string): string {
  const titles: Record<string, string> = {
    "online-forums": "Online Forums",
    "slack-meetups": "Slack & Meetups",
    conferences: "Conferences",
    "podcasts-webinars": "Podcasts & Webinars",
    av1: "AV1",
    hevc: "HEVC",
    vp9: "VP9",
    ffmpeg: "FFMPEG",
    "other-encoders": "Other Encoders",
    "cdn-integration": "CDN Integration",
    "cloud-platforms": "Cloud Platforms",
    "origin-servers": "Origin Servers",
    "storage-solutions": "Storage Solutions",
    advertising: "Advertising",
    "quality-testing": "Quality & Testing",
    audio: "Audio",
    "subtitles-captions": "Subtitles & Captions",
    chromecast: "Chromecast",
    roku: "Roku",
    "smart-tv": "Smart TVs",
    android: "Android",
    "ios-tvos": "iOS/tvOS",
    "web-players": "Web Players",
    dash: "DASH",
    hls: "HLS",
    rist: "RIST",
    rtmp: "RTMP",
    srt: "SRT",
    "mpeg-forums": "MPEG & Forums",
    "official-specs": "Official Specs",
    "hdr-guidelines": "HDR Guidelines",
    "vendor-docs": "Vendor Docs",
  };
  return titles[slug] || slug;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Patch concrete /api registrations once. Each registrar keeps its existing
  // signature while gaining one named request/response contract and validation
  // immediately before its final handler. Installing before auth setup also
  // covers the OIDC callback/probe routes that setupAuth registers.
  //
  // Register per-endpoint structural schemas BEFORE the installer so that
  // inferredResponsesFor picks up the overrides when each route is first
  // declared (task #319: catch field-level payload drift, not just broken JSON).
  registerCoreEndpointSchemas();
  installApiContractRegistration(app);

  // Authentication (Task #307): Clerk middleware + user context are mounted
  // globally in server/index.ts (clerkMiddleware + clerkUserContext). The
  // requireAuth gate imported above is passed to domain registrars below.

  // Audit cycle-01 F023: a path segment with malformed percent-encoding
  // (e.g. /api/resources/%zz) used to throw URIError inside Express's param
  // decoder on whichever unconstrained route matched first → opaque 500,
  // while sibling aliases 404ed. If the raw path can't decode, no route
  // param can either — answer the canonical API 404 before any router runs.
  // (Mirrors the malformed-encoding guard on the static-file path in
  // server/index.ts.)
  app.use('/api', (req, res, next) => {
    try {
      decodeURIComponent(req.path);
    } catch {
      return res.status(404).json({ message: 'Not found' });
    }
    return next();
  });

  // Historical compatibility: notification API routes and the two unsubscribe
  // HTML routes are mounted before the /api backstop limiter.
  registerNotificationRoutes(app, isAuthenticated, isAdmin);

  const resourceReadLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 240,
    standardHeaders: true,
    legacyHeaders: false,
    store: new PgRateLimitStore("resource-read"),
    handler: negotiated429Handler(
      "Too many requests. Please slow down and try again shortly.",
    ),
  });
  const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    store: new PgRateLimitStore("ai-generation"),
    handler: negotiated429Handler(
      "Too many AI requests. Please try again in a few minutes.",
    ),
  });
  const suggestedReadLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false,
    store: new PgRateLimitStore("suggested-read"),
    handler: negotiated429Handler(
      "Too many requests. Please slow down and try again shortly.",
    ),
  });
  const apiBackstopLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 600,
    standardHeaders: true,
    legacyHeaders: false,
    store: new PgRateLimitStore("api-backstop"),
    handler: negotiated429Handler(
      "Too many requests. Please slow down and try again shortly.",
    ),
  });
  app.use("/api", apiBackstopLimiter);

  // Domain declaration order mirrors the former monolith exactly.
  registerAuthUserRoutes(app, {
    isAuthenticated,
    userRepo,
  });
  registerCatalogContributionsRoutes(app, {
    resourceReadLimiter,
    isAuthenticated,
    isAdmin,
    userRepo,
    resourceRepo,
    categoryRepo,
    auditRepo,
  });
  registerUserFeatureRoutes(app, {
    isAuthenticated,
    userRepo,
    resourceRepo,
    categoryRepo,
    learningJourneyRepo,
    userFeatureRepo,
    collectionRepo,
    auditRepo,
    SITE_URL,
    parseBoundedInt,
  });
  registerJourneyRoutes(app, {
    isAuthenticated,
    isAdmin,
    learningJourneyRepo,
    parseBoundedInt,
  });
  registerAdminContentRoutes(app, {
    isAuthenticated,
    isAdmin,
    aiLimiter,
    userRepo,
    resourceRepo,
    categoryRepo,
    auditRepo,
    adminRepo,
    sendOperationalFailure,
  });

  const exportContext: ExportLinkHealthContext = {
    isAuthenticated,
    isAdmin,
    resourceReadLimiter,
    userRepo,
    resourceRepo,
    categoryRepo,
    tagRepo,
    learningJourneyRepo,
    auditRepo,
    githubSyncRepo,
    adminRepo,
    legacyRepo,
    sendOperationalFailure,
    getPublicCatalogResources,
    getCategoryTitleFromSlug,
    getSubcategoryTitleFromSlug,
    getSubSubcategoryTitleFromSlug,
  };
  registerExportLinkHealthRoutes(app, exportContext);
  registerAiJobsRoutes(app, {
    isAuthenticated,
    isAdmin,
    enrichmentRepo,
    categoryRepo,
    resourceRepo,
  });
  registerAwesomeListDiscoveryRoutes(app, exportContext);

  // These crawler-facing routes are deliberately not mounted under /api.
  registerNonApiRoutes(app, {
    legacyRepo,
    learningJourneyRepo,
    resourceRepo,
    categoryRepo,
  });

  registerRecommendationRoutes(app, {
    isAuthenticated,
    aiLimiter,
    suggestedReadLimiter,
    recommendationEngine,
    learningPathGenerator,
    userFeatureRepo,
    resourceRepo,
    categoryRepo,
    stripInternalResourceFields,
    parseBoundedInt,
  });

  // Must remain last: this registrar mounts method and not-found fallbacks.
  registerOperationsRoutes(app, { isAuthenticated, isAdmin, userRepo });
  observeRoutes(app);

  return createServer(app);
}

async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delayMs = 2000,
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      const retryable =
        error.message?.includes("too many clients") ||
        error.message?.includes("connection") ||
        error.message?.includes("ECONNREFUSED");
      if (attempt === maxRetries || !retryable) throw error;
      console.log(
        `⏳ Database operation failed (attempt ${attempt}/${maxRetries}), retrying in ${delayMs}ms...`,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      delayMs *= 2;
    }
  }
  throw new Error("Retry logic failed unexpectedly");
}

export async function runBackgroundInitialization(): Promise<void> {
  const isProduction = process.env.NODE_ENV === "production";
  console.log(
    `🔄 Running background initialization (${isProduction ? "production" : "development"} mode)...`,
  );
  console.log("📊 Note: /api/awesome-list now serves from PostgreSQL database");

  try {
    const { runOrphanWatchdogStartup, startOrphanWatchdogPeriodic } =
      await import("./jobs/orphanJobWatchdog");
    await runOrphanWatchdogStartup();
    startOrphanWatchdogPeriodic();
  } catch (error) {
    console.error("Failed to import/run orphan watchdog (non-fatal):", error);
  }

  try {
    console.log("Checking if database needs seeding...");
    const categories = await withRetry(() => categoryRepo.listCategories());
    const resourceCount = await withRetry(() =>
      resourceRepo.getResourceCount(),
    );
    const needsReseeding = categories.length === 0 && resourceCount === 0;
    if (needsReseeding) {
      console.log(
        `📦 Database needs seeding (categories: ${categories.length}, resources: ${resourceCount})...`,
      );
      console.log(
        `⚙️  Running database seeding in ${isProduction ? "production" : "development"} mode...`,
      );
      const result = await runHeavyWork("automatic-seed", () =>
        seedDatabase({ clearExisting: resourceCount > 0 }),
      );
      console.log("✅ Auto-seeding completed successfully:");
      console.log(`   - Categories: ${result.categoriesInserted}`);
      console.log(`   - Subcategories: ${result.subcategoriesInserted}`);
      console.log(`   - Sub-subcategories: ${result.subSubcategoriesInserted}`);
      console.log(`   - Resources: ${result.resourcesInserted}`);
      if (result.errors.length > 0) {
        console.warn(
          `⚠️  Seeding completed with ${result.errors.length} errors`,
        );
      }
    } else {
      console.log(
        `✓ Database already populated: ${categories.length} categories, ${resourceCount} resources`,
      );
    }
  } catch (error) {
    console.error("❌ Error during auto-seeding (non-fatal):", error);
    console.log(
      "Server will continue without seeding. You can manually seed via /api/admin/seed-database",
    );
  }

  learningPathGenerator.warmDefaultSuggestedPaths().catch((error) => {
    console.error(
      "Suggested-paths cache warm-up failed (non-fatal):",
      error,
    );
  });
  console.log("✅ Background initialization complete");
}