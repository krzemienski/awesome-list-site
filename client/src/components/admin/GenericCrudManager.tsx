import * as React from "react";
import { useState, useMemo, ReactNode, useRef, useEffect } from "react";
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
import { Plus, Pencil, Trash2, Save, X, LucideIcon, Upload, FileIcon, XCircle, Bold, Italic, Underline, Strikethrough, Link, Heading, List, ListOrdered, Quote, Code, Check, ChevronsUpDown, Search } from "lucide-react";

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
 * Configuration for file upload fields.
 *
 * @property {string} [accept] - Accepted file types (e.g., "image/*", ".pdf,.doc")
 * @property {number} [maxSize] - Maximum file size in bytes
 * @property {boolean} [multiple] - Whether multiple files can be uploaded
 * @property {Function} [uploadHandler] - Custom upload handler that returns a URL
 * @property {"image" | "icon" | "none"} [previewType] - How to preview uploaded files
 * @property {string} [fileHelpText] - Help text about allowed file types/sizes
 *
 * @example
 * ```typescript
 * const fileConfig: FileFieldConfig = {
 *   accept: "image/*",
 *   maxSize: 5 * 1024 * 1024, // 5MB
 *   previewType: "image",
 *   fileHelpText: "PNG, JPG up to 5MB"
 * };
 * ```
 */
export interface FileFieldConfig {
  accept?: string;
  maxSize?: number;
  multiple?: boolean;
  uploadHandler?: (file: File) => Promise<string>;
  previewType?: "image" | "icon" | "none";
  fileHelpText?: string;
}

/**
 * Configuration for rich text editor fields.
 *
 * @property {number} [minHeight] - Minimum height of the editor in pixels (default: 150)
 * @property {number} [maxHeight] - Maximum height of the editor in pixels (enables scrolling)
 * @property {Array} [toolbar] - Toolbar features to enable (default: all)
 * @property {"html" | "markdown"} [outputFormat] - Output format for the content (default: "html")
 * @property {string} [placeholder] - Placeholder text for the editor
 *
 * @example
 * ```typescript
 * const richTextConfig: RichTextFieldConfig = {
 *   minHeight: 200,
 *   maxHeight: 400,
 *   toolbar: ["bold", "italic", "link", "list"],
 *   outputFormat: "html",
 *   placeholder: "Enter rich text content..."
 * };
 * ```
 */
export interface RichTextFieldConfig {
  minHeight?: number;
  maxHeight?: number;
  toolbar?: Array<"bold" | "italic" | "underline" | "strikethrough" | "link" | "heading" | "list" | "orderedList" | "quote" | "code">;
  outputFormat?: "html" | "markdown";
  placeholder?: string;
}

/**
 * Option for multi-select fields
 */
export interface MultiSelectOption {
  value: string;
  label: string;
}

/**
 * Configuration for multi-select dropdown fields.
 *
 * @property {MultiSelectOption[]} [options] - Static options for the multi-select
 * @property {string} [fetchUrl] - API endpoint to fetch options dynamically
 * @property {string} [queryKey] - React Query key for caching fetched options
 * @property {string} [valueField] - Field name for the option value (default: "id")
 * @property {string} [labelField] - Field name for the option label (default: "name")
 * @property {string} [placeholder] - Placeholder text when no items selected
 * @property {number} [maxItems] - Maximum number of items that can be selected
 * @property {number} [minItems] - Minimum number of items that must be selected
 * @property {boolean} [searchable] - Whether to allow searching/filtering options
 * @property {"array" | "csv"} [outputFormat] - Output format (default: "array")
 *
 * @example
 * ```typescript
 * // Static options
 * const tagsConfig: MultiSelectFieldConfig = {
 *   options: [
 *     { value: "frontend", label: "Frontend" },
 *     { value: "backend", label: "Backend" },
 *     { value: "devops", label: "DevOps" }
 *   ],
 *   placeholder: "Select tags...",
 *   maxItems: 5
 * };
 *
 * // Dynamic options from API
 * const categoriesConfig: MultiSelectFieldConfig = {
 *   fetchUrl: "/api/tags",
 *   queryKey: "tags",
 *   valueField: "id",
 *   labelField: "name",
 *   searchable: true
 * };
 * ```
 */
