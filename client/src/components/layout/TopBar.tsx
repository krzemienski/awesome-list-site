import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Menu, Search, Github, BarChart3, User, LogIn, LogOut, Bookmark, Shield } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { useIsMobile } from "@/hooks/use-mobile";
import CustomThemeManager, { CustomTheme } from "@/components/ui/custom-theme-manager";
import AwesomeListExplorer from "@/components/ui/awesome-list-explorer";
import AnalyticsDashboard from "@/components/ui/analytics-dashboard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TopBarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  onSearchOpen: () => void;
  title: string;
  repoUrl?: string;
  resources?: any[];
  user?: any;
  onLogout?: () => void;
}

export default function TopBar({
  isSidebarOpen,
  setIsSidebarOpen,
  onSearchOpen,
  title,
  repoUrl,
  resources = [],
  user,
  onLogout
}: TopBarProps) {
  const { theme, setTheme } = useTheme();
  const isMobile = useIsMobile();
  const [isThemeManagerOpen, setIsThemeManagerOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [currentCustomTheme, setCurrentCustomTheme] = useState<CustomTheme | undefined>();

  const handleThemeApply = (customTheme: CustomTheme) => {
    setCurrentCustomTheme(customTheme);
    localStorage.setItem('applied-custom-theme', JSON.stringify(customTheme));
  };
  
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-2 md:px-4">
        <div className="flex items-center gap-1 md:gap-2 min-w-0 shrink-0">
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              aria-label="Toggle sidebar"
              className="shrink-0"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <Link href="/" className="flex items-center space-x-1 md:space-x-2 min-w-0">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5 md:h-6 md:w-6 text-primary shrink-0"
            >
              <path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h1" />
              <path d="M16 3h1a2 2 0 0 1 2 2v5a2 2 0 0 0 2 2 2 2 0 0 0-2 2v5a2 2 0 0 1-2 2h-1" />
              <line x1="12" x2="12" y1="8" y2="8" />
              <line x1="12" x2="12" y1="12" y2="12" />
              <line x1="12" x2="12" y1="16" y2="16" />
            </svg>
            <span className="font-bold text-sm md:text-base truncate">
              {isMobile ? (title.split(' ')[0] || "Awesome") : title}
            </span>
          </Link>
        </div>
        
        <div className="flex-1 mx-1 md:mx-4 min-w-0">
          <button
            onClick={onSearchOpen}
            className="w-full flex items-center h-8 md:h-9 rounded-md border border-input px-2 md:px-3 py-1 md:py-2 text-sm bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Search className="mr-1 md:mr-2 h-4 w-4 shrink-0 opacity-50" />
            <span className="text-muted-foreground truncate text-xs md:text-sm">
              {isMobile ? "Search..." : "Search resources..."}
            </span>
            <div className="ml-auto items-center gap-2 hidden md:flex">
              <kbd className="pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-xs text-muted-foreground opacity-100 flex">
                <span className="text-xs">/</span>
              </kbd>
            </div>
          </button>
        </div>
        
        <div className="flex items-center gap-1 shrink-0">
          {repoUrl && (
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="hidden md:inline-flex"
            >
              <a 
                href={repoUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                aria-label="GitHub Repository"
              >
                <Github className="h-5 w-5" />
              </a>
            </Button>
          )}
          
          <AwesomeListExplorer />
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsAnalyticsOpen(true)}
            aria-label="View analytics"
            title="Analytics Dashboard"
          >
            <BarChart3 className="h-5 w-5" />
          </Button>
          
          {/* User Authentication UI */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback>
                      {user.name ? user.name[0].toUpperCase() : 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name || user.email}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/bookmarks">
                    <Bookmark className="mr-2 h-4 w-4" />
                    <span>My Bookmarks</span>
                  </Link>
                </DropdownMenuItem>
                {user.user_metadata?.role === 'admin' && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin">
                      <Shield className="mr-2 h-4 w-4" />
                      <span>Admin Dashboard</span>
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/login">
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-2"
              >
              <LogIn className="h-4 w-4" />
              <span className="hidden sm:inline">Login</span>
            </Button>
            </Link>
          )}
        </div>
      </div>
      
      <AnalyticsDashboard
        resources={resources}
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
      />
      
      <CustomThemeManager
        isOpen={isThemeManagerOpen}
        onClose={() => setIsThemeManagerOpen(false)}
        onThemeApply={handleThemeApply}
        currentTheme={currentCustomTheme}
      />
    </header>
  );
}
