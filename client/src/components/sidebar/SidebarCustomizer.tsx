import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Settings, 
  Eye, 
  EyeOff, 
  GripVertical, 
  RotateCcw,
  Palette,
  Layout,
  Star
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Category } from "@/types/awesome-list";

interface SidebarSettings {
  showCounts: boolean;
  compactMode: boolean;
  autoCollapse: boolean;
  fontSize: number;
  groupByPopularity: boolean;
  hiddenCategories: string[];
  pinnedCategories: string[];
  categoryOrder: string[];
  colorScheme: 'default' | 'blue' | 'green' | 'purple' | 'rose';
}

interface SidebarCustomizerProps {
  categories: Category[];
  settings: SidebarSettings;
  onSettingsChange: (settings: SidebarSettings) => void;
}

const DEFAULT_SETTINGS: SidebarSettings = {
  showCounts: true,
  compactMode: false,
  autoCollapse: true,
  fontSize: 14,
  groupByPopularity: false,
  hiddenCategories: [],
  pinnedCategories: [],
  categoryOrder: [],
  colorScheme: 'default'
};

export default function SidebarCustomizer({ categories, settings, onSettingsChange }: SidebarCustomizerProps) {
  const [localSettings, setLocalSettings] = useState<SidebarSettings>(settings);
  const [draggedCategory, setDraggedCategory] = useState<string | null>(null);

  // Update local settings when props change
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  // Apply settings changes
  const updateSettings = (newSettings: Partial<SidebarSettings>) => {
    const updated = { ...localSettings, ...newSettings };
    setLocalSettings(updated);
    onSettingsChange(updated);
  };

  // Reset to defaults
  const resetToDefaults = () => {
    setLocalSettings(DEFAULT_SETTINGS);
    onSettingsChange(DEFAULT_SETTINGS);
  };

  // Toggle category visibility
  const toggleCategoryVisibility = (categoryName: string) => {
    const hiddenCategories = localSettings.hiddenCategories.includes(categoryName)
      ? localSettings.hiddenCategories.filter(name => name !== categoryName)
      : [...localSettings.hiddenCategories, categoryName];
    
    updateSettings({ hiddenCategories });
  };

  // Toggle category pinning
  const toggleCategoryPin = (categoryName: string) => {
    const pinnedCategories = localSettings.pinnedCategories.includes(categoryName)
      ? localSettings.pinnedCategories.filter(name => name !== categoryName)
      : [...localSettings.pinnedCategories, categoryName];
    
    updateSettings({ pinnedCategories });
  };

  // Handle drag and drop for category reordering
  const handleDragStart = (categoryName: string) => {
    setDraggedCategory(categoryName);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetCategory: string) => {
    if (!draggedCategory || draggedCategory === targetCategory) {
      setDraggedCategory(null);
      return;
    }

    const currentOrder = localSettings.categoryOrder.length > 0 
      ? localSettings.categoryOrder 
      : categories.map(cat => cat.name);

    const draggedIndex = currentOrder.indexOf(draggedCategory);
    const targetIndex = currentOrder.indexOf(targetCategory);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedCategory(null);
      return;
    }

    const newOrder = [...currentOrder];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedCategory);

    updateSettings({ categoryOrder: newOrder });
    setDraggedCategory(null);
  };

  // Color scheme options
  const colorSchemes = [
    { value: 'default', label: 'Default', color: 'bg-muted-foreground' },
    { value: 'blue', label: 'Blue', color: 'bg-blue-500/90 dark:bg-blue-400/90' },
    { value: 'green', label: 'Green', color: 'bg-emerald-500/90 dark:bg-emerald-400/90' },
    { value: 'purple', label: 'Purple', color: 'bg-violet-500/90 dark:bg-violet-400/90' },
    { value: 'rose', label: 'Rose', color: 'bg-rose-500/90 dark:bg-rose-400/90' },
  ];

  const visibleCategories = categories.filter(cat => 
    !localSettings.hiddenCategories.includes(cat.name)
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layout className="h-5 w-5" />
            Customize Sidebar
          </DialogTitle>
          <DialogDescription>
            Personalize your navigation experience with custom layouts, themes, and organization
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Display Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Display Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="show-counts" className="text-sm font-medium">
                  Show resource counts
                </Label>
                <Switch
                  id="show-counts"
                  checked={localSettings.showCounts}
                  onCheckedChange={(checked) => updateSettings({ showCounts: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="compact-mode" className="text-sm font-medium">
                  Compact mode
                </Label>
                <Switch
                  id="compact-mode"
                  checked={localSettings.compactMode}
                  onCheckedChange={(checked) => updateSettings({ compactMode: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="auto-collapse" className="text-sm font-medium">
                  Auto-collapse categories
                </Label>
                <Switch
                  id="auto-collapse"
                  checked={localSettings.autoCollapse}
                  onCheckedChange={(checked) => updateSettings({ autoCollapse: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Font size: {localSettings.fontSize}px
                </Label>
                <Slider
                  value={[localSettings.fontSize]}
                  onValueChange={([value]) => updateSettings({ fontSize: value })}
                  min={12}
                  max={18}
                  step={1}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Color scheme</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <div className={cn(
                        "w-4 h-4 rounded mr-2",
                        colorSchemes.find(s => s.value === localSettings.colorScheme)?.color
                      )} />
                      {colorSchemes.find(s => s.value === localSettings.colorScheme)?.label}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {colorSchemes.map(scheme => (
                      <DropdownMenuItem
                        key={scheme.value}
                        onClick={() => updateSettings({ colorScheme: scheme.value as any })}
                      >
                        <div className={cn("w-4 h-4 rounded mr-2", scheme.color)} />
                        {scheme.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>

          {/* Category Management */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Category Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="group-popularity" className="text-sm font-medium">
                  Group by popularity
                </Label>
                <Switch
                  id="group-popularity"
                  checked={localSettings.groupByPopularity}
                  onCheckedChange={(checked) => updateSettings({ groupByPopularity: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Visible Categories ({visibleCategories.length}/{categories.length})
                </Label>
                <div className="max-h-48 overflow-y-auto space-y-1 border rounded-md p-2">
                  {categories.map(category => {
                    const isHidden = localSettings.hiddenCategories.includes(category.name);
                    const isPinned = localSettings.pinnedCategories.includes(category.name);
                    
                    return (
                      <div
                        key={category.name}
                        className={cn(
                          "flex items-center justify-between p-2 rounded text-sm",
                          isHidden ? "opacity-50 bg-muted" : "bg-background"
                        )}
                        draggable
                        onDragStart={() => handleDragStart(category.name)}
                        onDragOver={handleDragOver}
                        onDrop={() => handleDrop(category.name)}
                      >
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-3 w-3 text-muted-foreground cursor-grab" />
                          <span className={isHidden ? "line-through" : ""}>
                            {category.name}
                          </span>
                          {isPinned && <Star className="h-3 w-3 text-yellow-500 fill-current" />}
                          <Badge variant="secondary" className="text-xs">
                            {category.resources.length}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => toggleCategoryPin(category.name)}
                          >
                            <Star className={cn(
                              "h-3 w-3",
                              isPinned ? "text-yellow-500 fill-current" : "text-muted-foreground"
                            )} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => toggleCategoryVisibility(category.name)}
                          >
                            {isHidden ? 
                              <EyeOff className="h-3 w-3 text-muted-foreground" /> : 
                              <Eye className="h-3 w-3 text-muted-foreground" />
                            }
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={resetToDefaults}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset to Defaults
            </Button>
            
            <div className="text-sm text-muted-foreground">
              Settings are saved automatically
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook for managing sidebar settings
export function useSidebarSettings(categories: Category[]) {
  const [settings, setSettings] = useState<SidebarSettings>(DEFAULT_SETTINGS);

  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch (error) {
        console.error('Failed to load sidebar settings:', error);
      }
    }
  }, []);

  // Save settings to localStorage when changed
  const updateSettings = (newSettings: SidebarSettings) => {
    setSettings(newSettings);
    localStorage.setItem('sidebar-settings', JSON.stringify(newSettings));
  };

  // Get organized categories based on settings
  const getOrganizedCategories = (categories: Category[]) => {
    let organized = [...categories];

    // Filter out hidden categories
    organized = organized.filter(cat => !settings.hiddenCategories.includes(cat.name));

    // Apply custom order if set
    if (settings.categoryOrder.length > 0) {
      const orderedCategories: Category[] = [];
      const remaining = [...organized];

      // Add categories in custom order
      settings.categoryOrder.forEach(categoryName => {
        const category = remaining.find(cat => cat.name === categoryName);
        if (category) {
          orderedCategories.push(category);
          remaining.splice(remaining.indexOf(category), 1);
        }
      });

      // Add any remaining categories
      organized = [...orderedCategories, ...remaining];
    }

    // Group by popularity if enabled
    if (settings.groupByPopularity) {
      organized.sort((a, b) => b.resources.length - a.resources.length);
    }

    // Separate pinned categories
    const pinned = organized.filter(cat => settings.pinnedCategories.includes(cat.name));
    const unpinned = organized.filter(cat => !settings.pinnedCategories.includes(cat.name));

    return [...pinned, ...unpinned];
  };

  return {
    settings,
    updateSettings,
    getOrganizedCategories
  };
}