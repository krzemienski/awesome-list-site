import { Database } from "lucide-react";
import { GenericCrudManagerProps, BaseEntityWithCount } from "../GenericCrudManager";

interface CategoryWithCount extends BaseEntityWithCount {
  id: number;
  name: string;
  slug: string;
  resourceCount: number;
}

export const categoryConfig: GenericCrudManagerProps<CategoryWithCount> = {
  entityName: "Category",
  entityNamePlural: "Categories",
  icon: Database,
  description: "Manage top-level categories for organizing resources",
  fetchUrl: "/api/admin/categories",
  createUrl: "/api/admin/categories",
  updateUrl: (id: number) => `/api/admin/categories/${id}`,
  deleteUrl: (id: number) => `/api/admin/categories/${id}`,
  queryKey: "/api/admin/categories",
  publicQueryKey: "/api/categories",
  testIdPrefix: "category-manager",
  testIdEntity: "category",
  testIdEntityPlural: "categories",
  parents: [],
  columns: [
    {
      key: "id",
      label: "ID",
      width: "w-20"
    },
    {
      key: "name",
      label: "Name"
    },
    {
      key: "slug",
      label: "Slug"
    },
    {
      key: "resourceCount",
      label: "Resources",
      align: "center" as const,
      className: "w-32"
    },
    {
      key: "actions",
      label: "Actions",
      align: "right" as const,
      width: "w-32"
    }
  ],
  createDialogTitle: "Create Category",
  createDialogDescription: "Add a new category to organize your resources.",
  editDialogTitle: "Edit Category",
  editDialogDescription: "Update the category details.",
  formFields: {
    name: {
      label: "Name *",
      placeholder: "Enter category name"
    },
    slug: {
      label: "Slug *",
      placeholder: "category-slug",
      helpText: "Auto-generated from name. Edit if needed."
    }
  }
};
