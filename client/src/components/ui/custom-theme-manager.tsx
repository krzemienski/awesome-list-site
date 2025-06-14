import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Upload, Download, Palette, Eye, Save, Trash2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface CustomTheme {
  id: string;
  name: string;
  description?: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    foreground: string;
    accent: string;
    muted: string;
    border: string;
    card: string;
    destructive?: string;
  };
  typography?: {
    fontFamily?: string;
    fontSize?: string;
  };
  spacing?: {
    radius?: string;
  };
  createdAt: string;
}

interface CustomThemeManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onThemeApply: (theme: CustomTheme) => void;
  currentTheme?: CustomTheme;
}

const DEFAULT_THEMES: CustomTheme[] = [
  {
    id: "ocean-blue",
    name: "Ocean Blue",
    description: "A calming blue theme inspired by the ocean depths",
    colors: {
      primary: "210 100% 50%",
      secondary: "210 40% 90%",
      background: "210 20% 98%",
      foreground: "210 100% 15%",
      accent: "210 100% 95%",
      muted: "210 40% 96%",
      border: "210 30% 90%",
      card: "210 50% 99%"
    },
    createdAt: new Date().toISOString()
  },
  {
    id: "forest-green",
    name: "Forest Green",
    description: "A natural green theme inspired by forest landscapes",
    colors: {
      primary: "142 100% 35%",
      secondary: "142 40% 90%",
      background: "142 20% 98%",
      foreground: "142 100% 15%",
      accent: "142 100% 95%",
      muted: "142 40% 96%",
      border: "142 30% 90%",
      card: "142 50% 99%"
    },
    createdAt: new Date().toISOString()
  },
  {
    id: "sunset-orange",
    name: "Sunset Orange",
    description: "A warm orange theme inspired by beautiful sunsets",
    colors: {
      primary: "25 100% 55%",
      secondary: "25 40% 90%",
      background: "25 20% 98%",
      foreground: "25 100% 15%",
      accent: "25 100% 95%",
      muted: "25 40% 96%",
      border: "25 30% 90%",
      card: "25 50% 99%"
    },
    createdAt: new Date().toISOString()
  }
];

