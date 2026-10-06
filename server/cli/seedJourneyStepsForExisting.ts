import type { Resource } from "@shared/schema";
import { storage } from "../storage";

export interface StepTemplate {
  title: string;
  description: string;
  // A resource is attached to this step only if it mentions one of these
  // topic terms; steps with no match get an inline row instead.
  keywords: string[];
}

export interface JourneyPlan {
  journeyTitle: string;
  category: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedDuration: string;
  searchKeywords: string[];
  steps: StepTemplate[];
}

export const JOURNEY_PLANS: JourneyPlan[] = [
  {
    journeyTitle: "Video Streaming Fundamentals",
    category: "Intro & Learning",
    description: "Start from zero and build a working mental model of digital video delivery: codecs, containers, protocols, and players — everything you need before going deeper.",
    difficulty: "beginner",
    estimatedDuration: "8-10 hours",
    searchKeywords: ["intro", "fundamental", "beginner", "learning", "tutorial", "basics", "guide", "primer", "overview"],
    steps: [
      { title: "Introduction to Video Streaming", description: "Get oriented with the core concepts of digital video delivery: containers, codecs, bitrates, and how a video gets from a camera to a viewer's screen.", keywords: ["introduction", "beginner", "beginners", "101", "basics", "getting started", "primer"] },
      { title: "Understanding Video Codecs", description: "Compare H.264, HEVC, VP9 and AV1. Learn why codec choice impacts quality, file size, device support and licensing cost.", keywords: ["codec", "codecs", "video coding", "h.264", "h264", "hevc", "h.265", "vp9", "av1"] },
      { title: "Streaming Protocols Overview", description: "Walk through HLS, DASH, RTMP and WebRTC. Understand which protocol fits live, on-demand and ultra-low-latency use cases.", keywords: ["protocol", "protocols", "hls", "mpeg-dash", "rtmp", "webrtc"] },
      { title: "Players and Playback Basics", description: "Explore how HTML5 players, MSE and adaptive bitrate switching deliver smooth playback across devices and network conditions.", keywords: ["player", "players", "playback", "media source extensions", "adaptive bitrate"] },
      { title: "Video Formats and Containers", description: "Demystify MP4, fMP4, MKV, WebM and TS containers — what they hold, when to use each, and how they pair with codecs.", keywords: ["container", "containers", "mp4", "fmp4", "mkv", "webm", "mpeg-ts"] },
      { title: "Putting It All Together", description: "Trace a complete streaming pipeline from ingest to playback so you can reason about every link in the chain before going deeper.", keywords: ["pipeline", "workflow", "end-to-end", "architecture", "ingest"] },
    ],
  },
  {
    journeyTitle: "Building Your First Streaming Platform",
    category: "Infrastructure & Delivery",
    description: "Stand up a complete streaming platform end-to-end: ingest, encoding ladder, packaging, CDN delivery, and an adaptive player — with testing and monitoring before launch.",
    difficulty: "intermediate",
    estimatedDuration: "15-20 hours",
    searchKeywords: ["platform", "server", "cdn", "encoding", "infrastructure", "delivery", "origin", "transcode", "pipeline"],
    steps: [
      { title: "Planning Your Streaming Architecture", description: "Sketch the building blocks of a streaming platform: ingest, transcoder, packager, origin, CDN and player. Decide on live vs VOD scope.", keywords: ["architecture", "system design", "reference design", "platform design"] },
      { title: "Setting Up Streaming Servers", description: "Stand up an origin/ingest server (nginx-rtmp, MediaMTX, or similar) and verify you can publish and pull a test stream end-to-end.", keywords: ["streaming server", "media server", "origin server", "nginx", "nginx-rtmp", "mediamtx", "wowza"] },
      { title: "Building the Encoding Pipeline", description: "Configure a multi-bitrate ladder, segment for HLS/DASH and learn the trade-offs between CPU cost, latency and output quality.", keywords: ["encoding", "encoder", "transcode", "transcoding", "transcoder", "bitrate ladder", "abr ladder", "packager", "packaging"] },
      { title: "CDN Integration & Caching", description: "Front your origin with a CDN, tune cache headers for segments vs manifests, and measure delivery performance from multiple regions.", keywords: ["cdn", "multi-cdn", "caching", "cache"] },
      { title: "Player Implementation", description: "Embed an adaptive player, wire up basic analytics events and confirm graceful degradation on poor networks.", keywords: ["player", "playback", "hls.js", "dash.js", "video.js", "shaka", "exoplayer"] },
      { title: "Testing, Monitoring and Optimization", description: "Load-test the pipeline, set up QoE monitoring (rebuffer ratio, startup time) and iterate on bottlenecks before launch.", keywords: ["monitoring", "qoe", "analytics", "load testing", "load test", "observability", "metrics"] },
    ],
  },
  {
    journeyTitle: "FFmpeg Mastery",
    category: "Encoding & Codecs",
    description: "Go from one-line FFmpeg commands to production pipelines: rate control, filtergraphs, audio processing, hardware acceleration, and repeatable packaging workflows.",
    difficulty: "intermediate",
    estimatedDuration: "12-15 hours",
    searchKeywords: ["ffmpeg", "transcode", "encoding", "filter", "command", "convert", "x264", "x265", "libav"],
    steps: [
      { title: "FFmpeg Fundamentals", description: "Learn how FFmpeg structures inputs, outputs, streams and global options. Get comfortable reading and writing one-line commands.", keywords: ["introduction", "beginner", "beginners", "basics", "tutorial", "command line", "commands", "cheat sheet"] },
      { title: "Transcoding & Bitrate Control", description: "Practice CRF, two-pass and ABR encoding with x264/x265. Understand how rate-control modes affect quality and file size.", keywords: ["crf", "two-pass", "2-pass", "bitrate", "rate control", "x264", "x265"] },
      { title: "Audio Processing", description: "Resample, remix, normalize and re-encode audio tracks. Handle multi-track inputs and language metadata correctly.", keywords: ["audio", "aac", "opus", "loudness", "loudnorm", "resample", "resampling"] },
      { title: "Filters and Effects", description: "Compose filtergraphs for scaling, cropping, overlaying, deinterlacing and color conversion using filter_complex.", keywords: ["filter", "filters", "filtergraph", "filter_complex", "filtering", "overlay", "deinterlace", "deinterlacing"] },
      { title: "Performance & Hardware Acceleration", description: "Speed up encodes with NVENC, QSV and VAAPI. Learn when hardware acceleration helps and when it hurts quality.", keywords: ["nvenc", "qsv", "vaapi", "hardware acceleration", "hardware", "gpu", "nvidia", "cuda", "threads"] },
      { title: "Production Workflows", description: "Build repeatable FFmpeg pipelines: HLS/DASH packaging, thumbnail generation, sprite sheets and batch automation.", keywords: ["hls", "dash", "packaging", "thumbnail", "thumbnails", "batch", "automation", "workflow"] },
    ],
  },
  {
    journeyTitle: "Advanced Live Streaming Architecture",
    category: "Protocols & Transport",
    description: "Design low-latency, resilient live pipelines: LL-HLS/WebRTC/SRT trade-offs, multi-region distribution, real-time QoE monitoring, and edge processing for high-stakes events.",
    difficulty: "advanced",
    estimatedDuration: "20-25 hours",
    searchKeywords: ["live", "streaming", "low latency", "real-time", "webrtc", "rtmp", "srt", "ll-hls", "cmaf"],
    steps: [
      { title: "Live Streaming Fundamentals", description: "Review the live-streaming pipeline end-to-end: contribution, transcoding, packaging, distribution and playback timing budgets.", keywords: ["live streaming", "live stream", "live video", "introduction", "overview", "beginner"] },
      { title: "Low-Latency Protocols", description: "Deep-dive into LL-HLS, LL-DASH, WebRTC and SRT. Compare achievable glass-to-glass latency and operational complexity.", keywords: ["low latency", "low-latency", "ll-hls", "ll-dash", "lhls", "webrtc", "srt", "cmaf"] },
      { title: "Scalable Distribution Patterns", description: "Design multi-region origin shielding, mid-tier caching and CDN failover to handle spikes without sacrificing latency.", keywords: ["cdn", "multi-cdn", "scalable", "scalability", "scaling", "origin shield", "multi-region", "failover"] },
      { title: "Monitoring & Analytics", description: "Instrument the live pipeline for real-time QoE, error rates and concurrent viewers. Set actionable alerts.", keywords: ["monitoring", "qoe", "analytics", "metrics", "observability", "alerting"] },
      { title: "Edge Computing Integration", description: "Move packaging, ad insertion and personalization to the edge to cut latency and origin load.", keywords: ["edge computing", "edge", "ad insertion", "ssai", "personalization", "serverless"] },
      { title: "Production Best Practices", description: "Plan for redundancy, key rotation, graceful failover and post-event reviews so high-stakes live events ship reliably.", keywords: ["redundancy", "redundant", "failover", "best practices", "reliability"] },
    ],
  },
  {
    journeyTitle: "DRM & Content Protection",
    category: "General Tools",
    description: "Protect premium video with modern multi-DRM: Widevine, PlayReady, and FairPlay behind a single CENC/CMAF workflow, layered with tokens, watermarking, and concurrency control.",
    difficulty: "advanced",
    estimatedDuration: "10-12 hours",
    searchKeywords: ["drm", "widevine", "playready", "fairplay", "encryption", "protection", "license", "cenc", "security"],
    steps: [
      { title: "DRM Fundamentals", description: "Understand how modern DRM systems combine CENC encryption, license servers and EME to protect premium video.", keywords: ["drm", "cenc", "common encryption", "encrypted media extensions", "content protection"] },
      { title: "Widevine Integration", description: "Walk through Widevine L1/L3 security levels, license requests and the practical steps to integrate on web and Android.", keywords: ["widevine"] },
      { title: "PlayReady Implementation", description: "Set up PlayReady for Microsoft and Smart TV ecosystems, including license acquisition and policy configuration.", keywords: ["playready"] },
      { title: "FairPlay Streaming Setup", description: "Configure FairPlay Streaming for Safari and Apple devices: certificates, SPC/CKC exchange and HLS integration.", keywords: ["fairplay"] },
      { title: "Multi-DRM Strategy", description: "Combine Widevine, PlayReady and FairPlay behind a single packaging and license workflow using CENC and CMAF.", keywords: ["multi-drm", "multi drm", "cpix", "cenc", "common encryption"] },
      { title: "Security Best Practices", description: "Layer DRM with token auth, watermarking, geo-blocking and concurrency control to build defense-in-depth against piracy.", keywords: ["watermark", "watermarking", "forensic", "token", "piracy", "anti-piracy", "geo-blocking", "concurrency"] },
    ],
  },
];

