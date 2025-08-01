// Shadcn/ui official themes with full CSS variable support

export interface ShadcnTheme {
  name: string;
  value: string;
  color: string;
  cssVars: {
    light: Record<string, string>;
    dark: Record<string, string>;
  };
}

export const shadcnThemes: ShadcnTheme[] = [
  {
    name: "Red",
    value: "red",
    color: "hsl(0, 72.2%, 50.6%)",
    cssVars: {
      light: {
        background: "0 0% 100%",
        foreground: "0 0% 3.9%",
        card: "0 0% 100%",
        "card-foreground": "0 0% 3.9%",
        popover: "0 0% 100%",
        "popover-foreground": "0 0% 3.9%",
        primary: "0 72.2% 50.6%",
        "primary-foreground": "0 85.7% 97.3%",
        secondary: "0 0% 96.1%",
        "secondary-foreground": "0 0% 9%",
        muted: "0 0% 96.1%",
        "muted-foreground": "0 0% 45.1%",
        accent: "0 0% 96.1%",
        "accent-foreground": "0 0% 9%",
        destructive: "0 84.2% 60.2%",
        "destructive-foreground": "0 0% 98%",
        border: "0 0% 89.8%",
        input: "0 0% 89.8%",
        ring: "0 72.2% 50.6%",
      },
      dark: {
        background: "0 0% 3.9%",
        foreground: "0 0% 98%",
        card: "0 0% 3.9%",
        "card-foreground": "0 0% 98%",
        popover: "0 0% 3.9%",
        "popover-foreground": "0 0% 98%",
        primary: "0 72.2% 50.6%",
        "primary-foreground": "0 85.7% 97.3%",
        secondary: "0 0% 14.9%",
        "secondary-foreground": "0 0% 98%",
        muted: "0 0% 14.9%",
        "muted-foreground": "0 0% 63.9%",
        accent: "0 0% 14.9%",
        "accent-foreground": "0 0% 98%",
        destructive: "0 62.8% 30.6%",
        "destructive-foreground": "0 0% 98%",
        border: "0 0% 14.9%",
        input: "0 0% 14.9%",
        ring: "0 72.2% 50.6%",
      }
    }
  },
  {
    name: "Rose",
    value: "rose",
    color: "hsl(346.8, 77.2%, 49.8%)",
    cssVars: {
      light: {
        background: "0 0% 100%",
        foreground: "240 10% 3.9%",
        card: "0 0% 100%",
        "card-foreground": "240 10% 3.9%",
        popover: "0 0% 100%",
        "popover-foreground": "240 10% 3.9%",
        primary: "346.8 77.2% 49.8%",
        "primary-foreground": "355.7 100% 97.3%",
        secondary: "240 4.8% 95.9%",
        "secondary-foreground": "240 5.9% 10%",
        muted: "240 4.8% 95.9%",
        "muted-foreground": "240 3.8% 46.1%",
        accent: "240 4.8% 95.9%",
        "accent-foreground": "240 5.9% 10%",
        destructive: "0 84.2% 60.2%",
        border: "240 5.9% 90%",
        input: "240 5.9% 90%",
        ring: "346.8 77.2% 49.8%",
      },
      dark: {
        background: "20 14.3% 4.1%",
        foreground: "0 0% 95%",
        card: "24 9.8% 10%",
        "card-foreground": "0 0% 95%",
        popover: "0 0% 9%",
        "popover-foreground": "0 0% 95%",
        primary: "346.8 77.2% 49.8%",
        "primary-foreground": "355.7 100% 97.3%",
        secondary: "240 3.7% 15.9%",
        "secondary-foreground": "0 0% 98%",
        muted: "0 0% 15%",
        "muted-foreground": "240 5% 64.9%",
        accent: "12 6.5% 15.1%",
        "accent-foreground": "0 0% 98%",
        destructive: "0 62.8% 30.6%",
        border: "240 3.7% 15.9%",
        input: "240 3.7% 15.9%",
        ring: "346.8 77.2% 49.8%",
      }
    }
  },
  {
    name: "Orange",
    value: "orange",
    color: "hsl(24.6, 95%, 53.1%)",
    cssVars: {
      light: {
        background: "0 0% 100%",
        foreground: "20 14.3% 4.1%",
        card: "0 0% 100%",
        "card-foreground": "20 14.3% 4.1%",
        popover: "0 0% 100%",
        "popover-foreground": "20 14.3% 4.1%",
        primary: "24.6 95% 53.1%",
        "primary-foreground": "60 9.1% 97.8%",
        secondary: "60 4.8% 95.9%",
        "secondary-foreground": "24 9.8% 10%",
        muted: "60 4.8% 95.9%",
        "muted-foreground": "25 5.3% 44.7%",
        accent: "60 4.8% 95.9%",
        "accent-foreground": "24 9.8% 10%",
        destructive: "0 84.2% 60.2%",
        border: "20 5.9% 90%",
        input: "20 5.9% 90%",
        ring: "24.6 95% 53.1%",
      },
      dark: {
        background: "20 14.3% 4.1%",
        foreground: "60 9.1% 97.8%",
        card: "20 14.3% 4.1%",
        "card-foreground": "60 9.1% 97.8%",
        popover: "20 14.3% 4.1%",
        "popover-foreground": "60 9.1% 97.8%",
        primary: "20.5 90.2% 48.2%",
        "primary-foreground": "60 9.1% 97.8%",
        secondary: "12 6.5% 15.1%",
        "secondary-foreground": "60 9.1% 97.8%",
        muted: "12 6.5% 15.1%",
        "muted-foreground": "24 5.4% 63.9%",
        accent: "12 6.5% 15.1%",
        "accent-foreground": "60 9.1% 97.8%",
        destructive: "0 62.8% 30.6%",
        border: "12 6.5% 15.1%",
        input: "12 6.5% 15.1%",
        ring: "20.5 90.2% 48.2%",
      }
    }
  },
  {
    name: "Green",
    value: "green",
    color: "hsl(142.1, 76.2%, 36.3%)",
    cssVars: {
      light: {
        background: "0 0% 100%",
        foreground: "240 10% 3.9%",
        card: "0 0% 100%",
        "card-foreground": "240 10% 3.9%",
        popover: "0 0% 100%",
        "popover-foreground": "240 10% 3.9%",
        primary: "142.1 76.2% 36.3%",
        "primary-foreground": "355.7 100% 97.3%",
        secondary: "240 4.8% 95.9%",
        "secondary-foreground": "240 5.9% 10%",
        muted: "240 4.8% 95.9%",
        "muted-foreground": "240 3.8% 46.1%",
        accent: "240 4.8% 95.9%",
        "accent-foreground": "240 5.9% 10%",
        destructive: "0 84.2% 60.2%",
        border: "240 5.9% 90%",
        input: "240 5.9% 90%",
        ring: "142.1 76.2% 36.3%",
      },
      dark: {
        background: "20 14.3% 4.1%",
        foreground: "0 0% 95%",
        card: "24 9.8% 10%",
        "card-foreground": "0 0% 95%",
        popover: "0 0% 9%",
        "popover-foreground": "0 0% 95%",
        primary: "142.1 70.6% 45.3%",
        "primary-foreground": "144.9 80.4% 10%",
        secondary: "240 3.7% 15.9%",
        "secondary-foreground": "0 0% 98%",
        muted: "0 0% 15%",
        "muted-foreground": "240 5% 64.9%",
        accent: "12 6.5% 15.1%",
        "accent-foreground": "0 0% 98%",
        destructive: "0 62.8% 30.6%",
        border: "240 3.7% 15.9%",
        input: "240 3.7% 15.9%",
        ring: "142.4 71.8% 29.2%",
      }
    }
  },
  {
    name: "Blue",
    value: "blue",
    color: "hsl(221.2, 83.2%, 53.3%)",
    cssVars: {
      light: {
        background: "0 0% 100%",
        foreground: "222.2 84% 4.9%",
        card: "0 0% 100%",
        "card-foreground": "222.2 84% 4.9%",
        popover: "0 0% 100%",
        "popover-foreground": "222.2 84% 4.9%",
        primary: "221.2 83.2% 53.3%",
        "primary-foreground": "210 40% 98%",
        secondary: "210 40% 96%",
        "secondary-foreground": "222.2 47.4% 11.2%",
        muted: "210 40% 96%",
        "muted-foreground": "215.4 16.3% 46.9%",
        accent: "210 40% 96%",
        "accent-foreground": "222.2 47.4% 11.2%",
        destructive: "0 84.2% 60.2%",
        border: "214.3 31.8% 91.4%",
        input: "214.3 31.8% 91.4%",
        ring: "221.2 83.2% 53.3%",
      },
      dark: {
        background: "222.2 84% 4.9%",
        foreground: "210 40% 98%",
        card: "222.2 84% 4.9%",
        "card-foreground": "210 40% 98%",
        popover: "222.2 84% 4.9%",
        "popover-foreground": "210 40% 98%",
        primary: "217.2 91.2% 59.8%",
        "primary-foreground": "222.2 84% 4.9%",
        secondary: "217.2 32.6% 17.5%",
        "secondary-foreground": "210 40% 98%",
        muted: "217.2 32.6% 17.5%",
        "muted-foreground": "215 20.2% 65.1%",
        accent: "217.2 32.6% 17.5%",
        "accent-foreground": "210 40% 98%",
        destructive: "0 62.8% 30.6%",
        border: "217.2 32.6% 17.5%",
        input: "217.2 32.6% 17.5%",
        ring: "224.3 76.3% 48%",
      }
    }
  },
  {
    name: "Yellow",
    value: "yellow",
    color: "hsl(47.9, 95.8%, 53.1%)",
    cssVars: {
      light: {
        background: "0 0% 100%",
        foreground: "20 14.3% 4.1%",
        card: "0 0% 100%",
        "card-foreground": "20 14.3% 4.1%",
        popover: "0 0% 100%",
        "popover-foreground": "20 14.3% 4.1%",
        primary: "47.9 95.8% 53.1%",
        "primary-foreground": "26 83.3% 14.1%",
        secondary: "60 4.8% 95.9%",
        "secondary-foreground": "24 9.8% 10%",
        muted: "60 4.8% 95.9%",
        "muted-foreground": "25 5.3% 44.7%",
        accent: "60 4.8% 95.9%",
        "accent-foreground": "24 9.8% 10%",
        destructive: "0 84.2% 60.2%",
        border: "20 5.9% 90%",
        input: "20 5.9% 90%",
        ring: "47.9 95.8% 53.1%",
      },
      dark: {
        background: "20 14.3% 4.1%",
        foreground: "60 9.1% 97.8%",
        card: "20 14.3% 4.1%",
        "card-foreground": "60 9.1% 97.8%",
        popover: "20 14.3% 4.1%",
        "popover-foreground": "60 9.1% 97.8%",
        primary: "47.9 95.8% 53.1%",
        "primary-foreground": "26 83.3% 14.1%",
        secondary: "12 6.5% 15.1%",
        "secondary-foreground": "60 9.1% 97.8%",
        muted: "12 6.5% 15.1%",
        "muted-foreground": "24 5.4% 63.9%",
        accent: "12 6.5% 15.1%",
        "accent-foreground": "60 9.1% 97.8%",
        destructive: "0 62.8% 30.6%",
        border: "12 6.5% 15.1%",
        input: "12 6.5% 15.1%",
        ring: "47.9 95.8% 53.1%",
      }
    }
  },
  {
    name: "Violet",
    value: "violet",
    color: "hsl(262.1, 83.3%, 57.8%)",
    cssVars: {
      light: {
        background: "0 0% 100%",
        foreground: "224 71.4% 4.1%",
        card: "0 0% 100%",
        "card-foreground": "224 71.4% 4.1%",
        popover: "0 0% 100%",
        "popover-foreground": "224 71.4% 4.1%",
        primary: "262.1 83.3% 57.8%",
        "primary-foreground": "210 20% 98%",
        secondary: "220 14.3% 95.9%",
        "secondary-foreground": "220.9 39.3% 11%",
        muted: "220 14.3% 95.9%",
        "muted-foreground": "220 8.9% 46.1%",
        accent: "220 14.3% 95.9%",
        "accent-foreground": "220.9 39.3% 11%",
        destructive: "0 84.2% 60.2%",
        border: "220 13% 91%",
        input: "220 13% 91%",
        ring: "262.1 83.3% 57.8%",
      },
      dark: {
        background: "224 71.4% 4.1%",
        foreground: "210 20% 98%",
        card: "224 71.4% 4.1%",
        "card-foreground": "210 20% 98%",
        popover: "224 71.4% 4.1%",
        "popover-foreground": "210 20% 98%",
        primary: "263.4 70% 50.4%",
        "primary-foreground": "210 20% 98%",
        secondary: "215 27.9% 16.9%",
        "secondary-foreground": "210 20% 98%",
        muted: "215 27.9% 16.9%",
        "muted-foreground": "217.9 10.6% 64.9%",
        accent: "215 27.9% 16.9%",
        "accent-foreground": "210 20% 98%",
        destructive: "0 62.8% 30.6%",
        border: "215 27.9% 16.9%",
        input: "215 27.9% 16.9%",
        ring: "263.4 70% 50.4%",
      }
    }
  },
  {
    name: "Zinc",
    value: "zinc",
    color: "hsl(240, 5.9%, 10%)",
    cssVars: {
      light: {
        background: "0 0% 100%",
        foreground: "240 10% 3.9%",
        card: "0 0% 100%",
        "card-foreground": "240 10% 3.9%",
        popover: "0 0% 100%",
        "popover-foreground": "240 10% 3.9%",
        primary: "240 5.9% 10%",
        "primary-foreground": "0 0% 98%",
        secondary: "240 4.8% 95.9%",
        "secondary-foreground": "240 5.9% 10%",
        muted: "240 4.8% 95.9%",
        "muted-foreground": "240 3.8% 46.1%",
        accent: "240 4.8% 95.9%",
        "accent-foreground": "240 5.9% 10%",
        destructive: "0 84.2% 60.2%",
        border: "240 5.9% 90%",
        input: "240 5.9% 90%",
        ring: "240 5.9% 10%",
      },
      dark: {
        background: "240 10% 3.9%",
        foreground: "0 0% 98%",
        card: "240 10% 3.9%",
        "card-foreground": "0 0% 98%",
        popover: "240 10% 3.9%",
        "popover-foreground": "0 0% 98%",
        primary: "0 0% 98%",
        "primary-foreground": "240 5.9% 10%",
        secondary: "240 3.7% 15.9%",
        "secondary-foreground": "0 0% 98%",
        muted: "240 3.7% 15.9%",
        "muted-foreground": "240 5% 64.9%",
        accent: "240 3.7% 15.9%",
        "accent-foreground": "0 0% 98%",
        destructive: "0 62.8% 30.6%",
        border: "240 3.7% 15.9%",
        input: "240 3.7% 15.9%",
        ring: "240 4.9% 83.9%",
      }
    }
  }
];