export default function CustomThemeManager({ 
  isOpen, 
  onClose, 
  onThemeApply, 
  currentTheme 
}: CustomThemeManagerProps) {
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<CustomTheme | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTheme, setEditingTheme] = useState<CustomTheme | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const { toast } = useToast();

  // Load custom themes from localStorage on mount
  useEffect(() => {
    const savedThemes = localStorage.getItem('custom-themes');
    if (savedThemes) {
      try {
        setCustomThemes(JSON.parse(savedThemes));
      } catch (error) {
        console.error('Failed to load custom themes:', error);
      }
    }
  }, []);

  // Save custom themes to localStorage
  const saveThemes = (themes: CustomTheme[]) => {
    localStorage.setItem('custom-themes', JSON.stringify(themes));
    setCustomThemes(themes);
  };

  // Apply theme colors to CSS variables
  const applyTheme = (theme: CustomTheme) => {
    const root = document.documentElement;
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value);
    });
    
    if (theme.typography?.fontFamily) {
      root.style.setProperty('--font-family', theme.typography.fontFamily);
    }
    
    if (theme.spacing?.radius) {
      root.style.setProperty('--radius', theme.spacing.radius);
    }
    
    onThemeApply(theme);
    toast({
      title: "Theme Applied",
      description: `${theme.name} theme has been applied successfully.`,
    });
  };

  // Preview theme temporarily
  const previewTheme = (theme: CustomTheme) => {
    setSelectedTheme(theme);
    applyTheme(theme);
  };

  // Export theme as JSON file
  const exportTheme = (theme: CustomTheme) => {
    const dataStr = JSON.stringify(theme, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${theme.name.toLowerCase().replace(/\s+/g, '-')}-theme.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Theme Exported",
      description: `${theme.name} theme has been downloaded.`,
    });
  };

  // Import theme from JSON file
  const handleImport = async () => {
    if (!importFile) return;
    
    try {
      const text = await importFile.text();
      const importedTheme: CustomTheme = JSON.parse(text);
      
      // Validate theme structure
      if (!importedTheme.name || !importedTheme.colors) {
        throw new Error('Invalid theme file format');
      }
      
      // Generate new ID and timestamp
      const newTheme: CustomTheme = {
        ...importedTheme,
        id: `custom-${Date.now()}`,
        createdAt: new Date().toISOString()
      };
      
      const updatedThemes = [...customThemes, newTheme];
      saveThemes(updatedThemes);
      
      toast({
        title: "Theme Imported",
        description: `${newTheme.name} theme has been imported successfully.`,
      });
      
      setImportFile(null);
    } catch (error) {
      toast({
        title: "Import Failed",
        description: "Failed to import theme. Please check the file format.",
        variant: "destructive",
      });
    }
  };

  // Delete custom theme
  const deleteTheme = (themeId: string) => {
    const updatedThemes = customThemes.filter(theme => theme.id !== themeId);
    saveThemes(updatedThemes);
    
    toast({
      title: "Theme Deleted",
      description: "Custom theme has been deleted.",
    });
  };

  // Start editing a theme
  const startEditing = (theme: CustomTheme) => {
    setEditingTheme({ ...theme });
    setIsEditing(true);
  };

  // Save edited theme
  const saveEditedTheme = () => {
    if (!editingTheme) return;
    
    const updatedThemes = customThemes.map(theme => 
      theme.id === editingTheme.id ? editingTheme : theme
    );
    saveThemes(updatedThemes);
    setIsEditing(false);
    setEditingTheme(null);
    
    toast({
      title: "Theme Saved",
      description: "Theme changes have been saved.",
    });
  };

  // Create new theme
  const createNewTheme = () => {
    const newTheme: CustomTheme = {
      id: `custom-${Date.now()}`,
      name: "New Custom Theme",
      description: "A custom theme created by user",
      colors: {
        primary: "210 100% 50%",
        secondary: "210 40% 90%",
        background: "210 20% 98%",
        foreground: "210 100% 15%",
        accent: "210 100% 95%",
        muted: "210 40% 96%",
        border: "210 30% 90%",
        card: "210 50% 99%"
      },
      createdAt: new Date().toISOString()
    };
    
    const updatedThemes = [...customThemes, newTheme];
    saveThemes(updatedThemes);
    startEditing(newTheme);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Custom Theme Manager
          </DialogTitle>
          <DialogDescription>
            Import, create, and manage custom themes for your application.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="browse" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="browse">Browse Themes</TabsTrigger>
            <TabsTrigger value="import">Import/Export</TabsTrigger>
            <TabsTrigger value="edit">Theme Editor</TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Available Themes</h3>
              <Button onClick={createNewTheme} variant="outline" size="sm">
                <Palette className="h-4 w-4 mr-2" />
                Create New
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Default Themes */}
              {DEFAULT_THEMES.map(theme => (
                <Card key={theme.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base">{theme.name}</CardTitle>
                        <CardDescription className="text-sm">{theme.description}</CardDescription>
                      </div>
                      <Badge variant="secondary">Built-in</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 mb-3">
                      {Object.entries(theme.colors).slice(0, 5).map(([key, value]) => (
                        <div
                          key={key}
                          className="w-6 h-6 rounded border"
                          style={{ backgroundColor: `hsl(${value})` }}
                          title={key}
                        />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => previewTheme(theme)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Preview
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => applyTheme(theme)}
                      >
                        Apply
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => exportTheme(theme)}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Custom Themes */}
              {customThemes.map(theme => (
                <Card key={theme.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base">{theme.name}</CardTitle>
                        <CardDescription className="text-sm">{theme.description}</CardDescription>
                      </div>
                      <Badge variant="default">Custom</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 mb-3">
                      {Object.entries(theme.colors).slice(0, 5).map(([key, value]) => (
                        <div
                          key={key}
                          className="w-6 h-6 rounded border"
                          style={{ backgroundColor: `hsl(${value})` }}
                          title={key}
                        />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => previewTheme(theme)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Preview
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => applyTheme(theme)}
                      >
                        Apply
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => startEditing(theme)}
                      >
                        <Palette className="h-3 w-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => exportTheme(theme)}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => deleteTheme(theme.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="import" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Import Theme
                </CardTitle>
                <CardDescription>
                  Import a custom theme from a JSON file
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="theme-file">Theme File (JSON)</Label>
                  <Input
                    id="theme-file"
                    type="file"
                    accept=".json"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  />
                </div>
                <Button 
                  onClick={handleImport} 
                  disabled={!importFile}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import Theme
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Export Themes
                </CardTitle>
                <CardDescription>
                  Download your custom themes as JSON files
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {customThemes.length === 0 ? (
                    <p className="text-muted-foreground">No custom themes to export</p>
                  ) : (
                    customThemes.map(theme => (
                      <div key={theme.id} className="flex justify-between items-center">
                        <span>{theme.name}</span>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => exportTheme(theme)}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Export
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="edit" className="space-y-4">
            {isEditing && editingTheme ? (
              <Card>
                <CardHeader>
                  <CardTitle>Editing: {editingTheme.name}</CardTitle>
                  <CardDescription>
                    Customize colors and settings for your theme
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="theme-name">Theme Name</Label>
                      <Input
                        id="theme-name"
                        value={editingTheme.name}
                        onChange={(e) => setEditingTheme({
                          ...editingTheme,
                          name: e.target.value
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="theme-description">Description</Label>
                      <Input
                        id="theme-description"
                        value={editingTheme.description || ''}
                        onChange={(e) => setEditingTheme({
                          ...editingTheme,
                          description: e.target.value
                        })}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(editingTheme.colors).map(([key, value]) => (
                      <div key={key}>
                        <Label htmlFor={`color-${key}`}>
                          {key.charAt(0).toUpperCase() + key.slice(1)}
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            id={`color-${key}`}
                            value={value}
                            onChange={(e) => setEditingTheme({
                              ...editingTheme,
                              colors: {
                                ...editingTheme.colors,
                                [key]: e.target.value
                              }
                            })}
                            placeholder="e.g., 210 100% 50%"
                          />
                          <div
                            className="w-10 h-10 rounded border flex-shrink-0"
                            style={{ backgroundColor: `hsl(${value})` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={saveEditedTheme}>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => previewTheme(editingTheme)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false);
                        setEditingTheme(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Theme Editor</CardTitle>
                  <CardDescription>
                    Select a theme to edit or create a new one
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Palette className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">
                      No theme selected for editing
                    </p>
                    <div className="flex gap-2 justify-center">
                      <Button onClick={createNewTheme}>
                        Create New Theme
                      </Button>
                      <Button variant="outline" onClick={() => setIsEditing(false)}>
                        Select from Browse Tab
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}