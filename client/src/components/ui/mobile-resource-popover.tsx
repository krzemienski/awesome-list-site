import React from 'react';
import { ExternalLink, Star, GitFork, Calendar, Tag } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { trackPopoverView, trackResourceClick, trackMobileInteraction, trackTagInteraction } from '@/lib/analytics';
import { useMobileDialog } from '@/hooks/use-mobile-popover';

interface Resource {
  id?: string;
  title: string;
  url: string;
  description: string;
  category: string;
  subcategory?: string;
  tags?: string[];
}

interface MobileResourcePopoverProps {
  resource: Resource;
  children: React.ReactNode;
}

export default function MobileResourcePopover({ resource, children }: MobileResourcePopoverProps) {
  const { isOpen, setIsOpen, contentRef, mobileProps } = useMobileDialog({
    preventScrollClose: true,
    touchCloseDelay: 200,
  });

  const handlePopoverOpen = () => {
    trackPopoverView(resource.title, resource.category);
    trackMobileInteraction('popover_open', 'resource_card');
  };

  const handleOpenResource = () => {
    trackResourceClick(resource.title, resource.url, resource.category);
    trackMobileInteraction('resource_click', 'open_button');
    window.open(resource.url, '_blank', 'noopener,noreferrer');
    setIsOpen(false);
  };

  const handleTagClick = (tag: string) => {
    trackTagInteraction(tag, 'click');
    trackMobileInteraction('tag_click', tag);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (open) {
        handlePopoverOpen();
      }
    }}>
      <DialogTrigger asChild>
        <div className="cursor-pointer touch-manipulation touch-optimized">
          {children}
        </div>
      </DialogTrigger>
      <DialogContent 
        ref={contentRef}
        className="w-[95vw] max-w-md mx-auto touch-optimized" 
        aria-describedby="resource-description"
        data-mobile-optimized={true}
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold leading-tight text-foreground">
            {resource.title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4" id="resource-description">
          {/* Description */}
          <p className="text-sm text-muted-foreground leading-relaxed">
            {resource.description}
          </p>
          
          {/* Category */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Category:</span>
            <Badge variant="secondary" className="text-xs">
              {resource.category}
            </Badge>
          </div>
          
          {/* Tags */}
          {resource.tags && resource.tags.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground">Tags:</span>
              <div className="flex flex-wrap gap-1">
                {resource.tags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    <Tag className="w-3 h-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* URL Preview */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">URL:</span>
            <p className="text-xs text-muted-foreground break-all bg-muted p-2 rounded">
              {resource.url}
            </p>
          </div>
          
          {/* Action Button */}
          <Button 
            onClick={handleOpenResource}
            className="w-full touch-manipulation min-h-[48px] touch-optimized"
            size="lg"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Open Resource
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}