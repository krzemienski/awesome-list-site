import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { X, Plus, ExternalLink, GitCompare, ArrowRight } from "lucide-react";
import { Resource } from "@/types/awesome-list";
import { cn } from "@/lib/utils";

interface ResourceComparisonProps {
  selectedResources: Resource[];
  onRemoveResource: (resource: Resource) => void;
  onClearAll: () => void;
  trigger?: React.ReactNode;
}

export default function ResourceComparison({ 
  selectedResources, 
  onRemoveResource, 
  onClearAll,
  trigger 
}: ResourceComparisonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const defaultTrigger = (
    <Button 
      variant="outline" 
      className="gap-2"
      disabled={selectedResources.length === 0}
    >
      <GitCompare className="h-4 w-4" />
      Compare ({selectedResources.length})
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            Resource Comparison ({selectedResources.length} items)
          </DialogTitle>
        </DialogHeader>
        
        {selectedResources.length === 0 ? (
          <div className="text-center py-12">
            <GitCompare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No resources selected</h3>
            <p className="text-muted-foreground">
              Select resources from the list to compare them side by side
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Comparison Controls */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Comparing {selectedResources.length} resource{selectedResources.length !== 1 ? 's' : ''}
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onClearAll}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Clear All
              </Button>
            </div>

            {/* Comparison Grid */}
            <div className="overflow-auto max-h-[60vh]">
              <div className={cn(
                "grid gap-4",
                selectedResources.length === 1 ? "grid-cols-1" :
                selectedResources.length === 2 ? "grid-cols-2" :
                selectedResources.length === 3 ? "grid-cols-3" :
                "grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              )}>
                {selectedResources.map((resource, index) => (
                  <ComparisonCard
                    key={`${resource.url}-${index}`}
                    resource={resource}
                    onRemove={() => onRemoveResource(resource)}
                    showRemove={selectedResources.length > 1}
                  />
                ))}
              </div>
            </div>

            {/* Comparison Summary */}
            {selectedResources.length > 1 && (
              <ComparisonSummary resources={selectedResources} />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface ComparisonCardProps {
  resource: Resource;
  onRemove: () => void;
  showRemove: boolean;
}

function ComparisonCard({ resource, onRemove, showRemove }: ComparisonCardProps) {
  return (
    <Card className="relative h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-medium leading-tight line-clamp-2">
            {resource.title}
          </CardTitle>
          {showRemove && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="h-6 w-6 p-0 shrink-0"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Description */}
        <p className="text-xs text-muted-foreground line-clamp-3">
          {resource.description}
        </p>
        
        {/* Categories */}
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary" className="text-xs">
              {resource.category}
            </Badge>
            {resource.subcategory && (
              <Badge variant="outline" className="text-xs">
                {resource.subcategory}
              </Badge>
            )}
            {resource.subSubcategory && (
              <Badge variant="outline" className="text-xs">
                {resource.subSubcategory}
              </Badge>
            )}
          </div>
        </div>
        
        {/* Tags */}
        {resource.tags && resource.tags.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Tags:</p>
            <div className="flex flex-wrap gap-1">
              {resource.tags.slice(0, 3).map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {resource.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{resource.tags.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}
        
        {/* Link */}
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 text-xs"
          asChild
        >
          <a 
            href={resource.url} 
            target="_blank" 
            rel="noopener noreferrer"
          >
            <ExternalLink className="h-3 w-3" />
            Visit Resource
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}

interface ComparisonSummaryProps {
  resources: Resource[];
}

function ComparisonSummary({ resources }: ComparisonSummaryProps) {
  // Find common categories
  const commonCategories = resources.reduce((acc, resource, index) => {
    if (index === 0) {
      return {
        category: resource.category,
        subcategory: resource.subcategory || null,
        subSubcategory: resource.subSubcategory || null
      };
    }
    
    return {
      category: acc.category === resource.category ? acc.category : null,
      subcategory: acc.subcategory === (resource.subcategory || null) ? acc.subcategory : null,
      subSubcategory: acc.subSubcategory === (resource.subSubcategory || null) ? acc.subSubcategory : null
    };
  }, { category: null as string | null, subcategory: null as string | null, subSubcategory: null as string | null });

  // Find common tags
  const allTags = resources.flatMap(r => r.tags || []);
  const tagCounts = allTags.reduce((acc, tag) => {
    acc[tag] = (acc[tag] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const commonTags = Object.entries(tagCounts)
    .filter(([_, count]) => count > 1)
    .sort(([_, a], [__, b]) => b - a)
    .slice(0, 5)
    .map(([tag]) => tag);

  return (
    <Card className="bg-muted/50">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <ArrowRight className="h-4 w-4" />
          Comparison Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Common Categories */}
        {(commonCategories.category || commonCategories.subcategory || commonCategories.subSubcategory) && (
          <div>
            <p className="text-xs font-medium mb-1">Common Categories:</p>
            <div className="flex flex-wrap gap-1">
              {commonCategories.category && (
                <Badge variant="secondary" className="text-xs">
                  {commonCategories.category}
                </Badge>
              )}
              {commonCategories.subcategory && (
                <Badge variant="outline" className="text-xs">
                  {commonCategories.subcategory}
                </Badge>
              )}
              {commonCategories.subSubcategory && (
                <Badge variant="outline" className="text-xs">
                  {commonCategories.subSubcategory}
                </Badge>
              )}
            </div>
          </div>
        )}
        
        {/* Common Tags */}
        {commonTags.length > 0 && (
          <div>
            <p className="text-xs font-medium mb-1">Common Tags:</p>
            <div className="flex flex-wrap gap-1">
              {commonTags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag} ({tagCounts[tag]})
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* Basic Stats */}
        <div>
          <p className="text-xs font-medium mb-1">Statistics:</p>
          <p className="text-xs text-muted-foreground">
            {resources.length} resources selected from {new Set(resources.map(r => r.category)).size} categories
          </p>
        </div>
      </CardContent>
    </Card>
  );
}