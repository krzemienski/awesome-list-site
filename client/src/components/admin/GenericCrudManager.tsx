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
import { Plus, Pencil, Trash2, Save, X, LucideIcon, Upload, FileIcon, XCircle, Bold, Italic, Underline, Strikethrough, Link, Heading, List, ListOrdered, Quote, Code, Check, ChevronsUpDown, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Download, Square, CheckSquare, Minus, Undo, Redo, History, Clock } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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
/**
 * Field-level permissions configuration
 * Controls visibility and editability of fields based on context
 */
export interface FieldPermissions {
  /** Whether the field is visible in create form (default: true) */
  visibleOnCreate?: boolean;
  /** Whether the field is visible in edit form (default: true) */
  visibleOnEdit?: boolean;
  /** Whether the field is visible in table columns (default: true) */
  visibleInTable?: boolean;
  /** Whether the field is editable on create (default: true) */
  editableOnCreate?: boolean;
  /** Whether the field is editable on edit - if false, shows as read-only (default: true) */
  editableOnEdit?: boolean;
  /** Dynamic permission check function - receives current context */
  checkPermission?: (context: FieldPermissionContext) => FieldPermissionResult;
}

/**
 * Context provided to dynamic permission check functions
 */
export interface FieldPermissionContext {
  /** Current operation mode */
  mode: 'create' | 'edit' | 'view';
  /** The entity being edited (only available in edit mode) */
  entity?: any;
  /** Additional context data passed from the component */
  customContext?: Record<string, any>;
}

/**
 * Result of a dynamic permission check
 */
export interface FieldPermissionResult {
  /** Whether the field should be visible */
  visible: boolean;
  /** Whether the field should be editable (if visible) */
  editable: boolean;
  /** Optional message to show explaining why field is hidden/disabled */
  message?: string;
}

/**
 * Configuration for custom validation rules on form fields.
 *
 * @property {number} [minLength] - Minimum length for text/textarea fields
 * @property {number} [maxLength] - Maximum length for text/textarea fields
 * @property {number} [min] - Minimum value for number fields
 * @property {number} [max] - Maximum value for number fields
 * @property {RegExp | string} [pattern] - Regex pattern to validate against
 * @property {string} [patternMessage] - Custom error message when pattern fails
 * @property {Function} [custom] - Custom validation function returning true/error string
 * @property {Function} [asyncCustom] - Async custom validation (e.g., for uniqueness checks)
 *
 * @example
 * ```typescript
 * const validation: ValidationConfig = {
 *   minLength: 3,
 *   maxLength: 100,
 *   pattern: /^[a-z0-9-]+$/,
 *   patternMessage: "Only lowercase letters, numbers, and hyphens allowed",
 *   custom: (value) => {
 *     if (value.includes('admin')) return "Cannot contain 'admin'";
 *     return true;
 *   }
 * };
 * ```
 */
export interface ValidationConfig {
  /** Minimum length for text/textarea fields */
  minLength?: number;
  /** Maximum length for text/textarea fields */
  maxLength?: number;
  /** Minimum value for number fields */
  min?: number;
  /** Maximum value for number fields */
  max?: number;
  /** Regex pattern to validate against (can be RegExp or string) */
  pattern?: RegExp | string;
  /** Custom error message when pattern validation fails */
  patternMessage?: string;
  /** Custom validation function - return true if valid, or error message string */
  custom?: (value: any, formData: Record<string, any>) => boolean | string;
  /** Async custom validation function (e.g., for uniqueness checks) */
  asyncCustom?: (value: any, formData: Record<string, any>) => Promise<boolean | string>;
}

/**
 * Validation error state for form fields
 */
