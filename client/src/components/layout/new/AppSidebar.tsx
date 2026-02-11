import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Home, Plus, BookOpen, Zap, Shield, ChevronRight, Folder, Palette } from "lucide-react";
import { cn, slugify, getCategorySlug } from "@/lib/utils";
import { Category, Resource } from "@/types/awesome-list";
import { getCategoryIcon, getSubcategoryIcon, getSubSubcategoryIcon } from "@/config/navigation-icons";
import { Badge } from "@/components/ui/badge";
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
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface AppSidebarProps {
  categories: Category[];
  resources: Resource[];
  isLoading: boolean;
  user?: any;
}

function getTotalResourceCount(item: any): number {
  let total = item.resources?.length || 0;
  if (item.subcategories) {
    total += item.subcategories.reduce((sum: number, sub: any) => sum + getTotalResourceCount(sub), 0);
  }
  if (item.subSubcategories) {
    total += item.subSubcategories.reduce((sum: number, subSub: any) => sum + getTotalResourceCount(subSub), 0);
  }
  return total;
}

function filterCategories(categories: Category[]) {
  return categories
    .filter(
      (cat) =>
        cat.name !== "Table of contents" &&
        !cat.name.startsWith("List of") &&
        !["Contributing", "License", "External Links", "Anti-features"].includes(cat.name)
    )
    .map((cat) => {
      const filteredSubcategories = cat.subcategories
        ?.filter((sub) => getTotalResourceCount(sub) > 0)
        .map((sub) => ({
          ...sub,
          subSubcategories: sub.subSubcategories?.filter((subSub) => getTotalResourceCount(subSub) > 0),
        }));
      return { ...cat, subcategories: filteredSubcategories };
    });
}

