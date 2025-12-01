/**
 * Shared category mapping utility
 * Maps 21 database category variants to 9 canonical categories
 */

export function mapCategoryName(category: string | null): string | null {
  if (!category) return null;
  
  // Comprehensive mapping of all 21 database category variants to 9 canonical categories
  const categoryMap: Record<string, string> = {
    // Variant → Canonical mappings (12 variants)
    'Video Players & Playback Libraries': 'Players & Clients',
    'Video Editing & Processing Tools': 'Media Tools',
    'Video Encoding Transcoding & Packaging Tools': 'Encoding & Codecs',
    'Transcoding Codecs & Hardware Acceleration': 'Encoding & Codecs',
    'Learning Tutorials & Documentation': 'Intro & Learning',
    'Media Analysis Quality Metrics & AI Tools': 'Media Tools',
    'Adaptive Streaming & Manifest Tools': 'Protocols & Transport',
    'Build Tools Deployment & Utility Libraries': 'General Tools',
    'DRM Security & Content Protection': 'General Tools',
    'Standards Specifications & Industry Resources': 'Standards & Industry',
    'Miscellaneous Experimental & Niche Tools': 'General Tools',
    'Video Streaming & Distribution Solutions': 'Infrastructure & Delivery',
    
    // Canonical categories (9) - explicit passthrough for clarity
    'Community & Events': 'Community & Events',
    'Encoding & Codecs': 'Encoding & Codecs',
    'General Tools': 'General Tools',
    'Infrastructure & Delivery': 'Infrastructure & Delivery',
    'Intro & Learning': 'Intro & Learning',
    'Media Tools': 'Media Tools',
    'Players & Clients': 'Players & Clients',
    'Protocols & Transport': 'Protocols & Transport',
    'Standards & Industry': 'Standards & Industry',
  };
  
  const mapped = categoryMap[category];
  
  // Defensive logging for unmapped categories in production
  if (!mapped && process.env.NODE_ENV === 'production') {
    console.warn(`⚠️  Unmapped category found: "${category}" - resource will be dropped!`);
  }
  
  return mapped || category;
}
