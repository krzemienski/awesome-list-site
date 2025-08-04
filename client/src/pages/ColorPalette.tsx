import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Sparkles, 
  Copy, 
  Download, 
  RefreshCw, 
  Palette, 
  Eye,
  CheckCircle,
  Info,
  AlertCircle,
  Lightbulb,
  Settings,
  Sun,
  Moon,
  Monitor
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { useToast } from "@/hooks/use-toast";
import MainLayout from "@/components/layout/new/MainLayout";

interface ColorInfo {
  hex: string;
  name: string;
  usage: string;
}

interface GeneratedPalette {
  name: string;
  description: string;
  theme: 'light' | 'dark' | 'mixed';
  colors: ColorInfo[];
}

interface PaletteResponse {
  palette: GeneratedPalette;
  reasoning: string;
}

export default function ColorPalette() {
  const [prompt, setPrompt] = useState("");
  const [generatedPalette, setGeneratedPalette] = useState<PaletteResponse | null>(null);
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  const generatePalette = useMutation({
    mutationFn: async (prompt: string): Promise<PaletteResponse> => {
      const response = await fetch('/api/generate-palette', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Failed to generate palette');
      }

      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedPalette(data);
    },
  });

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    generatePalette.mutate(prompt);
  };

  const copyToClipboard = async (text: string, type: 'hex' | 'css') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'hex') {
        setCopiedColor(text);
        setTimeout(() => setCopiedColor(null), 2000);
      } else {
        toast({
          title: "CSS Copied!",
          description: "Color palette CSS variables copied to clipboard.",
        });
      }
    } catch (err) {
      console.error('Failed to copy: ', err);
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard. Please try again.",
        variant: "destructive"
      });
    }
  };

  const showThemeToast = () => {
    const themes = [
      { key: 'light', label: 'Light', icon: Sun },
      { key: 'dark', label: 'Dark', icon: Moon },
      { key: 'system', label: 'System', icon: Monitor }
    ];

    toast({
      title: "Theme Settings",
      description: (
        <div className="flex items-center gap-2 mt-2">
          {themes.map((themeOption) => {
            const IconComponent = themeOption.icon;
            return (
              <Button
                key={themeOption.key}
                variant={theme === themeOption.key ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setTheme(themeOption.key);
                  toast({
                    title: "Theme Updated",
                    description: `Switched to ${themeOption.label} theme`,
                  });
                }}
                className="flex items-center gap-1"
              >
                <IconComponent className="h-3 w-3" />
                {themeOption.label}
              </Button>
            );
          })}
        </div>
      ),
      className: "fixed top-20 left-1/2 transform -translate-x-1/2 z-[110] max-w-md",
    });
  };

  const exportPalette = () => {
    if (!generatedPalette) return;

    const paletteData = {
      ...generatedPalette,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(paletteData, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${generatedPalette.palette.name.toLowerCase().replace(/\s+/g, '-')}-palette.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateCSS = () => {
    if (!generatedPalette) return '';

    return generatedPalette.palette.colors.map((color, index) => 
      `  --color-${color.name.toLowerCase().replace(/\s+/g, '-')}: ${color.hex};`
    ).join('\n');
  };

  const predefinedPrompts = [
    "Modern tech startup with trust and innovation",
    "Calming wellness app for meditation",
    "Bold e-commerce fashion brand",
    "Professional financial dashboard",
    "Creative design agency portfolio",
    "Gaming platform with dark theme",
    "Educational platform for children",
    "Sustainable eco-friendly brand"
  ];

  return (
    <MainLayout isLoading={false}>
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-6 sm:mb-8 text-center">
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <Palette className="h-6 w-6 sm:h-8 sm:w-8 text-rose-500" />
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
              AI Color Palette Generator
            </h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={showThemeToast}
              className="ml-2 p-2"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
            Create stunning, accessible color palettes using advanced AI and color theory principles.
            Perfect for brands, websites, and design projects.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-4 sm:gap-8">
          {/* Input Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-rose-500" />
                Describe Your Vision
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="prompt" className="text-sm font-medium">
                  What kind of palette do you need?
                </Label>
                <Textarea
                  id="prompt"
                  placeholder="e.g., 'A modern tech startup focused on AI and machine learning, conveying trust, innovation, and professionalism'"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="mt-2 min-h-[100px]"
                />
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">
                  <Lightbulb className="h-4 w-4 inline mr-1" />
                  Quick Start Ideas
                </Label>
                <div className="grid gap-2">
                  {predefinedPrompts.map((suggestion, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="justify-start text-left h-auto py-2 px-3"
                      onClick={() => setPrompt(suggestion)}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>

              <Button 
                onClick={handleGenerate}
                disabled={!prompt.trim() || generatePalette.isPending}
                className="w-full"
              >
                {generatePalette.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Generating Palette...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate AI Palette
                  </>
                )}
              </Button>

              {generatePalette.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {generatePalette.error.message}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Results Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-rose-500" />
                Generated Palette
              </CardTitle>
            </CardHeader>
            <CardContent>
              {generatePalette.isPending ? (
                <div className="space-y-4">
                  <Skeleton className="h-8 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <div className="grid grid-cols-4 gap-2">
                    {[...Array(6)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                </div>
              ) : generatedPalette ? (
                <div className="space-y-6">
                  {/* Palette Header */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xl font-semibold">
                        {generatedPalette.palette.name}
                      </h3>
                      <Badge variant="secondary">
                        {generatedPalette.palette.theme}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground">
                      {generatedPalette.palette.description}
                    </p>
                  </div>

                  {/* Color Swatches */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {generatedPalette.palette.colors.map((color, index) => (
                      <div
                        key={index}
                        className="group cursor-pointer transition-all duration-200 hover:scale-105"
                        onClick={() => copyToClipboard(color.hex, 'hex')}
                      >
                        <div
                          className="h-12 sm:h-16 w-full rounded-lg border shadow-sm mb-2"
                          style={{ backgroundColor: color.hex }}
                        />
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{color.name}</span>
                            <div className="flex items-center gap-1">
                              <code className="text-xs bg-muted px-1 rounded">
                                {color.hex}
                              </code>
                              {copiedColor === color.hex ? (
                                <CheckCircle className="h-3 w-3 text-green-500" />
                              ) : (
                                <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {color.usage}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button variant="outline" onClick={exportPalette} size="sm" className="w-full sm:w-auto">
                      <Download className="mr-2 h-4 w-4" />
                      Export JSON
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => copyToClipboard(generateCSS(), 'css')}
                      size="sm"
                      className="w-full sm:w-auto"
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copy CSS
                    </Button>
                  </div>

                  {/* AI Reasoning */}
                  <div>
                    <Separator className="mb-4" />
                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        Color Theory & Reasoning
                      </Label>
                      <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                        {generatedPalette.reasoning}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Palette className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Enter a description and generate your first AI palette!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Additional Information */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-semibold mb-2">AI-Powered Generation</h4>
                <p className="text-muted-foreground">
                  Advanced AI analyzes your description and generates palettes using professional color theory principles.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Accessibility First</h4>
                <p className="text-muted-foreground">
                  All palettes are designed with WCAG AA accessibility standards in mind for optimal contrast and readability.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Export Ready</h4>
                <p className="text-muted-foreground">
                  Export your palettes as JSON or copy CSS variables for immediate use in your projects.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}