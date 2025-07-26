import { AwesomeList, Category, Resource, Subcategory } from "@/types/awesome-list";

/**
 * Process the raw JSON data from the API into a structured AwesomeList
 */
export function processAwesomeListData(data: any): AwesomeList {
  // Handle both formats: API format (resources) and static format (projects)
  const items = data?.resources || data?.projects || [];
  
  if (!data || !Array.isArray(items)) {
    console.error("Invalid data format:", data);
    throw new Error("Invalid awesome list data format");
  }

  // Map resources with fallbacks for different field names
  const resources: Resource[] = items.map((resource: any, index: number) => {
    // Handle category - could be string or array
    let categoryName = "Uncategorized";
    if (resource.category) {
      if (Array.isArray(resource.category)) {
        categoryName = resource.category[0] || "Uncategorized";
      } else {
        categoryName = resource.category;
      }
    }
    
    return {
      id: resource.id || `resource-${index}`,
      title: resource.title || resource.name || "Untitled",
      url: resource.url || resource.homepage || "",
      description: resource.description || "",
      category: categoryName,
      subcategory: resource.subcategory || undefined,
      tags: resource.tags || [],
    };
  });

  // Create categories with their resources
  const categoryMap = new Map<string, Category>();
  
  resources.forEach(resource => {
    const { category: categoryName, subcategory: subcategoryName } = resource;
    
    if (!categoryMap.has(categoryName)) {
      categoryMap.set(categoryName, {
        name: categoryName,
        slug: categoryName.toLowerCase().replace(/\s+/g, '-'),
        resources: [],
        subcategories: [],
      });
    }
    
    const category = categoryMap.get(categoryName)!;
    
    if (!subcategoryName) {
      // Resource belongs directly to category
      category.resources.push(resource);
    } else {
      // Resource belongs to a subcategory
      let subcategory = category.subcategories.find(s => s.name === subcategoryName);
      
      if (!subcategory) {
        subcategory = {
          name: subcategoryName,
          slug: subcategoryName.toLowerCase().replace(/\s+/g, '-'),
          resources: [],
        };
        category.subcategories.push(subcategory);
      }
      
      subcategory.resources.push(resource);
    }
  });

  // Convert map to array and sort alphabetically
  const categories = Array.from(categoryMap.values()).sort((a, b) => {
    const aName = String(a.name || "");
    const bName = String(b.name || "");
    return aName.localeCompare(bName);
  });

  // Sort subcategories alphabetically
  categories.forEach(category => {
    if (category.subcategories && category.subcategories.length > 0) {
      category.subcategories.sort((a, b) => {
        const aName = String(a.name || "");
        const bName = String(b.name || "");
        return aName.localeCompare(bName);
      });
    }
  });

  const result = {
    title: data.title || "Awesome List",
    description: data.description || data.header || "",
    repoUrl: data.repoUrl || "https://github.com/sindresorhus/awesome",
    resources, // Include flat resources array
    categories,
    totalResources: resources.length,
  };
  
  console.log("Parsed awesome list:", {
    title: result.title,
    totalResources: result.totalResources,
    totalCategories: result.categories.length,
    categoryNames: result.categories.map(c => `${c.name} (${c.resources.length} resources)`),
  });
  
  return result;
}

/**
 * Search resources by query
 */
export function searchResources(awesomeList: AwesomeList, query: string): Resource[] {
  const lowerQuery = query.toLowerCase();
  const results: Resource[] = [];
  
  awesomeList.categories.forEach(category => {
    // Search in category resources
    category.resources.forEach(resource => {
      if (
        resource.title.toLowerCase().includes(lowerQuery) ||
        resource.description.toLowerCase().includes(lowerQuery) ||
        resource.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
      ) {
        results.push(resource);
      }
    });
    
    // Search in subcategory resources
    category.subcategories.forEach(subcategory => {
      subcategory.resources.forEach(resource => {
        if (
          resource.title.toLowerCase().includes(lowerQuery) ||
          resource.description.toLowerCase().includes(lowerQuery) ||
          resource.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
        ) {
          results.push(resource);
        }
      });
    });
  });
  
  return results;
}

/**
 * Get a category by name
 */
export function getCategoryByName(awesomeList: AwesomeList, categoryName: string): Category | undefined {
  return awesomeList.categories.find(cat => cat.name === categoryName);
}

/**
 * Get all unique tags from resources
 */
export function getAllTags(awesomeList: AwesomeList): string[] {
  const tagSet = new Set<string>();
  
  awesomeList.categories.forEach(category => {
    category.resources.forEach(resource => {
      resource.tags.forEach(tag => tagSet.add(tag));
    });
    
    category.subcategories.forEach(subcategory => {
      subcategory.resources.forEach(resource => {
        resource.tags.forEach(tag => tagSet.add(tag));
      });
    });
  });
  
  return Array.from(tagSet).sort();
}