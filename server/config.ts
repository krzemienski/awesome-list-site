import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import type { ResourceKindTagMappings } from '@shared/resourceKinds';

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
  pagination: boolean;
  items_per_page: number;
  page_size_options: number[];
  default_layout: "cards" | "list" | "compact";
  allow_layout_switching: boolean;
  ai_tags: boolean;
  ai_descriptions: boolean;
}

/**
 * Design-parity resource kinds. The stored `resources.kind` always wins; when
 * it is null, shared/resourceKinds.ts resolves a kind at read time from these
 * tag mappings (merged with its generic defaults), then from these category
 * mappings (taxonomy names → kind, no generic defaults), falling back to
 * "other".
 */
interface ResourceKindsConfig {
  tag_mappings: ResourceKindTagMappings;
  category_mappings: ResourceKindTagMappings;
}

/**
 * Contact destinations for the five default-off contact variants.
 *
 * `enabled` is the master switch for the in-app form endpoint
 * (POST /api/contact). It is intentionally NOT read from the YAML file: the
 * only way to turn it on is the CONTACT_ENABLED=true environment variable, so
 * a checked-in config can never enable it by accident.
 */
interface ContactConfig {
  enabled: boolean;
  /** mailto: destination; empty means "no email destination". */
  email: string;
  /** https: issue tracker; empty means derive from source.url when possible. */
  issues_url: string;
  /** https: discussions destination; only used when discussions_verified is true. */
  discussions_url: string;
  discussions_verified: boolean;
  /** Days a contact submission is kept before the retention purge deletes it. */
  retention_days: number;
  /**
   * HMAC key for the stored sender-IP hash (CONTACT_IP_HASH_SECRET, env-only,
   * at least 16 characters). Empty means "not configured": the submission
   * endpoint then answers 503 rather than storing a raw or unkeyed address.
   */
  ip_hash_secret: string;
}

export const CONTACT_IP_HASH_SECRET_MIN_LENGTH = 16;

interface AwesomeListConfig {
  site: SiteConfig;
  source: SourceConfig;
  theme: ThemeConfig;
  analytics: AnalyticsConfig;
  features: FeaturesConfig;
  build: Record<string, unknown>;
  deploy: Record<string, unknown>;
  seo: Record<string, unknown>;
  performance: Record<string, unknown>;
  resource_kinds: ResourceKindsConfig;
  contact: ContactConfig;
}

/**
 * process.env (or a test double with the same shape). The contact block reads
 * CONTACT_ENABLED, CONTACT_EMAIL, CONTACT_ISSUES_URL, CONTACT_DISCUSSIONS_URL,
 * CONTACT_DISCUSSIONS_VERIFIED and CONTACT_IP_HASH_SECRET.
 */
type ContactEnv = Readonly<Record<string, string | undefined>>;

const CONTACT_DEFAULTS: Omit<ContactConfig, "enabled" | "ip_hash_secret"> = {
  email: "",
  issues_url: "",
  discussions_url: "",
  discussions_verified: false,
  retention_days: 180
};

/** An env var counts as set only when it carries a non-blank value, so a blank `.env` line cannot erase a YAML value. */
function envValue(value: string | undefined): string | undefined {
  return value !== undefined && value.trim() !== "" ? value.trim() : undefined;
}

/**
 * Resolve the contact block. Precedence for every destination field is
 * environment variable, then the YAML block, then the built-in default —
 * env must win even though the YAML file is merged last, because the
 * checked-in YAML ships blank values. `enabled` and `ip_hash_secret` are
 * environment-only (see ContactConfig) and never fall back to YAML: a secret
 * must not live in a committed file, and a too-short one counts as absent so
 * the endpoint fails closed instead of hashing with a guessable key.
 */
export function resolveContactConfig(
  yamlContact: Partial<ContactConfig> | null | undefined,
  env: ContactEnv
): ContactConfig {
  const yamlString = (value: unknown, fallback: string): string =>
    typeof value === "string" ? value : fallback;
  const email = envValue(env.CONTACT_EMAIL);
  const issuesUrl = envValue(env.CONTACT_ISSUES_URL);
  const discussionsUrl = envValue(env.CONTACT_DISCUSSIONS_URL);
  const discussionsVerified = envValue(env.CONTACT_DISCUSSIONS_VERIFIED);
  const retentionDays = yamlContact?.retention_days;
  const ipHashSecret = envValue(env.CONTACT_IP_HASH_SECRET) ?? "";

  return {
    enabled: env.CONTACT_ENABLED === "true",
    ip_hash_secret: ipHashSecret.length >= CONTACT_IP_HASH_SECRET_MIN_LENGTH ? ipHashSecret : "",
    email: email ?? yamlString(yamlContact?.email, CONTACT_DEFAULTS.email),
    issues_url: issuesUrl ?? yamlString(yamlContact?.issues_url, CONTACT_DEFAULTS.issues_url),
    discussions_url: discussionsUrl ?? yamlString(yamlContact?.discussions_url, CONTACT_DEFAULTS.discussions_url),
    discussions_verified: discussionsVerified !== undefined
      ? discussionsVerified === "true"
      : yamlContact?.discussions_verified === true,
    retention_days: typeof retentionDays === "number" && Number.isFinite(retentionDays) && retentionDays > 0
      ? retentionDays
      : CONTACT_DEFAULTS.retention_days
  };
}

// Default configuration
const defaultConfig: AwesomeListConfig = {
  site: {
    title: process.env.VITE_SITE_TITLE || "Awesome Go",
    description: process.env.VITE_SITE_DESCRIPTION || "A curated list of awesome Go frameworks, libraries and software",
    url: process.env.VITE_SITE_URL || "http://localhost:5000",
    author: "Awesome List Community"
  },
  source: {
    url: process.env.AWESOME_RAW_URL || "https://raw.githubusercontent.com/avelino/awesome-go/main/README.md",
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
    pagination: true,
    items_per_page: 24,
    page_size_options: [12, 24, 48, 96],
    default_layout: "list",
    allow_layout_switching: true,
    ai_tags: !!process.env.OPENAI_API_KEY,
    ai_descriptions: !!process.env.OPENAI_API_KEY
  },
  build: {},
  deploy: {},
  seo: {},
  performance: {},
  resource_kinds: {
    tag_mappings: {},
    category_mappings: {}
  },
  contact: resolveContactConfig(undefined, process.env)
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
        features: { ...defaultConfig.features, ...yamlConfig.features },
        resource_kinds: {
          ...defaultConfig.resource_kinds,
          ...yamlConfig.resource_kinds,
          tag_mappings: {
            ...defaultConfig.resource_kinds.tag_mappings,
            ...yamlConfig.resource_kinds?.tag_mappings
          },
          category_mappings: {
            ...defaultConfig.resource_kinds.category_mappings,
            ...yamlConfig.resource_kinds?.category_mappings
          }
        },
        // Env overrides are applied AFTER the YAML block; see resolveContactConfig.
        contact: resolveContactConfig(yamlConfig.contact, process.env)
      };
    }
  } catch (error) {
    console.warn('Could not load config file, using defaults:', error);
  }
  
  return defaultConfig;
}

export const config = loadConfig();
export type { AwesomeListConfig, SiteConfig, SourceConfig, ThemeConfig, AnalyticsConfig, FeaturesConfig, ResourceKindsConfig, ContactConfig };
