import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

/**
 * Defines the type of a form field in the CRUD manager
 */
export type FieldType = "text" | "select" | "number" | "textarea" | "file" | "richtext" | "multiselect";

/**
 * Configuration for file upload fields
 */
export interface FileFieldConfig {
  /** Accepted file types (e.g., "image/*", ".pdf,.doc") */
  accept?: string;
  /** Maximum file size in bytes */
  maxSize?: number;
  /** Whether multiple files can be uploaded */
  multiple?: boolean;
  /** Custom upload handler - if not provided, file is included in FormData */
  uploadHandler?: (file: File) => Promise<string>;
  /** Preview type for uploaded files */
  previewType?: "image" | "icon" | "none";
  /** Help text about allowed file types/sizes */
  fileHelpText?: string;
}

/**
 * Configuration for rich text editor fields
 */
export interface RichTextFieldConfig {
  /** Minimum height of the editor in pixels */
  minHeight?: number;
  /** Maximum height of the editor in pixels (enables scrolling) */
  maxHeight?: number;
  /** Toolbar features to enable */
  toolbar?: Array<"bold" | "italic" | "underline" | "strikethrough" | "link" | "heading" | "list" | "orderedList" | "quote" | "code">;
  /** Output format for the content */
  outputFormat?: "html" | "markdown";
  /** Placeholder text for the editor */
  placeholder?: string;
}

/**
 * Option for multi-select fields
 */
export interface MultiSelectOption {
  /** Unique value for the option */
  value: string;
  /** Display label for the option */
  label: string;
}

/**
 * Configuration for multi-select dropdown fields
 */
export interface MultiSelectFieldConfig {
  /** Static options for the multi-select */
  options?: MultiSelectOption[];
  /** API endpoint to fetch options dynamically */
  fetchUrl?: string;
  /** React Query key for caching fetched options */
  queryKey?: string;
  /** Field name for the option value (default: "id") */
  valueField?: string;
  /** Field name for the option label (default: "name") */
  labelField?: string;
  /** Placeholder text when no items selected */
  placeholder?: string;
  /** Maximum number of items that can be selected */
  maxItems?: number;
  /** Minimum number of items that must be selected */
  minItems?: number;
  /** Whether to allow searching/filtering options */
  searchable?: boolean;
  /** Output format: "array" returns string[], "csv" returns comma-separated string */
  outputFormat?: "array" | "csv";
}

/**
 * Defines how a field should be validated
 */
export interface FieldValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
}

/**
 * Field-level permissions configuration
 * Controls visibility and editability of fields based on context or user roles
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
  /** Dynamic permission check function - receives current user context */
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
 * Configuration for a single form field
 */
export interface FieldConfig {
  /** Field name (used as form data key) */
  name: string;
  /** Display label for the field */
  label: string;
  /** Field type */
  type: FieldType;
  /** Placeholder text */
  placeholder?: string;
  /** Validation rules */
  validation?: FieldValidation;
  /** Whether this field auto-generates from another field (e.g., slug from name) */
  autoGenerateFrom?: string;
  /** Custom auto-generation function */
  autoGenerateFn?: (sourceValue: string) => string;
  /** Help text displayed below the field */
  helpText?: string;
  /** Whether the field is disabled by default */
  disabled?: boolean;
  /** For select fields: reference to parent entity type */
  parentEntityType?: string;
  /** For select fields: which field in parent to display */
  parentDisplayField?: string;
  /** For cascading selects: field name that this depends on */
  dependsOn?: string;
  /** For cascading selects: filter function based on dependent field */
  filterFn?: (item: any, dependentValue: any) => boolean;
  /** For file fields: file upload configuration */
  fileConfig?: FileFieldConfig;
  /** For rich text fields: editor configuration */
  richTextConfig?: RichTextFieldConfig;
  /** For multi-select fields: dropdown configuration */
  multiSelectConfig?: MultiSelectFieldConfig;
  /** Field-level permissions configuration */
  permissions?: FieldPermissions;
}

/**
 * Configuration for a table column
 */
export interface ColumnConfig {
  /** Column header text */
  header: string;
  /** Field name to display (supports dot notation for nested fields) */
  field?: string;
  /** Custom render function for the cell */
  renderFn?: (item: any, allData?: any) => ReactNode | string;
  /** CSS class for the column */
  className?: string;
  /** Alignment of column content */
  align?: "left" | "center" | "right";
  /** Width of the column */
  width?: string;
  /** Field-level permissions - controls column visibility */
  permissions?: FieldPermissions;
}

/**
 * Defines a parent relationship for an entity
 */