export interface FieldValidationErrors {
  [fieldName: string]: string | undefined;
}

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
  /** Field-level permissions configuration */
  permissions?: FieldPermissions;
  /** Custom validation rules for this field */
  validation?: ValidationConfig;
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
  /** Field-level permissions - controls column visibility */
  permissions?: FieldPermissions;
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
  /** Enable pagination (default: true) */
  paginationEnabled?: boolean;
  /** Number of items per page (default: 10) */
  itemsPerPage?: number;
  /** Available page size options (default: [10, 25, 50, 100]) */
  pageSizeOptions?: number[];
  /** Enable bulk operations (select multiple, delete, export) (default: false) */
  bulkOperationsEnabled?: boolean;
  /** Bulk delete API endpoint - if not provided, individual delete endpoints are called */
  bulkDeleteUrl?: string;
  /** Export formats to enable (default: ['csv', 'json']) */
  exportFormats?: Array<'csv' | 'json'>;
  /** Custom export filename (without extension) */
  exportFilename?: string;
  /** Fields to include in export (default: all visible columns) */
  exportFields?: string[];
  /** Enable undo/redo functionality (default: false) */
  undoRedoEnabled?: boolean;
  /** Maximum number of operations to keep in history (default: 50) */
  undoRedoHistoryLimit?: number;
  /** Enable audit trail / change history (default: false) */
  auditTrailEnabled?: boolean;
  /** Maximum number of audit entries to keep (default: 100) */
  auditTrailMaxEntries?: number;
  /** Whether to persist audit trail to localStorage (default: false) */
  auditTrailPersist?: boolean;
  /** Fields to exclude from audit trail tracking */
  auditTrailExcludeFields?: string[];
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
  searchPlaceholder,
  paginationEnabled = true,
  itemsPerPage: defaultItemsPerPage = 10,
  pageSizeOptions = [10, 25, 50, 100],
  bulkOperationsEnabled = false,
  bulkDeleteUrl,
  exportFormats = ['csv', 'json'],
  exportFilename,
  exportFields,
  undoRedoEnabled = false,
  undoRedoHistoryLimit = 50,
  auditTrailEnabled = false,
  auditTrailMaxEntries = 100,
  auditTrailPersist = false,
  auditTrailExcludeFields = []
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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultItemsPerPage);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  // Undo/redo state management
  const [history, setHistory] = useState<Array<{
    type: 'create' | 'update' | 'delete';
    entityId: number;
    previousData?: T;
    newData?: T;
    timestamp: number;
  }>>([]);
  const [historyPointer, setHistoryPointer] = useState(-1);

  // Audit trail state management
  const auditStorageKey = `audit-trail-${queryKey}`;
  const [auditTrail, setAuditTrail] = useState<Array<{
    id: string;
    operationType: 'create' | 'update' | 'delete';
    entityId: number;
    entityName: string;
    previousData: T | null;
    newData: T | null;
    timestamp: string;
    description: string;
    changedFields?: string[];
  }>>(() => {
    // Load from localStorage if persistence is enabled
    if (auditTrailEnabled && auditTrailPersist && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(auditStorageKey);
        return stored ? JSON.parse(stored) : [];
      } catch {
        return [];
      }
    }
    return [];
  });
  const [auditDialogOpen, setAuditDialogOpen] = useState(false);

  // Check if we have file fields (auto-enable FormData if so)
  const hasFileFields = customFields.some(f => f.type === "file");
  const shouldUseFormData = useFormData || hasFileFields;

  /**
   * Helper to record an operation in the undo/redo history
   */
  const recordOperation = (
    type: 'create' | 'update' | 'delete',
    entityId: number,
    previousData?: T,
    newData?: T
  ) => {
    if (!undoRedoEnabled) return;

    const operation = {
      type,
      entityId,
      previousData,
      newData,
      timestamp: Date.now()
    };

    // When recording a new operation, truncate any future history
    const newHistory = history.slice(0, historyPointer + 1);
    newHistory.push(operation);

    // Enforce history limit
    const limitedHistory = newHistory.slice(-undoRedoHistoryLimit);

    setHistory(limitedHistory);
    setHistoryPointer(limitedHistory.length - 1);
  };

  /**
   * Helper to record an operation in the audit trail
   */
  const recordAuditEntry = (
    operationType: 'create' | 'update' | 'delete',
    entityId: number,
    entityNameValue: string,
    previousData: T | null,
    newData: T | null
  ) => {
    if (!auditTrailEnabled) return;

    // Calculate changed fields for updates
    let changedFields: string[] | undefined;
    if (operationType === 'update' && previousData && newData) {
      changedFields = Object.keys(newData).filter(key => {
        if (auditTrailExcludeFields.includes(key)) return false;
        return JSON.stringify(previousData[key]) !== JSON.stringify(newData[key]);
      });
    }

    // Filter out excluded fields from data
    const filterData = (data: T | null): T | null => {
      if (!data || auditTrailExcludeFields.length === 0) return data;
      const filtered = { ...data };
      auditTrailExcludeFields.forEach(field => {
        delete (filtered as any)[field];
      });
      return filtered;
    };

    // Generate description
    let description: string;
    if (operationType === 'create') {
      description = `Created ${entityName} "${entityNameValue}"`;
    } else if (operationType === 'update') {
      const fieldCount = changedFields?.length || 0;
      description = `Updated ${entityName} "${entityNameValue}" (${fieldCount} field${fieldCount !== 1 ? 's' : ''} changed)`;
    } else {
      description = `Deleted ${entityName} "${entityNameValue}"`;
    }

    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      operationType,
      entityId,
      entityName: entityNameValue,
      previousData: filterData(previousData),
      newData: filterData(newData),
      timestamp: new Date().toISOString(),
      description,
      changedFields
    };

    setAuditTrail(prev => {
      const newTrail = [entry, ...prev].slice(0, auditTrailMaxEntries);

      // Persist to localStorage if enabled
      if (auditTrailPersist && typeof window !== 'undefined') {
        try {
          localStorage.setItem(auditStorageKey, JSON.stringify(newTrail));
        } catch (e) {
          console.warn('Failed to persist audit trail to localStorage:', e);
        }
      }

      return newTrail;
    });
  };

  /**
   * Clear all audit trail entries
   */
  const clearAuditTrail = () => {
    setAuditTrail([]);
    if (auditTrailPersist && typeof window !== 'undefined') {
      try {
        localStorage.removeItem(auditStorageKey);
      } catch (e) {
        console.warn('Failed to clear audit trail from localStorage:', e);
      }
    }
    toast({
      title: "Audit Trail Cleared",
      description: "All change history has been removed"
    });
  };

  /**
   * Undo the last operation
   */
  const handleUndo = async () => {
    if (!undoRedoEnabled || historyPointer < 0) return;

    const operation = history[historyPointer];

    try {
      if (operation.type === 'create') {
        // Undo create: delete the created entity
        await apiRequest(deleteUrl(operation.entityId), { method: 'DELETE' });
        queryClient.invalidateQueries({ queryKey: [queryKey] });
        if (publicQueryKey) {
          queryClient.invalidateQueries({ queryKey: [publicQueryKey] });
        }
        toast({
          title: "Undo",
          description: `Undo: ${entityName} creation reverted`
        });
      } else if (operation.type === 'update') {
        // Undo update: restore previous data
        if (operation.previousData) {
          await apiRequest(updateUrl(operation.entityId), {
            method: 'PATCH',
            body: JSON.stringify(operation.previousData)
          });
          queryClient.invalidateQueries({ queryKey: [queryKey] });
          if (publicQueryKey) {
            queryClient.invalidateQueries({ queryKey: [publicQueryKey] });
          }
          toast({
            title: "Undo",
            description: `Undo: ${entityName} update reverted`
          });
        }
      } else if (operation.type === 'delete') {
        // Undo delete: re-create the entity
        if (operation.previousData) {
          await apiRequest(createUrl, {
            method: 'POST',
            body: JSON.stringify(operation.previousData)
          });
          queryClient.invalidateQueries({ queryKey: [queryKey] });
          if (publicQueryKey) {
            queryClient.invalidateQueries({ queryKey: [publicQueryKey] });
          }
          toast({
            title: "Undo",
            description: `Undo: ${entityName} deletion reverted`
          });
        }
      }

      // Move pointer back
      setHistoryPointer(historyPointer - 1);
    } catch (error: any) {
      toast({
        title: "Undo Failed",
        description: error.message || "Failed to undo operation",
        variant: "destructive"
      });
    }
  };

  /**
   * Redo the next operation
   */
  const handleRedo = async () => {
    if (!undoRedoEnabled || historyPointer >= history.length - 1) return;

    const nextPointer = historyPointer + 1;
    const operation = history[nextPointer];

    try {
      if (operation.type === 'create') {
        // Redo create: re-create the entity
        if (operation.newData) {
          await apiRequest(createUrl, {
            method: 'POST',
            body: JSON.stringify(operation.newData)
          });
          queryClient.invalidateQueries({ queryKey: [queryKey] });
          if (publicQueryKey) {
            queryClient.invalidateQueries({ queryKey: [publicQueryKey] });
          }
          toast({
            title: "Redo",
            description: `Redo: ${entityName} re-created`
          });
        }
      } else if (operation.type === 'update') {
        // Redo update: apply the new data again
        if (operation.newData) {
          await apiRequest(updateUrl(operation.entityId), {
            method: 'PATCH',
            body: JSON.stringify(operation.newData)
          });
          queryClient.invalidateQueries({ queryKey: [queryKey] });
          if (publicQueryKey) {
            queryClient.invalidateQueries({ queryKey: [publicQueryKey] });
          }
          toast({
            title: "Redo",
            description: `Redo: ${entityName} update re-applied`
          });
        }
      } else if (operation.type === 'delete') {
        // Redo delete: delete the entity again
        await apiRequest(deleteUrl(operation.entityId), { method: 'DELETE' });
        queryClient.invalidateQueries({ queryKey: [queryKey] });
        if (publicQueryKey) {
          queryClient.invalidateQueries({ queryKey: [publicQueryKey] });
        }
        toast({
          title: "Redo",
          description: `Redo: ${entityName} re-deleted`
        });
      }

      // Move pointer forward
      setHistoryPointer(nextPointer);
    } catch (error: any) {
      toast({
        title: "Redo Failed",
        description: error.message || "Failed to redo operation",
        variant: "destructive"
      });
    }
  };

  /**
   * Helper to check field permissions based on mode and entity
   * Returns { visible, editable, message } based on field's permission config
   */
  const checkFieldPermissions = (
    permissions: FieldPermissions | undefined,
    mode: 'create' | 'edit' | 'view',
    entity?: T
  ): { visible: boolean; editable: boolean; message?: string } => {
    // Default: field is visible and editable
    if (!permissions) {
      return { visible: true, editable: true };
    }

    // Check dynamic permission function first (overrides static settings)
    if (permissions.checkPermission) {
      const context: FieldPermissionContext = { mode, entity };
      return permissions.checkPermission(context);
    }

    // Apply static permission settings
    let visible = true;
    let editable = true;

    if (mode === 'create') {
      visible = permissions.visibleOnCreate !== false;
      editable = permissions.editableOnCreate !== false;
    } else if (mode === 'edit') {
      visible = permissions.visibleOnEdit !== false;
      editable = permissions.editableOnEdit !== false;
    } else if (mode === 'view') {
      visible = permissions.visibleInTable !== false;
      editable = false; // Table view is never editable
    }

    return { visible, editable };
  };

  /**
   * Filter columns based on permissions for table view
   */
  const getVisibleColumns = useMemo(() => {
    return columns.filter(col => {
      const { visible } = checkFieldPermissions(col.permissions, 'view');
      return visible;
    });
  }, [columns]);

  /**
   * Filter custom fields based on permissions for a given mode
   */
  const getVisibleCustomFields = (mode: 'create' | 'edit', entity?: T) => {
    return customFields.filter(field => {
      const { visible } = checkFieldPermissions(field.permissions, mode, entity);
      return visible;
    });
  };

  /**
   * Check if a custom field is editable for a given mode
   */
  const isFieldEditable = (field: CustomFieldConfig, mode: 'create' | 'edit', entity?: T): boolean => {
    const { editable } = checkFieldPermissions(field.permissions, mode, entity);
    return editable;
  };

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
  const [validationErrors, setValidationErrors] = useState<FieldValidationErrors>({});

  /**
   * Validates a single field against its validation configuration
   * @returns Error message or undefined if valid
   */
  const validateField = (
    fieldName: string,
    value: any,
    validation: ValidationConfig | undefined,
    allFormData: Record<string, any>
  ): string | undefined => {
    if (!validation) return undefined;

    const stringValue = typeof value === "string" ? value : "";
    const numberValue = typeof value === "number" ? value : parseFloat(stringValue);

    // minLength validation
    if (validation.minLength !== undefined && stringValue.length < validation.minLength) {
      return `Must be at least ${validation.minLength} characters`;
    }

    // maxLength validation
    if (validation.maxLength !== undefined && stringValue.length > validation.maxLength) {
      return `Must be no more than ${validation.maxLength} characters`;
    }

    // min validation (for numbers)
    if (validation.min !== undefined && !isNaN(numberValue) && numberValue < validation.min) {
      return `Must be at least ${validation.min}`;
    }

    // max validation (for numbers)
    if (validation.max !== undefined && !isNaN(numberValue) && numberValue > validation.max) {
      return `Must be no more than ${validation.max}`;
    }

    // pattern validation
    if (validation.pattern) {
      const regex = typeof validation.pattern === "string"
        ? new RegExp(validation.pattern)
        : validation.pattern;
      if (!regex.test(stringValue)) {
        return validation.patternMessage || "Invalid format";
      }
    }

    // custom validation
    if (validation.custom) {
      const result = validation.custom(value, allFormData);
      if (result !== true) {
        return typeof result === "string" ? result : "Invalid value";
      }
    }

    return undefined;
  };

  /**
   * Validates all fields and returns errors object
   * @returns Object with field names as keys and error messages as values
   */
  const validateAllFields = async (): Promise<FieldValidationErrors> => {
    const errors: FieldValidationErrors = {};

    // Validate custom fields with validation rules
    for (const field of customFields) {
      if (field.validation) {
        const value = formData[field.name];
        const error = validateField(field.name, value, field.validation, formData);
        if (error) {
          errors[field.name] = error;
        }

        // Run async validation if present and no sync error
        if (!error && field.validation.asyncCustom) {
          try {
            const asyncResult = await field.validation.asyncCustom(value, formData);
            if (asyncResult !== true) {
              errors[field.name] = typeof asyncResult === "string" ? asyncResult : "Invalid value";
            }
          } catch (e) {
            errors[field.name] = "Validation failed";
          }
        }
      }
    }

    return errors;
  };

  /**
   * Clears validation error for a specific field
   */
  const clearFieldError = (fieldName: string) => {
    if (validationErrors[fieldName]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

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

  // Pagination calculations
  const totalItems = filteredItems?.length || 0;
  const totalPages = Math.ceil(totalItems / pageSize);

  // Reset to page 1 when search query changes or when current page exceeds total pages
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [searchQuery, totalPages, currentPage]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    if (!undoRedoEnabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z or Cmd+Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      // Ctrl+Shift+Z or Cmd+Shift+Z or Ctrl+Y or Cmd+Y for redo
      if (((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') ||
          ((e.ctrlKey || e.metaKey) && e.key === 'y')) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoRedoEnabled, historyPointer, history]);

  // Paginate the filtered items
  const paginatedItems = useMemo(() => {
    if (!filteredItems || !paginationEnabled) return filteredItems;
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredItems.slice(startIndex, endIndex);
  }, [filteredItems, currentPage, pageSize, paginationEnabled]);

  // Pagination handlers
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  // Bulk selection helpers
  const selectableItems = useMemo(() => {
    // Items that can be selected for bulk delete (resourceCount === 0)
    return (paginatedItems || []).filter(item => item.resourceCount === 0);
  }, [paginatedItems]);

  const allSelectableOnPageSelected = useMemo(() => {
    if (selectableItems.length === 0) return false;
    return selectableItems.every(item => selectedIds.has(item.id));
  }, [selectableItems, selectedIds]);

  const someSelectedOnPage = useMemo(() => {
    return (paginatedItems || []).some(item => selectedIds.has(item.id));
  }, [paginatedItems, selectedIds]);

  const handleSelectAll = () => {
    if (allSelectableOnPageSelected) {
      // Deselect all on current page
      const newSelected = new Set(selectedIds);
      (paginatedItems || []).forEach(item => newSelected.delete(item.id));
      setSelectedIds(newSelected);
    } else {
      // Select all selectable items on current page
      const newSelected = new Set(selectedIds);
      selectableItems.forEach(item => newSelected.add(item.id));
      setSelectedIds(newSelected);
    }
  };

  const handleSelectItem = (id: number, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Get selected items data for operations
  const selectedItems = useMemo(() => {
    return (items || []).filter(item => selectedIds.has(item.id));
  }, [items, selectedIds]);

  // Check if any selected items have resources (can't be deleted)
  const selectedWithResources = useMemo(() => {
    return selectedItems.filter(item => item.resourceCount > 0);
  }, [selectedItems]);

  const deletableSelectedItems = useMemo(() => {
    return selectedItems.filter(item => item.resourceCount === 0);
  }, [selectedItems]);

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
    onSuccess: (newEntity: T) => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      if (publicQueryKey) {
        queryClient.invalidateQueries({ queryKey: [publicQueryKey] });
      }

      // Record the create operation for undo/redo
      if (undoRedoEnabled && newEntity?.id) {
        recordOperation('create', newEntity.id, undefined, newEntity);
      }

      // Record in audit trail
      if (auditTrailEnabled && newEntity?.id) {
        recordAuditEntry('create', newEntity.id, newEntity.name || 'Unknown', null, newEntity);
      }

      toast({
        title: "Success",
        description: `${entityName} created successfully`
      });
      setCreateDialogOpen(false);
      setFormData(initialFormData);
      setFileData({});
      setFilePreviews({});
      setValidationErrors({});
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
    mutationFn: async ({ id, data, previousData }: { id: number; data: Record<string, any> | FormData; previousData?: T }) => {
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
        return { updatedEntity: await response.json(), previousData };
      }
      const updatedEntity = await apiRequest(updateUrl(id), {
        method: 'PATCH',
        body: JSON.stringify(data)
      });
      return { updatedEntity, previousData };
    },
    onSuccess: ({ updatedEntity, previousData }) => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      if (publicQueryKey) {
        queryClient.invalidateQueries({ queryKey: [publicQueryKey] });
      }

      // Record the update operation for undo/redo
      if (undoRedoEnabled && previousData && updatedEntity?.id) {
        recordOperation('update', updatedEntity.id, previousData, updatedEntity);
      }

      // Record in audit trail
      if (auditTrailEnabled && updatedEntity?.id) {
        recordAuditEntry('update', updatedEntity.id, updatedEntity.name || previousData?.name || 'Unknown', previousData || null, updatedEntity);
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
      setValidationErrors({});
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
    mutationFn: async ({ id, previousData }: { id: number; previousData?: T }) => {
      await apiRequest(deleteUrl(id), {
        method: 'DELETE'
      });
      return { id, previousData };
    },
    onSuccess: ({ id, previousData }) => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      if (publicQueryKey) {
        queryClient.invalidateQueries({ queryKey: [publicQueryKey] });
      }

      // Record the delete operation for undo/redo
      if (undoRedoEnabled && previousData) {
        recordOperation('delete', id, previousData, undefined);
      }

      // Record in audit trail
      if (auditTrailEnabled && previousData) {
        recordAuditEntry('delete', id, previousData.name || 'Unknown', previousData, null);
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

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      if (bulkDeleteUrl) {
        // Use bulk endpoint if provided
        return await apiRequest(bulkDeleteUrl, {
          method: 'DELETE',
          body: JSON.stringify({ ids })
        });
      } else {
        // Fall back to individual deletes
        const results = await Promise.allSettled(
          ids.map(id => apiRequest(deleteUrl(id), { method: 'DELETE' }))
        );
        const failures = results.filter(r => r.status === 'rejected');
        if (failures.length > 0) {
          throw new Error(`Failed to delete ${failures.length} of ${ids.length} items`);
        }
        return { deleted: ids.length };
      }
    },
    onSuccess: (_, deletedIds) => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      if (publicQueryKey) {
        queryClient.invalidateQueries({ queryKey: [publicQueryKey] });
      }
      toast({
        title: "Success",
        description: `${deletedIds.length} ${deletedIds.length === 1 ? entityName.toLowerCase() : entityNamePlural.toLowerCase()} deleted successfully`
      });
      setBulkDeleteDialogOpen(false);
      clearSelection();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to delete ${entityNamePlural.toLowerCase()}`,
        variant: "destructive"
      });
      setBulkDeleteDialogOpen(false);
    }
  });

  // Export functionality
  const handleExport = (format: 'csv' | 'json') => {
    const dataToExport = selectedIds.size > 0 ? selectedItems : (filteredItems || []);

    if (dataToExport.length === 0) {
      toast({
        title: "Nothing to export",
        description: "No data available to export",
        variant: "destructive"
      });
      return;
    }

    // Determine which fields to export
    const fieldsToExport = exportFields || columns
      .filter(col => col.key !== 'actions')
      .map(col => col.key);

    const filename = exportFilename || `${entityNamePlural.toLowerCase()}-export-${new Date().toISOString().split('T')[0]}`;

    if (format === 'json') {
      // Export as JSON
      const exportData = dataToExport.map(item => {
        const row: Record<string, any> = {};
        fieldsToExport.forEach(field => {
          row[field] = item[field];
        });
        return row;
      });

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      // Export as CSV
      const headers = fieldsToExport.map(field => {
        const col = columns.find(c => c.key === field);
        return col?.label || field;
      });

      const rows = dataToExport.map(item =>
        fieldsToExport.map(field => {
          const value = item[field];
          // Handle values that might contain commas or quotes
          if (value === null || value === undefined) return '';
          const stringValue = String(value);
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        })
      );

      const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    toast({
      title: "Export successful",
      description: `Exported ${dataToExport.length} ${dataToExport.length === 1 ? entityName.toLowerCase() : entityNamePlural.toLowerCase()} as ${format.toUpperCase()}`
    });
  };

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

    // Run custom validation rules
    const fieldErrors = await validateAllFields();
    if (Object.keys(fieldErrors).length > 0) {
      setValidationErrors(fieldErrors);
      const errorFields = Object.keys(fieldErrors).map(fieldName => {
        const customField = customFields.find(f => f.name === fieldName);
        return customField?.label.replace(" *", "") || fieldName;
      });
      toast({
        title: "Validation Error",
        description: `Please fix the following fields: ${errorFields.join(", ")}`,
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

    // Run custom validation rules
    const fieldErrors = await validateAllFields();
    if (Object.keys(fieldErrors).length > 0) {
      setValidationErrors(fieldErrors);
      const errorFields = Object.keys(fieldErrors).map(fieldName => {
        const customField = customFields.find(f => f.name === fieldName);
        return customField?.label.replace(" *", "") || fieldName;
      });
      toast({
        title: "Validation Error",
        description: `Please fix the following fields: ${errorFields.join(", ")}`,
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
        data: formDataPayload,
        previousData: selectedItem
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
        data: payload,
        previousData: selectedItem
      });
    }
  };

  const handleDelete = () => {
    if (!selectedItem) return;
    deleteMutation.mutate({ id: selectedItem.id, previousData: selectedItem });
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
            {/* Bulk Actions Toolbar */}
            {bulkOperationsEnabled && selectedIds.size > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg" data-testid="bulk-actions-toolbar">
                <span className="text-sm font-medium" data-testid="text-selected-count">
                  {selectedIds.size} selected
                </span>
                <div className="h-4 w-px bg-border" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setBulkDeleteDialogOpen(true)}
                  disabled={deletableSelectedItems.length === 0}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  data-testid="button-bulk-delete"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete{deletableSelectedItems.length > 0 && ` (${deletableSelectedItems.length})`}
                </Button>
                {exportFormats.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" data-testid="button-export-selected">
                        <Download className="h-4 w-4 mr-1" />
                        Export
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {exportFormats.includes('csv') && (
                        <DropdownMenuItem onClick={() => handleExport('csv')} data-testid="menu-export-csv">
                          Export as CSV
                        </DropdownMenuItem>
                      )}
                      {exportFormats.includes('json') && (
                        <DropdownMenuItem onClick={() => handleExport('json')} data-testid="menu-export-json">
                          Export as JSON
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                  data-testid="button-clear-selection"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </div>
            )}
            {/* Export All (when nothing selected) */}
            {bulkOperationsEnabled && selectedIds.size === 0 && exportFormats.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" data-testid="button-export-all">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {exportFormats.includes('csv') && (
                    <DropdownMenuItem onClick={() => handleExport('csv')} data-testid="menu-export-all-csv">
                      Export all as CSV
                    </DropdownMenuItem>
                  )}
                  {exportFormats.includes('json') && (
                    <DropdownMenuItem onClick={() => handleExport('json')} data-testid="menu-export-all-json">
                      Export all as JSON
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
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
            {undoRedoEnabled && (
              <>
                <Button
                  onClick={handleUndo}
                  disabled={historyPointer < 0}
                  variant="outline"
                  data-testid="button-undo"
                  title="Undo (Ctrl+Z)"
                >
                  <Undo className="h-4 w-4 mr-2" />
                  Undo
                </Button>
                <Button
                  onClick={handleRedo}
                  disabled={historyPointer >= history.length - 1}
                  variant="outline"
                  data-testid="button-redo"
                  title="Redo (Ctrl+Shift+Z)"
                >
                  <Redo className="h-4 w-4 mr-2" />
                  Redo
                </Button>
              </>
            )}
            {auditTrailEnabled && (
              <Button
                onClick={() => setAuditDialogOpen(true)}
                variant="outline"
                data-testid="button-audit-trail"
                title="View change history"
              >
                <History className="h-4 w-4 mr-2" />
                History
                {auditTrail.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                    {auditTrail.length}
                  </Badge>
                )}
              </Button>
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
        {(searchEnabled && searchQuery && filteredItems) || (paginationEnabled && totalItems > 0) ? (
          <p className="text-sm text-muted-foreground mb-4" data-testid="text-search-results">
            {searchQuery ? (
              <>Showing {paginationEnabled ? `${Math.min((currentPage - 1) * pageSize + 1, totalItems)}-${Math.min(currentPage * pageSize, totalItems)} of ` : ''}{totalItems} result{totalItems !== 1 ? 's' : ''} (filtered from {items?.length || 0})</>
            ) : paginationEnabled ? (
              <>Showing {Math.min((currentPage - 1) * pageSize + 1, totalItems)}-{Math.min(currentPage * pageSize, totalItems)} of {totalItems} {entityNamePlural.toLowerCase()}</>
            ) : null}
          </p>
        ) : null}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <>
          <Table data-testid={`table-${testIdEntityPlural}`}>
            <TableHeader>
              <TableRow>
                {bulkOperationsEnabled && (
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={allSelectableOnPageSelected && selectableItems.length > 0}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all"
                      data-testid="checkbox-select-all"
                      disabled={selectableItems.length === 0}
                      className={someSelectedOnPage && !allSelectableOnPageSelected ? "data-[state=checked]:bg-primary/50" : ""}
                    />
                  </TableHead>
                )}
                {getVisibleColumns.map((col) => (
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
              {paginatedItems?.map((item) => (
                <TableRow key={item.id} data-testid={`row-${testIdEntity}-${item.id}`} className={selectedIds.has(item.id) ? "bg-muted/50" : ""}>
                  {bulkOperationsEnabled && (
                    <TableCell className="w-[50px]">
                      <Checkbox
                        checked={selectedIds.has(item.id)}
                        onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
                        aria-label={`Select ${item.name}`}
                        data-testid={`checkbox-select-${item.id}`}
                        disabled={item.resourceCount > 0}
                        title={item.resourceCount > 0 ? `Cannot select: has ${item.resourceCount} resources` : undefined}
                      />
                    </TableCell>
                  )}
                  {getVisibleColumns.map((col) => (
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

          {/* Pagination Controls */}
          {paginationEnabled && totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t" data-testid={`pagination-${testIdEntityPlural}`}>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Rows per page:</span>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(value) => handlePageSizeChange(Number(value))}
                >
                  <SelectTrigger className="w-[70px] h-8" data-testid="select-page-size">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {pageSizeOptions.map((size) => (
                      <SelectItem key={size} value={size.toString()}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground mr-2" data-testid="text-page-info">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(1)}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                  data-testid="button-first-page"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                  data-testid="button-prev-page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0"
                  data-testid="button-next-page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0"
                  data-testid="button-last-page"
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          </>
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
            {getVisibleCustomFields('create').map((field) => {
              const fieldEditable = isFieldEditable(field, 'create');
              return (
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
                    onChange={(e) => {
                      setFormData({ ...formData, [field.name]: e.target.value });
                      clearFieldError(field.name);
                    }}
                    onBlur={() => {
                      if (field.validation) {
                        const error = validateField(field.name, formData[field.name], field.validation, formData);
                        if (error) {
                          setValidationErrors(prev => ({ ...prev, [field.name]: error }));
                        }
                      }
                    }}
                    disabled={!fieldEditable}
                    className={`flex min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${validationErrors[field.name] ? "border-destructive" : "border-input"}`}
                    data-testid={`input-create-${field.name}`}
                  />
                ) : (
                  <Input
                    id={`create-${field.name}`}
                    type={field.type === "number" ? "number" : "text"}
                    placeholder={field.placeholder}
                    value={(formData[field.name] as string) || ""}
                    onChange={(e) => {
                      setFormData({ ...formData, [field.name]: e.target.value });
                      clearFieldError(field.name);
                    }}
                    onBlur={() => {
                      if (field.validation) {
                        const error = validateField(field.name, formData[field.name], field.validation, formData);
                        if (error) {
                          setValidationErrors(prev => ({ ...prev, [field.name]: error }));
                        }
                      }
                    }}
                    disabled={!fieldEditable}
                    className={validationErrors[field.name] ? "border-destructive" : ""}
                    data-testid={`input-create-${field.name}`}
                  />
                )}
                {field.helpText && (
                  <p className="text-xs text-muted-foreground">
                    {field.helpText}
                  </p>
                )}
                {validationErrors[field.name] && (
                  <p className="text-xs text-destructive" data-testid={`error-create-${field.name}`}>
                    {validationErrors[field.name]}
                  </p>
                )}
              </div>
            );
            })}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false);
                setValidationErrors({});
              }}
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
            {getVisibleCustomFields('edit', selectedItem || undefined).map((field) => {
              const fieldEditable = isFieldEditable(field, 'edit', selectedItem || undefined);
              return (
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
                    onChange={(e) => {
                      setFormData({ ...formData, [field.name]: e.target.value });
                      clearFieldError(field.name);
                    }}
                    onBlur={() => {
                      if (field.validation) {
                        const error = validateField(field.name, formData[field.name], field.validation, formData);
                        if (error) {
                          setValidationErrors(prev => ({ ...prev, [field.name]: error }));
                        }
                      }
                    }}
                    disabled={!fieldEditable}
                    className={`flex min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${validationErrors[field.name] ? "border-destructive" : "border-input"}`}
                    data-testid={`input-edit-${field.name}`}
                  />
                ) : (
                  <Input
                    id={`edit-${field.name}`}
                    type={field.type === "number" ? "number" : "text"}
                    placeholder={field.placeholder}
                    value={(formData[field.name] as string) || ""}
                    onChange={(e) => {
                      setFormData({ ...formData, [field.name]: e.target.value });
                      clearFieldError(field.name);
                    }}
                    onBlur={() => {
                      if (field.validation) {
                        const error = validateField(field.name, formData[field.name], field.validation, formData);
                        if (error) {
                          setValidationErrors(prev => ({ ...prev, [field.name]: error }));
                        }
                      }
                    }}
                    disabled={!fieldEditable}
                    className={validationErrors[field.name] ? "border-destructive" : ""}
                    data-testid={`input-edit-${field.name}`}
                  />
                )}
                {field.helpText && (
                  <p className="text-xs text-muted-foreground">
                    {field.helpText}
                  </p>
                )}
                {validationErrors[field.name] && (
                  <p className="text-xs text-destructive" data-testid={`error-edit-${field.name}`}>
                    {validationErrors[field.name]}
                  </p>
                )}
              </div>
            );
            })}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                setValidationErrors({});
              }}
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

      {/* Bulk Delete Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent data-testid={`dialog-bulk-delete-${testIdEntity}`}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Multiple {entityNamePlural}</AlertDialogTitle>
            <AlertDialogDescription>
              {deletableSelectedItems.length > 0 ? (
                <>
                  Are you sure you want to delete {deletableSelectedItems.length} {deletableSelectedItems.length === 1 ? entityName.toLowerCase() : entityNamePlural.toLowerCase()}?
                  {selectedWithResources.length > 0 && (
                    <span className="block mt-2 text-amber-600">
                      Note: {selectedWithResources.length} selected {selectedWithResources.length === 1 ? 'item has' : 'items have'} resources and will be skipped.
                    </span>
                  )}
                  <span className="block mt-2 font-medium">
                    Items to delete:
                  </span>
                  <ul className="mt-1 max-h-32 overflow-y-auto text-sm">
                    {deletableSelectedItems.slice(0, 10).map(item => (
                      <li key={item.id} className="truncate">• {item.name}</li>
                    ))}
                    {deletableSelectedItems.length > 10 && (
                      <li className="text-muted-foreground">...and {deletableSelectedItems.length - 10} more</li>
                    )}
                  </ul>
                </>
              ) : (
                <span className="text-amber-600">
                  None of the selected items can be deleted because they all have associated resources.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-bulk-delete">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bulkDeleteMutation.mutate(deletableSelectedItems.map(item => item.id))}
              disabled={bulkDeleteMutation.isPending || deletableSelectedItems.length === 0}
              className="bg-destructive hover:bg-destructive/90"
              data-testid="button-confirm-bulk-delete"
            >
              {bulkDeleteMutation.isPending ? "Deleting..." : `Delete ${deletableSelectedItems.length}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Audit Trail Dialog */}
      <Dialog open={auditDialogOpen} onOpenChange={setAuditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col" data-testid="dialog-audit-trail">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Change History
            </DialogTitle>
            <DialogDescription>
              View the audit trail of all changes made to {entityNamePlural.toLowerCase()}.
              {auditTrailPersist && " History is persisted across sessions."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4">
            {auditTrail.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No changes recorded yet.</p>
                <p className="text-sm mt-1">Changes will appear here as you create, update, or delete {entityNamePlural.toLowerCase()}.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {auditTrail.map((entry) => (
                  <div
                    key={entry.id}
                    className={`border rounded-lg p-3 ${
                      entry.operationType === 'create' ? 'border-l-4 border-l-green-500' :
                      entry.operationType === 'update' ? 'border-l-4 border-l-blue-500' :
                      'border-l-4 border-l-red-500'
                    }`}
                    data-testid={`audit-entry-${entry.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              entry.operationType === 'create' ? 'default' :
                              entry.operationType === 'update' ? 'secondary' :
                              'destructive'
                            }
                            className="text-xs"
                          >
                            {entry.operationType.toUpperCase()}
                          </Badge>
                          <span className="font-medium">{entry.entityName}</span>
                          <span className="text-xs text-muted-foreground">ID: {entry.entityId}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{entry.description}</p>
                        {entry.changedFields && entry.changedFields.length > 0 && (
                          <div className="mt-2">
                            <span className="text-xs text-muted-foreground">Changed fields: </span>
                            <span className="text-xs font-mono">{entry.changedFields.join(', ')}</span>
                          </div>
                        )}
                        {entry.operationType === 'update' && entry.previousData && entry.newData && (
                          <details className="mt-2">
                            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                              View changes
                            </summary>
                            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                              <div className="bg-red-50 dark:bg-red-950/20 rounded p-2">
                                <span className="font-medium text-red-700 dark:text-red-400">Before:</span>
                                <pre className="mt-1 whitespace-pre-wrap break-all text-muted-foreground max-h-32 overflow-y-auto">
                                  {JSON.stringify(entry.previousData, null, 2)}
                                </pre>
                              </div>
                              <div className="bg-green-50 dark:bg-green-950/20 rounded p-2">
                                <span className="font-medium text-green-700 dark:text-green-400">After:</span>
                                <pre className="mt-1 whitespace-pre-wrap break-all text-muted-foreground max-h-32 overflow-y-auto">
                                  {JSON.stringify(entry.newData, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </details>
                        )}
                        {entry.operationType === 'create' && entry.newData && (
                          <details className="mt-2">
                            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                              View created data
                            </summary>
                            <div className="mt-2 bg-green-50 dark:bg-green-950/20 rounded p-2 text-xs">
                              <pre className="whitespace-pre-wrap break-all text-muted-foreground max-h-32 overflow-y-auto">
                                {JSON.stringify(entry.newData, null, 2)}
                              </pre>
                            </div>
                          </details>
                        )}
                        {entry.operationType === 'delete' && entry.previousData && (
                          <details className="mt-2">
                            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                              View deleted data
                            </summary>
                            <div className="mt-2 bg-red-50 dark:bg-red-950/20 rounded p-2 text-xs">
                              <pre className="whitespace-pre-wrap break-all text-muted-foreground max-h-32 overflow-y-auto">
                                {JSON.stringify(entry.previousData, null, 2)}
                              </pre>
                            </div>
                          </details>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                        <Clock className="h-3 w-3" />
                        {new Date(entry.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter className="border-t pt-4">
            <div className="flex items-center justify-between w-full">
              <span className="text-sm text-muted-foreground">
                {auditTrail.length} {auditTrail.length === 1 ? 'entry' : 'entries'}
                {auditTrailMaxEntries && ` (max ${auditTrailMaxEntries})`}
              </span>
              <div className="flex gap-2">
                {auditTrail.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearAuditTrail}
                    data-testid="button-clear-audit-trail"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear History
                  </Button>
                )}
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setAuditDialogOpen(false)}
                  data-testid="button-close-audit-trail"
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
