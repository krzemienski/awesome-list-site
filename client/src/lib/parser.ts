import { Resource, Category, Subcategory, AwesomeList } from "../types/awesome-list";
import { slugify } from "./utils";

/**
 * Process the raw JSON data from the API into a structured AwesomeList
 */
export function processAwesomeListData(data: any): AwesomeList {
  if (!data || !data.resources || !Array.isArray(data.resources)) {
    throw new Error("Invalid awesome list data format");
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
  
  // Create categories with their resources
  const categoryMap = new Map<string, Category>();
  
  resources.forEach(resource => {
    const { category: categoryName } = resource;
    
    if (!categoryMap.has(categoryName)) {
      categoryMap.set(categoryName, {
        name: categoryName,
        slug: slugify(categoryName),
        resources: [],
        subcategories: []
      });
    }
    
    // Add resource to category
    const category = categoryMap.get(categoryName)!;
    category.resources.push(resource);
    
    // Process subcategory if it exists
    if (resource.subcategory) {
      // Check if subcategory already exists
      let subcategory = category.subcategories.find(
        sub => sub.name === resource.subcategory
      );
      
      // Create subcategory if it doesn't exist
      if (!subcategory) {
        subcategory = {
          name: resource.subcategory,
          slug: slugify(resource.subcategory),
          resources: []
        };
        category.subcategories.push(subcategory);
      }
      
      // Add resource to subcategory
      subcategory.resources.push(resource);
    }
  });
  
  // Convert map to array and sort alphabetically
  const categories = Array.from(categoryMap.values()).sort((a, b) => 
    a.name.localeCompare(b.name)
  );
  
  // Sort subcategories alphabetically
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
