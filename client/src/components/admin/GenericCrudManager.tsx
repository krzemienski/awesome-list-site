import { useState, useMemo, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Save, X, LucideIcon } from "lucide-react";

/**
 * Base entity interface that all managed entities must extend.
 *
 * @property {number} id - Unique identifier for the entity
 * @property {string} name - Display name of the entity
 * @property {string} slug - URL-friendly identifier for the entity
 * @property {number} resourceCount - Number of resources associated with this entity (used to prevent deletion)
 *
 * @example
 * ```typescript
 * interface Category extends BaseEntityWithCount {
 *   platformId: number;
 *   description?: string;
 * }
 * ```
 */
export interface BaseEntityWithCount {
  id: number;
  name: string;
  slug: string;
  resourceCount: number;
  [key: string]: any;
}

/**
 * Configuration for parent entity relationships.
 * Supports hierarchical relationships (e.g., Platform -> Category -> Subcategory).
 *
 * @property {string} fieldName - The field name in the entity (e.g., 'platformId', 'categoryId')
 * @property {string} label - Display label for the form field (e.g., 'Platform *', 'Category *')
 * @property {string} queryKey - React Query key for fetching parent entities
 * @property {string} fetchUrl - API endpoint to fetch parent entities
 * @property {string} [filterBy] - Field name to filter by (enables cascading dropdowns, e.g., 'platformId')
 * @property {Function} [getNameFn] - Custom function to get the display name of a parent entity
 *
 * @example
 * ```typescript
 * // Simple parent (no filtering)
 * const platformConfig: ParentConfig = {
 *   fieldName: 'platformId',
 *   label: 'Platform *',
 *   queryKey: 'admin-platforms',
 *   fetchUrl: '/api/admin/platforms'
 * };
 *
 * // Cascading parent (filtered by platformId)
 * const categoryConfig: ParentConfig = {
 *   fieldName: 'categoryId',
 *   label: 'Category *',
 *   queryKey: 'admin-categories',
 *   fetchUrl: '/api/admin/categories',
 *   filterBy: 'platformId' // Only show categories for selected platform
 * };
 * ```
 */
export interface ParentConfig {
  fieldName: string;
  label: string;
  queryKey: string;
  fetchUrl: string;
  filterBy?: string;
  getNameFn?: (id: number, parentData?: BaseEntityWithCount[]) => string;
}

/**
 * Configuration for table columns.
 *
 * @property {string} key - The data key to display (e.g., 'id', 'name', 'slug', 'resourceCount', 'actions')
 * @property {string} label - Column header label
 * @property {string} [width] - CSS width class (e.g., 'w-[100px]')
 * @property {"left" | "center" | "right"} [align] - Text alignment in the column
 * @property {string} [className] - Additional CSS classes for the column cells
 * @property {Function} [render] - Custom render function for the column content
 *
 * @remarks
 * Built-in rendering for common keys:
 * - 'id': Renders as monospace font
 * - 'name': Renders as medium-weight font
 * - 'slug': Renders as monospace with muted color
 * - 'resourceCount': Renders as a badge
 * - 'actions': Renders edit and delete buttons
 *
 * @example
 * ```typescript
 * const columns: ColumnConfig[] = [
 *   { key: 'id', label: 'ID', width: 'w-[100px]' },
 *   { key: 'name', label: 'Name' },
 *   {
 *     key: 'platform',
 *     label: 'Platform',
 *     render: (item, parentData) => {
 *       const platform = parentData?.platformId?.find(p => p.id === item.platformId);
 *       return platform?.name || '-';
 *     }
 *   },
 *   { key: 'actions', label: 'Actions', align: 'right', width: 'w-[100px]' }
 * ];
 * ```
 */
export interface ColumnConfig {
  key: string;
  label: string;
  width?: string;
  align?: "left" | "center" | "right";
  className?: string;
  render?: (item: BaseEntityWithCount, parentData?: Record<string, BaseEntityWithCount[]>) => ReactNode;
}