export function applyTheme(theme: ShadcnTheme, mode: "light" | "dark") {
  const root = document.documentElement;
  const vars = theme.cssVars[mode];
  
  // Apply CSS variables with proper formatting
  Object.entries(vars).forEach(([key, value]) => {
    try {
      // Handle different color formats consistently
      const formattedValue = formatColorValue(value);
      root.style.setProperty(`--${key}`, formattedValue);
    } catch (error) {
      console.warn(`Failed to apply color variable --${key}: ${value}`, error);
      // Fallback to original value
      root.style.setProperty(`--${key}`, value);
    }
  });
  
  // Set data-theme attribute for compatibility
  root.setAttribute("data-theme", theme.value);
  
  // Apply mode-specific class with smooth transition
  root.classList.remove("light", "dark");
  root.classList.add(mode);
  
  // Update color-scheme for better browser integration
  root.style.colorScheme = mode;
  
  // Set CSS variable for color-scheme to be used in CSS
  root.style.setProperty('--color-scheme', mode);
}

// Helper function to get system theme preference
export function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// Helper function to format color values consistently
export function formatColorValue(value: string): string {
  // Already formatted color functions
  if (value.includes('oklch(') || value.includes('hsl(') || value.includes('rgb(')) {
    return value;
  }
  
  // Handle OKLCH values that need wrapping
  if (value.includes('oklch') && !value.includes('oklch(')) {
    return value; // Keep as-is for now, may need oklch() wrapper in future
  }
  
  // Handle HSL values - most common case
  if (value.match(/^\s*\d+(\.\d+)?\s+\d+(\.\d+)?%\s+\d+(\.\d+)?%\s*$/)) {
    return `hsl(${value})`;
  }
  
  // Handle HSL with alpha
  if (value.match(/^\s*\d+(\.\d+)?\s+\d+(\.\d+)?%\s+\d+(\.\d+)?%\s*\/\s*\d+(\.\d+)?%?\s*$/)) {
    return `hsl(${value})`;
  }
  
  // Fallback - assume it's HSL format
  return `hsl(${value})`;
}

