import { Database } from "lucide-react";
import { getCategoryIcon } from "@/config/navigation-icons";
import { createElement } from "react";
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
  description: (items, navTree) =>
    `${navTree?.categories.length ?? items?.length ?? 0} top-level domains`,
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
      key: "icon",
      label: "Icon",
      width: "w-20",
      className: "admin-taxonomy-column-icon",
      render: (item: CategoryWithCount) => {
        const CategoryIcon = getCategoryIcon(item.name);
        return createElement(CategoryIcon, {
          "aria-hidden": true,
          className: "admin-taxonomy-category-icon h-4 w-4",
        });
      }
    },
    {
      key: "name",
      label: "Name",
      className: "admin-taxonomy-column-name"
    },
    {
      key: "slug",
      label: "Slug",
      className: "admin-taxonomy-column-slug"
    },
    {
      key: "resourceCount",
      label: "Resources",
      align: "center" as const,
      className: "admin-taxonomy-column-count w-32"
    },
    {
      key: "subcategories",
      label: "Subcategories",
      align: "left" as const,
      className: "admin-taxonomy-column-subcategories",
      render: (item: CategoryWithCount, _parentData, navTree) => {
        const category = navTree?.categories.find(
          (node) => node.slug === item.slug || node.name === item.name,
        );
        return category ? (category.subcategories?.length ?? 0) : "—";
      }
    },
    {
      key: "actions",
      label: "",
      align: "right" as const,
      width: "w-32",
      className: "admin-taxonomy-column-actions"
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