/**
 * Props for the GenericCrudManager component.
 *
 * @template T - The entity type that extends BaseEntityWithCount
 *
 * @property {string} entityName - Singular entity name (e.g., 'Category')
 * @property {string} entityNamePlural - Plural entity name (e.g., 'Categories')
 * @property {LucideIcon} icon - Icon component from lucide-react
 * @property {string} description - Description text shown in the card header
 * @property {string} fetchUrl - API endpoint to fetch all entities
 * @property {string} createUrl - API endpoint to create a new entity
 * @property {Function} updateUrl - Function that returns the API endpoint for updating an entity
 * @property {Function} deleteUrl - Function that returns the API endpoint for deleting an entity
 * @property {string} queryKey - React Query key for the main entities
 * @property {string} [publicQueryKey] - Optional React Query key for public data that should also be invalidated
 * @property {string} testIdPrefix - Prefix for the main container test ID
 * @property {string} testIdEntity - Singular entity name for test IDs (e.g., 'category')
 * @property {string} testIdEntityPlural - Plural entity name for test IDs (e.g., 'categories')
 * @property {ParentConfig[]} [parents] - Array of parent entity configurations for hierarchical relationships
 * @property {ColumnConfig[]} columns - Table column configurations
 * @property {string} createDialogTitle - Title for the create dialog
 * @property {string} createDialogDescription - Description for the create dialog
 * @property {string} editDialogTitle - Title for the edit dialog
 * @property {string} editDialogDescription - Description for the edit dialog
 * @property {Object} [formFields] - Custom labels and placeholders for form fields
 *
 * @example
 * ```typescript
 * <GenericCrudManager
 *   entityName="Category"
 *   entityNamePlural="Categories"
 *   icon={FolderTree}
 *   description="Manage content categories within each platform"
 *   fetchUrl="/api/admin/categories"
 *   createUrl="/api/admin/categories"
 *   updateUrl={(id) => `/api/admin/categories/${id}`}
 *   deleteUrl={(id) => `/api/admin/categories/${id}`}
 *   queryKey="admin-categories"
 *   publicQueryKey="categories"
 *   testIdPrefix="categories-manager"
 *   testIdEntity="category"
 *   testIdEntityPlural="categories"
 *   parents={[
 *     {
 *       fieldName: 'platformId',
 *       label: 'Platform *',
 *       queryKey: 'admin-platforms',
 *       fetchUrl: '/api/admin/platforms'
 *     }
 *   ]}
 *   columns={[
 *     { key: 'id', label: 'ID', width: 'w-[100px]' },
 *     { key: 'name', label: 'Name' },
 *     { key: 'slug', label: 'Slug' },
 *     { key: 'actions', label: 'Actions', align: 'right', width: 'w-[100px]' }
 *   ]}
 *   createDialogTitle="Create Category"
 *   createDialogDescription="Add a new category to organize resources"
 *   editDialogTitle="Edit Category"
 *   editDialogDescription="Update category details"
 * />
 * ```
 */
export interface GenericCrudManagerProps<T extends BaseEntityWithCount> {
  entityName: string;
  entityNamePlural: string;
  icon: LucideIcon;
  description: string;
  fetchUrl: string;
  createUrl: string;
  updateUrl: (id: number) => string;
  deleteUrl: (id: number) => string;
  queryKey: string;
  publicQueryKey?: string;
  testIdPrefix: string;
  testIdEntity: string;
  testIdEntityPlural: string;
  parents?: ParentConfig[];
  columns: ColumnConfig[];
  createDialogTitle: string;
  createDialogDescription: string;
  editDialogTitle: string;
  editDialogDescription: string;
  formFields?: {
    name: {
      label: string;
      placeholder: string;
    };
    slug: {
      label: string;
      placeholder: string;
      helpText?: string;
    };
  };
}