export default function AppSidebar({ categories, resources, isLoading, user }: AppSidebarProps) {
  const [location, setLocation] = useLocation();
  const [openCategories, setOpenCategories] = useState<string[]>([]);
  const [openSubcategories, setOpenSubcategories] = useState<string[]>([]);

  const filtered = filterCategories(categories);

  useEffect(() => {
    if (categories.length === 0) return;
    const parts = location.split("/");
    if (parts[1] === "category" || parts[1] === "subcategory" || parts[1] === "sub-subcategory") {
      const slug = parts[2];
      const matchCat = categories.find(
        (cat) =>
          getCategorySlug(cat.name) === slug ||
          cat.subcategories?.some((sub) => sub.slug === slug) ||
          cat.subcategories?.some((sub) => sub.subSubcategories?.some((ss) => ss.slug === slug))
      );
      if (matchCat && !openCategories.includes(matchCat.name)) {
        setOpenCategories((prev) => [...prev, matchCat.name]);
      }
      if (parts[1] === "sub-subcategory") {
        const matchSub = matchCat?.subcategories?.find((sub) =>
          sub.subSubcategories?.some((ss) => ss.slug === slug)
        );
        if (matchSub && !openSubcategories.includes(matchSub.name)) {
          setOpenSubcategories((prev) => [...prev, matchSub.name]);
        }
      }
    }
  }, [categories, location]);

  const navigate = (path: string) => {
    setLocation(path);
  };

  const isActive = (path: string) => location === path;

  const navItems = [
    { label: "Home", icon: Home, href: "/" },
    { label: "Submit Resource", icon: Plus, href: "/submit" },
    { label: "Learning Journeys", icon: BookOpen, href: "/journeys" },
    { label: "Advanced", icon: Zap, href: "/advanced" },
    { label: "Theme", icon: Palette, href: "/settings/theme" },
  ];

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="border-b">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" onClick={() => navigate("/")} className="cursor-pointer">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Folder className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-semibold">Awesome Video</span>
                <span className="text-xs text-muted-foreground">{resources.length} resources</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={isActive(item.href)}
                    onClick={() => navigate(item.href)}
                    tooltip={item.label}
                  >
                    <item.icon className="size-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {user?.role === "admin" && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={isActive("/admin")}
                    onClick={() => navigate("/admin")}
                    tooltip="Admin"
                  >
                    <Shield className="size-4" />
                    <span>Admin</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Categories</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <SidebarMenuItem key={i}>
                      <SidebarMenuButton>
                        <div className="h-4 w-4 rounded bg-muted animate-pulse" />
                        <div className="h-4 flex-1 rounded bg-muted animate-pulse" />
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))
                : filtered.map((cat) => {
                    const CategoryIcon = getCategoryIcon(cat.name);
                    const catPath = `/category/${cat.slug || getCategorySlug(cat.name)}`;
                    const hasSubs = cat.subcategories && cat.subcategories.length > 0;
                    const isOpen = openCategories.includes(cat.name);
                    const totalCount = getTotalResourceCount(cat);

                    if (!hasSubs) {
                      return (
                        <SidebarMenuItem key={cat.name}>
                          <SidebarMenuButton
                            isActive={isActive(catPath)}
                            onClick={() => navigate(catPath)}
                            tooltip={cat.name}
                          >
                            <CategoryIcon className="size-4" />
                            <span className="truncate">{cat.name}</span>
                            <Badge variant="secondary" className="ml-auto text-xs tabular-nums">
                              {totalCount}
                            </Badge>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    }

                    return (
                      <Collapsible
                        key={cat.name}
                        open={isOpen}
                        onOpenChange={(open) =>
                          setOpenCategories((prev) =>
                            open ? [...prev, cat.name] : prev.filter((c) => c !== cat.name)
                          )
                        }
                        className="group/collapsible"
                      >
                        <SidebarMenuItem>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton tooltip={cat.name}>
                              <CategoryIcon className="size-4" />
                              <span className="truncate">{cat.name}</span>
                              <Badge variant="secondary" className="ml-auto text-xs tabular-nums">
                                {totalCount}
                              </Badge>
                              <ChevronRight className="ml-1 size-4 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub>
                              <SidebarMenuSubItem>
                                <SidebarMenuSubButton
                                  isActive={isActive(catPath)}
                                  onClick={() => navigate(catPath)}
                                >
                                  <span>All {cat.name}</span>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                              {cat.subcategories?.map((sub) => {
                                const SubIcon = getSubcategoryIcon(sub.name);
                                const subPath = `/subcategory/${sub.slug || slugify(sub.name)}`;
                                const hasSubSubs = sub.subSubcategories && sub.subSubcategories.length > 0;
                                const subCount = getTotalResourceCount(sub);
                                const isSubOpen = openSubcategories.includes(sub.name);

                                if (!hasSubSubs) {
                                  return (
                                    <SidebarMenuSubItem key={sub.name}>
                                      <SidebarMenuSubButton
                                        isActive={isActive(subPath)}
                                        onClick={() => navigate(subPath)}
                                      >
                                        <span className="truncate">{sub.name}</span>
                                        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                                          {subCount}
                                        </span>
                                      </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                  );
                                }

                                return (
                                  <Collapsible
                                    key={sub.name}
                                    open={isSubOpen}
                                    onOpenChange={(open) =>
                                      setOpenSubcategories((prev) =>
                                        open ? [...prev, sub.name] : prev.filter((s) => s !== sub.name)
                                      )
                                    }
                                    className="group/sub"
                                  >
                                    <SidebarMenuSubItem>
                                      <CollapsibleTrigger asChild>
                                        <SidebarMenuSubButton>
                                          <span className="truncate">{sub.name}</span>
                                          <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                                            {subCount}
                                          </span>
                                          <ChevronRight className="ml-1 size-3 shrink-0 transition-transform duration-200 group-data-[state=open]/sub:rotate-90" />
                                        </SidebarMenuSubButton>
                                      </CollapsibleTrigger>
                                      <CollapsibleContent>
                                        <SidebarMenuSub>
                                          <SidebarMenuSubItem>
                                            <SidebarMenuSubButton
                                              isActive={isActive(subPath)}
                                              onClick={() => navigate(subPath)}
                                            >
                                              <span>All {sub.name}</span>
                                            </SidebarMenuSubButton>
                                          </SidebarMenuSubItem>
                                          {sub.subSubcategories?.map((subSub) => {
                                            const ssPath = `/sub-subcategory/${subSub.slug || slugify(subSub.name)}`;
                                            const ssCount = getTotalResourceCount(subSub);
                                            return (
                                              <SidebarMenuSubItem key={subSub.name}>
                                                <SidebarMenuSubButton
                                                  isActive={isActive(ssPath)}
                                                  onClick={() => navigate(ssPath)}
                                                >
                                                  <span className="truncate">{subSub.name}</span>
                                                  <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                                                    {ssCount}
                                                  </span>
                                                </SidebarMenuSubButton>
                                              </SidebarMenuSubItem>
                                            );
                                          })}
                                        </SidebarMenuSub>
                                      </CollapsibleContent>
                                    </SidebarMenuSubItem>
                                  </Collapsible>
                                );
                              })}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </SidebarMenuItem>
                      </Collapsible>
                    );
                  })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => navigate("/about")} tooltip="About">
              <BookOpen className="size-4" />
              <span>About</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
