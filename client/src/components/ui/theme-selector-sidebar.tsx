import { Moon, Sun } from "lucide-react";
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
import { trackThemeChange } from "@/lib/analytics";

export default function ThemeSelectorSidebar() {
  const { theme, setTheme } = useTheme();

  function changeMode(newMode: "light" | "dark" | "system") {
    setTheme(newMode);
    trackThemeChange(newMode);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton className="text-xs text-muted-foreground hover:text-foreground" data-testid="sidebar-theme-toggle">
          {theme === "dark" ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
          <span>Theme</span>
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-40">
        <DropdownMenuLabel>Appearance</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => changeMode("light")}
          className={theme === "light" ? "bg-accent" : ""}
          data-testid="theme-light"
        >
          <Sun className="h-4 w-4 mr-2" />
          <span className="text-sm">Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => changeMode("dark")}
          className={theme === "dark" ? "bg-accent" : ""}
          data-testid="theme-dark"
        >
          <Moon className="h-4 w-4 mr-2" />
          <span className="text-sm">Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => changeMode("system")}
          className={theme === "system" ? "bg-accent" : ""}
          data-testid="theme-system"
        >
          <span className="text-sm ml-6">System</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}