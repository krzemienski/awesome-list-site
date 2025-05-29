import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Palette } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { shadcnThemes, applyTheme } from "@/lib/shadcn-themes";

export default function ThemeSelector() {
  const [open, setOpen] = useState(false);
  const { setTheme: setMode } = useTheme();
  const [themeVariant, setThemeVariant] = useState("red");
  
  // Force dark mode and initialize theme variant from localStorage
  useEffect(() => {
    setMode("dark"); // Always set to dark mode
    const storedTheme = localStorage.getItem("theme-variant") || "red";
    setThemeVariant(storedTheme);
    
    // Apply the red theme immediately
    const redTheme = shadcnThemes.find((t) => t.value === "red") || shadcnThemes[0];
    applyTheme(redTheme, "dark");
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
    setOpen(false);
  }

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            size="icon"
            className="rounded-full h-10 w-10 bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
          >
            <Palette className="h-5 w-5" />
            <span className="sr-only">Select theme</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          alignOffset={-60}
          sideOffset={10}
          className="w-80 p-3"
        >
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
        </PopoverContent>
      </Popover>
    </div>
  );
}