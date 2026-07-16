/**
 * ============================================================================
 * ROUTES.TS - Express API Route Definitions
 * ============================================================================
 * 
 * This is the main routing module for the Awesome Video Resource Viewer API.
 * It defines 75+ REST endpoints organized into logical sections:
 * 
 * SECTIONS:
 * - Authentication: Replit OAuth + local admin login (/api/auth/*)
 * - Resources: CRUD operations for video resources (/api/resources/*)
 * - Categories: Hierarchical category management (/api/categories/*)
 * - Admin: Dashboard, user management, auditing (/api/admin/*)
 * - GitHub Sync: Import/export with awesome lists (/api/github/*)
 * - AI Services: Claude-powered enrichment (/api/admin/enrichment/*)
 * - Learning: Personalized journeys (/api/journeys/*)
 * - SEO: Sitemap, RSS feed, schema.org (/sitemap.xml, /feed.xml)
 * 
 * AUTHENTICATION:
 * - Public routes: resource browsing, awesome-list, search
 * - Auth required: bookmarks, favorites, profile, suggestions
 * - Admin required: all /api/admin/* routes, GitHub sync, enrichment
 * 
 * KEY FUNCTIONS:
 * - registerRoutes(): Main function that sets up all Express routes
 * - runBackgroundInitialization(): Seeds database if empty on startup
 * 
 * See /docs/API.md for complete endpoint documentation.
 * ============================================================================
 */

import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import rateLimit from "express-rate-limit";
import {
  UserRepository,
  ResourceRepository,
  CategoryRepository,
  TagRepository,
  LearningJourneyRepository,
  UserFeatureRepository,
  AuditRepository,
  GithubSyncRepository,
  EnrichmentRepository,
  AdminRepository,
  LegacyRepository,
} from "./repositories";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { setupLocalAuth } from "./localAuth";
import { hashPassword, comparePassword, validateEmail, validatePassword } from "./passwordUtils";
import { checkLock, recordFailure, clearOnSuccess, allowResetRequest } from "./loginLockout";
import { sendPasswordResetEmail } from "./email";
import crypto from "crypto";
import passport from "passport";
import { fetchAwesomeList } from "./parser";
import { fetchAwesomeVideoData } from "./awesome-video-parser-clean";
import { RecommendationEngine, UserProfile } from "./recommendation-engine";
import { fetchAwesomeLists, searchAwesomeLists } from "./github-api";
import { insertResourceSchema, EDITABLE_RESOURCE_FIELDS, insertJourneyStepSchema, insertLearningJourneySchema, passwordResetTokens, type Resource } from "@shared/schema";
import { ensureSubSubcategoryExists } from "./repositories/ensureSubSubcategory";
import { z } from "zod";
import { syncService } from "./github/syncService";
import { ensureMinDescription } from "./github/importHygiene";
import { recommendationEngine, UserProfile as AIUserProfile } from "./ai/recommendationEngine";
import { buildRelatedResources } from "./services/relatedResources";
import { stripInternalResourceFields } from "./lib/publicResource";
import { registerPublicApiRoutes } from "./api/public";
import { learningPathGenerator } from "./ai/learningPathGenerator";
import { claudeService } from "./ai/claudeService";
import { AwesomeListFormatter } from "./github/formatter";
import { validateAwesomeList, formatValidationReport } from "./validation/awesomeLint";
import { checkResourceLinks, formatLinkCheckReport } from "./validation/linkChecker";
import { seedDatabase } from "./seed";
import { enrichmentService } from "./ai/enrichmentService";
import { parseAgentConfigFromRequest, stripJobAuthSecret } from "./ai/agentRuntime";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { SITE_URL } from "./og-middleware";

const AWESOME_RAW_URL = process.env.AWESOME_RAW_URL || "https://raw.githubusercontent.com/avelino/awesome-go/main/README.md";

// ============================================================================
// REPOSITORY INSTANCES - Direct Usage of Domain Repositories
// ============================================================================
// Instead of using the storage facade, we instantiate repositories directly
// for better modularity and clearer dependencies.
const userRepo = new UserRepository();
const resourceRepo = new ResourceRepository();
const categoryRepo = new CategoryRepository();
const tagRepo = new TagRepository();
const learningJourneyRepo = new LearningJourneyRepository();
const userFeatureRepo = new UserFeatureRepository();
const auditRepo = new AuditRepository();
const githubSyncRepo = new GithubSyncRepository();
const enrichmentRepo = new EnrichmentRepository();
const adminRepo = new AdminRepository();
const legacyRepo = new LegacyRepository();

// Middleware to check if user is admin
const isAdmin = async (req: any, res: Response, next: any) => {
  try {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const user = await userRepo.getUser(userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: "Forbidden: Admin access required" });
    }
    
    next();
  } catch (error) {
    res.status(500).json({ message: "Error checking admin status" });
  }
};

// SEO route handlers - now uses database-driven data
//
// Crawlability/indexation (Task #77): the sitemap enumerates EVERY public,
// indexable route — the static pages (`/`, `/about`, `/advanced`, `/journeys`,
// `/submit`), the full category taxonomy, and the long-tail detail pages
// (`/resource/:id`, `/journey/:id`). It uses SITE_URL (the same canonical base
// the metadata layer emits in og-middleware) so sitemap URLs and on-page
// canonicals never disagree. DB problems degrade gracefully: dynamic sections
// are skipped, but a valid XML document with the static routes is always
// returned (never a 404 / 500 on an empty or unavailable DB).
function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function generateSitemap(_req: any, res: any) {
  const currentDate = new Date().toISOString().split('T')[0];
  const baseUrl = SITE_URL.replace(/\/+$/, "");
  const urls: string[] = [];

  // Run3 audit R3-05: sub-subcategory slugs are shared across parents (e.g.
  // "ffmpeg" appears under several subcategories), so the tree walk below can
  // visit the same public URL many times. Every <loc> must appear exactly once.
  const seenLocs = new Set<string>();

  const addUrl = (path: string, changefreq: string, priority: string) => {
    if (seenLocs.has(path)) return;
    seenLocs.add(path);
    urls.push(`  <url>
    <loc>${xmlEscape(baseUrl + path)}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`);
  };

  // Static, always-public routes. These are emitted unconditionally so the
  // sitemap stays valid even when the database is empty or unreachable.
  addUrl('/', 'daily', '1.0');
  addUrl('/categories', 'weekly', '0.7');
  addUrl('/journeys', 'weekly', '0.7');
  addUrl('/advanced', 'weekly', '0.6');
  addUrl('/about', 'monthly', '0.5');
  addUrl('/submit', 'monthly', '0.5');

  // Category taxonomy + every approved resource detail page.
  try {
    const awesomeListData = await legacyRepo.getAwesomeListFromDatabase();

    awesomeListData?.categories?.forEach(category => {
      addUrl(`/category/${category.slug}`, 'weekly', '0.7');

      category.subcategories?.forEach(subcategory => {
        addUrl(`/subcategory/${subcategory.slug}`, 'weekly', '0.6');

        subcategory.subSubcategories?.forEach(subSubcategory => {
          addUrl(`/sub-subcategory/${subSubcategory.slug}`, 'weekly', '0.5');
        });
      });
    });

    awesomeListData?.resources?.forEach(resource => {
      addUrl(`/resource/${resource.id}`, 'monthly', '0.5');
    });
  } catch (error) {
    console.error('Error adding category/resource URLs to sitemap:', error);
  }

  // Published learning journeys.
  try {
    const journeys = await learningJourneyRepo.listLearningJourneys();
    journeys?.forEach(journey => {
      addUrl(`/journey/${journey.id}`, 'weekly', '0.6');
    });
  } catch (error) {
    console.error('Error adding journey URLs to sitemap:', error);
  }

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

  res.set('Content-Type', 'application/xml');
  res.send(sitemap);
}

// Run3 audit R3-17: the export/validation pipeline must count the exact same
// catalog the public site serves. getAllApprovedResources() returns the raw
// approved table (URL duplicates + category-orphans included), which is how
// admin validation drifted to "2052 resources, 10 categories" while the public
// tree showed 1951/9. Flattening the hierarchical tree yields the deduped,
// orphan-excluded set — parity with /api/categories by construction.
async function getPublicCatalogResources(): Promise<Resource[]> {
  const tree = await legacyRepo.getAwesomeListFromDatabase();
  const out: Resource[] = [];
  for (const cat of tree?.categories ?? []) {
    out.push(...(cat.resources ?? []));
    for (const sub of cat.subcategories ?? []) {
      out.push(...(sub.resources ?? []));
      for (const ss of sub.subSubcategories ?? []) {
        out.push(...(ss.resources ?? []));
      }
    }
  }
  return out;
}

/**
 * Builds an Editorial + Crimson design-system aligned Open Graph image (1200×630).
 *
 * DS tokens mirrored from client/src/styles/design-system.css (Editorial skin):
 *   --bg            #000000            (pure black)
 *   --surface       #0e0d0c            (warm near-black for the inset card)
 *   --line          rgba(244,243,238,.12)   (hairline borders)
 *   --text          #f4f3ee            (warm off-white body)
 *   --muted         #a8a4a0            (muted body text)
 *   --accent        #ff3d52            (crimson primary)
 *   --accent-2      #ffb4be            (crimson tint)
 *   font-display    'Fraunces' italic  (eyebrows + accents)
 *   font-sans       'Inter' bold       (titles + body)
 *
 * The atmosphere is a soft radial crimson glow in the upper-left, a thin
 * crimson divider under the eyebrow, and the slug typeset bold Inter with a
 * Fraunces italic accent on the secondary line — same vocabulary as the
 * Home/About/Login hero rebuild.
 */
function buildOgSvg(pageTitle: string, category: string | undefined, count: string): string {
  const truncate = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
  const xmlEscape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const title = xmlEscape(truncate(pageTitle, 38));
  const subtitle = xmlEscape(category ? truncate(category, 44) : 'Curated video development resources');
  const eyebrow = category ? 'Category · Awesome Video' : 'Index · Awesome Video';
  const stat = xmlEscape(`${count} resources`);

  return `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="glow" cx="18%" cy="22%" r="62%">
      <stop offset="0%"   stop-color="#ff3d52" stop-opacity="0.28" />
      <stop offset="55%"  stop-color="#ff3d52" stop-opacity="0.06" />
      <stop offset="100%" stop-color="#ff3d52" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="surface" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#0e0d0c" stop-opacity="0.82" />
      <stop offset="100%" stop-color="#0e0d0c" stop-opacity="0.55" />
    </linearGradient>
  </defs>

  <!-- Editorial atmosphere: pure black + warm crimson radial glow -->
  <rect width="1200" height="630" fill="#000000" />
  <rect width="1200" height="630" fill="url(#glow)" />

  <!-- Inset surface card with hairline border (matches DS .card surface) -->
  <rect x="56" y="56" width="1088" height="518" rx="14"
        fill="url(#surface)" stroke="rgba(244,243,238,0.12)" stroke-width="1" />

  <!-- Eyebrow: Fraunces italic uppercase tracking-wide, crimson tinted -->
  <text x="104" y="158" font-family="'Fraunces','Times New Roman',serif"
        font-size="20" font-style="italic" font-weight="500"
        fill="#ffb4be" letter-spacing="3" opacity="0.92">${xmlEscape(eyebrow.toUpperCase())}</text>

  <!-- Crimson hairline divider under eyebrow -->
  <rect x="104" y="178" width="64" height="2" fill="#ff3d52" />

  <!-- Primary title: Inter bold, warm off-white -->
  <text x="104" y="266" font-family="'Inter','Helvetica Neue',sans-serif"
        font-size="78" font-weight="800" fill="#f4f3ee"
        letter-spacing="-2">${title}</text>

  <!-- Secondary line: Fraunces italic accent (matches About/Home hero) -->
  <text x="104" y="332" font-family="'Fraunces','Times New Roman',serif"
        font-size="36" font-style="italic" font-weight="500"
        fill="#a8a4a0">${subtitle}</text>

  <!-- Footer row: brand mark + resource count chip -->
  <g transform="translate(104, 478)">
    <!-- AV monogram tile -->
    <rect x="0" y="0" width="56" height="56" rx="10" fill="#ff3d52" />
    <text x="28" y="38" font-family="'Inter','Helvetica Neue',sans-serif"
          font-size="26" font-weight="800" fill="#000000"
          text-anchor="middle">AV</text>

    <!-- Brand wordmark: bold Inter + Fraunces italic ".video" accent -->
    <text x="76" y="26" font-family="'Inter','Helvetica Neue',sans-serif"
          font-size="22" font-weight="700" fill="#f4f3ee" letter-spacing="-0.5">awesome</text>
    <text x="180" y="26" font-family="'Fraunces','Times New Roman',serif"
          font-size="22" font-style="italic" font-weight="600" fill="#ff3d52">.video</text>
    <text x="76" y="50" font-family="'Inter','Helvetica Neue',sans-serif"
          font-size="14" font-weight="500" fill="#a8a4a0"
          letter-spacing="1">awesome.video</text>
  </g>

  <!-- Resource count chip on the right (matches DS .chip surface) -->
  <g transform="translate(936, 478)">
    <rect x="0" y="0" width="160" height="56" rx="10"
          fill="rgba(255,61,82,0.08)" stroke="#ff3d52" stroke-width="1" />
    <text x="80" y="35" font-family="'Inter','Helvetica Neue',sans-serif"
          font-size="18" font-weight="700" fill="#ff3d52"
          text-anchor="middle" letter-spacing="0.5">${stat}</text>
  </g>
</svg>`;
}

async function resolveOgParams(req: any) {
  const { title, category, resourceCount } = req.query as Record<string, string | undefined>;
  let pageTitle = title;
  let count = resourceCount;
  if (!pageTitle || !count) {
    try {
      const data = await legacyRepo.getAwesomeListFromDatabase();
      if (!pageTitle) pageTitle = 'Awesome Video';
      if (!count) count = `${data?.resources?.length ?? 2000}+`;
    } catch {
      pageTitle = pageTitle || 'Awesome Video';
      count = count || '2000+';
    }
  }
  return { pageTitle: pageTitle!, category, count: count! };
}

async function generateOpenGraphImage(req: any, res: any) {
  try {
    const { pageTitle, category, count } = await resolveOgParams(req);
    const svg = buildOgSvg(pageTitle, category, count);
    res.set('Content-Type', 'image/svg+xml');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(svg);
  } catch (error) {
    console.error('Error generating OG image (SVG):', error);
    res.status(500).send('Error generating image');
  }
}

/**
 * PNG variant of the OG image — rasterized from the same Editorial+Crimson SVG
 * using sharp. Most social crawlers (Facebook, iMessage, LinkedIn, WhatsApp)
 * require a raster image for og:image; Twitter, Slack, and Discord accept SVG
 * but render PNG more reliably.
 */
async function generateOpenGraphImagePng(req: any, res: any) {
  try {
    const { pageTitle, category, count } = await resolveOgParams(req);
    const svg = buildOgSvg(pageTitle, category, count);
    const sharp = (await import('sharp')).default;
    const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(png);
  } catch (error) {
    console.error('Error generating OG image (PNG):', error);
    res.status(500).send('Error generating image');
  }
}

// Helper functions to convert slugs back to original titles
function getCategoryTitleFromSlug(slug: string): string {
  const categoryMap: { [key: string]: string } = {
    'community-events': 'Community & Events',
    'encoding-codecs': 'Encoding & Codecs',
    'general-tools': 'General Tools',
    'infrastructure-delivery': 'Infrastructure & Delivery',
    'intro-learning': 'Introduction & Learning',
    'media-tools': 'Media Tools',
    'players-clients': 'Players & Clients',
    'protocols-transport': 'Protocols & Transport',
    'standards-industry': 'Standards & Industry'
  };
  return categoryMap[slug] || slug;
}

function getSubcategoryTitleFromSlug(slug: string): string {
  const subcategoryMap: { [key: string]: string } = {
    'community-groups': 'Community Groups',
    'events-conferences': 'Events & Conferences',
    'codecs': 'Codecs',
    'encoding-tools': 'Encoding Tools',
    'drm': 'DRM',
    'ffmpeg-tools': 'FFMPEG & Tools',
    'cloud-cdn': 'Cloud & CDN',
    'streaming-servers': 'Streaming Servers',
    'introduction': 'Introduction',
    'learning-resources': 'Learning Resources',
    'tutorials-case-studies': 'Tutorials & Case Studies',
    'ads-qoe': 'Ads & QoE',
    'audio-subtitles': 'Audio & Subtitles',
    'hardware-players': 'Hardware Players',
    'mobile-web-players': 'Mobile & Web Players',
    'adaptive-streaming': 'Adaptive Streaming',
    'transport-protocols': 'Transport Protocols',
    'specs-standards': 'Specs & Standards',
    'vendors-hdr': 'Vendors & HDR'
  };
  return subcategoryMap[slug] || slug;
}

