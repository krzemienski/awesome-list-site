// One-off: fix confirmed-dead catalog URLs found by the awesome_bot export check.
import { db } from "../server/db";
import { resources } from "../shared/schema";
import { eq } from "drizzle-orm";

const updates: Array<{ id: number; url: string; note: string }> = [
  { id: 185479, url: "https://optiview.dolby.com/docs/theoplayer/how-to-guides/drm/introduction/", note: "THEOplayer docs moved off GitHub; theoplayer.com redirects to Dolby OptiView, so use the final host" },
  { id: 185182, url: "https://en.wikipedia.org/wiki/Real-Time_Messaging_Protocol", note: "adobe.com/devnet/rtmp.html retired; veriskope mirror fails DNS" },
  { id: 185555, url: "https://sourceforge.net/projects/cinepaint/", note: "cinepaint.org DNS dead; SourceForge project page" },
  { id: 187906, url: "https://github.com/ThibaultBee/StreamPack", note: "example.com/x placeholder -> real StreamPack repo" },
  { id: 185469, url: "https://www.haivision.com/white-papers/srt-protocol-technical-overview/", note: "white paper moved; old path 404s once export strips trailing slash" },
  { id: 185129, url: "https://www.panopto.com/features/video-recording/", note: "capture-hardware page 404s slashless; stable recording-features page" },
];

async function main() {
  for (const u of updates) {
    const before = await db.select({ id: resources.id, url: resources.url }).from(resources).where(eq(resources.id, u.id));
    if (!before.length) { console.log(`SKIP ${u.id}: not found`); continue; }
    await db.update(resources).set({ url: u.url, updatedAt: new Date() }).where(eq(resources.id, u.id));
    console.log(`OK ${u.id}: ${before[0].url} -> ${u.url} (${u.note})`);
  }
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