/**
 * Generic CRUD Manager Component
 *
 * A highly configurable admin component for managing entities with create, read, update, and delete operations.
 * Supports hierarchical parent-child relationships with cascading dropdowns and automatic slug generation.
 *
 * @template T - The entity type that extends BaseEntityWithCount
 *
 * ## Features
 * - Full CRUD operations (Create, Read, Update, Delete)
 * - Hierarchical parent-child relationships with cascading selection
 * - Automatic slug generation from names
 * - Resource count validation (prevents deletion of entities with resources)
 * - Optimistic UI updates with React Query
 * - Customizable table columns with render functions
 * - Test ID support for E2E testing
 * - Toast notifications for all operations
 *
 * ## Supported Field Types
 * - **name**: Text input with automatic slug generation
 * - **slug**: Text input (auto-generated but editable)
 * - **parent relationships**: Select dropdowns (supports cascading/hierarchical relationships)
 *
 * ## Parent Relationship Handling
 * The component supports multi-level hierarchical relationships (e.g., Platform -> Category -> Subcategory).
 * When a parent is selected, child dropdowns are automatically filtered and reset.
 *
 * Example hierarchy:
 * 1. Select Platform -> enables Category dropdown (filtered by platformId)
 * 2. Select Category -> enables Subcategory dropdown (filtered by categoryId)
 *
 * Configure via the `parents` prop with `filterBy` to enable cascading behavior.
 *
 * ## Customization Options
 *
 * ### Column Rendering
 * Customize how data is displayed using the `render` function in `ColumnConfig`:
 * ```typescript
 * {
 *   key: 'platform',
 *   label: 'Platform',
 *   render: (item, parentData) => {
 *     const platform = parentData?.platformId?.find(p => p.id === item.platformId);
 *     return platform?.name || '-';
 *   }
 * }
 * ```
 *
 * ### Form Fields
 * Customize labels, placeholders, and help text via the `formFields` prop:
 * ```typescript
 * formFields={{
 *   name: {
 *     label: 'Category Name *',
 *     placeholder: 'e.g., Web Development'
 *   },
 *   slug: {
 *     label: 'URL Slug *',
 *     placeholder: 'web-development',
 *     helpText: 'Used in URLs. Auto-generated but can be customized.'
 *   }
 * }}
 * ```
 *
 * ### Test IDs
 * All interactive elements have data-testid attributes for E2E testing:
 * - Container: `{testIdPrefix}`
 * - Table: `table-{testIdEntityPlural}`
 * - Create button: `button-create-{testIdEntity}`
 * - Edit button: `button-edit-{id}`
 * - Delete button: `button-delete-{id}`
 * - Dialogs: `dialog-create-{testIdEntity}`, `dialog-edit-{testIdEntity}`, `dialog-delete-{testIdEntity}`
 *
 * @param {GenericCrudManagerProps<T>} props - Component props
 * @returns {JSX.Element} The rendered CRUD manager component
 *
 * @example
 * ```typescript
 * // Simple entity without parents
 * <GenericCrudManager
 *   entityName="Platform"
 *   entityNamePlural="Platforms"
 *   icon={Layers}
 *   description="Manage platforms"
 *   fetchUrl="/api/admin/platforms"
 *   createUrl="/api/admin/platforms"
 *   updateUrl={(id) => `/api/admin/platforms/${id}`}
 *   deleteUrl={(id) => `/api/admin/platforms/${id}`}
 *   queryKey="admin-platforms"
 *   testIdPrefix="platforms-manager"
 *   testIdEntity="platform"
 *   testIdEntityPlural="platforms"
 *   columns={[
 *     { key: 'id', label: 'ID', width: 'w-[100px]' },
 *     { key: 'name', label: 'Name' },
 *     { key: 'slug', label: 'Slug' },
 *     { key: 'resourceCount', label: 'Resources' },
 *     { key: 'actions', label: 'Actions', align: 'right', width: 'w-[100px]' }
 *   ]}
 *   createDialogTitle="Create Platform"
 *   createDialogDescription="Add a new platform"
 *   editDialogTitle="Edit Platform"
 *   editDialogDescription="Update platform details"
 * />
 *
 * // Entity with cascading parent relationships
 * <GenericCrudManager
 *   entityName="Subcategory"
 *   entityNamePlural="Subcategories"
 *   icon={FolderTree}
 *   description="Manage subcategories"
 *   fetchUrl="/api/admin/subcategories"
 *   createUrl="/api/admin/subcategories"
 *   updateUrl={(id) => `/api/admin/subcategories/${id}`}
 *   deleteUrl={(id) => `/api/admin/subcategories/${id}`}
 *   queryKey="admin-subcategories"
 *   testIdPrefix="subcategories-manager"
 *   testIdEntity="subcategory"
 *   testIdEntityPlural="subcategories"
 *   parents={[
 *     {
 *       fieldName: 'platformId',
 *       label: 'Platform *',
 *       queryKey: 'admin-platforms',
 *       fetchUrl: '/api/admin/platforms'
 *     },
 *     {
 *       fieldName: 'categoryId',
 *       label: 'Category *',
 *       queryKey: 'admin-categories',
 *       fetchUrl: '/api/admin/categories',
 *       filterBy: 'platformId' // Cascade: only show categories for selected platform
 *     }
 *   ]}
 *   columns={[
 *     { key: 'id', label: 'ID', width: 'w-[100px]' },
 *     {
 *       key: 'platform',
 *       label: 'Platform',
 *       render: (item, parentData) =>
 *         parentData?.platformId?.find(p => p.id === item.platformId)?.name || '-'
 *     },
 *     {
 *       key: 'category',
 *       label: 'Category',
 *       render: (item, parentData) =>
 *         parentData?.categoryId?.find(c => c.id === item.categoryId)?.name || '-'
 *     },
 *     { key: 'name', label: 'Name' },
 *     { key: 'actions', label: 'Actions', align: 'right', width: 'w-[100px]' }
 *   ]}
 *   createDialogTitle="Create Subcategory"
 *   createDialogDescription="Add a new subcategory"
 *   editDialogTitle="Edit Subcategory"
 *   editDialogDescription="Update subcategory details"
 * />
 * ```
 */
