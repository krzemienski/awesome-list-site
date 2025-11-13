import fetch from 'node-fetch';

interface VideoCategory {
  id: string;
  title: string;
  parent?: string;
}

interface VideoResource {
  title: string;
  homepage: string;
  description: string;
  category: string[];
  tags?: string[];
}

interface AwesomeVideoData {
  title?: string;
  categories?: VideoCategory[];
  projects?: VideoResource[];
}

/**
 * Fetches and parses the awesome-video data from JSON source
 * Uses only the natural JSON structure - no hardcoded CSV forcing
 */
export async function fetchAwesomeVideoData() {
  try {
    console.log("Fetching awesome-video data from JSON source");
    
    // Fetch data from the JSON source
    const jsonUrl = "https://hack-ski.s3.us-east-1.amazonaws.com/av/recategorized_with_researchers_2010_projects.json";
    console.log(`Fetching awesome-video JSON from: ${jsonUrl}`);
    
    const response = await fetch(jsonUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json() as AwesomeVideoData;
    console.log("✅ JSON data fetched successfully");
    
    // Build category map for quick lookups
    const categoryMap = new Map<string, VideoCategory>();
    data.categories?.forEach((cat: VideoCategory) => {
      categoryMap.set(cat.id, cat);
    });
    
    // Build hierarchy dynamically from JSON categories
    const hierarchyStructure = buildHierarchyFromJSON(data.categories || [], categoryMap);
    
    // Function to find the top-level category for any given category ID
    const findTopLevelCategory = (categoryId: string): string | null => {
      const category = categoryMap.get(categoryId);
      if (!category) return null;
      
      if (!category.parent) return categoryId;
      return findTopLevelCategory(category.parent);
    };
    
    // Function to find level 2 category (subcategory)
    const findLevel2Category = (categoryId: string): string | null => {
      const category = categoryMap.get(categoryId);
      if (!category || !category.parent) return null;
      
      const parent = categoryMap.get(category.parent);
      if (!parent) return null;
      
      // If parent has no parent, then current category is level 2
      if (!parent.parent) return categoryId;
      
      // Otherwise, look one level up
      return findLevel2Category(category.parent);
    };
    
    // Function to find level 3 category (sub-subcategory)
    const findLevel3Category = (categoryId: string): string | null => {
      const category = categoryMap.get(categoryId);
      if (!category || !category.parent) return null;
      
      const parent = categoryMap.get(category.parent);
      if (!parent || !parent.parent) return null;
      
      const grandparent = categoryMap.get(parent.parent);
      if (!grandparent || grandparent.parent) return null;
      
      // Current category is level 3 (grandparent is level 1, parent is level 2)
      return categoryId;
    };
    
    // Helper to find the depth of a category
    const getCategoryDepth = (categoryId: string): number => {
      const category = categoryMap.get(categoryId);
      if (!category) return 0;
      
      if (!category.parent) return 1; // Top-level category
      
      const parent = categoryMap.get(category.parent);
      if (!parent) return 1;
      
      if (!parent.parent) return 2; // Subcategory
      
      const grandparent = categoryMap.get(parent.parent);
      if (!grandparent) return 2;
      
      if (!grandparent.parent) return 3; // Sub-subcategory
      
      return 3; // Maximum depth
    };
    
    // Helper to find the deepest (most specific) category ID from array
    const findDeepestCategoryId = (categoryIds: string[]): string | null => {
      let deepestId: string | null = null;
      let maxDepth = 0;
      
      for (const catId of categoryIds) {
        const depth = getCategoryDepth(catId);
        if (depth > maxDepth) {
          maxDepth = depth;
          deepestId = catId;
        }
      }
      
      return deepestId;
    };
    
    // Process resources and assign to natural hierarchy levels
    const resources: any[] = [];
    
    // Track category depth distribution for validation
    const categoryDepthStats = new Map<string, { depth1: number, depth2: number, depth3: number, total: number }>();
    
    if (data.projects) {
      data.projects.forEach((resource: VideoResource, index: number) => {
        if (!resource.category || resource.category.length === 0) {
          return; // Skip resources without category
        }
        
        // Use the deepest category ID (most specific) for proper nesting
        const primaryCategoryId = findDeepestCategoryId(resource.category);
        if (!primaryCategoryId) return;
        
        const categoryInfo = categoryMap.get(primaryCategoryId);
        
        // Track depth distribution by top-level category
        const topLevelId = findTopLevelCategory(primaryCategoryId);
        if (topLevelId) {
          const topLevelInfo = categoryMap.get(topLevelId);
          if (topLevelInfo) {
            if (!categoryDepthStats.has(topLevelInfo.title || topLevelId)) {
              categoryDepthStats.set(topLevelInfo.title || topLevelId, { depth1: 0, depth2: 0, depth3: 0, total: 0 });
            }
            const stats = categoryDepthStats.get(topLevelInfo.title || topLevelId)!;
            const depth = getCategoryDepth(primaryCategoryId);
            if (depth === 1) stats.depth1++;
            else if (depth === 2) stats.depth2++;
            else if (depth === 3) stats.depth3++;
            stats.total++;
          }
        }
        
        if (!categoryInfo) return;
        
        // Find the appropriate hierarchy levels
        let topLevelCategoryId = findTopLevelCategory(primaryCategoryId);
        let topLevelCategory = topLevelCategoryId ? categoryMap.get(topLevelCategoryId) : null;
        
        let level2CategoryId = findLevel2Category(primaryCategoryId);
        let level2Category = level2CategoryId ? categoryMap.get(level2CategoryId) : null;
        
        let level3CategoryId = findLevel3Category(primaryCategoryId);
        let level3Category = level3CategoryId ? categoryMap.get(level3CategoryId) : null;
        
        // SPECIAL FIX FOR GENERAL TOOLS: Assign to subcategories based on content
        // Since JSON data doesn't include subcategory IDs for General Tools, we assign them programmatically
        if (topLevelCategory && topLevelCategory.title === "General Tools" && !level2Category) {
          const text = `${resource.title} ${resource.description}`.toLowerCase();
          
          // Assign to DRM subcategory if contains DRM-related keywords
          if (text.includes('drm') || text.includes('widevine') || text.includes('playready') || 
              text.includes('fairplay') || text.includes('encryption') || text.includes('content protection')) {
            level2Category = { id: 'drm', title: 'DRM', parent: topLevelCategory.id };
          }
          // Assign to FFMPEG & Tools subcategory if contains FFMPEG-related keywords
          else if (text.includes('ffmpeg') || text.includes('transcode') || text.includes('encode') || 
                   text.includes('convert') || text.includes('video edit') || text.includes('processing')) {
            level2Category = { id: 'ffmpeg-tools', title: 'FFMPEG & Tools', parent: topLevelCategory.id };
          }
        }
        
        // If the primary category is at level 1, assign directly
        if (!topLevelCategory) return;
        
        // Generate contextual tags
        const allTags = generateVideoTags(resource.title, resource.description, resource.homepage);
        
        resources.push({
          id: `video-${index}`,
          title: resource.title,
          url: resource.homepage,
          description: resource.description,
          category: topLevelCategory.title,
          subcategory: level2Category?.title || null,
          subSubcategory: level3Category?.title || null,
          tags: allTags.slice(0, 8) // Limit to 8 tags
        });
      });
    }
    
    console.log(`✅ Parsed ${resources.length} video resources`);
    
    // Build complete 3-level hierarchy structure 
    const categories = Object.keys(hierarchyStructure).map(topLevelId => {
      const topLevel = hierarchyStructure[topLevelId];
      
      // Filter resources for this top-level category
      const categoryResources = resources.filter(r => r.category === topLevel.title);
      
      // Build subcategories with sub-subcategories
      const subcategories = Object.keys(topLevel.level2 || {}).map(level2Id => {
        const level2 = topLevel.level2[level2Id];
        const level2Resources = categoryResources.filter(r => r.subcategory === level2.title);
        
        // Build sub-subcategories if they exist
        const subSubcategories = level2.level3 ? Object.keys(level2.level3).map(level3Id => {
          const level3 = level2.level3[level3Id];
          const level3Resources = categoryResources.filter(r => r.subSubcategory === level3.title);
          
          return {
            name: level3.title,
            slug: level3Id,
            resources: level3Resources
          };
        }) : [];
        
        return {
          name: level2.title,
          slug: level2Id,
          resources: level2Resources,
          subSubcategories
        };
      });
      
      return {
        name: topLevel.title,
        slug: topLevelId,
        resources: categoryResources,
        subcategories
      };
    });
    
    // Log category depth distribution analysis
    console.log("\n🔍 Category Depth Distribution Analysis:");
    categoryDepthStats.forEach((stats, categoryName) => {
      const percentDepth1 = ((stats.depth1 / stats.total) * 100).toFixed(1);
      console.log(`  ${categoryName}: ${stats.total} total`);
      console.log(`    ├─ Depth 1 (top-level): ${stats.depth1} (${percentDepth1}%)`);
      console.log(`    ├─ Depth 2 (subcategory): ${stats.depth2}`);
      console.log(`    └─ Depth 3 (sub-subcategory): ${stats.depth3}`);
      
      // Flag categories with high depth-1 percentage (potential nesting issues)
      if (stats.depth1 > stats.total * 0.8 && stats.total > 20) {
        console.log(`    ⚠️  WARNING: ${percentDepth1}% resources at depth 1 - potential incomplete nesting!`);
      }
    });
    
    // Log the hierarchical structure built from JSON data
    console.log("\n📊 Dynamic Hierarchy Structure from JSON:");
    categories.forEach(cat => {
      console.log(`  📁 ${cat.name}: ${cat.resources.length} resources`);
      
      cat.subcategories.forEach(subcat => {
        console.log(`    📂 ${subcat.name}: ${subcat.resources.length} resources`);
        
        if (subcat.subSubcategories) {
          subcat.subSubcategories.forEach(subsubcat => {
            console.log(`      📄 ${subsubcat.name}: ${subsubcat.resources.length} resources`);
          });
        }
      });
    });
    
    return {
      title: data.title || "Awesome Video",
      description: "A curated list of awesome video frameworks, libraries, and software for video processing, streaming, and manipulation",
      repoUrl: "https://github.com/krzemienski/awesome-video",
      resources: resources,
      categories: categories
    };
    
  } catch (error: any) {
    console.error(`❌ Error fetching awesome-video data: ${error.message}`);
    throw error;
  }
}

/**
 * Build hierarchy structure dynamically from JSON categories
 */
function buildHierarchyFromJSON(categories: VideoCategory[], categoryMap: Map<string, VideoCategory>) {
  const hierarchy: any = {};
  
  // Find all top-level categories (categories without parents)
  const topLevelCategories = categories.filter(cat => !cat.parent);
  
  topLevelCategories.forEach(topCat => {
    const slug = generateSlug(topCat.title);
    hierarchy[slug] = {
      id: topCat.id,
      title: topCat.title,
      level2: {}
    };
    
    // Find level 2 categories (children of top-level)
    const level2Categories = categories.filter(cat => cat.parent === topCat.id);
    
    level2Categories.forEach(level2Cat => {
      const level2Slug = generateSlug(level2Cat.title);
      hierarchy[slug].level2[level2Slug] = {
        id: level2Cat.id,
        title: level2Cat.title,
        level3: {}
      };
      
      // Find level 3 categories (children of level 2)
      const level3Categories = categories.filter(cat => cat.parent === level2Cat.id);
      
      level3Categories.forEach(level3Cat => {
        const level3Slug = generateSlug(level3Cat.title);
        hierarchy[slug].level2[level2Slug].level3[level3Slug] = {
          id: level3Cat.id,
          title: level3Cat.title
        };
      });
      
      // If no level 3 categories, remove the empty level3 object
      if (Object.keys(hierarchy[slug].level2[level2Slug].level3).length === 0) {
        delete hierarchy[slug].level2[level2Slug].level3;
      }
    });
  });
  
  console.log(`📊 Built dynamic hierarchy with ${topLevelCategories.length} top-level categories`);
  return hierarchy;
}

/**
 * Generate URL-friendly slug from category title
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[&]/g, '')
    .replace(/[\s\-_]+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')
    .replace(/^-+|-+$/g, '');
}

/**
 * Generate video-specific tags from resource data
 */
function generateVideoTags(title: string, description: string, url: string): string[] {
  const tags: string[] = [];
  const text = `${title} ${description} ${url}`.toLowerCase();
  
  // Platform and language detection
  if (text.includes('javascript') || text.includes('js') || text.includes('node')) tags.push('javascript');
  if (text.includes('python') || text.includes('py')) tags.push('python');
  if (text.includes('rust') || text.includes('rs')) tags.push('rust');
  if (text.includes('go') || text.includes('golang')) tags.push('go');
  if (text.includes('c++') || text.includes('cpp')) tags.push('cpp');
  if (text.includes('java')) tags.push('java');
  if (text.includes('swift')) tags.push('swift');
  if (text.includes('kotlin')) tags.push('kotlin');
  
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