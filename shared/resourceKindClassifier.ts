/**
 * Deterministic resource-kind classifier.
 *
 * Decides which of the shared kinds (shared/resourceKinds-core.ts) a resource
 * is from what it IS, not only from how it was tagged: its taxonomy placement,
 * its URL host/path, its title, description and tags. The result is STORED in
 * `resources.kind` when a resource is created/imported/approved and by the
 * boot backfill for rows that still have no kind — it never overwrites a
 * stored value, so an admin's choice always wins.
 *
 * Browser-safe and dependency-free on purpose: the admin catalog shows the
 * same "Automatic" answer the server would store.
 *
 * Order of decisions (first match wins):
 *  1. Community / event placement or event wording → events.
 *  2. Code or package hosting (GitHub, npm, PyPI, app stores, …) → software:
 *     libraries vs tools by library/tool wording, then taxonomy hints.
 *  3. Specification hosts and spec identifiers (RFC, ISO/IEC, SMPTE ST, …) →
 *     protocols when the resource sits under a protocols branch, else
 *     standards.
 *  4. Articles, talks, papers and learning material → the subject kind for
 *     standards/protocols branches, otherwise "other" (no kind describes a
 *     blog post or tutorial).
 *  5. Taxonomy branch defaults (standards, protocols, tool categories) with
 *     the same library/tool split for software-like branches.
 *  6. Nothing applies → "other".
 *
 * See docs/RESOURCE-KINDS.md for the operator-facing description.
 */
import type { ResourceKind } from "./resourceKinds-core";

export interface ResourceKindClassifierInput {
  title?: string | null;
  description?: string | null;
  url?: string | null;
  category?: string | null;
  subcategory?: string | null;
  subSubcategory?: string | null;
  /** `metadata.tags` (non-strings ignored). */
  tags?: readonly unknown[] | null;
}

export interface ResourceKindClassification {
  kind: ResourceKind;
  /** Short machine-readable reason, e.g. "software:library-words". */
  rule: string;
}

// ---------------------------------------------------------------------------
// Host tables
// ---------------------------------------------------------------------------

/** Source-code hosting: the resource is a piece of software. */
const CODE_HOSTS = [
  "github.com",
  "gitlab.com",
  "bitbucket.org",
  "sourceforge.net",
  "codeberg.org",
  "code.videolan.org",
  "googlesource.com",
  "git.ffmpeg.org",
  "gitee.com",
  "launchpad.net",
  "sr.ht",
  "hub.docker.com",
  "huggingface.co",
];

/** Package registries: the resource is a library by construction. */
const PACKAGE_HOSTS = [
  "npmjs.com",
  "npmjs.org",
  "pypi.org",
  "crates.io",
  "docs.rs",
  "pkg.go.dev",
  "godoc.org",
  "rubygems.org",
  "nuget.org",
  "packagist.org",
  "cocoapods.org",
  "mvnrepository.com",
  "search.maven.org",
  "central.sonatype.com",
  "hex.pm",
  "pub.dev",
  "jsdelivr.com",
  "unpkg.com",
  "swiftpackageindex.com",
];

/** App stores / extension galleries: the resource is an end-user tool. */
const APP_STORE_HOSTS = [
  "apps.apple.com",
  "play.google.com",
  "chrome.google.com",
  "chromewebstore.google.com",
  "addons.mozilla.org",
  "microsoft.com/store",
  "apps.microsoft.com",
  "marketplace.visualstudio.com",
  "channelstore.roku.com",
  "flathub.org",
  "snapcraft.io",
];

