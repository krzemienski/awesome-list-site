export interface Resource {
  id: string;
  title: string;
  url: string;
  description: string;
  category: string;
  subcategory?: string;
  subSubcategory?: string;
  tags?: string[];
  status?: string;
  submittedBy?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  githubSynced?: boolean;
  lastSyncedAt?: string | null;
  metadata?: {
    tags?: string[];
    sourceCategories?: string[];
    aiEnriched?: boolean;
    [key: string]: any;
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
