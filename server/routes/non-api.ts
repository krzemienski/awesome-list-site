/**
 * ----------------------------------------------------------------------------
 * NON-API.TS - Non-/api Public Asset Route Registrar
 * ----------------------------------------------------------------------------
 *
 * Domain router module extracted from server/routes.ts (Task #303). It mounts
 * the public, non-`/api` asset routes that were previously registered inline
 * inside registerRoutes() (former routes.ts lines ~7417-7457):
 *
 *   - RFC 9116 security.txt        (/.well-known/security.txt, /security.txt)
 *   - OG image cross-origin header (/og-image.png, /og-image.svg CORP)
 *   - SEO routes                   (/sitemap.xml, /og-image.svg, /og-image.png)
 *
 * The route handlers depend on several helper functions that live at the top of
 * routes.ts. Per the extraction contract, those helpers are copied VERBATIM
 * into this module (sendOperationalFailure, xmlEscape, generateSitemap,
 * buildOgSvg, resolveOgParams + OgParams, generateOpenGraphImage,
 * generateOpenGraphImagePng). Repository dependencies are injected through the
 * registrar context so nothing is re-instantiated here. Behavior and route
 * ordering are preserved exactly.
 * ----------------------------------------------------------------------------
 */

import type { Express, Request, Response } from "express";
import { SITE_URL, resolveOgImageMeta } from "../og-middleware";
// BUG-012 (audit 2): the sitemap's paginated-URL counts must use the exact
// flatten + page size the SSR renderer and client use (indexable == sitemap).
import {
  flattenListingResources,
  LISTING_PAGE_SIZE,
  type ListingLevel,
} from "../seo-content";
import {
  TAG_LANDING_MIN_RESOURCES,
  tagLandingPath,
} from "@shared/tagNormalize";
import { isDatabaseUnavailableError } from "../db/errors";
import { ServiceUnavailableError } from "../middleware/errors";
import type {
  CategoryRepository,
  LegacyRepository,
  LearningJourneyRepository,
  ResourceRepository,
} from "../repositories";

/**
 * Dependencies the non-api handlers need from the composing module. These
 * mirror the repository instances that live in the registerRoutes() closure so
 * the extracted (copied) helpers keep behaving identically.
 */
export interface NonApiRouteContext {
  legacyRepo: LegacyRepository;
  learningJourneyRepo: LearningJourneyRepository;
  resourceRepo: ResourceRepository;
  categoryRepo: CategoryRepository;
}

/**
 * Registers the non-`/api` public asset routes onto `app`.
 * Ordering is identical to the original inline registration.
 */