function getSubSubcategoryTitleFromSlug(slug: string): string {
  const subSubcategoryMap: { [key: string]: string } = {
    'online-forums': 'Online Forums',
    'slack-meetups': 'Slack & Meetups',
    'conferences': 'Conferences',
    'podcasts-webinars': 'Podcasts & Webinars',
    'av1': 'AV1',
    'hevc': 'HEVC',
    'vp9': 'VP9',
    'ffmpeg': 'FFMPEG',
    'other-encoders': 'Other Encoders',
    'cdn-integration': 'CDN Integration',
    'cloud-platforms': 'Cloud Platforms',
    'origin-servers': 'Origin Servers',
    'storage-solutions': 'Storage Solutions',
    'advertising': 'Advertising',
    'quality-testing': 'Quality & Testing',
    'audio': 'Audio',
    'subtitles-captions': 'Subtitles & Captions',
    'chromecast': 'Chromecast',
    'roku': 'Roku',
    'smart-tv': 'Smart TVs',
    'android': 'Android',
    'ios-tvos': 'iOS/tvOS',
    'web-players': 'Web Players',
    'dash': 'DASH',
    'hls': 'HLS',
    'rist': 'RIST',
    'rtmp': 'RTMP',
    'srt': 'SRT',
    'mpeg-forums': 'MPEG & Forums',
    'official-specs': 'Official Specs',
    'hdr-guidelines': 'HDR Guidelines',
    'vendor-docs': 'Vendor Docs'
  };
  return subSubcategoryMap[slug] || slug;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication (OAuth and local)
  // Only setup Replit OAuth if REPL_ID is available (running on Replit)
  if (process.env.REPL_ID) {
    await setupAuth(app);
  } else {
    // For local development, just setup session without Replit OAuth
    const { getSession } = await import("./replitAuth");
    app.set("trust proxy", 1);
    app.use(getSession());
    app.use(passport.initialize());
    app.use(passport.session());

    // Configure passport serialization for local auth
    passport.serializeUser((user: any, done) => {
      done(null, user);
    });

    passport.deserializeUser((user: any, done) => {
      done(null, user);
    });

    console.log("Running in local mode - Replit OAuth disabled, use local auth at /api/auth/local/login");
  }
  setupLocalAuth();

  // BUG-008 (run10): IP-based rate limiting across the auth cluster.
  // Complements the existing per-account cooldown (checkLock) which only
  // throttles a single email — this caps anonymous credential-stuffing and
  // register/forgot-password abuse per client IP.
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many attempts. Please try again later." },
  });

  // Local authentication routes
  app.post("/api/auth/local/login", authLimiter, (req, res, next) => {
    const loginEmail = typeof req.body?.email === "string" ? req.body.email : "";

    // Brute-force guard: short-circuit while the account is in a cooldown window.
    const lock = checkLock(loginEmail);
    if (lock.locked) {
      res.setHeader("Retry-After", String(lock.retryAfterSec));
      return res.status(423).json({
        message: "Account temporarily locked due to repeated failed login attempts. Try again later.",
        retryAfter: lock.retryAfterSec,
      });
    }

    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {
        console.log('[local/login] Authentication error:', err);
        return res.status(500).json({ message: "Internal server error" });
      }

      if (!user) {
        // Count this failure toward the lockout threshold (generic message — no enumeration).
        recordFailure(loginEmail);
        console.log('[local/login] Authentication failed:', info?.message);
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      
      console.log('[local/login] User authenticated, establishing session for:', user.claims?.sub);
      
      req.logIn(user, async (err) => {
        if (err) {
          console.log('[local/login] Login failed:', err);
          return res.status(500).json({ message: "Login failed" });
        }
        
        console.log('[local/login] Session established, saving to store...');
        
        // Explicitly save the session to ensure it's persisted before sending response
        req.session.save(async (saveErr) => {
          if (saveErr) {
            console.log('[local/login] Session save failed:', saveErr);
            return res.status(500).json({ message: "Failed to save session" });
          }
          
          console.log('[local/login] Session saved successfully, session ID:', req.sessionID);

          // Successful login clears any accumulated failure/lock state for this email.
          clearOnSuccess(loginEmail);

          // Fetch user from database to get the role
          const dbUser = await userRepo.getUser(user.claims.sub);
          
          console.log('[local/login] Returning user response with role:', dbUser?.role);
          
          return res.json({
            user: {
              id: user.claims.sub,
              email: user.claims.email,
              firstName: user.claims.first_name,
              lastName: user.claims.last_name,
              profileImageUrl: user.claims.profile_image_url,
              role: dbUser?.role || 'user',
            }
          });
        });
      });
    })(req, res, next);
  });

  // Self-service account registration for local auth. Additive to the login cluster:
  // creates a role=user account, never touches the existing login/session handlers.
  // Email delivery (verification) is out of scope until an email transport is configured.
  app.post("/api/auth/register", authLimiter, async (req, res) => {
    try {
      const { email, password } = req.body ?? {};

      if (typeof email !== "string" || typeof password !== "string") {
        return res.status(400).json({ message: "Email and password are required" });
      }
      if (!validateEmail(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }
      const pwCheck = validatePassword(password);
      if (!pwCheck.valid) {
        return res.status(400).json({ message: pwCheck.error || "Invalid password" });
      }

      const existing = await userRepo.getUserByEmail(email);
      if (existing) {
        return res.status(409).json({ message: "An account with this email already exists" });
      }

      const hashed = await hashPassword(password);
      const created = await userRepo.upsertUser({ email, password: hashed, role: "user" });

      // Never return the password hash.
      return res.status(201).json({
        id: created.id,
        email: created.email,
        role: created.role,
      });
    } catch (error) {
      console.error("[/api/auth/register] Error:", error);
      return res.status(500).json({ message: "Failed to create account" });
    }
  });

  // Self-service password reset — request stage. ALWAYS responds with the same
  // generic 200 (no account enumeration) and does the token/email work
  // fire-and-forget so response timing doesn't leak whether the account exists.
  // OAuth-only accounts (no local password) are silently skipped. Throttled per
  // email AND per IP before any lookup.
  app.post("/api/auth/forgot-password", authLimiter, async (req, res) => {
    const GENERIC = { message: "If an account with that email exists, we've sent a password reset link." };
    try {
      const email = typeof req.body?.email === "string" ? req.body.email.trim() : "";
      if (!email || !validateEmail(email)) {
        return res.status(400).json({ message: "A valid email address is required" });
      }

      const ip =
        req.headers["x-forwarded-for"]?.toString().split(",")[0].trim() ||
        req.ip ||
        "unknown";
      if (!allowResetRequest(email, ip)) {
        res.setHeader("Retry-After", "900");
        return res.status(429).json({ message: "Too many reset requests. Please try again in a little while." });
      }

      // Respond immediately with the generic message; do the real work after.
      res.status(200).json(GENERIC);

      // Fire-and-forget so DB/email latency can't be used to enumerate accounts.
      void (async () => {
        try {
          const user = await userRepo.getUserByEmail(email);
          if (!user || !user.password || !user.email) return; // no account, or OAuth-only

          const rawToken = crypto.randomBytes(32).toString("hex");
          const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
          const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

          await db.insert(passwordResetTokens).values({ userId: user.id, tokenHash, expiresAt });

          // In production always use the server-authoritative SITE_URL — never
          // the client-controlled Host header (password-reset poisoning vector).
          // The Host fallback is dev-only so the localhost console link works.
          const base = (
            process.env.NODE_ENV === "production"
              ? SITE_URL
              : process.env.SITE_URL || `${req.protocol}://${req.get("host")}`
          ).replace(/\/+$/, "");
          const resetUrl = `${base}/reset-password?token=${rawToken}`;
          await sendPasswordResetEmail(user.email, resetUrl);
        } catch (e) {
          console.error("[/api/auth/forgot-password] async work error:", e);
        }
      })();
    } catch (error) {
      console.error("[/api/auth/forgot-password] Error:", error);
      if (!res.headersSent) return res.status(200).json(GENERIC);
    }
  });

  // Self-service password reset — redemption stage. Validates the new password
  // FIRST (so a weak password never burns a valid token), then atomically claims
  // the token in a single UPDATE ... RETURNING (closes the double-use race). On
  // success it rotates the password, kills ALL of the user's sessions (the person
  // resetting is not signed in), voids their other outstanding tokens, and clears
  // any login lockout.
  app.post("/api/auth/reset-password", authLimiter, async (req, res) => {
    try {
      const { token, newPassword } = req.body ?? {};
      if (typeof token !== "string" || !token || typeof newPassword !== "string") {
        return res.status(400).json({ message: "Token and new password are required" });
      }

      const pwCheck = validatePassword(newPassword);
      if (!pwCheck.valid) {
        return res.status(400).json({ message: pwCheck.error || "Invalid password" });
      }

      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

      // Atomic single-use claim: only succeeds if unused AND unexpired.
      const claim = await db.execute(sql`
        UPDATE password_reset_tokens
        SET used_at = now()
        WHERE token_hash = ${tokenHash} AND used_at IS NULL AND expires_at > now()
        RETURNING user_id
      `);
      const claimedRows = (claim as any).rows ?? [];
      if (claimedRows.length === 0) {
        return res.status(400).json({ message: "This reset link is invalid or has expired. Please request a new one." });
      }
      const userId = claimedRows[0].user_id as string;

      const user = await userRepo.getUser(userId);
      if (!user) {
        return res.status(400).json({ message: "This reset link is invalid or has expired. Please request a new one." });
      }

      const hashed = await hashPassword(newPassword);
      await userRepo.upsertUser({ id: user.id, email: user.email, password: hashed, role: user.role });

      // Kill EVERY session for this user (no current-session exclusion — the
      // resetter is not authenticated) and void their other pending tokens.
      await db.execute(sql`
        DELETE FROM sessions
        WHERE sess->'passport'->'user'->'claims'->>'sub' = ${userId}
      `);
      await db.execute(sql`
        DELETE FROM password_reset_tokens
        WHERE user_id = ${userId} AND used_at IS NULL
      `);

      // Let them sign in immediately even if the account was in a lockout window.
      if (user.email) clearOnSuccess(user.email);

      return res.status(200).json({ message: "Your password has been reset. You can now sign in." });
    } catch (error) {
      console.error("[/api/auth/reset-password] Error:", error);
      return res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Note: Database seeding and data initialization moved to runBackgroundInitialization()
  // This ensures the server starts quickly for production deployments

  // ============= Auth Routes (from Replit Auth blueprint) =============
  
  // GET /api/auth/user - Get current user (public endpoint)
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      console.log('[/api/auth/user] Request received');
      console.log('[/api/auth/user] isAuthenticated:', req.isAuthenticated?.());
      console.log('[/api/auth/user] req.user?.dbUser:', req.user?.dbUser
        ? { id: req.user.dbUser.id, email: req.user.dbUser.email, role: req.user.dbUser.role }
        : undefined);
      console.log('[/api/auth/user] req.user?.claims?.sub:', req.user?.claims?.sub);
      
      // Check if user is authenticated
      if (!req.isAuthenticated() || !req.user?.claims?.sub) {
        console.log('[/api/auth/user] User not authenticated, returning null');
        return res.json({ user: null, isAuthenticated: false });
      }

      // Use DB user from session (populated by deserializeUser) or fetch if not available
      let dbUser = req.user.dbUser;
      if (!dbUser) {
        const userId = req.user.claims.sub;
        console.log('[/api/auth/user] dbUser not in session, fetching from DB, userId:', userId);
        dbUser = await userRepo.getUser(userId);
      }
      
      if (!dbUser) {
        console.log('[/api/auth/user] User not found in DB');
        return res.json({ user: null, isAuthenticated: false });
      }

      console.log('[/api/auth/user] DB user found:', {
        id: dbUser.id,
        email: dbUser.email,
        role: dbUser.role
      });

      // Map database fields to frontend-expected format
      const user = {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.firstName && dbUser.lastName 
          ? `${dbUser.firstName} ${dbUser.lastName}` 
          : dbUser.firstName || dbUser.email?.split('@')[0] || 'User',
        avatar: dbUser.profileImageUrl,
        role: dbUser.role,
        createdAt: dbUser.createdAt,
      };

      console.log('[/api/auth/user] Returning user:', user);
      res.json({ user, isAuthenticated: true });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // GET /api/auth/me - Authenticated-user alias (NEW-017). Unlike /api/auth/user
  // (which always 200s with { user: null } so the SPA can boot anonymously),
  // /me follows REST convention: 401 when unauthenticated, else the mapped user.
  app.get('/api/auth/me', async (req: any, res) => {
    try {
      if (!req.isAuthenticated?.() || !req.user?.claims?.sub) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      let dbUser = req.user.dbUser;
      if (!dbUser) {
        dbUser = await userRepo.getUser(req.user.claims.sub);
      }
      if (!dbUser) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      res.json({
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.firstName && dbUser.lastName
          ? `${dbUser.firstName} ${dbUser.lastName}`
          : dbUser.firstName || dbUser.email?.split('@')[0] || 'User',
        avatar: dbUser.profileImageUrl,
        role: dbUser.role,
        createdAt: dbUser.createdAt,
      });
    } catch (error) {
      console.error('Error fetching user (me):', error);
      res.status(500).json({ message: 'Failed to fetch user' });
    }
  });

  // POST /api/auth/logout - Logout user
  app.post('/api/auth/logout', async (req: any, res) => {
    try {
      // BUG-092/094: req.logout() alone only clears passport's req.user — it does
      // NOT destroy the session record or clear the connect.sid cookie. Because the
      // server-side route guard (server/index.ts) gates protected pages on cookie
      // PRESENCE, a lingering connect.sid let deep-links to /admin, /profile etc.
      // stay reachable after logout. Destroy the session and clear the cookie so
      // logout actually invalidates the session end-to-end.
      req.logout((logoutErr: any) => {
        if (logoutErr) {
          console.error("Error during req.logout:", logoutErr);
          return res.status(500).json({ message: "Failed to logout" });
        }
        req.session?.destroy((destroyErr: any) => {
          if (destroyErr) {
            console.error("Error destroying session:", destroyErr);
            return res.status(500).json({ message: "Failed to logout" });
          }
          res.clearCookie("connect.sid", { path: "/" });
          res.json({ success: true });
        });
      });
    } catch (error) {
      console.error("Error logging out:", error);
      res.status(500).json({ message: "Failed to logout" });
    }
  });
  
  // Run3 audit R3-10: browser-facing GET /logout. Mirrors POST /api/auth/logout
  // (destroy session + clear cookie) then redirects home, so pasting /logout in
  // the address bar works instead of 404ing. GET is technically CSRF-able, but
  // "log the user out" is a nuisance-level primitive and the convenience wins.
  app.get('/logout', (req: any, res) => {
    const finish = () => {
      res.clearCookie("connect.sid", { path: "/" });
      res.redirect(302, "/");
    };
    try {
      req.logout(() => {
        if (req.session) {
          req.session.destroy(() => finish());
        } else {
          finish();
        }
      });
    } catch {
      finish();
    }
  });

  // Run3 audit R3-10: consistent /api/auth/* surface.
  // GET /api/auth/status — lightweight session probe (no user payload).
  app.get('/api/auth/status', (req: any, res) => {
    res.json({ authenticated: Boolean(req.isAuthenticated?.() && req.user) });
  });
  // /api/auth/login was probed by auditors and 404'd; answer with a 405 that
  // documents the real login endpoints instead.
  app.all('/api/auth/login', (_req, res) => {
    res.status(405).set('Allow', 'POST').json({
      message:
        'Use POST /api/auth/local/login (email/password) or GET /api/login (Replit OAuth).',
    });
  });

  // Note: /api/login, /api/callback are set up in setupAuth()

  // ============= Resource Routes =============

  // NEW-019: public resource serializer. Removes the internal `searchTsv`
  // full-text vector (an index implementation detail no client consumes) from
  // any resource returned on a public endpoint. Other columns (status,
  // submittedBy, githubSynced, …) are intentionally retained: authenticated
  // surfaces — the community-metrics panel, profile "my submissions", and the
  // admin console — read them, and none carry PII beyond opaque user ids.
  const toPublicResource = <T extends Record<string, any>>(r: T) =>
    stripInternalResourceFields(r);

  // GET /api/resources - List approved resources (public)
  app.get('/api/resources', async (req, res) => {
    try {
      // Support explicit offset/limit for pagination (BUG-003). When offset is
      // provided, it overrides `page`. Clamp to safe integers; reject non-numeric
      // values with 400. Run3 audit R3-06: the cap is 1000 (was 200, which
      // silently truncated limit=2000 requests) and the response now carries
      // `limit` / `offset` / `nextOffset` so callers can page the full catalog:
      // repeat with offset=nextOffset until nextOffset is null.
      // BUG-039: `cursor` is accepted as an alias for `offset` (and the
      // response carries a matching `nextCursor`), since API consumers
      // reasonably probe for cursor-style paging. offset wins if both given.
      const rawCursor = req.query.cursor as string | undefined;
      const rawOffset = (req.query.offset as string | undefined) ?? rawCursor;
      const rawLimit = req.query.limit as string | undefined;
      const rawPage = req.query.page as string | undefined;
      if (rawOffset !== undefined && isNaN(Number(rawOffset))) {
        return res.status(400).json({ error: 'invalid_offset' });
      }
      if (rawLimit !== undefined && isNaN(Number(rawLimit))) {
        return res.status(400).json({ error: 'invalid_limit' });
      }
      // NEW-009 / NEW-034: `page` must be a positive integer. Previously a
      // negative page produced a negative SQL offset → 500, and non-numeric
      // values were silently normalized to 1 (masking client bugs). Both now
      // return 400, matching the invalid_offset / invalid_limit contract.
      if (rawPage !== undefined && !/^\d+$/.test(rawPage.trim())) {
        return res.status(400).json({ error: 'invalid_page' });
      }
      const limit = Math.min(Math.max(parseInt(rawLimit as string) || 20, 1), 1000);
      const offset = rawOffset !== undefined
        ? Math.max(parseInt(rawOffset as string), 0)
        : Math.max((parseInt(rawPage as string) || 1) - 1, 0) * limit;
      let category = req.query.category as string;
      let subcategory = req.query.subcategory as string;
      // BUG-015: accept `q` as an alias for `search` so /api/resources?q=… reaches
      // the real filter layer. `search` wins if both are present (explicit param).
      // NEW-012: strip NUL + control chars — Postgres rejects NUL bytes in text
      // params and the raw driver error surfaced as a 500.
      const rawSearch = (req.query.search as string) ?? (req.query.q as string);
      const search = typeof rawSearch === 'string'
        ? rawSearch.replace(/[\x00-\x1f\x7f]/g, '')
        : rawSearch;

      // Accept category/subcategory as either the display NAME (what the client
      // sends) or a URL slug (e.g. ?category=encoding-codecs — BUG-022). Real
      // names contain spaces/capitals/'&', so a value matching the slug shape is
      // resolved to its canonical name; anything else passes through unchanged
      // (no wasted query for the common name-based calls). Subcategory slugs are
      // unique only per category, so they resolve only once the category does.
      const SLUG_SHAPE = /^[a-z0-9-]+$/;
      let resolvedCategory: { id: number; name: string } | undefined;
      if (category && SLUG_SHAPE.test(category)) {
        const cat = await categoryRepo.getCategoryBySlug(category);
        if (cat) {
          resolvedCategory = cat;
          category = cat.name;
        }
      }
      if (subcategory && SLUG_SHAPE.test(subcategory)) {
        // Prefer the category-scoped lookup when the category is known;
        // otherwise (NEW-008) resolve the slug globally so
        // `?subcategory=<slug>` filters even without a category param.
        const sub = resolvedCategory
          ? await categoryRepo.getSubcategoryBySlug(subcategory, resolvedCategory.id)
          : await categoryRepo.getSubcategoryBySlugGlobal(subcategory);
        if (sub) subcategory = sub.name;
      }

      // BUG-002: sub-subcategory filter. The audit's reproduction passes the
      // display NAME (e.g. subSubcategory=AV1), matching the existing
      // subcategory behaviour, so pass it straight through to listResources.
      const subSubcategory = req.query.subSubcategory as string | undefined;

      // R3-H08: server-side sort with allow-list; unknown values 400 (mirrors
      // the invalid_status pattern) so callers learn the valid options.
      const ALLOWED_SORTS = ['name-asc', 'name-desc', 'newest', 'oldest'] as const;
      const requestedSort = req.query.sort as string | undefined;
      if (requestedSort !== undefined && !ALLOWED_SORTS.includes(requestedSort as any)) {
        return res.status(400).json({ error: 'invalid_sort', allowed: ALLOWED_SORTS });
      }
      const sort = requestedSort as (typeof ALLOWED_SORTS)[number] | undefined;

      // BUG-004: respect ?status= with allow-list; default 'approved' for public.
      const ALLOWED_STATUSES = new Set(['approved', 'pending', 'rejected']);
      const requestedStatus = req.query.status as string | undefined;
      let statusFilter: string | undefined = 'approved';
      if (requestedStatus !== undefined) {
        if (!ALLOWED_STATUSES.has(requestedStatus)) {
          return res.status(400).json({ error: 'invalid_status', allowed: Array.from(ALLOWED_STATUSES) });
        }
        // NEW-006 companion: non-approved listings are admin-only, otherwise
        // the detail endpoint's status gate is bypassable via bulk listing.
        // (The admin UI uses /api/resources/pending, which already requires
        // admin; this path only ever served anonymous probes.)
        if (requestedStatus !== 'approved') {
          const requesterId = (req as any).user?.claims?.sub;
          const requester = requesterId ? await userRepo.getUser(requesterId) : undefined;
          if (!requester || requester.role !== 'admin') {
            return res.status(403).json({ error: 'forbidden', message: 'Non-approved listings require admin access' });
          }
        }
        statusFilter = requestedStatus;
      }

      const result = await resourceRepo.listResources({
        offset,
        limit,
        status: statusFilter,
        category,
        subcategory,
        subSubcategory,
        search,
        sort
      });

      // R3-06: explicit paging metadata. nextOffset is null on the last page.
      const nextOffset = offset + result.resources.length < result.total
        ? offset + result.resources.length
        : null;
      // NEW-019: strip the internal `searchTsv` full-text vector from public
      // responses (never consumed by any client; it is an implementation
      // detail of the search index).
      const publicResources = result.resources.map(toPublicResource);
      // NEW-033: structured pagination metadata alongside the legacy
      // offset/nextOffset fields, so API consumers get page/totalPages/hasMore.
      const currentPage = Math.floor(offset / limit) + 1;
      const totalPages = Math.max(Math.ceil(result.total / limit), 1);
      res.json({
        ...result,
        resources: publicResources,
        limit,
        offset,
        nextOffset,
        nextCursor: nextOffset,
        pagination: {
          page: currentPage,
          limit,
          total: result.total,
          totalPages,
          hasMore: nextOffset !== null,
        },
      });
    } catch (error) {
      console.error('Error fetching resources:', error);
      res.status(500).json({ message: 'Failed to fetch resources' });
    }
  });

  // GET /api/search?q= - Public JSON search across approved resources. A thin
  // alias over listResources so the /search UI page and external/API callers
  // share one search path (and /api/search no longer 404s). Results are deduped
  // by normalized URL so near-duplicate rows never surface twice. Shape:
  // { query, total, results }.
  app.get('/api/search', async (req, res) => {
    try {
      // NEW-012: strip NUL + control chars before trimming — Postgres rejects
      // NUL bytes in text params, which previously surfaced as a 500.
      const q = (((req.query.q as string) || (req.query.search as string)) || '')
        .replace(/[\x00-\x1f\x7f]/g, '')
        .trim();
      if (q.length < 2) {
        return res.json({ query: q, total: 0, results: [] });
      }
      const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 100, 1), 200);
      const { resources, total } = await resourceRepo.listResources({
        page: 1,
        limit,
        status: 'approved',
        search: q,
      });
      const seen = new Set<string>();
      const results = [] as typeof resources;
      for (const r of resources) {
        const key = (r.url || '').trim().toLowerCase().replace(/\/+$/, '') || `id:${r.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        results.push(r);
      }
      // `total` is the true match count from the repo (post-cleanup there are no
      // URL-duplicate rows, so it equals the deduped count); `results` is this page.
      // NEW-019: strip internal `searchTsv` from each public result.
      res.json({ query: q, total, results: results.map(toPublicResource) });
    } catch (error) {
      console.error('Error searching resources:', error);
      res.status(500).json({ message: 'Failed to search resources' });
    }
  });

  // POST /api/telemetry/dead-link - Client-side 404 telemetry (public, fire-and-forget)
  app.post('/api/telemetry/dead-link', (req, res) => {
    const deadLinkSchema = z.object({
      path: z.string().min(1).max(2000),
      referrer: z.string().max(2000).nullable().optional(),
      ts: z.string().max(64).optional(),
    });
    const parsed = deadLinkSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid payload' });
    }
    const { path, referrer, ts } = parsed.data;
    console.warn(
      `[dead-link] path=${JSON.stringify(path)} referrer=${JSON.stringify(referrer ?? '')} ts=${ts ?? new Date().toISOString()}`
    );
    res.status(204).end();
  });

  // GET /api/resources/check-url - Check if URL already exists (public)
  app.get('/api/resources/check-url', async (req, res) => {
    try {
      const url = req.query.url as string;

      if (!url) {
        return res.status(400).json({ message: 'URL parameter is required' });
      }

      const existingResource = await resourceRepo.getResourceByUrl(url);

      if (existingResource) {
        // BUG-025 (run10): internal moderation status is NOT included — this is
        // a public endpoint and pending/rejected state is admin-only detail.
        return res.json({
          exists: true,
          resource: {
            id: existingResource.id,
            title: existingResource.title,
            category: existingResource.category,
            subcategory: existingResource.subcategory
          }
        });
      }

      res.json({ exists: false });
    } catch (error) {
      console.error('Error checking URL:', error);
      res.status(500).json({ message: 'Failed to check URL' });
    }
  });

  // GET /api/resources/:id - Get single resource
  // :id constrained to digits so literal sub-routes like /api/resources/pending and
  // /api/resources/check-url are not shadowed by this dynamic param route.
  // Mounted on both the canonical plural path and the singular alias
  // /api/resource/:id (BUG-014) via a shared handler.
  const getResourceByIdHandler = async (req: any, res: any) => {
    try {
      const id = parseInt(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(404).json({ message: 'Resource not found' });
      }
      const resource = await resourceRepo.getResource(id);

      if (!resource) {
        return res.status(404).json({ message: 'Resource not found' });
      }

      // NEW-006: non-approved (pending/rejected) resources are not public.
      // Serve them only to admins (the admin UI deep-links into detail pages);
      // everyone else gets the same 404 as a missing id so status is not
      // leaked. This mirrors og-middleware, which already soft-404s
      // non-approved /resource/:id routes for crawlers.
      if (resource.status !== 'approved') {
        const userId = req.user?.claims?.sub;
        const user = userId ? await userRepo.getUser(userId) : undefined;
        if (!user || user.role !== 'admin') {
          return res.status(404).json({ message: 'Resource not found' });
        }
      }

      // NEW-019: strip internal `searchTsv` from the public detail response.
      res.json(toPublicResource(resource));
    } catch (error) {
      console.error('Error fetching resource:', error);
      res.status(500).json({ message: 'Failed to fetch resource' });
    }
  };
  app.get('/api/resources/:id(\\d+)', getResourceByIdHandler);
  app.get('/api/resource/:id(\\d+)', getResourceByIdHandler);

  app.get('/api/resources/:id/related', async (req, res) => {
    const empty = { similar: [], prerequisites: [], nextSteps: [], totalFound: 0 };
    try {
      const id = parseInt(req.params.id);
      if (Number.isNaN(id)) {
        return res.json(empty);
      }
      const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 5, 1), 10);
      const resource = await resourceRepo.getResource(id);
      if (!resource) {
        return res.json(empty);
      }
      // NEW-006 companion: for a non-approved seed id, return the empty shape
      // to non-admins — a populated `similar` list would confirm the hidden
      // id exists and leak its category.
      if (resource.status !== 'approved') {
        const requesterId = (req as any).user?.claims?.sub;
        const requester = requesterId ? await userRepo.getUser(requesterId) : undefined;
        if (!requester || requester.role !== 'admin') {
          return res.json(empty);
        }
      }
      // Pull a pool of approved resources in the same category to rank against.
      const { resources: pool } = await resourceRepo.listResources({
        page: 1,
        limit: 60,
        status: 'approved',
        category: resource.category ?? undefined,
      });
      const related = buildRelatedResources(resource, pool, limit);
      const sanitizeItems = (items: any[]) =>
        items.map((item) => ({
          ...item,
          resource: stripInternalResourceFields(item.resource),
        }));
      res.json({
        ...related,
        similar: sanitizeItems(related.similar),
        prerequisites: sanitizeItems(related.prerequisites),
        nextSteps: sanitizeItems(related.nextSteps),
      });
    } catch (error) {
      console.error('Error fetching related resources:', error);
      res.json(empty);
    }
  });

  // POST /api/resources - Submit new resource (authenticated)
  // Mounted on both the canonical path and the /api/submit alias (BUG-019) via a
  // shared handler so both inherit the identical auth + validation chain.
  const createResourceHandler = async (req: any, res: any) => {
    try {
      const userId = req.user.claims.sub;

      // BUG-008: explicit server-side validation before DB insert
      // BUG-009 (run10): reject raw HTML/script markup in text fields. React
      // escapes on render so this is defense-in-depth, not an XSS patch —
      // markup in titles/descriptions is never legitimate catalog content.
      const NO_HTML = /<[a-z!/][^>]*>/i;
      const submitSchema = z.object({
        url: z.string().min(1).url('Invalid URL format'),
        title: z.string().min(1).max(200, 'Title must be 1-200 characters')
          .refine((v) => !NO_HTML.test(v), 'Title must not contain HTML tags'),
        category: z.string().min(1, 'Category is required'),
        description: z.string()
          .refine((v) => !NO_HTML.test(v), 'Description must not contain HTML tags')
          .optional(),
        subcategory: z.string().optional(),
        subSubcategory: z.string().optional(),
      });
      const submitValidation = submitSchema.safeParse(req.body);
      if (!submitValidation.success) {
        return res.status(400).json({
          error: 'validation_failed',
          errors: submitValidation.error.issues
        });
      }

      // BUG-008: validate category against known category slugs or names
      const knownCategories = await categoryRepo.listCategories();
      const validCategorySlugs = new Set(knownCategories.map(c => c.slug));
      const validCategoryNames = new Set(knownCategories.map(c => c.name));
      const submittedCategory = submitValidation.data.category;
      if (!validCategorySlugs.has(submittedCategory) && !validCategoryNames.has(submittedCategory)) {
        return res.status(400).json({ error: 'invalid_category', message: `Unknown category: ${submittedCategory}` });
      }

      // BUG-012: pre-check for duplicate URL → 409
      const existingResource = await resourceRepo.getResourceByUrl(submitValidation.data.url);
      if (existingResource) {
        return res.status(409).json({
          error: 'duplicate_url',
          existingId: existingResource.id,
          message: 'This URL is already in the catalog'
        });
      }

      const resourceData = insertResourceSchema.parse(req.body);

      await ensureSubSubcategoryExists(
        categoryRepo,
        resourceData.category,
        resourceData.subcategory,
        resourceData.subSubcategory,
      );

      // BUG-012: unique-constraint safety net (Postgres error code 23505)
      try {
        const resource = await resourceRepo.createResource({
          ...resourceData,
          submittedBy: userId,
          status: 'pending'
        });

        res.status(201).json(resource);
      } catch (createError: any) {
        if (createError.code === '23505' || (createError.message && createError.message.includes('unique'))) {
          return res.status(409).json({ error: 'duplicate_url', message: 'This URL is already in the catalog' });
        }
        throw createError;
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid resource data', errors: error.issues });
      }
      console.error('Error creating resource:', error);
      res.status(500).json({ message: 'Failed to create resource' });
    }
  };
  app.post('/api/resources', isAuthenticated, createResourceHandler);
  app.post('/api/submit', isAuthenticated, createResourceHandler);
  
  // GET /api/resources/pending - List pending resources (admin only)
  app.get('/api/resources/pending', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const result = await resourceRepo.listResources({
        page,
        limit,
        status: 'pending'
      });
      
      res.json(result);
    } catch (error) {
      console.error('Error fetching pending resources:', error);
      res.status(500).json({ message: 'Failed to fetch pending resources' });
    }
  });
  
  // PUT /api/resources/:id/approve - Approve resource (admin)
  app.put('/api/resources/:id/approve', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      // BUG-010: NaN guard → 400
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid resource ID' });
      }
      
      // BUG-010: resource-not-found → 404 (not 500)
      const existing = await resourceRepo.getResource(id);
      if (!existing) {
        return res.status(404).json({ message: 'Resource not found' });
      }
      
      // Run3 audit R3-28: approval gate — a resource never goes live with a
      // stub description; sanitize (entities/emails) or backfill a fallback.
      const cleanDescription = ensureMinDescription(existing.description || '', existing.title, existing.url);
      if (cleanDescription !== (existing.description || '')) {
        await resourceRepo.updateResource(id, { description: cleanDescription });
      }
      
      const resource = await resourceRepo.updateResourceStatus(id, 'approved', userId);
      res.json(resource);
    } catch (error) {
      console.error('Error approving resource:', error);
      res.status(500).json({ message: 'Failed to approve resource' });
    }
  });
  
  // PUT /api/resources/:id/reject - Reject resource (admin)
  app.put('/api/resources/:id/reject', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      // BUG-010: NaN guard → 400
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid resource ID' });
      }
      
      // BUG-010: resource-not-found → 404 (not 500)
      const existing = await resourceRepo.getResource(id);
      if (!existing) {
        return res.status(404).json({ message: 'Resource not found' });
      }
      
      const resource = await resourceRepo.updateResourceStatus(id, 'rejected', userId);
      res.json(resource);
    } catch (error) {
      console.error('Error rejecting resource:', error);
      res.status(500).json({ message: 'Failed to reject resource' });
    }
  });
  
  // POST /api/resources/:id/edits - Submit edit suggestion for a resource (authenticated)
  app.post('/api/resources/:id/edits', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const resourceId = parseInt(req.params.id);
      const { proposedChanges, proposedData, claudeMetadata, triggerClaudeAnalysis } = req.body;
      
      if (isNaN(resourceId)) {
        return res.status(400).json({ message: 'Invalid resource ID' });
      }
      
      const resource = await resourceRepo.getResource(resourceId);
      if (!resource) {
        return res.status(404).json({ message: 'Resource not found' });
      }
      
      if (!proposedChanges || !proposedData) {
        return res.status(400).json({ message: 'proposedChanges and proposedData are required' });
      }
      
      // SECURITY FIX: Whitelist of editable fields only (ISSUE 1)
      // Shared with AuditRepository merge path — see @shared/schema EDITABLE_RESOURCE_FIELDS
      const sanitizedProposedData: Record<string, any> = {};
      for (const field of EDITABLE_RESOURCE_FIELDS) {
        if (proposedData && field in proposedData) {
          sanitizedProposedData[field] = proposedData[field];
        }
      }
      
      // Sanitize proposedChanges
      const sanitizedChanges: Record<string, any> = {};
      for (const field of EDITABLE_RESOURCE_FIELDS) {
        if (proposedChanges && field in proposedChanges) {
          sanitizedChanges[field] = proposedChanges[field];
        }
      }
      
      // SECURITY FIX: Validate field sizes (ISSUE 5)
      if (sanitizedProposedData.title && sanitizedProposedData.title.length > 200) {
        return res.status(400).json({ message: 'Title too long (max 200 characters)' });
      }
      
      if (sanitizedProposedData.description && sanitizedProposedData.description.length > 2000) {
        return res.status(400).json({ message: 'Description too long (max 2000 characters)' });
      }
      
      // tags is stored in metadata.tags (not a column). Reject non-array shapes
      // up front and normalize to a clean string[] so malformed input can never
      // be persisted and later break the tag filters that read metadata.tags.
      if ('tags' in sanitizedProposedData) {
        if (!Array.isArray(sanitizedProposedData.tags)) {
          return res.status(400).json({ message: 'tags must be an array of strings' });
        }
        const normalizedTags = sanitizedProposedData.tags
          .filter((t: unknown): t is string => typeof t === 'string')
          .map((t: string) => t.trim())
          .filter((t: string) => t.length > 0);
        if (normalizedTags.length > 20) {
          return res.status(400).json({ message: 'Too many tags (max 20)' });
        }
        sanitizedProposedData.tags = normalizedTags;
      }
      
      let aiMetadata = claudeMetadata;
      if (triggerClaudeAnalysis && resource.url) {
        try {
          aiMetadata = await claudeService.analyzeURL(resource.url);
        } catch (error) {
          console.error('Error analyzing URL with Claude:', error);
        }
      }
      
      // Use sanitized versions in createResourceEdit call
      const edit = await auditRepo.createResourceEdit({
        resourceId,
        submittedBy: userId,
        status: 'pending',
        originalResourceUpdatedAt: resource.updatedAt ?? new Date(),
        proposedChanges: sanitizedChanges,
        proposedData: sanitizedProposedData,
        claudeMetadata: aiMetadata,
        claudeAnalyzedAt: aiMetadata ? new Date() : undefined,
      });
      
      res.status(201).json(edit);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid edit data', errors: error.issues });
      }
      console.error('Error creating edit suggestion:', error);
      res.status(500).json({ message: 'Failed to create edit suggestion' });
    }
  });

  // ============= Category Routes =============
  
  // GET /api/categories - List all categories (public)
  app.get('/api/categories', async (req, res) => {
    try {
      const categories = await categoryRepo.listCategories();
      // Attach the authoritative approved-resource count per category (single
      // GROUP BY query) so the nav and landing page show DB-accurate counts
      // instead of client-side static-tree sums.
      const counts = await categoryRepo.getResourceCountsByCategory();
      const enriched = categories.map((cat) => ({
        ...cat,
        resourceCount: counts[cat.name] ?? 0,
      }));
      res.json(enriched);
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({ message: 'Failed to fetch categories' });
    }
  });

  // GET /api/tags - Aggregated tag counts (public, R2-M02). Tags live in
  // resources.metadata->'tags' (jsonb string array), not the (empty) tags
  // table, so aggregate over approved resources. ~2k rows → single-digit ms.
  app.get('/api/tags', async (_req, res) => {
    try {
      // run9 BUG-018: canonicalize before aggregating — lowercase and collapse
      // spaces/underscores to hyphens so "open source", "Open Source" and
      // "open-source" merge into one "open-source" bucket instead of showing
      // as three near-duplicate filter chips.
      const result = await db.execute(sql`
        SELECT lower(regexp_replace(btrim(tag), '[[:space:]_]+', '-', 'g')) AS tag,
               count(*)::int AS count
        FROM resources r,
             jsonb_array_elements_text(r.metadata->'tags') AS tag
        WHERE r.status = 'approved'
          AND jsonb_typeof(r.metadata->'tags') = 'array'
          AND btrim(tag) <> ''
        GROUP BY 1
        ORDER BY count DESC, tag ASC
      `);
      res.set('Cache-Control', 'public, max-age=300');
      res.json({
        total: result.rows.length,
        tags: result.rows.map((r: any) => ({ tag: r.tag, count: r.count })),
      });
    } catch (error) {
      console.error('Error aggregating tags:', error);
      res.status(500).json({ message: 'Failed to fetch tags' });
    }
  });

  // GET /api/subcategories - List all subcategories (public)
  app.get('/api/subcategories', async (req, res) => {
    try {
      let categoryId: number | undefined = undefined;
      
      // Validate categoryId query parameter if provided
      if (req.query.categoryId) {
        const categoryIdSchema = z.string().regex(/^\d+$/, "categoryId must be a valid number");
        const validation = categoryIdSchema.safeParse(req.query.categoryId);
        
        if (!validation.success) {
          return res.status(400).json({ 
            message: 'Invalid categoryId parameter', 
            errors: validation.error.issues
          });
        }
        
        categoryId = parseInt(validation.data);
        
        if (isNaN(categoryId) || categoryId < 1) {
          return res.status(400).json({ 
            message: 'categoryId must be a positive number' 
          });
        }
      }
      
      const subcategories = await categoryRepo.listSubcategories(categoryId);
      res.json(subcategories);
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      res.status(500).json({ message: 'Failed to fetch subcategories' });
    }
  });

  // GET /api/sub-subcategories - List all sub-subcategories (public)
  app.get('/api/sub-subcategories', async (req, res) => {
    try {
      let subcategoryId: number | undefined = undefined;
      
      // Validate subcategoryId query parameter if provided
      if (req.query.subcategoryId) {
        const subcategoryIdSchema = z.string().regex(/^\d+$/, "subcategoryId must be a valid number");
        const validation = subcategoryIdSchema.safeParse(req.query.subcategoryId);
        
        if (!validation.success) {
          return res.status(400).json({ 
            message: 'Invalid subcategoryId parameter', 
            errors: validation.error.issues
          });
        }
        
        subcategoryId = parseInt(validation.data);
        
        if (isNaN(subcategoryId) || subcategoryId < 1) {
          return res.status(400).json({ 
            message: 'subcategoryId must be a positive number' 
          });
        }
      }
      
      const subSubcategories = await categoryRepo.listSubSubcategories(subcategoryId);
      res.json(subSubcategories);
    } catch (error) {
      console.error('Error fetching sub-subcategories:', error);
      res.status(500).json({ message: 'Failed to fetch sub-subcategories' });
    }
  });

  // ============= User Interaction Routes =============
  
  // POST /api/favorites/:resourceId - Add favorite
  app.post('/api/favorites/:resourceId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const resourceId = parseInt(req.params.resourceId);
      
      await userFeatureRepo.addFavorite(userId, resourceId);
      res.json({ message: 'Favorite added successfully' });
    } catch (error) {
      console.error('Error adding favorite:', error);
      res.status(500).json({ message: 'Failed to add favorite' });
    }
  });
  
  // DELETE /api/favorites/:resourceId - Remove favorite
  app.delete('/api/favorites/:resourceId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const resourceId = parseInt(req.params.resourceId);
      
      await userFeatureRepo.removeFavorite(userId, resourceId);
      res.json({ message: 'Favorite removed successfully' });
    } catch (error) {
      console.error('Error removing favorite:', error);
      res.status(500).json({ message: 'Failed to remove favorite' });
    }
  });
  
  // GET /api/favorites - Get user's favorites
  app.get('/api/favorites', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const favorites = await userFeatureRepo.getUserFavorites(userId);
      res.json(favorites);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      res.status(500).json({ message: 'Failed to fetch favorites' });
    }
  });
  
  // POST /api/bookmarks/:resourceId - Add bookmark
  app.post('/api/bookmarks/:resourceId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const resourceId = parseInt(req.params.resourceId);
      const { notes } = req.body;
      
      await userFeatureRepo.addBookmark(userId, resourceId, notes);
      res.json({ message: 'Bookmark added successfully' });
    } catch (error) {
      console.error('Error adding bookmark:', error);
      res.status(500).json({ message: 'Failed to add bookmark' });
    }
  });
  
  // DELETE /api/bookmarks/:resourceId - Remove bookmark
  app.delete('/api/bookmarks/:resourceId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const resourceId = parseInt(req.params.resourceId);
      
      await userFeatureRepo.removeBookmark(userId, resourceId);
      res.json({ message: 'Bookmark removed successfully' });
    } catch (error) {
      console.error('Error removing bookmark:', error);
      res.status(500).json({ message: 'Failed to remove bookmark' });
    }
  });
  
  // GET /api/bookmarks - Get user's bookmarks
  app.get('/api/bookmarks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const bookmarks = await userFeatureRepo.getUserBookmarks(userId);
      res.json(bookmarks);
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
      res.status(500).json({ message: 'Failed to fetch bookmarks' });
    }
  });

  // ============= User Profile & Progress Routes =============

  // GET /api/user/progress - Get user's learning progress
  // Change the current user's password and invalidate their OTHER sessions.
  // Additive: requires an authenticated session; verifies the current password before changing.
  app.post('/api/user/change-password', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { currentPassword, newPassword } = req.body ?? {};

      if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
        return res.status(400).json({ message: 'Current and new password are required' });
      }

      const user = await userRepo.getUser(userId);
      if (!user || !user.password) {
        return res.status(400).json({ message: 'Password change is not available for this account' });
      }

      const currentValid = await comparePassword(currentPassword, user.password as string);
      if (!currentValid) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }

      const pwCheck = validatePassword(newPassword);
      if (!pwCheck.valid) {
        return res.status(400).json({ message: pwCheck.error || 'Invalid new password' });
      }

      const hashed = await hashPassword(newPassword);
      await userRepo.upsertUser({ id: user.id, email: user.email, password: hashed, role: user.role });

      // Invalidate every OTHER session for this user; keep the current one so the caller stays signed in.
      // Session userId lives at sess->'passport'->'user'->'claims'->>'sub'.
      const currentSid = req.sessionID;
      const deleted = await db.execute(sql`
        DELETE FROM sessions
        WHERE sess->'passport'->'user'->'claims'->>'sub' = ${userId}
          AND sid <> ${currentSid}
      `);

      return res.status(200).json({
        message: 'Password changed successfully',
        otherSessionsInvalidated: (deleted as any).rowCount ?? null,
      });
    } catch (error) {
      console.error('[/api/user/change-password] Error:', error);
      return res.status(500).json({ message: 'Failed to change password' });
    }
  });

  // ---- API key management (session-authed) -------------------------------
  // POST /api/user/api-keys — create a key; the plaintext is returned ONCE.
  app.post('/api/user/api-keys', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { name, scopes, expiresInDays } = req.body ?? {};

      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ message: 'A non-empty "name" is required' });
      }
      if (scopes !== undefined && (!Array.isArray(scopes) || scopes.some((s: unknown) => typeof s !== 'string'))) {
        return res.status(400).json({ message: '"scopes" must be an array of strings' });
      }
      let expiresAt: Date | null = null;
      if (expiresInDays !== undefined && expiresInDays !== null) {
        const days = Number(expiresInDays);
        if (!Number.isFinite(days) || days <= 0) {
          return res.status(400).json({ message: '"expiresInDays" must be a positive number' });
        }
        expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      }

      const { apiKey, plaintextKey } = await storage.createApiKey({
        userId,
        name: name.trim(),
        scopes: scopes ?? [],
        expiresAt,
      });

      return res.status(201).json({
        message: 'API key created. Copy it now — it will not be shown again.',
        key: plaintextKey,
        apiKey: {
          id: apiKey.id,
          name: apiKey.name,
          scopes: apiKey.scopes,
          createdAt: apiKey.createdAt,
          expiresAt: apiKey.expiresAt,
        },
      });
    } catch (error) {
      console.error('[POST /api/user/api-keys] Error:', error);
      return res.status(500).json({ message: 'Failed to create API key' });
    }
  });

  // GET /api/user/api-keys — list the caller's keys (never returns the secret).
  app.get('/api/user/api-keys', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const keys = await storage.listApiKeys(userId);
      return res.json({ apiKeys: keys });
    } catch (error) {
      console.error('[GET /api/user/api-keys] Error:', error);
      return res.status(500).json({ message: 'Failed to list API keys' });
    }
  });

  // DELETE /api/user/api-keys/:id — revoke one of the caller's keys.
  app.delete('/api/user/api-keys/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const revoked = await storage.revokeApiKey(req.params.id, userId);
      if (!revoked) {
        return res.status(404).json({ message: 'API key not found' });
      }
      return res.json({ message: 'API key revoked' });
    } catch (error) {
      console.error('[DELETE /api/user/api-keys/:id] Error:', error);
      return res.status(500).json({ message: 'Failed to revoke API key' });
    }
  });

  app.get('/api/user/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // Get total resources in catalog
      const totalResourcesResult = await resourceRepo.listResources({ status: 'approved', limit: 1 });
      const totalResources = totalResourcesResult.total;

      // Get user's journey progress to count completed resources
      const journeyProgress = await learningJourneyRepo.listUserJourneyProgress(userId);
      const completedResources = journeyProgress.filter(p => p.completedAt !== null).length;

      // Get current learning path (most recently accessed journey)
      let currentPath: string | undefined;
      if (journeyProgress.length > 0) {
        const latestJourney = journeyProgress[0];
        const journey = await learningJourneyRepo.getLearningJourney(latestJourney.journeyId);
        currentPath = journey?.title;
      }

      // Calculate streak days from favorites and bookmarks
      const favorites = await userFeatureRepo.getUserFavorites(userId);
      const bookmarks = await userFeatureRepo.getUserBookmarks(userId);
      
      // Debug: Log sample data to verify timestamps are available
      if (favorites.length > 0) {
        console.log('Favorites sample:', favorites[0]);
      }
      if (bookmarks.length > 0) {
        console.log('Bookmarks sample:', bookmarks[0]);
      }
      
      // Get all activity dates from favorites and bookmarks
      const activityDates: Date[] = [];
      
      // Add favorite dates (now using favoritedAt from junction table)
      favorites.forEach(f => {
        if (f.favoritedAt) activityDates.push(new Date(f.favoritedAt));
      });
      
      // Add bookmark dates (now using bookmarkedAt from junction table)
      bookmarks.forEach(b => {
        if (b.bookmarkedAt) activityDates.push(new Date(b.bookmarkedAt));
      });

      // Calculate streak
      let streakDays = 0;
      if (activityDates.length > 0) {
        // Sort dates descending
        activityDates.sort((a, b) => b.getTime() - a.getTime());
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let currentDate = new Date(today);
        streakDays = 0;
        
        for (const activityDate of activityDates) {
          const activity = new Date(activityDate);
          activity.setHours(0, 0, 0, 0);
          
          const diffDays = Math.floor((currentDate.getTime() - activity.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diffDays === 0) {
            streakDays = Math.max(streakDays, 1);
          } else if (diffDays === streakDays) {
            streakDays++;
          }
        }
      }

      // Get skill level from user preferences
      let skillLevel = 'beginner';
      try {
        const userPrefs = await userFeatureRepo.getUserPreferences(userId);
        if (userPrefs?.skillLevel) {
          skillLevel = userPrefs.skillLevel;
        }
      } catch (error) {
        console.log('User preferences not found, using default skill level');
      }

      const progressData = {
        totalResources,
        completedResources,
        currentPath,
        streakDays,
        totalTimeSpent: '0h 0m',
        skillLevel
      };

      res.json(progressData);
    } catch (error) {
      console.error('Error fetching user progress:', error);
      res.status(500).json({ message: 'Failed to fetch user progress' });
    }
  });

  // GET /api/user/submissions - Get user's submitted resources and edits
  app.get('/api/user/submissions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // Get user's submitted resources
      const submittedResources = await resourceRepo.listResources({
        userId,
        page: 1,
        limit: 100
      });

      // Get user's suggested edits
      const resourceEdits = await auditRepo.getResourceEditsByUser(userId);

      res.json({
        resources: submittedResources.resources,
        edits: resourceEdits,
        totalResources: submittedResources.total,
        totalEdits: resourceEdits.length
      });
    } catch (error) {
      console.error('Error fetching user submissions:', error);
      res.status(500).json({ message: 'Failed to fetch user submissions' });
    }
  });

  // GET /api/user/journeys - Get user's learning journeys with details
  app.get('/api/user/journeys', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // Get user's journey progress
      const journeyProgress = await learningJourneyRepo.listUserJourneyProgress(userId);

      // Fetch journey details for each progress entry
      const journeysWithDetails = await Promise.all(
        journeyProgress.map(async (progress) => {
          const journey = await learningJourneyRepo.getLearningJourney(progress.journeyId);
          return {
            ...progress,
            journey
          };
        })
      );

      res.json(journeysWithDetails);
    } catch (error) {
      console.error('Error fetching user journeys:', error);
      res.status(500).json({ message: 'Failed to fetch user journeys' });
    }
  });

  // ============= Learning Journey Routes =============
  
  // GET /api/journeys - List all journeys
  app.get('/api/journeys', async (req: any, res) => {
    try {
      const category = req.query.category as string;
      const journeys = await learningJourneyRepo.listLearningJourneys(category);
      
      // Early return if no journeys
      if (journeys.length === 0) {
        return res.json([]);
      }
      
      // BATCH FETCH: Single query for all steps
      const journeyIds = journeys.map(j => j.id);
      const stepsMap = await learningJourneyRepo.listJourneyStepsBatch(journeyIds);
      
      // If user is authenticated, batch fetch all progress
      if (req.user?.claims?.sub) {
        const userId = req.user.claims.sub;
        const allProgress = await learningJourneyRepo.listUserJourneyProgress(userId);
        
        // Create progress map for O(1) lookup
        const progressMap = new Map();
        allProgress.forEach(p => {
          progressMap.set(p.journeyId, p);
        });
        
        // Enrich journeys with steps and progress
        const enrichedJourneys = journeys.map(journey => {
          const steps = stepsMap.get(journey.id) || [];
          const progress = progressMap.get(journey.id);
          
          // Count distinct stepNumbers instead of total database rows (defensive: handle both strings and numbers)
          const uniqueStepNumbers = new Set(
            steps
              .map(s => typeof s.stepNumber === 'number' ? s.stepNumber : parseInt(s.stepNumber, 10))
              .filter(n => !isNaN(n))
          );
          
          return {
            ...journey,
            stepCount: uniqueStepNumbers.size,
            completedStepCount: progress?.completedSteps?.length || 0,
            isEnrolled: !!progress
          };
        });
        
        res.json(enrichedJourneys);
      } else {
        // For unauthenticated users
        const enrichedJourneys = journeys.map(journey => {
          const steps = stepsMap.get(journey.id) || [];
          
          // Count distinct stepNumbers instead of total database rows (defensive: handle both strings and numbers)
          const uniqueStepNumbers = new Set(
            steps
              .map(s => typeof s.stepNumber === 'number' ? s.stepNumber : parseInt(s.stepNumber, 10))
              .filter(n => !isNaN(n))
          );
          
          return {
            ...journey,
            stepCount: uniqueStepNumbers.size,
            completedStepCount: 0,
            isEnrolled: false
          };
        });
        
        res.json(enrichedJourneys);
      }
    } catch (error) {
      console.error('Error fetching journeys:', error);
      res.status(500).json({ message: 'Failed to fetch journeys' });
    }
  });
  
  // GET /api/journeys/:id - Get journey details
  app.get('/api/journeys/:id', async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      // BUG-004 (run8): non-numeric ids (e.g. /api/journeys/some-slug) previously
      // reached the DB with NaN and threw -> 500. Treat them as not found.
      if (isNaN(id)) {
        return res.status(404).json({ message: 'Journey not found' });
      }
      const journey = await learningJourneyRepo.getLearningJourney(id);
      
      if (!journey) {
        return res.status(404).json({ message: 'Journey not found' });
      }
      
      const steps = await learningJourneyRepo.listJourneySteps(id);
      
      // Count distinct stepNumbers for accurate step count (defensive: handle both strings and numbers)
      const uniqueStepNumbers = new Set(
        steps
          .map(s => typeof s.stepNumber === 'number' ? s.stepNumber : parseInt(s.stepNumber, 10))
          .filter(n => !isNaN(n))
      );
      const stepCount = uniqueStepNumbers.size;
      
      // If user is authenticated, get their progress
      let progress = null;
      if (req.user?.claims?.sub) {
        progress = await learningJourneyRepo.getUserJourneyProgress(req.user.claims.sub, id);
      }
      
      res.json({
        ...journey,
        stepCount,
        steps,
        progress: progress ? {
          completedSteps: progress.completedSteps || [],
          currentStepId: progress.currentStepId,
          completedAt: progress.completedAt
        } : null
      });
    } catch (error) {
      console.error('Error fetching journey:', error);
      res.status(500).json({ message: 'Failed to fetch journey' });
    }
  });
  
  // POST /api/journeys/:id/start - Start journey
  app.post('/api/journeys/:id/start', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const journeyId = parseInt(req.params.id);
      if (isNaN(journeyId)) {
        return res.status(404).json({ message: 'Journey not found' });
      }
      
      const progress = await learningJourneyRepo.startUserJourney(userId, journeyId);
      res.json(progress);
    } catch (error) {
      console.error('Error starting journey:', error);
      res.status(500).json({ message: 'Failed to start journey' });
    }
  });
  
  // PUT /api/journeys/:id/progress - Update progress
  app.put('/api/journeys/:id/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const journeyId = parseInt(req.params.id);
      if (isNaN(journeyId)) {
        return res.status(404).json({ message: 'Journey not found' });
      }
      const { stepId } = req.body;
      
      if (!stepId) {
        return res.status(400).json({ message: 'Step ID is required' });
      }
      
      const progress = await learningJourneyRepo.updateUserJourneyProgress(userId, journeyId, stepId);
      res.json(progress);
    } catch (error) {
      console.error('Error updating journey progress:', error);
      res.status(500).json({ message: 'Failed to update journey progress' });
    }
  });
  
  // GET /api/journeys/:id/progress - Get user's progress
  app.get('/api/journeys/:id/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const journeyId = parseInt(req.params.id);
      if (isNaN(journeyId)) {
        return res.status(404).json({ message: 'Journey not found' });
      }
      
      const progress = await learningJourneyRepo.getUserJourneyProgress(userId, journeyId);
      
      if (!progress) {
        return res.status(404).json({ message: 'Progress not found' });
      }
      
      res.json(progress);
    } catch (error) {
      console.error('Error fetching journey progress:', error);
      res.status(500).json({ message: 'Failed to fetch journey progress' });
    }
  });

  // ============= Admin Journey & Step Routes =============

  // GET /api/admin/journeys - List ALL journeys (including drafts/archived)
  app.get('/api/admin/journeys', isAuthenticated, isAdmin, async (_req, res) => {
    try {
      const journeys = await learningJourneyRepo.listAllLearningJourneys();
      const stepsMap = await learningJourneyRepo.listJourneyStepsBatch(
        journeys.map((j) => j.id),
      );
      const enriched = journeys.map((j) => ({
        ...j,
        steps: stepsMap.get(j.id) || [],
        stepCount: (stepsMap.get(j.id) || []).length,
      }));
      res.json({ journeys: enriched });
    } catch (error) {
      console.error('Error fetching admin journeys:', error);
      res.status(500).json({ message: 'Failed to fetch journeys' });
    }
  });

  // PUT /api/admin/journeys/:id - Update journey metadata (title, description,
  // difficulty, duration, etc.). NEW-005: added so template-boilerplate journey
  // descriptions can be corrected via the admin API (including on production,
  // which has no direct DB access).
  app.put('/api/admin/journeys/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const journeyId = parseInt(req.params.id, 10);
      if (isNaN(journeyId)) {
        return res.status(400).json({ message: 'Invalid journey ID' });
      }
      const parsed = insertLearningJourneySchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid journey update', errors: parsed.error.issues });
      }
      if (Object.keys(parsed.data).length === 0) {
        return res.status(400).json({ message: 'Empty update: provide at least one updatable field' });
      }
      const journey = await learningJourneyRepo.getLearningJourney(journeyId);
      if (!journey) {
        return res.status(404).json({ message: 'Journey not found' });
      }
      const updated = await learningJourneyRepo.updateLearningJourney(journeyId, parsed.data);
      res.json(updated);
    } catch (error) {
      console.error('Error updating journey:', error);
      res.status(500).json({ message: 'Failed to update journey' });
    }
  });

  // GET /api/admin/journeys/:id/steps - List steps for a journey
  app.get('/api/admin/journeys/:id/steps', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const journeyId = parseInt(req.params.id, 10);
      if (isNaN(journeyId)) {
        return res.status(400).json({ message: 'Invalid journey ID' });
      }
      const journey = await learningJourneyRepo.getLearningJourney(journeyId);
      if (!journey) {
        return res.status(404).json({ message: 'Journey not found' });
      }
      const steps = await learningJourneyRepo.listJourneySteps(journeyId);
      res.json({ steps });
    } catch (error) {
      console.error('Error listing journey steps:', error);
      res.status(500).json({ message: 'Failed to list journey steps' });
    }
  });

  // POST /api/admin/journeys/:id/steps - Create a step (appended to end)
  app.post('/api/admin/journeys/:id/steps', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const journeyId = parseInt(req.params.id, 10);
      if (isNaN(journeyId)) {
        return res.status(400).json({ message: 'Invalid journey ID' });
      }
      const journey = await learningJourneyRepo.getLearningJourney(journeyId);
      if (!journey) {
        return res.status(404).json({ message: 'Journey not found' });
      }

      const stepSchema = insertJourneyStepSchema.omit({ journeyId: true, stepNumber: true }).extend({
        title: z.string().min(1, 'Title is required'),
        description: z.string().nullable().optional(),
        resourceId: z.number().int().positive().nullable().optional(),
        isOptional: z.boolean().optional(),
      });
      const parsed = stepSchema.parse(req.body);

      const existing = await learningJourneyRepo.listJourneySteps(journeyId);
      const nextNumber = existing.length === 0
        ? 1
        : Math.max(...existing.map((s) => s.stepNumber)) + 1;

      const step = await learningJourneyRepo.createJourneyStep({
        journeyId,
        stepNumber: nextNumber,
        title: parsed.title,
        description: parsed.description ?? null,
        resourceId: parsed.resourceId ?? null,
        isOptional: parsed.isOptional ?? false,
      });
      res.status(201).json(step);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid step data', errors: error.issues });
      }
      console.error('Error creating journey step:', error);
      res.status(500).json({ message: 'Failed to create journey step' });
    }
  });

  // PATCH /api/admin/journeys/:journeyId/steps/:stepId - Update a step
  app.patch(
    '/api/admin/journeys/:journeyId/steps/:stepId',
    isAuthenticated,
    isAdmin,
    async (req, res) => {
      try {
        const journeyId = parseInt(req.params.journeyId, 10);
        const stepId = parseInt(req.params.stepId, 10);
        if (isNaN(journeyId) || isNaN(stepId)) {
          return res.status(400).json({ message: 'Invalid journey or step ID' });
        }

        const steps = await learningJourneyRepo.listJourneySteps(journeyId);
        const existing = steps.find((s) => s.id === stepId);
        if (!existing) {
          return res.status(404).json({ message: 'Step not found for this journey' });
        }

        const updateSchema = z.object({
          title: z.string().min(1).optional(),
          description: z.string().nullable().optional(),
          resourceId: z.number().int().positive().nullable().optional(),
          isOptional: z.boolean().optional(),
        });
        const parsed = updateSchema.parse(req.body);

        const updated = await learningJourneyRepo.updateJourneyStep(stepId, parsed);
        res.json(updated);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ message: 'Invalid step data', errors: error.issues });
        }
        console.error('Error updating journey step:', error);
        res.status(500).json({ message: 'Failed to update journey step' });
      }
    },
  );

  // DELETE /api/admin/journeys/:journeyId/steps/:stepId - Delete a step
  app.delete(
    '/api/admin/journeys/:journeyId/steps/:stepId',
    isAuthenticated,
    isAdmin,
    async (req, res) => {
      try {
        const journeyId = parseInt(req.params.journeyId, 10);
        const stepId = parseInt(req.params.stepId, 10);
        if (isNaN(journeyId) || isNaN(stepId)) {
          return res.status(400).json({ message: 'Invalid journey or step ID' });
        }

        const steps = await learningJourneyRepo.listJourneySteps(journeyId);
        const existing = steps.find((s) => s.id === stepId);
        if (!existing) {
          return res.status(404).json({ message: 'Step not found for this journey' });
        }

        await learningJourneyRepo.deleteJourneyStep(stepId);

        // Renumber remaining steps so order stays contiguous.
        const remaining = steps.filter((s) => s.id !== stepId);
        if (remaining.length > 0) {
          await learningJourneyRepo.reorderJourneySteps(
            journeyId,
            remaining.map((s) => s.id),
          );
        }
        res.json({ success: true });
      } catch (error) {
        console.error('Error deleting journey step:', error);
        res.status(500).json({ message: 'Failed to delete journey step' });
      }
    },
  );

  // POST /api/admin/journeys/:id/steps/reorder - Reorder steps
  app.post(
    '/api/admin/journeys/:id/steps/reorder',
    isAuthenticated,
    isAdmin,
    async (req, res) => {
      try {
        const journeyId = parseInt(req.params.id, 10);
        if (isNaN(journeyId)) {
          return res.status(400).json({ message: 'Invalid journey ID' });
        }

        const bodySchema = z.object({
          stepIds: z.array(z.number().int().positive()).min(1),
        });
        const { stepIds } = bodySchema.parse(req.body);

        const existing = await learningJourneyRepo.listJourneySteps(journeyId);
        if (existing.length !== stepIds.length) {
          return res
            .status(400)
            .json({ message: 'Reorder must include exactly every step of the journey' });
        }
        const existingSet = new Set(existing.map((s) => s.id));
        const reorderSet = new Set(stepIds);
        if (
          existingSet.size !== reorderSet.size ||
          [...existingSet].some((id) => !reorderSet.has(id))
        ) {
          return res.status(400).json({ message: 'Reorder must reference the journey\'s existing steps exactly once each' });
        }

        const steps = await learningJourneyRepo.reorderJourneySteps(journeyId, stepIds);
        res.json({ steps });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ message: 'Invalid reorder payload', errors: error.issues });
        }
        console.error('Error reordering journey steps:', error);
        res.status(500).json({ message: 'Failed to reorder journey steps' });
      }
    },
  );

  // ============= Admin Routes =============
  
  // GET /api/admin/stats - Dashboard statistics
  app.get('/api/admin/stats', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const stats = await adminRepo.getAdminStats();
      // Map backend property names to frontend expectations
      res.json({
        users: stats.totalUsers,
        resources: stats.totalResources,
        journeys: stats.totalJourneys,
        pendingApprovals: stats.pendingResources,
        totalPublic: stats.totalPublic,
        totalPending: stats.totalPending,
        totalDeleted: stats.totalDeleted,
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      res.status(500).json({ message: 'Failed to fetch admin statistics' });
    }
  });
  
  // GET /api/admin/users - List users
  app.get('/api/admin/users', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const q = typeof req.query.q === 'string' ? req.query.q : undefined;

      const result = await userRepo.listUsers(page, limit, q);
      // Never expose password hashes over the API, even to admins. Strip the
      // password field from every user before sending the response.
      const sanitizedUsers = result.users.map(({ password, ...rest }) => rest);
      res.json({ ...result, users: sanitizedUsers });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });
  
  // GET /api/admin/users/export - CSV export of all users (R2-L08).
  // Password hashes are never included. Cells that could be interpreted as
  // spreadsheet formulas (= + - @ prefixes) are quoted with a leading
  // apostrophe to prevent CSV-injection when opened in Excel/Sheets.
  app.get('/api/admin/users/export', isAuthenticated, isAdmin, async (_req, res) => {
    try {
      const allUsers = await userRepo.listAllUsers();
      const csvCell = (value: unknown): string => {
        let s = value === null || value === undefined ? '' : String(value);
        if (/^[=+\-@]/.test(s)) s = `'${s}`;
        if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
        return s;
      };
      const header = ['id', 'email', 'firstName', 'lastName', 'role', 'authProvider', 'createdAt'];
      const lines = [header.join(',')];
      for (const u of allUsers) {
        const provider = u.password ? 'local' : 'replit';
        lines.push([
          csvCell(u.id),
          csvCell(u.email),
          csvCell(u.firstName),
          csvCell(u.lastName),
          csvCell(u.role),
          csvCell(provider),
          csvCell(u.createdAt instanceof Date ? u.createdAt.toISOString() : u.createdAt),
        ].join(','));
      }
      res.set('Content-Type', 'text/csv; charset=utf-8');
      res.set('Content-Disposition', `attachment; filename="users-export-${new Date().toISOString().slice(0, 10)}.csv"`);
      res.send(lines.join('\r\n') + '\r\n');
    } catch (error) {
      console.error('Error exporting users:', error);
      res.status(500).json({ message: 'Failed to export users' });
    }
  });

  // PUT /api/admin/users/:id/role - Change user role
  app.put('/api/admin/users/:id/role', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.params.id;
      const { role } = req.body;
      
      if (!role || !['user', 'admin', 'moderator'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
      }
      
      const user = await userRepo.updateUserRole(userId, role);
      res.json(user);
    } catch (error) {
      console.error('Error updating user role:', error);
      res.status(500).json({ message: 'Failed to update user role' });
    }
  });
  
  // DELETE /api/admin/users/:id - Delete a user (NEW-004: QA/test account
  // cleanup). Self-deletion is blocked. Content is preserved: the user's
  // submitted/approved resources are detached (attribution nulled) rather than
  // cascade-deleted; their pending edit suggestions are removed. Personal data
  // (bookmarks, favorites, progress, preferences, API keys) cascades away.
  app.delete('/api/admin/users/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const targetId = req.params.id;
      if (req.user?.claims?.sub === targetId) {
        return res.status(400).json({ message: 'You cannot delete your own account' });
      }
      const target = await userRepo.getUser(targetId);
      if (!target) {
        return res.status(404).json({ message: 'User not found' });
      }
      const summary = await userRepo.deleteUserWithCleanup(targetId);
      res.json({ success: true, deletedUserId: targetId, email: target.email, ...summary });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ message: 'Failed to delete user' });
    }
  });

  // ============= Audit Log Routes =============

  // GET /api/admin/audit-logs - List audit log entries
  app.get('/api/admin/audit-logs', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const resourceId = req.query.resourceId ? parseInt(req.query.resourceId as string) : null;
      
      const logs = await auditRepo.getResourceAuditLog(
        resourceId && !isNaN(resourceId) ? resourceId : null,
        limit
      );
      res.json({ logs, total: logs.length });
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      res.status(500).json({ message: 'Failed to fetch audit logs' });
    }
  });

  // ============= Resource Approval Routes =============
  
  // GET /api/admin/pending-resources - Get all pending resources for approval
  app.get('/api/admin/pending-resources', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const result = await resourceRepo.getPendingResources();
      
      res.json(result);
    } catch (error) {
      console.error('Error fetching pending resources:', error);
      res.status(500).json({ message: 'Failed to fetch pending resources' });
    }
  });
  
  // POST /api/admin/resources/:id/approve - Approve a pending resource
  // :id is constrained to digits so it cannot shadow the literal /resources/bulk/* routes
  // registered later (Express matches first-registered; an unconstrained :id would capture "bulk").
  app.post('/api/admin/resources/:id(\\d+)/approve', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const resourceId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      if (isNaN(resourceId)) {
        return res.status(400).json({ message: 'Invalid resource ID' });
      }
      
      // BUG-010: no body required; if a body is present it must be a plain object
      const approveBodySchema = z.object({}).optional();
      if (req.body !== undefined && req.body !== null && !approveBodySchema.safeParse(req.body).success) {
        return res.status(400).json({ message: 'Invalid request body' });
      }
      
      // BUG-010: resource-not-found → 404 (not 500)
      const existing = await resourceRepo.getResource(resourceId);
      if (!existing) {
        return res.status(404).json({ message: 'Resource not found' });
      }
      
      // Run3 audit R3-28: approval gate — sanitize or backfill a fallback
      // description so no live resource has a stub under 20 chars.
      const cleanDescription = ensureMinDescription(existing.description || '', existing.title, existing.url);
      if (cleanDescription !== (existing.description || '')) {
        await resourceRepo.updateResource(resourceId, { description: cleanDescription });
      }
      
      const updatedResource = await resourceRepo.approveResource(resourceId, userId);
      
      res.json(updatedResource);
    } catch (error) {
      console.error('Error approving resource:', error);
      res.status(500).json({ message: 'Failed to approve resource' });
    }
  });
  
  // POST /api/admin/resources/:id/reject - Reject a pending resource
  // :id constrained to digits so it cannot shadow the literal /resources/bulk/* routes.
  app.post('/api/admin/resources/:id(\\d+)/reject', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const resourceId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const { reason } = req.body;
      
      if (isNaN(resourceId)) {
        return res.status(400).json({ message: 'Invalid resource ID' });
      }
      
      // BUG-010: resource-not-found → 404 (not 500)
      const existing = await resourceRepo.getResource(resourceId);
      if (!existing) {
        return res.status(404).json({ message: 'Resource not found' });
      }
      
      if (!reason || reason.trim().length < 10) {
        return res.status(400).json({ message: 'Rejection reason is required (minimum 10 characters)' });
      }
      
      await resourceRepo.rejectResource(resourceId, userId, reason);
      const updatedResource = await resourceRepo.getResource(resourceId);
      
      res.json(updatedResource);
    } catch (error) {
      console.error('Error rejecting resource:', error);
      res.status(500).json({ message: 'Failed to reject resource' });
    }
  });

  // POST /api/admin/resources/:id/unapprove - Revert an approved resource to pending
  // BUG-010: safe reversal of approval. :id constrained to digits to avoid shadowing bulk routes.
  app.post('/api/admin/resources/:id(\\d+)/unapprove', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const resourceId = parseInt(req.params.id);
      const userId = req.user.claims.sub;

      if (isNaN(resourceId)) {
        return res.status(400).json({ message: 'Invalid resource ID' });
      }

      // BUG-010: no body required; if a body is present it must be a plain object
      const unapproveBodySchema = z.object({}).optional();
      if (req.body !== undefined && req.body !== null && !unapproveBodySchema.safeParse(req.body).success) {
        return res.status(400).json({ message: 'Invalid request body' });
      }

      const existing = await resourceRepo.getResource(resourceId);
      if (!existing) {
        return res.status(404).json({ message: 'Resource not found' });
      }

      const updatedResource = await resourceRepo.updateResourceStatus(resourceId, 'pending', userId);
      res.json(updatedResource);
    } catch (error) {
      console.error('Error unapproving resource:', error);
      res.status(500).json({ message: 'Failed to unapprove resource' });
    }
  });

  // PUT /api/admin/resources/:id - Update a resource (admin only)
  app.put('/api/admin/resources/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const resourceId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      if (isNaN(resourceId)) {
        return res.status(400).json({ message: 'Invalid resource ID' });
      }
      
      const resource = await resourceRepo.getResource(resourceId);
      if (!resource) {
        return res.status(404).json({ message: 'Resource not found' });
      }
      
      const updateSchema = insertResourceSchema.partial();
      const validationResult = updateSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: 'Validation failed', 
          errors: validationResult.error.issues
        });
      }
      
      const validatedData = validationResult.data;
      const updateData: Record<string, any> = {};
      
      if (validatedData.title !== undefined) updateData.title = validatedData.title;
      if (validatedData.url !== undefined) updateData.url = validatedData.url;
      if (validatedData.description !== undefined) updateData.description = validatedData.description;
      if (validatedData.category !== undefined) updateData.category = validatedData.category;
      if (validatedData.subcategory !== undefined) updateData.subcategory = validatedData.subcategory;
      if (validatedData.subSubcategory !== undefined) updateData.subSubcategory = validatedData.subSubcategory;
      if (validatedData.status !== undefined) updateData.status = validatedData.status;

      // Auto-create the implied sub_subcategories row so the resource never
      // disappears from the category drilldown (task #57). Uses the post-update
      // hierarchy values: prefer the incoming value, fall back to the resource's
      // existing value.
      await ensureSubSubcategoryExists(
        categoryRepo,
        updateData.category ?? resource.category,
        updateData.subcategory ?? resource.subcategory,
        updateData.subSubcategory ?? resource.subSubcategory,
      );

      const updatedResource = await resourceRepo.updateResource(resourceId, updateData);
      
      await auditRepo.logResourceAudit(
        resourceId,
        'updated',
        userId,
        updateData,
        'Resource updated by admin'
      );
      
      res.json(updatedResource);
    } catch (error) {
      console.error('Error updating resource:', error);
      res.status(500).json({ message: 'Failed to update resource' });
    }
  });

  // DELETE /api/admin/resources/:id - Delete a resource (admin only)
  app.delete('/api/admin/resources/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const resourceId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      if (isNaN(resourceId)) {
        return res.status(400).json({ message: 'Invalid resource ID' });
      }
      
      const resource = await resourceRepo.getResource(resourceId);
      if (!resource) {
        return res.status(404).json({ message: 'Resource not found' });
      }
      
      // deleteResource writes the 'deleted' audit row itself, before the row is
      // removed, so the audit FK stays valid. Logging again here would insert a row
      // referencing the now-deleted resource and throw, masking a successful delete
      // as a 500.
      await resourceRepo.deleteResource(resourceId, userId);

      res.json({ message: 'Resource deleted successfully' });
    } catch (error) {
      console.error('Error deleting resource:', error);
      res.status(500).json({ message: 'Failed to delete resource' });
    }
  });

  // POST /api/admin/resources/bulk/approve - Bulk approve resources
  app.post('/api/admin/resources/bulk/approve', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { ids } = req.body as { ids?: unknown };

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: 'ids must be a non-empty array of resource IDs' });
      }

      const numericIds = ids
        .map((id) => (typeof id === 'number' ? id : parseInt(String(id), 10)))
        .filter((id) => !Number.isNaN(id));

      if (numericIds.length === 0) {
        return res.status(400).json({ message: 'No valid resource IDs provided' });
      }

      const results = await Promise.allSettled(
        numericIds.map((id) => resourceRepo.approveResource(id, userId))
      );

      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.length - succeeded;

      res.json({ message: `Approved ${succeeded} resource(s)`, succeeded, failed });
    } catch (error) {
      console.error('Error in bulk approve:', error);
      res.status(500).json({ message: 'Failed to bulk approve resources' });
    }
  });

  // POST /api/admin/resources/bulk/reject - Bulk reject resources
  app.post('/api/admin/resources/bulk/reject', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { ids, reason } = req.body as { ids?: unknown; reason?: string };

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: 'ids must be a non-empty array of resource IDs' });
      }

      if (!reason || typeof reason !== 'string' || reason.trim().length < 10) {
        return res.status(400).json({ message: 'Rejection reason is required (minimum 10 characters)' });
      }

      const numericIds = ids
        .map((id) => (typeof id === 'number' ? id : parseInt(String(id), 10)))
        .filter((id) => !Number.isNaN(id));

      if (numericIds.length === 0) {
        return res.status(400).json({ message: 'No valid resource IDs provided' });
      }

      const results = await Promise.allSettled(
        numericIds.map((id) => resourceRepo.rejectResource(id, userId, reason))
      );

      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.length - succeeded;

      res.json({ message: `Rejected ${succeeded} resource(s)`, succeeded, failed });
    } catch (error) {
      console.error('Error in bulk reject:', error);
      res.status(500).json({ message: 'Failed to bulk reject resources' });
    }
  });

  // POST /api/admin/resources/bulk/delete - Bulk delete resources
  app.post('/api/admin/resources/bulk/delete', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { ids } = req.body as { ids?: unknown };

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: 'ids must be a non-empty array of resource IDs' });
      }

      const numericIds = ids
        .map((id) => (typeof id === 'number' ? id : parseInt(String(id), 10)))
        .filter((id) => !Number.isNaN(id));

      if (numericIds.length === 0) {
        return res.status(400).json({ message: 'No valid resource IDs provided' });
      }

      let succeeded = 0;
      let failed = 0;
      for (const id of numericIds) {
        try {
          const resource = await resourceRepo.getResource(id);
          if (!resource) {
            failed++;
            continue;
          }
          // deleteResource records the 'deleted' audit row before removing the row,
          // keeping the audit FK valid; a second log here would reference the deleted
          // id and throw.
          await resourceRepo.deleteResource(id, userId);
          succeeded++;
        } catch (err) {
          console.error(`Error deleting resource ${id} in bulk:`, err);
          failed++;
        }
      }

      res.json({ message: `Deleted ${succeeded} resource(s)`, succeeded, failed });
    } catch (error) {
      console.error('Error in bulk delete:', error);
      res.status(500).json({ message: 'Failed to bulk delete resources' });
    }
  });

  // GET /api/admin/resources - Get all resources for admin (with pagination and filters)
  app.get('/api/admin/resources', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const search = req.query.search as string;
      const category = req.query.category as string;
      const status = req.query.status as string;
      
      const result = await resourceRepo.listResources({
        page,
        limit,
        search,
        category,
        status: status || undefined
      });
      
      res.json({
        resources: result.resources,
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit)
      });
    } catch (error) {
      console.error('Error fetching admin resources:', error);
      res.status(500).json({ message: 'Failed to fetch resources' });
    }
  });

  // POST /api/admin/resources - Create a new resource (admin only)
  app.post('/api/admin/resources', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const createSchema = insertResourceSchema.extend({
        title: insertResourceSchema.shape.title.min(1, 'Title is required'),
        url: insertResourceSchema.shape.url.min(1, 'URL is required'),
      });
      
      const validationResult = createSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: 'Validation failed', 
          errors: validationResult.error.issues
        });
      }
      
      const validatedData = validationResult.data;

      const resolvedCategory = validatedData.category || 'General Tools';
      const resolvedSubcategory = validatedData.subcategory || null;
      const resolvedSubSubcategory = validatedData.subSubcategory || null;

      await ensureSubSubcategoryExists(
        categoryRepo,
        resolvedCategory,
        resolvedSubcategory,
        resolvedSubSubcategory,
      );

      const newResource = await resourceRepo.createResource({
        title: validatedData.title,
        url: validatedData.url,
        description: validatedData.description || '',
        category: resolvedCategory,
        subcategory: resolvedSubcategory,
        subSubcategory: resolvedSubSubcategory,
        status: validatedData.status || 'approved',
        submittedBy: userId
      });
      
      await auditRepo.logResourceAudit(
        newResource.id,
        'created',
        userId,
        { title: validatedData.title, url: validatedData.url },
        'Resource created by admin'
      );
      
      res.status(201).json(newResource);
    } catch (error) {
      console.error('Error creating resource:', error);
      res.status(500).json({ message: 'Failed to create resource' });
    }
  });
  
  // ============= Resource Edit Management Routes =============
  
  // GET /api/admin/resource-edits - Get all pending resource edits (admin only)
  app.get('/api/admin/resource-edits', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const edits = await auditRepo.getPendingResourceEdits();
      
      const editsWithResources = await Promise.all(
        edits.map(async (edit) => {
          const resource = await resourceRepo.getResource(edit.resourceId);
          return {
            ...edit,
            resource
          };
        })
      );
      
      res.json(editsWithResources);
    } catch (error) {
      console.error('Error fetching pending edits:', error);
      res.status(500).json({ message: 'Failed to fetch pending edits' });
    }
  });
  
  // POST /api/admin/resource-edits/:id/approve - Approve an edit (admin only)
  app.post('/api/admin/resource-edits/:id/approve', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const editId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      if (isNaN(editId)) {
        return res.status(400).json({ message: 'Invalid edit ID' });
      }
      
      await auditRepo.approveResourceEdit(editId, userId);
      
      res.json({ message: 'Edit approved and merged successfully' });
    } catch (error: any) {
      console.error('Error approving edit:', error);
      
      if (error.message && error.message.includes('Conflict detected')) {
        return res.status(409).json({ 
          message: error.message,
          conflict: true
        });
      }
      
      res.status(500).json({ message: error.message || 'Failed to approve edit' });
    }
  });
  
  // POST /api/admin/resource-edits/:id/reject - Reject an edit (admin only)
  app.post('/api/admin/resource-edits/:id/reject', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const editId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const { reason } = req.body;
      
      if (isNaN(editId)) {
        return res.status(400).json({ message: 'Invalid edit ID' });
      }
      
      if (!reason || reason.trim().length < 10) {
        return res.status(400).json({ message: 'Rejection reason is required (minimum 10 characters)' });
      }
      
      await auditRepo.rejectResourceEdit(editId, userId, reason);
      
      res.json({ message: 'Edit rejected successfully' });
    } catch (error: any) {
      console.error('Error rejecting edit:', error);
      res.status(500).json({ message: error.message || 'Failed to reject edit' });
    }
  });
  
  // POST /api/claude/analyze - Analyze URL with Claude AI (authenticated)
  app.post('/api/claude/analyze', isAuthenticated, async (req, res) => {
    try {
      const { url } = req.body;
      
      if (!url) {
        return res.status(400).json({ message: 'URL is required' });
      }
      
      if (!claudeService.isAvailable()) {
        return res.status(503).json({ 
          message: 'Claude AI service is not available',
          available: false
        });
      }
      
      const analysis = await claudeService.analyzeURL(url);
      
      if (!analysis) {
        return res.status(500).json({ message: 'Failed to analyze URL' });
      }
      
      res.json(analysis);
    } catch (error) {
      console.error('Error analyzing URL:', error);
      res.status(500).json({ message: 'Failed to analyze URL' });
    }
  });

  // ============= Category Management Routes =============
  
  // GET /api/admin/categories - List all categories
  app.get('/api/admin/categories', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const categories = await categoryRepo.listCategories();

      // Run3 audit R3-16: use the approved-only per-category counts (single
      // GROUP BY query) so the admin Categories tab matches the public
      // /api/categories resourceCount exactly. getCategoryResourceCount
      // (all-statuses) is intentionally left unchanged — it backs the
      // taxonomy delete guard, which must see pending/rejected rows too.
      const approvedCounts = await categoryRepo.getResourceCountsByCategory();
      const categoriesWithCounts = categories.map((cat) => ({
        ...cat,
        resourceCount: approvedCounts[cat.name] ?? 0,
      }));

      res.json(categoriesWithCounts);
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({ message: 'Failed to fetch categories' });
    }
  });
  
  // POST /api/admin/categories - Create a new category
  app.post('/api/admin/categories', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { insertCategorySchema } = await import('@shared/schema');
      
      const validationResult = insertCategorySchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: 'Validation failed', 
          errors: validationResult.error.issues
        });
      }
      
      const newCategory = await categoryRepo.createCategory(validationResult.data);
      
      await auditRepo.logResourceAudit(
        null,
        'category_created',
        req.user.claims.sub,
        { category: newCategory },
        `Created category: ${newCategory.name}`
      );
      
      res.status(201).json(newCategory);
    } catch (error) {
      console.error('Error creating category:', error);
      
      if (error instanceof Error && error.message.includes('already exists')) {
        return res.status(409).json({ message: error.message });
      }
      
      res.status(500).json({ message: 'Failed to create category' });
    }
  });
  
  // PATCH /api/admin/categories/:id - Update a category
  app.patch('/api/admin/categories/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const categoryId = parseInt(req.params.id);
      
      if (isNaN(categoryId)) {
        return res.status(400).json({ message: 'Invalid category ID' });
      }
      
      const { updateCategorySchema } = await import('@shared/schema');
      
      const validationResult = updateCategorySchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: 'Validation failed', 
          errors: validationResult.error.issues
        });
      }
      
      const existingCategory = await categoryRepo.getCategory(categoryId);
      if (!existingCategory) {
        return res.status(404).json({ message: 'Category not found' });
      }
      
      const updatedCategory = await categoryRepo.updateCategory(categoryId, validationResult.data);
      
      await auditRepo.logResourceAudit(
        null,
        'category_updated',
        req.user.claims.sub,
        { before: existingCategory, after: updatedCategory },
        `Updated category: ${existingCategory.name}`
      );
      
      res.json(updatedCategory);
    } catch (error) {
      console.error('Error updating category:', error);
      res.status(500).json({ message: 'Failed to update category' });
    }
  });
  
  // DELETE /api/admin/categories/:id - Delete a category
  app.delete('/api/admin/categories/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const categoryId = parseInt(req.params.id);
      
      if (isNaN(categoryId)) {
        return res.status(400).json({ message: 'Invalid category ID' });
      }
      
      const category = await categoryRepo.getCategory(categoryId);
      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }
      
      const resourceCount = await categoryRepo.getCategoryResourceCount(category.name);
      if (resourceCount > 0) {
        return res.status(400).json({ 
          message: `Cannot delete category with ${resourceCount} resources. Please reassign or delete resources first.` 
        });
      }
      
      await categoryRepo.deleteCategory(categoryId);
      
      await auditRepo.logResourceAudit(
        null,
        'category_deleted',
        req.user.claims.sub,
        { category },
        `Deleted category: ${category.name}`
      );
      
      res.json({ message: 'Category deleted successfully' });
    } catch (error) {
      console.error('Error deleting category:', error);
      res.status(500).json({ message: 'Failed to delete category' });
    }
  });
  
  // ============= Subcategory Management Routes =============
  
  // GET /api/admin/subcategories - List all subcategories (optionally filtered by category)
  app.get('/api/admin/subcategories', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
      
      const subcategories = await categoryRepo.listSubcategories(categoryId);
      
      const subcategoriesWithCounts = await Promise.all(
        subcategories.map(async (sub) => {
          const count = await categoryRepo.getSubcategoryResourceCount(sub.name);
          return { ...sub, resourceCount: count };
        })
      );
      
      res.json(subcategoriesWithCounts);
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      res.status(500).json({ message: 'Failed to fetch subcategories' });
    }
  });
  
  // POST /api/admin/subcategories - Create a new subcategory
  app.post('/api/admin/subcategories', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { insertSubcategorySchema } = await import('@shared/schema');
      
      const validationResult = insertSubcategorySchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: 'Validation failed', 
          errors: validationResult.error.issues
        });
      }
      
      const categoryId = validationResult.data.categoryId;
      if (!categoryId) {
        return res.status(400).json({ message: 'Category ID is required' });
      }
      
      const category = await categoryRepo.getCategory(categoryId);
      if (!category) {
        return res.status(404).json({ message: 'Parent category not found' });
      }
      
      const newSubcategory = await categoryRepo.createSubcategory(validationResult.data);
      
      await auditRepo.logResourceAudit(
        null,
        'subcategory_created',
        req.user.claims.sub,
        { subcategory: newSubcategory },
        `Created subcategory: ${newSubcategory.name} under ${category.name}`
      );
      
      res.status(201).json(newSubcategory);
    } catch (error) {
      console.error('Error creating subcategory:', error);
      
      if (error instanceof Error && error.message.includes('already exists')) {
        return res.status(409).json({ message: error.message });
      }
      
      res.status(500).json({ message: 'Failed to create subcategory' });
    }
  });
  
  // PATCH /api/admin/subcategories/:id - Update a subcategory
  app.patch('/api/admin/subcategories/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const subcategoryId = parseInt(req.params.id);
      
      if (isNaN(subcategoryId)) {
        return res.status(400).json({ message: 'Invalid subcategory ID' });
      }
      
      const { updateSubcategorySchema } = await import('@shared/schema');
      
      const validationResult = updateSubcategorySchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: 'Validation failed', 
          errors: validationResult.error.issues
        });
      }
      
      const existingSubcategory = await categoryRepo.getSubcategory(subcategoryId);
      if (!existingSubcategory) {
        return res.status(404).json({ message: 'Subcategory not found' });
      }
      
      if (validationResult.data.categoryId !== undefined && validationResult.data.categoryId !== null) {
        const category = await categoryRepo.getCategory(validationResult.data.categoryId);
        if (!category) {
          return res.status(404).json({ message: 'Parent category not found' });
        }
      }
      
      const updatedSubcategory = await categoryRepo.updateSubcategory(subcategoryId, validationResult.data);
      
      await auditRepo.logResourceAudit(
        null,
        'subcategory_updated',
        req.user.claims.sub,
        { before: existingSubcategory, after: updatedSubcategory },
        `Updated subcategory: ${existingSubcategory.name}`
      );
      
      res.json(updatedSubcategory);
    } catch (error) {
      console.error('Error updating subcategory:', error);
      res.status(500).json({ message: 'Failed to update subcategory' });
    }
  });
  
  // DELETE /api/admin/subcategories/:id - Delete a subcategory
  app.delete('/api/admin/subcategories/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const subcategoryId = parseInt(req.params.id);
      
      if (isNaN(subcategoryId)) {
        return res.status(400).json({ message: 'Invalid subcategory ID' });
      }
      
      const subcategory = await categoryRepo.getSubcategory(subcategoryId);
      if (!subcategory) {
        return res.status(404).json({ message: 'Subcategory not found' });
      }
      
      const resourceCount = await categoryRepo.getSubcategoryResourceCount(subcategory.name);
      if (resourceCount > 0) {
        return res.status(400).json({ 
          message: `Cannot delete subcategory with ${resourceCount} resources. Please reassign or delete resources first.` 
        });
      }
      
      await categoryRepo.deleteSubcategory(subcategoryId);
      
      await auditRepo.logResourceAudit(
        null,
        'subcategory_deleted',
        req.user.claims.sub,
        { subcategory },
        `Deleted subcategory: ${subcategory.name}`
      );
      
      res.json({ message: 'Subcategory deleted successfully' });
    } catch (error) {
      console.error('Error deleting subcategory:', error);
      res.status(500).json({ message: 'Failed to delete subcategory' });
    }
  });
  
  // ============= Sub-subcategory Management Routes =============
  
  // GET /api/admin/sub-subcategories - List all sub-subcategories (optionally filtered by subcategory)
  app.get('/api/admin/sub-subcategories', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const subcategoryId = req.query.subcategoryId ? parseInt(req.query.subcategoryId as string) : undefined;
      
      const subSubcategories = await categoryRepo.listSubSubcategories(subcategoryId);
      
      const subSubcategoriesWithCounts = await Promise.all(
        subSubcategories.map(async (subSub) => {
          const count = await categoryRepo.getSubSubcategoryResourceCount(subSub.name);
          return { ...subSub, resourceCount: count };
        })
      );
      
      res.json(subSubcategoriesWithCounts);
    } catch (error) {
      console.error('Error fetching sub-subcategories:', error);
      res.status(500).json({ message: 'Failed to fetch sub-subcategories' });
    }
  });
  
  // POST /api/admin/sub-subcategories - Create a new sub-subcategory
  app.post('/api/admin/sub-subcategories', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { insertSubSubcategorySchema } = await import('@shared/schema');
      
      const validationResult = insertSubSubcategorySchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: 'Validation failed', 
          errors: validationResult.error.issues
        });
      }
      
      const subcategoryId = validationResult.data.subcategoryId;
      if (!subcategoryId) {
        return res.status(400).json({ message: 'Subcategory ID is required' });
      }
      
      const subcategory = await categoryRepo.getSubcategory(subcategoryId);
      if (!subcategory) {
        return res.status(404).json({ message: 'Parent subcategory not found' });
      }
      
      const newSubSubcategory = await categoryRepo.createSubSubcategory(validationResult.data);
      
      await auditRepo.logResourceAudit(
        null,
        'sub_subcategory_created',
        req.user.claims.sub,
        { subSubcategory: newSubSubcategory },
        `Created sub-subcategory: ${newSubSubcategory.name} under ${subcategory.name}`
      );
      
      res.status(201).json(newSubSubcategory);
    } catch (error) {
      console.error('Error creating sub-subcategory:', error);
      
      if (error instanceof Error && error.message.includes('already exists')) {
        return res.status(409).json({ message: error.message });
      }
      
      res.status(500).json({ message: 'Failed to create sub-subcategory' });
    }
  });
  
  // PATCH /api/admin/sub-subcategories/:id - Update a sub-subcategory
  app.patch('/api/admin/sub-subcategories/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const subSubcategoryId = parseInt(req.params.id);
      
      if (isNaN(subSubcategoryId)) {
        return res.status(400).json({ message: 'Invalid sub-subcategory ID' });
      }
      
      const { updateSubSubcategorySchema } = await import('@shared/schema');
      
      const validationResult = updateSubSubcategorySchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: 'Validation failed', 
          errors: validationResult.error.issues
        });
      }
      
      const existingSubSubcategory = await categoryRepo.getSubSubcategory(subSubcategoryId);
      if (!existingSubSubcategory) {
        return res.status(404).json({ message: 'Sub-subcategory not found' });
      }
      
      if (validationResult.data.subcategoryId !== undefined && validationResult.data.subcategoryId !== null) {
        const subcategory = await categoryRepo.getSubcategory(validationResult.data.subcategoryId);
        if (!subcategory) {
          return res.status(404).json({ message: 'Parent subcategory not found' });
        }
      }
      
      const updatedSubSubcategory = await categoryRepo.updateSubSubcategory(subSubcategoryId, validationResult.data);
      
      await auditRepo.logResourceAudit(
        null,
        'sub_subcategory_updated',
        req.user.claims.sub,
        { before: existingSubSubcategory, after: updatedSubSubcategory },
        `Updated sub-subcategory: ${existingSubSubcategory.name}`
      );
      
      res.json(updatedSubSubcategory);
    } catch (error) {
      console.error('Error updating sub-subcategory:', error);
      res.status(500).json({ message: 'Failed to update sub-subcategory' });
    }
  });
  
  // DELETE /api/admin/sub-subcategories/:id - Delete a sub-subcategory
  app.delete('/api/admin/sub-subcategories/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const subSubcategoryId = parseInt(req.params.id);
      
      if (isNaN(subSubcategoryId)) {
        return res.status(400).json({ message: 'Invalid sub-subcategory ID' });
      }
      
      const subSubcategory = await categoryRepo.getSubSubcategory(subSubcategoryId);
      if (!subSubcategory) {
        return res.status(404).json({ message: 'Sub-subcategory not found' });
      }
      
      const resourceCount = await categoryRepo.getSubSubcategoryResourceCount(subSubcategory.name);
      if (resourceCount > 0) {
        return res.status(400).json({ 
          message: `Cannot delete sub-subcategory with ${resourceCount} resources. Please reassign or delete resources first.` 
        });
      }
      
      await categoryRepo.deleteSubSubcategory(subSubcategoryId);
      
      await auditRepo.logResourceAudit(
        null,
        'sub_subcategory_deleted',
        req.user.claims.sub,
        { subSubcategory },
        `Deleted sub-subcategory: ${subSubcategory.name}`
      );
      
      res.json({ message: 'Sub-subcategory deleted successfully' });
    } catch (error) {
      console.error('Error deleting sub-subcategory:', error);
      res.status(500).json({ message: 'Failed to delete sub-subcategory' });
    }
  });
  
  // ============= GitHub Sync Routes =============
  
  // POST /api/github/configure - Configure GitHub repository
  app.post('/api/github/configure', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { repositoryUrl, token } = req.body;
      
      if (!repositoryUrl) {
        return res.status(400).json({ message: 'Repository URL is required' });
      }
      
      const result = await syncService.configureRepository(repositoryUrl, token);
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.json(result);
    } catch (error) {
      console.error('Error configuring GitHub repository:', error);
      res.status(500).json({ message: 'Failed to configure GitHub repository' });
    }
  });
  
  // POST /api/github/import - Import resources from GitHub awesome list
  app.post('/api/github/import', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { repositoryUrl, options = {} } = req.body;
      
      if (!repositoryUrl) {
        return res.status(400).json({ message: 'Repository URL is required' });
      }
      
      // Add to queue for processing
      const queueItem = await githubSyncRepo.addToGithubSyncQueue({
        repositoryUrl,
        action: 'import',
        status: 'pending',
        resourceIds: [],
        metadata: options
      });
      
      // Process immediately in background
      syncService.importFromGitHub(repositoryUrl, options)
        .then(result => {
          console.log('GitHub import completed:', result);
        })
        .catch(error => {
          console.error('GitHub import failed:', error);
        });
      
      res.json({
        message: 'Import started',
        queueId: queueItem.id,
        status: 'processing'
      });
    } catch (error) {
      console.error('Error starting GitHub import:', error);
      res.status(500).json({ message: 'Failed to start GitHub import' });
    }
  });
  
  // POST /api/github/export - Export approved resources to GitHub
  app.post('/api/github/export', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { repositoryUrl, options = {} } = req.body;
      
      if (!repositoryUrl) {
        return res.status(400).json({ message: 'Repository URL is required' });
      }
      
      // Add to queue for processing
      const queueItem = await githubSyncRepo.addToGithubSyncQueue({
        repositoryUrl,
        action: 'export',
        status: 'pending',
        resourceIds: [],
        metadata: options
      });
      
      // Process immediately in background
      syncService.exportToGitHub(repositoryUrl, options)
        .then(result => {
          console.log('GitHub export completed:', result);
        })
        .catch(error => {
          console.error('GitHub export failed:', error);
        });
      
      res.json({
        message: 'Export started',
        queueId: queueItem.id,
        status: 'processing'
      });
    } catch (error) {
      console.error('Error starting GitHub export:', error);
      res.status(500).json({ message: 'Failed to start GitHub export' });
    }
  });
  
  // GET /api/github/sync-status - Check sync queue status
  app.get('/api/github/sync-status', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const status = req.query.status as string;
      const queueItems = await githubSyncRepo.getGithubSyncQueue(status);
      
      res.json({
        total: queueItems.length,
        items: queueItems
      });
    } catch (error) {
      console.error('Error fetching sync status:', error);
      res.status(500).json({ message: 'Failed to fetch sync status' });
    }
  });
  
  // GET /api/github/sync-status/:id - Get specific sync item status
  app.get('/api/github/sync-status/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const queueItems = await githubSyncRepo.getGithubSyncQueue();
      const item = queueItems.find(q => q.id === id);
      
      if (!item) {
        return res.status(404).json({ message: 'Sync item not found' });
      }
      
      res.json(item);
    } catch (error) {
      console.error('Error fetching sync item:', error);
      res.status(500).json({ message: 'Failed to fetch sync item' });
    }
  });
  
  // GET /api/github/sync-history - Get all sync history
  app.get('/api/github/sync-history', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const history = await githubSyncRepo.getSyncHistory();
      
      res.json(history.sort((a, b) => 
        new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
      ));
    } catch (error) {
      console.error('Error fetching sync history:', error);
      res.status(500).json({ message: 'Failed to fetch sync history' });
    }
  });
  
  // POST /api/github/process-queue - Manually trigger queue processing
  app.post('/api/github/process-queue', isAuthenticated, isAdmin, async (req, res) => {
    try {
      // Process queue in background
      syncService.processQueue()
        .then(() => {
          console.log('GitHub sync queue processing completed');
        })
        .catch(error => {
          console.error('GitHub sync queue processing failed:', error);
        });
      
      res.json({
        message: 'Queue processing started',
        status: 'processing'
      });
    } catch (error) {
      console.error('Error starting queue processing:', error);
      res.status(500).json({ message: 'Failed to start queue processing' });
    }
  });

  // ============= Awesome List Export & Validation Routes =============

  // POST /api/admin/export - Generate and download awesome list markdown
  app.post('/api/admin/export', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      // Export the public catalog (deduped, orphan-excluded) — see R3-17 note
      // on getPublicCatalogResources().
      const resources = await getPublicCatalogResources();
      
      // Get export options from request body
      // NOTE: websiteUrl is undefined by default to avoid including internal dev URLs
      // NOTE: includeLicense defaults to false because awesome-lint forbids inline license sections
      const {
        title = 'Awesome Video',
        description = 'A curated list of awesome video resources, tools, frameworks, and learning materials.',
        includeContributing = false, // References CONTRIBUTING.md which may not exist
        includeLicense = false, // awesome-lint forbids inline license sections
        websiteUrl = undefined, // Don't include dev URLs in exports
        repoUrl = process.env.GITHUB_REPO_URL
      } = req.body;

      // Create formatter with options
      const formatter = new AwesomeListFormatter(resources, {
        title,
        description,
        includeContributing,
        includeLicense,
        websiteUrl,
        repoUrl
      });

      // Generate the markdown
      const markdown = formatter.generate();
      
      // Set headers for file download
      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader('Content-Disposition', 'attachment; filename="awesome-list.md"');
      
      res.send(markdown);
    } catch (error) {
      console.error('Error generating awesome list export:', error);
      res.status(500).json({ message: 'Failed to generate awesome list export' });
    }
  });

  // GET /api/admin/export-json - Export full database as JSON for backup
  app.get('/api/admin/export-json', isAuthenticated, isAdmin, async (req, res) => {
    try {
      // Get ALL data from database (not just approved resources)
      const [
        allResources,
        categories,
        subcategories,
        subSubcategories,
        tags,
        learningJourneys,
        syncQueue,
        users
      ] = await Promise.all([
        resourceRepo.listResources({ limit: 100000 }), // Get all resources regardless of status
        categoryRepo.listCategories(),
        categoryRepo.listSubcategories(),
        categoryRepo.listSubSubcategories(),
        tagRepo.listTags(),
        learningJourneyRepo.listLearningJourneys(),
        githubSyncRepo.getGithubSyncQueue(),
        userRepo.listUsers(1, 10000)
      ]);
      
      const resources = allResources.resources;
      const usersList = users.users;

      // Get journey steps for each journey
      const journeyIds = learningJourneys.map((j: any) => j.id);
      const stepsMap = await learningJourneyRepo.listJourneyStepsBatch(journeyIds);
      
      // Attach steps to journeys
      const journeysWithSteps = learningJourneys.map((journey: any) => ({
        ...journey,
        steps: stepsMap.get(journey.id) || []
      }));

      // Build hierarchy structure
      const categoryHierarchy = categories.map((cat: any) => ({
        ...cat,
        subcategories: subcategories
          .filter((sub: any) => sub.categoryId === cat.id)
          .map((sub: any) => ({
            ...sub,
            subSubcategories: subSubcategories.filter(
              (ssub: any) => ssub.subcategoryId === sub.id
            )
          }))
      }));

      // Count resources by status
      const resourcesByStatus = resources.reduce((acc: Record<string, number>, r: any) => {
        acc[r.status || 'unknown'] = (acc[r.status || 'unknown'] || 0) + 1;
        return acc;
      }, {});
      
      // Sanitize users for export (remove sensitive data)
      const sanitizedUsers = usersList.map((u: any) => ({
        id: u.id,
        username: u.username,
        role: u.role,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt
      }));

      const exportData = {
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
        schema: {
          resources: "id, title, url, description, category, subcategory, subSubcategory, status, submittedBy, approvedBy, approvedAt, githubSynced, lastSyncedAt, metadata, createdAt, updatedAt",
          categories: "id, name, slug",
          subcategories: "id, name, slug, categoryId",
          subSubcategories: "id, name, slug, subcategoryId",
          tags: "id, name, slug",
          learningJourneys: "id, title, description, category, difficulty, estimatedHours, createdBy, createdAt, updatedAt"
        },
        stats: {
          resources: resources.length,
          resourcesByStatus,
          categories: categories.length,
          subcategories: subcategories.length,
          subSubcategories: subSubcategories.length,
          tags: tags.length,
          learningJourneys: learningJourneys.length,
          users: usersList.length,
          syncQueueItems: syncQueue.length
        },
        data: {
          resources,
          categoryHierarchy,
          tags,
          learningJourneys: journeysWithSteps,
          syncQueue,
          users: sanitizedUsers
        }
      };

      // Set headers for JSON download
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="awesome-list-backup-${new Date().toISOString().split('T')[0]}.json"`);
      
      res.json(exportData);
    } catch (error) {
      console.error('Error generating JSON export:', error);
      res.status(500).json({ message: 'Failed to generate JSON export' });
    }
  });

  // POST /api/admin/validate - Run awesome-lint validation on current data
  app.post('/api/admin/validate', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      // Validate the public catalog (deduped, orphan-excluded) — see R3-17
      // note on getPublicCatalogResources(). Counts here must equal the public
      // sidebar/categories totals.
      const resources = await getPublicCatalogResources();
      
      // Get export options from request body
      // NOTE: websiteUrl undefined to avoid including dev URLs; includeLicense false per awesome-lint
      const {
        title = 'Awesome Video',
        description = 'A curated list of awesome video resources, tools, frameworks, and learning materials.',
        includeContributing = false,
        includeLicense = false,
        websiteUrl = undefined,
        repoUrl = process.env.GITHUB_REPO_URL
      } = req.body;

      // Create formatter and generate markdown
      const formatter = new AwesomeListFormatter(resources, {
        title,
        description,
        includeContributing,
        includeLicense,
        websiteUrl,
        repoUrl
      });

      const markdown = formatter.generate();
      
      // Validate the generated markdown
      const validationResult = validateAwesomeList(markdown);
      
      // Store validation result for later retrieval
      await adminRepo.storeValidationResult({
        type: 'awesome-lint',
        result: validationResult,
        markdown,
        timestamp: new Date().toISOString()
      });
      
      // Return validation results
      res.json({
        valid: validationResult.valid,
        errors: validationResult.errors,
        warnings: validationResult.warnings,
        stats: validationResult.stats,
        report: formatValidationReport(validationResult)
      });
    } catch (error) {
      console.error('Error validating awesome list:', error);
      res.status(500).json({ message: 'Failed to validate awesome list' });
    }
  });

  // POST /api/admin/check-links - Run link checker on all resources
  app.post('/api/admin/check-links', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      // Get all approved resources
      const resources = await resourceRepo.getAllApprovedResources();
      
      // Get check options from request body
      const {
        timeout = 10000,
        concurrent = 5,
        retryCount = 1
      } = req.body;

      // Prepare resources for link checking
      const resourcesToCheck = resources.map(r => ({
        id: r.id,
        title: r.title,
        url: r.url
      }));

      // Check links
      const linkCheckReport = await checkResourceLinks(resourcesToCheck, {
        timeout,
        concurrent,
        retryCount
      });
      
      // Store link check result for later retrieval
      await adminRepo.storeValidationResult({
        type: 'link-check',
        result: linkCheckReport,
        timestamp: linkCheckReport.timestamp
      });
      
      // Return link check results
      res.json({
        totalLinks: linkCheckReport.totalLinks,
        validLinks: linkCheckReport.validLinks,
        brokenLinks: linkCheckReport.brokenLinks,
        redirects: linkCheckReport.redirects,
        errors: linkCheckReport.errors,
        summary: linkCheckReport.summary,
        report: formatLinkCheckReport(linkCheckReport),
        brokenResources: linkCheckReport.results.filter(r => !r.valid && r.status >= 400)
      });
    } catch (error) {
      console.error('Error checking links:', error);
      res.status(500).json({ message: 'Failed to check links' });
    }
  });

  // GET /api/admin/validation-status - Get last validation results
  app.get('/api/admin/validation-status', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const fn = (adminRepo as any).getLatestValidationResults;
      const validationResults = typeof fn === 'function'
        ? await fn.call(adminRepo)
        : { awesomeLint: null, linkCheck: null, lastUpdated: null };
      res.json({
        awesomeLint: validationResults?.awesomeLint ?? null,
        linkCheck: validationResults?.linkCheck ?? null,
        lastUpdated: validationResults?.lastUpdated ?? null,
      });
    } catch (error) {
      console.error('Error fetching validation status:', error);
      res.json({ awesomeLint: null, linkCheck: null, lastUpdated: null });
    }
  });

  // ============= Link Health Check Routes =============
  
  // GET /api/admin/link-health/status - Get current/latest job status
  app.get('/api/admin/link-health/status', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { linkHealthService } = await import('./services/linkHealthService');
      const job = linkHealthService.getLatestJob();
      res.json({ success: true, job: job || null });
    } catch (error) {
      console.error('Error fetching link health status:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch link health status' });
    }
  });

  // POST /api/admin/link-health/run - Start a new link health check
  app.post('/api/admin/link-health/run', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { linkHealthService } = await import('./services/linkHealthService');
      const job = await linkHealthService.startCheck();
      res.json({ success: true, job });
    } catch (error: any) {
      console.error('Error starting link health check:', error);
      if (error.message?.includes('already running')) {
        return res.status(409).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Failed to start link health check' });
    }
  });

  // GET /api/admin/link-health/history - Get job history
  app.get('/api/admin/link-health/history', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { linkHealthService } = await import('./services/linkHealthService');
      const history = linkHealthService.getJobHistory();
      res.json({ success: true, jobs: history });
    } catch (error) {
      console.error('Error fetching link health history:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch link health history' });
    }
  });

  // GET /api/admin/link-health/broken-links - Get broken links with optional filter
  app.get('/api/admin/link-health/broken-links', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { linkHealthService } = await import('./services/linkHealthService');
      const filter = req.query.status as string;
      const brokenLinks = linkHealthService.getBrokenLinks(filter);
      res.json({ success: true, checks: brokenLinks });
    } catch (error) {
      console.error('Error fetching broken links:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch broken links' });
    }
  });

  // POST /api/admin/seed-database - Manual database seeding (optional)
  // Note: Database is automatically seeded on first startup. This endpoint is for:
  // - Re-seeding after data changes
  // - Clearing and rebuilding the database
  // - Manual admin intervention when needed
  app.post('/api/admin/seed-database', isAuthenticated, isAdmin, async (req, res) => {
    try {
      console.log('Starting manual database seeding...');
      
      // Get options from request body
      const { clearExisting = false } = req.body;
      
      // Run seeding
      const result = await seedDatabase({ clearExisting });
      
      // Return results
      res.json({
        success: true,
        message: 'Database seeding completed successfully',
        counts: {
          categoriesInserted: result.categoriesInserted,
          subcategoriesInserted: result.subcategoriesInserted,
          subSubcategoriesInserted: result.subSubcategoriesInserted,
          resourcesInserted: result.resourcesInserted,
        },
        errors: result.errors,
        totalErrors: result.errors.length
      });
    } catch (error: any) {
      console.error('Error seeding database:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to seed database',
        error: error.message 
      });
    }
  });

  // POST /api/admin/import-github - Import awesome list from GitHub URL
  app.post('/api/admin/import-github', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { repoUrl, dryRun = false, strictMode = false } = req.body;
      
      if (!repoUrl) {
        return res.status(400).json({ message: 'Repository URL is required' });
      }

      console.log(`Starting GitHub import from: ${repoUrl}`);
      
      // Use the sync service to import
      const result = await syncService.importFromGitHub(repoUrl, { dryRun, strictMode });
      
      console.log(`GitHub import completed: ${result.imported} imported, ${result.updated} updated, ${result.skipped} skipped`);
      
      // If validation failed, return 400 with validation details
      if (!result.validationPassed && result.errors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Import rejected: awesome-lint validation failed',
          validationPassed: result.validationPassed,
          validationStats: result.validationStats,
          validationErrors: result.validationErrors.filter(e => e.severity === 'error'),
          validationWarnings: result.validationErrors.filter(e => e.severity === 'warning'),
          errors: result.errors
        });
      }
      
      res.json({
        success: true,
        imported: result.imported,
        updated: result.updated,
        skipped: result.skipped,
        errors: result.errors,
        warnings: result.warnings,
        validationPassed: result.validationPassed,
        validationStats: result.validationStats,
        validationErrors: result.validationErrors.filter(e => e.severity === 'error'),
        validationWarnings: result.validationErrors.filter(e => e.severity === 'warning'),
        message: `Successfully imported ${result.imported} resources from ${repoUrl}`
      });
    } catch (error: any) {
      console.error('Error importing from GitHub:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to import from GitHub',
        error: error.message 
      });
    }
  });

  // ============= Enrichment API Routes =============
  
  // POST /api/enrichment/start - Start batch enrichment job
  app.post('/api/enrichment/start', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { filter = 'unenriched', batchSize = 10 } = req.body;
      const userId = req.user?.claims?.sub;

      let agentConfig;
      try {
        agentConfig = await parseAgentConfigFromRequest(req.body);
      } catch (cfgErr: any) {
        return res.status(400).json({ success: false, message: cfgErr.message || 'Invalid agent configuration' });
      }

      const jobId = await enrichmentService.queueBatchEnrichment({
        filter,
        batchSize,
        startedBy: userId,
        model: agentConfig.model,
        baseUrl: agentConfig.baseUrl,
        authTokenEncrypted: agentConfig.authTokenEncrypted,
        authTokenLast4: agentConfig.authTokenLast4,
      });
      
      res.json({
        success: true,
        jobId,
        message: 'Batch enrichment job started successfully'
      });
    } catch (error: any) {
      console.error('Error starting enrichment job:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start enrichment job',
        error: error.message
      });
    }
  });
  
  // GET /api/enrichment/jobs - List all enrichment jobs
  app.get('/api/enrichment/jobs', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const jobs = await enrichmentRepo.listEnrichmentJobs(limit);
      
      res.json({
        success: true,
        jobs: jobs.map(stripJobAuthSecret)
      });
    } catch (error: any) {
      console.error('Error listing enrichment jobs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to list enrichment jobs',
        error: error.message
      });
    }
  });
  
  // GET /api/enrichment/jobs/:id - Get job status with progress
  app.get('/api/enrichment/jobs/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      
      if (isNaN(jobId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid job ID'
        });
      }
      
      const job = await enrichmentRepo.getEnrichmentJob(jobId);
      
      if (!job) {
        return res.json({
          success: false,
          message: 'Job not found'
        });
      }
      
      res.json({
        success: true,
        job: stripJobAuthSecret(job)
      });
    } catch (error: any) {
      console.error('Error getting job status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get job status',
        error: error.message
      });
    }
  });

  app.get('/api/enrichment/jobs/:id/events', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      if (Number.isNaN(jobId)) return res.status(400).json({ message: 'Invalid job ID' });
      const { getAgentEvents } = await import('./ai/agentEvents');
      const afterSeq = req.query.afterSeq !== undefined ? parseInt(req.query.afterSeq as string) : undefined;
      const events = await getAgentEvents('enrichment', jobId, afterSeq);
      res.json(events);
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to get agent events', error: error.message });
    }
  });
  
  // DELETE /api/enrichment/jobs/:id - Cancel a job
  app.delete('/api/enrichment/jobs/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      
      if (isNaN(jobId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid job ID'
        });
      }
      
      await enrichmentService.cancelJob(jobId);
      
      res.json({
        success: true,
        message: `Enrichment job ${jobId} cancelled successfully`
      });
    } catch (error: any) {
      console.error('Error cancelling job:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cancel job',
        error: error.message
      });
    }
  });

  // POST /api/admin/enrichment/backfill-suggestions
  // One-shot backfill: take resources that were enriched BEFORE task #59
  // (so their AI category/subcategory guesses sit only in
  // `metadata.suggestedCategory` / `suggestedSubcategory` /
  // `suggestedSubSubcategory`) and promote those guesses onto the real
  // hierarchy columns via `promoteEnrichmentSuggestions`, auto-creating any
  // implied `sub_subcategories` rows. Idempotent — safe to re-run; only
  // touches rows where a corresponding hierarchy column is still blank.
  app.post('/api/admin/enrichment/backfill-suggestions', isAuthenticated, isAdmin, async (_req, res) => {
    try {
      const { promoteEnrichmentSuggestions } = await import('./ai/promoteEnrichmentSuggestions');

      const candidates = await db.execute(sql`
        SELECT id, category, subcategory, sub_subcategory AS "subSubcategory", metadata
        FROM resources
        WHERE status = 'approved'
        AND (
          (metadata->>'suggestedCategory' IS NOT NULL AND length(trim(metadata->>'suggestedCategory')) > 0)
          OR (metadata->>'suggestedSubcategory' IS NOT NULL AND length(trim(metadata->>'suggestedSubcategory')) > 0)
          OR (metadata->>'suggestedSubSubcategory' IS NOT NULL AND length(trim(metadata->>'suggestedSubSubcategory')) > 0)
        )
        AND (
          category IS NULL OR length(trim(category)) = 0
          OR subcategory IS NULL OR length(trim(subcategory)) = 0
          OR sub_subcategory IS NULL OR length(trim(sub_subcategory)) = 0
        )
      `);

      const rows: any[] = (candidates as any).rows ?? (candidates as any);

      const subSubBefore = (await categoryRepo.listSubSubcategories()).length;

      let scanned = 0;
      let resourcesUpdated = 0;
      const updatedIds: number[] = [];
      const errors: { id: number; error: string }[] = [];

      for (const row of rows) {
        scanned++;
        try {
          const metadata = (row.metadata ?? {}) as Record<string, any>;
          const updates = await promoteEnrichmentSuggestions(
            categoryRepo,
            {
              category: row.category,
              subcategory: row.subcategory,
              subSubcategory: row.subSubcategory,
            },
            {
              category: metadata.suggestedCategory,
              subcategory: metadata.suggestedSubcategory,
              subSubcategory: metadata.suggestedSubSubcategory,
            },
          );

          if (Object.keys(updates).length > 0) {
            await resourceRepo.updateResource(row.id, updates);
            resourcesUpdated++;
            updatedIds.push(row.id);
          }
        } catch (err: any) {
          errors.push({ id: row.id, error: err?.message ?? String(err) });
        }
      }

      const subSubAfter = (await categoryRepo.listSubSubcategories()).length;
      const subSubcategoriesCreated = Math.max(0, subSubAfter - subSubBefore);

      const report = {
        scanned,
        resourcesUpdated,
        subSubcategoriesCreated,
        updatedIds,
        errors,
      };

      console.log('[backfill-suggestions] report:', JSON.stringify(report));

      res.json({
        success: true,
        message: `Backfill complete: ${resourcesUpdated}/${scanned} resources updated, ${subSubcategoriesCreated} sub_subcategories created`,
        report,
      });
    } catch (error: any) {
      console.error('Error backfilling enrichment suggestions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to backfill enrichment suggestions',
        error: error.message,
      });
    }
  });

  // ============= AI Researcher Routes =============

  app.post('/api/researcher/start', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { researchService } = await import('./ai/researchService');
      const { prompt, categoryFocus, maxBudgetUsd, maxTurns } = req.body;

      if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 10) {
        return res.status(400).json({ success: false, message: 'Prompt must be at least 10 characters' });
      }

      let agentConfig;
      try {
        agentConfig = await parseAgentConfigFromRequest(req.body);
      } catch (cfgErr: any) {
        return res.status(400).json({ success: false, message: cfgErr.message || 'Invalid agent configuration' });
      }

      const userId = req.user?.claims?.sub;
      const jobId = await researchService.startResearchJob({
        prompt: prompt.trim(),
        categoryFocus: categoryFocus || undefined,
        maxBudgetUsd: maxBudgetUsd || '1.00',
        maxTurns: maxTurns || 30,
        startedBy: userId,
        model: agentConfig.model,
        baseUrl: agentConfig.baseUrl,
        authTokenEncrypted: agentConfig.authTokenEncrypted,
        authTokenLast4: agentConfig.authTokenLast4,
      });

      res.json({ success: true, jobId, message: 'Research job started' });
    } catch (error: any) {
      console.error('Error starting research job:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to start research job' });
    }
  });

  app.get('/api/researcher/jobs', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { researchService } = await import('./ai/researchService');
      const jobs = await researchService.listJobs();
      res.json(jobs.map(stripJobAuthSecret));
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to list research jobs', error: error.message });
    }
  });

  app.get('/api/researcher/jobs/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { researchService } = await import('./ai/researchService');
      const job = await researchService.getJob(parseInt(req.params.id));
      if (!job) return res.status(404).json({ message: 'Job not found' });
      res.json({ ...stripJobAuthSecret(job), isActive: researchService.isJobActive(job.id) });
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to get job', error: error.message });
    }
  });

  app.get('/api/researcher/jobs/:id/events', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      if (Number.isNaN(jobId)) return res.status(400).json({ message: 'Invalid job ID' });
      const { getAgentEvents } = await import('./ai/agentEvents');
      const afterSeq = req.query.afterSeq !== undefined ? parseInt(req.query.afterSeq as string) : undefined;
      const events = await getAgentEvents('research', jobId, afterSeq);
      res.json(events);
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to get agent events', error: error.message });
    }
  });

  app.delete('/api/researcher/jobs/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { researchService } = await import('./ai/researchService');
      await researchService.cancelJob(parseInt(req.params.id));
      res.json({ success: true, message: 'Job cancelled' });
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to cancel job', error: error.message });
    }
  });

  app.get('/api/researcher/discoveries', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { researchService } = await import('./ai/researchService');
      const jobId = req.query.jobId ? parseInt(req.query.jobId as string) : undefined;
      const discoveries = jobId
        ? await researchService.getDiscoveries(jobId)
        : await researchService.getAllPendingDiscoveries();
      res.json(discoveries);
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to get discoveries', error: error.message });
    }
  });

  app.post('/api/researcher/discoveries/:id/approve', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { researchService } = await import('./ai/researchService');
      const discovery = await researchService.approveDiscovery(parseInt(req.params.id));
      res.json({ success: true, discovery });
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to approve discovery', error: error.message });
    }
  });

  app.post('/api/researcher/discoveries/:id/reject', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { researchService } = await import('./ai/researchService');
      const { reason } = req.body;
      const discovery = await researchService.rejectDiscovery(parseInt(req.params.id), reason);
      res.json({ success: true, discovery });
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to reject discovery', error: error.message });
    }
  });

  // ============= Database-Driven Routes =============

  // API routes for awesome list - NOW SERVED FROM DATABASE
  app.get("/api/awesome-list", async (req, res) => {
    try {
      // Use database-driven hierarchy (replaces static JSON)
      const data = await legacyRepo.getAwesomeListFromDatabase();
      
      if (!data || !data.resources || data.resources.length === 0) {
        console.warn('⚠️ No resources in database - database may need seeding');
        return res.status(500).json({ error: 'No awesome list data available' });
      }

      // Extract query parameters for filtering
      const { category, subcategory, subSubcategory } = req.query;
      
      let filteredResources = data.resources;

      // Apply filtering based on query parameters
      if (category) {
        // Convert category slug back to title for filtering
        const categoryTitle = getCategoryTitleFromSlug(category as string);
        filteredResources = filteredResources.filter((resource: any) => 
          resource.category === categoryTitle
        );
        console.log(`📁 Filtered by category "${categoryTitle}": ${filteredResources.length} resources`);
      }

      if (subcategory) {
        // Convert subcategory slug back to title for filtering
        const subcategoryTitle = getSubcategoryTitleFromSlug(subcategory as string);
        filteredResources = filteredResources.filter((resource: any) => 
          resource.subcategory === subcategoryTitle
        );
        console.log(`📂 Filtered by subcategory "${subcategoryTitle}": ${filteredResources.length} resources`);
      }

      if (subSubcategory) {
        // Convert sub-subcategory slug back to title for filtering
        const subSubcategoryTitle = getSubSubcategoryTitleFromSlug(subSubcategory as string);
        filteredResources = filteredResources.filter((resource: any) => 
          resource.subSubcategory === subSubcategoryTitle
        );
        console.log(`🎯 Filtered by sub-subcategory "${subSubcategoryTitle}": ${filteredResources.length} resources`);
      }

      // Return filtered data
      const filteredData = {
        ...data,
        resources: filteredResources
      };
      
      console.log(`📊 /api/awesome-list: ${filteredResources.length} resources, ${data.categories.length} categories`);
      res.json(filteredData);
    } catch (error) {
      console.error('Error processing awesome list:', error);
      res.status(500).json({ error: 'Failed to process awesome list' });
    }
  });

  // New endpoint to switch lists
  app.post("/api/switch-list", async (req, res) => {
    try {
      const { rawUrl } = req.body;
      
      if (!rawUrl) {
        return res.status(400).json({ error: 'Raw URL is required' });
      }
      
      console.log(`Switching to list: ${rawUrl}`);
      const data = await fetchAwesomeList(rawUrl);
      storage.setAwesomeListData(data);
      
      console.log(`Successfully switched to list with ${data.resources.length} resources`);
      res.json(data);
    } catch (error) {
      console.error('Error switching list:', error);
      res.status(500).json({ error: 'Failed to switch list' });
    }
  });

  // GitHub awesome lists discovery routes
  app.get("/api/github/awesome-lists", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const perPage = parseInt(req.query.per_page as string) || 30;
      
      const result = await fetchAwesomeLists(page, perPage);
      res.json(result);
    } catch (error) {
      console.error('Error fetching awesome lists from GitHub:', error);
      res.status(500).json({ error: 'Failed to fetch awesome lists' });
    }
  });

  app.get("/api/github/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      const page = parseInt(req.query.page as string) || 1;
      
      if (!query) {
        return res.status(400).json({ error: 'Search query is required' });
      }
      
      const result = await searchAwesomeLists(query, page);
      res.json(result);
    } catch (error) {
      console.error('Error searching awesome lists:', error);
      res.status(500).json({ error: 'Failed to search awesome lists' });
    }
  });

  // SEO routes
  app.get("/sitemap.xml", generateSitemap);
  app.get("/og-image.svg", generateOpenGraphImage);
  app.get("/og-image.png", generateOpenGraphImagePng);

  // ============= AI Recommendation Routes =============

  // GET /api/recommendations/init - Initialize recommendation engine
  app.get("/api/recommendations/init", async (req, res) => {
    try {
      res.json({ status: 'ready', message: 'Recommendation engine initialized' });
    } catch (error) {
      console.error('Error initializing recommendations:', error);
      res.status(500).json({ error: 'Failed to initialize recommendations' });
    }
  });

  // GET /api/recommendations - Get personalized recommendations
  app.get("/api/recommendations", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      
      // Create a user profile for anonymous users from query params
      const userProfile: AIUserProfile = {
        userId: 'anonymous',
        preferredCategories: (req.query.categories as string)?.split(',').filter(Boolean) || [],
        skillLevel: (req.query.skillLevel as string || 'intermediate') as 'beginner' | 'intermediate' | 'advanced',
        learningGoals: (req.query.goals as string)?.split(',').filter(Boolean) || [],
        preferredResourceTypes: (req.query.types as string)?.split(',').filter(Boolean) || [],
        timeCommitment: (req.query.timeCommitment as string || 'flexible') as 'daily' | 'weekly' | 'flexible',
        viewHistory: [],
        bookmarks: [],
        completedResources: [],
        completedJourneys: [],
        journeyProgress: [],
        ratings: {}
      };

      const result = await recommendationEngine.generateRecommendations(
        userProfile,
        limit,
        false,
        false // learning paths aren't used by this endpoint — skip the blocking AI call
      );

      res.json(result.recommendations || []);
    } catch (error) {
      console.error('Error generating recommendations:', error);
      res.status(500).json({ error: 'Failed to generate recommendations' });
    }
  });

  // POST /api/recommendations - Get personalized recommendations for authenticated users
  app.post("/api/recommendations", async (req, res) => {
    try {
      const userProfile: AIUserProfile = req.body;
      const limit = parseInt(req.query.limit as string) || 10;
      const forceRefresh = req.query.refresh === 'true';

      const result = await recommendationEngine.generateRecommendations(
        userProfile,
        limit,
        forceRefresh,
        false // learning paths aren't used by this endpoint — skip the blocking AI call
      );

      res.json(result.recommendations || []);
    } catch (error) {
      console.error('Error generating AI recommendations:', error);
      res.status(500).json({ error: 'Failed to generate recommendations' });
    }
  });

  // POST /api/recommendations/feedback - Record user feedback on recommendations
  app.post("/api/recommendations/feedback", async (req, res) => {
    try {
      const { userId, resourceId, feedback, rating } = req.body;
      
      if (!userId || !resourceId || !feedback) {
        return res.status(400).json({ error: 'userId, resourceId, and feedback are required' });
      }

      // Record the feedback
      await recommendationEngine.recordFeedback(
        userId,
        resourceId,
        feedback as 'clicked' | 'dismissed' | 'completed',
        rating
      );

      res.json({ status: 'success', message: 'Feedback recorded' });
    } catch (error) {
      console.error('Error recording recommendation feedback:', error);
      res.status(500).json({ error: 'Failed to record feedback' });
    }
  });

  // POST /api/recommendations/:resourceId/feedback - Record thumbs up/down feedback on a recommendation
  app.post("/api/recommendations/:resourceId/feedback", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const resourceId = parseInt(req.params.resourceId, 10);
      if (isNaN(resourceId)) {
        return res.status(400).json({ error: 'Invalid resource id' });
      }

      const { feedback } = req.body;
      if (feedback !== 'helpful' && feedback !== 'not_helpful') {
        return res.status(400).json({ error: "feedback must be 'helpful' or 'not_helpful'" });
      }

      await recommendationEngine.recordDetailedFeedback(userId, resourceId, feedback);

      res.json({ status: 'success', message: 'Feedback recorded' });
    } catch (error) {
      console.error('Error recording recommendation feedback:', error);
      res.status(500).json({ error: 'Failed to record feedback' });
    }
  });

  // GET /api/learning-paths/suggested - Get suggested learning paths
  app.get("/api/learning-paths/suggested", async (req, res) => {
    try {
      // Abuse hardening: these params feed real AI generation AND the result
      // cache key, so clamp their cardinality — an attacker varying them freely
      // could force endless cache misses and burn paid Claude calls.
      const rawLimit = parseInt(req.query.limit as string);
      const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 5, 1), 10);

      const skillLevels = ['beginner', 'intermediate', 'advanced'];
      const skillLevel = (skillLevels.includes(req.query.skillLevel as string)
        ? req.query.skillLevel : 'intermediate') as 'beginner' | 'intermediate' | 'advanced';

      const timeCommitments = ['daily', 'weekly', 'flexible'];
      const timeCommitment = (timeCommitments.includes(req.query.timeCommitment as string)
        ? req.query.timeCommitment : 'flexible') as 'daily' | 'weekly' | 'flexible';

      // Only accept categories that actually exist in the taxonomy.
      const requestedCategories = ((req.query.categories as string)?.split(',') || [])
        .map((c) => c.trim())
        .filter(Boolean)
        .slice(0, 10);
      let preferredCategories: string[] = [];
      if (requestedCategories.length > 0) {
        const known = new Set((await categoryRepo.listCategories()).map((c) => c.name));
        preferredCategories = requestedCategories.filter((c) => known.has(c));
      }

      const learningGoals = ((req.query.goals as string)?.split(',') || [])
        .map((g) => g.trim())
        .filter(Boolean)
        .slice(0, 5)
        .map((g) => g.slice(0, 100));

      // Create a basic user profile from the sanitized query params
      const userProfile: AIUserProfile = {
        userId: req.query.userId as string || 'anonymous',
        preferredCategories,
        skillLevel,
        learningGoals,
        preferredResourceTypes: [],
        timeCommitment,
        viewHistory: [],
        bookmarks: [],
        completedResources: [],
        completedJourneys: [],
        journeyProgress: [],
        ratings: {}
      };

      const paths = await learningPathGenerator.getSuggestedPaths(userProfile, limit);
      
      res.json(paths);
    } catch (error) {
      console.error('Error generating suggested learning paths:', error);
      res.status(500).json({ error: 'Failed to generate suggested learning paths' });
    }
  });

  // POST /api/learning-paths/generate - Generate custom learning path
  app.post("/api/learning-paths/generate", async (req, res) => {
    try {
      const { userProfile, category, customGoals } = req.body;
      
      if (!userProfile) {
        return res.status(400).json({ error: 'User profile is required' });
      }

      const path = await learningPathGenerator.generateLearningPath(
        userProfile,
        category,
        customGoals
      );

      res.json(path);
    } catch (error) {
      console.error('Error generating custom learning path:', error);
      res.status(500).json({ error: 'Failed to generate custom learning path' });
    }
  });

  // POST /api/learning-paths - Legacy route for compatibility
  app.post("/api/learning-paths", async (req, res) => {
    try {
      const userProfile: AIUserProfile = req.body;
      const rawLimit = parseInt(req.query.limit as string);
      const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 5, 1), 10);

      const paths = await learningPathGenerator.getSuggestedPaths(userProfile, limit);
      
      res.json(paths);
    } catch (error) {
      console.error('Error generating AI learning paths:', error);
      res.status(500).json({ error: 'Failed to generate learning paths' });
    }
  });

  // Track user interaction for improving recommendations
  app.post("/api/interactions", async (req, res) => {
    try {
      const { userId, resourceId, interactionType, interactionValue, metadata } = req.body;
      
      // Store interaction data (in a real app, this would go to database)
      // For now, we'll just acknowledge the interaction
      console.log(`User interaction: ${userId} ${interactionType} ${resourceId}`);
      
      res.json({ status: "recorded" });
    } catch (error) {
      console.error('Error recording interaction:', error);
      res.status(500).json({ error: 'Failed to record interaction' });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // AI service health check (documented in docs/AI-SERVICES.md).
  // Cheap by default: reports availability + cache stats without spending an
  // API call. Pass ?deep=1 to run a real round-trip test against Claude
  // (costs one tiny API call — don't point automated monitors at deep mode).
  app.get("/api/health/ai", async (req, res) => {
    try {
      const stats = claudeService.getStats();
      const deep = req.query.deep === '1' || req.query.deep === 'true';

      if (!deep) {
        return res.json({
          status: stats.available ? 'healthy' : 'unavailable',
          ...stats,
        });
      }

      const isConnected = await claudeService.testConnection();
      res.json({
        status: isConnected ? 'healthy' : 'unavailable',
        connectionOk: isConnected,
        ...stats,
      });
    } catch (error) {
      console.error('Error checking AI health:', error);
      res.status(500).json({ status: 'error', error: 'Failed to check AI service health' });
    }
  });

  // Public developer API (read-only, rate-limited) + API-key identity endpoint.
  // Registered here so its concrete /api/public/* routes are matched before the
  // catch-all 404 below.
  registerPublicApiRoutes(app);

  // JSON 404 fallback for unmatched /api/* routes.
  // Must be registered after all other /api/* handlers so it only catches
  // requests that no real route handled. Without this, unknown /api paths
  // would fall through to Vite's HTML catch-all and return a 200 with the
  // React app's HTML, masking client routing typos.
  app.use('/api', (req, res) => {
    res.status(404).json({ message: 'Not found' });
  });

  const httpServer = createServer(app);
  return httpServer;
}

/**
 * Run background initialization tasks AFTER the server has started listening.
 * This ensures fast startup for production deployments.
 * These tasks are non-blocking and run in the background.
 * 
 * NOTE: /api/awesome-list now serves data from the PostgreSQL database
 * directly via legacyRepo.getAwesomeListFromDatabase(). No static JSON loading required.
 */
// Helper to retry database operations with exponential backoff (for Neon cold starts)
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 2000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      const isRetryable = error.message?.includes('too many clients') ||
                          error.message?.includes('connection') ||
                          error.message?.includes('ECONNREFUSED');
      if (attempt === maxRetries || !isRetryable) {
        throw error;
      }
      console.log(`⏳ Database operation failed (attempt ${attempt}/${maxRetries}), retrying in ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      delayMs *= 2; // Exponential backoff
    }
  }
  throw new Error('Retry logic failed unexpectedly');
}