export default function GenericCrudManager<T extends BaseEntityWithCount>({
  entityName,
  entityNamePlural,
  icon: Icon,
  description,
  fetchUrl,
  createUrl,
  updateUrl,
  deleteUrl,
  queryKey,
  publicQueryKey,
  testIdPrefix,
  testIdEntity,
  testIdEntityPlural,
  parents = [],
  columns,
  createDialogTitle,
  createDialogDescription,
  editDialogTitle,
  editDialogDescription,
  formFields = {
    name: {
      label: "Name *",
      placeholder: "Enter name"
    },
    slug: {
      label: "Slug *",
      placeholder: "enter-slug",
      helpText: "Auto-generated from name. Edit if needed."
    }
  }
}: GenericCrudManagerProps<T>) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<T | null>(null);

  const initialFormData = useMemo(() => {
    const data: Record<string, string> = {
      name: "",
      slug: ""
    };
    parents.forEach(parent => {
      data[parent.fieldName] = "";
    });
    return data;
  }, [parents]);

  const [formData, setFormData] = useState<Record<string, string>>(initialFormData);

  // Fetch parent data
  const parentQueries = parents.map(parent =>
    useQuery<BaseEntityWithCount[]>({
      queryKey: [parent.queryKey],
      queryFn: async () => {
        const response = await fetch(parent.fetchUrl, {
          credentials: 'include'
        });
        if (!response.ok) throw new Error(`Failed to fetch ${parent.label.toLowerCase()}`);
        return response.json();
      }
    })
  );

  const parentData: Record<string, BaseEntityWithCount[]> = {};
  parents.forEach((parent, index) => {
    parentData[parent.fieldName] = parentQueries[index].data || [];
  });

  // Fetch main entities with resource counts
  const { data: items, isLoading } = useQuery<T[]>({
    queryKey: [queryKey],
    queryFn: async () => {
      const response = await fetch(fetchUrl, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error(`Failed to fetch ${entityNamePlural.toLowerCase()}`);
      return response.json();
    }
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      return await apiRequest(createUrl, {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      if (publicQueryKey) {
        queryClient.invalidateQueries({ queryKey: [publicQueryKey] });
      }
      toast({
        title: "Success",
        description: `${entityName} created successfully`
      });
      setCreateDialogOpen(false);
      setFormData(initialFormData);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to create ${entityName.toLowerCase()}`,
        variant: "destructive"
      });
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, any> }) => {
      return await apiRequest(updateUrl(id), {
        method: 'PATCH',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      if (publicQueryKey) {
        queryClient.invalidateQueries({ queryKey: [publicQueryKey] });
      }
      toast({
        title: "Success",
        description: `${entityName} updated successfully`
      });
      setEditDialogOpen(false);
      setSelectedItem(null);
      setFormData(initialFormData);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to update ${entityName.toLowerCase()}`,
        variant: "destructive"
      });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(deleteUrl(id), {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      if (publicQueryKey) {
        queryClient.invalidateQueries({ queryKey: [publicQueryKey] });
      }
      toast({
        title: "Success",
        description: `${entityName} deleted successfully`
      });
      setDeleteDialogOpen(false);
      setSelectedItem(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to delete ${entityName.toLowerCase()}`,
        variant: "destructive"
      });
      setDeleteDialogOpen(false);
    }
  });

  // Filter parent options based on cascading dependencies
  const getFilteredParentOptions = (parentFieldName: string): BaseEntityWithCount[] => {
    const parent = parents.find(p => p.fieldName === parentFieldName);
    if (!parent || !parent.filterBy) {
      return parentData[parentFieldName] || [];
    }

    const filterValue = formData[parent.filterBy];
    if (!filterValue) return [];

    return (parentData[parentFieldName] || []).filter(item =>
      item[parent.filterBy!] === parseInt(filterValue)
    );
  };

  const handleCreate = () => {
    const requiredFields = ["name", "slug", ...parents.map(p => p.fieldName)];
    const missingFields = requiredFields.filter(field => !formData[field]?.trim());

    if (missingFields.length > 0) {
      const fieldLabels = missingFields.map(field => {
        if (field === "name") return "Name";
        if (field === "slug") return "Slug";
        const parent = parents.find(p => p.fieldName === field);
        return parent ? parent.label.replace(" *", "") : field;
      });

      toast({
        title: "Validation Error",
        description: `${fieldLabels.join(", ")} ${fieldLabels.length === 1 ? 'is' : 'are'} required`,
        variant: "destructive"
      });
      return;
    }

    const payload: Record<string, any> = {
      name: formData.name,
      slug: formData.slug
    };

    parents.forEach(parent => {
      payload[parent.fieldName] = parseInt(formData[parent.fieldName]);
    });

    createMutation.mutate(payload);
  };

  const handleUpdate = () => {
    if (!selectedItem) return;

    const requiredFields = ["name", "slug", ...parents.map(p => p.fieldName)];
    const missingFields = requiredFields.filter(field => !formData[field]?.trim());

    if (missingFields.length > 0) {
      const fieldLabels = missingFields.map(field => {
        if (field === "name") return "Name";
        if (field === "slug") return "Slug";
        const parent = parents.find(p => p.fieldName === field);
        return parent ? parent.label.replace(" *", "") : field;
      });

      toast({
        title: "Validation Error",
        description: `${fieldLabels.join(", ")} ${fieldLabels.length === 1 ? 'is' : 'are'} required`,
        variant: "destructive"
      });
      return;
    }

    const payload: Record<string, any> = {
      name: formData.name,
      slug: formData.slug
    };

    parents.forEach(parent => {
      payload[parent.fieldName] = parseInt(formData[parent.fieldName]);
    });

    updateMutation.mutate({
      id: selectedItem.id,
      data: payload
    });
  };

  const handleDelete = () => {
    if (!selectedItem) return;
    deleteMutation.mutate(selectedItem.id);
  };

  const openCreateDialog = () => {
    setFormData(initialFormData);
    setCreateDialogOpen(true);
  };

  const openEditDialog = (item: T) => {
    setSelectedItem(item);
    const newFormData: Record<string, string> = {
      name: item.name,
      slug: item.slug
    };

    parents.forEach((parent, index) => {
      newFormData[parent.fieldName] = item[parent.fieldName]?.toString() || "";

      if (parent.filterBy && index > 0) {
        const parentItem = parentData[parents[index - 1].fieldName]?.find(
          p => p.id === item[parents[index - 1].fieldName]
        );
        if (parentItem) {
          newFormData[parent.filterBy] = parentItem[parent.filterBy]?.toString() || "";
        }
      }
    });

    setFormData(newFormData);
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (item: T) => {
    setSelectedItem(item);
    setDeleteDialogOpen(true);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleNameChange = (name: string) => {
    setFormData({ ...formData, name, slug: generateSlug(name) });
  };

  const handleParentChange = (parentFieldName: string, value: string) => {
    const newFormData = { ...formData, [parentFieldName]: value };

    const parentIndex = parents.findIndex(p => p.fieldName === parentFieldName);
    if (parentIndex >= 0 && parentIndex < parents.length - 1) {
      parents.slice(parentIndex + 1).forEach(childParent => {
        newFormData[childParent.fieldName] = "";
      });
    }

    setFormData(newFormData);
  };

  return (
    <Card className="border-0" data-testid={testIdPrefix}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Icon className="h-5 w-5" />
              {entityNamePlural} Manager
            </CardTitle>
            <CardDescription>
              {description}
            </CardDescription>
          </div>
          <Button
            onClick={openCreateDialog}
            data-testid={`button-create-${testIdEntity}`}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add {entityName}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <Table data-testid={`table-${testIdEntityPlural}`}>
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHead
                    key={col.key}
                    className={col.width ? col.width : col.align === "right" ? "text-right" : ""}
                  >
                    {col.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items?.map((item) => (
                <TableRow key={item.id} data-testid={`row-${testIdEntity}-${item.id}`}>
                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      className={`${col.className || ""} ${col.align === "right" ? "text-right" : ""}`}
                      data-testid={col.key === "name" ? `text-${testIdEntity}-name-${item.id}` : undefined}
                    >
                      {col.render ? col.render(item, parentData) : (
                        col.key === "id" ? (
                          <span className="font-mono text-sm">{item.id}</span>
                        ) : col.key === "name" ? (
                          <span className="font-medium">{item.name}</span>
                        ) : col.key === "slug" ? (
                          <span className="font-mono text-sm text-muted-foreground">{item.slug}</span>
                        ) : col.key === "resourceCount" ? (
                          <Badge variant="secondary" data-testid={`badge-count-${item.id}`}>
                            {item.resourceCount}
                          </Badge>
                        ) : col.key === "actions" ? (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(item)}
                              data-testid={`button-edit-${item.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteDialog(item)}
                              disabled={item.resourceCount > 0}
                              data-testid={`button-delete-${item.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          item[col.key]
                        )
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent data-testid={`dialog-create-${testIdEntity}`}>
          <DialogHeader>
            <DialogTitle>{createDialogTitle}</DialogTitle>
            <DialogDescription>
              {createDialogDescription}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {parents.map((parent, index) => {
              const options = getFilteredParentOptions(parent.fieldName);
              const isDisabled = parent.filterBy && !formData[parent.filterBy];

              return (
                <div key={parent.fieldName} className="space-y-2">
                  <Label htmlFor={`create-${parent.fieldName}`}>{parent.label}</Label>
                  <Select
                    value={formData[parent.fieldName]}
                    onValueChange={(value) => handleParentChange(parent.fieldName, value)}
                    disabled={isDisabled}
                  >
                    <SelectTrigger
                      id={`create-${parent.fieldName}`}
                      data-testid={`select-create-${parent.fieldName.replace(/([A-Z])/g, '-$1').toLowerCase()}`}
                    >
                      <SelectValue placeholder={`Select ${parent.label.toLowerCase().replace(' *', '')}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {options.map((option) => (
                        <SelectItem key={option.id} value={option.id.toString()}>
                          {option.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
            <div className="space-y-2">
              <Label htmlFor="create-name">{formFields.name.label}</Label>
              <Input
                id="create-name"
                placeholder={formFields.name.placeholder}
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                data-testid="input-create-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-slug">{formFields.slug.label}</Label>
              <Input
                id="create-slug"
                placeholder={formFields.slug.placeholder}
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                data-testid="input-create-slug"
              />
              {formFields.slug.helpText && (
                <p className="text-xs text-muted-foreground">
                  {formFields.slug.helpText}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              data-testid="button-cancel-create"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              data-testid="button-confirm-create"
            >
              <Save className="h-4 w-4 mr-2" />
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent data-testid={`dialog-edit-${testIdEntity}`}>
          <DialogHeader>
            <DialogTitle>{editDialogTitle}</DialogTitle>
            <DialogDescription>
              {editDialogDescription}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {parents.map((parent, index) => {
              const options = getFilteredParentOptions(parent.fieldName);
              const isDisabled = parent.filterBy && !formData[parent.filterBy];

              return (
                <div key={parent.fieldName} className="space-y-2">
                  <Label htmlFor={`edit-${parent.fieldName}`}>{parent.label}</Label>
                  <Select
                    value={formData[parent.fieldName]}
                    onValueChange={(value) => handleParentChange(parent.fieldName, value)}
                    disabled={isDisabled}
                  >
                    <SelectTrigger
                      id={`edit-${parent.fieldName}`}
                      data-testid={`select-edit-${parent.fieldName.replace(/([A-Z])/g, '-$1').toLowerCase()}`}
                    >
                      <SelectValue placeholder={`Select ${parent.label.toLowerCase().replace(' *', '')}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {options.map((option) => (
                        <SelectItem key={option.id} value={option.id.toString()}>
                          {option.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
            <div className="space-y-2">
              <Label htmlFor="edit-name">{formFields.name.label}</Label>
              <Input
                id="edit-name"
                placeholder={formFields.name.placeholder}
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                data-testid="input-edit-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-slug">{formFields.slug.label}</Label>
              <Input
                id="edit-slug"
                placeholder={formFields.slug.placeholder}
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                data-testid="input-edit-slug"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              data-testid="button-cancel-edit"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={updateMutation.isPending}
              data-testid="button-confirm-edit"
            >
              <Save className="h-4 w-4 mr-2" />
              {updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-testid={`dialog-delete-${testIdEntity}`}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {entityName}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedItem?.name}"?
              {selectedItem && selectedItem.resourceCount > 0 && (
                <span className="block mt-2 text-red-500 font-semibold">
                  This {entityName.toLowerCase()} has {selectedItem.resourceCount} resources and cannot be deleted.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending || (selectedItem?.resourceCount ?? 0) > 0}
              className="bg-destructive hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
