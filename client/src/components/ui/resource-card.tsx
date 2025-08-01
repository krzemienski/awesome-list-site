import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";
import { Resource } from "@/types/awesome-list";
import { motion } from "framer-motion";
import { trackResourceClick, trackPopoverView, trackMobileInteraction } from "@/lib/analytics";
import ResourceTooltip from "@/components/ui/resource-tooltip";

interface ResourceCardProps {
  resource: Resource;
  index: number;
}

export default function ResourceCard({ resource, index }: ResourceCardProps) {
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
  
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeInVariants}
    >
      <ResourceTooltip resource={resource}>
        <Card className="h-full transition-all hover:shadow-md" data-testid="resource-card">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between gap-x-2 mb-2">
              <h3 className="text-base sm:text-lg font-semibold leading-none tracking-tight line-clamp-2">
                <a
                  href={resource.url}
                  className="text-primary hover:text-primary/80 underline inline-flex items-center gap-1.5 touch-manipulation"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ 
                    touchAction: 'manipulation',
                    minHeight: '44px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    trackResourceClick(resource.title, resource.url, resource.category);
                    console.log('Resource card clicked:', resource.title, resource.url);
                  }}
                >
                  {resource.title}
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                </a>
              </h3>
            </div>
            
            <p className="text-sm text-muted-foreground line-clamp-2">
              {resource.description}
            </p>
            
            {(resource.subcategory || (resource.tags && resource.tags.length > 0)) && (
              <div className="mt-3 flex items-center gap-1 flex-wrap">
                {resource.subcategory && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                    {resource.subcategory.length > 15 ? resource.subcategory.substring(0, 12) + "..." : resource.subcategory}
                  </span>
                )}
                {resource.tags?.slice(0, 2).map((tag, index) => (
                  <span key={index} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {tag.length > 10 ? tag.substring(0, 8) + "..." : tag}
                  </span>
                ))}
                {resource.tags && resource.tags.length > 2 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    +{resource.tags.length - 2}
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </ResourceTooltip>
    </motion.div>
  );
}
