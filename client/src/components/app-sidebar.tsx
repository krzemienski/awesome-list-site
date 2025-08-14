import React from 'react';
import { Link, useLocation } from 'wouter';
import { 
  Home, 
  Video, 
  FileCode, 
  Package2, 
  Search,
  ChevronDown,
  ChevronRight,
  Layers,
  Play,
  Settings,
  Palette,
  BookOpen,
  Cpu,
  Server,
  Globe,
  Users,
  Shield,
  Zap,
  Database,
  Cloud,
  Activity,
  Terminal,
  Briefcase,
  Award,
  Heart,
  GraduationCap,
  Code2,
  Tv,
  Wifi,
  Film,
  Music,
  Image,
  FileVideo,
  MonitorPlay,
  Podcast,
  Radio,
  Headphones,
  Mic,
  Camera,
  VideoIcon,
  Cast,
  Airplay,
  Youtube,
  Twitch,
  PlayCircle,
  CirclePlay,
  SquarePlay,
  PauseCircle,
  StopCircle,
  FastForward,
  Rewind,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  PictureInPicture2,
  Subtitles,
  Languages,
  Accessibility,
  Sparkles,
  Wand2,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import ThemeSelector from './ui/theme-selector';
import { AwesomeList, Category, Subcategory, Resource } from '@/types/awesome-list';

// Category icon mapping
const categoryIcons: Record<string, React.ComponentType<any>> = {
  'introduction': BookOpen,
  'learning': GraduationCap,
  'specifications-and-standards': FileCode,
  'talks-and-presentations': Mic,
  'blogs-and-vlogs': Video,
  'books': BookOpen,
  'tools': Terminal,
  'community': Users,
  'contributing': Heart,
  'cloud-cdns-and-infrastructure': Cloud,
  'hosting-and-storage': Database,
  'vod-platforms-and-providers': Tv,
  'media-asset-management': Briefcase,
  'content-management-systems': Server,
  'audio-tools-and-audio-codecs': Headphones,
  'streaming-servers-protocols': Wifi,
  'hls': Play,
  'dash': Zap,
  'webrtc': Globe,
  'low-latency': Activity,
  'streaming-tools': Settings,
  'players': Play,
  'web-players': Globe,
  'ios-tvos': Tv,
  'android': Shield,
  'smart-tv-and-stb': Tv,
  'roku': Tv,
  'gaming-consoles': Play,
  'analytics-performance-and-monitoring': Activity,
  'advertising-and-monetization': Award,
  'a-b-testing': Zap,
  'quality-of-experience': Heart,
  'media-security-and-content-protection': Shield,
  'encoding-transcoding': Code2,
  'video-production-and-ffmpeg': Film,
  'codecs-and-formats': Package2,
  'frame-rate-pixel-format-and-color-space': Image,
  'subtitles-and-captions': Subtitles,
  'video-enhancement-and-quality': Sparkles,
  'ar-vr-360': Globe,
  'ai-ml-cv-nlp-and-generative-ai': Cpu,
  'broadcasting-tools-and-resources': Radio,
  'documentaries': Film,
  'default': Video,
};

// Get icon for category
const getCategoryIcon = (categorySlug: string): React.ComponentType<any> => {
  return categoryIcons[categorySlug] || categoryIcons.default;
};

interface AppSidebarProps {
  awesomeList?: AwesomeList;
  isLoading?: boolean;
}

export function AppSidebar({ awesomeList, isLoading }: AppSidebarProps) {
  const [location] = useLocation();
  const [expandedCategories, setExpandedCategories] = React.useState<Set<string>>(new Set());
  
  const categories = awesomeList?.categories || [];
  const resources = awesomeList?.resources || [];
  const resourceCount = resources.length;

  // Toggle category expansion
  const toggleCategory = (categorySlug: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categorySlug)) {
        newSet.delete(categorySlug);
      } else {
        newSet.add(categorySlug);
      }
      return newSet;
    });
  };

  // Check if current route is active
  const isActive = (path: string) => location === path;

  // Group categories by section for better organization
  const categoryGroups = {
    'Getting Started': ['introduction', 'learning', 'specifications-and-standards', 'books', 'talks-and-presentations'],
    'Infrastructure & Delivery': ['cloud-cdns-and-infrastructure', 'hosting-and-storage', 'vod-platforms-and-providers', 'media-asset-management'],
    'Streaming & Protocols': ['streaming-servers-protocols', 'hls', 'dash', 'webrtc', 'low-latency', 'streaming-tools'],
    'Players & Platforms': ['players', 'web-players', 'ios-tvos', 'android', 'smart-tv-and-stb', 'roku', 'gaming-consoles'],
    'Processing & Production': ['encoding-transcoding', 'video-production-and-ffmpeg', 'codecs-and-formats', 'audio-tools-and-audio-codecs'],
    'Analytics & Monetization': ['analytics-performance-and-monitoring', 'advertising-and-monetization', 'a-b-testing', 'quality-of-experience'],
    'Advanced Technologies': ['ai-ml-cv-nlp-and-generative-ai', 'ar-vr-360', 'video-enhancement-and-quality', 'media-security-and-content-protection'],
    'Community & Resources': ['community', 'contributing', 'blogs-and-vlogs', 'documentaries'],
  };

  return (
    <Sidebar className="border-r bg-sidebar">
      <SidebarHeader className="border-b">
        <Link href="/">
          <SidebarMenuButton size="lg" className="w-full">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Video className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold">Awesome Video</span>
                <span className="text-xs text-muted-foreground">{resourceCount} Resources</span>
              </div>
            </div>
          </SidebarMenuButton>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <ScrollArea className="h-full">
          {/* Home */}
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={isActive('/')}
                  className={cn(
                    "w-full",
                    isActive('/') && "bg-sidebar-accent text-sidebar-accent-foreground"
                  )}
                >
                  <Link href="/">
                    <Home className="h-4 w-4" />
                    <span>Home</span>
                    <Badge variant="secondary" className="ml-auto">All</Badge>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>

          <SidebarSeparator />

          {/* AI Features */}
          <SidebarGroup>
            <SidebarGroupLabel>AI Features</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild
                    isActive={isActive('/color-palette')}
                    className={cn(
                      isActive('/color-palette') && "bg-sidebar-accent text-sidebar-accent-foreground"
                    )}
                  >
                    <Link href="/color-palette">
                      <Palette className="h-4 w-4" />
                      <span>Color Palette Generator</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild
                    isActive={isActive('/recommendations')}
                    className={cn(
                      isActive('/recommendations') && "bg-sidebar-accent text-sidebar-accent-foreground"
                    )}
                  >
                    <Link href="/recommendations">
                      <Sparkles className="h-4 w-4" />
                      <span>AI Recommendations</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarSeparator />

          {/* Categories by Group */}
          {Object.entries(categoryGroups).map(([groupName, categoryIds]) => {
            const groupCategories = categories.filter((cat: Category) => 
              categoryIds.includes(cat.slug)
            );

            if (groupCategories.length === 0) return null;

            return (
              <SidebarGroup key={groupName}>
                <SidebarGroupLabel>{groupName}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {groupCategories.map((category: Category) => {
                      const Icon = getCategoryIcon(category.slug);
                      const subcats = category.subcategories || [];
                      const hasSubcategories = subcats.length > 0;
                      const isExpanded = expandedCategories.has(category.slug);
                      const categoryPath = `/category/${category.slug}`;
                      const isCategoryActive = isActive(categoryPath);
                      const categoryResourceCount = category.resources.length;

                      if (hasSubcategories) {
                        return (
                          <Collapsible
                            key={category.slug}
                            open={isExpanded}
                            onOpenChange={() => toggleCategory(category.slug)}
                          >
                            <SidebarMenuItem>
                              <CollapsibleTrigger asChild>
                                <SidebarMenuButton
                                  className={cn(
                                    "w-full",
                                    isCategoryActive && "bg-sidebar-accent text-sidebar-accent-foreground"
                                  )}
                                >
                                  <Icon className="h-4 w-4" />
                                  <span className="flex-1">{category.name}</span>
                                  <Badge variant="outline" className="ml-2 h-5 px-1 text-xs">
                                    {categoryResourceCount}
                                  </Badge>
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4 ml-1" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 ml-1" />
                                  )}
                                </SidebarMenuButton>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <SidebarMenuSub>
                                  {/* Main category link */}
                                  <SidebarMenuSubItem>
                                    <SidebarMenuSubButton 
                                      asChild
                                      isActive={isCategoryActive}
                                      className={cn(
                                        isCategoryActive && "bg-sidebar-accent text-sidebar-accent-foreground"
                                      )}
                                    >
                                      <Link href={categoryPath}>
                                        <Layers className="h-3 w-3" />
                                        <span>All {category.name}</span>
                                      </Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                  {/* Subcategories */}
                                  {subcats.map((subcat: Subcategory) => {
                                    const subcatPath = `/subcategory/${subcat.slug}`;
                                    const isSubcatActive = isActive(subcatPath);
                                    const subcatResourceCount = subcat.resources.length;

                                    return (
                                      <SidebarMenuSubItem key={subcat.slug}>
                                        <SidebarMenuSubButton 
                                          asChild
                                          isActive={isSubcatActive}
                                          className={cn(
                                            isSubcatActive && "bg-sidebar-accent text-sidebar-accent-foreground"
                                          )}
                                        >
                                          <Link href={subcatPath}>
                                            <ChevronRight className="h-3 w-3" />
                                            <span className="flex-1">{subcat.name}</span>
                                            <Badge variant="outline" className="h-4 px-1 text-xs">
                                              {subcatResourceCount}
                                            </Badge>
                                          </Link>
                                        </SidebarMenuSubButton>
                                      </SidebarMenuSubItem>
                                    );
                                  })}
                                </SidebarMenuSub>
                              </CollapsibleContent>
                            </SidebarMenuItem>
                          </Collapsible>
                        );
                      } else {
                        return (
                          <SidebarMenuItem key={category.slug}>
                            <SidebarMenuButton 
                              asChild
                              isActive={isCategoryActive}
                              className={cn(
                                isCategoryActive && "bg-sidebar-accent text-sidebar-accent-foreground"
                              )}
                            >
                              <Link href={categoryPath}>
                                <Icon className="h-4 w-4" />
                                <span className="flex-1">{category.name}</span>
                                <Badge variant="outline" className="h-5 px-1 text-xs">
                                  {categoryResourceCount}
                                </Badge>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      }
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            );
          })}
        </ScrollArea>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2 px-2 py-1.5">
              <ThemeSelector />
              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                <Link href="/settings">
                  <Settings className="h-4 w-4" />
                  <span className="sr-only">Settings</span>
                </Link>
              </Button>
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              © 2025 Awesome Video
              <br />
              Powered by shadcn/ui v4
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}