/**
 * Parser specifically for awesome-video repository's JSON format
 */

interface VideoCategory {
  title: string;
  id: string;
  description: string;
  parent: string | null;
}

interface VideoResource {
  title: string;
  homepage: string;
  description: string;
  category?: string[];
  tags?: string[];
}

interface AwesomeVideoData {
  title: string;
  categories: VideoCategory[];
  projects: VideoResource[];
}

interface AwesomeListData {
  title: string;
  description: string;
  repoUrl: string;
  resources: Array<{
    id: string;
    title: string;
    url: string;
    description: string;
    category: string;
    subcategory?: string;
    tags?: string[];
  }>;
}

/**
 * Fetch and parse awesome-video JSON data
 */
export async function fetchAwesomeVideoList(): Promise<AwesomeListData> {
  try {
    const jsonUrl = "https://hack-ski.s3.us-east-1.amazonaws.com/av/recategorized_with_researchers_2010_projects.json";
    
    console.log(`Fetching awesome-video JSON from: ${jsonUrl}`);
    const response = await fetch(jsonUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`✅ JSON data fetched successfully`);
    
    // Build category lookup map for hierarchy traversal
    const categoryMap = new Map<string, VideoCategory>();
    data.categories?.forEach((cat: VideoCategory) => {
      categoryMap.set(cat.id, cat);
    });
    
    // Define exact CSV top-level category mapping with expected resource counts
    const csvTopLevelCategories = [
      { id: "community-events", title: "Community & Events", expectedCount: 91 },
      { id: "encoding-codecs", title: "Encoding & Codecs", expectedCount: 392 },
      { id: "general-tools", title: "General Tools", expectedCount: 97 },
      { id: "infrastructure-delivery", title: "Infrastructure & Delivery", expectedCount: 134 },
      { id: "intro-learning", title: "Intro & Learning", expectedCount: 229 },
      { id: "media-tools", title: "Media Tools", expectedCount: 317 },
      { id: "players-clients", title: "Players & Clients", expectedCount: 425 },
      { id: "protocols-transport", title: "Protocols & Transport", expectedCount: 252 },
      { id: "standards-industry", title: "Standards & Industry", expectedCount: 174 }
    ];
    
    // Function to find the top-level category for any given category ID
    function findTopLevelCategory(categoryId: string): string | null {
      const category = categoryMap.get(categoryId);
      if (!category) return null;
      
      // If this category has no parent, it's a top-level category
      if (!category.parent) {
        return category.id;
      }
      
      // Recursively find the top-level parent
      return findTopLevelCategory(category.parent);
    }
    
    // Function to find level 2 category for a given category ID
    function findLevel2Category(categoryId: string): string | null {
      const category = categoryMap.get(categoryId);
      if (!category) return null;
      
      // If this category's parent is a top-level category, this is level 2
      if (category.parent) {
        const parent = categoryMap.get(category.parent);
        if (parent && !parent.parent) {
          return category.id;
        }
        // If parent has a parent, recursively find level 2
        if (parent && parent.parent) {
          return findLevel2Category(category.parent);
        }
      }
      
      return null;
    }
    
    // Parse resources and map them correctly to CSV hierarchy
    const resources: Array<{
      id: string;
      title: string;
      url: string;
      description: string;
      category: string;
      subcategory?: string;
      tags?: string[];
    }> = [];
    
    if (data.projects) {
      data.projects.forEach((resource: VideoResource, index: number) => {
        if (!resource.homepage || !resource.title) return; // Skip invalid resources
        
        // Use existing tags or generate video-specific tags
        const existingTags = resource.tags || [];
        const generatedTags = generateVideoTags(resource.title, resource.description || '', resource.homepage);
        const allTags = Array.from(new Set([...existingTags, ...generatedTags])); // Remove duplicates
        
        // Get the direct category from the resource
        const directCategoryId = resource.category?.[0];
        if (!directCategoryId) {
          console.warn(`Resource has no category: ${resource.title}`);
          return;
        }
        
        // Find the top-level category for this resource
        const topLevelCategoryId = findTopLevelCategory(directCategoryId);
        if (!topLevelCategoryId) {
          console.warn(`Could not find top-level category for: ${directCategoryId}`);
          return;
        }
        
        // Find the corresponding CSV category
        const csvCategory = csvTopLevelCategories.find(cat => cat.id === topLevelCategoryId);
        if (!csvCategory) {
          console.warn(`Unknown top-level category: ${topLevelCategoryId}`);
          return;
        }
        
        // Find level 2 category (subcategory)
        const level2CategoryId = findLevel2Category(directCategoryId);
        const level2Category = level2CategoryId ? categoryMap.get(level2CategoryId) : null;
        
        resources.push({
          id: `video-${index}`,
          title: resource.title,
          url: resource.homepage,
          description: resource.description,
          category: csvCategory.title,
          subcategory: level2Category?.title,
          tags: allTags.slice(0, 8) // Limit to 8 tags
        });
      });
    }
    
    console.log(`✅ Parsed ${resources.length} video resources`);
    
    return {
      title: data.title || "Awesome Video",
      description: "A curated list of awesome video frameworks, libraries, and software for video processing, streaming, and manipulation",
      repoUrl: "https://github.com/krzemienski/awesome-video",
      resources: resources
    };
    
  } catch (error: any) {
    console.error(`❌ Error fetching awesome-video data: ${error.message}`);
    throw error;
  }
}

/**
 * Generate video-specific tags from resource data
 */
function generateVideoTags(title: string, description: string, url: string): string[] {
  const text = `${title} ${description}`.toLowerCase();
  const tags: string[] = [];
  
  // Video technology detection
  if (text.includes('ffmpeg')) tags.push('ffmpeg');
  if (text.includes('h264') || text.includes('h.264')) tags.push('h264');
  if (text.includes('h265') || text.includes('h.265') || text.includes('hevc')) tags.push('h265');
  if (text.includes('vp9') || text.includes('vp8')) tags.push('vp9');
  if (text.includes('av1')) tags.push('av1');
  if (text.includes('webrtc')) tags.push('webrtc');
  if (text.includes('hls')) tags.push('hls');
  if (text.includes('dash')) tags.push('dash');
  if (text.includes('rtmp')) tags.push('rtmp');
  if (text.includes('rtsp')) tags.push('rtsp');
  
  // Video use cases
  if (text.includes('stream') || text.includes('live')) tags.push('streaming');
  if (text.includes('transcode') || text.includes('convert')) tags.push('transcoding');
  if (text.includes('edit') || text.includes('cutting')) tags.push('editing');
  if (text.includes('player') || text.includes('playback')) tags.push('player');
  if (text.includes('record') || text.includes('capture')) tags.push('recording');
  if (text.includes('compress') || text.includes('encoding')) tags.push('encoding');
  if (text.includes('cdn')) tags.push('cdn');
  if (text.includes('adaptive')) tags.push('adaptive');
  
  return tags.slice(0, 5); // Limit to 5 tags
}