export interface MultiSelectFieldConfig {
  options?: MultiSelectOption[];
  fetchUrl?: string;
  queryKey?: string;
  valueField?: string;
  labelField?: string;
  placeholder?: string;
  maxItems?: number;
  minItems?: number;
  searchable?: boolean;
  outputFormat?: "array" | "csv";
}

/**
 * Default toolbar configuration for rich text editor
 */
const DEFAULT_TOOLBAR: RichTextFieldConfig["toolbar"] = [
  "bold", "italic", "underline", "strikethrough", "link", "heading", "list", "orderedList", "quote", "code"
];

/**
 * Toolbar button configuration mapping
 */
const TOOLBAR_BUTTONS: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string; command: string; value?: string }> = {
  bold: { icon: Bold, label: "Bold", command: "bold" },
  italic: { icon: Italic, label: "Italic", command: "italic" },
  underline: { icon: Underline, label: "Underline", command: "underline" },
  strikethrough: { icon: Strikethrough, label: "Strikethrough", command: "strikeThrough" },
  link: { icon: Link, label: "Link", command: "createLink" },
  heading: { icon: Heading, label: "Heading", command: "formatBlock", value: "h3" },
  list: { icon: List, label: "Bullet List", command: "insertUnorderedList" },
  orderedList: { icon: ListOrdered, label: "Numbered List", command: "insertOrderedList" },
  quote: { icon: Quote, label: "Quote", command: "formatBlock", value: "blockquote" },
  code: { icon: Code, label: "Code", command: "formatBlock", value: "pre" },
};

/**
 * Rich Text Editor Component
 *
 * A simple contentEditable-based rich text editor with toolbar support.
 * Uses execCommand for formatting (works in all modern browsers).
 */
interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  config?: RichTextFieldConfig;
  id?: string;
  "data-testid"?: string;
}

function RichTextEditor({ value, onChange, config, id, "data-testid": testId }: RichTextEditorProps) {
  const editorRef = React.useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = React.useState(false);

  const toolbar = config?.toolbar || DEFAULT_TOOLBAR;
  const minHeight = config?.minHeight || 150;
  const maxHeight = config?.maxHeight;
  const placeholder = config?.placeholder || "Enter content...";

  // Initialize editor content
  React.useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const handleCommand = (command: string, value?: string) => {
    if (command === "createLink") {
      const url = prompt("Enter URL:");
      if (url) {
        document.execCommand(command, false, url);
      }
    } else if (value) {
      document.execCommand(command, false, value);
    } else {
      document.execCommand(command, false);
    }
    // Update the value after command execution
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
    editorRef.current?.focus();
  };

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  };

  return (
    <div className="border rounded-md overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 bg-muted/50 border-b">
        {toolbar.map((tool) => {
          const buttonConfig = TOOLBAR_BUTTONS[tool];
          if (!buttonConfig) return null;
          const IconComponent = buttonConfig.icon;
          return (
            <button
              key={tool}
              type="button"
              onClick={() => handleCommand(buttonConfig.command, buttonConfig.value)}
              className="p-1.5 rounded hover:bg-muted transition-colors"
              title={buttonConfig.label}
              aria-label={buttonConfig.label}
            >
              <IconComponent className="h-4 w-4" />
            </button>
          );
        })}
      </div>
      {/* Editor */}
      <div
        ref={editorRef}
        id={id}
        data-testid={testId}
        contentEditable
        className={`px-3 py-2 outline-none prose prose-sm max-w-none ${!value && !isFocused ? "text-muted-foreground" : ""}`}
        style={{
          minHeight: `${minHeight}px`,
          maxHeight: maxHeight ? `${maxHeight}px` : undefined,
          overflowY: maxHeight ? "auto" : undefined,
        }}
        onInput={handleInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onPaste={handlePaste}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />
      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground));
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}

/**
 * Multi-Select Dropdown Component
 *
 * A combobox-style multi-select component with search support and badge display.
 * Supports both static options and dynamic options from API.
 */
