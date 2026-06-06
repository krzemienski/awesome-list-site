// Responsive breakpoint matrix — real captures per the TEST-PLAN per-breakpoint procedure.
// Screens × breakpoints (320/375/768/1024/1280/1440/1920). Each is a real browser render
// with an overflow assertion. Dataset-agnostic (slug routes + resolved detail id).
export default async function (page, _ctx, h) {
  const R = {};
  const BPS = [320, 375, 768, 1024, 1280, 1440, 1920];
  const detail = await h.rid('subcategory=Codecs');
  const screens = [
    { slug: 'home', path: '/' },
    { slug: 'category', path: '/category/encoding-codecs' },
    { slug: 'subcategory', path: '/subcategory/codecs' },
    { slug: 'subsubcategory', path: '/sub-subcategory/hevc' },
    { slug: 'detail', path: '/resource/' + detail.id },
    { slug: 'advanced', path: '/advanced' },
    { slug: 'about', path: '/about' },
    { slug: 'login', path: '/login' },
    { slug: '404', path: '/this-route-does-not-exist-xyz' },
  ];
  for (const s of screens) {
    R[s.slug] = {};
    for (const bp of BPS) {
      await page.setViewportSize({ width: bp, height: 900 });
      await h.goto(s.path);
      const overflow = await page.evaluate(() => {
        const de = document.documentElement;
        return de.scrollWidth - de.clientWidth;
      });
      await h.shot(`BP-${s.slug}-${bp}.png`);
      R[s.slug][bp] = { overflow, ok: overflow <= 1 };
    }
  }
  h.log('BPMATRIX:', JSON.stringify(R, null, 1));
}
