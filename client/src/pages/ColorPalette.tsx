import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Palette, Copy, Download, RefreshCw, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ColorPalette {
  name: string;
  description: string;
  colors: {
    hex: string;
    name: string;
    usage: string;
  }[];
  theme: 'light' | 'dark' | 'mixed';
}

interface GeneratedPalette {
  palette: ColorPalette;
  reasoning: string;
}

export default function ColorPalette() {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPalette, setGeneratedPalette] = useState<GeneratedPalette | null>(null);
  const [savedPalettes, setSavedPalettes] = useState<ColorPalette[]>([]);
  const { toast } = useToast();

  // Load saved palettes from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('color-palettes');
    if (saved) {
      try {
        setSavedPalettes(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to load saved palettes:', error);
      }
    }
  }, []);

  // Generate color palette using AI
  const generatePalette = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Input required",
        description: "Please describe the color palette you want to generate.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-palette', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setGeneratedPalette(data);
      
      toast({
        title: "Palette generated!",
        description: "Your AI-generated color palette is ready.",
      });
    } catch (error) {
      console.error('Failed to generate palette:', error);
      toast({
        title: "Generation failed",
        description: "Failed to generate color palette. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Save palette to library
  const savePalette = (palette: ColorPalette) => {
    const updated = [...savedPalettes, { ...palette, name: palette.name || `Palette ${savedPalettes.length + 1}` }];
    setSavedPalettes(updated);
    localStorage.setItem('color-palettes', JSON.stringify(updated));
    
    toast({
      title: "Palette saved",
      description: "Added to your palette library.",
    });
  };

  // Copy color to clipboard
  const copyColor = async (color: string) => {
    try {
      await navigator.clipboard.writeText(color);
      toast({
        title: "Copied!",
        description: `Color ${color} copied to clipboard.`,
      });
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Export palette as CSS variables
  const exportAsCSSVariables = (palette: ColorPalette) => {
    const cssVars = palette.colors.map((color, index) => 
      `  --color-${color.name.toLowerCase().replace(/\s+/g, '-')}: ${color.hex};`
    ).join('\n');
    
    const css = `:root {\n${cssVars}\n}`;
    
    const blob = new Blob([css], { type: 'text/css' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${palette.name.toLowerCase().replace(/\s+/g, '-')}-palette.css`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Exported!",
      description: "CSS variables downloaded successfully.",
    });
  };

  // Pre-defined example prompts
  const examplePrompts = [
    "Modern fintech app with trust and professionalism",
    "Vibrant gaming interface with neon accents",
    "Minimalist productivity app with calm focus",
    "E-commerce site with warm, inviting tones",
    "Creative agency portfolio with bold contrasts"
  ];

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold flex items-center justify-center gap-3">
          <Palette className="h-8 w-8 text-rose-500" />
          AI Color Palette Generator
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Generate beautiful, harmonious color palettes using AI. Describe your project or mood, 
          and get mathematically balanced colors with usage suggestions.
        </p>
      </div>

      {/* Generation Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Generate New Palette
          </CardTitle>
          <CardDescription>
            Describe your project, brand, or desired mood to generate a custom color palette
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="prompt" className="text-sm font-medium">
              Description
            </label>
            <Textarea
              id="prompt"
              placeholder="e.g., 'Modern SaaS dashboard with professional blue tones and high contrast for accessibility'"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          
          <div className="space-y-2">
            <p className="text-sm font-medium">Example prompts:</p>
            <div className="flex flex-wrap gap-2">
              {examplePrompts.map((example, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => setPrompt(example)}
                  className="text-xs"
                >
                  {example}
                </Button>
              ))}
            </div>
          </div>

          <Button 
            onClick={generatePalette} 
            disabled={isGenerating || !prompt.trim()}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Palette
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Generated Palette Display */}
      {generatedPalette && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{generatedPalette.palette.name}</CardTitle>
                <CardDescription>{generatedPalette.palette.description}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => savePalette(generatedPalette.palette)}
                >
                  Save Palette
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportAsCSSVariables(generatedPalette.palette)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export CSS
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Color Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {generatedPalette.palette.colors.map((color, index) => (
                <div key={index} className="space-y-2">
                  <div
                    className="w-full h-20 rounded-lg border-2 border-border cursor-pointer transition-transform hover:scale-105"
                    style={{ backgroundColor: color.hex }}
                    onClick={() => copyColor(color.hex)}
                    title={`Click to copy ${color.hex}`}
                  />
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{color.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyColor(color.hex)}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">{color.hex}</p>
                    <p className="text-xs text-muted-foreground">{color.usage}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* AI Reasoning */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">AI Design Reasoning</h4>
              <p className="text-sm text-muted-foreground">{generatedPalette.reasoning}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Saved Palettes Library */}
      {savedPalettes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Palette Library</CardTitle>
            <CardDescription>Previously generated and saved palettes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {savedPalettes.map((palette, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{palette.name}</h4>
                      <p className="text-sm text-muted-foreground">{palette.description}</p>
                    </div>
                    <Badge variant="outline">{palette.theme}</Badge>
                  </div>
                  <div className="flex gap-1">
                    {palette.colors.map((color, colorIndex) => (
                      <div
                        key={colorIndex}
                        className="w-8 h-8 rounded cursor-pointer"
                        style={{ backgroundColor: color.hex }}
                        onClick={() => copyColor(color.hex)}
                        title={`${color.name}: ${color.hex}`}
                      />
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportAsCSSVariables(palette)}
                    className="w-full"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export CSS
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}