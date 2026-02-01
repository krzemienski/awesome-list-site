import { Layers3 } from "lucide-react";
import { GenericCrudManagerProps, BaseEntityWithCount } from "../GenericCrudManager";

interface SubSubcategoryWithCount extends BaseEntityWithCount {
  id: number;
  name: string;
  slug: string;
  subcategoryId: number;
  resourceCount: number;
}

export const subSubcategoryConfig: GenericCrudManagerProps<SubSubcategoryWithCount> = {
  entityName: "Sub-Subcategory",
  entityNamePlural: "Sub-Subcategories",
  icon: Layers3,
  description: "Manage level 3 sub-subcategories. Sub-subcategories with resources cannot be deleted.",
  fetchUrl: "/api/admin/sub-subcategories",
  createUrl: "/api/admin/sub-subcategories",
  updateUrl: (id: number) => `/api/admin/sub-subcategories/${id}`,
  deleteUrl: (id: number) => `/api/admin/sub-subcategories/${id}`,
  queryKey: "/api/admin/sub-subcategories",
  publicQueryKey: "/api/sub-subcategories",
  testIdPrefix: "subsubcategory-manager",
  testIdEntity: "subsubcategory",
  testIdEntityPlural: "subsubcategories",
  parents: [
    {
      fieldName: "categoryId",
      label: "Parent Category *",
      queryKey: "/api/admin/categories",
      fetchUrl: "/api/admin/categories"
    },
    {
      fieldName: "subcategoryId",
      label: "Parent Subcategory *",
      queryKey: "/api/admin/subcategories",
      fetchUrl: "/api/admin/subcategories",
      filterBy: "categoryId"
    }
  ],
  columns: [
    {
      key: "id",
      label: "ID",
      width: "w-[50px]"
    },
    {
      key: "name",
      label: "Name"
    },
    {
      key: "category",
      label: "Parent Category",
      render: (item: SubSubcategoryWithCount, parentData) => {
        const subcategory = parentData?.subcategoryId?.find((s: any) => s.id === item.subcategoryId);
        const category = parentData?.categoryId?.find((c: BaseEntityWithCount) => c.id === subcategory?.categoryId);
        return category?.name || 'Unknown';
      }
    },
    {
      key: "subcategory",
      label: "Parent Subcategory",
      render: (item: SubSubcategoryWithCount, parentData) => {
        const subcategory = parentData?.subcategoryId?.find((s: BaseEntityWithCount) => s.id === item.subcategoryId);
        return subcategory?.name || 'Unknown';
      }
    },
    {
      key: "slug",
      label: "Slug"
    },
    {
      key: "resourceCount",
      label: "Resources",
      align: "right" as const
    },
    {
      key: "actions",
      label: "Actions",
      align: "right" as const,
      width: "w-[120px]"
    }
  ],
  createDialogTitle: "Create Sub-Subcategory",
  createDialogDescription: "Add a new sub-subcategory under a parent subcategory.",
  editDialogTitle: "Edit Sub-Subcategory",
  editDialogDescription: "Update the sub-subcategory details.",
  formFields: {
    name: {
      label: "Name *",
      placeholder: "e.g., HLS"
    },
    slug: {
      label: "Slug *",
      placeholder: "e.g., hls",
      helpText: "Auto-generated from name. Edit if needed."
    }
  }
};
