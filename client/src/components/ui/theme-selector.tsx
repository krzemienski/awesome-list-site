
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Palette, Wand2, Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { shadcnThemes, applyTheme, applyThemeWithTransition, loadThemePreferences, saveThemePreferences } from "@/lib/shadcn-themes";
import { trackThemeChange } from "@/lib/analytics";
import ColorPaletteGenerator from "@/components/ui/color-palette-generator";
import { useToast } from "@/hooks/use-toast";

export default function ThemeSelector() {
  const [open, setOpen] = useState(false);
  const [showPaletteGenerator, setShowPaletteGenerator] = useState(false);
  const { theme, actualTheme, setTheme } = useTheme();
  const [themeVariant, setThemeVariant] = useState("violet");
  const { toast } = useToast();
  
  // Handle color palette application
  const handlePaletteGenerated = (palette: any) => {
    // For now, we'll just show a toast - can be expanded later
    console.log('Palette generated:', palette);
    setShowPaletteGenerator(false);
  };
  
  // Initialize theme variant from localStorage with improved persistence
  useEffect(() => {
    // Load preferences using new utility function
    const preferences = loadThemePreferences();
    
    if (preferences) {
      setThemeVariant(preferences.theme);
    } else {
      // Migration from old storage format
      const oldThemeVariant = localStorage.getItem("theme-variant");
      const migratedTheme = oldThemeVariant === "red" ? "violet" : (oldThemeVariant || "violet");
      setThemeVariant(migratedTheme);
      
      // Clean up old storage
      localStorage.removeItem("theme-variant");
    }
    
    // Apply the stored theme with current actual theme mode
    const selectedTheme = shadcnThemes.find((t) => t.value === themeVariant) || shadcnThemes[0];
    applyTheme(selectedTheme, actualTheme);
  }, [actualTheme, themeVariant]);

  // Apply theme when variant changes
  useEffect(() => {
    const selectedTheme = shadcnThemes.find((t) => t.value === themeVariant) || shadcnThemes[0];
    applyTheme(selectedTheme, actualTheme);
  }, [themeVariant, actualTheme]);

  function changeTheme(themeName: string) {
    setThemeVariant(themeName);
    const selectedTheme = shadcnThemes.find((t) => t.value === themeName) || shadcnThemes[0];
    
    // Apply theme with smooth transition and save preferences
    applyThemeWithTransition(selectedTheme, actualTheme, true);
    
    // Track theme change
    trackThemeChange(themeName);
    
    // Show improved toast notification
    toast({
      title: "Theme Applied",
      description: `Applied "${selectedTheme.name}" color palette`,
    });
    
    setOpen(false);
  }
  
  function changeModeTheme(mode: "light" | "dark" | "system") {
    setTheme(mode);
    
    // Save the combined theme and mode preferences
    saveThemePreferences(themeVariant, mode);
    
    toast({
      title: "Theme Mode Changed",
      description: `Switched to ${mode} mode`,
    });
  }

  // Get theme mode icon
  const getModeIcon = (mode: string) => {
    switch (mode) {
      case "light":
        return <Sun className="h-4 w-4" />;
      case "dark":
        return <Moon className="h-4 w-4" />;
      case "system":
        return <Monitor className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
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
              <p className="text-sm font-medium mb-3">Theme Mode</p>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {["light", "dark", "system"].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => changeModeTheme(mode as "light" | "dark" | "system")}
                    className={`p-2 rounded-md border-2 transition-all hover:scale-105 flex items-center justify-center gap-2 ${
                      theme === mode
                        ? "border-primary ring-2 ring-primary/20 bg-primary/10"
                        : "border hover:border-primary/50"
                    }`}
                    title={`${mode.charAt(0).toUpperCase() + mode.slice(1)} mode`}
                  >
                    {getModeIcon(mode)}
                    <span className="text-xs capitalize">{mode}</span>
                  </button>
                ))}
              </div>
              <Separator className="my-3" />
            </div>
            <div>
              <p className="text-sm font-medium mb-3">Color Palette</p>
              <div className="grid grid-cols-4 gap-2">
                {shadcnThemes.map((theme) => (
                  <button
                    key={theme.value}
                    onClick={() => changeTheme(theme.value)}
                    className={`p-2 rounded-md border-2 transition-all hover:scale-105 ${
                      themeVariant === theme.value
                        ? "border-primary ring-2 ring-primary/20"
                        : "border hover:border-primary/50"
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