export function registerNonApiRoutes(
  app: Express,
  context: NonApiRouteContext,
): void {
  const { legacyRepo, learningJourneyRepo, resourceRepo, categoryRepo } = context;

  // --------------------------------------------------------------------------
  // Helper functions copied verbatim from the top of server/routes.ts. They
  // are scoped inside the registrar so they can close over the injected
  // repositories (legacyRepo / learningJourneyRepo), exactly like the original
  // module-level functions closed over the module-level repo instances.
  // --------------------------------------------------------------------------

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

    const sitemapDate = (value: unknown): string | undefined => {
      if (!value) return undefined;
      const date = value instanceof Date ? value : new Date(String(value));
      return Number.isFinite(date.getTime())
        ? date.toISOString().slice(0, 10)
        : undefined;
    };
    const latestDate = (records: any[]): string | undefined => {
      let latest = -Infinity;
      for (const record of records) {
        const time = record?.updatedAt
          ? new Date(record.updatedAt).getTime()
          : NaN;
        if (Number.isFinite(time)) latest = Math.max(latest, time);
      }
      return Number.isFinite(latest)
        ? sitemapDate(new Date(latest))
        : undefined;
    };
    const addUrl = (
      path: string,
      changefreq: string,
      priority: string,
      lastmod?: unknown,
    ) => {
      if (seenLocs.has(path)) return;
      seenLocs.add(path);
      const date = sitemapDate(lastmod);
      urls.push(`  <url>
    <loc>${xmlEscape(baseUrl + path)}</loc>
${date ? `    <lastmod>${date}</lastmod>\n` : ""}    <changefreq>${changefreq}</changefreq>
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
      const [
        awesomeListData,
        approvedResourceResult,
        categoryRecords,
        subcategoryRecords,
        subSubcategoryRecords,
      ] = await Promise.all([
        legacyRepo.getAwesomeListFromDatabase(),
        resourceRepo.listResources({
          status: "approved",
          limit: 10_000,
          sort: "newest",
          includeFacets: true,
        }),
        categoryRepo.listCategories(),
        categoryRepo.listSubcategories(),
        categoryRepo.listSubSubcategories(),
      ]);
      const resourceById = new Map(
        approvedResourceResult.resources.map((resource) => [resource.id, resource]),
      );
      const datedResources = (records: any[]): any[] =>
        records.map((record) => resourceById.get(Number(record.id)) ?? record);

      const resourceIdsOf = (node: any): number[] =>
        (node?.resources ?? []).map((r: any) => Number(r.id)).filter((n: number) => Number.isFinite(n));

      // BUG-012 (audit 2): paginated listing URLs (?page=2..N) are indexable —
      // each self-canonicalizes in og-middleware — so the sitemap must list
      // them too (indexable set == sitemap set). Page counts use THE SAME
      // flatten + dedupe + page size as the SSR renderer and the client
      // (seo-content.ts flattenListingResources / LISTING_PAGE_SIZE), so the
      // sitemap never lists a page the resolver would 404. Slugs can repeat
      // across parents (R3-05) and the resolver always resolves the FIRST tree
      // match — `firstSeen` keeps a later same-slug node from contributing
      // deeper page numbers than the resolved node actually has.
      const addListingPages = (
        basePath: string,
        node: any,
        level: ListingLevel,
        changefreq: string,
        scopeLastmod: string | undefined,
      ) => {
        const resources = flattenListingResources(node, level);
        const totalPages = Math.ceil(resources.length / LISTING_PAGE_SIZE);
        for (let p = 2; p <= totalPages; p++) {
          addUrl(
            `${basePath}?page=${p}`,
            changefreq,
            '0.4',
            scopeLastmod,
          );
        }
      };
      awesomeListData?.categories?.forEach(category => {
        const categoryRecord = categoryRecords.find(
          (record) => record.slug === category.slug,
        );
        const categorySubcategoryRecords = categoryRecord
          ? subcategoryRecords.filter((record) => record.categoryId === categoryRecord.id)
          : [];
        const categorySubcategoryIds = new Set(
          categorySubcategoryRecords.map((record) => record.id),
        );
        const categorySubSubcategoryRecords = subSubcategoryRecords.filter(
          (record) =>
            record.subcategoryId != null &&
            categorySubcategoryIds.has(record.subcategoryId),
        );
        const categoryLastmod = latestDate([
          categoryRecord,
          ...categorySubcategoryRecords,
          ...categorySubSubcategoryRecords,
          ...datedResources(flattenListingResources(category, 'category')),
        ]);
        const catBase = `/category/${category.slug}`;
        const catFirstSeen = !seenLocs.has(catBase);
        addUrl(
          catBase,
          'weekly',
          '0.7',
          categoryLastmod,
        );
        if (catFirstSeen) {
          addListingPages(catBase, category, 'category', 'weekly', categoryLastmod);
        }
        category.subcategories?.forEach(subcategory => {
          const subcategoryRecord = categoryRecord
            ? subcategoryRecords.find(
                (record) =>
                  record.categoryId === categoryRecord.id &&
                  record.slug === subcategory.slug,
              )
            : undefined;
          const subcategorySubSubcategoryRecords = subcategoryRecord
            ? subSubcategoryRecords.filter(
                (record) => record.subcategoryId === subcategoryRecord.id,
              )
            : [];
          const subcategoryLastmod = latestDate([
            subcategoryRecord,
            ...subcategorySubSubcategoryRecords,
            ...datedResources(flattenListingResources(subcategory, 'subcategory')),
          ]);
          const subBase = `/subcategory/${subcategory.slug}`;
          const subFirstSeen = !seenLocs.has(subBase);
          addUrl(
            subBase,
            'weekly',
            '0.6',
            subcategoryLastmod,
          );
          if (subFirstSeen) {
            addListingPages(
              subBase,
              subcategory,
              'subcategory',
              'weekly',
              subcategoryLastmod,
            );
          }
          subcategory.subSubcategories?.forEach(subSubcategory => {
            // BUG-053 (run14): an empty sub-subcategory renders "No resources
            // found" and has no inbound link from its parent page — keep such
            // orphans OUT of the sitemap (sitemap set == reachable content set).
            if (resourceIdsOf(subSubcategory).length === 0) return;
            const subSubcategoryRecord = subcategoryRecord
              ? subSubcategoryRecords.find(
                  (record) =>
                    record.subcategoryId === subcategoryRecord.id &&
                    record.slug === subSubcategory.slug,
                )
              : undefined;
            const subSubcategoryLastmod = latestDate([
              subSubcategoryRecord,
              ...datedResources(
                flattenListingResources(subSubcategory, 'sub-subcategory'),
              ),
            ]);
            const ssBase = `/sub-subcategory/${subSubcategory.slug}`;
            const ssFirstSeen = !seenLocs.has(ssBase);
            addUrl(
              ssBase,
              'weekly',
              '0.5',
              subSubcategoryLastmod,
            );
            if (ssFirstSeen) {
              addListingPages(
                ssBase,
                subSubcategory,
                'sub-subcategory',
                'weekly',
                subSubcategoryLastmod,
              );
            }
          });
        });
      });

      awesomeListData?.resources?.forEach(resource => {
        addUrl(
          `/resource/${resource.id}`,
          'monthly',
          '0.5',
          resourceById.get(Number(resource.id))?.updatedAt,
        );
      });

      // Canonical tag landing pages. The facet query uses the same normalized
      // tag identity and approved-resource predicate as /tag/:slug resolution.
      for (const tag of approvedResourceResult.facets?.tags ?? []) {
        if (tag.count < TAG_LANDING_MIN_RESOURCES) continue;
        const basePath = tagLandingPath(tag.value);
        addUrl(basePath, 'weekly', '0.5');
        const totalPages = Math.ceil(tag.count / LISTING_PAGE_SIZE);
        for (let page = 2; page <= totalPages; page++) {
          addUrl(`${basePath}?page=${page}`, 'weekly', '0.4');
        }
      }
    } catch (error) {
      console.error('Error adding category/resource URLs to sitemap:', error);
    }

    // Published learning journeys.
    try {
      const journeys = await learningJourneyRepo.listLearningJourneys();
      journeys?.forEach(journey => {
        addUrl(`/journey/${journey.id}`, 'weekly', '0.6', journey.updatedAt);
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
    <!-- AV monogram tile — official Inverted Monogram (brand/): black rx16/76
         tile, crimson border + crimson AV. 56px render of the 76-unit grid
         (rx 16*56/76≈12, stroke 4*56/76≈3, AV 34*56/76≈25, baseline 51*56/76≈38). -->
    <rect x="1.5" y="1.5" width="53" height="53" rx="12" fill="#000000" stroke="#ff3d52" stroke-width="3" />
    <text x="28" y="38" font-family="'Inter','Helvetica Neue',sans-serif"
          font-size="25" font-weight="800" fill="#ff3d52"
          text-anchor="middle" letter-spacing="-0.7">AV</text>

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
    const data = await legacyRepo.getAwesomeListFromDatabase();
    count = `${data?.resources?.length ?? 2000}+`;
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
      sendOperationalFailure(res, error, 'Error generating image');
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
      sendOperationalFailure(res, error, 'Error generating image');
    }
  }

  // --------------------------------------------------------------------------
  // Route registrations (copied verbatim from routes.ts ~7417-7457).
  // --------------------------------------------------------------------------

  // Audit 2 BUG-056: RFC 9116 security contact. Served from a route (not a
  // static file) so the Expires field is always ~6 months out — a stale
  // static Expires would invalidate the whole record. GitHub private
  // vulnerability reporting is DISABLED on both project repos (verified
  // 2026-08-03 via the REST API), so Contact points at the public issue
  // tracker the site already advertises on /about.
  const serveSecurityTxt = (_req: Request, res: Response) => {
    const siteUrl = (process.env.PUBLIC_SITE_URL || "https://awesome.video")
      .replace(/\/$/, "");
    const expires = new Date(
      Date.now() + 180 * 24 * 60 * 60 * 1000,
    ).toISOString();
    res
      .set("Cache-Control", "public, max-age=86400")
      .type("text/plain; charset=utf-8")
      .send(
        [
          "Contact: https://github.com/krzemienski/awesome-video/issues",
          `Expires: ${expires}`,
          "Preferred-Languages: en",
          `Canonical: ${siteUrl}/.well-known/security.txt`,
          "",
        ].join("\n"),
      );
  };
  app.get("/.well-known/security.txt", serveSecurityTxt);
  // Legacy fallback location (RFC 9116 §3 recommends serving both).
  app.get("/security.txt", serveSecurityTxt);

  // Audit 2 BUG-054: OG images exist to be consumed cross-site (link
  // unfurlers, forums hotlinking the preview) — override the site-wide
  // CORP: same-origin from server/index.ts for exactly these two assets.
  app.get(["/og-image.png", "/og-image.svg"], (_req, res, next) => {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    next();
  });

  // SEO routes
  app.get("/sitemap.xml", generateSitemap);
  app.get("/og-image.svg", generateOpenGraphImage);
  app.get("/og-image.png", generateOpenGraphImagePng);
}
