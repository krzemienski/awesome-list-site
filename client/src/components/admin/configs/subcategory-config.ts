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
  description: "Manage subcategories within each category",
  fetchUrl: "/api/admin/subcategories",
  createUrl: "/api/admin/subcategories",
  updateUrl: (id: number) => `/api/admin/subcategories/${id}`,
  deleteUrl: (id: number) => `/api/admin/subcategories/${id}`,
  queryKey: "/api/admin/subcategories",
  publicQueryKey: "/api/subcategories",
  testIdPrefix: "subcategory-manager",
  testIdEntity: "subcategory",
  testIdEntityPlural: "subcategories",
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
      key: "category",
      label: "Category",
      render: (item: SubcategoryWithCount, parentData) => {
        const category = parentData?.categoryId?.find((c: BaseEntityWithCount) => c.id === item.categoryId);
        return category ? category.name : `ID: ${item.categoryId}`;
      }
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
