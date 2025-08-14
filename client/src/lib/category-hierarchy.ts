// Hierarchical category structure based on Category_Tree__All_Levels CSV
// This reflects the proper organization of 2,011 video resources

export interface HierarchicalCategory {
  cid: string;
  title: string;
  slug: string;
  parent_cid?: string;
  parent_slug?: string;
  level: number;
  num_children: number;
  direct_projects: number;
  total_projects: number;
  is_top_level: boolean;
  path: string;
  children?: HierarchicalCategory[];
}

// The definitive category tree structure from the CSV
export const HIERARCHICAL_CATEGORIES: HierarchicalCategory[] = [
  {
    cid: "1",
    title: "Community & Events", 
    slug: "community-events",
    level: 1,
    num_children: 2,
    direct_projects: 81,
    total_projects: 91,
    is_top_level: true,
    path: "Community & Events",
    children: [
      {
        cid: "1.1",
        title: "Community Groups",
        slug: "community-groups", 
        parent_cid: "1",
        parent_slug: "community-events",
        level: 2,
        num_children: 2,
        direct_projects: 2,
        total_projects: 4,
        is_top_level: false,
        path: "Community & Events > Community Groups",
        children: [
          {
            cid: "1.1.1",
            title: "Online Forums",
            slug: "online-forums",
            parent_cid: "1.1",
            parent_slug: "community-groups",
            level: 3,
            num_children: 0,
            direct_projects: 2,
            total_projects: 2,
            is_top_level: false,
            path: "Community & Events > Community Groups > Online Forums"
          },
          {
            cid: "1.1.2", 
            title: "Slack & Meetups",
            slug: "slack-meetups",
            parent_cid: "1.1",
            parent_slug: "community-groups",
            level: 3,
            num_children: 0,
            direct_projects: 0,
            total_projects: 0,
            is_top_level: false,
            path: "Community & Events > Community Groups > Slack & Meetups"
          }
        ]
      },
      {
        cid: "1.2",
        title: "Events & Conferences",
        slug: "events-conferences",
        parent_cid: "1", 
        parent_slug: "community-events",
        level: 2,
        num_children: 2,
        direct_projects: 4,
        total_projects: 6,
        is_top_level: false,
        path: "Community & Events > Events & Conferences",
        children: [
          {
            cid: "1.2.1",
            title: "Conferences", 
            slug: "conferences",
            parent_cid: "1.2",
            parent_slug: "events-conferences",
            level: 3,
            num_children: 0,
            direct_projects: 0,
            total_projects: 0,
            is_top_level: false,
            path: "Community & Events > Events & Conferences > Conferences"
          },
          {
            cid: "1.2.2",
            title: "Podcasts & Webinars",
            slug: "podcasts-webinars", 
            parent_cid: "1.2",
            parent_slug: "events-conferences",
            level: 3,
            num_children: 0,
            direct_projects: 2,
            total_projects: 2,
            is_top_level: false,
            path: "Community & Events > Events & Conferences > Podcasts & Webinars"
          }
        ]
      }
    ]
  },
  {
    cid: "2",
    title: "Encoding & Codecs",
    slug: "encoding-codecs", 
    level: 1,
    num_children: 2,
    direct_projects: 123,
    total_projects: 392,
    is_top_level: true,
    path: "Encoding & Codecs",
    children: [
      {
        cid: "2.1",
        title: "Codecs",
        slug: "codecs",
        parent_cid: "2",
        parent_slug: "encoding-codecs",
        level: 2,
        num_children: 3,
        direct_projects: 12,
        total_projects: 29,
        is_top_level: false,
        path: "Encoding & Codecs > Codecs", 
        children: [
          {
            cid: "2.1.1",
            title: "AV1",
            slug: "av1",
            parent_cid: "2.1",
            parent_slug: "codecs",
            level: 3,
            num_children: 0,
            direct_projects: 6,
            total_projects: 6,
            is_top_level: false,
            path: "Encoding & Codecs > Codecs > AV1"
          },
          {
            cid: "2.1.2",
            title: "HEVC", 
            slug: "hevc",
            parent_cid: "2.1",
            parent_slug: "codecs",
            level: 3,
            num_children: 0,
            direct_projects: 10,
            total_projects: 10,
            is_top_level: false,
            path: "Encoding & Codecs > Codecs > HEVC"
          },
          {
            cid: "2.1.3",
            title: "VP9",
            slug: "vp9", 
            parent_cid: "2.1",
            parent_slug: "codecs",
            level: 3,
            num_children: 0,
            direct_projects: 1,
            total_projects: 1,
            is_top_level: false,
            path: "Encoding & Codecs > Codecs > VP9"
          }
        ]
      },
      {
        cid: "2.2",
        title: "Encoding Tools",
        slug: "encoding-tools",
        parent_cid: "2",
        parent_slug: "encoding-codecs", 
        level: 2,
        num_children: 2,
        direct_projects: 173,
        total_projects: 240,
        is_top_level: false,
        path: "Encoding & Codecs > Encoding Tools",
        children: [
          {
            cid: "2.2.1",
            title: "FFMPEG",
            slug: "ffmpeg",
            parent_cid: "2.2",
            parent_slug: "encoding-tools",
            level: 3,
            num_children: 0,
            direct_projects: 66,
            total_projects: 66,
            is_top_level: false,
            path: "Encoding & Codecs > Encoding Tools > FFMPEG"
          },
          {
            cid: "2.2.2",
            title: "Other Encoders",
            slug: "other-encoders",
            parent_cid: "2.2", 
            parent_slug: "encoding-tools",
            level: 3,
            num_children: 0,
            direct_projects: 1,
            total_projects: 1,
            is_top_level: false,
            path: "Encoding & Codecs > Encoding Tools > Other Encoders"
          }
        ]
      }
    ]
  },
  {
    cid: "3",
    title: "General Tools",
    slug: "general-tools",
    level: 1,
    num_children: 2,
    direct_projects: 80,
    total_projects: 97,
    is_top_level: true, 
    path: "General Tools",
    children: [
      {
        cid: "3.1",
        title: "DRM",
        slug: "drm",
        parent_cid: "3",
        parent_slug: "general-tools",
        level: 2,
        num_children: 0,
        direct_projects: 17,
        total_projects: 17,
        is_top_level: false,
        path: "General Tools > DRM"
      },
      {
        cid: "3.2",
        title: "FFMPEG & Tools",
        slug: "ffmpeg-tools",
        parent_cid: "3",
        parent_slug: "general-tools",
        level: 2,
        num_children: 0,
        direct_projects: 0,
        total_projects: 0,
        is_top_level: false,
        path: "General Tools > FFMPEG & Tools"
      }
    ]
  },
  {
    cid: "4",
    title: "Infrastructure & Delivery",
    slug: "infrastructure-delivery",
    level: 1,
    num_children: 2, 
    direct_projects: 100,
    total_projects: 134,
    is_top_level: true,
    path: "Infrastructure & Delivery",
    children: [
      {
        cid: "4.1",
        title: "Cloud & CDN",
        slug: "cloud-cdn",
        parent_cid: "4",
        parent_slug: "infrastructure-delivery",
        level: 2,
        num_children: 2,
        direct_projects: 54,
        total_projects: 54,
        is_top_level: false,
        path: "Infrastructure & Delivery > Cloud & CDN",
        children: [
          {
            cid: "4.1.1",
            title: "CDN Integration",
            slug: "cdn-integration",
            parent_cid: "4.1",
            parent_slug: "cloud-cdn",
            level: 3,
            num_children: 0,
            direct_projects: 3,
            total_projects: 3,
            is_top_level: false,
            path: "Infrastructure & Delivery > Cloud & CDN > CDN Integration"
          },
          {
            cid: "4.1.2",
            title: "Cloud Platforms",
            slug: "cloud-platforms",
            parent_cid: "4.1",
            parent_slug: "cloud-cdn",
            level: 3,
            num_children: 0,
            direct_projects: 4,
            total_projects: 4,
            is_top_level: false,
            path: "Infrastructure & Delivery > Cloud & CDN > Cloud Platforms"
          }
        ]
      },
      {
        cid: "4.2",
        title: "Streaming Servers",
        slug: "streaming-servers",
        parent_cid: "4",
        parent_slug: "infrastructure-delivery",
        level: 2,
        num_children: 2,
        direct_projects: 35,
        total_projects: 39,
        is_top_level: false,
        path: "Infrastructure & Delivery > Streaming Servers",
        children: [
          {
            cid: "4.2.1",
            title: "Origin Servers",
            slug: "origin-servers",
            parent_cid: "4.2",
            parent_slug: "streaming-servers",
            level: 3,
            num_children: 0,
            direct_projects: 1,
            total_projects: 1,
            is_top_level: false,
            path: "Infrastructure & Delivery > Streaming Servers > Origin Servers"
          },
          {
            cid: "4.2.2",
            title: "Storage Solutions",
            slug: "storage-solutions", 
            parent_cid: "4.2",
            parent_slug: "streaming-servers",
            level: 3,
            num_children: 0,
            direct_projects: 3,
            total_projects: 3,
            is_top_level: false,
            path: "Infrastructure & Delivery > Streaming Servers > Storage Solutions"
          }
        ]
      }
    ]
  },
  {
    cid: "5",
    title: "Intro & Learning",
    slug: "intro-learning",
    level: 1,
    num_children: 3,
    direct_projects: 129,
    total_projects: 229,
    is_top_level: true,
    path: "Intro & Learning",
    children: [
      {
        cid: "5.1",
        title: "Introduction",
        slug: "introduction",
        parent_cid: "5",
        parent_slug: "intro-learning",
        level: 2,
        num_children: 0,
        direct_projects: 4,
        total_projects: 4,
        is_top_level: false,
        path: "Intro & Learning > Introduction"
      },
      {
        cid: "5.2",
        title: "Learning Resources",
        slug: "learning-resources",
        parent_cid: "5",
        parent_slug: "intro-learning",
        level: 2,
        num_children: 0,
        direct_projects: 36,
        total_projects: 36,
        is_top_level: false,
        path: "Intro & Learning > Learning Resources"
      },
      {
        cid: "5.3", 
        title: "Tutorials & Case Studies",
        slug: "tutorials-case-studies",
        parent_cid: "5",
        parent_slug: "intro-learning",
        level: 2,
        num_children: 0,
        direct_projects: 60,
        total_projects: 60,
        is_top_level: false,
        path: "Intro & Learning > Tutorials & Case Studies"
      }
    ]
  },
  {
    cid: "6",
    title: "Media Tools",
    slug: "media-tools",
    level: 1,
    num_children: 2,
    direct_projects: 214,
    total_projects: 317,
    is_top_level: true,
    path: "Media Tools",
    children: [
      {
        cid: "6.1",
        title: "Ads & QoE",
        slug: "ads-qoe",
        parent_cid: "6",
        parent_slug: "media-tools",
        level: 2,
        num_children: 2,
        direct_projects: 9,
        total_projects: 45,
        is_top_level: false,
        path: "Media Tools > Ads & QoE",
        children: [
          {
            cid: "6.1.1",
            title: "Advertising",
            slug: "advertising",
            parent_cid: "6.1",
            parent_slug: "ads-qoe",
            level: 3,
            num_children: 0,
            direct_projects: 0,
            total_projects: 0,
            is_top_level: false,
            path: "Media Tools > Ads & QoE > Advertising"
          },
          {
            cid: "6.1.2",
            title: "Quality & Testing",
            slug: "quality-testing",
            parent_cid: "6.1",
            parent_slug: "ads-qoe",
            level: 3,
            num_children: 0,
            direct_projects: 36,
            total_projects: 36,
            is_top_level: false,
            path: "Media Tools > Ads & QoE > Quality & Testing"
          }
        ]
      },
      {
        cid: "6.2",
        title: "Audio & Subtitles",
        slug: "audio-subtitles",
        parent_cid: "6",
        parent_slug: "media-tools",
        level: 2,
        num_children: 2,
        direct_projects: 10,
        total_projects: 58,
        is_top_level: false,
        path: "Media Tools > Audio & Subtitles",
        children: [
          {
            cid: "6.2.1",
            title: "Audio",
            slug: "audio",
            parent_cid: "6.2",
            parent_slug: "audio-subtitles",
            level: 3,
            num_children: 0,
            direct_projects: 8,
            total_projects: 8,
            is_top_level: false,
            path: "Media Tools > Audio & Subtitles > Audio"
          },
          {
            cid: "6.2.2",
            title: "Subtitles & Captions",
            slug: "subtitles-captions",
            parent_cid: "6.2",
            parent_slug: "audio-subtitles",
            level: 3,
            num_children: 0,
            direct_projects: 6,
            total_projects: 6,
            is_top_level: false,
            path: "Media Tools > Audio & Subtitles > Subtitles & Captions"
          }
        ]
      }
    ]
  },
  {
    cid: "7",
    title: "Players & Clients",
    slug: "players-clients",
    level: 1,
    num_children: 2,
    direct_projects: 196,
    total_projects: 425,
    is_top_level: true,
    path: "Players & Clients",
    children: [
      {
        cid: "7.1",
        title: "Hardware Players",
        slug: "hardware-players",
        parent_cid: "7",
        parent_slug: "players-clients",
        level: 2,
        num_children: 3,
        direct_projects: 19,
        total_projects: 63,
        is_top_level: false,
        path: "Players & Clients > Hardware Players",
        children: [
          {
            cid: "7.1.1",
            title: "Chromecast",
            slug: "chromecast",
            parent_cid: "7.1",
            parent_slug: "hardware-players",
            level: 3,
            num_children: 0,
            direct_projects: 2,
            total_projects: 2,
            is_top_level: false,
            path: "Players & Clients > Hardware Players > Chromecast"
          },
          {
            cid: "7.1.2",
            title: "Roku",
            slug: "roku",
            parent_cid: "7.1",
            parent_slug: "hardware-players",
            level: 3,
            num_children: 0,
            direct_projects: 24,
            total_projects: 24,
            is_top_level: false,
            path: "Players & Clients > Hardware Players > Roku"
          },
          {
            cid: "7.1.3",
            title: "Smart TVs",
            slug: "smart-tv",
            parent_cid: "7.1",
            parent_slug: "hardware-players",
            level: 3,
            num_children: 0,
            direct_projects: 12,
            total_projects: 12,
            is_top_level: false,
            path: "Players & Clients > Hardware Players > Smart TVs"
          }
        ]
      },
      {
        cid: "7.2",
        title: "Mobile & Web Players",
        slug: "mobile-web-players",
        parent_cid: "7",
        parent_slug: "players-clients",
        level: 2,
        num_children: 3,
        direct_projects: 98,
        total_projects: 148,
        is_top_level: false,
        path: "Players & Clients > Mobile & Web Players",
        children: [
          {
            cid: "7.2.1",
            title: "Android",
            slug: "android",
            parent_cid: "7.2",
            parent_slug: "mobile-web-players",
            level: 3,
            num_children: 0,
            direct_projects: 4,
            total_projects: 4,
            is_top_level: false,
            path: "Players & Clients > Mobile & Web Players > Android"
          },
          {
            cid: "7.2.2",
            title: "iOS/tvOS",
            slug: "ios-tvos",
            parent_cid: "7.2",
            parent_slug: "mobile-web-players",
            level: 3,
            num_children: 0,
            direct_projects: 19,
            total_projects: 19,
            is_top_level: false,
            path: "Players & Clients > Mobile & Web Players > iOS/tvOS"
          },
          {
            cid: "7.2.3",
            title: "Web Players",
            slug: "web-players",
            parent_cid: "7.2",
            parent_slug: "mobile-web-players",
            level: 3,
            num_children: 0,
            direct_projects: 27,
            total_projects: 27,
            is_top_level: false,
            path: "Players & Clients > Mobile & Web Players > Web Players"
          }
        ]
      }
    ]
  },
  {
    cid: "8",
    title: "Protocols & Transport",
    slug: "protocols-transport",
    level: 1,
    num_children: 2,
    direct_projects: 95,
    total_projects: 252,
    is_top_level: true,
    path: "Protocols & Transport",
    children: [
      {
        cid: "8.1",
        title: "Adaptive Streaming",
        slug: "adaptive-streaming",
        parent_cid: "8",
        parent_slug: "protocols-transport",
        level: 2,
        num_children: 2,
        direct_projects: 31,
        total_projects: 77,
        is_top_level: false,
        path: "Protocols & Transport > Adaptive Streaming",
        children: [
          {
            cid: "8.1.1",
            title: "DASH",
            slug: "dash",
            parent_cid: "8.1",
            parent_slug: "adaptive-streaming",
            level: 3,
            num_children: 0,
            direct_projects: 8,
            total_projects: 8,
            is_top_level: false,
            path: "Protocols & Transport > Adaptive Streaming > DASH"
          },
          {
            cid: "8.1.2",
            title: "HLS",
            slug: "hls",
            parent_cid: "8.1",
            parent_slug: "adaptive-streaming",
            level: 3,
            num_children: 0,
            direct_projects: 9,
            total_projects: 9,
            is_top_level: false,
            path: "Protocols & Transport > Adaptive Streaming > HLS"
          }
        ]
      },
      {
        cid: "8.2",
        title: "Transport Protocols",
        slug: "transport-protocols",
        parent_cid: "8",
        parent_slug: "protocols-transport",
        level: 2,
        num_children: 3,
        direct_projects: 65,
        total_projects: 92,
        is_top_level: false,
        path: "Protocols & Transport > Transport Protocols",
        children: [
          {
            cid: "8.2.1",
            title: "RIST",
            slug: "rist",
            parent_cid: "8.2",
            parent_slug: "transport-protocols",
            level: 3,
            num_children: 0,
            direct_projects: 0,
            total_projects: 0,
            is_top_level: false,
            path: "Protocols & Transport > Transport Protocols > RIST"
          },
          {
            cid: "8.2.2",
            title: "RTMP",
            slug: "rtmp",
            parent_cid: "8.2",
            parent_slug: "transport-protocols",
            level: 3,
            num_children: 0,
            direct_projects: 0,
            total_projects: 0,
            is_top_level: false,
            path: "Protocols & Transport > Transport Protocols > RTMP"
          },
          {
            cid: "8.2.3",
            title: "SRT",
            slug: "srt",
            parent_cid: "8.2",
            parent_slug: "transport-protocols",
            level: 3,
            num_children: 0,
            direct_projects: 0,
            total_projects: 0,
            is_top_level: false,
            path: "Protocols & Transport > Transport Protocols > SRT"
          }
        ]
      }
    ]
  },
  {
    cid: "9",
    title: "Standards & Industry",
    slug: "standards-industry",
    level: 1,
    num_children: 2,
    direct_projects: 133,
    total_projects: 174,
    is_top_level: true,
    path: "Standards & Industry",
    children: [
      {
        cid: "9.1",
        title: "Specs & Standards",
        slug: "specs-standards",
        parent_cid: "9",
        parent_slug: "standards-industry",
        level: 2,
        num_children: 2,
        direct_projects: 87,
        total_projects: 87,
        is_top_level: false,
        path: "Standards & Industry > Specs & Standards",
        children: [
          {
            cid: "9.1.1",
            title: "MPEG & Forums",
            slug: "mpeg-forums",
            parent_cid: "9.1",
            parent_slug: "specs-standards",
            level: 3,
            num_children: 0,
            direct_projects: 10,
            total_projects: 10,
            is_top_level: false,
            path: "Standards & Industry > Specs & Standards > MPEG & Forums"
          },
          {
            cid: "9.1.2",
            title: "Official Specs",
            slug: "official-specs",
            parent_cid: "9.1",
            parent_slug: "specs-standards",
            level: 3,
            num_children: 0,
            direct_projects: 4,
            total_projects: 4,
            is_top_level: false,
            path: "Standards & Industry > Specs & Standards > Official Specs"
          }
        ]
      },
      {
        cid: "9.2",
        title: "Vendors & HDR",
        slug: "vendors-hdr",
        parent_cid: "9",
        parent_slug: "standards-industry",
        level: 2,
        num_children: 2,
        direct_projects: 39,
        total_projects: 71,
        is_top_level: false,
        path: "Standards & Industry > Vendors & HDR",
        children: [
          {
            cid: "9.2.1",
            title: "HDR Guidelines",
            slug: "hdr-guidelines",
            parent_cid: "9.2",
            parent_slug: "vendors-hdr",
            level: 3,
            num_children: 0,
            direct_projects: 3,
            total_projects: 3,
            is_top_level: false,
            path: "Standards & Industry > Vendors & HDR > HDR Guidelines"
          },
          {
            cid: "9.2.2",
            title: "Vendor Docs",
            slug: "vendor-docs",
            parent_cid: "9.2",
            parent_slug: "vendors-hdr",
            level: 3,
            num_children: 0,
            direct_projects: 4,
            total_projects: 4,
            is_top_level: false,
            path: "Standards & Industry > Vendors & HDR > Vendor Docs"
          }
        ]
      }
    ]
  }
];

