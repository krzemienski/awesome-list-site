import { useState } from "react";
import { useTheme } from "@/hooks/use-theme";
import { FONT_OPTIONS } from "@/components/ui/theme-provider";
import { getThemeCssExport } from "@/lib/shadcn-themes";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Check, Copy, Shuffle, Palette, ArrowLeft, Type } from "lucide-react";
import { Link } from "wouter";

export default function ThemeSettings() {
  const { activeTheme, setThemeByValue, setCustomColor, randomizeTheme, presets, customHex, activeFont, setFont } = useTheme();
  const { toast } = useToast();
  const [hexInput, setHexInput] = useState(customHex || "");
  const [copied, setCopied] = useState(false);

  const handleHexSubmit = () => {
    const hex = hexInput.trim();
    if (/^#[0-9a-fA-F]{3}$/.test(hex) || /^#[0-9a-fA-F]{6}$/.test(hex)) {
      setCustomColor(hex);
      toast({ title: "Custom color applied", description: `Accent color set to ${hex}` });
    } else {
      toast({ title: "Invalid color", description: "Enter a valid hex color (e.g. #ff003c)", variant: "destructive" });
    }
  };

  const handleExport = async () => {
    const css = getThemeCssExport(activeTheme);
    try {
      await navigator.clipboard.writeText(css);
      setCopied(true);
      toast({ title: "Copied to clipboard", description: "Theme CSS variables copied successfully." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Copy failed", description: "Could not copy to clipboard.", variant: "destructive" });
    }
  };

  const isActive = (value: string) => activeTheme.value === value;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <div className="flex items-center gap-3">
          <Palette className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Theme Settings</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Customize colors and fonts. Active: <Badge variant="outline" className="ml-1">{activeTheme.name}</Badge>
            </p>
          </div>
        </div>
      </div>

      <div className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <Type className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Font</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FONT_OPTIONS.map((font) => (
            <Card
              key={font.value}
              className={`cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 ${
                activeFont === font.value ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => {
                setFont(font.value);
                toast({ title: "Font changed", description: `Now using ${font.label}` });
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-sm">{font.label}</h3>
                    <p className="text-xs text-muted-foreground">{font.description}</p>
                  </div>
                  {activeFont === font.value && (
                    <div className="shrink-0 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-3.5 w-3.5 text-primary-foreground" />
                    </div>
                  )}
                </div>
                <div
                  className="text-sm mt-2 p-2 rounded bg-muted/50 border"
                  style={{ fontFamily: font.family }}
                >
                  The quick brown fox jumps over the lazy dog. 0123456789
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4">Color Theme</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        {presets.map((preset) => (
          <Card
            key={preset.value}
            className={`cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 ${
              isActive(preset.value) ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => setThemeByValue(preset.value)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-sm">{preset.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{preset.description}</p>
                </div>
                {isActive(preset.value) && (
                  <div className="shrink-0 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-3.5 w-3.5 text-primary-foreground" />
                  </div>
                )}
              </div>

              <div className="rounded-md overflow-hidden border" style={{ backgroundColor: preset.preview.bg }}>
                <div className="flex h-20">
                  <div className="w-12 border-r flex flex-col items-center justify-center gap-1.5 p-1" style={{ backgroundColor: preset.preview.sidebar, borderColor: preset.preview.accent + "33" }}>
                    <div className="w-5 h-1 rounded-full" style={{ backgroundColor: preset.preview.accent }} />
                    <div className="w-5 h-1 rounded-full opacity-40" style={{ backgroundColor: preset.preview.text }} />
                    <div className="w-5 h-1 rounded-full opacity-40" style={{ backgroundColor: preset.preview.text }} />
                  </div>
                  <div className="flex-1 p-2 flex flex-col justify-between">
                    <div className="flex gap-1.5">
                      <div className="h-2 w-8 rounded-sm" style={{ backgroundColor: preset.preview.accent }} />
                      <div className="h-2 w-12 rounded-sm opacity-30" style={{ backgroundColor: preset.preview.text }} />
                    </div>
                    <div className="flex gap-1">
                      <div className="h-6 w-12 rounded-sm" style={{ backgroundColor: preset.preview.secondary }} />
                      <div className="h-6 w-12 rounded-sm" style={{ backgroundColor: preset.preview.secondary }} />
                      <div className="h-6 w-12 rounded-sm" style={{ backgroundColor: preset.preview.secondary }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-1.5 mt-3">
                <div className="h-6 w-6 rounded-full border" style={{ backgroundColor: preset.preview.accent }} title="Primary" />
                <div className="h-6 w-6 rounded-full border" style={{ backgroundColor: preset.preview.bg }} title="Background" />
                <div className="h-6 w-6 rounded-full border" style={{ backgroundColor: preset.preview.secondary }} title="Secondary" />
                <div className="h-6 w-6 rounded-full border" style={{ backgroundColor: preset.preview.text }} title="Text" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <Label className="text-sm font-medium">Custom Accent Color</Label>
            <p className="text-xs text-muted-foreground mb-3">Enter any hex color to create a custom theme</p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  value={hexInput}
                  onChange={(e) => setHexInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleHexSubmit()}
                  placeholder="#ff003c"
                  className="h-9 text-sm font-mono pl-9"
                  maxLength={7}
                />
                <div
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 rounded border"
                  style={{ backgroundColor: /^#[0-9a-fA-F]{3,6}$/.test(hexInput) ? hexInput : "transparent" }}
                />
              </div>
              <Button size="sm" className="h-9 px-4" onClick={handleHexSubmit}>Apply</Button>
            </div>

            <div className="mt-4">
              <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => { randomizeTheme(); toast({ title: "Randomized!", description: "A random accent color has been applied." }); }}>
                <Shuffle className="h-4 w-4" />
                Randomize Theme
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <Label className="text-sm font-medium">Export Theme</Label>
            <p className="text-xs text-muted-foreground mb-3">Copy the CSS variables for your active theme to use elsewhere</p>
            <div className="bg-muted rounded-md p-3 font-mono text-xs max-h-32 overflow-y-auto mb-3 border">
              <pre className="whitespace-pre-wrap break-all">{getThemeCssExport(activeTheme).slice(0, 400)}...</pre>
            </div>
            <Button variant="outline" size="sm" className="w-full gap-2" onClick={handleExport}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied!" : "Copy Theme CSS"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
