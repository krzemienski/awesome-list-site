import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ShareButtonProps {
  resourceId: string;
  title?: string;
  description?: string;
  url?: string;
  className?: string;
  size?: "sm" | "default" | "lg";
}

export default function ShareButton({
  resourceId,
  title,
  description,
  url,
  className,
  size = "default"
}: ShareButtonProps) {
  const [isSharing, setIsSharing] = useState(false);
  const { toast } = useToast();

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsSharing(true);

    const shareUrl = url || window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: description || `Check out ${title}`,
          url: shareUrl
        });
      } catch (err) {
        // User cancelled or share failed - fall back to clipboard
        try {
          await navigator.clipboard.writeText(shareUrl);
          toast({
            title: "Link copied",
            description: "Resource link copied to clipboard"
          });
        } catch {
          toast({
            title: "Unable to share",
            description: "Please copy the URL manually",
            variant: "destructive"
          });
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast({
          title: "Link copied",
          description: "Resource link copied to clipboard"
        });
      } catch {
        toast({
          title: "Unable to copy",
          description: "Please copy the URL manually from the address bar",
          variant: "destructive"
        });
      }
    }

    setIsSharing(false);
  };

  const iconSize = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-6 w-6" : "h-5 w-5";

  return (
    <Button
      variant="ghost"
      size={size}
      className={cn(
        "group relative",
        className
      )}
      onClick={handleClick}
      disabled={isSharing}
      aria-label="Share resource"
      data-testid="button-share"
    >
      <div className="flex items-center gap-1.5">
        <Share2
          className={cn(
            iconSize,
            "transition-all duration-200",
            "group-hover:scale-110"
          )}
        />
      </div>

      {/* Ripple effect on click */}
      {isSharing && (
        <span className="absolute inset-0 animate-ping rounded-full bg-blue-500 opacity-20" />
      )}
    </Button>
  );
}
