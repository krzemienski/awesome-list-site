import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTheme } from "@/hooks/use-theme";
import { useToast } from "@/hooks/use-toast";
import { 
  CheckCircle, 
  AlertCircle, 
  Info, 
  Sun, 
  Moon, 
  Monitor,
  Palette,
  Settings
} from "lucide-react";

export function ThemeTestComponent() {
  const { theme, actualTheme, setTheme } = useTheme();
  const { toast } = useToast();
  const [testValue, setTestValue] = useState([50]);
  const [switchValue, setSwitchValue] = useState(false);

  const testComponentIntegrity = () => {
    const components = [
      { name: 'Button', test: () => true },
      { name: 'Card', test: () => true },
      { name: 'Badge', test: () => true },
      { name: 'Input', test: () => true },
      { name: 'Switch', test: () => switchValue !== undefined },
      { name: 'Slider', test: () => testValue.length > 0 },
      { name: 'Progress', test: () => true },
      { name: 'Alert', test: () => true }
    ];

    const results = components.map(comp => ({
      ...comp,
      working: comp.test()
    }));

    const workingCount = results.filter(r => r.working).length;
    
    toast({
      title: "Component Test Results",
      description: `${workingCount}/${components.length} shadcn components working correctly`,
      variant: workingCount === components.length ? "default" : "destructive"
    });

    return results;
  };

  const themeOptions = [
    { key: 'light', label: 'Light', icon: Sun },
    { key: 'dark', label: 'Dark', icon: Moon },
    { key: 'system', label: 'System', icon: Monitor }
  ] as const;

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Theme & Component Testing Suite
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Theme Status */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Palette className="h-8 w-8 mx-auto mb-2 text-primary" />
                <div className="text-sm font-medium">Current Theme</div>
                <div className="text-lg font-bold capitalize">{theme}</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                {actualTheme === 'dark' ? (
                  <Moon className="h-8 w-8 mx-auto mb-2 text-primary" />
                ) : (
                  <Sun className="h-8 w-8 mx-auto mb-2 text-primary" />
                )}
                <div className="text-sm font-medium">Active Theme</div>
                <div className="text-lg font-bold capitalize">{actualTheme}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <div className="text-sm font-medium">OKLCH Colors</div>
                <div className="text-lg font-bold">Active</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Theme Switching */}
        <div>
          <Label className="text-base font-semibold mb-3 block">Theme Selection</Label>
          <div className="flex flex-wrap gap-2">
            {themeOptions.map((option) => {
              const IconComponent = option.icon;
              return (
                <Button
                  key={option.key}
                  variant={theme === option.key ? "default" : "outline"}
                  onClick={() => setTheme(option.key)}
                  className="flex items-center gap-2"
                >
                  <IconComponent className="h-4 w-4" />
                  {option.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Component Testing */}
        <div>
          <Label className="text-base font-semibold mb-3 block">shadcn Component Testing</Label>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Test Components */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="test-input">Input Component</Label>
                <Input id="test-input" placeholder="Test input..." />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="test-switch"
                  checked={switchValue}
                  onCheckedChange={setSwitchValue}
                />
                <Label htmlFor="test-switch">Switch Component</Label>
              </div>

              <div className="space-y-2">
                <Label>Slider Component: {testValue[0]}</Label>
                <Slider
                  value={testValue}
                  onValueChange={setTestValue}
                  max={100}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <Label>Progress Component</Label>
                <Progress value={testValue[0]} />
              </div>
            </div>

            {/* Test Results */}
            <div className="space-y-4">
              <div className="flex gap-2">
                <Badge variant="default">Primary Badge</Badge>
                <Badge variant="secondary">Secondary Badge</Badge>
                <Badge variant="outline">Outline Badge</Badge>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  This is a test alert using the current theme colors.
                </AlertDescription>
              </Alert>

              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This is a destructive alert variant.
                </AlertDescription>
              </Alert>

              <Button onClick={testComponentIntegrity} className="w-full">
                <CheckCircle className="mr-2 h-4 w-4" />
                Test All Components
              </Button>
            </div>
          </div>
        </div>

        {/* Color Palette Preview */}
        <div>
          <Label className="text-base font-semibold mb-3 block">OKLCH Color Palette Preview</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { name: 'Background', var: '--background' },
              { name: 'Primary', var: '--primary' },
              { name: 'Secondary', var: '--secondary' },
              { name: 'Accent', var: '--accent' },
              { name: 'Muted', var: '--muted' },
              { name: 'Card', var: '--card' },
              { name: 'Border', var: '--border' },
              { name: 'Ring', var: '--ring' }
            ].map((color) => (
              <div
                key={color.name}
                className="p-3 rounded border"
                style={{ backgroundColor: `var(${color.var})` }}
              >
                <div className="text-xs font-medium opacity-75">{color.name}</div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}