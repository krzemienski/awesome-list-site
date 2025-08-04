export interface Resource {
  id: string;
  title: string;
  url: string;
  description: string;
  category: string;
  subcategory?: string;
  tags?: string[];
}

export interface Subcategory {
  name: string;
  slug: string;
  resources: Resource[];
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
