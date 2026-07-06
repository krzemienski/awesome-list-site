export interface FaqItem {
  question: string;
  answer: string;
}

export const ABOUT_FAQS: FaqItem[] = [
  {
    question: "What is Awesome Video?",
    answer:
      "Awesome Video (awesome.video) is a free, searchable directory of curated video development resources — encoders, players, codecs, streaming tools, specifications, and learning materials — organized across 9 top-level categories. It publishes more than 1,800 reviewed resources drawn from the open-source awesome-video list maintained by Nick Krzemienski on GitHub.",
  },
  {
    question: "Is Awesome Video free to use?",
    answer:
      "Yes. Browsing, search, and learning journeys are completely free and require no account. Both the underlying resource list (awesome-video) and the platform that renders it (awesome-list-site) are open source on GitHub.",
  },
  {
    question: "How are resources curated?",
    answer:
      "Every resource is sourced from the community-maintained awesome-video GitHub repository. New submissions are reviewed by maintainers before being published, and the site database stays in sync with the list, so quality and relevance are checked by humans rather than scraped automatically.",
  },
  {
    question: "What topics does Awesome Video cover?",
    answer:
      "The directory spans the full video pipeline: encoding and codecs (AV1, HEVC, H.264), adaptive streaming protocols such as HLS and MPEG-DASH, FFmpeg tooling, video players for web and mobile, media processing infrastructure, quality testing, learning courses, and community events and conferences.",
  },
  {
    question: "How do I suggest a new resource?",
    answer:
      "Use the Submit page at awesome.video/submit. Sign in, provide the resource URL, title, and category, and a maintainer will review your suggestion before it is published to the directory.",
  },
  {
    question: "What are the best video codecs for developers?",
    answer:
      "The most widely used video codecs are H.264/AVC for maximum device compatibility, H.265/HEVC for higher efficiency on 4K and HDR content, AV1 for royalty-free next-generation compression, and VP9 for web streaming. Awesome Video curates encoders, specifications, and comparison resources for each of these codecs in its encoding and codecs category.",
  },
  {
    question: "What are the best free video encoding tools?",
    answer:
      "FFmpeg is the most popular free, open-source tool for encoding, transcoding, and processing video, and it powers a large share of the industry. Other widely used free tools include HandBrake for desktop transcoding, Shaka Packager and Bento4 for packaging HLS and DASH, and GPAC for MP4 and streaming workflows. All are catalogued in Awesome Video's encoding and tooling categories.",
  },
  {
    question: "What streaming protocols should I use?",
    answer:
      "HLS (HTTP Live Streaming) and MPEG-DASH are the two dominant adaptive bitrate protocols for on-demand and live video, with CMAF used to share a single set of media segments between them. WebRTC is preferred for real-time, sub-second latency use cases, while RTMP is still common for ingest. Awesome Video's streaming category collects specifications, servers, and players for each.",
  },
  {
    question: "What are the best open-source video players for the web?",
    answer:
      "Popular open-source web players include Video.js, Plyr, and Vidstack for general playback, plus hls.js, dash.js, and Google's Shaka Player for adaptive HLS and MPEG-DASH streaming in the browser. Awesome Video lists players and player SDKs for web, mobile, and smart-TV platforms in its players category.",
  },
  {
    question: "How do I get started with video development?",
    answer:
      "A good path is to learn the fundamentals of codecs and containers, practice encoding with FFmpeg, and then experiment with an adaptive streaming player such as hls.js or Shaka Player. Awesome Video offers guided learning journeys and a curated set of courses, articles, and tools that take you from beginner streaming concepts to advanced encoding pipelines.",
  },
];
