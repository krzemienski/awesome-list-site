
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Palette, Wand2 } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { shadcnThemes, applyTheme } from "@/lib/shadcn-themes";
import { trackThemeChange } from "@/lib/analytics";
import ColorPaletteGenerator from "@/components/ui/color-palette-generator";

export default function ThemeSelector() {
  const [open, setOpen] = useState(false);
  const [showPaletteGenerator, setShowPaletteGenerator] = useState(false);
  const { setTheme: setMode } = useTheme();
  const [themeVariant, setThemeVariant] = useState("rose");
  
  // Handle color palette application
  const handlePaletteGenerated = (palette: any) => {
    // For now, we'll just show a toast - can be expanded later
    console.log('Palette generated:', palette);
    setShowPaletteGenerator(false);
  };
  
  // Force dark mode and initialize theme variant from localStorage
  useEffect(() => {
    setMode("dark"); // Always set to dark mode
    
    // Clear any old theme-variant in localStorage if it's "red" and set to "rose" 
    const currentStored = localStorage.getItem("theme-variant");
    if (currentStored === "red" || !currentStored) {
      localStorage.setItem("theme-variant", "rose");
    }
    
    const storedTheme = localStorage.getItem("theme-variant") || "rose";
    setThemeVariant(storedTheme);
    
    // Apply the rose theme immediately
    const roseTheme = shadcnThemes.find((t) => t.value === "rose") || shadcnThemes[0];
    applyTheme(roseTheme, "dark");
  }, [setMode]);

  // Apply theme when variant changes (always dark)
  useEffect(() => {
    const selectedTheme = shadcnThemes.find((t) => t.value === themeVariant) || shadcnThemes[0];
    applyTheme(selectedTheme, "dark");
  }, [themeVariant]);

  function changeTheme(themeName: string) {
    setThemeVariant(themeName);
    localStorage.setItem("theme-variant", themeName);
    const selectedTheme = shadcnThemes.find((t) => t.value === themeName) || shadcnThemes[0];
    applyTheme(selectedTheme, "dark");
    
    // Track theme change
    trackThemeChange(themeName);
    
    // Show toast notification for better user feedback
    showToast("Palette Applied", `Applied "${selectedTheme.name}" to your theme`);
    
    setOpen(false);
  }

  // Enhanced toast notification function
  const showToast = (title: string, message: string) => {
    // Create and show a temporary toast notification
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 z-50 bg-background border border-border rounded-lg p-4 shadow-lg min-w-[300px] max-w-[400px]';
    toast.innerHTML = `
      <div class="flex items-start gap-3">
        <div class="flex-shrink-0 w-5 h-5 bg-primary/20 rounded-full flex items-center justify-center mt-0.5">
          <svg class="w-3 h-3 text-primary" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
          </svg>
        </div>
        <div class="flex-1">
          <h4 class="font-medium text-sm text-foreground">${title}</h4>
          <p class="text-sm text-muted-foreground mt-1">${message}</p>
        </div>
      </div>
    `;
    
    document.body.appendChild(toast);
    
    // Animate in
    requestAnimationFrame(() => {
      toast.style.transform = 'translateX(0)';
      toast.style.opacity = '1';
      toast.style.transition = 'all 0.3s ease-out';
    });
    
    // Remove after 3 seconds
    setTimeout(() => {
      toast.style.transform = 'translateX(100%)';
      toast.style.opacity = '0';
      setTimeout(() => {
        if (toast.parentNode) {
          document.body.removeChild(toast);
        }
      }, 300);
    }, 3000);
  };

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            size="icon"
            className="rounded-full h-12 w-12 sm:h-10 sm:w-10 bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 hover:scale-105 transition-all duration-200"
          >
            <Palette className="h-6 w-6 sm:h-5 sm:w-5" />
            <span className="sr-only">Select theme</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          alignOffset={-60}
          sideOffset={10}
          className="w-80 p-3"
        >
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-3">Color Theme</p>
              <div className="grid grid-cols-4 gap-2">
                {shadcnThemes.map((theme) => (
                  <button
                    key={theme.value}
                    onClick={() => changeTheme(theme.value)}
                    className={`p-2 rounded-md border-2 transition-all hover:scale-105 ${
                      themeVariant === theme.value
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-border hover:border-primary/50"
                    }`}
                    title={theme.name}
                  >
                    <div
                      className="w-full h-6 rounded-sm"
                      style={{ backgroundColor: theme.color }}
                    />
                    <p className="text-xs mt-1 truncate">{theme.name}</p>
                  </button>
                ))}
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