
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Moon, Sun, Wand2 } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { trackThemeChange } from "@/lib/analytics";
import ColorPaletteGenerator from "@/components/ui/color-palette-generator";

export default function ThemeSelector() {
  const [open, setOpen] = useState(false);
  const [showPaletteGenerator, setShowPaletteGenerator] = useState(false);
  const { theme, setTheme } = useTheme();
  
  // Handle color palette application
  const handlePaletteGenerated = (palette: any) => {
    // For now, we'll just show a toast - can be expanded later
    console.log('Palette generated:', palette);
    setShowPaletteGenerator(false);
  };

  function changeMode(newMode: "light" | "dark" | "system") {
    setTheme(newMode);
    trackThemeChange(newMode);
    setOpen(false);
  }

  return (
    <div className="relative">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            size="icon"
            className="h-10 w-10 bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
            data-testid="popover-theme-toggle"
          >
            {theme === "dark" ? (
              <Moon className="h-5 w-5" />
            ) : (
              <Sun className="h-5 w-5" />
            )}
            <span className="sr-only">Select theme</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          alignOffset={-60}
          sideOffset={10}
          className="w-64 p-3"
        >
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-3">Appearance</p>
              <div className="space-y-2">
                <button
                  onClick={() => changeMode("light")}
                  className={`w-full p-3 border-2 transition-all hover:scale-[1.02] flex items-center gap-3 ${
                    theme === "light"
                      ? "border-primary ring-2 ring-primary/20 bg-accent"
                      : "border-border hover:border-primary/50"
                  }`}
                  data-testid="popover-theme-light"
                >
                  <Sun className="h-5 w-5" />
                  <span className="text-sm font-medium">Light</span>
                </button>
                <button
                  onClick={() => changeMode("dark")}
                  className={`w-full p-3 border-2 transition-all hover:scale-[1.02] flex items-center gap-3 ${
                    theme === "dark"
                      ? "border-primary ring-2 ring-primary/20 bg-accent"
                      : "border-border hover:border-primary/50"
                  }`}
                  data-testid="popover-theme-dark"
                >
                  <Moon className="h-5 w-5" />
                  <span className="text-sm font-medium">Dark</span>
                </button>
                <button
                  onClick={() => changeMode("system")}
                  className={`w-full p-3 border-2 transition-all hover:scale-[1.02] flex items-center gap-3 ${
                    theme === "system"
                      ? "border-primary ring-2 ring-primary/20 bg-accent"
                      : "border-border hover:border-primary/50"
                  }`}
                  data-testid="popover-theme-system"
                >
                  <span className="text-sm font-medium ml-8">System</span>
                </button>
              </div>
            </div>
            
            <div className="border-t pt-3">
              <Button
                onClick={() => {
                  setShowPaletteGenerator(true);
                  setOpen(false);
                }}
                variant="outline"
                size="sm"
                className="w-full flex items-center gap-2"
              >
                <Wand2 className="h-4 w-4" />
                AI Palette Generator
              </Button>
            </div>
          </div>
          
          {/* Color Palette Generator Dialog */}
          <ColorPaletteGenerator
            isOpen={showPaletteGenerator}
            onClose={() => setShowPaletteGenerator(false)}
            onPaletteGenerated={handlePaletteGenerated}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}