/** Standards bodies and specification archives. */
const SPEC_HOSTS = [
  "iso.org",
  "itu.int",
  "smpte.org",
  "ietf.org",
  "rfc-editor.org",
  "w3.org",
  "w3c.github.io",
  "whatwg.org",
  "ebu.ch",
  "tech.ebu.ch",
  "etsi.org",
  "atsc.org",
  "dvb.org",
  "scte.org",
  "3gpp.org",
  "cta.tech",
  "aomedia.org",
  "aomediacodec.github.io",
  "mpeg.org",
  "mpeg.chiariglione.org",
  "mpegstandards.org",
  "vesa.org",
  "dashif.org",
  "svta.org",
  "ultrahdforum.org",
  "hdmi.org",
  "aes.org",
  "ansi.org",
  "mpegla.com",
  "jvet-experts.org",
  "vqeg.org",
  "streamingvideoalliance.org",
  "cablelabs.com",
  "hbbtv.org",
  "dolby.com/technologies",
  "ieee.org",
];

/** Event / meetup hosts. */
const EVENT_HOSTS = [
  "meetup.com",
  "demuxed.com",
  "nabshow.com",
  "ibc.org",
  "eventbrite.com",
  "lu.ma",
  "sessionize.com",
  "mile-high.video",
  "fosdem.org",
  "streamingmedia.com/conferences",
  "streamingmediaconference.com",
  "videotechconf.com",
  "vdc.vidpro.org",
];

/** Article / video / paper hosts: written or recorded material, not artifacts. */
const ARTICLE_HOSTS = [
  "medium.com",
  "netflixtechblog.com",
  "wikipedia.org",
  "youtube.com",
  "youtu.be",
  "vimeo.com",
  "arxiv.org",
  "dev.to",
  "hackernoon.com",
  "substack.com",
  "streaminglearningcenter.com",
  "streamingmedia.com",
  "tvtechnology.com",
  "slideshare.net",
  "speakerdeck.com",
  "researchgate.net",
  "ieeexplore.ieee.org",
  "dl.acm.org",
  "sciencedirect.com",
  "springer.com",
  "docs.google.com",
  "stackoverflow.com",
  "reddit.com",
  "news.ycombinator.com",
  "quora.com",
  "towardsdatascience.com",
  "freecodecamp.org",
  "coursera.org",
  "udemy.com",
  "edx.org",
  "oreilly.com",
  "amazon.com/dp",
  "amazon.com/gp/product",
  "packtpub.com",
  "manning.com",
  "smashingmagazine.com",
  "css-tricks.com",
  "html5rocks.com",
  "web.dev",
  "infoq.com",
  "theverge.com",
  "techcrunch.com",
  "videonuze.com",
  "fierce-network.com",
  "broadbandtvnews.com",
  "rapidtvnews.com",
  "csimagazine.com",
  "ottverse.com",
  "probe.dev/resources",
  "gist.github.com",
];

const ARTICLE_PATH_PATTERN =
  /\/([a-z0-9-]*blog[a-z0-9-]*|articles?|news|posts?|insights|learn|learning|resources\/blog|tutorials?|guides?|whitepapers?|white-papers?|case-stud(y|ies)|webinars?|podcasts?|stories|press|talks?)(\/|$|\?)|[?&]v=/;

// ---------------------------------------------------------------------------
// Word tables (matched on lowercased text with word boundaries)
// ---------------------------------------------------------------------------

