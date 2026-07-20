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
import { hashPassword, comparePassword, validateEmail, validateNewPassword } from "./passwordUtils";
import { checkLock, recordFailure, clearOnSuccess, allowResetRequest } from "./loginLockout";
import { sendPasswordResetEmail } from "./email";
import crypto from "crypto";
import passport from "passport";
import { fetchAwesomeList } from "./parser";
import { fetchAwesomeVideoData } from "./awesome-video-parser-clean";
import { RecommendationEngine, UserProfile } from "./recommendation-engine";
import { fetchAwesomeLists, searchAwesomeLists } from "./github-api";
import { insertResourceSchema, EDITABLE_RESOURCE_FIELDS, insertJourneyStepSchema, insertLearningJourneySchema, passwordResetTokens, type Resource } from "@shared/schema";
import {
  HTTPS_URL_RE,
  WEB_URL_RE,
  isPlausiblePublicUrl,
  URL_HOSTNAME_MESSAGE,
  httpsUrlSchema,
  webUrlSchema,
  resourceTitleSchema,
  resourceDescriptionSchema,
  tagSchema,
  displayNameSchema,
  DISPLAY_NAME_MAX,
  TAG_MAX_LENGTH,
  NO_HTML_RE,
  stripInvisible,
  hasVisibleChars,
  visibleLength,
  journeyTitleSchema,
  journeyDescriptionSchema,
  SINGLE_LINE_CONTROL_RE,
  MULTILINE_CONTROL_RE,
  BIDI_CONTROL_RE,
  BIDI_CONTROL_MESSAGE,
  parseIntInRange,
} from "@shared/validation";
import { sanitizeUser, parseBoundedInt, PG_INT_MAX } from "./validation/inputs";
import { swaggerSpec } from "./openapi";
import { ensureSubSubcategoryExists } from "./repositories/ensureSubSubcategory";
import { z } from "zod";
import { syncService } from "./github/syncService";
import { ensureMinDescription } from "./github/importHygiene";
import { recommendationEngine, UserProfile as AIUserProfile } from "./ai/recommendationEngine";
import { buildRelatedResources } from "./services/relatedResources";
import { stripInternalResourceFields } from "./lib/publicResource";
import { buildCanonicalTagMap, canonicalizeTagArray } from "./lib/tagCanonicalize";
import { registerPublicApiRoutes } from "./api/public";
import { learningPathGenerator } from "./ai/learningPathGenerator";
import { claudeService } from "./ai/claudeService";
import { AwesomeListFormatter } from "./github/formatter";
import { validateAwesomeList, formatValidationReport } from "./validation/awesomeLint";
import { checkResourceLinks, formatLinkCheckReport } from "./validation/linkChecker";
import { seedDatabase, syncAdminPasswordFromEnv } from "./seed";
import { enrichmentService } from "./ai/enrichmentService";
import { parseAgentConfigFromRequest, stripJobAuthSecret } from "./ai/agentRuntime";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { SITE_URL, resolveOgImageMeta } from "./og-middleware";

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
// Run16 BUG-001 (CRITICAL): z.string().url() accepts ANY scheme (javascript:,
// ftp:, data:, http:) while the UI promises "Must be a valid HTTPS URL".
// One shared guard for every write surface that accepts a resource URL:
// - new resources (public submit + admin create) must be https://
// - updates/edit-suggestions may keep legacy http:// but never a non-web scheme
// Run21 R4-016: the URL/title/description validators now live in
// @shared/validation (ONE module mounted on every write path — public submit,
// suggest-edit, admin create/edit — and reused by the client forms).

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function generateSitemap(_req: any, res: any) {
  const baseUrl = SITE_URL.replace(/\/+$/, "");
  const urls: string[] = [];

  // Run3 audit R3-05: sub-subcategory slugs are shared across parents (e.g.
  // "ffmpeg" appears under several subcategories), so the tree walk below can
  // visit the same public URL many times. Every <loc> must appear exactly once.
  const seenLocs = new Set<string>();

  // R-12 (run23, supersedes Run16 BUG-095 + Run22 BUG-045/046): <lastmod> is
  // now OMITTED for EVERY sitemap URL. History: Run16 replaced the hardcoded
  // "today" stamp with per-resource updated_at; Run22 filtered per-second
  // bulk-write bursts. The residual audit still found the surviving dates
  // batch-clustered (419 dated URLs sharing only 8 distinct dates — 234 on a
  // single day from mass enrichment passes), i.e. updated_at is a bookkeeping
  // artifact for most of the corpus, not a content-change signal. The audit
  // acceptance offers "real per-URL dates or omit for ALL"; since genuinely
  // real per-URL dates do not exist for this corpus, the honest, uniform
  // policy is omission everywhere — a lastmod-free sitemap is fully valid and
  // crawlers distrust inconsistent lastmod anyway. Do NOT reintroduce dates
  // unless a true content-change signal (not bulk-script stamping) exists.
  const addUrl = (path: string, changefreq: string, priority: string) => {
    if (seenLocs.has(path)) return;
    seenLocs.add(path);
    urls.push(`  <url>
    <loc>${xmlEscape(baseUrl + path)}</loc>
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
  // BUG-019 (run13): legal pages are indexable → must be in the sitemap
  // (indexable set stays equal to the sitemap).
  addUrl('/terms', 'yearly', '0.3');
  addUrl('/privacy', 'yearly', '0.3');

  // Category taxonomy + every approved resource detail page.
  try {
    const awesomeListData = await legacyRepo.getAwesomeListFromDatabase();

    const resourceIdsOf = (node: any): number[] =>
      (node?.resources ?? []).map((r: any) => Number(r.id)).filter((n: number) => Number.isFinite(n));

    awesomeListData?.categories?.forEach(category => {
      addUrl(`/category/${category.slug}`, 'weekly', '0.7');
      category.subcategories?.forEach(subcategory => {
        addUrl(`/subcategory/${subcategory.slug}`, 'weekly', '0.6');
        subcategory.subSubcategories?.forEach(subSubcategory => {
          // BUG-053 (run14): an empty sub-subcategory renders "No resources
          // found" and has no inbound link from its parent page — keep such
          // orphans OUT of the sitemap (sitemap set == reachable content set).
          if (resourceIdsOf(subSubcategory).length === 0) return;
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
      // R-12 (run23): lastmod omitted here too — ONE uniform no-lastmod
      // policy for the entire sitemap (see the R-12 comment above).
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
function buildOgSvg(pageTitle: string, category: string | undefined, count: string, kicker?: string): string {
  const truncate = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
  const xmlEscape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // R4-024: instead of hard-truncating at 38 chars, auto-fit the title —
  // wrap on word boundaries and step the font size down (78 → 60 → 46px)
  // until the full title fits; only ellipsize past 3 lines at the smallest
  // size.
  // Run22 BUG-013: the original wrap used optimistic chars-per-line budgets
  // (26 chars @ 78px ≈ 1250px rendered), so long titles overflowed the card's
  // right edge — sharp/librsvg rasterizes with a wide bold fallback face, not
  // Inter. Wrap by ESTIMATED PIXEL WIDTH against the real safe area instead:
  // title x=104, card inner right edge x=1144, right padding 48 → 992px.
  const TITLE_MAX_W = 992;
  // Per-char advance in em, calibrated generously for DejaVu-Sans-Bold-class
  // fallbacks (wider than Inter) so estimates err toward wrapping early.
  const charEm = (ch: string): number => {
    if (/[ijl.,:;'!|()\[\]\s`]/.test(ch)) return 0.34;
    if (/[ftrI\-"]/.test(ch)) return 0.45;
    if (/[WMmw@%]/.test(ch)) return 0.98;
    if (/[A-HJ-VX-Z0-9&#=+~<>?$]/.test(ch)) return 0.76;
    return 0.62; // remaining lowercase + everything else
  };
  const estWidth = (s: string, fontSize: number): number => {
    let em = 0;
    for (const ch of s) em += charEm(ch);
    return em * fontSize;
  };
  const wrapWords = (s: string, fontSize: number): string[] => {
    const maxW = TITLE_MAX_W;
    const words = s.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let cur = '';
    for (let w of words) {
      // Hyphen-split single words wider than a whole line (URLs, long specs).
      while (estWidth(w, fontSize) > maxW) {
        if (cur) { lines.push(cur); cur = ''; }
        let head = w.length - 1;
        while (head > 1 && estWidth(w.slice(0, head) + '-', fontSize) > maxW) head--;
        lines.push(w.slice(0, head) + '-');
        w = w.slice(head);
      }
      if (!cur) cur = w;
      else if (estWidth(cur + ' ' + w, fontSize) <= maxW) cur += ' ' + w;
      else { lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);
    return lines.length ? lines : [''];
  };
  const fitTitle = (t: string): { lines: string[]; fontSize: number; letterSpacing: number } => {
    const budgets = [
      { size: 78, max: 2, ls: -2 },
      { size: 60, max: 2, ls: -1.5 },
      { size: 46, max: 3, ls: -1 },
    ];
    for (const b of budgets) {
      const lines = wrapWords(t, b.size);
      if (lines.length <= b.max) return { lines, fontSize: b.size, letterSpacing: b.ls };
    }
    // Still too long at the smallest size: keep the first `max` lines and
    // ellipsize the last one at a word boundary that fits the pixel budget.
    const last = budgets[budgets.length - 1];
    const lines = wrapWords(t, last.size).slice(0, last.max);
    let tail = lines[last.max - 1];
    while (tail && estWidth(tail + '…', last.size) > TITLE_MAX_W) {
      const cut = tail.lastIndexOf(' ');
      tail = cut > 0 ? tail.slice(0, cut) : tail.slice(0, -1);
    }
    lines[last.max - 1] = tail + '…';
    return { lines, fontSize: last.size, letterSpacing: last.ls };
  };

  const fit = fitTitle((pageTitle || 'Awesome Video').trim() || 'Awesome Video');
  const lineHeight = Math.round(fit.fontSize * 1.16);
  const titleFirstY = 178 + Math.round(fit.fontSize * 1.13);
  const titleLastY = titleFirstY + (fit.lines.length - 1) * lineHeight;
  const subtitleY = titleLastY + Math.max(52, Math.round(fit.fontSize * 0.85));
  const titleTspans = fit.lines
    .map((ln, i) => `<tspan x="104" ${i === 0 ? `y="${titleFirstY}"` : `dy="${lineHeight}"`}>${xmlEscape(ln)}</tspan>`)
    .join('');

  const subtitle = xmlEscape(category ? truncate(category, 44) : 'Curated video development resources');
  // Run22 BUG-027: the kicker names the page's real context (a resource's
  // actual category, or the taxonomy level) instead of always "Category".
  const eyebrow = `${truncate(kicker || category || 'Index', 36)} · Awesome Video`;
  const statRaw = `${count} resources`;
  const stat = xmlEscape(statRaw);
  // R5-055: pill width = estimated text width (charEm table errs wide) +
  // 0.5px letter-spacing per gap + symmetric 24px padding each side.
  const statPillW = Math.ceil(
    estWidth(statRaw, 18) + Math.max(0, statRaw.length - 1) * 0.5 + 48,
  );

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

  <!-- Primary title: Inter bold, warm off-white; auto-fit multi-line -->
  <text font-family="'Inter','Helvetica Neue',sans-serif"
        font-size="${fit.fontSize}" font-weight="800" fill="#f4f3ee"
        letter-spacing="${fit.letterSpacing}">${titleTspans}</text>

  <!-- Secondary line: Fraunces italic accent (matches About/Home hero) -->
  <text x="104" y="${subtitleY}" font-family="'Fraunces','Times New Roman',serif"
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

  <!-- Resource count chip on the right (matches DS .chip surface).
       R5-055: the pill was a FIXED 160px while "2283+ resources" renders
       ~175px at 18px bold — the centered text underflowed the left border.
       Size the pill from the estimated text width (+ letter-spacing) with
       symmetric 24px padding and keep its right edge anchored at x=1096
       (card inner right 1144 − 48 padding). -->
  <g transform="translate(${1096 - statPillW}, 478)">
    <rect x="0" y="0" width="${statPillW}" height="56" rx="10"
          fill="rgba(255,61,82,0.08)" stroke="#ff3d52" stroke-width="1" />
    <text x="${Math.round(statPillW / 2)}" y="35" font-family="'Inter','Helvetica Neue',sans-serif"
          font-size="18" font-weight="700" fill="#ff3d52"
          text-anchor="middle" letter-spacing="0.5">${stat}</text>
  </g>
</svg>`;
}

type OgParams =
  | { ok: true; pageTitle: string; category?: string; kicker?: string; count: string }
  | { ok: false; status: number; message: string };

async function resolveOgParams(req: any): Promise<OgParams> {
  // T007: the card text is resolved SERVER-SIDE from the route path. Legacy
  // caller-supplied ?title=/?category=/?resourceCount= text params are ignored
  // (those URLs render the brand default card), so attacker text can never be
  // painted onto an awesome.video-branded image.
  const rawPath = (req.query as Record<string, unknown>).path;
  let pageTitle = 'Awesome Video';
  let category: string | undefined;
  let kicker: string | undefined;
  if (rawPath !== undefined) {
    if (
      typeof rawPath !== 'string' ||
      !rawPath.startsWith('/') ||
      rawPath.length > 512 ||
      /[\u0000-\u001f\u007f]/.test(rawPath)
    ) {
      return { ok: false, status: 400, message: 'Invalid path parameter' };
    }
    const meta = await resolveOgImageMeta(rawPath.split('?')[0]);
    if (meta) {
      pageTitle = meta.pageTitle;
      category = meta.category;
      kicker = meta.kicker;
    }
  }
  let count = '2000+';
  try {
    const data = await legacyRepo.getAwesomeListFromDatabase();
    count = `${data?.resources?.length ?? 2000}+`;
  } catch {}
  return { ok: true, pageTitle, category, kicker, count };
}

async function generateOpenGraphImage(req: any, res: any) {
  try {
    const params = await resolveOgParams(req);
    if (!params.ok) return res.status(params.status).send(params.message);
    const svg = buildOgSvg(params.pageTitle, params.category, params.count, params.kicker);
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
    const params = await resolveOgParams(req);
    if (!params.ok) return res.status(params.status).send(params.message);
    const svg = buildOgSvg(params.pageTitle, params.category, params.count, params.kicker);
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
    'intro-learning': 'Intro & Learning', // BUG-025: match DB-canonical name
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

  // R4-031 (run24): express-rate-limit stores are per-process, and production
  // autoscale runs up to MAX_LIMITER_INSTANCES concurrent instances — a
  // client whose requests spread across instances sees an effective limit of
  // (per-instance limit × instance count). The R4 probe (490-request burst →
  // zero 429s) proved the old numbers could never fire under fan-out. For the
  // expensive clusters (auth brute-force, paid AI) the per-instance limit is
  // now ceil(intended_global / MAX_LIMITER_INSTANCES), so the worst-case
  // effective limit stays within the intended global budget. Cheap read
  // surfaces (resource reads, the 300/min backstop) intentionally keep their
  // generous per-instance numbers — over-throttling real browsing is worse
  // than the residual scrape risk there.
  const MAX_LIMITER_INSTANCES = 3;
  const perInstanceLimit = (intendedGlobal: number) =>
    Math.max(1, Math.ceil(intendedGlobal / MAX_LIMITER_INSTANCES));

  // BUG-008 (run10): IP-based rate limiting across the auth cluster.
  // Complements the existing per-account cooldown (checkLock) which only
  // throttles a single email — this caps anonymous credential-stuffing and
  // register/forgot-password abuse per client IP.
  // Intended global budget: 20 attempts / 15 min / IP.
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: perInstanceLimit(20), // 7/instance ⇒ ≤21 effective at 3 instances
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many attempts. Please try again later." },
  });

  // BUG-008 (run11): strict per-minute burst limiter on login only —
  // 429 + Retry-After. Layered under the 15-minute cluster limiter and the
  // per-account cooldown (checkLock).
  // Intended global budget: 5 attempts / min / IP.
  const loginBurstLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: perInstanceLimit(5), // 2/instance ⇒ ≤6 effective at 3 instances
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many login attempts. Please try again in a minute." },
  });

  // NEW-051 (run11): public resource-read rate limit — 100 requests per IP
  // per minute across the public GET resource surfaces, 429 + Retry-After.
  // Generous enough for real browsing (a page load issues a handful of calls);
  // caps scraping/abuse.
  const resourceReadLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many requests. Please slow down and try again shortly." },
  });

  // NB-002 (run23): AI-generation endpoints run paid Claude calls (~15-45s
  // each on a cache miss). Cap them hard per IP so nobody can burn tokens in
  // a loop — legitimate use is a handful of requests per session.
  // R4-031: intended global budget 10 req / 15 min / IP (see arithmetic above).
  const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: perInstanceLimit(10), // 4/instance ⇒ ≤12 effective at 3 instances
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many AI requests. Please try again in a few minutes." },
  });

  // NB-051 (run23): TRACE/TRACK are already answered 405 + Allow by the
  // BUG-v3-L02 unsupported-method guard in server/index.ts (registered before
  // any route). In production the hosting edge intercepts TRACE even earlier
  // (Google-branded 405 — platform behavior, not app-controllable).

  // NB-026 (run23): default-deny rate-limit backstop — every /api endpoint
  // registered from here on is throttled even when it has no surface-specific
  // limiter (journeys, categories, recommendations, telemetry, …). Specific
  // limiters keep layering on top (both count; the later, stricter limiter's
  // RateLimit-* headers win). 300 req/min/IP is far above real browsing (a
  // page load issues ~5 API calls) but caps unbounded scraping/abuse.
  const apiBackstopLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many requests. Please slow down and try again shortly." },
  });
  app.use('/api', apiBackstopLimiter);

  // Local authentication routes
  app.post("/api/auth/local/login", loginBurstLimiter, authLimiter, (req, res, next) => {
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
        // Run16 BUG-042: security-relevant auth events now hit the audit trail.
        // performedBy stays null — the attempted email may not map to any user
        // (FK to users.id), so the identity attempted lives in `changes`.
        auditRepo.logResourceAudit(null, 'auth.login_failed', undefined, { email: loginEmail }, 'Local login failed')
          .catch((e) => console.error('[audit] login_failed log error:', e));
        // NB-050 (run23): ONE generic 401 string on every login-failure path —
        // the old fallback "Invalid credentials" differed from the strategy's
        // "Invalid email or password", a distinguishable pair.
        return res.status(401).json({ message: info?.message || "Invalid email or password" });
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

          // Run16 BUG-042: record successful logins in the audit trail.
          auditRepo.logResourceAudit(null, 'auth.login', user.claims.sub, { email: user.claims.email }, 'Local login success')
            .catch((e) => console.error('[audit] login log error:', e));

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
      const { email: rawEmail, password } = req.body ?? {};

      if (typeof rawEmail !== "string" || typeof password !== "string") {
        return res.status(400).json({ message: "Email and password are required" });
      }
      // Run15 BUG-001: emails are one logical identity regardless of case.
      // Store lowercase so QATEST+CASE1@x.com and qatest+case1@x.com can never
      // become two accounts (getUserByEmail is case-insensitive to match).
      const email = rawEmail.trim().toLowerCase();
      if (!validateEmail(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }
      const pwCheck = validateNewPassword(password);
      if (!pwCheck.valid) {
        return res.status(400).json({ message: pwCheck.error || "Invalid password" });
      }

      const existing = await userRepo.getUserByEmail(email);
      if (existing) {
        // NB-048 (run23): the explicit 409 "already exists" was an
        // account-enumeration oracle (login/forgot-password are generic, so
        // register was the one path that confirmed an email). Burn a hash for
        // timing parity with the success path and answer generically. Note:
        // without an email-verification flow the 201-vs-400 status itself
        // remains a weak oracle; the message no longer confirms anything.
        await hashPassword(password);
        return res.status(400).json({
          message:
            "Unable to create an account with these details. If you already have an account, sign in or reset your password.",
        });
      }

      const hashed = await hashPassword(password);
      // BUG-009 (run19): the register UI promises "your display name starts as
      // the part before the @" (Run17 BUG-040 hint) but nothing ever stored it,
      // so every local account had name NULL and the admin Users table showed
      // an unidentifiable wall of "—". Derive it here so the promise is true.
      // Run21 R4-050: ONE display-name cap everywhere (register derivation,
      // profile editor, admin name endpoint) — DISPLAY_NAME_MAX from the
      // shared validation module, so a derived name can always be re-saved.
      const derivedFirstName = stripInvisible(email.split("@")[0]).slice(0, DISPLAY_NAME_MAX);
      const created = await userRepo.upsertUser({ email, password: hashed, role: "user", firstName: derivedFirstName });

      // Run16 BUG-042: record account creation in the audit trail.
      auditRepo.logResourceAudit(null, 'auth.register', created.id, { email: created.email }, 'Local account created')
        .catch((e) => console.error('[audit] register log error:', e));

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

      const pwCheck = validateNewPassword(newPassword);
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
        // Run22 BUG-038: join whichever name parts exist — the old
        // `firstName && lastName` ternary dropped lastName entirely when
        // firstName was cleared (showed the email prefix instead of "User").
        name: [dbUser.firstName, dbUser.lastName].filter(Boolean).join(' ')
          || dbUser.email?.split('@')[0] || 'User',
        avatar: dbUser.profileImageUrl,
        role: dbUser.role,
        createdAt: dbUser.createdAt,
        // Run22 BUG-020: lets the Profile page show a pending private
        // deletion request without an extra round-trip.
        deletionRequestedAt: dbUser.deletionRequestedAt ?? null,
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
      // NB-023 (run23): /api/auth/user is the ONE canonical identity endpoint
      // (200 + { user, isAuthenticated } always, so the SPA can boot
      // anonymously). This REST-style alias stays for API consumers but is
      // formally deprecated to stop the three-contracts drift.
      res.setHeader('Deprecation', 'true');
      res.setHeader('Link', '</api/auth/user>; rel="successor-version"');
      // BUG-051 (run14): canonical 401 body everywhere is
      // { message: "Unauthorized" } — matches isAuthenticated middleware.
      if (!req.isAuthenticated?.() || !req.user?.claims?.sub) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      let dbUser = req.user.dbUser;
      if (!dbUser) {
        dbUser = await userRepo.getUser(req.user.claims.sub);
      }
      if (!dbUser) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      res.json({
        id: dbUser.id,
        email: dbUser.email,
        // Run22 BUG-038: same fix as /api/auth/user — never drop lastName.
        name: [dbUser.firstName, dbUser.lastName].filter(Boolean).join(' ')
          || dbUser.email?.split('@')[0] || 'User',
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
      // Run16 BUG-042: capture identity BEFORE logout/destroy wipes req.user.
      const logoutUserId: string | undefined = req.user?.claims?.sub;
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
          if (logoutUserId) {
            auditRepo.logResourceAudit(null, 'auth.logout', logoutUserId, undefined, 'Logout')
              .catch((e) => console.error('[audit] logout log error:', e));
          }
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
    // NB-023 (run23): deprecated alias — see /api/auth/user (canonical).
    res.setHeader('Deprecation', 'true');
    res.setHeader('Link', '</api/auth/user>; rel="successor-version"');
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

  // NEW-019 / BUG-027 (run13): public resource serializer. Strips internal
  // fields from any resource returned on a public endpoint: `searchTsv`,
  // moderation/audit columns (submittedBy, approvedBy), GitHub sync-pipeline
  // state (githubSynced, lastSyncedAt), and enrichment-pipeline internals in
  // metadata (source, confidence, discoveryId, researchJobId,
  // enrichmentError). `status` stays (client soft-404/pending views key off
  // it); admin surfaces read the unstripped rows via /api/admin/* routes.
  const toPublicResource = <T extends Record<string, any>>(r: T) =>
    stripInternalResourceFields(r);

  // BUG-v3-M07 (run12): duplicated query params (?q=a&q=b) arrive as arrays,
  // and `(array as string).replace(...)` threw → 500. Coerce every scalar
  // query param through this helper: first value wins, non-strings drop to
  // undefined (e.g. the qs "?q[a]=b" object form).
  const firstQueryValue = (v: unknown): string | undefined => {
    if (Array.isArray(v)) v = v[0];
    return typeof v === 'string' ? v : undefined;
  };

  // GET /api/resources - List approved resources (public)
  app.get('/api/resources', resourceReadLimiter, async (req, res) => {
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
      const rawCursor = firstQueryValue(req.query.cursor);
      const rawOffset = firstQueryValue(req.query.offset) ?? rawCursor;
      const rawLimit = firstQueryValue(req.query.limit);
      const rawPage = firstQueryValue(req.query.page);
      // Run16 BUG-090: ONE consistent pagination contract — non-numeric values
      // are 400 (invalid_offset / invalid_limit / invalid_page), every numeric
      // out-of-range value is CLAMPED into range (page<1→1, limit→[1,100],
      // offset<0→0). Previously page=-5 errored while page=0 clamped, and
      // limit=0 silently became the default 20 while limit=-1 became 1.
      // Run16 BUG-091: error bodies carry `message` alongside the machine code.
      // NB-019 (run23): strict integer forms + hard bounds. "1e20" passed the
      // old isNaN() check and then parseInt silently read it as 1; all-digit
      // values past Number.MAX_SAFE_INTEGER / PG int4 range overflowed inside
      // PG (offset → 500) or produced absurd page metadata (page=1e18).
      // Non-integer forms and out-of-bound magnitudes are caller bugs → 400.
      const INT_RE = /^-?\d+$/;
      const outOfBounds = (s: string) =>
        !INT_RE.test(s) || !Number.isSafeInteger(Number(s)) || Math.abs(Number(s)) > PG_INT_MAX;
      if (rawOffset !== undefined && outOfBounds(String(rawOffset).trim())) {
        return res.status(400).json({ error: 'invalid_offset', message: 'offset must be an integer between 0 and 2147483647' });
      }
      if (rawLimit !== undefined && outOfBounds(String(rawLimit).trim())) {
        return res.status(400).json({ error: 'invalid_limit', message: 'limit must be an integer between 1 and 100' });
      }
      if (rawPage !== undefined && outOfBounds(rawPage.trim())) {
        return res.status(400).json({ error: 'invalid_page', message: 'page must be an integer between 1 and 2147483647' });
      }
      // BUG-053 (run18): a negative/zero page is a caller bug, not something
      // to silently coerce to page 1 — reject it explicitly.
      if (rawPage !== undefined && parseInt(rawPage.trim()) < 1) {
        return res.status(400).json({ error: 'invalid_page', message: 'page must be >= 1' });
      }
      // BUG-050 (run14): cap page size at 100 (was 1000 — full-catalog scrape
      // in 3 requests). Paging via nextOffset/nextCursor still walks the whole
      // catalog; bulk consumers should use /api/awesome-list.
      const limit = rawLimit !== undefined
        ? Math.min(Math.max(parseInt(rawLimit as string), 1), 100)
        : 20;
      const offset = rawOffset !== undefined
        ? Math.max(parseInt(rawOffset as string), 0)
        : Math.max((parseInt(rawPage as string) || 1) - 1, 0) * limit;
      let category = firstQueryValue(req.query.category) as string;
      let subcategory = firstQueryValue(req.query.subcategory) as string;
      // BUG-015: accept `q` as an alias for `search` so /api/resources?q=… reaches
      // the real filter layer. `search` wins if both are present (explicit param).
      // NEW-012: strip NUL + control chars — Postgres rejects NUL bytes in text
      // params and the raw driver error surfaced as a 500.
      const rawSearch = firstQueryValue(req.query.search) ?? firstQueryValue(req.query.q);
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
      const subSubcategory = firstQueryValue(req.query.subSubcategory);

      // R3-H08: server-side sort with allow-list; unknown values 400 (mirrors
      // the invalid_status pattern) so callers learn the valid options.
      const ALLOWED_SORTS = ['name-asc', 'name-desc', 'newest', 'oldest'] as const;
      const requestedSort = firstQueryValue(req.query.sort);
      if (requestedSort !== undefined && !ALLOWED_SORTS.includes(requestedSort as any)) {
        return res.status(400).json({ error: 'invalid_sort', message: `sort must be one of: ${ALLOWED_SORTS.join(', ')}`, allowed: ALLOWED_SORTS });
      }
      const sort = requestedSort as (typeof ALLOWED_SORTS)[number] | undefined;

      // BUG-004: respect ?status= with allow-list; default 'approved' for public.
      const ALLOWED_STATUSES = new Set(['approved', 'pending', 'rejected']);
      const requestedStatus = firstQueryValue(req.query.status);
      let statusFilter: string | undefined = 'approved';
      if (requestedStatus !== undefined) {
        if (!ALLOWED_STATUSES.has(requestedStatus)) {
          return res.status(400).json({ error: 'invalid_status', message: `status must be one of: ${Array.from(ALLOWED_STATUSES).join(', ')}`, allowed: Array.from(ALLOWED_STATUSES) });
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
  // BUG-v3-M14 (run12): the public search endpoint shares the resource-read
  // rate limit (100 req/min/IP, 429 + Retry-After) like the other public
  // GET resource surfaces.
  app.get('/api/search', resourceReadLimiter, async (req, res) => {
    try {
      // NEW-012: strip NUL + control chars before trimming — Postgres rejects
      // NUL bytes in text params, which previously surfaced as a 500.
      // BUG-v3-M07 (run12): duplicate ?q= params arrive as an array — coerce
      // to the first value instead of crashing on .replace.
      const q = (firstQueryValue(req.query.q) || firstQueryValue(req.query.search) || '')
        .replace(/[\x00-\x1f\x7f]/g, '')
        .trim();
      if (q.length < 2) {
        return res.json({ query: q, total: 0, results: [] });
      }
      const limit = Math.min(Math.max(parseInt(firstQueryValue(req.query.limit) as string) || 100, 1), 200);
      // NB-021 (run23): offset pagination — `total` used to promise 1,275
      // matches for ?q=video while only the first `limit` (max 200) rows were
      // ever retrievable. Walk the full match set via offset/nextOffset.
      let offset = 0;
      const rawSearchOffset = firstQueryValue(req.query.offset);
      if (rawSearchOffset !== undefined && String(rawSearchOffset).trim() !== '') {
        const s = String(rawSearchOffset).trim();
        if (!/^\d+$/.test(s) || !Number.isSafeInteger(Number(s)) || Number(s) > PG_INT_MAX) {
          return res.status(400).json({ message: 'offset must be an integer between 0 and 2147483647' });
        }
        offset = Number(s);
      }
      const { resources, total } = await resourceRepo.listResources({
        page: 1,
        offset,
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
      // NB-021: honest pagination metadata — repeat with offset=nextOffset
      // until nextOffset is null to retrieve every promised match.
      const nextOffset = offset + resources.length < total ? offset + resources.length : null;
      res.json({ query: q, total, limit, offset, nextOffset, results: results.map(toPublicResource) });
    } catch (error) {
      console.error('Error searching resources:', error);
      res.status(500).json({ message: 'Failed to search resources' });
    }
  });

  // POST /api/telemetry/dead-link - Client-side 404 telemetry (public, fire-and-forget)
  app.post('/api/telemetry/dead-link', (req, res) => {
    // R5-018 (run24): the client only ever sends its own location.pathname —
    // so the server contract matches: a rooted path ≤200 chars with no
    // protocol-relative form, no control characters; referrer must be a
    // same-origin http(s) URL or it is dropped to null (foreign strings were
    // an arbitrary-content log-injection channel).
    const deadLinkSchema = z.object({
      path: z.string().min(1).max(200)
        .regex(/^\/(?![/\\])/, 'path must be a rooted local path')
        .refine((p) => !SINGLE_LINE_CONTROL_RE.test(p), 'path must not contain control characters'),
      referrer: z.string().max(2000).nullable().optional(),
      ts: z.string().max(64).regex(/^[0-9TZ:.+-]*$/).optional(),
    });
    const parsed = deadLinkSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid payload' });
    }
    const { path, referrer, ts } = parsed.data;
    let safeReferrer: string | null = null;
    if (referrer) {
      try {
        const u = new URL(referrer);
        if ((u.protocol === 'https:' || u.protocol === 'http:') && u.host === req.get('host')) {
          safeReferrer = u.toString();
        }
      } catch {
        safeReferrer = null;
      }
    }
    console.warn(
      `[dead-link] path=${JSON.stringify(path)} referrer=${JSON.stringify(safeReferrer ?? '')} ts=${ts ?? new Date().toISOString()}`
    );
    res.status(204).end();
  });

  // GET /api/resources/check-url - Check if URL already exists (public)
  app.get('/api/resources/check-url', async (req, res) => {
    try {
      // Run15 BUG-037: trim like the submit schema does — a pasted URL with a
      // trailing space must resolve to the same duplicate-check result.
      const url = typeof req.query.url === 'string' ? req.query.url.trim() : '';

      if (!url) {
        return res.status(400).json({ message: 'URL parameter is required' });
      }

      // R5-016 (run24): mirror the submit path's normalization so the
      // pre-submit duplicate probe and the actual submit agree — probe the
      // normalized form too (corpus is pre-normalization until Run24E).
      let existingResource = await resourceRepo.getResourceByUrl(url);
      if (!existingResource) {
        const normalized = webUrlSchema.safeParse(url);
        if (normalized.success && normalized.data !== url) {
          existingResource = await resourceRepo.getResourceByUrl(normalized.data);
        }
      }

      // R5-045 (run24): answer is now {exists} ONLY. The old payload returned
      // id/title/category for ANY row — including pending and rejected
      // submissions, which are admin-only detail (BUG-025 stripped `status`
      // but the row's existence + title still leaked moderation-queue
      // contents to anonymous probes).
      res.json({ exists: !!existingResource });
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
      // NB-008 (run23): all-digit ids past int4 range pass the \d+ route
      // regex and overflow inside PG → 500. Bound-check before the DB.
      const id = parseBoundedInt(req.params.id);
      if (id === null) {
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
  app.get('/api/resources/:id(\\d+)', resourceReadLimiter, getResourceByIdHandler);
  app.get('/api/resource/:id(\\d+)', resourceReadLimiter, getResourceByIdHandler);

  app.get('/api/resources/:id/related', resourceReadLimiter, async (req, res) => {
    const empty = { similar: [], prerequisites: [], nextSteps: [], totalFound: 0 };
    try {
      // NB-008 (run23): bound-check (int4 overflow → 500 otherwise).
      const id = parseBoundedInt(req.params.id);
      if (id === null) {
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
      // Run21 R4-015/016/047/048/076: ALL content rules come from the shared
      // validation module (same schemas the client mounts via zodResolver):
      // - title: visible chars required (ZWSP/whitespace-only → 400), ≤200, no HTML
      // - url: https-only, ≤2048, no userinfo/control chars, dotted hostname
      // - description: required 10–1000 visible chars (mirrors the client rule)
      const submitSchema = z.object({
        url: httpsUrlSchema,
        title: resourceTitleSchema,
        category: z.string().min(1, 'Category is required'),
        description: resourceDescriptionSchema,
        subcategory: z.string().optional(),
        subSubcategory: z.string().optional(),
        // BUG-029 (run14): tags reach the DB via metadata.tags. Markup is
        // never legitimate tag content; cap count/length server-side.
        metadata: z.object({
          tags: z.array(tagSchema).max(10, 'At most 10 tags allowed').optional(),
        }).passthrough().optional(),
      });
      const submitValidation = submitSchema.safeParse(req.body);
      if (!submitValidation.success) {
        // BUG-019 (run18): surface per-field messages so the client can map
        // them onto form fields (metadata.tags → "tags") instead of a
        // generic field-less toast. `errors` kept for back-compat.
        const fieldErrors: Record<string, string> = {};
        for (const issue of submitValidation.error.issues) {
          let key = String(issue.path[0] ?? 'form');
          if (key === 'metadata' && issue.path[1] === 'tags') key = 'tags';
          if (!fieldErrors[key]) fieldErrors[key] = issue.message;
        }
        return res.status(400).json({
          error: 'validation_failed',
          message: 'Validation failed',
          fieldErrors,
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
      // R5-016 (run24): httpsUrlSchema now normalizes (tracking params
      // stripped, punycode host) — data.url is the POST-transform form and is
      // what gets stored. The corpus predates normalization (Run24E backfills
      // it), so until then the dup-check probes BOTH forms: the normalized
      // URL and the raw submitted one.
      const rawSubmittedUrl = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
      const existingResource =
        (await resourceRepo.getResourceByUrl(submitValidation.data.url)) ||
        (rawSubmittedUrl && rawSubmittedUrl !== submitValidation.data.url
          ? await resourceRepo.getResourceByUrl(rawSubmittedUrl)
          : null);
      if (existingResource) {
        // BUG-v3-M11 (run12): no internal identifiers in the duplicate
        // response — the client only needs to know the URL already exists
        // (and never consumed existingId).
        return res.status(409).json({
          error: 'duplicate_url',
          message: 'This URL is already in the catalog'
        });
      }

      // Run19 BUG-013: exact duplicate titles pollute the catalog (the audit
      // found pairs like "Plyr" twice). Block them at submit with a clear
      // message — the existing entry should be edited instead.
      const existingTitle = await resourceRepo.getLiveResourceByTitle(submitValidation.data.title);
      if (existingTitle) {
        return res.status(409).json({
          error: 'duplicate_title',
          message: 'A resource with this exact title is already in the catalog. Pick a more specific title (e.g. add the platform or format) or suggest an edit to the existing entry.'
        });
      }

      // Use the NORMALIZED values (trimmed/zero-width-stripped) from the
      // shared validators — never the raw body — so " title " and ZWSP
      // padding can't reach the DB (R4-015/069).
      const resourceData = {
        ...insertResourceSchema.parse(req.body),
        title: submitValidation.data.title,
        url: submitValidation.data.url,
        description: submitValidation.data.description,
        metadata: submitValidation.data.metadata,
      };

      // Run21 R4-037: if the label can't be contained under the resource's
      // own category > subcategory chain, store null instead of an orphan.
      const submitContained = await ensureSubSubcategoryExists(
        categoryRepo,
        resourceData.category,
        resourceData.subcategory,
        resourceData.subSubcategory,
      );
      if (!submitContained) resourceData.subSubcategory = null;

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
      
      // Run21 R4-015/016: suggest-edit is a WRITE PATH — approved edits land
      // verbatim on the live resource, so it mounts the SAME shared validators
      // as submit (visible title, bounded description, sane URL, clean tags).
      if (sanitizedProposedData.title !== undefined) {
        const parsedTitle = resourceTitleSchema.safeParse(String(sanitizedProposedData.title));
        if (!parsedTitle.success) {
          return res.status(400).json({ message: parsedTitle.error.issues[0]?.message || 'Invalid title' });
        }
        sanitizedProposedData.title = parsedTitle.data;
      }

      if (sanitizedProposedData.description !== undefined) {
        const parsedDesc = resourceDescriptionSchema.safeParse(String(sanitizedProposedData.description));
        if (!parsedDesc.success) {
          return res.status(400).json({ message: parsedDesc.error.issues[0]?.message || 'Invalid description' });
        }
        sanitizedProposedData.description = parsedDesc.data;
      }

      // Run16 BUG-001 / BUG-018 / Run21 R4-048/076: a proposed URL *change* must
      // be a plausible, bounded URL with no embedded credentials. Run24 R4-016:
      // edits must be https-only (httpsUrlSchema) — you cannot introduce/keep an
      // http:// destination via an edit. Byte-equal to the stored URL skips
      // validation entirely, so unrelated edits on legacy http:// rows still work.
      if (sanitizedProposedData.url !== undefined && String(sanitizedProposedData.url) !== resource.url) {
        const parsedUrl = httpsUrlSchema.safeParse(String(sanitizedProposedData.url));
        if (!parsedUrl.success) {
          return res.status(400).json({ message: parsedUrl.error.issues[0]?.message || 'Invalid URL' });
        }
        sanitizedProposedData.url = parsedUrl.data;
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
          .map((t: string) => stripInvisible(t))
          .filter((t: string) => t.length > 0);
        if (normalizedTags.length > 20) {
          return res.status(400).json({ message: 'Too many tags (max 20)' });
        }
        for (const tag of normalizedTags) {
          if (tag.length > TAG_MAX_LENGTH) {
            return res.status(400).json({ message: `Tags must be at most ${TAG_MAX_LENGTH} characters` });
          }
          if (NO_HTML_RE.test(tag)) {
            return res.status(400).json({ message: 'Tags must not contain HTML tags' });
          }
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

      // Run19 BUG-015: the "AI Analysis" column in the admin Edits queue was
      // permanently "No AI" because nothing ever ran analysis for suggested
      // edits. Kick it off in the background (never blocks the 201 response;
      // failures just leave the column honest about having no analysis).
      if (!aiMetadata && resource.url) {
        claudeService
          .analyzeURL(resource.url)
          .then((analysis) => {
            if (analysis) {
              // analyzeURL's return shape matches the claudeMetadata column
              // type (suggestedTitle/suggestedDescription/…/keyTopics).
              return auditRepo.updateResourceEditAnalysis(edit.id, analysis);
            }
          })
          .catch((error) => {
            console.error(`Background Claude analysis for edit ${edit.id} failed:`, error);
          });
      }

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
        
        // NB-008 (run23): bound-check — all-digit values past int4 range pass
        // the regex, then overflow inside PG → 500.
        const parsed = parseBoundedInt(validation.data);
        if (parsed === null) {
          return res.status(400).json({ 
            message: 'categoryId must be a positive number within integer range' 
          });
        }
        categoryId = parsed;
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
        
        // NB-008 (run23): bound-check — see /api/subcategories above.
        const parsed = parseBoundedInt(validation.data);
        if (parsed === null) {
          return res.status(400).json({ 
            message: 'subcategoryId must be a positive number within integer range' 
          });
        }
        subcategoryId = parsed;
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

      // Run15 BUG-029: "changing" to the identical password is always a user
      // error — reject it explicitly instead of silently succeeding.
      if (newPassword === currentPassword) {
        return res.status(400).json({ message: 'New password must be different from your current password' });
      }

      const pwCheck = validateNewPassword(newPassword);
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

  // PATCH /api/user/profile — self-service display-name edit (Run15 BUG-049).
  // Only firstName/lastName; email/password/role have their own guarded flows.
  app.patch('/api/user/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      // Run17 BUG-012: cap at 50; Run21 R4-049: shared displayNameSchema also
      // strips zero-width chars and rejects names with NO visible characters
      // (a ZWSP-only name used to render as an invisible identity).
      const nameField = displayNameSchema.optional();
      const profileSchema = z
        .object({ firstName: nameField, lastName: nameField })
        .refine((v) => v.firstName !== undefined || v.lastName !== undefined, {
          message: 'Provide firstName or lastName',
        })
        // Run17 BUG-011: clearing BOTH names in one request is rejected — the
        // old behavior 200'd and silently fell back to the email local-part.
        .refine(
          (v) => !(v.firstName !== undefined && v.lastName !== undefined &&
                   v.firstName === '' && v.lastName === ''),
          { message: 'Enter at least a first or last name' },
        );
      const parsed = profileSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.issues[0]?.message || 'Invalid profile data' });
      }
      // Empty string clears the field (stored as NULL, matching OAuth-created rows).
      const toValue = (v: string | undefined) => (v === undefined ? undefined : v === '' ? null : v);
      const updated = await userRepo.updateUserProfile(userId, {
        firstName: toValue(parsed.data.firstName),
        lastName: toValue(parsed.data.lastName),
      });
      if (!updated) {
        return res.status(404).json({ message: 'User not found' });
      }
      return res.json({
        id: updated.id,
        email: updated.email,
        firstName: updated.firstName,
        lastName: updated.lastName,
        role: updated.role,
      });
    } catch (error) {
      console.error('[PATCH /api/user/profile] Error:', error);
      return res.status(500).json({ message: 'Failed to update profile' });
    }
  });

  // POST /api/user/deletion-request — Run22 BUG-020: private account/data
  // deletion channel. Authenticated (session), so no personal data ever has
  // to be posted in a public GitHub issue. Idempotent: re-requesting keeps
  // the original request timestamp. Admins see the pending marker in the
  // users table and action it via the existing guarded delete-user flow.
  app.post('/api/user/deletion-request', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const existing = await userRepo.getUser(userId);
      if (!existing) {
        return res.status(404).json({ message: 'User not found' });
      }
      const alreadyRequested = !!existing.deletionRequestedAt;
      const updated = alreadyRequested
        ? existing
        : await userRepo.setDeletionRequested(userId, true);
      return res.status(alreadyRequested ? 200 : 201).json({
        deletionRequestedAt: updated?.deletionRequestedAt,
        alreadyRequested,
        message: alreadyRequested
          ? 'Your deletion request is already pending.'
          : 'Deletion request received. A maintainer will process it privately.',
      });
    } catch (error) {
      console.error('[POST /api/user/deletion-request] Error:', error);
      return res.status(500).json({ message: 'Failed to submit deletion request' });
    }
  });

  // DELETE /api/user/deletion-request — withdraw a pending deletion request.
  app.delete('/api/user/deletion-request', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const existing = await userRepo.getUser(userId);
      if (!existing) {
        return res.status(404).json({ message: 'User not found' });
      }
      if (!existing.deletionRequestedAt) {
        return res.status(409).json({ message: 'No pending deletion request to withdraw' });
      }
      await userRepo.setDeletionRequested(userId, false);
      return res.json({ message: 'Deletion request withdrawn.' });
    } catch (error) {
      console.error('[DELETE /api/user/deletion-request] Error:', error);
      return res.status(500).json({ message: 'Failed to withdraw deletion request' });
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

      // Get current learning path — the most recently accessed journey that
      // is NOT yet completed. Run22 BUG-042: journeyProgress[0] used to win
      // even when it was a finished journey, so "Current Learning Path"
      // showed a completed path. Completed journeys are never "current"; if
      // every enrolled journey is done, no current path is reported.
      let currentPath: string | undefined;
      const activeJourneys = journeyProgress.filter(p => !p.completedAt);
      if (activeJourneys.length > 0) {
        const journey = await learningJourneyRepo.getLearningJourney(activeJourneys[0].journeyId);
        currentPath = journey?.title;
      }

      // Run22 BUG-043: totalTimeSpent was hardcoded '0h 0m' even with real
      // completions. Definition (no wall-clock tracking exists): estimated
      // learning time = for each enrolled journey, the midpoint of its
      // estimated_duration ("8-10 hours" → 9h) scaled by the fraction of step
      // rows completed; a journey with completedAt counts in full.
      const enrolledIds = journeyProgress.map(p => p.journeyId);
      const stepsByJourney = await learningJourneyRepo.listJourneyStepsBatch(enrolledIds);
      const journeyMeta = await Promise.all(
        enrolledIds.map(id => learningJourneyRepo.getLearningJourney(id)),
      );
      const parseDurationHours = (text?: string | null): number => {
        if (!text) return 0;
        const m = text.match(/(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?\s*(hours?|hrs?|minutes?|mins?)/i);
        if (!m) return 0;
        const lo = parseFloat(m[1]);
        const hi = m[2] ? parseFloat(m[2]) : lo;
        const mid = (lo + hi) / 2;
        return /min/i.test(m[3]) ? mid / 60 : mid;
      };
      let estimatedHours = 0;
      for (const p of journeyProgress) {
        const journey = journeyMeta.find(j => j?.id === p.journeyId);
        const durationHours = parseDurationHours(journey?.estimatedDuration);
        if (!durationHours) continue;
        const totalStepRows = (stepsByJourney.get(p.journeyId) ?? []).length;
        const fraction = p.completedAt
          ? 1
          : totalStepRows > 0
            ? Math.min(1, (p.completedSteps?.length ?? 0) / totalStepRows)
            : 0;
        estimatedHours += durationHours * fraction;
      }
      const totalMinutes = Math.round(estimatedHours * 60);
      const totalTimeSpent = `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;

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
        totalTimeSpent,
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

  // DELETE /api/user/submissions/:id - Withdraw own pending resource submission
  // (NB-039). Only the submitter may withdraw, and only while still pending —
  // approved/rejected items are part of the moderated catalog/audit history.
  app.delete('/api/user/submissions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const resourceId = parseInt(req.params.id);

      if (isNaN(resourceId)) {
        return res.status(400).json({ message: 'Invalid resource ID' });
      }

      const resource = await resourceRepo.getResource(resourceId);
      if (!resource) {
        return res.status(404).json({ message: 'Submission not found' });
      }
      if (resource.submittedBy !== userId) {
        return res.status(403).json({ message: 'You can only withdraw your own submissions' });
      }
      if (resource.status !== 'pending') {
        return res.status(409).json({ message: 'Only pending submissions can be withdrawn' });
      }

      // deleteResource writes the 'deleted' audit row itself (before the row is
      // removed, so the audit FK stays valid) and cleans up the non-cascading
      // child FKs (resource_edits, research_discoveries.created_resource_id).
      // Do NOT log the deletion again here.
      await resourceRepo.deleteResource(resourceId, userId);

      res.json({ message: 'Submission withdrawn' });
    } catch (error) {
      console.error('Error withdrawing submission:', error);
      res.status(500).json({ message: 'Failed to withdraw submission' });
    }
  });

  // GET /api/user/journeys - Get user's learning journeys with details
  app.get('/api/user/journeys', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      // NB-018 (run23): per-user progress must never come from the browser's
      // HTTP cache — Express's default ETag + no Cache-Control let the browser
      // intermittently serve a stale 200 from disk cache, so progress made in
      // another tab/session looked lost until a hard reload.
      res.set('Cache-Control', 'no-store');

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
          
          // Run17 BUG-003: completedSteps stores step ROW ids while stepCount
          // counts logical steps (distinct stepNumbers). Counting raw rows mixed
          // units and produced >100% progress (e.g. 18 rows / 6 steps = 300%).
          // A logical step counts as complete when every non-optional row of its
          // stepNumber is in completedSteps (matches completedAt semantics).
          const completedRowIds = new Set(progress?.completedSteps ?? []);
          const rowsByStepNumber = new Map<number, { id: number; isOptional: boolean }[]>();
          for (const s of steps) {
            const n = typeof s.stepNumber === 'number' ? s.stepNumber : parseInt(s.stepNumber, 10);
            if (isNaN(n)) continue;
            const rows = rowsByStepNumber.get(n) ?? [];
            rows.push({ id: s.id, isOptional: !!s.isOptional });
            rowsByStepNumber.set(n, rows);
          }
          let completedStepCount = 0;
          rowsByStepNumber.forEach((rows) => {
            const required = rows.filter(r => !r.isOptional);
            const consider = required.length > 0 ? required : rows;
            if (consider.every(r => completedRowIds.has(r.id))) completedStepCount++;
          });
          
          return {
            ...journey,
            stepCount: uniqueStepNumbers.size,
            completedStepCount,
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
      // BUG-004 (run8): non-numeric ids (e.g. /api/journeys/some-slug) previously
      // reached the DB with NaN and threw -> 500. Treat them as not found.
      // NB-008 (run23): same for all-digit ids past int4 range (overflow → 500).
      const id = parseBoundedInt(req.params.id);
      if (id === null) {
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
      // Run17 BUG-016: accept either a single stepId (legacy) or a stepIds
      // array so a logical step (up to 3 rows per stepNumber) completes in ONE
      // request instead of one PUT per row. `completed` (optional boolean)
      // makes the write idempotent; omitted = per-id toggle (legacy contract).
      // Run22 BUG-032: a progress write against a journey that doesn't exist
      // must be a 404, not a 200 no-op (and not a 422 "foreign step" — that
      // status is reserved for real journeys receiving another journey's step
      // ids). Check existence BEFORE any validation that could write.
      const journeyExists = await learningJourneyRepo.getLearningJourney(journeyId);
      if (!journeyExists) {
        return res.status(404).json({ message: 'Journey not found' });
      }

      const { stepId, stepIds, completed } = req.body ?? {};
      const ids: number[] = Array.isArray(stepIds)
        ? stepIds.filter((n: unknown) => Number.isInteger(n))
        : Number.isInteger(stepId) ? [stepId] : [];

      if (ids.length === 0) {
        return res.status(400).json({ message: 'Step ID is required' });
      }
      if (typeof completed !== 'boolean' && typeof completed !== 'undefined') {
        return res.status(400).json({ message: 'completed must be a boolean' });
      }

      const progress = await learningJourneyRepo.updateUserJourneyProgressBatch(
        userId, journeyId, ids, completed,
      );
      // Run22 BUG-032 (same no-op class): the batch update only UPDATEs an
      // existing progress row — if the user never started this journey there
      // is no row, nothing was written, and `progress` is undefined. That must
      // not masquerade as a 200 success.
      if (!progress) {
        return res.status(409).json({ message: 'Journey not started — start the journey before updating progress' });
      }
      res.json(progress);
    } catch (error: any) {
      // Run22 BUG-006: step ids that belong to a different journey are a
      // client error, not a server fault — reject without storing anything.
      if (error?.code === 'FOREIGN_STEP') {
        return res.status(422).json({
          message: `Step ID(s) do not belong to this journey: ${(error.foreignStepIds ?? []).join(', ')}`,
        });
      }
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
        // Run15 BUG-010: count DISTINCT stepNumbers (a logical step stores up
        // to 3 rows — one per resource), matching the public /api/journeys
        // computation so admin and public step counts agree.
        stepCount: new Set(
          (stepsMap.get(j.id) || [])
            .map(s => typeof s.stepNumber === 'number' ? s.stepNumber : parseInt(s.stepNumber, 10))
            .filter(n => !isNaN(n))
        ).size,
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

      // R5-002 (run24): step title/description use the shared journey content
      // rules — bare .min(1) accepted invisible-only titles and unbounded text.
      const stepSchema = insertJourneyStepSchema.omit({ journeyId: true, stepNumber: true }).extend({
        title: journeyTitleSchema,
        description: journeyDescriptionSchema.nullable().optional(),
        resourceId: z.number().int().positive().max(PG_INT_MAX).nullable().optional(),
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

        // R5-002 (run24): same shared journey content rules as step creation.
        const updateSchema = z.object({
          title: journeyTitleSchema.optional(),
          description: journeyDescriptionSchema.nullable().optional(),
          resourceId: z.number().int().positive().max(PG_INT_MAX).nullable().optional(),
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

        // Run16 BUG-013: renumber remaining steps GROUP-aware. Rows sharing a
        // stepNumber are one logical step (multi-resource); the old row-based
        // renumber (1..N per row) exploded 6 logical steps into 18 after any
        // single delete. Groups keep their membership; group numbers become
        // contiguous 1..G.
        const remaining = steps.filter((s) => s.id !== stepId);
        if (remaining.length > 0) {
          const groupNumbers = [...new Set(remaining.map((s) => s.stepNumber))].sort(
            (a, b) => a - b,
          );
          const newNumberByOld = new Map(groupNumbers.map((n, i) => [n, i + 1]));
          await learningJourneyRepo.setJourneyStepNumbers(
            journeyId,
            remaining.map((s) => ({
              id: s.id,
              stepNumber: newNumberByOld.get(s.stepNumber)!,
            })),
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

        // Run16 BUG-013: accepts either flat `stepIds` (legacy — every row is
        // its own group) or `stepGroups` (rows sharing a logical step travel
        // together and keep a shared stepNumber).
        const bodySchema = z
          .object({
            stepIds: z.array(z.number().int().positive()).min(1).optional(),
            stepGroups: z
              .array(z.array(z.number().int().positive()).min(1))
              .min(1)
              .optional(),
          })
          .refine((b) => !!b.stepIds !== !!b.stepGroups, {
            message: 'Provide exactly one of stepIds or stepGroups',
          });
        const body = bodySchema.parse(req.body);
        const groups: number[][] =
          body.stepGroups ?? body.stepIds!.map((id) => [id]);
        const flatIds = groups.flat();

        const existing = await learningJourneyRepo.listJourneySteps(journeyId);
        if (existing.length !== flatIds.length) {
          return res
            .status(400)
            .json({ message: 'Reorder must include exactly every step of the journey' });
        }
        const existingSet = new Set(existing.map((s) => s.id));
        const reorderSet = new Set(flatIds);
        if (
          existingSet.size !== reorderSet.size ||
          [...existingSet].some((id) => !reorderSet.has(id))
        ) {
          return res.status(400).json({ message: 'Reorder must reference the journey\'s existing steps exactly once each' });
        }

        const steps = await learningJourneyRepo.setJourneyStepNumbers(
          journeyId,
          groups.flatMap((groupIds, i) =>
            groupIds.map((id) => ({ id, stepNumber: i + 1 })),
          ),
        );
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
        pendingEdits: stats.pendingEdits,
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
      // NB-024 (run23): validate pagination like every public surface —
      // page=-1 previously drove a negative OFFSET into PG → 500, and
      // limit=-1 fell through as PG "LIMIT -1" → every user in one response.
      let page = 1;
      if (req.query.page !== undefined && req.query.page !== '') {
        const parsedPage = parseBoundedInt(req.query.page);
        if (parsedPage === null) {
          return res.status(400).json({ message: 'page must be a positive integer' });
        }
        page = parsedPage;
      }
      let limit = 20;
      if (req.query.limit !== undefined && req.query.limit !== '') {
        const parsedLimit = parseBoundedInt(req.query.limit);
        if (parsedLimit === null) {
          return res.status(400).json({ message: 'limit must be a positive integer between 1 and 100' });
        }
        limit = Math.min(parsedLimit, 100);
      }
      const q = typeof req.query.q === 'string' ? req.query.q : undefined;
      // Run16 BUG-087: optional sort params (whitelisted in the repository).
      const sortBy = typeof req.query.sortBy === 'string' ? req.query.sortBy : undefined;
      const sortDir = typeof req.query.sortDir === 'string' ? req.query.sortDir : undefined;

      const result = await userRepo.listUsers(page, limit, q, sortBy, sortDir);
      // Never expose password hashes over the API, even to admins. Run21
      // R4-019: whitelist serializer (not destructure-strip) so any future
      // sensitive column is safe by default.
      const sanitizedUsers = result.users.map((u) => sanitizeUser(u));
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
  app.get('/api/admin/users/export', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const allUsers = await userRepo.listAllUsers();
      // R5-029 (run24): a bulk unmasked-PII export is the highest-sensitivity
      // admin action on the site — it must appear in the audit trail like
      // every other privileged action. Logged BEFORE the response is sent so
      // a failed send still leaves the access on record.
      await auditRepo.logResourceAudit(
        null,
        'users.exported',
        req.user?.claims?.sub,
        { rowCount: allUsers.length },
        `Admin exported ${allUsers.length} user rows (unmasked emails, CSV)`
      );
      const csvCell = (value: unknown): string => {
        let s = value === null || value === undefined ? '' : String(value);
        if (/^[=+\-@]/.test(s)) s = `'${s}`;
        if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
        return s;
      };
      // NB-012 (run23, supersedes Run15 BUG-042 masking): the export is an
      // admin-only endpoint and the admin UI already has a reveal toggle that
      // shows the real address — a masked CSV was strictly less useful than
      // the screen it mirrors while gating nothing. Export real emails; the
      // on-screen table stays masked by default.
      const header = ['id', 'email', 'firstName', 'lastName', 'role', 'authProvider', 'createdAt'];
      const lines = [header.join(',')];
      for (const u of allUsers) {
        const provider = u.password ? 'local' : 'replit';
        lines.push([
          csvCell(u.id),
          csvCell(u.email ?? ''),
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
  // PATCH /api/admin/users/:id/name — admin-set display name (BUG-009 run19).
  // Exists primarily so the prod data-fix script can backfill names for
  // accounts registered before names were derived at signup (prod DB is not
  // agent-writable; all prod data fixes go through the live admin API).
  app.patch('/api/admin/users/:id/name', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { firstName, lastName } = req.body ?? {};
      // Run21 R4-049/050: same rules as the profile editor — zero-width chars
      // stripped, ONE shared cap (DISPLAY_NAME_MAX) so admin-set names always
      // round-trip through the self-service editor.
      const clean = (v: unknown): string | null | undefined => {
        if (v === undefined) return undefined;
        if (v === null) return null;
        if (typeof v !== 'string') return undefined;
        const t = stripInvisible(v).slice(0, DISPLAY_NAME_MAX);
        return t.length > 0 ? t : null;
      };
      const first = clean(firstName);
      const last = clean(lastName);
      if (first === undefined && last === undefined) {
        return res.status(400).json({ message: 'firstName or lastName (string or null) is required' });
      }
      const existing = await userRepo.getUser(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: 'User not found' });
      }
      const updated = await userRepo.updateUserProfile(req.params.id, {
        ...(first !== undefined ? { firstName: first } : {}),
        ...(last !== undefined ? { lastName: last } : {}),
      });
      res.json(sanitizeUser(updated));
    } catch (error) {
      console.error('Error updating user name:', error);
      res.status(500).json({ message: 'Failed to update user name' });
    }
  });

  app.put('/api/admin/users/:id/role', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.params.id;
      const { role } = req.body;
      
      if (!role || !['user', 'admin', 'moderator'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
      }
      
      // Run16 BUG-014: block self role changes server-side — a one-click
      // self-demotion would lock the last admin out (mirrors the existing
      // self-delete guard below).
      if (req.user?.claims?.sub === userId) {
        return res.status(400).json({ message: 'You cannot change your own role' });
      }
      
      const user = await userRepo.updateUserRole(userId, role);
      // Run21 R4-019: this endpoint used to serialize the FULL user row —
      // including the bcrypt hash. Field-whitelist serializer only.
      res.json(sanitizeUser(user));
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
      // Run16 BUG-041: honor offset + return the REAL total.
      // Run21 R4-079: invalid pagination/filter params are a CLIENT error —
      // answer 400 instead of silently clamping/ignoring them (offset=-1 and
      // resourceId=0 used to be swallowed and return page 1 unfiltered).
      const rawLimit = req.query.limit as string | undefined;
      const rawOffset = req.query.offset as string | undefined;
      const rawResourceId = req.query.resourceId as string | undefined;

      // R5-020 (run24): Number.isInteger(1e20) is TRUE — exponent-notation and
      // beyond-int4 values sailed through and 500'd inside PG. parseIntInRange
      // enforces digit-only strings bounded to int4.
      let limit = 50;
      let rid: number | null = null;
      if (rawResourceId !== undefined) {
        rid = parseIntInRange(rawResourceId, { min: 1 });
        if (rid === null) {
          return res.status(400).json({ message: 'resourceId must be a positive integer' });
        }
      }
      if (rawLimit !== undefined) {
        const n = parseIntInRange(rawLimit, { min: 1, max: 500 });
        if (n === null) {
          return res.status(400).json({ message: 'limit must be an integer between 1 and 500' });
        }
        limit = n;
      }
      let offset = 0;
      if (rawOffset !== undefined) {
        const n = parseIntInRange(rawOffset, { min: 0 });
        if (n === null) {
          return res.status(400).json({ message: 'offset must be a non-negative integer' });
        }
        offset = n;
      }

      const [logs, total] = await Promise.all([
        auditRepo.getResourceAuditLog(rid, limit, offset),
        auditRepo.countAuditLogs(rid),
      ]);
      res.json({ logs, total, limit, offset });
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

      // Run16 BUG-046: rejecting a non-pending resource used to fall through
      // to the catch → 500. It is a state conflict, not a server error.
      if (existing.status !== 'pending') {
        return res.status(409).json({
          message: `Only pending resources can be rejected here (this resource is '${existing.status}'). Use the resource status controls to change an approved resource.`,
        });
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
      
      // Run21 R4-016: the admin edit path mounts the SAME shared validators as
      // submit — <script> titles, whitespace-only titles, 5000-char
      // descriptions and 100k URLs all 400 here now. Run24 R4-016: a URL
      // *change* must be https-only (httpsUrlSchema) — no http:// destination
      // may be introduced/kept via an edit. If the submitted URL is byte-equal
      // to what's already stored, the field is skipped entirely, so unrelated
      // edits on legacy http:// rows still succeed and never churn the URL.
      const bodyForValidation = { ...(req.body ?? {}) };
      if (typeof bodyForValidation.url === 'string' && bodyForValidation.url === resource.url) {
        delete bodyForValidation.url;
      }
      const updateSchema = insertResourceSchema.partial().extend({
        title: resourceTitleSchema.optional(),
        description: resourceDescriptionSchema.optional(),
        url: httpsUrlSchema.optional(),
      });
      const validationResult = updateSchema.safeParse(bodyForValidation);
      
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
      // existing value. Run21 R4-037: when the label can't be contained under
      // the effective category > subcategory chain, persist null instead of
      // leaving an orphan label on the row.
      const updateContained = await ensureSubSubcategoryExists(
        categoryRepo,
        updateData.category ?? resource.category,
        updateData.subcategory ?? resource.subcategory,
        updateData.subSubcategory ?? resource.subSubcategory,
      );
      if (!updateContained && (updateData.subSubcategory ?? resource.subSubcategory)) {
        updateData.subSubcategory = null;
      }

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
      // Run16 BUG-035: pass the whitelisted sort through to the repo
      // (unknown values fall back to newest-first inside listResources).
      const sort = req.query.sort as "name-asc" | "name-desc" | "newest" | "oldest" | undefined;
      
      const result = await resourceRepo.listResources({
        page,
        limit,
        search,
        category,
        status: status || undefined,
        sort
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
      
      // Run16 BUG-001/BUG-031 + Run21 R4-016: admin-created resources go live
      // immediately — full shared validation (https-only bounded URL, visible
      // title, bounded description when provided).
      const createSchema = insertResourceSchema.extend({
        title: resourceTitleSchema,
        url: httpsUrlSchema,
        description: resourceDescriptionSchema.optional(),
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
      let resolvedSubSubcategory = validatedData.subSubcategory || null;

      // Run21 R4-037: null out labels that can't be contained under the
      // resolved category > subcategory chain instead of storing orphans.
      const createContained = await ensureSubSubcategoryExists(
        categoryRepo,
        resolvedCategory,
        resolvedSubcategory,
        resolvedSubSubcategory,
      );
      if (!createContained) resolvedSubSubcategory = null;

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
  // NB-022 (run23): this endpoint runs a paid Claude call per request. It
  // stays available to any signed-in user (the suggest-edit dialog calls it),
  // but is now behind the shared aiLimiter (10 req / 15 min / IP) and caller
  // errors (missing/garbage URL) are 400s, not 500s.
  // R5-030 (run24): additionally a PER-USER daily quota — the IP limiter
  // alone let one registered account mint unlimited paid Claude calls for
  // arbitrary unique URLs by rotating IPs / pacing requests.
  const CLAUDE_ANALYZE_DAILY_LIMIT = 20;
  const claudeAnalyzeQuota = new Map<string, { day: string; count: number }>();
  app.post('/api/claude/analyze', isAuthenticated, aiLimiter, async (req: any, res) => {
    try {
      const { url } = req.body ?? {};

      const quotaUserId = req.user?.claims?.sub;
      if (!quotaUserId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const today = new Date().toISOString().slice(0, 10);
      // Lazy prune: entries from previous days are dead weight.
      if (claudeAnalyzeQuota.size > 5000) {
        for (const [k, v] of claudeAnalyzeQuota) {
          if (v.day !== today) claudeAnalyzeQuota.delete(k);
        }
      }
      const quota = claudeAnalyzeQuota.get(quotaUserId);
      const used = quota && quota.day === today ? quota.count : 0;
      if (used >= CLAUDE_ANALYZE_DAILY_LIMIT) {
        return res.status(429).json({
          message: `Daily AI analysis limit reached (${CLAUDE_ANALYZE_DAILY_LIMIT}/day). Try again tomorrow.`,
        });
      }

      if (!url || typeof url !== 'string' || !url.trim()) {
        return res.status(400).json({ message: 'URL is required' });
      }
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url.trim());
      } catch {
        return res.status(400).json({ message: 'URL must be a valid absolute http(s) URL' });
      }
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        return res.status(400).json({ message: 'URL must use http or https' });
      }

      if (!claudeService.isAvailable()) {
        return res.status(503).json({ 
          message: 'Claude AI service is not available',
          available: false
        });
      }

      // Count the attempt BEFORE the paid call — a failed/aborted analysis
      // still consumed a Claude request.
      claudeAnalyzeQuota.set(quotaUserId, { day: today, count: used + 1 });

      const analysis = await claudeService.analyzeURL(url.trim());
      
      if (!analysis) {
        // Upstream (Claude / target fetch) failure — not a server bug: 502.
        return res.status(502).json({ message: 'Failed to analyze URL' });
      }
      
      res.json(analysis);
    } catch (error: any) {
      // R5-030 (run24): caller-side failures are 4xx, never 500 — an
      // unreachable-but-valid URL is not a server outage.
      const msg = String(error?.message ?? '');
      if (
        msg === 'Invalid URL format' ||
        msg === 'Only HTTPS URLs are allowed' ||
        msg.includes('not in the allowlist')
      ) {
        return res.status(400).json({ message: msg });
      }
      if (msg === 'Request timeout' || msg.startsWith('URL fetch failed') || msg.includes('Content too large')) {
        return res.status(422).json({
          message: "Couldn't retrieve that URL — the site may be blocking automated access. You can fill in the details manually.",
        });
      }
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
      
      // BUG-003 (run19): block creating a duplicate-name/slug row under a
      // different parent — per-import copies fragment the taxonomy (HLS x11).
      const globalDup = await categoryRepo.findSubSubcategoryDuplicateGlobal(
        validationResult.data.name,
        validationResult.data.slug,
      );
      if (globalDup) {
        return res.status(409).json({
          message: `A sub-subcategory named "${globalDup.name}" (slug "${globalDup.slug}") already exists (id ${globalDup.id}). Duplicate sub-subcategories fragment the taxonomy — reuse the existing one or rename it instead.`,
        });
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

      // R5-029 (run24) sweep: every bulk-export-shaped admin action leaves an
      // audit-trail entry (who, what, when) like users/export.
      await auditRepo.logResourceAudit(
        null,
        'catalog.exported_github',
        req.user?.claims?.sub,
        { repositoryUrl, queueId: queueItem.id },
        `Admin started GitHub export to ${repositoryUrl}`
      );
      
      // Process immediately in background
      syncService.exportToGitHub(repositoryUrl, options)
        .then(async result => {
          if (result.errors.length > 0) {
            console.error('GitHub export failed:', result.errors);
            await githubSyncRepo.updateGithubSyncStatus(queueItem.id, 'failed', result.errors.join('; '));
            return;
          }
          console.log('GitHub export completed:', result);
          await githubSyncRepo.updateGithubSyncStatus(queueItem.id, 'completed', undefined, {
            exported: result.exported,
            commitSha: result.commitSha,
            commitUrl: result.commitUrl
          });
        })
        .catch(async error => {
          console.error('GitHub export failed:', error);
          await githubSyncRepo.updateGithubSyncStatus(
            queueItem.id,
            'failed',
            error instanceof Error ? error.message : String(error)
          ).catch(() => {});
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

      // Run23 NB-038: the queue list used to ship every row's full
      // resourceIds array (thousands of ids per export row) + raw metadata —
      // megabytes on long-lived deployments. The panel only renders summary
      // fields; full detail stays available per-row via /sync-status/:id.
      res.json({
        total: queueItems.length,
        items: queueItems.map(q => ({
          id: q.id,
          repositoryUrl: q.repositoryUrl,
          branch: q.branch,
          action: q.action,
          status: q.status,
          errorMessage: q.errorMessage,
          resourceCount: Array.isArray(q.resourceIds) ? q.resourceIds.length : 0,
          createdAt: q.createdAt,
          processedAt: q.processedAt,
        }))
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
      // Run16 BUG-038: older sync runs were only recorded in github_sync_queue
      // (the canonical github_sync_history table came later and is empty on
      // long-lived deployments), so the panel showed "no syncs" despite
      // completed runs. Merge terminal queue rows into the history shape,
      // skipping any queue row that has a matching canonical history row
      // (same repo + direction within 10 min) to avoid double-counting runs
      // recorded in BOTH tables.
      const [history, queueItems] = await Promise.all([
        githubSyncRepo.getSyncHistory(),
        githubSyncRepo.getGithubSyncQueue(),
      ]);

      const unwrap = (v: any): number => Array.isArray(v) ? (Number(v[0]) || 0) : (Number(v) || 0);
      const TEN_MIN = 10 * 60 * 1000;
      const fromQueue = queueItems
        .filter(q => q.status === 'completed' || q.status === 'failed')
        .filter(q => !history.some(h =>
          h.repositoryUrl === q.repositoryUrl &&
          h.direction === q.action &&
          Math.abs(new Date(h.createdAt!).getTime() - new Date((q.processedAt ?? q.createdAt)!).getTime()) < TEN_MIN
        ))
        .map(q => {
          const md = (q.metadata ?? {}) as Record<string, any>;
          const added = md.diff?.added ?? unwrap(md.imported);
          const updated = md.diff?.updated ?? unwrap(md.updated);
          const removed = md.diff?.removed ?? 0;
          return {
            // Offset keeps queue-derived ids from colliding with real history ids.
            id: 1_000_000 + q.id,
            repositoryUrl: q.repositoryUrl,
            direction: q.action,
            commitSha: md.commitSha ?? null,
            commitMessage: md.commitMessage ?? (q.status === 'failed' ? (q.errorMessage || 'Sync failed') : null),
            commitUrl: null,
            resourcesAdded: added,
            resourcesUpdated: updated,
            resourcesRemoved: removed,
            totalResources: unwrap(md.exported) || (added + updated + unwrap(md.skipped)) || (Array.isArray(q.resourceIds) ? q.resourceIds.length : 0),
            performedBy: null,
            createdAt: q.processedAt ?? q.createdAt,
          };
        });

      // Run23 NB-038: canonical history rows carry a full resource `snapshot`
      // jsonb (2.7MB total on prod). The list view only needs summary fields;
      // snapshots remain in the DB for on-demand use.
      const historySummaries = history.map(h => ({
        id: h.id,
        repositoryUrl: h.repositoryUrl,
        direction: h.direction,
        commitSha: h.commitSha,
        commitMessage: h.commitMessage,
        commitUrl: h.commitUrl,
        resourcesAdded: h.resourcesAdded,
        resourcesUpdated: h.resourcesUpdated,
        resourcesRemoved: h.resourcesRemoved,
        totalResources: h.totalResources,
        performedBy: h.performedBy,
        createdAt: h.createdAt,
      }));

      res.json([...historySummaries, ...fromQueue].sort((a: any, b: any) =>
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

      // R5-029 (run24) sweep: bulk-export actions are audit-logged.
      await auditRepo.logResourceAudit(
        null,
        'catalog.exported',
        req.user?.claims?.sub,
        { rowCount: resources.length, format: 'markdown' },
        `Admin exported ${resources.length} catalog rows as awesome-list markdown`
      );

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

      // R5-029 (run24) sweep: full-database backup export (includes user
      // rows) is audit-logged like users/export.
      await auditRepo.logResourceAudit(
        null,
        'database.exported',
        (req as any).user?.claims?.sub,
        { resources: resources.length, users: usersList.length, format: 'json' },
        `Admin exported full database JSON backup (${resources.length} resources, ${usersList.length} users)`
      );

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

  // ============= Admin Maintenance Routes (Run23) =============

  // Run23 NB-046: tag-coverage visibility — the July bulk import left more
  // than half the catalog untagged and the gap was invisible in the admin.
  // This read-only census powers a coverage line in the enrichment panel.
  app.get('/api/admin/enrichment/coverage', isAuthenticated, isAdmin, async (_req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT
          count(*)::int AS approved_total,
          count(*) FILTER (
            WHERE jsonb_typeof(metadata->'tags') = 'array'
              AND jsonb_array_length(metadata->'tags') > 0
          )::int AS tagged
        FROM resources
        WHERE status = 'approved'
      `);
      const row = (result.rows as any[])[0];
      const approvedTotal = row.approved_total as number;
      const tagged = row.tagged as number;
      res.json({
        approvedTotal,
        tagged,
        untagged: approvedTotal - tagged,
        coveragePct: approvedTotal > 0 ? Math.round((tagged / approvedTotal) * 1000) / 10 : 0,
      });
    } catch (error) {
      console.error('Error computing tag coverage:', error);
      res.status(500).json({ message: 'Failed to compute tag coverage' });
    }
  });

  // Run23 NB-054: 2,283/2,292 approved resources carry approved_at = null
  // (bulk imports were created already-approved without stamping the field).
  // Backfill approved_at from created_at — the moment an imported row was
  // created IS the moment it became approved. Idempotent: second run is a
  // no-op (0 rows).
  app.post('/api/admin/maintenance/backfill-approved-at', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const result = await db.execute(sql`
        UPDATE resources
        SET approved_at = created_at
        WHERE status = 'approved' AND approved_at IS NULL AND created_at IS NOT NULL
        RETURNING id
      `);
      const backfilled = (result.rows as any[]).length;
      const remaining = await db.execute(sql`
        SELECT count(*)::int AS n FROM resources
        WHERE status = 'approved' AND approved_at IS NULL
      `);
      await auditRepo.logResourceAudit(
        null,
        'maintenance_backfill_approved_at',
        req.user.claims.sub,
        { backfilled },
        `Backfilled approved_at from created_at on ${backfilled} approved resources`
      );
      res.json({ backfilled, remainingNull: (remaining.rows as any[])[0].n });
    } catch (error) {
      console.error('Error backfilling approved_at:', error);
      res.status(500).json({ message: 'Failed to backfill approved_at' });
    }
  });

  // Run23 NB-055: tag-value casing chaos — the same tag exists in up to three
  // spellings (FFMPEG/FFmpeg/ffmpeg, NGINX/Nginx/nginx, ...), splitting filter
  // facets. Canonicalize every family (grouped case-insensitively) to one
  // spelling: a curated brand map wins; otherwise the most frequent spelling
  // in the corpus (ties broken lexicographically) so reruns are deterministic.
  // Idempotent: second run updates 0 resources.
  // Run24 R5-063 + NB-015: canonicalization now also folds separator variants
  // (live streaming/live_streaming/live-streaming), merges singular/plural
  // families, and applies the extended brand-casing map. Logic lives in
  // server/lib/tagCanonicalize.ts.
  app.post('/api/admin/maintenance/canonicalize-tags', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const rowsResult = await db.execute(sql`
        SELECT id, metadata->'tags' AS tags
        FROM resources
        WHERE status = 'approved'
          AND jsonb_typeof(metadata->'tags') = 'array'
          AND jsonb_array_length(metadata->'tags') > 0
      `);
      const rows = rowsResult.rows as Array<{ id: number; tags: string[] }>;

      const allTags: string[] = [];
      for (const r of rows) {
        for (const t of r.tags) if (typeof t === 'string') allTags.push(t);
      }
      const { canonicalByRaw, variantFamilies, pluralMerges } = buildCanonicalTagMap(allTags);

      // Rewrite arrays that change (canonicalize + dedupe, keep order).
      let resourcesUpdated = 0;
      for (const r of rows) {
        const next = canonicalizeTagArray(r.tags, canonicalByRaw);
        if (JSON.stringify(next) !== JSON.stringify(r.tags)) {
          await db.execute(sql`
            UPDATE resources
            SET metadata = jsonb_set(metadata, '{tags}', ${JSON.stringify(next)}::jsonb)
            WHERE id = ${r.id}
          `);
          resourcesUpdated++;
        }
      }
      await auditRepo.logResourceAudit(
        null,
        'maintenance_canonicalize_tags',
        req.user.claims.sub,
        { variantFamilies, pluralMerges, resourcesUpdated },
        `Canonicalized tags: ${variantFamilies} variant families, ${pluralMerges} plural merges, ${resourcesUpdated} resources rewritten`
      );
      res.json({ variantFamiliesFound: variantFamilies, pluralMerges, resourcesUpdated });
    } catch (error) {
      console.error('Error canonicalizing tags:', error);
      res.status(500).json({ message: 'Failed to canonicalize tags' });
    }
  });

  // ============= Enrichment API Routes =============
  
  // POST /api/enrichment/start - Start batch enrichment job
  app.post('/api/enrichment/start', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { filter = 'unenriched', batchSize = 10 } = req.body;
      const userId = req.user?.claims?.sub;

      // Run15 BUG-019 companion: the client guard alone is bypassable —
      // reject out-of-range batch sizes at the API too.
      const parsedBatchSize = Number(batchSize);
      if (!Number.isInteger(parsedBatchSize) || parsedBatchSize < 1 || parsedBatchSize > 50) {
        return res.status(400).json({
          success: false,
          message: 'Batch size must be an integer between 1 and 50.'
        });
      }

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
      const { prompt, categoryFocus, maxBudgetUsd, maxTurns } = req.body ?? {};

      // R5-021 (run24): full input contract — visible prompt (invisible
      // Unicode runs used to pass .trim()), 4000-char cap (100k-char prompts
      // went straight into the agent context), no control characters, and
      // NUMBER types for the numeric knobs (the old String()-coercion path
      // accepted "5" and friends).
      if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 10) {
        return res.status(400).json({ success: false, message: 'Prompt must be at least 10 characters' });
      }
      if (prompt.length > 4000) {
        return res.status(400).json({ success: false, message: 'Prompt must be at most 4000 characters' });
      }
      if (MULTILINE_CONTROL_RE.test(prompt)) {
        return res.status(400).json({ success: false, message: 'Prompt must not contain control characters' });
      }
      if (BIDI_CONTROL_RE.test(prompt)) {
        return res.status(400).json({ success: false, message: `Prompt ${BIDI_CONTROL_MESSAGE}` });
      }
      if (visibleLength(prompt) < 10) {
        return res.status(400).json({ success: false, message: 'Prompt must contain at least 10 visible characters' });
      }
      if (categoryFocus !== undefined && categoryFocus !== null && categoryFocus !== '') {
        if (typeof categoryFocus !== 'string' || categoryFocus.length > 200 || SINGLE_LINE_CONTROL_RE.test(categoryFocus)) {
          return res.status(400).json({ success: false, message: 'categoryFocus must be a string of at most 200 characters' });
        }
      }

      // Run16 BUG-008: server-side guardrails mirroring the launch form
      // (budget min $0.25, turns 5–100). The API used to accept any value
      // (e.g. maxTurns=301000 / $0 budgets) and silently run with it.
      // Run24 R5-021: unbounded cost amplification — the ceiling is now the
      // spec-mandated $100 cap (raise deliberately in the spec if ever needed).
      let budget = '1.00';
      if (maxBudgetUsd !== undefined && maxBudgetUsd !== null && String(maxBudgetUsd).trim() !== '') {
        const n = Number(maxBudgetUsd);
        if (typeof maxBudgetUsd !== 'number' || !Number.isFinite(n) || n < 0.25) {
          return res.status(400).json({ success: false, message: 'maxBudgetUsd must be a number of at least 0.25' });
        }
        if (n > 100) {
          return res.status(400).json({ success: false, message: 'maxBudgetUsd must be at most 100' });
        }
        budget = n.toFixed(2);
      }
      let turns = 30;
      if (maxTurns !== undefined && maxTurns !== null && String(maxTurns).trim() !== '') {
        const n = Number(maxTurns);
        if (typeof maxTurns !== 'number' || !Number.isInteger(n) || n < 5 || n > 100) {
          return res.status(400).json({ success: false, message: 'maxTurns must be an integer between 5 and 100' });
        }
        turns = n;
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
        maxBudgetUsd: budget,
        maxTurns: turns,
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
      // Run23 NB-039: ship the total alongside the latest-20 list so the UI
      // can say "showing latest 20 of N" instead of silently truncating.
      const [jobs, total] = await Promise.all([
        researchService.listJobs(),
        researchService.countJobs(),
      ]);
      res.json({ jobs: jobs.map(stripJobAuthSecret), total });
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
  // Run16 BUG-002: the unfiltered awesome-list payload is ~2.7MB and was
  // rebuilt from the DB on every request. Cache the serialized tree for 60s
  // and answer conditional requests with 304 via a strong content-hash ETag
  // (compression middleware already gzips the 200 path). Filtered requests
  // (rare, admin/deep-link only) bypass the cache. Staleness ceiling after an
  // admin edit is the 60s TTL — acceptable for a read-mostly catalog.
  let awesomeListCache: { body: string; etag: string; builtAt: number } | null = null;
  const AWESOME_LIST_TTL_MS = 60_000;

  // R4-031: the heaviest public read now shares the resource-read rate limit
  // (100 req/min/IP, 429 + Retry-After) — the server cache + ETag/304 make
  // real browsing cheap, so only scripted hammering ever hits the cap.
  app.get("/api/awesome-list", resourceReadLimiter, async (req, res) => {
    try {
      // Extract query parameters for filtering
      const { category, subcategory, subSubcategory } = req.query;
      const isUnfiltered = !category && !subcategory && !subSubcategory;

      if (isUnfiltered && awesomeListCache && Date.now() - awesomeListCache.builtAt < AWESOME_LIST_TTL_MS) {
        res.set('ETag', awesomeListCache.etag);
        res.set('Cache-Control', 'public, max-age=0, must-revalidate');
        if (req.headers['if-none-match'] === awesomeListCache.etag) {
          return res.status(304).end();
        }
        return res.type('application/json').send(awesomeListCache.body);
      }

      // Use database-driven hierarchy (replaces static JSON)
      const data = await legacyRepo.getAwesomeListFromDatabase();
      
      if (!data || !data.resources || data.resources.length === 0) {
        console.warn('⚠️ No resources in database - database may need seeding');
        return res.status(500).json({ message: 'No awesome list data available' });
      }

      if (isUnfiltered) {
        const body = JSON.stringify(data);
        const etag = '"' + crypto.createHash('sha1').update(body).digest('hex') + '"';
        awesomeListCache = { body, etag, builtAt: Date.now() };
        res.set('ETag', etag);
        res.set('Cache-Control', 'public, max-age=0, must-revalidate');
        if (req.headers['if-none-match'] === etag) {
          return res.status(304).end();
        }
        console.log(`📊 /api/awesome-list: ${data.resources.length} resources, ${data.categories.length} categories (cache rebuild)`);
        return res.type('application/json').send(body);
      }

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
      res.status(500).json({ message: 'Failed to process awesome list' });
    }
  });

  // Run22 BUG-008: lightweight taxonomy/nav payload. The sidebar, header
  // breadcrumbs, and resource-detail slug resolution only need names, slugs,
  // and per-node counts — but every cold page load was pulling the full
  // ~2.7MB corpus for them. This serves a ~few-KB tree with the same 60s
  // TTL + ETag/304 discipline as the corpus route, so pages that don't
  // render resource listings never download the corpus at all.
  let awesomeListNavCache: { body: string; etag: string; builtAt: number } | null = null;
  app.get("/api/awesome-list/nav", resourceReadLimiter, async (req, res) => {
    try {
      if (awesomeListNavCache && Date.now() - awesomeListNavCache.builtAt < AWESOME_LIST_TTL_MS) {
        res.set('ETag', awesomeListNavCache.etag);
        res.set('Cache-Control', 'public, max-age=0, must-revalidate');
        if (req.headers['if-none-match'] === awesomeListNavCache.etag) {
          return res.status(304).end();
        }
        return res.type('application/json').send(awesomeListNavCache.body);
      }

      const data = await legacyRepo.getAwesomeListFromDatabase();
      if (!data || !data.categories || data.categories.length === 0) {
        return res.status(500).json({ message: 'No awesome list data available' });
      }

      // Run23 R-06: each category carries a tiny teaser (first direct
      // resource's title/description) so the Home grid renders card blurbs
      // from the nav tree alone — without downloading the full corpus.
      const nav = {
        title: data.title,
        totalResources: (data.resources || []).length,
        categories: (data.categories || []).map((cat: any) => ({
          name: cat.name,
          slug: cat.slug,
          resourceCount: (cat.resources || []).length,
          teaser: cat.resources?.[0]
            ? {
                title: String(cat.resources[0].title || ''),
                description: String(cat.resources[0].description || '').slice(0, 200),
              }
            : undefined,
          subcategories: (cat.subcategories || []).map((sub: any) => ({
            name: sub.name,
            slug: sub.slug,
            resourceCount: (sub.resources || []).length,
            subSubcategories: (sub.subSubcategories || []).map((ss: any) => ({
              name: ss.name,
              slug: ss.slug,
              resourceCount: (ss.resources || []).length,
            })),
          })),
        })),
      };

      const body = JSON.stringify(nav);
      const etag = '"' + crypto.createHash('sha1').update(body).digest('hex') + '"';
      awesomeListNavCache = { body, etag, builtAt: Date.now() };
      res.set('ETag', etag);
      res.set('Cache-Control', 'public, max-age=0, must-revalidate');
      if (req.headers['if-none-match'] === etag) {
        return res.status(304).end();
      }
      return res.type('application/json').send(body);
    } catch (error) {
      console.error('Error building awesome-list nav:', error);
      res.status(500).json({ message: 'Failed to build navigation tree' });
    }
  });

  // New endpoint to switch lists
  app.post("/api/switch-list", async (req, res) => {
    try {
      const { rawUrl } = req.body;
      
      if (!rawUrl) {
        return res.status(400).json({ message: 'Raw URL is required' });
      }
      
      console.log(`Switching to list: ${rawUrl}`);
      const data = await fetchAwesomeList(rawUrl);
      storage.setAwesomeListData(data);
      
      console.log(`Successfully switched to list with ${data.resources.length} resources`);
      res.json(data);
    } catch (error) {
      console.error('Error switching list:', error);
      res.status(500).json({ message: 'Failed to switch list' });
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
      res.status(500).json({ message: 'Failed to fetch awesome lists' });
    }
  });

  // NB-006 (run23): this proxy hits GitHub's search API, which is a shared
  // 10-req/min quota per IP when unauthenticated. It only serves the admin
  // GitHub-import discovery surface, so require admin (anonymous → 401) and
  // send the server-side token from searchAwesomeLists when configured.
  app.get("/api/github/search", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const query = req.query.q as string;
      const page = Math.min(Math.max(parseInt(req.query.page as string) || 1, 1), 50);

      if (!query) {
        return res.status(400).json({ message: 'Search query is required' });
      }
      
      const result = await searchAwesomeLists(query, page);
      res.json(result);
    } catch (error) {
      console.error('Error searching awesome lists:', error);
      res.status(500).json({ message: 'Failed to search awesome lists' });
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
      res.status(500).json({ message: 'Failed to initialize recommendations' });
    }
  });

  // NB-007/NB-015 (run23): recommendation responses embed full resource rows —
  // they must pass the same public serializer as every other resource surface.
  const stripRecommendationInternals = (items: any[]): any[] =>
    (items || []).map((r) =>
      r && typeof r === 'object' && r.resource
        ? { ...r, resource: stripInternalResourceFields(r.resource) }
        : r
    );

  // Learning-path payloads carry resources at the top level and inside
  // milestones — strip both.
  const stripPathInternals = (p: any): any => {
    if (!p || typeof p !== 'object') return p;
    const out: any = { ...p };
    if (Array.isArray(out.resources)) {
      out.resources = out.resources.map(stripInternalResourceFields);
    }
    if (Array.isArray(out.milestones)) {
      out.milestones = out.milestones.map((m: any) =>
        m && typeof m === 'object' && Array.isArray(m.resources)
          ? { ...m, resources: m.resources.map(stripInternalResourceFields) }
          : m
      );
    }
    return out;
  };

  // NB-007 (run23): limit must be validated — ?limit=500 returned 500 rows and
  // ?limit=-5 fell through to the entire corpus. 400 on invalid, cap at 50.
  const parseRecommendationLimit = (raw: unknown, fallback: number): number | null => {
    if (raw === undefined || raw === '') return fallback;
    const parsed = parseBoundedInt(raw);
    if (parsed === null) return null;
    return Math.min(parsed, 50);
  };

  // GET /api/recommendations - Get personalized recommendations
  app.get("/api/recommendations", async (req, res) => {
    try {
      const limit = parseRecommendationLimit(req.query.limit, 10);
      if (limit === null) {
        return res.status(400).json({ message: 'limit must be a positive integer (max 50)' });
      }
      
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

      // NB-015 (run23): pass embedded resources through the public serializer.
      res.json(stripRecommendationInternals(result.recommendations || []));
    } catch (error) {
      console.error('Error generating recommendations:', error);
      res.status(500).json({ message: 'Failed to generate recommendations' });
    }
  });

  // POST /api/recommendations - Get personalized recommendations for authenticated users
  app.post("/api/recommendations", async (req, res) => {
    try {
      const userProfile: AIUserProfile = req.body;
      // NB-007 (run23): same limit validation as the GET.
      const limit = parseRecommendationLimit(req.query.limit, 10);
      if (limit === null) {
        return res.status(400).json({ message: 'limit must be a positive integer (max 50)' });
      }
      const forceRefresh = req.query.refresh === 'true';

      const result = await recommendationEngine.generateRecommendations(
        userProfile,
        limit,
        forceRefresh,
        false // learning paths aren't used by this endpoint — skip the blocking AI call
      );

      // NB-015 (run23): pass embedded resources through the public serializer.
      res.json(stripRecommendationInternals(result.recommendations || []));
    } catch (error) {
      console.error('Error generating AI recommendations:', error);
      res.status(500).json({ message: 'Failed to generate recommendations' });
    }
  });

  // POST /api/recommendations/feedback - Record user feedback on recommendations
  // NB-016 (run23): was an unauthenticated write with a spoofable body userId —
  // the sibling /api/interactions was hardened in Run22 but this was missed.
  // Require a session and derive the identity from it; body userId is ignored.
  app.post("/api/recommendations/feedback", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { resourceId, feedback, rating } = req.body ?? {};

      // R5-019 (run24): a body userId that contradicts the session is an
      // explicit spoof attempt — refuse loudly instead of silently ignoring.
      if (req.body?.userId !== undefined && req.body.userId !== userId) {
        return res.status(403).json({ message: 'userId does not match the authenticated session' });
      }

      // R5-019: full contract — bounded existing resourceId (strings/1e20/
      // floats used to flow into PG), feedback enum, bounded integer rating.
      const rid = parseIntInRange(resourceId, { min: 1 });
      if (rid === null) {
        return res.status(400).json({ message: 'resourceId must be a positive integer' });
      }
      if (feedback !== 'clicked' && feedback !== 'dismissed' && feedback !== 'completed') {
        return res.status(400).json({ message: "feedback must be one of 'clicked', 'dismissed', 'completed'" });
      }
      if (rating !== undefined && rating !== null) {
        if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) {
          return res.status(400).json({ message: 'rating must be an integer between 1 and 5' });
        }
      }
      const target = await resourceRepo.getResource(rid);
      if (!target) {
        return res.status(404).json({ message: 'Resource not found' });
      }

      // Record the feedback
      await recommendationEngine.recordFeedback(
        userId,
        rid,
        feedback,
        rating ?? undefined
      );

      res.json({ status: 'success', message: 'Feedback recorded' });
    } catch (error) {
      console.error('Error recording recommendation feedback:', error);
      res.status(500).json({ message: 'Failed to record feedback' });
    }
  });

  // POST /api/recommendations/:resourceId/feedback - Record thumbs up/down feedback on a recommendation
  app.post("/api/recommendations/:resourceId/feedback", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        // BUG-051 (run14): canonical 401 envelope.
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // R5-019/020 (run24): bound to int4 (parseInt accepted 1e20-style ids
      // that overflow inside PG) and require the resource to exist.
      const resourceId = parseIntInRange(req.params.resourceId, { min: 1 });
      if (resourceId === null) {
        return res.status(400).json({ message: 'Invalid resource id' });
      }

      const { feedback } = req.body ?? {};
      if (feedback !== 'helpful' && feedback !== 'not_helpful') {
        return res.status(400).json({ error: "feedback must be 'helpful' or 'not_helpful'" });
      }

      const target = await resourceRepo.getResource(resourceId);
      if (!target) {
        return res.status(404).json({ message: 'Resource not found' });
      }

      await recommendationEngine.recordDetailedFeedback(userId, resourceId, feedback);

      res.json({ status: 'success', message: 'Feedback recorded' });
    } catch (error) {
      console.error('Error recording recommendation feedback:', error);
      res.status(500).json({ message: 'Failed to record feedback' });
    }
  });

  // GET /api/learning-paths/suggested - Get suggested learning paths
  // NB-002 (run23): every distinct sanitized param combo is a generation cache
  // key, and a miss runs ~15-45s of paid Claude calls. Anonymous requests are
  // therefore PINNED to the boot-warmed default profile — no unauthenticated
  // input can mint a new cache key or trigger generation. Signed-in users get
  // personalization (bounded params) behind the strict aiLimiter.
  app.get("/api/learning-paths/suggested", aiLimiter, async (req: any, res) => {
    try {
      const rawLimit = parseInt(req.query.limit as string);
      const requestedLimit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 5, 1), 10);

      const isAuthed = typeof req.isAuthenticated === "function" && req.isAuthenticated();

      if (!isAuthed) {
        // Must mirror warmDefaultSuggestedPaths() exactly so this always hits
        // the warmed cache entry (key: default profile + limit 5).
        const anonProfile: AIUserProfile = {
          userId: 'anonymous',
          preferredCategories: [],
          skillLevel: 'intermediate',
          learningGoals: [],
          preferredResourceTypes: [],
          timeCommitment: 'flexible',
          viewHistory: [],
          bookmarks: [],
          completedResources: [],
          completedJourneys: [],
          journeyProgress: [],
          ratings: {}
        };
        const paths = await learningPathGenerator.getSuggestedPaths(anonProfile, 5);
        // NB-015 (run23): strip internal resource fields before sending.
        return res.json(paths.slice(0, requestedLimit).map(stripPathInternals));
      }

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

      // Identity comes from the session, never from the query string.
      const userProfile: AIUserProfile = {
        userId: req.user?.claims?.sub || 'anonymous',
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

      const paths = await learningPathGenerator.getSuggestedPaths(userProfile, requestedLimit);

      // NB-015 (run23): strip internal resource fields before sending.
      res.json(paths.map(stripPathInternals));
    } catch (error) {
      console.error('Error generating suggested learning paths:', error);
      res.status(500).json({ message: 'Failed to generate suggested learning paths' });
    }
  });

  // NB-002 (run23): shared sanitizer for body-supplied profiles on the paid
  // generation POSTs — whitelists fields, clamps enums/arrays/lengths, and
  // forces the identity to the session user. Raw client bodies must never
  // reach the generator (unbounded prompt/cache-key material).
  const sanitizeBodyProfile = (body: any, sessionUserId: string): AIUserProfile => {
    const skillLevels = ['beginner', 'intermediate', 'advanced'];
    const timeCommitments = ['daily', 'weekly', 'flexible'];
    const strArr = (v: unknown, maxItems: number, maxLen: number): string[] =>
      Array.isArray(v)
        ? v.filter((x): x is string => typeof x === 'string')
            .map((x) => x.trim())
            .filter(Boolean)
            .slice(0, maxItems)
            .map((x) => x.slice(0, maxLen))
        : [];
    return {
      userId: sessionUserId,
      preferredCategories: strArr(body?.preferredCategories, 10, 100),
      skillLevel: (skillLevels.includes(body?.skillLevel) ? body.skillLevel : 'intermediate'),
      learningGoals: strArr(body?.learningGoals, 5, 100),
      preferredResourceTypes: strArr(body?.preferredResourceTypes, 10, 50),
      timeCommitment: (timeCommitments.includes(body?.timeCommitment) ? body.timeCommitment : 'flexible'),
      viewHistory: [],
      bookmarks: [],
      completedResources: [],
      completedJourneys: [],
      journeyProgress: [],
      ratings: {}
    } as AIUserProfile;
  };

  // POST /api/learning-paths/generate - Generate custom learning path
  // NB-002 (run23): was fully anonymous — any visitor could trigger a paid
  // ~25s Claude generation with arbitrary prompt material. Now requires a
  // signed-in session and rides the strict AI limiter.
  app.post("/api/learning-paths/generate", isAuthenticated, aiLimiter, async (req: any, res) => {
    try {
      const { userProfile, category, customGoals } = req.body ?? {};

      if (!userProfile) {
        return res.status(400).json({ message: 'User profile is required' });
      }

      const sessionUserId = req.user?.claims?.sub;
      const safeProfile = sanitizeBodyProfile(userProfile, sessionUserId);
      const safeCategory = typeof category === 'string' ? category.trim().slice(0, 100) : undefined;
      const safeGoals = Array.isArray(customGoals)
        ? customGoals.filter((g): g is string => typeof g === 'string')
            .map((g) => g.trim()).filter(Boolean).slice(0, 5).map((g) => g.slice(0, 100))
        : undefined;

      const path = await learningPathGenerator.generateLearningPath(
        safeProfile,
        safeCategory,
        safeGoals
      );

      // NB-015 (run23): strip internal resource fields before sending.
      res.json(stripPathInternals(path));
    } catch (error) {
      console.error('Error generating custom learning path:', error);
      res.status(500).json({ message: 'Failed to generate custom learning path' });
    }
  });

  // POST /api/learning-paths - Legacy route for compatibility
  // NB-002 (run23): auth-gated + sanitized like /generate (was: raw body
  // straight into the generator with no auth and no limiter).
  app.post("/api/learning-paths", isAuthenticated, aiLimiter, async (req: any, res) => {
    try {
      const sessionUserId = req.user?.claims?.sub;
      const userProfile = sanitizeBodyProfile(req.body, sessionUserId);
      const rawLimit = parseInt(req.query.limit as string);
      const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 5, 1), 10);

      const paths = await learningPathGenerator.getSuggestedPaths(userProfile, limit);

      // NB-015 (run23): strip internal resource fields before sending.
      res.json(paths.map(stripPathInternals));
    } catch (error) {
      console.error('Error generating AI learning paths:', error);
      res.status(500).json({ message: 'Failed to generate learning paths' });
    }
  });

  // Track user interaction for improving recommendations.
  // Run22 BUG-050: this write endpoint was fully anonymous — any client could
  // POST unlimited events with an arbitrary userId. Interactions only make
  // sense for signed-in users (both client call sites already gate on a
  // logged-in user), so require authentication and derive the identity from
  // the session — the spoofable body `userId` is ignored.
  app.post("/api/interactions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { resourceId, interactionType } = req.body ?? {};
      if (typeof interactionType !== "string" || !interactionType.trim()) {
        return res.status(400).json({ error: "interactionType is required" });
      }

      // Store interaction data (in a real app, this would go to database)
      // For now, we'll just acknowledge the interaction
      console.log(`User interaction: ${userId} ${interactionType} ${resourceId}`);

      res.json({ status: "recorded" });
    } catch (error) {
      console.error('Error recording interaction:', error);
      res.status(500).json({ message: 'Failed to record interaction' });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // AI service health check (documented in docs/AI-SERVICES.md).
  // NB-005/NB-057 (run23): anonymous callers get availability status ONLY.
  // Internal counters (requestCount/cacheSize/cacheHitRate) are admin-only,
  // and ?deep=1 — which spends a real paid Claude round-trip — requires an
  // admin session (anonymous → 401, non-admin → 403). Before this, any
  // visitor could trigger paid API calls in a loop and read internal stats.
  app.get("/api/health/ai", async (req: any, res) => {
    try {
      const stats = claudeService.getStats();
      const deep = req.query.deep === '1' || req.query.deep === 'true';

      const sessionUserId = req.user?.claims?.sub;
      const sessionUser = sessionUserId ? await userRepo.getUser(sessionUserId) : undefined;
      const isAdminUser = !!sessionUser && sessionUser.role === 'admin';

      if (!isAdminUser) {
        if (deep) {
          return sessionUserId
            ? res.status(403).json({ message: 'Forbidden: Admin access required' })
            : res.status(401).json({ message: 'Unauthorized' });
        }
        // Public shape: availability only, no internal counters.
        return res.json({ status: stats.available ? 'healthy' : 'unavailable' });
      }

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

  // Run16 BUG-091: wrong-method requests on existing endpoints used to return
  // 404 as if the path didn't exist. These app.all() handlers sit AFTER the
  // real routes, so they only see methods no real route matched → 405 + Allow.
  // OPTIONS passes through (preflight/introspection stays untouched).
  const PUBLIC_METHOD_ALLOW: Array<[string, string]> = [
    ['/api/resources', 'GET, POST'],
    ['/api/search', 'GET'],
    ['/api/categories', 'GET'],
    ['/api/journeys', 'GET'],
    ['/api/awesome-list', 'GET'],
    ['/api/awesome-list/nav', 'GET'],
  ];
  for (const [routePath, allow] of PUBLIC_METHOD_ALLOW) {
    app.all(routePath, (req, res, next) => {
      if (req.method === 'OPTIONS') return next();
      res.set('Allow', allow);
      res.status(405).json({ message: `Method ${req.method} not allowed. Allowed: ${allow}` });
    });
  }

  // Run16 BUG-091: one "not found" body per semantic — /api/resources/abc used
  // to fall to the generic catch-all ('Not found') while /api/resources/0 said
  // 'Resource not found'. A non-numeric id is still a resource lookup. Non-GET
  // methods on the detail path get 405 like the collections above.
  app.all('/api/resources/:id', (req, res, next) => {
    if (req.method === 'OPTIONS') return next();
    if (req.method === 'GET' || req.method === 'HEAD') {
      return res.status(404).json({ message: 'Resource not found' });
    }
    res.set('Allow', 'GET');
    return res.status(405).json({ message: `Method ${req.method} not allowed. Allowed: GET` });
  });

  // NB-025 / NB-056 (run23): the OpenAPI spec (server/openapi.ts) existed but
  // was never mounted, while docs/API.md and the /api/public/* module header
  // pointed readers at /api/docs (404). Serve the machine-readable spec at
  // /api/openapi.json and a CSP-safe (no external scripts) human-readable
  // index at /api/docs.
  app.get('/api/openapi.json', (_req, res) => {
    res.json(swaggerSpec);
  });
  app.get('/api/docs', (_req, res) => {
    const esc = (s: string) =>
      String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const rows: string[] = [];
    const paths = (swaggerSpec.paths ?? {}) as Record<string, Record<string, any>>;
    for (const [p, methods] of Object.entries(paths)) {
      for (const [method, op] of Object.entries(methods)) {
        rows.push(
          `<tr><td><code>${method.toUpperCase()}</code></td><td><code>${esc(p)}</code></td><td>${esc(op?.summary ?? '')}</td></tr>`
        );
      }
    }
    res
      .status(200)
      .type('html')
      .send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(swaggerSpec.info?.title ?? 'Public API')} — API Documentation</title>
<style>
body{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;background:#0e0d0c;color:#e8e6e3;margin:2rem auto;max-width:60rem;padding:0 1rem;line-height:1.5}
a{color:#ff3d52}table{border-collapse:collapse;width:100%;margin:1rem 0}
td,th{border:1px solid #333;padding:.5rem;text-align:left}code{color:#5eddf2}
</style>
</head>
<body>
<h1>${esc(swaggerSpec.info?.title ?? 'Public API')}</h1>
<p>Version ${esc(swaggerSpec.info?.version ?? '')} — machine-readable spec: <a href="/api/openapi.json">/api/openapi.json</a> (OpenAPI 3.0)</p>
<h2>Endpoints</h2>
<table><thead><tr><th>Method</th><th>Path</th><th>Summary</th></tr></thead><tbody>
${rows.join('\n')}
</tbody></table>
<p>Authentication: optional <code>Authorization: Bearer &lt;api-key&gt;</code> header for higher rate limits. All endpoints answer JSON; errors use a <code>{ "message": string }</code> envelope. Rate-limit state is exposed via <code>RateLimit-*</code> response headers.</p>
</body>
</html>`);
  });

  // JSON 404/405 fallback for unmatched /api/* routes.
  // Must be registered after all other /api/* handlers so it only catches
  // requests that no real route handled. Without this, unknown /api paths
  // would fall through to Vite's HTML catch-all and return a 200 with the
  // React app's HTML, masking client routing typos.
  // NB-049 (run23): if the PATH exists under other methods, answer a uniform
  // 405 + Allow header (canonical {message} envelope) instead of a misleading
  // 404 — DELETE /api/resources/1 and PUT /api/search used to claim the
  // route didn't exist at all.
  app.use('/api', (req, res) => {
    const fullPath = ((req.baseUrl || '') + (req.path || '')).replace(/\/+$/, '') || '/';
    const allowed = new Set<string>();
    // R5-060 (run24): track whether EVERY route registered on this path mounts
    // an auth guard. If so, an anonymous wrong-method probe must get the same
    // 401 the right verb would give — the old unconditional 405 + Allow header
    // let anyone enumerate the admin surface's route + verb map with no session.
    let sawMatch = false;
    let allMatchesRequireAuth = true;
    const stack: any[] = (app as any)._router?.stack ?? [];
    for (const layer of stack) {
      const route = layer?.route;
      if (!route || !layer.regexp) continue;
      if (!layer.regexp.test(fullPath) && !layer.regexp.test(fullPath + '/')) continue;
      sawMatch = true;
      const hasAuthGuard = (route.stack ?? []).some((h: any) => {
        const n = h?.handle?.name || h?.name || '';
        return n === 'isAuthenticated' || n === 'isAdmin';
      });
      if (!hasAuthGuard) allMatchesRequireAuth = false;
      for (const m of Object.keys(route.methods || {})) {
        if (m === '_all') continue;
        allowed.add(m.toUpperCase());
      }
    }
    if (allowed.size > 0 && !allowed.has(req.method)) {
      const isAuthed =
        typeof (req as any).isAuthenticated === 'function' && (req as any).isAuthenticated();
      if (sawMatch && allMatchesRequireAuth && !isAuthed) {
        // Uniform envelope with the real handlers' anonymous answer.
        return res.status(401).json({ message: 'Unauthorized' });
      }
      if (allowed.has('GET')) allowed.add('HEAD');
      const allowHeader = Array.from(allowed).sort().join(', ');
      return res
        .status(405)
        .set('Allow', allowHeader)
        .json({ message: `Method Not Allowed. Allowed: ${allowHeader}` });
    }
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
    const { runOrphanWatchdogStartup, startOrphanWatchdogPeriodic } = await import('./jobs/orphanJobWatchdog');
    await runOrphanWatchdogStartup();
    // Run15 BUG-011: also sweep every 5 minutes so jobs orphaned while the
    // server stays up (worker crash mid-run) don't show "processing" forever.
    startOrphanWatchdogPeriodic();
  } catch (err) {
    console.error('Failed to import/run orphan watchdog (non-fatal):', err);
  }

  // Reconcile the local admin password with the ADMIN_PASSWORD secret on
  // every boot (seedAdminUser only runs when the DB is empty, so this is the
  // only rotation path on a populated deployment). Non-fatal on failure.
  try {
    await syncAdminPasswordFromEnv();
  } catch (err) {
    console.error('Admin password sync failed (non-fatal):', err);
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