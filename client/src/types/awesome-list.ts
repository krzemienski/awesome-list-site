import type { ResourceKind } from "@shared/resourceKinds";

export interface Resource {
  id: string;
  title: string;
  url: string;
  description: string;
  category: string;
  subcategory?: string;
  subSubcategory?: string;
  resourceFormat?: string;
  provider?: string;
  skillLevel?: string;
  tags?: string[];
  status?: string;
  /** Stored kind column (admin-editable); null when the admin never set one. */
  kind?: ResourceKind | null;
  /**
   * Read-time resolution the server applies to every public resource:
   * stored kind → tag/category inference → "other". This is the value UI
   * surfaces (kind strip, badges) must render; `kind` alone is incomplete.
   */
  resolvedKind?: ResourceKind;
  submittedBy?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  githubSynced?: boolean;
  lastSyncedAt?: string | null;
  metadata?: {
    tags?: string[];
    sourceCategories?: string[];
    aiEnriched?: boolean;
    [key: string]: unknown;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface SubSubcategory {
  name: string;
  slug: string;
  resources: Resource[];
}

export interface Subcategory {
  name: string;
  slug: string;
  resources: Resource[];
  subSubcategories?: SubSubcategory[];
}

export interface Category {
  name: string;
  slug: string;
  resources: Resource[];
  subcategories: Subcategory[];
}

export interface AwesomeList {
  title: string;
  description: string;
  repoUrl: string;
  resources: Resource[];
  categories: Category[];
}
