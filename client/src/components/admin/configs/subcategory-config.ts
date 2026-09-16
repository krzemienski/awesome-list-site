import { Layers, Badge } from "lucide-react";
import { GenericCrudManagerProps, BaseEntityWithCount } from "../GenericCrudManager";

interface SubcategoryWithCount extends BaseEntityWithCount {
  id: number;
  name: string;
  slug: string;
  categoryId: number;
  resourceCount: number;
}

export const subcategoryConfig: GenericCrudManagerProps<SubcategoryWithCount> = {
  entityName: "Subcategory",
  entityNamePlural: "Subcategories",
  icon: Layers,
  description: (items) =>
    `${items?.length ?? 0} second-level groupings`,
  fetchUrl: "/api/admin/subcategories",
  createUrl: "/api/admin/subcategories",
  updateUrl: (id: number) => `/api/admin/subcategories/${id}`,
  deleteUrl: (id: number) => `/api/admin/subcategories/${id}`,
  queryKey: "/api/admin/subcategories",
  publicQueryKey: "/api/subcategories",
  testIdPrefix: "subcategory-manager",
  testIdEntity: "subcategory",
  testIdEntityPlural: "subcategories",
  searchEnabled: false,
  itemsPerPage: 24,
  pageSizeOptions: [24],
  navigationOrder: "subcategories",
  parents: [
    {
      fieldName: "categoryId",
      label: "Parent Category *",
      queryKey: "/api/admin/categories",
      fetchUrl: "/api/admin/categories"
    }
  ],
  columns: [
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
      key: "category",
      label: "Parent",
      className: "admin-taxonomy-column-parent",
      render: (item: SubcategoryWithCount, parentData) => {
        const category = parentData?.categoryId?.find((c: BaseEntityWithCount) => c.id === item.categoryId);
        return category ? category.name : `ID: ${item.categoryId}`;
      }
    },
    {
      key: "resourceCount",
      label: "Resources",
      align: "center" as const,
      className: "admin-taxonomy-column-count w-32"
    },
    {
      key: "actions",
      label: "",
      align: "right" as const,
      width: "w-32",
      className: "admin-taxonomy-column-actions"
    }
  ],
  createDialogTitle: "Create Subcategory",
  createDialogDescription: "Add a new subcategory under a parent category.",
  editDialogTitle: "Edit Subcategory",
  editDialogDescription: "Update the subcategory details.",
  formFields: {
    name: {
      label: "Name *",
      placeholder: "Enter subcategory name"
    },
    slug: {
      label: "Slug *",
      placeholder: "subcategory-slug",
      helpText: "Auto-generated from name. Edit if needed."
    }
  }
};