// Admins can re-case a journey title; matching exactly would make a reseed
// create a duplicate journey.
function sameTitle(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

interface CandidateResource {
  id: number;
  title: string;
  text: string;
  journeyScore: number;
}

function mentions(text: string, keyword: string): boolean {
  const escaped = keyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`).test(text);
}

function keywordScore(title: string, text: string, keywords: string[]): number {
  let score = 0;
  for (const kw of keywords) {
    if (mentions(text, kw)) {
      score += 5;
      if (mentions(title, kw)) score += 5;
    }
  }
  return score;
}

// Resources relevant to the journey as a whole (keyword or category match).
export function scoreJourneyCandidates(
  plan: JourneyPlan,
  resources: Pick<Resource, "id" | "title" | "description" | "category" | "subcategory">[],
): CandidateResource[] {
  return resources
    .map(r => {
      const title = r.title.toLowerCase();
      const text = `${r.title} ${r.description ?? ""} ${r.subcategory ?? ""}`.toLowerCase();
      let journeyScore = keywordScore(title, text, plan.searchKeywords);
      if (r.category.toLowerCase() === plan.category.toLowerCase()) journeyScore += 4;
      return { id: r.id, title, text, journeyScore };
    })
    .filter(c => c.journeyScore > 0);
}

// Picks resources for one step: only candidates that mention one of the step's
// own topic terms qualify, ranked by step relevance, then journey relevance.
export function pickResourcesForStep(
  candidates: CandidateResource[],
  step: StepTemplate,
  used: Set<number>,
  limit: number,
): CandidateResource[] {
  return candidates
    .filter(c => !used.has(c.id))
    .map(c => ({ c, stepScore: keywordScore(c.title, c.text, step.keywords) }))
    .filter(s => s.stepScore > 0)
    .sort((a, b) => b.stepScore - a.stepScore || b.c.journeyScore - a.c.journeyScore || a.c.id - b.c.id)
    .slice(0, limit)
    .map(s => s.c);
}

export interface SeedJourneyStepsSummary {
  journeysTouched: number;
  journeysAlreadyPopulated: number;
  journeyRowsCreated: number;
  stepRowsCreated: number;
  inlineStepsCreated: number;
  perJourney: {
    journeyId: number | null;
    title: string;
    logicalStepsBefore: number;
    logicalStepsAfter: number;
    rowsCreated: number;
    inlineRowsCreated: number;
  }[];
}

async function seedStepsForPlan(plan: JourneyPlan, summary: SeedJourneyStepsSummary) {
  const journeys = await storage.listLearningJourneys();
  let journey = journeys.find(j => sameTitle(j.title, plan.journeyTitle));
  if (!journey) {
    // Create the canonical journey row so a fresh database ships with working
    // Learning Journeys instead of an empty page (previously this skipped and
    // /api/journeys returned [] on every new deployment).
    console.log(`🆕 Journey not in DB, creating: "${plan.journeyTitle}"`);
    journey = await storage.createLearningJourney({
      title: plan.journeyTitle,
      description: plan.description,
      difficulty: plan.difficulty,
      estimatedDuration: plan.estimatedDuration,
      category: plan.category,
      status: "published",
    });
    summary.journeyRowsCreated++;
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
  const { resources } = await storage.listResources({ status: "approved", limit: 5000 });
  const candidates = scoreJourneyCandidates(plan, resources);
  const used = new Set(
    existingSteps.map(s => s.resourceId).filter((id): id is number => id != null),
  );

  console.log(`📚 Journey #${journey.id} "${journey.title}": ${existingStepNumbers.size}/${targetCount} logical steps present; backfilling ${missingIndices.length} (found ${candidates.length} candidate resources).`);

  let rowsCreated = 0;
  let inlineRowsCreated = 0;

  for (const i of missingIndices) {
    const template = plan.steps[i];
    const stepNumber = i + 1;

    const stepResources = pickResourcesForStep(candidates, template, used, resourcesPerStep);
    for (const r of stepResources) used.add(r.id);

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
    journeyRowsCreated: 0,
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

  // Post-seed validation: every canonical journey must now exist in the DB
  // and have at least one step. This is the gate the code review asked for.
  const journeys = await storage.listLearningJourneys();
  const offenders: string[] = [];
  for (const plan of JOURNEY_PLANS) {
    const j = journeys.find(x => sameTitle(x.title, plan.journeyTitle));
    if (!j) {
      offenders.push(`(missing row) "${plan.journeyTitle}"`);
      continue;
    }
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
    `journeyRowsCreated=${summary.journeyRowsCreated} ` +
    `rowsCreated=${summary.stepRowsCreated} (inline=${summary.inlineStepsCreated}).`
  );
  return summary;
}

// Allow `tsx server/cli/seedJourneyStepsForExisting.ts` direct invocation
const isDirectRun =
  typeof process !== "undefined" &&
  Array.isArray(process.argv) &&
  process.argv[1]?.endsWith("seedJourneyStepsForExisting.ts");

if (isDirectRun) {
  seedJourneyStepsForExisting()
    .then(() => process.exit(0))
    .catch(err => {
      console.error("💥 Fatal:", err);
      process.exit(1);
    });
}
