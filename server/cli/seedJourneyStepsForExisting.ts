import { storage } from "../storage";

interface StepTemplate {
  title: string;
  description: string;
}

interface JourneyPlan {
  journeyTitle: string;
  category: string;
  searchKeywords: string[];
  steps: StepTemplate[];
}

const JOURNEY_PLANS: JourneyPlan[] = [
  {
    journeyTitle: "Video Streaming Fundamentals",
    category: "Introduction & Learning",
    searchKeywords: ["intro", "fundamental", "beginner", "learning", "tutorial", "basics", "guide", "primer", "overview"],
    steps: [
      { title: "Introduction to Video Streaming", description: "Get oriented with the core concepts of digital video delivery: containers, codecs, bitrates, and how a video gets from a camera to a viewer's screen." },
      { title: "Understanding Video Codecs", description: "Compare H.264, HEVC, VP9 and AV1. Learn why codec choice impacts quality, file size, device support and licensing cost." },
      { title: "Streaming Protocols Overview", description: "Walk through HLS, DASH, RTMP and WebRTC. Understand which protocol fits live, on-demand and ultra-low-latency use cases." },
      { title: "Players and Playback Basics", description: "Explore how HTML5 players, MSE and adaptive bitrate switching deliver smooth playback across devices and network conditions." },
      { title: "Video Formats and Containers", description: "Demystify MP4, fMP4, MKV, WebM and TS containers — what they hold, when to use each, and how they pair with codecs." },
      { title: "Putting It All Together", description: "Trace a complete streaming pipeline from ingest to playback so you can reason about every link in the chain before going deeper." },
    ],
  },
  {
    journeyTitle: "Building Your First Streaming Platform",
    category: "Infrastructure & Delivery",
    searchKeywords: ["platform", "server", "cdn", "encoding", "infrastructure", "delivery", "origin", "transcode", "pipeline"],
    steps: [
      { title: "Planning Your Streaming Architecture", description: "Sketch the building blocks of a streaming platform: ingest, transcoder, packager, origin, CDN and player. Decide on live vs VOD scope." },
      { title: "Setting Up Streaming Servers", description: "Stand up an origin/ingest server (nginx-rtmp, MediaMTX, or similar) and verify you can publish and pull a test stream end-to-end." },
      { title: "Building the Encoding Pipeline", description: "Configure a multi-bitrate ladder, segment for HLS/DASH and learn the trade-offs between CPU cost, latency and output quality." },
      { title: "CDN Integration & Caching", description: "Front your origin with a CDN, tune cache headers for segments vs manifests, and measure delivery performance from multiple regions." },
      { title: "Player Implementation", description: "Embed an adaptive player, wire up basic analytics events and confirm graceful degradation on poor networks." },
      { title: "Testing, Monitoring and Optimization", description: "Load-test the pipeline, set up QoE monitoring (rebuffer ratio, startup time) and iterate on bottlenecks before launch." },
    ],
  },
  {
    journeyTitle: "FFMPEG Mastery",
    category: "Encoding & Codecs",
    searchKeywords: ["ffmpeg", "transcode", "encoding", "filter", "command", "convert", "x264", "x265", "libav"],
    steps: [
      { title: "FFmpeg Fundamentals", description: "Learn how FFmpeg structures inputs, outputs, streams and global options. Get comfortable reading and writing one-line commands." },
      { title: "Transcoding & Bitrate Control", description: "Practice CRF, two-pass and ABR encoding with x264/x265. Understand how rate-control modes affect quality and file size." },
      { title: "Audio Processing", description: "Resample, remix, normalize and re-encode audio tracks. Handle multi-track inputs and language metadata correctly." },
      { title: "Filters and Effects", description: "Compose filtergraphs for scaling, cropping, overlaying, deinterlacing and color conversion using filter_complex." },
      { title: "Performance & Hardware Acceleration", description: "Speed up encodes with NVENC, QSV and VAAPI. Learn when hardware acceleration helps and when it hurts quality." },
      { title: "Production Workflows", description: "Build repeatable FFmpeg pipelines: HLS/DASH packaging, thumbnail generation, sprite sheets and batch automation." },
    ],
  },
  {
    journeyTitle: "Advanced Live Streaming Architecture",
    category: "Protocols & Transport",
    searchKeywords: ["live", "streaming", "low latency", "real-time", "webrtc", "rtmp", "srt", "ll-hls", "cmaf"],
    steps: [
      { title: "Live Streaming Fundamentals", description: "Review the live-streaming pipeline end-to-end: contribution, transcoding, packaging, distribution and playback timing budgets." },
      { title: "Low-Latency Protocols", description: "Deep-dive into LL-HLS, LL-DASH, WebRTC and SRT. Compare achievable glass-to-glass latency and operational complexity." },
      { title: "Scalable Distribution Patterns", description: "Design multi-region origin shielding, mid-tier caching and CDN failover to handle spikes without sacrificing latency." },
      { title: "Monitoring & Analytics", description: "Instrument the live pipeline for real-time QoE, error rates and concurrent viewers. Set actionable alerts." },
      { title: "Edge Computing Integration", description: "Move packaging, ad insertion and personalization to the edge to cut latency and origin load." },
      { title: "Production Best Practices", description: "Plan for redundancy, key rotation, graceful failover and post-event reviews so high-stakes live events ship reliably." },
    ],
  },
  {
    journeyTitle: "DRM & Content Protection",
    category: "General Tools",
    searchKeywords: ["drm", "widevine", "playready", "fairplay", "encryption", "protection", "license", "cenc", "security"],
    steps: [
      { title: "DRM Fundamentals", description: "Understand how modern DRM systems combine CENC encryption, license servers and EME to protect premium video." },
      { title: "Widevine Integration", description: "Walk through Widevine L1/L3 security levels, license requests and the practical steps to integrate on web and Android." },
      { title: "PlayReady Implementation", description: "Set up PlayReady for Microsoft and Smart TV ecosystems, including license acquisition and policy configuration." },
      { title: "FairPlay Streaming Setup", description: "Configure FairPlay Streaming for Safari and Apple devices: certificates, SPC/CKC exchange and HLS integration." },
      { title: "Multi-DRM Strategy", description: "Combine Widevine, PlayReady and FairPlay behind a single packaging and license workflow using CENC and CMAF." },
      { title: "Security Best Practices", description: "Layer DRM with token auth, watermarking, geo-blocking and concurrency control to build defense-in-depth against piracy." },
    ],
  },
];