// Helper function to find a category by its slug
export function findCategoryBySlug(slug: string, categories = HIERARCHICAL_CATEGORIES): HierarchicalCategory | null {
  for (const category of categories) {
    if (category.slug === slug) {
      return category;
    }
    if (category.children) {
      const found = findCategoryBySlug(slug, category.children);
      if (found) return found;
    }
  }
  return null;
}

// Helper function to get all categories as a flat list
export function getFlatCategoryList(categories = HIERARCHICAL_CATEGORIES): HierarchicalCategory[] {
  const flat: HierarchicalCategory[] = [];
  
  function traverse(cats: HierarchicalCategory[]) {
    for (const cat of cats) {
      flat.push(cat);
      if (cat.children) {
        traverse(cat.children);
      }
    }
  }
  
  traverse(categories);
  return flat;
}

// Helper function to map old category names to new hierarchical structure
export function mapLegacyCategoryToHierarchical(legacyName: string): HierarchicalCategory | null {
  const mappings: Record<string, string> = {
    "Community & Events": "community-events",
    "Encoding & Codecs": "encoding-codecs", 
    "General Tools": "general-tools",
    "Infrastructure & Delivery": "infrastructure-delivery",
    "Intro & Learning": "intro-learning",
    "Media Tools": "media-tools",
    "Players & Clients": "players-clients",
    "Protocols & Transport": "protocols-transport",
    "Standards & Industry": "standards-industry",
    
    // Level 2 mappings
    "Community Groups": "community-groups",
    "Events & Conferences": "events-conferences",
    "Codecs": "codecs",
    "Encoding Tools": "encoding-tools",
    "DRM": "drm",
    "FFMPEG & Tools": "ffmpeg-tools",
    "Cloud & CDN": "cloud-cdn",
    "Streaming Servers": "streaming-servers",
    "Introduction": "introduction", 
    "Learning Resources": "learning-resources",
    "Tutorials & Case Studies": "tutorials-case-studies",
    "Ads & QoE": "ads-qoe",
    "Audio & Subtitles": "audio-subtitles",
    "Hardware Players": "hardware-players",
    "Mobile & Web Players": "mobile-web-players",
    "Adaptive Streaming": "adaptive-streaming",
    "Transport Protocols": "transport-protocols",
    "Specs & Standards": "specs-standards",
    "Vendors & HDR": "vendors-hdr"
  };
  
  const slug = mappings[legacyName];
  if (slug) {
    return findCategoryBySlug(slug);
  }
  return null;
}