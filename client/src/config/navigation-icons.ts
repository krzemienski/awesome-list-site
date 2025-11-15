import {
  BookOpen,
  Radio,
  Film,
  Play,
  Wrench,
  FileText,
  Server,
  Users,
  BookOpenCheck,
  GraduationCap,
  BookMarked,
  Wifi,
  Network,
  Clapperboard,
  Binary,
  Tv,
  Smartphone,
  Volume2,
  Target,
  FileCheck,
  Building,
  HardDrive,
  Cloud,
  Video,
  Lock,
  MessageCircle,
  Calendar,
  PlayCircle,
  Zap,
  Signal,
  FileVideo,
  Code,
  MonitorPlay,
  Globe,
  Music,
  Type,
  Cast,
  Apple,
  CloudUpload,
  Database,
  Megaphone,
  TestTube,
  Podcast,
  BookOpenText,
  Presentation,
  ScrollText,
  FileCode,
  Sparkles,
  Settings,
  LucideIcon
} from "lucide-react";

export interface NavigationIconMap {
  categories: Record<string, LucideIcon>;
  subcategories: Record<string, LucideIcon>;
  subSubcategories: Record<string, LucideIcon>;
}

/**
 * Comprehensive icon mapping for all 60 navigation items
 * All icons are semantic and relevant to their content area
 */
export const navigationIcons: NavigationIconMap = {
  // Main Categories (9 items)
  categories: {
    "Intro & Learning": BookOpen,
    "Protocols & Transport": Radio,
    "Encoding & Codecs": Film,
    "Players & Clients": Play,
    "Media Tools": Wrench,
    "Standards & Industry": FileText,
    "Infrastructure & Delivery": Server,
    "General Tools": Settings,
    "Community & Events": Users,
  },

  // Subcategories (19 items)
  subcategories: {
    "Introduction": BookOpenCheck,
    "Learning Resources": GraduationCap,
    "Tutorials & Case Studies": BookMarked,
    "Adaptive Streaming": Wifi,
    "Transport Protocols": Network,
    "Encoding Tools": Clapperboard,
    "Codecs": Binary,
    "Hardware Players": Tv,
    "Mobile & Web Players": Smartphone,
    "Audio & Subtitles": Volume2,
    "Ads & QoE": Target,
    "Specs & Standards": FileCheck,
    "Vendors & HDR": Building,
    "Streaming Servers": HardDrive,
    "Cloud & CDN": Cloud,
    "FFMPEG & Tools": Video,
    "DRM": Lock,
    "Community Groups": MessageCircle,
    "Events & Conferences": Calendar,
  },

  // Sub-Subcategories (32 items)
  subSubcategories: {
    "HLS": PlayCircle,
    "DASH": Zap,
    "RIST": Signal,
    "RTMP": Signal,
    "SRT": Signal,
    "FFMPEG": FileVideo,
    "Other Encoders": Clapperboard,
    "HEVC": Code,
    "VP9": Code,
    "AV1": Code,
    "Roku": MonitorPlay,
    "iOS/tvOS": Apple,
    "Android": Smartphone,
    "Web Players": Globe,
    "Audio": Music,
    "Subtitles & Captions": Type,
    "Chromecast": Cast,
    "Smart TVs": Tv,
    "CDN Integration": CloudUpload,
    "Cloud Platforms": Cloud,
    "Origin Servers": Server,
    "Storage Solutions": Database,
    "Advertising": Megaphone,
    "Quality & Testing": TestTube,
    "Online Forums": MessageCircle,
    "Slack & Meetups": Users,
    "Conferences": Presentation,
    "Podcasts & Webinars": Podcast,
    "MPEG & Forums": ScrollText,
    "Official Specs": FileCode,
    "HDR Guidelines": Sparkles,
    "Vendor Docs": BookOpenText,
  },
};

/**
 * Get icon for a category by name
 */
export function getCategoryIcon(categoryName: string): LucideIcon {
  return navigationIcons.categories[categoryName] || BookOpen;
}

/**
 * Get icon for a subcategory by name
 */
export function getSubcategoryIcon(subcategoryName: string): LucideIcon {
  return navigationIcons.subcategories[subcategoryName] || FileText;
}

/**
 * Get icon for a sub-subcategory by name
 */
export function getSubSubcategoryIcon(subSubcategoryName: string): LucideIcon {
  return navigationIcons.subSubcategories[subSubcategoryName] || PlayCircle;
}