// Theme persistence utilities
export function saveThemePreferences(theme: string, mode: "light" | "dark" | "system") {
  try {
    const preferences = {
      theme,
      mode,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('theme-preferences', JSON.stringify(preferences));
  } catch (error) {
    console.warn('Failed to save theme preferences:', error);
  }
}

export function loadThemePreferences(): { theme: string; mode: "light" | "dark" | "system" } | null {
  try {
    const stored = localStorage.getItem('theme-preferences');
    if (stored) {
      const preferences = JSON.parse(stored);
      return {
        theme: preferences.theme || 'rose',
        mode: preferences.mode || 'system'
      };
    }
  } catch (error) {
    console.warn('Failed to load theme preferences:', error);
  }
  return null;
}

// Advanced theme application with transition support
export function applyThemeWithTransition(theme: ShadcnTheme, mode: "light" | "dark", enableTransition = true) {
  const root = document.documentElement;
  
  if (enableTransition) {
    // Add transition class temporarily
    root.classList.add('theme-transitioning');
  }
  
  // Apply the theme
  applyTheme(theme, mode);
  
  // Save preferences
  saveThemePreferences(theme.value, mode);
  
  if (enableTransition) {
    // Remove transition class after animation
    setTimeout(() => {
      root.classList.remove('theme-transitioning');
    }, 300);
  }
}