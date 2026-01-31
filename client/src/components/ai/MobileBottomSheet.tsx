import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

interface MobileBottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

export default function MobileBottomSheet({
  open,
  onOpenChange,
  children,
  title = "AI Recommendations",
  description,
  className
}: MobileBottomSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          "h-[90vh] flex flex-col",
          "rounded-t-2xl border-t border-pink-500/30",
          "bg-gradient-to-b from-background to-background/95",
          "pb-[max(1rem,env(safe-area-inset-bottom))]",
          className
        )}
      >
        {/* Handle Bar */}
        <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full mx-auto mb-4" />
        
        {/* Header */}
        <SheetHeader className="pb-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-pink-500" />
            {title}
          </SheetTitle>
          {description && (
            <SheetDescription className="text-sm">
              {description}
            </SheetDescription>
          )}
        </SheetHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}