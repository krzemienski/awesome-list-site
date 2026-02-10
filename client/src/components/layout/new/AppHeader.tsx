import { useState, useEffect, Fragment } from "react";
import { Link } from "wouter";
import { Search, Sun, Moon, Monitor, Palette, LogIn, LogOut, User, Bookmark, Shield, Shuffle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTheme } from "@/hooks/use-theme";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useLocation } from "wouter";
import { deslugify } from "@/lib/utils";

interface AppHeaderProps {
  onSearchOpen: () => void;
  user?: any;
  onLogout?: () => void;
}

function getBreadcrumbs(path: string) {
  if (path === "/") return [{ label: "Home", href: "/" }];
  const segments = path.split("/").filter(Boolean);
  const crumbs: { label: string; href: string }[] = [{ label: "Home", href: "/" }];
  const routeLabels: Record<string, string> = {
    category: "Category",
    subcategory: "Subcategory",
    "sub-subcategory": "Sub-subcategory",
    resource: "Resource",
    admin: "Admin",
    profile: "Profile",
    bookmarks: "Bookmarks",
    about: "About",
    advanced: "Advanced",
    submit: "Submit Resource",
    journeys: "Learning Journeys",
    journey: "Journey",
    login: "Login",
  };
  if (segments.length === 1) {
    crumbs.push({ label: routeLabels[segments[0]] || deslugify(segments[0]), href: path });
  } else if (segments.length >= 2) {
    crumbs.push({ label: routeLabels[segments[0]] || deslugify(segments[0]), href: `/${segments[0]}` });
    crumbs.push({ label: deslugify(segments[1]), href: path });
  }
  return crumbs;
}