interface MultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  config?: MultiSelectFieldConfig;
  id?: string;
  "data-testid"?: string;
}

function MultiSelect({ value, onChange, config, id, "data-testid": testId }: MultiSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);

  const placeholder = config?.placeholder || "Select items...";
  const maxItems = config?.maxItems;
  const searchable = config?.searchable ?? true;
  const valueField = config?.valueField || "id";
  const labelField = config?.labelField || "name";

  // Fetch dynamic options if fetchUrl is provided
  const { data: fetchedOptions } = useQuery<any[]>({
    queryKey: [config?.queryKey || config?.fetchUrl],
    queryFn: async () => {
      if (!config?.fetchUrl) return [];
      const response = await fetch(config.fetchUrl, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch options');
      return response.json();
    },
    enabled: !!config?.fetchUrl
  });

  // Combine static and fetched options
  const allOptions: MultiSelectOption[] = React.useMemo(() => {
    if (config?.options) return config.options;
    if (fetchedOptions) {
      return fetchedOptions.map(item => ({
        value: String(item[valueField]),
        label: String(item[labelField])
      }));
    }
    return [];
  }, [config?.options, fetchedOptions, valueField, labelField]);

  // Filter options based on search
  const filteredOptions = React.useMemo(() => {
    if (!searchQuery) return allOptions;
    return allOptions.filter(opt =>
      opt.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allOptions, searchQuery]);

  // Get labels for selected values
  const selectedLabels = React.useMemo(() => {
    return value.map(v => {
      const opt = allOptions.find(o => o.value === v);
      return opt?.label || v;
    });
  }, [value, allOptions]);

  // Handle clicking outside to close dropdown
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter(v => v !== optionValue));
    } else {
      if (maxItems && value.length >= maxItems) return;
      onChange([...value, optionValue]);
    }
  };

  const removeOption = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter(v => v !== optionValue));
  };

  return (
    <div ref={containerRef} className="relative" id={id} data-testid={testId}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex min-h-[40px] w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        data-testid={testId ? `${testId}-trigger` : undefined}
      >
        <div className="flex flex-wrap gap-1 flex-1">
          {value.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            selectedLabels.map((label, idx) => (
              <span
                key={value[idx]}
                className="inline-flex items-center gap-1 bg-secondary text-secondary-foreground px-2 py-0.5 rounded-md text-xs"
              >
                {label}
                <button
                  type="button"
                  onClick={(e) => removeOption(value[idx], e)}
                  className="hover:bg-secondary-foreground/20 rounded-full p-0.5"
                  data-testid={testId ? `${testId}-remove-${value[idx]}` : undefined}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))
          )}
        </div>
        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 ml-2" />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
          {searchable && (
            <div className="p-2 border-b">
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8"
                data-testid={testId ? `${testId}-search` : undefined}
              />
            </div>
          )}
          <div className="max-h-60 overflow-y-auto p-1">
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No options found.
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = value.includes(option.value);
                const isDisabled = !isSelected && maxItems && value.length >= maxItems;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => !isDisabled && toggleOption(option.value)}
                    disabled={isDisabled}
                    className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors ${
                      isSelected ? 'bg-accent' : 'hover:bg-accent/50'
                    } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    data-testid={testId ? `${testId}-option-${option.value}` : undefined}
                  >
                    <div className={`flex h-4 w-4 items-center justify-center rounded-sm border ${
                      isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-input'
                    }`}>
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                    <span>{option.label}</span>
                  </button>
                );
              })
            )}
          </div>
          {maxItems && (
            <div className="px-2 py-1.5 text-xs text-muted-foreground border-t">
              {value.length} / {maxItems} selected
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Configuration for a custom form field in the CRUD manager.
 *
 * @property {string} name - Field name (used as form data key)
 * @property {string} label - Display label for the field
 * @property {"text" | "textarea" | "number" | "file"} type - Field type
 * @property {string} [placeholder] - Placeholder text
 * @property {string} [helpText] - Help text displayed below the field
 * @property {boolean} [required] - Whether the field is required
 * @property {FileFieldConfig} [fileConfig] - Configuration for file fields
 *
 * @example
 * ```typescript
 * const avatarField: CustomFieldConfig = {
 *   name: "avatar",
 *   label: "Profile Image",
 *   type: "file",
 *   fileConfig: {
 *     accept: "image/*",
 *     maxSize: 2 * 1024 * 1024,
 *     previewType: "image"
 *   }
 * };
 * ```
 */
export interface CustomFieldConfig {
  name: string;
  label: string;
  type: "text" | "textarea" | "number" | "file" | "richtext" | "multiselect";
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  fileConfig?: FileFieldConfig;
  richTextConfig?: RichTextFieldConfig;
  multiSelectConfig?: MultiSelectFieldConfig;
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
  /** Additional custom fields (including file upload fields) */
  customFields?: CustomFieldConfig[];
  /** Whether to use FormData for submissions (required for file uploads) */
  useFormData?: boolean;
  /** Enable search/filter functionality (default: true) */
  searchEnabled?: boolean;
  /** Fields to search across (default: ['name', 'slug']) */
  searchableFields?: string[];
  /** Custom search placeholder */
  searchPlaceholder?: string;
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
  },
  customFields = [],
  useFormData = false,
  searchEnabled = true,
  searchableFields = ['name', 'slug'],
  searchPlaceholder
}: GenericCrudManagerProps<T>) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<T | null>(null);
  const [fileData, setFileData] = useState<Record<string, File | null>>({});
  const [filePreviews, setFilePreviews] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");

  // Check if we have file fields (auto-enable FormData if so)
  const hasFileFields = customFields.some(f => f.type === "file");
  const shouldUseFormData = useFormData || hasFileFields;

  const initialFormData = useMemo(() => {
    const data: Record<string, string | string[]> = {
      name: "",
      slug: ""
    };
    parents.forEach(parent => {
      data[parent.fieldName] = "";
    });
    // Initialize custom fields
    customFields.forEach(field => {
      if (field.type === "file") {
        // File fields handled separately
      } else if (field.type === "multiselect") {
        data[field.name] = [];
      } else {
        data[field.name] = "";
      }
    });
    return data;
  }, [parents, customFields]);

  const [formData, setFormData] = useState<Record<string, string | string[]>>(initialFormData);

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

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!items || !searchQuery.trim() || !searchEnabled) return items;
    const query = searchQuery.toLowerCase();
    const fieldsToSearch = searchableFields || ['name', 'slug'];
    return items.filter(item =>
      fieldsToSearch.some(field => {
        const value = item[field];
        return value && String(value).toLowerCase().includes(query);
      })
    );
  }, [items, searchQuery, searchEnabled, searchableFields]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: Record<string, any> | FormData) => {
      if (data instanceof FormData) {
        const response = await fetch(createUrl, {
          method: 'POST',
          credentials: 'include',
          body: data
        });
        if (!response.ok) {
          const error = await response.json().catch(() => ({ message: 'Request failed' }));
          throw new Error(error.message || 'Failed to create');
        }
        return response.json();
      }
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
      setFileData({});
      setFilePreviews({});
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
    mutationFn: async ({ id, data }: { id: number; data: Record<string, any> | FormData }) => {
      if (data instanceof FormData) {
        const response = await fetch(updateUrl(id), {
          method: 'PATCH',
          credentials: 'include',
          body: data
        });
        if (!response.ok) {
          const error = await response.json().catch(() => ({ message: 'Request failed' }));
          throw new Error(error.message || 'Failed to update');
        }
        return response.json();
      }
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
      setFileData({});
      setFilePreviews({});
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
    if (!filterValue || Array.isArray(filterValue)) return [];

    return (parentData[parentFieldName] || []).filter(item =>
      item[parent.filterBy!] === parseInt(filterValue as string)
    );
  };

  // Validate file size
  const validateFile = (file: File, fieldConfig: CustomFieldConfig): string | null => {
    const maxSize = fieldConfig.fileConfig?.maxSize;
    if (maxSize && file.size > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
      return `File size exceeds ${maxSizeMB}MB limit`;
    }
    return null;
  };

  // Handle file selection
  const handleFileChange = (fieldName: string, file: File | null, fieldConfig: CustomFieldConfig) => {
    if (file) {
      const error = validateFile(file, fieldConfig);
      if (error) {
        toast({
          title: "File Error",
          description: error,
          variant: "destructive"
        });
        return;
      }

      setFileData(prev => ({ ...prev, [fieldName]: file }));

      // Generate preview for images
      if (fieldConfig.fileConfig?.previewType === "image" && file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFilePreviews(prev => ({ ...prev, [fieldName]: reader.result as string }));
        };
        reader.readAsDataURL(file);
      }
    } else {
      setFileData(prev => ({ ...prev, [fieldName]: null }));
      setFilePreviews(prev => {
        const newPreviews = { ...prev };
        delete newPreviews[fieldName];
        return newPreviews;
      });
    }
  };

  // Clear file selection
  const clearFile = (fieldName: string) => {
    setFileData(prev => ({ ...prev, [fieldName]: null }));
    setFilePreviews(prev => {
      const newPreviews = { ...prev };
      delete newPreviews[fieldName];
      return newPreviews;
    });
  };

  const handleCreate = async () => {
    const requiredFields = ["name", "slug", ...parents.map(p => p.fieldName)];
    const requiredCustomFields = customFields.filter(f => f.required && f.type !== "file" && f.type !== "multiselect").map(f => f.name);
    const requiredFileFields = customFields.filter(f => f.required && f.type === "file").map(f => f.name);
    const requiredMultiSelectFields = customFields.filter(f => f.required && f.type === "multiselect").map(f => f.name);

    const missingFields = [...requiredFields, ...requiredCustomFields].filter(field => {
      const val = formData[field];
      return typeof val === "string" ? !val.trim() : false;
    });
    const missingFileFields = requiredFileFields.filter(field => !fileData[field]);
    const missingMultiSelectFields = requiredMultiSelectFields.filter(field => {
      const val = formData[field] as string[];
      return !val || val.length === 0;
    });

    if (missingFields.length > 0 || missingFileFields.length > 0 || missingMultiSelectFields.length > 0) {
      const fieldLabels = [...missingFields, ...missingFileFields, ...missingMultiSelectFields].map(field => {
        if (field === "name") return "Name";
        if (field === "slug") return "Slug";
        const parent = parents.find(p => p.fieldName === field);
        if (parent) return parent.label.replace(" *", "");
        const customField = customFields.find(f => f.name === field);
        if (customField) return customField.label.replace(" *", "");
        return field;
      });

      toast({
        title: "Validation Error",
        description: `${fieldLabels.join(", ")} ${fieldLabels.length === 1 ? 'is' : 'are'} required`,
        variant: "destructive"
      });
      return;
    }

    // Build payload (FormData if files present, otherwise JSON)
    if (shouldUseFormData && Object.values(fileData).some(f => f !== null)) {
      const formDataPayload = new FormData();
      formDataPayload.append("name", formData.name);
      formDataPayload.append("slug", formData.slug);

      parents.forEach(parent => {
        formDataPayload.append(parent.fieldName, formData[parent.fieldName]);
      });

      // Add custom fields
      customFields.forEach(field => {
        if (field.type === "file") {
          const file = fileData[field.name];
          if (file) {
            formDataPayload.append(field.name, file);
          }
        } else if (field.type === "multiselect") {
          const arr = formData[field.name] as string[];
          if (arr && arr.length > 0) {
            // For FormData, join as CSV or send as JSON array string
            formDataPayload.append(field.name,
              field.multiSelectConfig?.outputFormat === "csv"
                ? arr.join(",")
                : JSON.stringify(arr)
            );
          }
        } else if (formData[field.name]) {
          formDataPayload.append(field.name, formData[field.name] as string);
        }
      });

      createMutation.mutate(formDataPayload);
    } else {
      const payload: Record<string, any> = {
        name: formData.name,
        slug: formData.slug
      };

      parents.forEach(parent => {
        payload[parent.fieldName] = parseInt(formData[parent.fieldName]);
      });

      // Add custom fields (non-file)
      customFields.forEach(field => {
        if (field.type === "file") return;
        const value = formData[field.name];
        if (field.type === "multiselect") {
          const arr = value as string[];
          if (arr && arr.length > 0) {
            // Convert to CSV if configured, otherwise keep as array
            payload[field.name] = field.multiSelectConfig?.outputFormat === "csv"
              ? arr.join(",")
              : arr;
          }
        } else if (value) {
          payload[field.name] = field.type === "number"
            ? parseFloat(value as string)
            : value;
        }
      });

      createMutation.mutate(payload);
    }
  };

  const handleUpdate = async () => {
    if (!selectedItem) return;

    const requiredFields = ["name", "slug", ...parents.map(p => p.fieldName)];
    const requiredCustomFields = customFields.filter(f => f.required && f.type !== "file").map(f => f.name);

    const missingFields = [...requiredFields, ...requiredCustomFields].filter(field => !formData[field]?.trim());

    if (missingFields.length > 0) {
      const fieldLabels = missingFields.map(field => {
        if (field === "name") return "Name";
        if (field === "slug") return "Slug";
        const parent = parents.find(p => p.fieldName === field);
        if (parent) return parent.label.replace(" *", "");
        const customField = customFields.find(f => f.name === field);
        if (customField) return customField.label.replace(" *", "");
        return field;
      });

      toast({
        title: "Validation Error",
        description: `${fieldLabels.join(", ")} ${fieldLabels.length === 1 ? 'is' : 'are'} required`,
        variant: "destructive"
      });
      return;
    }

    // Build payload (FormData if files present, otherwise JSON)
    if (shouldUseFormData && Object.values(fileData).some(f => f !== null)) {
      const formDataPayload = new FormData();
      formDataPayload.append("name", formData.name);
      formDataPayload.append("slug", formData.slug);

      parents.forEach(parent => {
        formDataPayload.append(parent.fieldName, formData[parent.fieldName]);
      });

      // Add custom fields
      customFields.forEach(field => {
        if (field.type === "file") {
          const file = fileData[field.name];
          if (file) {
            formDataPayload.append(field.name, file);
          }
        } else if (field.type === "multiselect") {
          const arr = formData[field.name] as string[];
          if (arr && arr.length > 0) {
            // For FormData, join as CSV or send as JSON array string
            formDataPayload.append(field.name,
              field.multiSelectConfig?.outputFormat === "csv"
                ? arr.join(",")
                : JSON.stringify(arr)
            );
          }
        } else if (formData[field.name]) {
          formDataPayload.append(field.name, formData[field.name] as string);
        }
      });

      updateMutation.mutate({
        id: selectedItem.id,
        data: formDataPayload
      });
    } else {
      const payload: Record<string, any> = {
        name: formData.name,
        slug: formData.slug
      };

      parents.forEach(parent => {
        payload[parent.fieldName] = parseInt(formData[parent.fieldName]);
      });

      // Add custom fields (non-file)
      customFields.forEach(field => {
        if (field.type === "file") return;
        const value = formData[field.name];
        if (field.type === "multiselect") {
          const arr = value as string[];
          if (arr && arr.length > 0) {
            // Convert to CSV if configured, otherwise keep as array
            payload[field.name] = field.multiSelectConfig?.outputFormat === "csv"
              ? arr.join(",")
              : arr;
          }
        } else if (value) {
          payload[field.name] = field.type === "number"
            ? parseFloat(value as string)
            : value;
        }
      });

      updateMutation.mutate({
        id: selectedItem.id,
        data: payload
      });
    }
  };

  const handleDelete = () => {
    if (!selectedItem) return;
    deleteMutation.mutate(selectedItem.id);
  };

  const openCreateDialog = () => {
    setFormData(initialFormData);
    setFileData({});
    setFilePreviews({});
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

    // Load custom field values
    customFields.forEach(field => {
      if (field.type === "file") {
        // File fields handled separately
      } else if (field.type === "multiselect") {
        // Handle multi-select: could be array or CSV string
        const itemValue = item[field.name];
        if (Array.isArray(itemValue)) {
          newFormData[field.name] = itemValue.map(String);
        } else if (typeof itemValue === "string" && itemValue) {
          // Parse CSV string
          newFormData[field.name] = itemValue.split(",").map(s => s.trim());
        } else {
          newFormData[field.name] = [];
        }
      } else {
        newFormData[field.name] = item[field.name]?.toString() || "";
      }
    });

    setFormData(newFormData);
    setFileData({});
    setFilePreviews({});
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
          <div className="flex items-center gap-4">
            {searchEnabled && (
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={searchPlaceholder || `Search ${entityNamePlural.toLowerCase()}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-8"
                  data-testid={`input-search-${testIdEntityPlural}`}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                    data-testid="button-clear-search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
            <Button
              onClick={openCreateDialog}
              data-testid={`button-create-${testIdEntity}`}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add {entityName}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {searchEnabled && searchQuery && filteredItems && (
          <p className="text-sm text-muted-foreground mb-4" data-testid="text-search-results">
            Showing {filteredItems.length} of {items?.length || 0} {entityNamePlural.toLowerCase()}
          </p>
        )}
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
              {filteredItems?.map((item) => (
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
            {/* Custom Fields (including file uploads) */}
            {customFields.map((field) => (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={`create-${field.name}`}>
                  {field.label}{field.required ? " *" : ""}
                </Label>
                {field.type === "file" ? (
                  <div className="space-y-2">
                    {/* File Preview */}
                    {filePreviews[field.name] && field.fileConfig?.previewType === "image" && (
                      <div className="relative w-32 h-32 rounded-lg overflow-hidden border">
                        <img
                          src={filePreviews[field.name]}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => clearFile(field.name)}
                          className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
                          data-testid={`button-clear-file-create-${field.name}`}
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                    {fileData[field.name] && field.fileConfig?.previewType !== "image" && (
                      <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                        <FileIcon className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm truncate flex-1">{fileData[field.name]?.name}</span>
                        <button
                          type="button"
                          onClick={() => clearFile(field.name)}
                          className="p-1 hover:bg-destructive/10 rounded"
                          data-testid={`button-clear-file-create-${field.name}`}
                        >
                          <XCircle className="h-4 w-4 text-destructive" />
                        </button>
                      </div>
                    )}
                    {/* File Input */}
                    {!fileData[field.name] && (
                      <div className="flex items-center gap-2">
                        <label
                          htmlFor={`create-${field.name}`}
                          className="flex items-center gap-2 px-4 py-2 border border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                        >
                          <Upload className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            Choose file...
                          </span>
                        </label>
                        <input
                          id={`create-${field.name}`}
                          type="file"
                          accept={field.fileConfig?.accept}
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            handleFileChange(field.name, file, field);
                            e.target.value = ""; // Reset input
                          }}
                          data-testid={`input-create-${field.name}`}
                        />
                      </div>
                    )}
                    {field.fileConfig?.fileHelpText && (
                      <p className="text-xs text-muted-foreground">
                        {field.fileConfig.fileHelpText}
                      </p>
                    )}
                  </div>
                ) : field.type === "richtext" ? (
                  <RichTextEditor
                    id={`create-${field.name}`}
                    value={(formData[field.name] as string) || ""}
                    onChange={(value) => setFormData({ ...formData, [field.name]: value })}
                    config={field.richTextConfig}
                    data-testid={`input-create-${field.name}`}
                  />
                ) : field.type === "multiselect" ? (
                  <MultiSelect
                    id={`create-${field.name}`}
                    value={(formData[field.name] as string[]) || []}
                    onChange={(value) => setFormData({ ...formData, [field.name]: value })}
                    config={field.multiSelectConfig}
                    data-testid={`input-create-${field.name}`}
                  />
                ) : field.type === "textarea" ? (
                  <textarea
                    id={`create-${field.name}`}
                    placeholder={field.placeholder}
                    value={(formData[field.name] as string) || ""}
                    onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    data-testid={`input-create-${field.name}`}
                  />
                ) : (
                  <Input
                    id={`create-${field.name}`}
                    type={field.type === "number" ? "number" : "text"}
                    placeholder={field.placeholder}
                    value={(formData[field.name] as string) || ""}
                    onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                    data-testid={`input-create-${field.name}`}
                  />
                )}
                {field.helpText && (
                  <p className="text-xs text-muted-foreground">
                    {field.helpText}
                  </p>
                )}
              </div>
            ))}
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
            {/* Custom Fields (including file uploads) */}
            {customFields.map((field) => (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={`edit-${field.name}`}>
                  {field.label}{field.required ? " *" : ""}
                </Label>
                {field.type === "file" ? (
                  <div className="space-y-2">
                    {/* Existing file preview (from entity data) */}
                    {selectedItem?.[field.name] && !fileData[field.name] && !filePreviews[field.name] && (
                      <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                        {field.fileConfig?.previewType === "image" ? (
                          <img
                            src={selectedItem[field.name]}
                            alt="Current"
                            className="w-16 h-16 object-cover rounded"
                          />
                        ) : (
                          <FileIcon className="h-5 w-5 text-muted-foreground" />
                        )}
                        <span className="text-sm text-muted-foreground">Current file</span>
                      </div>
                    )}
                    {/* New File Preview */}
                    {filePreviews[field.name] && field.fileConfig?.previewType === "image" && (
                      <div className="relative w-32 h-32 rounded-lg overflow-hidden border">
                        <img
                          src={filePreviews[field.name]}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => clearFile(field.name)}
                          className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
                          data-testid={`button-clear-file-edit-${field.name}`}
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                    {fileData[field.name] && field.fileConfig?.previewType !== "image" && (
                      <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                        <FileIcon className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm truncate flex-1">{fileData[field.name]?.name}</span>
                        <button
                          type="button"
                          onClick={() => clearFile(field.name)}
                          className="p-1 hover:bg-destructive/10 rounded"
                          data-testid={`button-clear-file-edit-${field.name}`}
                        >
                          <XCircle className="h-4 w-4 text-destructive" />
                        </button>
                      </div>
                    )}
                    {/* File Input */}
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor={`edit-${field.name}`}
                        className="flex items-center gap-2 px-4 py-2 border border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                      >
                        <Upload className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {fileData[field.name] ? "Change file..." : selectedItem?.[field.name] ? "Replace file..." : "Choose file..."}
                        </span>
                      </label>
                      <input
                        id={`edit-${field.name}`}
                        type="file"
                        accept={field.fileConfig?.accept}
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          handleFileChange(field.name, file, field);
                          e.target.value = ""; // Reset input
                        }}
                        data-testid={`input-edit-${field.name}`}
                      />
                    </div>
                    {field.fileConfig?.fileHelpText && (
                      <p className="text-xs text-muted-foreground">
                        {field.fileConfig.fileHelpText}
                      </p>
                    )}
                  </div>
                ) : field.type === "richtext" ? (
                  <RichTextEditor
                    id={`edit-${field.name}`}
                    value={(formData[field.name] as string) || ""}
                    onChange={(value) => setFormData({ ...formData, [field.name]: value })}
                    config={field.richTextConfig}
                    data-testid={`input-edit-${field.name}`}
                  />
                ) : field.type === "multiselect" ? (
                  <MultiSelect
                    id={`edit-${field.name}`}
                    value={(formData[field.name] as string[]) || []}
                    onChange={(value) => setFormData({ ...formData, [field.name]: value })}
                    config={field.multiSelectConfig}
                    data-testid={`input-edit-${field.name}`}
                  />
                ) : field.type === "textarea" ? (
                  <textarea
                    id={`edit-${field.name}`}
                    placeholder={field.placeholder}
                    value={(formData[field.name] as string) || ""}
                    onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    data-testid={`input-edit-${field.name}`}
                  />
                ) : (
                  <Input
                    id={`edit-${field.name}`}
                    type={field.type === "number" ? "number" : "text"}
                    placeholder={field.placeholder}
                    value={(formData[field.name] as string) || ""}
                    onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                    data-testid={`input-edit-${field.name}`}
                  />
                )}
                {field.helpText && (
                  <p className="text-xs text-muted-foreground">
                    {field.helpText}
                  </p>
                )}
              </div>
            ))}
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
