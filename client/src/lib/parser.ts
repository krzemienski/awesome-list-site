import { Resource, Category, Subcategory, AwesomeList } from "@/types/awesome-list";
import { slugify } from "@/lib/utils";

/**
 * Process the raw JSON data from the API into a structured AwesomeList
 * If the server already provides categories, use those instead of recalculating
 */
export function processAwesomeListData(data: any): AwesomeList {
  if (!data || !data.resources || !Array.isArray(data.resources)) {
    throw new Error("Invalid awesome list data format");
  }
  
  // If the server already provides a properly structured categories array, use it
  if (data.categories && Array.isArray(data.categories)) {
    return {
      title: data.title,
      description: data.description,
      repoUrl: data.repoUrl,
      resources: data.resources,
      categories: data.categories.map((cat: any) => ({
        name: cat.name,
        slug: cat.slug,
        resources: cat.resources || [],
        subcategories: (cat.subcategories || []).map((sub: any) => ({
          name: sub.name,
          slug: sub.slug,
          resources: sub.resources || []
        }))
      }))
    };
  }
  
  const resources: Resource[] = data.resources.map((resource: any) => ({
    id: resource.id,
    title: resource.title,
    url: resource.url,
    description: resource.description || "",
    category: resource.category,
    subcategory: resource.subcategory || undefined,
    tags: resource.tags || [],
  }));
  
  // Define the 9 top-level categories exactly as per CSV
  const topLevelCategories = [
    { name: "Community & Events", slug: "community-events" },
    { name: "Encoding & Codecs", slug: "encoding-codecs" },
    { name: "General Tools", slug: "general-tools" },
    { name: "Infrastructure & Delivery", slug: "infrastructure-delivery" },
    { name: "Intro & Learning", slug: "intro-learning" },
    { name: "Media Tools", slug: "media-tools" },
    { name: "Players & Clients", slug: "players-clients" },
    { name: "Protocols & Transport", slug: "protocols-transport" },
    { name: "Standards & Industry", slug: "standards-industry" }
  ];
  
  // Create category map with proper hierarchy
  const categoryMap = new Map<string, Category>();
  
  // Initialize all top-level categories
  topLevelCategories.forEach(topCat => {
    categoryMap.set(topCat.name, {
      name: topCat.name,
      slug: topCat.slug,
      resources: [],
      subcategories: []
    });
  });
  
  // Process each resource and aggregate properly
  resources.forEach(resource => {
    const mainCategoryName = resource.category;
    const subcategoryName = resource.subcategory;
    
    // Find or create main category
    let mainCategory = categoryMap.get(mainCategoryName);
    if (!mainCategory) {
      // If this category isn't in our top-level list, map it to the closest match
      const mappedCategory = mapToTopLevelCategory(mainCategoryName);
      mainCategory = categoryMap.get(mappedCategory);
      if (!mainCategory) {
        console.warn(`Could not map category: ${mainCategoryName}`);
        return;
      }
    }
    
    // Add resource to main category
    mainCategory.resources.push(resource);
    
    // Handle subcategory
    if (subcategoryName) {
      let subcategory = mainCategory.subcategories.find(
        sub => sub.name === subcategoryName
      );
      
      if (!subcategory) {
        subcategory = {
          name: subcategoryName,
          slug: slugify(subcategoryName),
          resources: []
        };
        mainCategory.subcategories.push(subcategory);
      }
      
      subcategory.resources.push(resource);
    }
  });
  
  // Convert to array and ensure only top-level categories are returned
  const categories = topLevelCategories
    .map(topCat => categoryMap.get(topCat.name)!)
    .filter(cat => cat && cat.resources.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
  
  // Sort subcategories within each category
  categories.forEach(category => {
    category.subcategories.sort((a, b) => a.name.localeCompare(b.name));
  });
  
  return {
    title: data.title || "Awesome List",
    description: data.description || "",
    repoUrl: data.repoUrl || "",
    resources,
    categories
  };
}

// Helper function to map individual categories to top-level categories
function mapToTopLevelCategory(categoryName: string): string {
  // Map individual categories to their top-level parents based on CSV structure
  const categoryMapping: Record<string, string> = {
    // Community & Events - Total should be 91
    "Community Groups": "Community & Events",
    "Events & Conferences": "Community & Events", 
    "Online Forums": "Community & Events",
    "Slack & Meetups": "Community & Events",
    "Conferences": "Community & Events",
    "Podcasts & Webinars": "Community & Events",
    
    // Encoding & Codecs - Total should be 392
    "Encoding Tools": "Encoding & Codecs",
    "Codecs": "Encoding & Codecs", 
    "FFMPEG": "Encoding & Codecs",
    "AV1": "Encoding & Codecs",
    "HEVC": "Encoding & Codecs",
    "VP9": "Encoding & Codecs",
    "Other Encoders": "Encoding & Codecs",
    
    // General Tools - Total should be 97
    "DRM": "General Tools",
    "FFMPEG & Tools": "General Tools",
    
    // Infrastructure & Delivery - Total should be 134 (currently showing 190, over-assigned)
    "Cloud & CDN": "Infrastructure & Delivery",
    "Streaming Servers": "Infrastructure & Delivery", 
    "CDN Integration": "Infrastructure & Delivery",
    "Cloud Platforms": "Infrastructure & Delivery",
    "Origin Servers": "Infrastructure & Delivery",
    "Storage Solutions": "Infrastructure & Delivery",
    
    // Intro & Learning - Total should be 229
    "Introduction": "Intro & Learning",
    "Learning Resources": "Intro & Learning",
    "Tutorials & Case Studies": "Intro & Learning",
    
    // Media Tools - Total should be 317
    "Ads & QoE": "Media Tools",
    "Audio & Subtitles": "Media Tools",
    "Advertising": "Media Tools",
    "Quality & Testing": "Media Tools",
    "Audio": "Media Tools", 
    "Subtitles & Captions": "Media Tools",
    
    // Players & Clients - Total should be 425 (currently showing 269, under-assigned)
    "Hardware Players": "Players & Clients",
    "Mobile & Web Players": "Players & Clients",
    "Chromecast": "Players & Clients",
    "Roku": "Players & Clients", 
    "Smart TVs": "Players & Clients",
    "Smart TV": "Players & Clients", // Alternative form
    "Android": "Players & Clients",
    "iOS/tvOS": "Players & Clients",
    "Web Players": "Players & Clients",
    "Players & Clients": "Players & Clients", // Direct match
    
    // Protocols & Transport - Total should be 252 
    "Adaptive Streaming": "Protocols & Transport",
    "Transport Protocols": "Protocols & Transport",
    "DASH": "Protocols & Transport",
    "HLS": "Protocols & Transport",
    "RIST": "Protocols & Transport",
    "RTMP": "Protocols & Transport",
    "SRT": "Protocols & Transport",
    
    // Standards & Industry - Total should be 174
    "Specs & Standards": "Standards & Industry",
    "Vendors & HDR": "Standards & Industry",
    "MPEG & Forums": "Standards & Industry",
    "Official Specs": "Standards & Industry",
    "HDR Guidelines": "Standards & Industry",
    "Vendor Docs": "Standards & Industry"
  };
  
  return categoryMapping[categoryName] || categoryName;
}
