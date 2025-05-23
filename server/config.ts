import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

interface SiteConfig {
  title: string;
  description: string;
  url: string;
  author: string;
}

interface SourceConfig {
  url: string;
  refresh_interval: number;
  additional_lists: Array<{
    name: string;
    url: string;
    category: string;
    icon: string;
  }>;
}

interface ThemeConfig {
  default: string;
  primary_color: string;
  custom_themes: Array<{
    name: string;
    primary: string;
    secondary: string;
    background: string;
  }>;
}

interface AnalyticsConfig {
  google_analytics: string;
  events: string[];
  anonymize_ip: boolean;
  cookie_consent: boolean;
}

interface FeaturesConfig {
  search: boolean;
  categories: boolean;
  analytics_dashboard: boolean;
  theme_switcher: boolean;
  list_switcher: boolean;
  resource_previews: boolean;
  ai_tags: boolean;
  ai_descriptions: boolean;
}

interface AwesomeListConfig {
  site: SiteConfig;
  source: SourceConfig;
  theme: ThemeConfig;
  analytics: AnalyticsConfig;
  features: FeaturesConfig;
  build: any;
  deploy: any;
  seo: any;
  performance: any;
}

// Default configuration
const defaultConfig: AwesomeListConfig = {
  site: {
    title: process.env.VITE_SITE_TITLE || "Awesome List",
    description: process.env.VITE_SITE_DESCRIPTION || "A curated list of awesome resources",
    url: process.env.VITE_SITE_URL || "http://localhost:5000",
    author: "Awesome List Community"
  },
  source: {
    url: process.env.AWESOME_RAW_URL || "https://raw.githubusercontent.com/awesome-selfhosted/awesome-selfhosted/master/README.md",
    refresh_interval: 60,
    additional_lists: []
  },
  theme: {
    default: process.env.VITE_DEFAULT_THEME || "auto",
    primary_color: "#dc2626",
    custom_themes: []
  },
  analytics: {
    google_analytics: process.env.VITE_GA_MEASUREMENT_ID || "",
    events: ["resource_clicks", "category_views", "search_queries"],
    anonymize_ip: true,
    cookie_consent: true
  },
  features: {
    search: true,
    categories: true,
    analytics_dashboard: true,
    theme_switcher: true,
    list_switcher: true,
    resource_previews: true,
    ai_tags: !!process.env.OPENAI_API_KEY,
    ai_descriptions: !!process.env.OPENAI_API_KEY
  },
  build: {},
  deploy: {},
  seo: {},
  performance: {}
};

function loadConfig(): AwesomeListConfig {
  const configPath = path.join(process.cwd(), 'awesome-list.config.yaml');
  
  try {
    if (fs.existsSync(configPath)) {
      const configFile = fs.readFileSync(configPath, 'utf8');
      const yamlConfig = yaml.load(configFile) as Partial<AwesomeListConfig>;
      
      // Merge with defaults, environment variables take precedence
      return {
        ...defaultConfig,
        ...yamlConfig,
        site: { ...defaultConfig.site, ...yamlConfig.site },
        source: { ...defaultConfig.source, ...yamlConfig.source },
        theme: { ...defaultConfig.theme, ...yamlConfig.theme },
        analytics: { ...defaultConfig.analytics, ...yamlConfig.analytics },
        features: { ...defaultConfig.features, ...yamlConfig.features }
      };
    }
  } catch (error) {
    console.warn('Could not load config file, using defaults:', error);
  }
  
  return defaultConfig;
}

export const config = loadConfig();
export type { AwesomeListConfig, SiteConfig, SourceConfig, ThemeConfig, AnalyticsConfig, FeaturesConfig };