const LIBRARY_WORDS =
  /\b(librar(y|ies)|lib|sdks?|frameworks?|bindings?|wrappers? (for|around)|api (client|wrapper)|client librar(y|ies)|modules?|packages?|crates?|gem|npm|pypi|plugins?|add-?ons?|components?|toolkits?|parsers?|muxers?|demuxers?|decoder librar(y|ies)|headers?-only|header only|implementation in|implemented in|written in (pure )?(rust|go|golang|c\+\+|c|java|kotlin|swift|python|javascript|typescript)|for (node(\.js)?|python|rust|go|golang|java|kotlin|swift|react|vue|angular|flutter|dart|unity|\.net|c#|ruby|php|elixir|javascript|typescript|ios|android)|(node(\.js)?|python|rust|go|golang|java|kotlin|swift|ruby|php|elixir|javascript|typescript|c\+\+|c#|\.net) (library|module|package|implementation|port|bindings?|client|wrapper|sdk))\b/g;

const TOOL_WORDS =
  /\b(tools?|cli|command[- ]line|utilit(y|ies)|apps?|applications?|gui|desktop|editors?|players?|servers?|services?|platforms?|converters?|analy[sz]ers?|viewers?|inspectors?|monitors?|dashboards?|extensions?|scripts?|daemons?|proxy|proxies|recorders?|downloaders?|encoders?|transcoders?|generators?|validators?|checkers?|testers?|benchmarks?|simulators?|studio|suite|software|online|web ?app|saas|solutions?|products?|appliances?|cloud)\b/g;

const EVENT_WORDS =
  /\b(conferences?|summits?|meetups?|expo|festival|symposium|hackathon|devcon|user group|annual (event|gathering)|community (call|meeting|event)s?|workshop series)\b/;

const SPEC_TITLE_PATTERN =
  /\b(rfc ?\d{3,5}|draft-ietf-|iso\/iec|iso \d{4,5}|itu-t|itu-r|h\.26[1-6] ?(spec|standard|recommendation)|smpte (st|rp|eg|rdd)? ?\d|etsi (ts|en|tr)|scte[- ]\d|atsc a\/\d|ebu tech|cta-\d|specifications?|recommendation itu|standard (document|specification))\b/;

const PROTOCOL_WORDS =
  /\b(protocols?|rtmp|rtsp|rtp|rtcp|srt|rist|webrtc|whip|whep|quic|moq|media over quic|hls|http live streaming|mpeg-dash|dash|cmaf|ll-hls|low[- ]latency hls|mpeg-ts|transport streams?|sdp|icecast|ndi|st ?2110|zixi)\b/;

const LEARNING_WORDS =
  /\b(tutorials?|guides?|introduction|intro to|how to|how-to|explained|primer|course|courses|book|books|lessons?|learn|learning|handbook|cheat ?sheet|overview|deep dive|walkthrough|case stud(y|ies)|whitepapers?|white paper|blog|articles?|podcasts?|webinars?|talks?|presentation|slides|paper|thesis|survey|history of|comparison|vs\.?|versus|benchmark results|best practices|lessons learned)\b/;

// ---------------------------------------------------------------------------
// Taxonomy hints (normalised names; matched as substrings of the joined path)
// ---------------------------------------------------------------------------

const EVENT_BRANCHES = [
  "community & events",
  "community groups",
  "events & conferences",
  "online forums",
];

const STANDARDS_BRANCHES = [
  "standards & industry",
  "specs & standards",
  "standards",
  "specifications",
  "best practices & guidelines",
  "standards bodies",
  "industry forums",
  "official specs",
];

const PROTOCOL_BRANCHES = ["protocols & transport", "transport protocols", "adaptive streaming"];

const LEARNING_BRANCHES = [
  "intro & learning",
  "learning resources",
  "books & courses",
  "tutorials",
  "case studies",
  "whitepapers",
  "guides",
  "documentation",
  "research projects & academic resources",
  "comparative analysis",
  // Recorded talks and community writing are material ABOUT the field, not
  // events or communities themselves.
  "webinars & conference talks",
  "podcasts & webinars",
  "community blogs & forums",
  "community & collaboration platforms",
];

const LIBRARY_BRANCHES = [
  "api libraries & sdks",
  "frameworks & ui components",
  "manifest parsers",
  "parsers & generators",
  "web players",
  "embedded players",
];

const TOOL_BRANCHES = [
  "tools",
  "utilities",
  "encoding & codecs",
  "media tools",
  "general tools",
  "players & clients",
  "infrastructure & delivery",
  "servers",
  "solutions",
  "platforms",
  "players",
  "editing suites",
  "browser extensions",
  "automation",
  "drm",
  "cdn",
  "cloud",
  "analytics",
  "monitoring",
  "transcoding",
  "acceleration",
  "packaging",
  "encoder",
  "codecs",
  "sample streams",
  "test content",
  "ads & qoe",
  "quality",
  "audio",
  "subtitles",
  "metadata",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function lower(value: string | null | undefined): string {
  return (value ?? "").normalize("NFKC").toLowerCase();
}

interface ParsedUrl {
  host: string;
  /** host + path, lowercased, without scheme/"www." — for prefix rules. */
  hostPath: string;
  path: string;
}

function parseUrl(raw: string | null | undefined): ParsedUrl {
  const value = (raw ?? "").trim();
  const match = /^[a-z][a-z0-9+.-]*:\/\/([^/?#]+)([^?#]*)?(\?[^#]*)?/i.exec(value);
  if (!match) return { host: "", hostPath: "", path: "" };
  const host = match[1].toLowerCase().replace(/^www\./, "").replace(/:\d+$/, "");
  const path = (match[2] ?? "").toLowerCase() + (match[3] ?? "").toLowerCase();
  return { host, hostPath: `${host}${path}`, path };
}

/** True when the host equals an entry or is a subdomain of it; entries with a
 *  "/" are matched as host+path prefixes. */
function hostMatches(url: ParsedUrl, entries: readonly string[]): boolean {
  if (!url.host) return false;
  return entries.some((entry) => {
    if (entry.includes("/")) return url.hostPath.startsWith(entry) || url.hostPath.includes(`.${entry}`);
    return url.host === entry || url.host.endsWith(`.${entry}`);
  });
}

function branchMatches(path: string, branches: readonly string[]): boolean {
  return branches.some((branch) => path.includes(branch));
}

function countMatches(pattern: RegExp, text: string): number {
  if (!text) return 0;
  pattern.lastIndex = 0;
  return (text.match(pattern) ?? []).length;
}

/** Title shapes that name a library: libfoo, foo.js, foo-js, react-foo, … */
const LIBRARY_TITLE_SHAPE =
  /(^lib[a-z0-9])|(\.js$)|(\.js\b)|(-js$)|(^(react|vue|ngx|angular|svelte|py|go|rust|node|php|ruby)-)|(-(sdk|lib|py|rs|go|kit|core|parser)$)|(^py[a-z]{3,}$)/;

/**
 * What the description says the resource IS: the earliest "head noun" in its
 * first sentence ("HVD is a C library…", "An open source Python tool…",
 * "Guide to FFmpeg's -loglevel…", "A curated list of…"). "player" is left out
 * on purpose — a web player is usually an embeddable library, a desktop
 * player an app; the taxonomy decides those.
 */
const HEAD_NOUN_PATTERN =
  /\b(librar(?:y|ies)|sdks?|frameworks?|modules?|packages?|plugins?|components?|toolkits?|bindings|wrappers?|parsers?|crates?|tools?|cli|command[- ]line (?:tool|utility|app|interface)|utilit(?:y|ies)|applications?|apps?|servers?|services?|platforms?|editors?|programs?|scripts?|software|suites?|solutions?|engines?|extensions?|daemons?|proxy|systems?|analy[sz]ers?|clients?|converters?|viewers?|inspectors?|downloaders?|validators?|articles?|guides?|tutorials?|books?|courses?|blogs?|blog posts?|posts?|talks?|papers?|whitepapers?|white papers?|documentation|docs|overview|introduction|presentations?|webinars?|podcasts?|explainers?|walkthroughs?|case stud(?:y|ies)|primers?|handbooks?|lists?|collections?|notes|cheat ?sheets?|wiki|series|study|research|report|infographic|interview|episode|newsletter|regulations?|rules?)\b/;

type HeadNoun = "library" | "tool" | "document" | null;

function firstSentenceOf(description: string): string {
  return description.split(/(?<=[a-z0-9)])\.\s/)[0]?.slice(0, 220) ?? "";
}

function headNoun(description: string): HeadNoun {
  const firstSentence = firstSentenceOf(description);
  const match = HEAD_NOUN_PATTERN.exec(firstSentence);
  if (!match) return null;
  let noun = match[1];
  // "Collection of command-line tools / utility functions" names its members.
  if (noun.startsWith("collection")) {
    const rest = firstSentence.slice((match.index ?? 0) + match[0].length);
    if (/^\s+of\s+[^,;]*?\b(functions|helpers|classes|hooks)\b/.test(rest)) return "library";
    const member = HEAD_NOUN_PATTERN.exec(rest);
    if (member) noun = member[1];
  }
  if (/^(librar|sdk|framework|module|package|plugin|component|toolkit|binding|wrapper|parser|crate)/.test(noun)) return "library";
  if (/^(tool|cli|command|utilit|application|app|server|service|platform|editor|program|script|software|suite|solution|engine|extension|daemon|proxy|system|analy|client|converter|viewer|inspector|downloader|validator)/.test(noun)) return "tool";
  return "document";
}

interface Signals {
  title: string;
  description: string;
  text: string;
  tags: Set<string>;
  taxonomyPath: string;
  category: string;
  url: ParsedUrl;
  head: HeadNoun;
}

function softwareKind(s: Signals): ResourceKindClassification {
  let library = 0;
  let tool = 0;

  if (LIBRARY_TITLE_SHAPE.test(s.title.trim())) library += 3;
  library += countMatches(LIBRARY_WORDS, s.title) * 2 + countMatches(LIBRARY_WORDS, s.description);
  tool += countMatches(TOOL_WORDS, s.title) * 2 + countMatches(TOOL_WORDS, s.description);

  if (s.head === "library") library += 4;
  if (s.head === "tool") tool += 4;

  for (const tag of s.tags) {
    if (/\b(librar(y|ies)|sdks?|frameworks?|bindings|npm|plugins?|components?|parsers?|modules?)\b/.test(tag)) library += 1;
    if (/\b(tools?|cli|command-line|utilit(y|ies)|apps?|applications?|desktop|gui|servers?|software)\b/.test(tag)) tool += 1;
  }

  if (branchMatches(s.taxonomyPath, LIBRARY_BRANCHES)) library += 2;

  if (library > tool) return { kind: "libraries", rule: "software:library-signals" };
  if (tool > library) return { kind: "tools", rule: "software:tool-signals" };
  // Tie (including 0:0): a repository with no library wording is most often a
  // runnable program in this catalogue.
  return { kind: "tools", rule: "software:default-tools" };
}

// ---------------------------------------------------------------------------
// Classifier
// ---------------------------------------------------------------------------

export function classifyResourceKind(input: ResourceKindClassifierInput): ResourceKindClassification {
  const title = lower(input.title);
  const description = lower(input.description);
  const category = lower(input.category);
  const taxonomyPath = [input.category, input.subcategory, input.subSubcategory]
    .map((part) => lower(part).trim())
    .filter(Boolean)
    .join(" / ");
  const tags = new Set(
    (input.tags ?? [])
      .filter((tag): tag is string => typeof tag === "string")
      .map((tag) => lower(tag).trim())
      .filter(Boolean),
  );
  const url = parseUrl(input.url);
  const head = headNoun(description);
  const s: Signals = { title, description, text: `${title} ${description}`, tags, taxonomyPath, category, url, head };

  const inEventBranch = branchMatches(taxonomyPath, EVENT_BRANCHES);
  const inStandardsBranch = branchMatches(taxonomyPath, STANDARDS_BRANCHES);
  // "Adaptive Streaming Standards" under a standards category is a standard.
  const inProtocolBranch = !inStandardsBranch && branchMatches(taxonomyPath, PROTOCOL_BRANCHES);
  const inLearningBranch = branchMatches(taxonomyPath, LEARNING_BRANCHES);

  const isPackage = hostMatches(url, PACKAGE_HOSTS);
  const isAppStore = hostMatches(url, APP_STORE_HOSTS);
  const isGist = url.host === "gist.github.com";
  const isCode = !isGist && hostMatches(url, CODE_HOSTS);
  const isSpecHost = hostMatches(url, SPEC_HOSTS);
  const isEventHost = hostMatches(url, EVENT_HOSTS);
  const isArticle =
    isGist || hostMatches(url, ARTICLE_HOSTS) || ARTICLE_PATH_PATTERN.test(url.path) || /^blog\./.test(url.host);

  // 1. Events and communities.
  if (isEventHost) return { kind: "events", rule: "events:host" };
  if (inEventBranch && !isPackage && !isAppStore) return { kind: "events", rule: "events:branch" };
  if (!isCode && !isPackage && EVENT_WORDS.test(title)) return { kind: "events", rule: "events:title" };

  // 2. Software, identified by where it is hosted.
  if (isPackage) return { kind: "libraries", rule: "software:package-registry" };
  if (isAppStore) return { kind: "tools", rule: "software:app-store" };
  if (isCode && head !== "document") {
    // A spec repository on GitHub (e.g. a W3C/AOM spec source) is still a spec.
    if (SPEC_TITLE_PATTERN.test(title) && !countMatches(LIBRARY_WORDS, title) && !countMatches(TOOL_WORDS, title)) {
      return { kind: inProtocolBranch ? "protocols" : "standards", rule: "spec:repository" };
    }
    return softwareKind(s);
  }

  // 3. Specifications. A standards body also hosts reference software
  // ("libaom is the reference implementation…") — that is software.
  if (isSpecHost && (head === "library" || head === "tool" || LIBRARY_TITLE_SHAPE.test(title.trim()))) {
    return softwareKind(s);
  }
  if (isSpecHost || SPEC_TITLE_PATTERN.test(title)) {
    if (inProtocolBranch || (!inStandardsBranch && PROTOCOL_WORDS.test(title) && !isSpecHost)) {
      return { kind: "protocols", rule: "spec:protocol" };
    }
    return { kind: "standards", rule: isSpecHost ? "spec:host" : "spec:title" };
  }

  // 4. Written / recorded material. A product page that says what it is
  // ("X is a monetization service") stays a product even in a learning branch.
  const productStatement = head === "library" || head === "tool";
  const titleNamesArtifact = countMatches(TOOL_WORDS, title) + countMatches(LIBRARY_WORDS, title) > 0;
  if (
    head === "document" ||
    (isArticle && !(productStatement && !hostMatches(url, ARTICLE_HOSTS) && !ARTICLE_PATH_PATTERN.test(url.path))) ||
    (inLearningBranch && !productStatement) ||
    (LEARNING_WORDS.test(title) && !titleNamesArtifact && !productStatement)
  ) {
    if (inStandardsBranch) return { kind: "standards", rule: "article:standards-branch" };
    if (inProtocolBranch) return { kind: "protocols", rule: "article:protocol-branch" };
    return { kind: "other", rule: "article" };
  }

  // 5. Taxonomy branch defaults.
  if (inStandardsBranch) return { kind: "standards", rule: "branch:standards" };
  if (inProtocolBranch) {
    const toolish =
      productStatement ||
      /\bplayers?\b/.test(firstSentenceOf(description)) ||
      branchMatches(taxonomyPath, TOOL_BRANCHES) ||
      countMatches(TOOL_WORDS, title) > 0 ||
      countMatches(LIBRARY_WORDS, title) > 0;
    if (!toolish) return { kind: "protocols", rule: "branch:protocols" };
    return softwareKind(s);
  }
  if (branchMatches(taxonomyPath, TOOL_BRANCHES) || branchMatches(taxonomyPath, LIBRARY_BRANCHES)) {
    return softwareKind(s);
  }

  // A product page that describes itself as software, wherever it is filed.
  if (productStatement) return softwareKind(s);

  // 6. Outside the known branches: fall back to wording alone.
  if (PROTOCOL_WORDS.test(title)) return { kind: "protocols", rule: "words:protocol" };
  if (countMatches(LIBRARY_WORDS, title) + countMatches(TOOL_WORDS, title) > 0) return softwareKind(s);
  return { kind: "other", rule: "unclassified" };
}
