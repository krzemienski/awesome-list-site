import React, { useState } from 'react';
import { ExternalLink, Star, GitFork, Calendar, Tag } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
  const [isOpen, setIsOpen] = useState(false);

  const handleOpenResource = () => {
    window.open(resource.url, '_blank', 'noopener,noreferrer');
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <div className="cursor-pointer touch-manipulation">
          {children}
        </div>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold leading-tight">
            {resource.title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
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
            className="w-full touch-manipulation min-h-[48px]"
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