interface ScoredResource {
  id: number;
  title: string;
}

async function findResourcesForJourney(plan: JourneyPlan, want: number): Promise<ScoredResource[]> {
  const { resources } = await storage.listResources({ status: "approved", limit: 3000 });
  const scored = resources.map(r => {
    const text = `${r.title} ${r.description ?? ""} ${r.category} ${r.subcategory ?? ""}`.toLowerCase();
    let score = 0;
    for (const kw of plan.searchKeywords) {
      const k = kw.toLowerCase();
      if (text.includes(k)) {
        score += 5;
        if (r.title.toLowerCase().includes(k)) score += 5;
      }
    }
    if (r.category.toLowerCase() === plan.category.toLowerCase()) score += 4;
    return { r, score };
  });

  const matched = scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score);
  const inCatExtras = scored
    .filter(s => s.score === 0 && s.r.category.toLowerCase() === plan.category.toLowerCase())
    .sort((a, b) => a.r.title.localeCompare(b.r.title));
  const all = matched.concat(inCatExtras);
  return all.slice(0, want).map(s => ({ id: s.r.id, title: s.r.title }));
}

export interface SeedJourneyStepsSummary {
  journeysTouched: number;
  journeysAlreadyPopulated: number;
  journeysNotFoundInDb: number;
  stepRowsCreated: number;
  inlineStepsCreated: number;
  perJourney: Array<{
    journeyId: number | null;
    title: string;
    logicalStepsBefore: number;
    logicalStepsAfter: number;
    rowsCreated: number;
    inlineRowsCreated: number;
  }>;
}

