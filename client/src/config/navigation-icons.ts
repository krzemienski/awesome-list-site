import {
  BookOpen,
  Radio,
  Film,
  Play,
  FileText,
  Server,
  Users,
  Clapperboard,
  Settings,
  LucideIcon
} from "lucide-react";

export interface NavigationIconMap {
  categories: Record<string, LucideIcon>;
}

/**
 * Semantic icon for each of the 9 top-level navigation categories.
 * (Subcategory / sub-subcategory maps were dropped in task #392 — nothing
 * rendered them; the sidebar and /categories only ask for category icons.)
 */
const navigationIcons: NavigationIconMap = {
  categories: {
    "Intro & Learning": BookOpen,
    "Protocols & Transport": Radio,
    "Encoding & Codecs": Film,
    "Players & Clients": Play,
    // Clapperboard (not Wrench/Settings) so Media Tools reads as media-related
    // and is visually distinct from General Tools' gear across sidebar + home.
    "Media Tools": Clapperboard,
    "Standards & Industry": FileText,
    "Infrastructure & Delivery": Server,
    "General Tools": Settings,
    "Community & Events": Users,
  },
};

/**
 * Get icon for a category by name
 */
export function getCategoryIcon(categoryName: string): LucideIcon {
  return navigationIcons.categories[categoryName] || BookOpen;
}