export async function runBackgroundInitialization(): Promise<void> {
  const isProduction = process.env.NODE_ENV === 'production';

  console.log(`🔄 Running background initialization (${isProduction ? 'production' : 'development'} mode)...`);
  console.log('📊 Note: /api/awesome-list now serves from PostgreSQL database');

  // Orphan-job watchdog: any enrichment_jobs / github_sync_queue stuck in
  // 'pending' or 'processing' for more than 5 minutes were almost certainly
  // killed by the last server restart. Mark them failed so the admin UIs
  // (Enrichment, GitHub) don't show fictitious "processing" forever.
  try {
    const { runOrphanWatchdogStartup } = await import('./jobs/orphanJobWatchdog');
    await runOrphanWatchdogStartup();
  } catch (err) {
    console.error('Failed to import/run orphan watchdog (non-fatal):', err);
  }

  // Both dev and production: Check and seed database if needed
  // This ensures data consistency across environments
  try {
    console.log('Checking if database needs seeding...');

    // Use retry logic for initial database check (handles Neon cold starts)
    const categories = await withRetry(() => categoryRepo.listCategories());
    const actualResourceCount = await withRetry(() => resourceRepo.getResourceCount());

    // Only reseed if database is truly empty (both categories AND resources missing)
    // Don't reseed just because user added/removed items - preserve user changes
    const needsReseeding = (categories.length === 0 && actualResourceCount === 0);

    if (needsReseeding) {
      console.log(`📦 Database needs seeding (categories: ${categories.length}, resources: ${actualResourceCount})...`);
      console.log(`⚙️  Running database seeding in ${isProduction ? 'production' : 'development'} mode...`);
      const seedResult = await seedDatabase({ clearExisting: actualResourceCount > 0 ? true : false });

      console.log('✅ Auto-seeding completed successfully:');
      console.log(`   - Categories: ${seedResult.categoriesInserted}`);
      console.log(`   - Subcategories: ${seedResult.subcategoriesInserted}`);
      console.log(`   - Sub-subcategories: ${seedResult.subSubcategoriesInserted}`);
      console.log(`   - Resources: ${seedResult.resourcesInserted}`);

      if (seedResult.errors.length > 0) {
        console.warn(`⚠️  Seeding completed with ${seedResult.errors.length} errors`);
      }
    } else {
      console.log(`✓ Database already populated: ${categories.length} categories, ${actualResourceCount} resources`);
    }
  } catch (error) {
    console.error('❌ Error during auto-seeding (non-fatal):', error);
    console.log('Server will continue without seeding. You can manually seed via /api/admin/seed-database');
  }

  // Warm the anonymous suggested-learning-paths cache in the background so the
  // first visitor after a restart doesn't wait ~45s of sequential AI calls.
  // Fire-and-forget: failures are non-fatal (the request path falls back to
  // on-demand generation with in-flight dedup).
  learningPathGenerator.warmDefaultSuggestedPaths().catch((error) => {
    console.error('Suggested-paths cache warm-up failed (non-fatal):', error);
  });

  console.log('✅ Background initialization complete');
}