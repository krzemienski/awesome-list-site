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
    const jsonUrl = "https://raw.githubusercontent.com/krzemienski/awesome-video/master/contents.json";
    
    console.log(`Fetching awesome-video JSON from: ${jsonUrl}`);
    const response = await fetch(jsonUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`✅ JSON data fetched successfully`);
    
    // Parse categories into a lookup map
    const categoryMap = new Map<string, VideoCategory>();
    data.categories?.forEach((cat: VideoCategory) => {
      categoryMap.set(cat.id, cat);
    });
    
    // Build category hierarchy tree
    const topLevelCategories = data.categories?.filter((cat: VideoCategory) => !cat.parent) || [];
    const categoryHierarchy = new Map<string, {
      category: VideoCategory;
      level2: Map<string, { category: VideoCategory; level3: VideoCategory[] }>;
    }>();
    
    // Build 3-level hierarchy
    topLevelCategories.forEach((level1: VideoCategory) => {
      const level2Map = new Map<string, { category: VideoCategory; level3: VideoCategory[] }>();
      
      // Find level 2 categories
      const level2Categories = data.categories?.filter((cat: VideoCategory) => cat.parent === level1.id) || [];
      level2Categories.forEach((level2: VideoCategory) => {
        // Find level 3 categories
        const level3Categories = data.categories?.filter((cat: VideoCategory) => cat.parent === level2.id) || [];
        level2Map.set(level2.id, { category: level2, level3: level3Categories });
      });
      
      categoryHierarchy.set(level1.id, { category: level1, level2: level2Map });
    });
    
    // Parse resources and map them to the hierarchy
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
        
        // Determine category hierarchy from the resource's category array
        const leafCategoryId = resource.category?.[0] || 'video-tools';
        const leafCategory = categoryMap.get(leafCategoryId);
        
        if (!leafCategory) {
          console.warn(`Unknown category ID: ${leafCategoryId}`);
          return;
        }
        
        // Find the hierarchy path: leaf -> level2 -> level1
        let level1Title = leafCategory.title;
        let level2Title: string | undefined = undefined;
        let leafTitle = leafCategory.title;
        
        if (leafCategory.parent) {
          const parentCategory = categoryMap.get(leafCategory.parent);
          if (parentCategory) {
            if (parentCategory.parent) {
              // This is a level 3 category
              const grandParentCategory = categoryMap.get(parentCategory.parent);
              if (grandParentCategory) {
                level1Title = grandParentCategory.title;
                level2Title = parentCategory.title;
                leafTitle = leafCategory.title;
              }
            } else {
              // This is a level 2 category
              level1Title = parentCategory.title;
              level2Title = leafCategory.title;
              leafTitle = leafCategory.title;
            }
          }
        }
        // If no parent, it's a top-level category (shouldn't happen for resources, but handle it)
        
        resources.push({
          id: `video-${index}`,
          title: resource.title,
          url: resource.homepage,
          description: resource.description,
          category: level1Title,
          subcategory: level2Title,
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