export default function AppHeader({ onSearchOpen, user, onLogout }: AppHeaderProps) {
  const { mode, setMode, activeTheme, setThemeByValue, setCustomColor, randomizeTheme, presets, customHex } = useTheme();
  const [location] = useLocation();
  const crumbs = getBreadcrumbs(location);
  const [hexInput, setHexInput] = useState(customHex || "");

  useEffect(() => {
    if (customHex) setHexInput(customHex);
  }, [customHex]);

  const handleHexSubmit = () => {
    const hex = hexInput.trim();
    if (/^#[0-9a-fA-F]{3}$/.test(hex) || /^#[0-9a-fA-F]{6}$/.test(hex)) {
      setCustomColor(hex);
    }
  };

  const isActivePreset = (value: string) => activeTheme.value === value;

  const modeIcon = mode === "light" ? Sun : mode === "dark" ? Moon : Monitor;
  const ModeIcon = modeIcon;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-3 sm:px-4">
      <SidebarTrigger className="-ml-1 shrink-0" />
      <Separator orientation="vertical" className="mr-1 sm:mr-2 h-4 hidden sm:block" />

      <Breadcrumb className="hidden md:flex">
        <BreadcrumbList>
          {crumbs.map((crumb, i) => (
            <Fragment key={crumb.href}>
              <BreadcrumbItem>
                {i < crumbs.length - 1 ? (
                  <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {i < crumbs.length - 1 && <BreadcrumbSeparator />}
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex-1 min-w-0 mx-1 sm:mx-2">
        <button
          onClick={onSearchOpen}
          className="w-full max-w-sm flex items-center h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors hover:bg-accent"
        >
          <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-muted-foreground truncate hidden sm:inline">Search resources...</span>
          <span className="text-muted-foreground truncate sm:hidden">Search...</span>
          <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground md:flex">
            /
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {/* Mode toggle - full on desktop, condensed on mobile */}
        <div className="hidden sm:flex items-center border rounded-md">
          <Button
            variant={mode === "light" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8 rounded-none rounded-l-md"
            onClick={() => setMode("light")}
            title="Light mode"
          >
            <Sun className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={mode === "dark" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8 rounded-none border-x"
            onClick={() => setMode("dark")}
            title="Dark mode"
          >
            <Moon className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={mode === "system" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8 rounded-none rounded-r-md"
            onClick={() => setMode("system")}
            title="System"
          >
            <Monitor className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Mobile mode toggle - single button cycles through modes */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 sm:hidden"
          onClick={() => {
            const modes: ("light" | "dark" | "system")[] = ["light", "dark", "system"];
            const currentIndex = modes.indexOf(mode);
            const nextMode = modes[(currentIndex + 1) % modes.length];
            setMode(nextMode);
          }}
          title={`Current: ${mode} mode`}
        >
          <ModeIcon className="h-4 w-4" />
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 relative">
              <Palette className="h-4 w-4" />
              <span
                className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full border border-background"
                style={{ backgroundColor: activeTheme.preview.accent }}
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 p-4">
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Theme</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {presets.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => setThemeByValue(preset.value)}
                      className={`relative flex flex-col items-start gap-1.5 rounded-lg border-2 p-3 text-left transition-all hover:bg-accent/50 ${
                        isActivePreset(preset.value)
                          ? "border-primary bg-accent/30"
                          : "border-transparent bg-muted/30 hover:border-muted-foreground/30"
                      }`}
                    >
                      {isActivePreset(preset.value) && (
                        <Check className="absolute top-1.5 right-1.5 h-3.5 w-3.5 text-primary" />
                      )}
                      <div className="flex gap-1">
                        <div className="h-5 w-5 rounded-full border" style={{ backgroundColor: preset.preview.accent }} />
                        <div className="h-5 w-5 rounded-full border" style={{ backgroundColor: preset.preview.bg }} />
                        <div className="h-5 w-5 rounded-full border" style={{ backgroundColor: preset.preview.text }} />
                      </div>
                      <span className="text-xs font-medium">{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Mode toggle in popover for mobile users */}
              <div className="sm:hidden">
                <Separator />
                <div className="pt-3">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Mode</Label>
                  <div className="flex items-center border rounded-md mt-2">
                    <Button
                      variant={mode === "light" ? "secondary" : "ghost"}
                      size="sm"
                      className="flex-1 h-8 rounded-none rounded-l-md gap-1.5"
                      onClick={() => setMode("light")}
                    >
                      <Sun className="h-3.5 w-3.5" />
                      <span className="text-xs">Light</span>
                    </Button>
                    <Button
                      variant={mode === "dark" ? "secondary" : "ghost"}
                      size="sm"
                      className="flex-1 h-8 rounded-none border-x gap-1.5"
                      onClick={() => setMode("dark")}
                    >
                      <Moon className="h-3.5 w-3.5" />
                      <span className="text-xs">Dark</span>
                    </Button>
                    <Button
                      variant={mode === "system" ? "secondary" : "ghost"}
                      size="sm"
                      className="flex-1 h-8 rounded-none rounded-r-md gap-1.5"
                      onClick={() => setMode("system")}
                    >
                      <Monitor className="h-3.5 w-3.5" />
                      <span className="text-xs">Auto</span>
                    </Button>
                  </div>
                </div>
              </div>

              <Separator className="hidden sm:block" />

              <div>
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Custom Color</Label>
                <div className="flex gap-2 mt-2">
                  <div className="relative flex-1">
                    <Input
                      value={hexInput}
                      onChange={(e) => setHexInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleHexSubmit()}
                      placeholder="#3b82f6"
                      className="h-8 text-xs font-mono pl-8"
                      maxLength={7}
                    />
                    <div
                      className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 rounded border"
                      style={{ backgroundColor: /^#[0-9a-fA-F]{3,6}$/.test(hexInput) ? hexInput : "transparent" }}
                    />
                  </div>
                  <Button size="sm" variant="outline" className="h-8 px-3 text-xs" onClick={handleHexSubmit}>
                    Apply
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Enter any hex color (e.g. #ff6b35)</p>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 h-8 text-xs"
                onClick={randomizeTheme}
              >
                <Shuffle className="h-3.5 w-3.5" />
                Randomize Theme
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback>{user.name ? user.name[0].toUpperCase() : "U"}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user.name || user.email}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile"><User className="mr-2 h-4 w-4" /> Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/bookmarks"><Bookmark className="mr-2 h-4 w-4" /> Bookmarks</Link>
              </DropdownMenuItem>
              {user.role === "admin" && (
                <DropdownMenuItem asChild>
                  <Link href="/admin"><Shield className="mr-2 h-4 w-4" /> Admin</Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout}>
                <LogOut className="mr-2 h-4 w-4" /> Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => (window.location.href = "/api/login")} className="gap-1.5 h-9 px-2 sm:px-3">
            <LogIn className="h-4 w-4" />
            <span className="hidden sm:inline">Login</span>
          </Button>
        )}
      </div>
    </header>
  );
}
