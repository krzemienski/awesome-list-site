import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Menu, Search, Github, Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

interface TopBarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  onSearchOpen: () => void;
  title: string;
  repoUrl?: string;
}

export default function TopBar({
  isSidebarOpen,
  setIsSidebarOpen,
  onSearchOpen,
  title,
  repoUrl
}: TopBarProps) {
  const { theme, setTheme } = useTheme();
  
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-2 md:gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Link href="/" className="flex items-center space-x-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6 text-primary"
            >
              <path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h1" />
              <path d="M16 3h1a2 2 0 0 1 2 2v5a2 2 0 0 0 2 2 2 2 0 0 0-2 2v5a2 2 0 0 1-2 2h-1" />
              <line x1="12" x2="12" y1="8" y2="8" />
              <line x1="12" x2="12" y1="12" y2="12" />
              <line x1="12" x2="12" y1="16" y2="16" />
            </svg>
            <span className="font-bold hidden md:inline-block">{title}</span>
          </Link>
        </div>
        
        <div className="flex-1 mx-4 lg:mx-8">
          <button
            onClick={onSearchOpen}
            className="w-full flex items-center h-9 rounded-md border border-input px-4 py-2 text-sm bg-background ring-offset-background file:border-0 file:bg-transparent placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <span className="text-muted-foreground">Search resources...</span>
            <div className="ml-auto flex items-center gap-2">
              <kbd className="pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-xs text-muted-foreground opacity-100 hidden md:flex">
                <span className="text-xs">/</span>
              </kbd>
            </div>
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          {repoUrl && (
            <Button
              variant="ghost"
              size="icon"
              asChild
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
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
