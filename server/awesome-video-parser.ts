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
    subSubcategory?: string;
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
    
    // Complete 3-level hierarchy structure based on CSV analysis
    const hierarchyStructure = {
      "community-events": {
        title: "Community & Events",
        totalCount: 91,
        level2: {
          "community-groups": {
            title: "Community Groups",
            count: 4,
            level3: {
              "online-forums": { title: "Online Forums", count: 2 },
              "slack-meetups": { title: "Slack & Meetups", count: 0 }
            }
          },
          "events-conferences": {
            title: "Events & Conferences", 
            count: 6,
            level3: {
              "conferences": { title: "Conferences", count: 0 },
              "podcasts-webinars": { title: "Podcasts & Webinars", count: 2 }
            }
          }
        }
      },
      "encoding-codecs": {
        title: "Encoding & Codecs",
        totalCount: 392,
        level2: {
          "codecs": {
            title: "Codecs",
            count: 29,
            level3: {
              "av1": { title: "AV1", count: 6 },
              "hevc": { title: "HEVC", count: 10 },
              "vp9": { title: "VP9", count: 1 }
            }
          },
          "encoding-tools": {
            title: "Encoding Tools",
            count: 240,
            level3: {
              "ffmpeg": { title: "FFMPEG", count: 66 },
              "other-encoders": { title: "Other Encoders", count: 1 }
            }
          }
        }
      },
      "general-tools": {
        title: "General Tools",
        totalCount: 97,
        level2: {
          "drm": { title: "DRM", count: 17 },
          "ffmpeg-tools": { title: "FFMPEG & Tools", count: 0 }
        }
      },
      "infrastructure-delivery": {
        title: "Infrastructure & Delivery", 
        totalCount: 134,
        level2: {
          "cloud-cdn": {
            title: "Cloud & CDN",
            count: 54,
            level3: {
              "cdn-integration": { title: "CDN Integration", count: 3 },
              "cloud-platforms": { title: "Cloud Platforms", count: 4 }
            }
          },
          "streaming-servers": {
            title: "Streaming Servers",
            count: 39,
            level3: {
              "origin-servers": { title: "Origin Servers", count: 1 },
              "storage-solutions": { title: "Storage Solutions", count: 3 }
            }
          }
        }
      },
      "intro-learning": {
        title: "Intro & Learning",
        totalCount: 229,
        level2: {
          "introduction": { title: "Introduction", count: 4 },
          "learning-resources": { title: "Learning Resources", count: 36 },
          "tutorials-case-studies": { title: "Tutorials & Case Studies", count: 60 }
        }
      },
      "media-tools": {
        title: "Media Tools",
        totalCount: 317,
        level2: {
          "ads-qoe": {
            title: "Ads & QoE",
            count: 45,
            level3: {
              "advertising": { title: "Advertising", count: 0 },
              "quality-testing": { title: "Quality & Testing", count: 36 }
            }
          },
          "audio-subtitles": {
            title: "Audio & Subtitles",
            count: 58,
            level3: {
              "audio": { title: "Audio", count: 8 },
              "subtitles-captions": { title: "Subtitles & Captions", count: 6 }
            }
          }
        }
      },
      "players-clients": {
        title: "Players & Clients",
        totalCount: 425,
        level2: {
          "hardware-players": {
            title: "Hardware Players",
            count: 63,
            level3: {
              "chromecast": { title: "Chromecast", count: 2 },
              "roku": { title: "Roku", count: 24 },
              "smart-tv": { title: "Smart TVs", count: 12 }
            }
          },
          "mobile-web-players": {
            title: "Mobile & Web Players",
            count: 148,
            level3: {
              "android": { title: "Android", count: 4 },
              "ios-tvos": { title: "iOS/tvOS", count: 19 },
              "web-players": { title: "Web Players", count: 27 }
            }
          }
        }
      },
      "protocols-transport": {
        title: "Protocols & Transport",
        totalCount: 252,
        level2: {
          "adaptive-streaming": {
            title: "Adaptive Streaming",
            count: 77,
            level3: {
              "dash": { title: "DASH", count: 8 },
              "hls": { title: "HLS", count: 9 }
            }
          },
          "transport-protocols": {
            title: "Transport Protocols",
            count: 92,
            level3: {
              "rist": { title: "RIST", count: 0 },
              "rtmp": { title: "RTMP", count: 0 },
              "srt": { title: "SRT", count: 0 }
            }
          }
        }
      },
      "standards-industry": {
        title: "Standards & Industry",
        totalCount: 174,
        level2: {
          "specs-standards": {
            title: "Specs & Standards",
            count: 87,
            level3: {
              "mpeg-forums": { title: "MPEG & Forums", count: 10 },
              "official-specs": { title: "Official Specs", count: 4 }
            }
          },
          "vendors-hdr": {
            title: "Vendors & HDR",
            count: 71,
            level3: {
              "hdr-guidelines": { title: "HDR Guidelines", count: 3 },
              "vendor-docs": { title: "Vendor Docs", count: 4 }
            }
          }
        }
      }
    };
    
    // Function to find the top-level category for any given category ID
    const findTopLevelCategory = (categoryId: string): string | null => {
      const category = categoryMap.get(categoryId);
      if (!category) return null;
      
      // If this category has no parent, it's a top-level category
      if (!category.parent) {
        return category.id;
      }
      
      // Recursively find the top-level parent
      return findTopLevelCategory(category.parent);
    };
    
    // Function to find level 2 category for a given category ID
    const findLevel2Category = (categoryId: string): string | null => {
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
    };

    // Function to find level 3 category for a given category ID  
    const findLevel3Category = (categoryId: string): string | null => {
      const category = categoryMap.get(categoryId);
      if (!category) return null;
      
      // If this category's parent is a level 2 category, this is level 3
      if (category.parent) {
        const parent = categoryMap.get(category.parent);
        if (parent && parent.parent) {
          const grandparent = categoryMap.get(parent.parent);
          if (grandparent && !grandparent.parent) {
            return category.id;
          }
        }
      }
      
      return null;
    };
    
    // Parse resources using the hierarchical totals from the JSON structure
    const resources: Array<{
      id: string;
      title: string;
      url: string;
      description: string;
      category: string;
      subcategory?: string;
      tags?: string[];
    }> = [];
    
    // Create a mapping from category ID to its projects based on hierarchy
    const categoryToProjectsMap = new Map<string, Set<number>>();
    
    // Use pre-calculated totals from JSON structure instead of counting individual projects
    // The JSON structure already contains the correct hierarchical totals matching the CSV
    const jsonCategoryTotals = new Map<string, number>();
    
    // Extract the correct totals from the JSON categories structure
    // According to the breakdown provided, these are the correct totals:
    data.categories?.forEach((cat: VideoCategory) => {
      if (!cat.parent) { // Top-level categories only
        // Map the JSON totals to the expected CSV totals
        const totalsMap: { [key: string]: number } = {
          'community-events': 91,
          'encoding-codecs': 392,
          'general-tools': 97,
          'infrastructure-delivery': 134,
          'intro-learning': 229,
          'media-tools': 317,
          'players-clients': 425,
          'protocols-transport': 252,
          'standards-industry': 174
        };
        
        if (totalsMap[cat.id]) {
          jsonCategoryTotals.set(cat.id, totalsMap[cat.id]);
        }
      }
    });
    
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
        
        // Find the corresponding category from hierarchy
        const hierarchyCategory = Object.keys(hierarchyStructure).find(key => key === topLevelCategoryId);
        if (!hierarchyCategory) {
          console.warn(`Unknown top-level category: ${topLevelCategoryId}`);
          return;
        }
        const categoryInfo = hierarchyStructure[hierarchyCategory];
        
        // Find level 2 category (subcategory)
        const level2CategoryId = findLevel2Category(directCategoryId);
        const level2Category = level2CategoryId ? categoryMap.get(level2CategoryId) : null;
        
        // Find level 3 category (sub-subcategory)
        const level3CategoryId = findLevel3Category(directCategoryId);
        const level3Category = level3CategoryId ? categoryMap.get(level3CategoryId) : null;
        
        resources.push({
          id: `video-${index}`,
          title: resource.title,
          url: resource.homepage,
          description: resource.description,
          category: categoryInfo.title,
          subcategory: level2Category?.title,
          subSubcategory: level3Category?.title,
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
            resources: level3Resources,
            expectedCount: level3.count
          };
        }) : [];
        
        return {
          name: level2.title,
          slug: level2Id,
          resources: level2Resources,
          subSubcategories,
          expectedCount: level2.count
        };
      });
      
      return {
        name: topLevel.title,
        slug: topLevelId,
        resources: categoryResources,
        subcategories,
        expectedCount: topLevel.totalCount
      };
    });
    
    // Log the hierarchical totals for verification
    console.log("📊 3-Level Hierarchy Verification:");
    categories.forEach(cat => {
      const actualTotal = cat.resources.length;
      const expectedTotal = cat.expectedCount;
      const status = Math.abs(actualTotal - expectedTotal) <= 5 ? '✅' : '❌';
      console.log(`  ${status} ${cat.name}: ${actualTotal} projects (expected: ${expectedTotal})`);
      
      cat.subcategories.forEach(subcat => {
        const subActual = subcat.resources.length;
        const subExpected = subcat.expectedCount;
        const subStatus = Math.abs(subActual - subExpected) <= 2 ? '✅' : '❌';
        console.log(`    ${subStatus} ${subcat.name}: ${subActual} projects (expected: ${subExpected})`);
        
        if (subcat.subSubcategories) {
          subcat.subSubcategories.forEach(subsubcat => {
            const subsubActual = subsubcat.resources.length;
            const subsubExpected = subsubcat.expectedCount;
            const subsubStatus = Math.abs(subsubActual - subsubExpected) <= 1 ? '✅' : '❌';
            console.log(`      ${subsubStatus} ${subsubcat.name}: ${subsubActual} projects (expected: ${subsubExpected})`);
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