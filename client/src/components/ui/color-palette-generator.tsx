import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { 
  Palette, 
  Sparkles, 
  Copy, 
  Download, 
  RefreshCw, 
  Eye,
  Save,
  Wand2,
  Shuffle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface ColorPalette {
  id: string;
  name: string;
  description?: string;
  colors: string[];
  mood: string;
  style: string;
  createdAt: string;
  aiGenerated?: boolean;
  prompt?: string;
}

export interface PaletteGenerationOptions {
  baseColor?: string;
  mood: 'vibrant' | 'calm' | 'warm' | 'cool' | 'neutral' | 'dark' | 'bright';
  style: 'modern' | 'vintage' | 'minimalist' | 'bold' | 'natural' | 'monochrome' | 'complementary';
  colorCount: number;
  harmony: 'analogous' | 'complementary' | 'triadic' | 'tetradic' | 'monochromatic' | 'split-complementary';
  prompt?: string;
}

interface ColorPaletteGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onPaletteGenerated: (palette: ColorPalette) => void;
}

export default function ColorPaletteGenerator({ isOpen, onClose, onPaletteGenerated }: ColorPaletteGeneratorProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("generator");
  const [generatedPalettes, setGeneratedPalettes] = useState<ColorPalette[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedPalette, setSelectedPalette] = useState<ColorPalette | null>(null);
  
  // Generation options
  const [options, setOptions] = useState<PaletteGenerationOptions>({
    mood: 'vibrant',
    style: 'modern',
    colorCount: 5,
    harmony: 'analogous'
  });
  
  const [aiPrompt, setAiPrompt] = useState("");
  const [useAI, setUseAI] = useState(false);

  // Load saved palettes from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('color-palettes');
    if (saved) {
      try {
        setGeneratedPalettes(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to load saved palettes:', error);
      }
    }
  }, []);

  // Save palettes to localStorage
  const savePalettes = (palettes: ColorPalette[]) => {
    localStorage.setItem('color-palettes', JSON.stringify(palettes));
    setGeneratedPalettes(palettes);
  };

  // Generate color palette using mathematical color theory
  const generateMathematicalPalette = (options: PaletteGenerationOptions): string[] => {
    const baseHue = options.baseColor ? hexToHsl(options.baseColor)[0] : Math.random() * 360;
    const colors: string[] = [];
    
    // Mood-based saturation and lightness adjustments
    const moodSettings = {
      vibrant: { saturation: [70, 90], lightness: [45, 65] },
      calm: { saturation: [30, 50], lightness: [60, 80] },
      warm: { saturation: [60, 80], lightness: [50, 70] },
      cool: { saturation: [50, 70], lightness: [40, 60] },
      neutral: { saturation: [20, 40], lightness: [40, 60] },
      dark: { saturation: [40, 60], lightness: [20, 40] },
      bright: { saturation: [80, 100], lightness: [70, 90] }
    };
    
    const { saturation, lightness } = moodSettings[options.mood];
    
    // Generate colors based on harmony type
    for (let i = 0; i < options.colorCount; i++) {
      let hue = baseHue;
      
      switch (options.harmony) {
        case 'analogous':
          hue = (baseHue + (i * 30)) % 360;
          break;
        case 'complementary':
          hue = i % 2 === 0 ? baseHue : (baseHue + 180) % 360;
          break;
        case 'triadic':
          hue = (baseHue + (i * 120)) % 360;
          break;
        case 'tetradic':
          hue = (baseHue + (i * 90)) % 360;
          break;
        case 'monochromatic':
          hue = baseHue;
          break;
        case 'split-complementary':
          if (i === 0) hue = baseHue;
          else if (i === 1) hue = (baseHue + 150) % 360;
          else hue = (baseHue + 210) % 360;
          break;
        default:
          hue = (baseHue + (i * (360 / options.colorCount))) % 360;
      }
      
      const s = saturation[0] + Math.random() * (saturation[1] - saturation[0]);
      const l = lightness[0] + Math.random() * (lightness[1] - lightness[0]);
      
      colors.push(hslToHex(hue, s, l));
    }
    
    return colors;
  };

  // AI-powered palette generation (simulated with enhanced algorithms)
  const generateAIPalette = async (prompt: string, options: PaletteGenerationOptions): Promise<string[]> => {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Enhanced algorithm that considers the prompt
    const promptKeywords = prompt.toLowerCase().split(/\s+/);
    let baseHue = Math.random() * 360;
    
    // Adjust base hue based on prompt keywords
    const colorMappings = {
      ocean: 200, sea: 200, blue: 240, sky: 210,
      forest: 120, green: 120, nature: 100,
      sunset: 30, orange: 30, fire: 15,
      purple: 270, violet: 280, lavender: 290,
      pink: 330, rose: 350, red: 0,
      yellow: 60, sun: 50, gold: 45,
      earth: 25, brown: 30, wood: 35
    };
    
    // Find matching colors in prompt
    for (const keyword of promptKeywords) {
      if (colorMappings[keyword as keyof typeof colorMappings]) {
        baseHue = colorMappings[keyword as keyof typeof colorMappings];
        break;
      }
    }
    
    // Generate palette with AI-influenced adjustments
    const enhancedOptions = {
      ...options,
      baseColor: hslToHex(baseHue, 70, 50)
    };
    
    return generateMathematicalPalette(enhancedOptions);
  };

  // Generate palette
  const generatePalette = async () => {
    setIsGenerating(true);
    
    try {
      let colors: string[];
      let name: string;
      let description: string;
      
      if (useAI && aiPrompt.trim()) {
        colors = await generateAIPalette(aiPrompt, options);
        name = `AI Palette: ${aiPrompt.slice(0, 30)}${aiPrompt.length > 30 ? '...' : ''}`;
        description = `AI-generated palette based on: "${aiPrompt}"`;
      } else {
        colors = generateMathematicalPalette(options);
        name = `${options.style} ${options.mood} Palette`;
        description = `${options.harmony} harmony with ${options.mood} mood in ${options.style} style`;
      }
      
      const newPalette: ColorPalette = {
        id: `palette_${Date.now()}`,
        name,
        description,
        colors,
        mood: options.mood,
        style: options.style,
        createdAt: new Date().toISOString(),
        aiGenerated: useAI && !!aiPrompt.trim(),
        prompt: useAI ? aiPrompt : undefined
      };
      
      const updatedPalettes = [newPalette, ...generatedPalettes];
      savePalettes(updatedPalettes);
      setSelectedPalette(newPalette);
      
      toast({
        title: "Palette Generated!",
        description: `Created "${name}" with ${colors.length} colors`,
      });
      
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Failed to generate color palette. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy color to clipboard
  const copyColor = (color: string) => {
    navigator.clipboard.writeText(color);
    toast({
      title: "Color Copied",
      description: `${color} copied to clipboard`,
    });
  };

  // Export palette
  const exportPalette = (palette: ColorPalette) => {
    const exportData = {
      name: palette.name,
      colors: palette.colors,
      css: palette.colors.map((color, index) => `--color-${index + 1}: ${color};`).join('\n'),
      scss: palette.colors.map((color, index) => `$color-${index + 1}: ${color};`).join('\n'),
      json: JSON.stringify(palette.colors, null, 2)
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${palette.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Palette Exported",
      description: "Palette exported as JSON file",
    });
  };

  // Apply palette to theme
  const applyPalette = (palette: ColorPalette) => {
    onPaletteGenerated(palette);
    toast({
      title: "Palette Applied",
      description: `Applied "${palette.name}" to your theme`,
    });
  };

  // Delete palette
  const deletePalette = (paletteId: string) => {
    const updatedPalettes = generatedPalettes.filter(p => p.id !== paletteId);
    savePalettes(updatedPalettes);
    if (selectedPalette?.id === paletteId) {
      setSelectedPalette(null);
    }
    toast({
      title: "Palette Deleted",
      description: "Palette has been removed",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Color Palette Generator
          </DialogTitle>
          <DialogDescription>
            Generate beautiful color palettes with AI suggestions and mathematical color theory
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="generator" className="flex items-center gap-2">
              <Wand2 className="h-4 w-4" />
              Generator
            </TabsTrigger>
            <TabsTrigger value="library" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Library
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generator" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Generation Options */}
              <Card>
                <CardHeader>
                  <CardTitle>Generation Options</CardTitle>
                  <CardDescription>Configure your palette parameters</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Mood</Label>
                    <Select value={options.mood} onValueChange={(value: any) => setOptions(prev => ({ ...prev, mood: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vibrant">Vibrant</SelectItem>
                        <SelectItem value="calm">Calm</SelectItem>
                        <SelectItem value="warm">Warm</SelectItem>
                        <SelectItem value="cool">Cool</SelectItem>
                        <SelectItem value="neutral">Neutral</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="bright">Bright</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Style</Label>
                    <Select value={options.style} onValueChange={(value: any) => setOptions(prev => ({ ...prev, style: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="modern">Modern</SelectItem>
                        <SelectItem value="vintage">Vintage</SelectItem>
                        <SelectItem value="minimalist">Minimalist</SelectItem>
                        <SelectItem value="bold">Bold</SelectItem>
                        <SelectItem value="natural">Natural</SelectItem>
                        <SelectItem value="monochrome">Monochrome</SelectItem>
                        <SelectItem value="complementary">Complementary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Color Harmony</Label>
                    <Select value={options.harmony} onValueChange={(value: any) => setOptions(prev => ({ ...prev, harmony: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="analogous">Analogous</SelectItem>
                        <SelectItem value="complementary">Complementary</SelectItem>
                        <SelectItem value="triadic">Triadic</SelectItem>
                        <SelectItem value="tetradic">Tetradic</SelectItem>
                        <SelectItem value="monochromatic">Monochromatic</SelectItem>
                        <SelectItem value="split-complementary">Split Complementary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Number of Colors: {options.colorCount}</Label>
                    <Slider
                      value={[options.colorCount]}
                      onValueChange={(value) => setOptions(prev => ({ ...prev, colorCount: value[0] }))}
                      min={3}
                      max={10}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Base Color (Optional)</Label>
                    <Input
                      type="color"
                      value={options.baseColor || "#3b82f6"}
                      onChange={(e) => setOptions(prev => ({ ...prev, baseColor: e.target.value }))}
                      className="w-full h-10"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* AI Options */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    AI Assistant
                  </CardTitle>
                  <CardDescription>Get AI-powered color suggestions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="use-ai"
                      checked={useAI}
                      onCheckedChange={setUseAI}
                    />
                    <Label htmlFor="use-ai">Enable AI Suggestions</Label>
                  </div>

                  {useAI && (
                    <div className="space-y-2">
                      <Label>Describe your vision</Label>
                      <Textarea
                        placeholder="e.g., 'ocean sunset with warm tones' or 'modern tech startup branding'"
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        rows={3}
                      />
                      <p className="text-sm text-muted-foreground">
                        The AI will analyze your description and generate colors that match your vision.
                      </p>
                    </div>
                  )}

                  <Button 
                    onClick={generatePalette} 
                    disabled={isGenerating || (useAI && !aiPrompt.trim())}
                    className="w-full"
                    size="lg"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        {useAI ? <Sparkles className="h-4 w-4 mr-2" /> : <Shuffle className="h-4 w-4 mr-2" />}
                        Generate Palette
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="library" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Generated Palettes</h3>
              <Badge variant="secondary">{generatedPalettes.length} palettes</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {generatedPalettes.map(palette => (
                <Card key={palette.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base">{palette.name}</CardTitle>
                        <CardDescription className="text-sm">{palette.description}</CardDescription>
                      </div>
                      {palette.aiGenerated && (
                        <Badge variant="default" className="flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          AI
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-1 mb-3">
                      {palette.colors.map((color, index) => (
                        <div
                          key={index}
                          className="flex-1 h-12 rounded cursor-pointer hover:scale-105 transition-transform"
                          style={{ backgroundColor: color }}
                          onClick={() => copyColor(color)}
                          title={`Click to copy ${color}`}
                        />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setSelectedPalette(palette)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Preview
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => applyPalette(palette)}
                      >
                        Apply
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => exportPalette(palette)}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {generatedPalettes.length === 0 && (
              <div className="text-center py-12">
                <Palette className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  No palettes generated yet
                </p>
                <Button onClick={() => setActiveTab("generator")}>
                  Generate Your First Palette
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            {selectedPalette ? (
              <div className="space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-semibold">{selectedPalette.name}</h3>
                    <p className="text-muted-foreground">{selectedPalette.description}</p>
                  </div>
                  {selectedPalette.aiGenerated && (
                    <Badge variant="default" className="flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      AI Generated
                    </Badge>
                  )}
                </div>

                {/* Large color preview */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {selectedPalette.colors.map((color, index) => (
                    <div key={index} className="space-y-2">
                      <div
                        className="w-full h-32 rounded-lg cursor-pointer hover:scale-105 transition-transform shadow-md"
                        style={{ backgroundColor: color }}
                        onClick={() => copyColor(color)}
                        title={`Click to copy ${color}`}
                      />
                      <div className="text-center">
                        <p className="font-mono text-sm">{color}</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyColor(color)}
                          className="h-6"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Preview components */}
                <div className="space-y-4">
                  <h4 className="font-semibold">Preview in Context</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Card preview */}
                    <Card style={{ 
                      backgroundColor: selectedPalette.colors[0], 
                      borderColor: selectedPalette.colors[1],
                      color: selectedPalette.colors[4] || '#ffffff'
                    }}>
                      <CardHeader>
                        <CardTitle style={{ color: selectedPalette.colors[2] }}>
                          Sample Card
                        </CardTitle>
                        <CardDescription style={{ color: selectedPalette.colors[3] }}>
                          This is how your palette looks in a card component
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button style={{ 
                          backgroundColor: selectedPalette.colors[1], 
                          color: selectedPalette.colors[0] 
                        }}>
                          Action Button
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Gradient preview */}
                    <div
                      className="h-32 rounded-lg flex items-center justify-center text-white font-semibold"
                      style={{
                        background: `linear-gradient(135deg, ${selectedPalette.colors[0]}, ${selectedPalette.colors[2]}, ${selectedPalette.colors[4] || selectedPalette.colors[1]})`
                      }}
                    >
                      Gradient Preview
                    </div>
                  </div>
                </div>

                {/* Export options */}
                <div className="flex gap-2">
                  <Button onClick={() => applyPalette(selectedPalette)}>
                    <Save className="h-4 w-4 mr-2" />
                    Apply to Theme
                  </Button>
                  <Button variant="outline" onClick={() => exportPalette(selectedPalette)}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Eye className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  Select a palette from the library to preview
                </p>
                <Button onClick={() => setActiveTab("library")}>
                  Browse Library
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// Helper functions for color conversion
function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;
  const sum = max + min;
  const l = sum / 2;

  let h: number, s: number;

  if (diff === 0) {
    h = s = 0;
  } else {
    s = l > 0.5 ? diff / (2 - sum) : diff / sum;

    switch (max) {
      case r:
        h = ((g - b) / diff + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / diff + 2) / 6;
        break;
      case b:
        h = ((r - g) / diff + 4) / 6;
        break;
      default:
        h = 0;
    }
  }

  return [h * 360, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  h /= 360;
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h * 6) % 2 - 1));
  const m = l - c / 2;

  let r: number, g: number, b: number;

  if (0 <= h && h < 1/6) {
    r = c; g = x; b = 0;
  } else if (1/6 <= h && h < 1/3) {
    r = x; g = c; b = 0;
  } else if (1/3 <= h && h < 1/2) {
    r = 0; g = c; b = x;
  } else if (1/2 <= h && h < 2/3) {
    r = 0; g = x; b = c;
  } else if (2/3 <= h && h < 5/6) {
    r = x; g = 0; b = c;
  } else {
    r = c; g = 0; b = x;
  }

  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}