export interface ParentRelationship {
  /** Name of the parent entity type (e.g., "category", "subcategory") */
  entityType: string;
  /** Field name that stores the parent ID */
  fieldName: string;
  /** Display name for the parent (e.g., "Parent Category") */
  displayName: string;
  /** API endpoint to fetch parent options */
  endpoint: string;
  /** Field in parent entity to display in select dropdown */
  displayField: string;
  /** For cascading parents: which parent this depends on */
  dependsOn?: string;
  /** For cascading parents: how to filter based on parent selection */
  filterFn?: (item: any, parentValue: any) => boolean;
}

/**
 * API endpoint configuration
 */
export interface ApiEndpoints {
  /** Endpoint to list all entities (GET) */
  list: string;
  /** Endpoint to create entity (POST) */
  create: string;
  /** Endpoint to update entity (PATCH) - {id} will be replaced */
  update: string;
  /** Endpoint to delete entity (DELETE) - {id} will be replaced */
  delete: string;
  /** Additional query keys to invalidate on mutation */
  invalidateKeys?: string[];
}

/**
 * Display configuration for the CRUD manager
 */
export interface DisplayConfig {
  /** Singular entity name (e.g., "Category") */
  entityName: string;
  /** Plural entity name (e.g., "Categories") */
  entityNamePlural: string;
  /** Icon component from lucide-react */
  icon: LucideIcon;
  /** Manager title (e.g., "Category Manager") */
  title: string;
  /** Description text shown in card header */
  description: string;
  /** Prefix for data-testid attributes (e.g., "category" -> "category-manager") */
  testIdPrefix: string;
}

/**
 * Configuration for delete behavior
 */
export interface DeleteConfig {
  /** Field name that contains the count preventing deletion (e.g., "resourceCount") */
  protectionField?: string;
  /** Custom function to determine if delete should be disabled */
  isDisabledFn?: (item: any) => boolean;
  /** Warning message shown in delete dialog */
  warningMessage?: (item: any) => string | null;
  /** Confirmation message shown in delete dialog */
  confirmationMessage?: (item: any) => string;
}

/**
 * Main CRUD configuration interface
 */
export interface CrudConfig<TEntity = any, TFormData = any> {
  /** Display configuration */
  display: DisplayConfig;

  /** API endpoints */
  endpoints: ApiEndpoints;

  /** Form field definitions */
  fields: FieldConfig[];

  /** Table column definitions */
  columns: ColumnConfig[];

  /** Parent relationships (empty array for top-level entities) */
  parents: ParentRelationship[];

  /** Delete behavior configuration */
  deleteConfig?: DeleteConfig;

  /** Default form data values */
  defaultFormData: TFormData;

  /** Transform entity data for editing (entity -> form data) */
  entityToFormData?: (entity: TEntity, additionalData?: any) => TFormData;

  /** Transform form data for API submission (form data -> API payload) */
  formDataToPayload?: (formData: TFormData) => any;

  /** Validate form data before submission */
  validateFormData?: (formData: TFormData) => { valid: boolean; error?: string };
}

/**
 * Type for entity data with resource count
 */
export interface EntityWithCount {
  id: number;
  name: string;
  slug: string;
  resourceCount: number;
  [key: string]: any;
}

/**
 * Configuration for bulk operations (delete multiple, export)
 */
export interface BulkOperationsConfig {
  /** Enable bulk operations (default: false) */
  enabled?: boolean;
  /** Bulk delete API endpoint - if not provided, individual delete endpoints are called */
  bulkDeleteUrl?: string;
  /** Export formats to enable (default: ['csv', 'json']) */
  exportFormats?: Array<'csv' | 'json'>;
  /** Custom export filename (without extension) */
  exportFilename?: string;
  /** Fields to include in export (default: all visible columns) */
  exportFields?: string[];
}

/**
 * Export format types
 */
export type ExportFormat = 'csv' | 'json';

/**
 * Types of operations that can be undone/redone
 */
export type UndoableOperationType = 'create' | 'update' | 'delete';

/**
 * Record of an undoable operation
 */
export interface UndoableOperation<T = any> {
  /** Type of operation */
  type: UndoableOperationType;
  /** ID of the affected entity */
  entityId: number;
  /** Entity data before the operation (for update/delete) */
  previousData?: T;
  /** Entity data after the operation (for create/update) */
  newData?: T;
  /** Timestamp of the operation */
  timestamp: number;
}

/**
 * Configuration for undo/redo functionality
 */
export interface UndoRedoConfig {
  /** Enable undo/redo (default: false) */
  enabled?: boolean;
  /** Maximum history size (default: 50) */
  historyLimit?: number;
}
