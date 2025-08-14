import { useState, useEffect } from "react";
import { Palette } from "lucide-react";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/hooks/use-theme";
import { shadcnThemes, applyTheme } from "@/lib/shadcn-themes";
import { trackThemeChange } from "@/lib/analytics";

export default function ThemeSelectorSidebar() {
  const { setTheme: setMode } = useTheme();
  const [themeVariant, setThemeVariant] = useState("rose");
  
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
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton className="text-xs text-muted-foreground hover:text-foreground">
          <Palette className="h-4 w-4" />
          <span>Theme</span>
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-48">
        <DropdownMenuLabel>Choose Theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {shadcnThemes.map((theme) => (
          <DropdownMenuItem
            key={theme.value}
            onClick={() => changeTheme(theme.value)}
            className={themeVariant === theme.value ? "bg-accent" : ""}
          >
            <div className="flex items-center gap-2 w-full">
              <div
                className="w-4 h-4 rounded-sm border"
                style={{ backgroundColor: theme.color }}
              />
              <span className="text-sm">{theme.name}</span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}