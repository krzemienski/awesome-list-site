import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, Bookmark, Share2 } from "lucide-react";
import { Resource } from "@/types/awesome-list";
import { motion } from "framer-motion";
import { trackResourceClick } from "@/lib/analytics";
import ResourceTooltip from "@/components/ui/resource-tooltip";
import { cn } from "@/lib/utils";

interface ResourceCardProps {
  resource: Resource;
  index: number;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onSelectionToggle?: (resource: Resource) => void;
}

export default function ResourceCard({ resource, index, isSelectionMode, isSelected, onSelectionToggle }: ResourceCardProps) {
  // Check if reduced motion is preferred
  const prefersReducedMotion = 
    typeof window !== 'undefined' ? 
      window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;
  
  const fadeInVariants = {
    hidden: { 
      opacity: prefersReducedMotion ? 1 : 0,
      y: prefersReducedMotion ? 0 : 20 
    },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { 
        duration: 0.3,
        delay: prefersReducedMotion ? 0 : index * 0.04, // 40ms stagger
        ease: "easeOut" 
      } 
    }
  };
  
  const handleResourceClick = () => {
    trackResourceClick(resource.title, resource.url, resource.category);
    window.open(resource.url, '_blank', 'noopener,noreferrer');
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('Bookmark clicked:', resource.title);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({
        title: resource.title,
        text: resource.description,
        url: resource.url,
      });
    } else {
      navigator.clipboard.writeText(resource.url);
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeInVariants}
    >
      <Card className={cn(
        "h-full transition-all duration-200 hover:shadow-lg hover:scale-[1.02] cursor-pointer group",
        isSelected && "ring-2 ring-primary border-primary"
      )}
      onClick={handleResourceClick}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <CardTitle className="text-base leading-tight flex items-center gap-2 group-hover:text-primary transition-colors">
                {resource.title}
                <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardTitle>
              {isSelectionMode && (
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => onSelectionToggle?.(resource)}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Select ${resource.title}`}
                  className="mt-2"
                />
              )}
            </div>
          </div>
          <CardDescription className="line-clamp-3 text-xs leading-relaxed">
            {resource.description}
          </CardDescription>
        </CardHeader>

        <CardContent className="py-0">
          <div className="flex items-center gap-1 mb-3 flex-wrap">
            <Badge variant="default" className="text-xs">
              {resource.category}
            </Badge>
            {resource.subcategory && (
              <Badge variant="secondary" className="text-xs">
                {resource.subcategory}
              </Badge>
            )}
          </div>
          
          {resource.tags && resource.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {resource.tags.slice(0, 2).map((tag, idx) => (
                <Badge key={idx} variant="outline" className="text-xs h-5">
                  {tag}
                </Badge>
              ))}
              {resource.tags.length > 2 && (
                <Badge variant="outline" className="text-xs h-5">
                  +{resource.tags.length - 2}
                </Badge>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="pt-3 pb-4">
          <Separator className="mb-3" />
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{resource.category}</span>
            </div>
            
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={handleBookmark}
              >
                <Bookmark className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={handleShare}
              >
                <Share2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
