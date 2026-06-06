// SEO + OpenGraph + slug-title route helpers, extracted from routes.ts.
// These build the sitemap, OG images, and human-readable titles from slugs.
import { legacyRepo, resourceRepo } from "./deps";

// SEO route handlers - now uses database-driven data
export async function generateSitemap(req: any, res: any) {
  try {
    const awesomeListData = await legacyRepo.getAwesomeListFromDatabase();
    
    if (!awesomeListData || !awesomeListData.categories.length) {
      return res.status(404).send('Sitemap not available - database empty');
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const currentDate = new Date().toISOString().split('T')[0];

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/advanced</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;

    // Add category URLs from database
    awesomeListData.categories.forEach(category => {
      sitemap += `
  <url>
    <loc>${baseUrl}/category/${category.slug}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
      
      // Add subcategory URLs
      category.subcategories?.forEach(subcategory => {
        sitemap += `
  <url>
    <loc>${baseUrl}/subcategory/${subcategory.slug}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
        
        // Add sub-subcategory URLs
        subcategory.subSubcategories?.forEach(subSubcategory => {
          sitemap += `
  <url>
    <loc>${baseUrl}/sub-subcategory/${subSubcategory.slug}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>`;
        });
      });
    });

    // Add individual resource detail pages. These are the deepest indexable
    // content (one per approved resource) and were previously absent from the
    // sitemap, leaving search engines no signal to discover them.
    const { resources } = await resourceRepo.listResources({
      page: 1,
      limit: 100000,
      status: 'approved',
    });
    resources.forEach(resource => {
      sitemap += `
  <url>
    <loc>${baseUrl}/resource/${resource.id}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.4</priority>
  </url>`;
    });

    sitemap += `
</urlset>`;

    res.set('Content-Type', 'application/xml');
    res.send(sitemap);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
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
export function buildOgSvg(pageTitle: string, category: string | undefined, count: string): string {
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
          letter-spacing="1">new.awesome.video</text>
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

export async function resolveOgParams(req: any) {
  const { title, category, resourceCount } = req.query as Record<string, string | undefined>;
  let pageTitle = title;
  let count = resourceCount;
  if (!pageTitle || !count) {
    try {
      const data = await legacyRepo.getAwesomeListFromDatabase();
      if (!pageTitle) pageTitle = 'Awesome Video';
      if (!count) count = `${data?.resources?.length ?? 2600}+`;
    } catch {
      pageTitle = pageTitle || 'Awesome Video';
      count = count || '2600+';
    }
  }
  return { pageTitle: pageTitle!, category, count: count! };
}

export async function generateOpenGraphImage(req: any, res: any) {
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
export async function generateOpenGraphImagePng(req: any, res: any) {
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
export function getCategoryTitleFromSlug(slug: string): string {
  const categoryMap: { [key: string]: string } = {
    'community-events': 'Community & Events',
    'encoding-codecs': 'Encoding & Codecs',
    'general-tools': 'General Tools',
    'infrastructure-delivery': 'Infrastructure & Delivery',
    'intro-learning': 'Intro & Learning',
    'media-tools': 'Media Tools',
    'players-clients': 'Players & Clients',
    'protocols-transport': 'Protocols & Transport',
    'standards-industry': 'Standards & Industry'
  };
  return categoryMap[slug] || slug;
}

export function getSubcategoryTitleFromSlug(slug: string): string {
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

export function getSubSubcategoryTitleFromSlug(slug: string): string {
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
