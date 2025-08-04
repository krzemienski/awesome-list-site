import { useLocation } from "wouter";
import { Home } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { getCategorySlug, getSubcategorySlug } from "@/lib/utils";
import { Category } from "@/types/awesome-list";

interface NavigationBreadcrumbProps {
  categories: Category[];
  title?: string;
}

export default function NavigationBreadcrumb({ categories, title = "Awesome Video" }: NavigationBreadcrumbProps) {
  const [location] = useLocation();
  
  // Parse the current path
  const pathSegments = location.split('/').filter(Boolean);
  
  // If we're on the home page
  if (pathSegments.length === 0) {
    return (
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage className="flex items-center gap-1.5">
              <Home className="h-4 w-4" />
              {title}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }
  
  // Handle category pages
  if (pathSegments[0] === 'category' && pathSegments[1]) {
    const categorySlug = pathSegments[1];
    const category = categories.find(cat => getCategorySlug(cat.name) === categorySlug);
    
    return (
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/" className="flex items-center gap-1.5">
              <Home className="h-4 w-4" />
              {title}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>
              {category?.name || 'Category'}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }
  
  // Handle subcategory pages
  if (pathSegments[0] === 'subcategory' && pathSegments[1]) {
    const subcategorySlug = pathSegments[1];
    let parentCategory: Category | undefined;
    let subcategoryName: string | undefined;
    
    // Find the parent category and subcategory
    for (const category of categories) {
      const subcategory = category.subcategories?.find(sub => 
        getSubcategorySlug(category.name, sub.name) === subcategorySlug
      );
      if (subcategory) {
        parentCategory = category;
        subcategoryName = subcategory.name;
        break;
      }
    }
    
    return (
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/" className="flex items-center gap-1.5">
              <Home className="h-4 w-4" />
              {title}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={`/category/${getCategorySlug(parentCategory?.name || '')}`}>
              {parentCategory?.name || 'Category'}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>
              {subcategoryName || 'Subcategory'}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }
  
  // Default fallback
  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/" className="flex items-center gap-1.5">
            <Home className="h-4 w-4" />
            {title}
          </BreadcrumbLink>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}