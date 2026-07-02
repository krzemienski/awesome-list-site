export interface FaqItem {
  question: string;
  answer: string;
}

export const ABOUT_FAQS: FaqItem[] = [
  {
    question: "What is Awesome Video?",
    answer:
      "Awesome Video (awesome.video) is a free, searchable directory of curated video development resources — encoders, players, codecs, streaming tools, specifications, and learning materials — organized across 9 top-level categories. It publishes more than 2,300 reviewed resources drawn from the 2,600+ entry open-source awesome-video list maintained by Nick Krzemienski on GitHub.",
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
];
