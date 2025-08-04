import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Star, Clock, Bookmark } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Resource } from "@/types/awesome-list";

interface ResourceTableProps {
  resources: Resource[];
  onResourceClick?: (resourceId: string) => void;
  className?: string;
}

export default function ResourceTable({ 
  resources, 
  onResourceClick,
  className 
}: ResourceTableProps) {
  const [sortBy, setSortBy] = useState<'title' | 'category' | 'subcategory'>('title');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (column: 'title' | 'category' | 'subcategory') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const sortedResources = [...resources].sort((a, b) => {
    let aValue = '';
    let bValue = '';
    
    switch (sortBy) {
      case 'title':
        aValue = a.title.toLowerCase();
        bValue = b.title.toLowerCase();
        break;
      case 'category':
        aValue = a.category.toLowerCase();
        bValue = b.category.toLowerCase();
        break;
      case 'subcategory':
        aValue = a.subcategory.toLowerCase();
        bValue = b.subcategory.toLowerCase();
        break;
    }
    
    const comparison = aValue.localeCompare(bValue);
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const handleResourceInteraction = (resource: Resource) => {
    if (onResourceClick) {
      onResourceClick(resource.title);
    }
    // Open the resource URL in a new tab
    window.open(resource.url, '_blank', 'noopener,noreferrer');
  };

  const getSortIcon = (column: 'title' | 'category' | 'subcategory') => {
    if (sortBy !== column) return null;
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  return (
    <div className={className}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead 
              className="cursor-pointer hover:bg-muted/50 select-none"
              onClick={() => handleSort('title')}
            >
              <div className="flex items-center gap-2">
                Resource {getSortIcon('title')}
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-muted/50 select-none hidden md:table-cell"
              onClick={() => handleSort('category')}
            >
              <div className="flex items-center gap-2">
                Category {getSortIcon('category')}
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-muted/50 select-none hidden lg:table-cell"
              onClick={() => handleSort('subcategory')}
            >
              <div className="flex items-center gap-2">
                Subcategory {getSortIcon('subcategory')}
              </div>
            </TableHead>
            <TableHead className="hidden sm:table-cell">Tags</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedResources.map((resource, index) => (
            <TableRow key={`${resource.title}-${resource.url}`} className="hover:bg-muted/50">
              <TableCell className="py-4">
                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground line-clamp-1">
                    {resource.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {resource.description}
                  </p>
                  {/* Show category and subcategory on mobile */}
                  <div className="flex gap-2 md:hidden">
                    <Badge variant="secondary" className="text-xs">
                      {resource.category.length > 12 ? resource.category.substring(0, 9) + "..." : resource.category}
                    </Badge>
                    <Badge variant="outline" className="text-xs lg:hidden">
                      {resource.subcategory.length > 12 ? resource.subcategory.substring(0, 9) + "..." : resource.subcategory}
                    </Badge>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <Badge variant="secondary" className="text-xs">
                  {resource.category.length > 15 ? resource.category.substring(0, 12) + "..." : resource.category}
                </Badge>
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <Badge variant="outline" className="text-xs">
                  {resource.subcategory.length > 15 ? resource.subcategory.substring(0, 12) + "..." : resource.subcategory}
                </Badge>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <div className="flex flex-wrap gap-1 max-w-[200px]">
                  {resource.tags?.slice(0, 3).map((tag, tagIndex) => (
                    <Badge 
                      key={tagIndex} 
                      variant="outline" 
                      className="text-xs"
                    >
                      {tag.length > 10 ? tag.substring(0, 7) + "..." : tag}
                    </Badge>
                  ))}
                  {resource.tags && resource.tags.length > 3 && (
                    <span className="text-xs text-muted-foreground">
                      +{resource.tags.length - 3}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleResourceInteraction(resource)}
                  className="h-8 w-8 p-0"
                  title={`Visit ${resource.title}`}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {resources.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No resources found matching your criteria.
        </div>
      )}
    </div>
  );
}