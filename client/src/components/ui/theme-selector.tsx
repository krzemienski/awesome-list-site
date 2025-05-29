import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Palette, Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

type ThemeOption = {
  value: string;
  label: string;
  color: string;
};

const themes: ThemeOption[] = [
  { value: "red", label: "Dark Red", color: "oklch(0.637 0.237 25.331)" },
  { value: "rose", label: "Rose", color: "hsl(346.8, 77.2%, 49.8%)" },
  { value: "orange", label: "Orange", color: "hsl(24.6, 95%, 53.1%)" },
  { value: "green", label: "Green", color: "hsl(142.1, 76.2%, 36.3%)" },
  { value: "blue", label: "Blue", color: "hsl(221.2, 83.2%, 53.3%)" },
  { value: "yellow", label: "Yellow", color: "hsl(47.9, 95.8%, 53.1%)" },
  { value: "violet", label: "Violet", color: "hsl(262.1, 83.3%, 57.8%)" },
];

export default function ThemeSelector() {
  const [open, setOpen] = useState(false);
  const { theme: mode, setTheme: setMode } = useTheme();
  const [themeVariant, setThemeVariant] = useState("rose");
  
  // Initialize theme variant from localStorage
  useEffect(() => {
    const storedTheme = localStorage.getItem("theme-variant") || "rose";
    setThemeVariant(storedTheme);
    
    // Apply theme CSS variables from the selected theme
    const selectedTheme = themes.find(t => t.value === storedTheme) || themes[0];
    document.documentElement.style.setProperty("--primary", selectedTheme.color);
    document.documentElement.style.setProperty("--ring", selectedTheme.color);
    document.documentElement.style.setProperty("--sidebar-primary", selectedTheme.color);
    document.documentElement.style.setProperty("--sidebar-ring", selectedTheme.color);
    
    // Also set data-theme attribute for theme CSS classes to work
    document.documentElement.setAttribute("data-theme", storedTheme);
  }, []);
  
  // Change theme variant
  const changeTheme = (theme: string) => {
    setThemeVariant(theme);
    
    // Apply theme CSS variables from the selected theme
    const selectedTheme = themes.find(t => t.value === theme) || themes[0];
    document.documentElement.style.setProperty("--primary", selectedTheme.color);
    document.documentElement.style.setProperty("--ring", selectedTheme.color);
    document.documentElement.style.setProperty("--sidebar-primary", selectedTheme.color);
    document.documentElement.style.setProperty("--sidebar-ring", selectedTheme.color);
    
    // Also set data-theme attribute for theme CSS classes to work
    document.documentElement.setAttribute("data-theme", theme);
    
    localStorage.setItem("theme-variant", theme);
    setOpen(false);
  };
  
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
          className="w-64 p-2"
        >
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-sm font-medium mb-2">Light/Dark Mode</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setMode("light")}
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs ${
                    mode === "light"
                      ? "bg-primary text-primary-foreground"
                      : "border border-muted hover:bg-accent"
                  } transition-colors`}
                >
                  <Sun className="h-4 w-4" />
                  Light
                </button>
                <button
                  onClick={() => setMode("dark")}
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs ${
                    mode === "dark"
                      ? "bg-primary text-primary-foreground"
                      : "border border-muted hover:bg-accent"
                  } transition-colors`}
                >
                  <Moon className="h-4 w-4" />
                  Dark
                </button>
              </div>
            </div>
            
            <div>
              <p className="text-sm font-medium mb-2">Color Theme</p>
              <div className="grid grid-cols-3 gap-2">
                {themes.map((theme) => (
                  <button
                    key={theme.value}
                    onClick={() => changeTheme(theme.value)}
                    className={`flex flex-col items-center justify-center gap-1 rounded-md ${
                      themeVariant === theme.value
                        ? "border-2 border-primary"
                        : "border border-muted"
                    } bg-background p-2 hover:bg-accent transition-colors`}
                  >
                    <div 
                      className="h-5 w-5 rounded-full" 
                      style={{ backgroundColor: theme.color }}
                    />
                    <span className="text-xs">{theme.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