async function seedStepsForPlan(plan: JourneyPlan, summary: SeedJourneyStepsSummary) {
  const journeys = await storage.listLearningJourneys();
  const journey = journeys.find(j => j.title === plan.journeyTitle);
  if (!journey) {
    console.warn(`⚠️  Journey not found in DB: "${plan.journeyTitle}" — skipping (journey row must be seeded first).`);
    summary.journeysNotFoundInDb++;
    summary.perJourney.push({
      journeyId: null,
      title: plan.journeyTitle,
      logicalStepsBefore: 0,
      logicalStepsAfter: 0,
      rowsCreated: 0,
      inlineRowsCreated: 0,
    });
    return;
  }

  const existingSteps = await storage.listJourneySteps(journey.id);
  const existingStepNumbers = new Set(existingSteps.map(s => s.stepNumber));
  const targetCount = plan.steps.length;

  // Already fully populated: every logical step number is present.
  const missingIndices: number[] = [];
  for (let i = 0; i < targetCount; i++) {
    const stepNumber = i + 1;
    if (!existingStepNumbers.has(stepNumber)) missingIndices.push(i);
  }

  if (missingIndices.length === 0) {
    console.log(`⏭️  Journey #${journey.id} "${journey.title}" already has all ${targetCount} logical steps (${existingSteps.length} rows), skipping.`);
    summary.journeysAlreadyPopulated++;
    summary.perJourney.push({
      journeyId: journey.id,
      title: journey.title,
      logicalStepsBefore: existingStepNumbers.size,
      logicalStepsAfter: existingStepNumbers.size,
      rowsCreated: 0,
      inlineRowsCreated: 0,
    });
    return;
  }

  const resourcesPerStep = 3;
  const want = missingIndices.length * resourcesPerStep;
  const resources = await findResourcesForJourney(plan, want);

  console.log(`📚 Journey #${journey.id} "${journey.title}": ${existingStepNumbers.size}/${targetCount} logical steps present; backfilling ${missingIndices.length} (found ${resources.length} candidate resources).`);

  let resourceIdx = 0;
  let rowsCreated = 0;
  let inlineRowsCreated = 0;

  for (let m = 0; m < missingIndices.length; m++) {
    const i = missingIndices[m];
    const template = plan.steps[i];
    const stepNumber = i + 1;

    const remainingMissing = missingIndices.length - m;
    const remainingResources = Math.max(0, resources.length - resourceIdx);
    const takeBudget = Math.max(1, Math.min(resourcesPerStep, Math.ceil(remainingResources / remainingMissing)));
    const stepResources = remainingResources > 0
      ? resources.slice(resourceIdx, resourceIdx + takeBudget)
      : [];
    resourceIdx += stepResources.length;

    if (stepResources.length === 0) {
      // Inline-content fallback: create a single step row with no resource link
      // so the journey never renders an empty hole. JourneyDetail.tsx renders
      // step.title/description regardless of step.resource being present.
      await storage.createJourneyStep({
        journeyId: journey.id,
        stepNumber,
        title: template.title,
        description: template.description,
        resourceId: null,
        isOptional: false,
      });
      rowsCreated++;
      inlineRowsCreated++;
    } else {
      for (const r of stepResources) {
        await storage.createJourneyStep({
          journeyId: journey.id,
          stepNumber,
          title: template.title,
          description: template.description,
          resourceId: r.id,
          isOptional: false,
        });
        rowsCreated++;
      }
    }
  }

  summary.journeysTouched++;
  summary.stepRowsCreated += rowsCreated;
  summary.inlineStepsCreated += inlineRowsCreated;

  const after = await storage.listJourneySteps(journey.id);
  const afterUnique = new Set(after.map(s => s.stepNumber)).size;
  summary.perJourney.push({
    journeyId: journey.id,
    title: journey.title,
    logicalStepsBefore: existingStepNumbers.size,
    logicalStepsAfter: afterUnique,
    rowsCreated,
    inlineRowsCreated,
  });

  console.log(`   ✅ Created ${rowsCreated} step rows (${inlineRowsCreated} inline) → ${afterUnique}/${targetCount} logical steps.`);
}

/**
 * Idempotent backfill: ensures each of the 5 canonical learning journeys has a
 * full set of ordered steps. Safe to call repeatedly — already-populated step
 * numbers are left untouched. When no resources match a step, an inline-content
 * row (resourceId=null) is inserted so journey pages never render empty.
 *
 * Throws if any expected journey row exists in the DB but ends up with zero
 * steps after this run — that is the failure mode this function is here to
 * prevent.
 */
export async function seedJourneyStepsForExisting(): Promise<SeedJourneyStepsSummary> {
  const summary: SeedJourneyStepsSummary = {
    journeysTouched: 0,
    journeysAlreadyPopulated: 0,
    journeysNotFoundInDb: 0,
    stepRowsCreated: 0,
    inlineStepsCreated: 0,
    perJourney: [],
  };

  console.log("🌱 Backfilling journey steps for canonical learning journeys...");
  for (const plan of JOURNEY_PLANS) {
    try {
      await seedStepsForPlan(plan, summary);
    } catch (err) {
      console.error(`💥 Failed seeding "${plan.journeyTitle}":`, err);
    }
  }

  // Post-seed validation: any journey that exists in the DB must now have
  // at least one step. This is the gate the code review asked for.
  const journeys = await storage.listLearningJourneys();
  const offenders: string[] = [];
  for (const plan of JOURNEY_PLANS) {
    const j = journeys.find(x => x.title === plan.journeyTitle);
    if (!j) continue; // legitimately not in DB yet; covered by journeysNotFoundInDb counter
    const steps = await storage.listJourneySteps(j.id);
    if (steps.length === 0) {
      offenders.push(`#${j.id} "${j.title}"`);
    }
  }
  if (offenders.length > 0) {
    throw new Error(
      `Journey-step seeding gate FAILED — these journeys still have zero steps after seed: ${offenders.join(", ")}`
    );
  }

  console.log(
    `🎉 Journey-step seed done. touched=${summary.journeysTouched} ` +
    `alreadyPopulated=${summary.journeysAlreadyPopulated} ` +
    `notInDb=${summary.journeysNotFoundInDb} ` +
    `rowsCreated=${summary.stepRowsCreated} (inline=${summary.inlineStepsCreated}).`
  );
  return summary;
}

// Allow `tsx server/cli/seedJourneyStepsForExisting.ts` direct invocation
const isDirectRun =
  typeof process !== "undefined" &&
  Array.isArray(process.argv) &&
  process.argv[1] &&
  process.argv[1].endsWith("seedJourneyStepsForExisting.ts");

if (isDirectRun) {
  seedJourneyStepsForExisting()
    .then(() => process.exit(0))
    .catch(err => {
      console.error("💥 Fatal:", err);
      process.exit(1);
    });
}
