# ResourceEditModal Component

A comprehensive resource editing modal built with React Hook Form and Zod validation.

## Overview

The `ResourceEditModal` component provides a full-featured form for editing any resource field including title, URL, description, category hierarchy (category, subcategory, sub-subcategory), and status. It includes real-time validation, loading states, and error handling.

## Features

- **Form Validation**: Zod schema validation with real-time error feedback
- **Category Hierarchy**: Cascading dropdowns for category, subcategory, and sub-subcategory
- **HTTPS Enforcement**: URL validation with HTTPS requirement
- **Character Limits**: Title (3-200 chars), Description (max 2000 chars)
- **Status Management**: Dropdown for pending/approved/rejected/archived
- **Loading States**: Disabled inputs during submission
- **Pre-filled Data**: Automatically loads resource data when opened
- **Responsive**: Works on desktop and mobile screens

## Installation

```bash
npm install react-hook-form @hookform/resolvers zod
```

## Props

```typescript
interface ResourceEditModalProps {
  resource: Resource | null;     // Resource to edit (null when closed)
  isOpen: boolean;                // Modal visibility state
  onClose: () => void;            // Called when modal should close
  onSave: (                       // Called when form is submitted
    resourceId: string,
    updates: Partial<Resource>
  ) => Promise<void>;
}
```

## Usage

### Basic Example

```tsx
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ResourceEditModal from "@/components/admin/ResourceEditModal";

function AdminPanel() {
  const [resource, setResource] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async ({ resourceId, updates }) => {
      return await apiRequest(`/api/admin/resources/${resourceId}`, {
        method: "PUT",
        body: JSON.stringify(updates),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
      toast({
        title: "Success",
        description: "Resource updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = async (resourceId, updates) => {
    await updateMutation.mutateAsync({ resourceId, updates });
  };

  return (
    <>
      <button onClick={() => {
        setResource(someResource);
        setIsOpen(true);
      }}>
        Edit Resource
      </button>

      <ResourceEditModal
        resource={resource}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSave={handleSave}
      />
    </>
  );
}
```

### Integration with PendingResources

```tsx
import ResourceEditModal from "@/components/admin/ResourceEditModal";

function PendingResources() {
  const [editResource, setEditResource] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const handleEditClick = (resource) => {
    setEditResource(resource);
    setEditModalOpen(true);
  };

  const handleSave = async (resourceId, updates) => {
    await apiRequest(`/api/resources/${resourceId}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  };

  return (
    <>
      {resources.map((resource) => (
        <div key={resource.id}>
          <h3>{resource.title}</h3>
          <button onClick={() => handleEditClick(resource)}>
            Edit
          </button>
        </div>
      ))}

      <ResourceEditModal
        resource={editResource}
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSave={handleSave}
      />
    </>
  );
}
```

## Form Fields

### 1. Title
- **Type**: Text input
- **Validation**: 3-200 characters
- **Required**: Yes

### 2. URL
- **Type**: URL input
- **Validation**: Valid HTTPS URL
- **Required**: Yes

### 3. Description
- **Type**: Textarea (4 rows)
- **Validation**: Max 2000 characters
- **Required**: No

### 4. Category
- **Type**: Dropdown select
- **Validation**: Must select a category
- **Required**: Yes
- **Behavior**: Resets subcategory and sub-subcategory when changed

### 5. Subcategory
- **Type**: Dropdown select
- **Validation**: None (optional)
- **Required**: No
- **Behavior**:
  - Disabled if no category selected
  - Filtered based on selected category
  - Resets sub-subcategory when changed

### 6. Sub-Subcategory
- **Type**: Dropdown select
- **Validation**: None (optional)
- **Required**: No
- **Behavior**:
  - Disabled if no subcategory selected
  - Filtered based on selected subcategory

### 7. Status
- **Type**: Dropdown select
- **Options**: pending, approved, rejected, archived
- **Required**: Yes

## Validation Rules

The component uses Zod for schema validation:

```typescript
const resourceEditSchema = z.object({
  title: z.string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title must be 200 characters or less"),
  url: z.string()
    .url("Please enter a valid URL")
    .refine((url) => url.startsWith("https://"), {
      message: "URL must use HTTPS protocol"
    }),
  description: z.string()
    .max(2000, "Description must be 2000 characters or less")
    .optional()
    .default(""),
  category: z.string().min(1, "Category is required"),
  subcategory: z.string().optional(),
  subSubcategory: z.string().optional(),
  status: z.enum(['pending', 'approved', 'rejected', 'archived']),
});
```

## API Queries

The component automatically fetches:

1. **Categories**: `GET /api/categories`
2. **Subcategories**: `GET /api/subcategories`
3. **Sub-Subcategories**: `GET /api/sub-subcategories`

All queries are enabled only when the modal is open (`enabled: isOpen`).

## State Management

### Form State
- Managed by React Hook Form
- Default values set when resource prop changes
- Form resets when modal closes

### Loading States
- Categories/subcategories/sub-subcategories loading
- Form submission in progress
- All inputs disabled during submission

### Reset Behavior
- Form resets when modal closes
- Subcategory resets when category changes
- Sub-subcategory resets when subcategory changes
- Form re-initializes when resource changes

## Error Handling

### Validation Errors
- Displayed below each field
- Real-time validation on input
- Prevents submission until all errors resolved

### API Errors
- Handled by parent component's `onSave` handler
- Component logs errors to console
- Modal remains open on error (parent decides whether to close)

## Styling

Uses shadcn/ui components with Tailwind CSS:

- `Dialog`: Modal container
- `Form`: React Hook Form wrapper
- `Input`: Text inputs
- `Textarea`: Description field
- `Select`: Dropdown selects
- `Button`: Action buttons

## Accessibility

- Proper ARIA labels via shadcn/ui Form components
- Keyboard navigation support
- Focus management in modal
- Error messages linked to inputs
- Disabled states clearly indicated

## TypeScript

Fully typed with TypeScript:

```typescript
import type { Resource } from "@shared/schema";

interface ResourceEditModalProps {
  resource: Resource | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (resourceId: string, updates: Partial<Resource>) => Promise<void>;
}
```

## Testing

### Test Cases

1. **Form Pre-fill**
   - Open modal with resource
   - Verify all fields populated correctly

2. **Validation**
   - Submit with empty title → Error
   - Submit with HTTP URL → Error
   - Submit with 201-char title → Error
   - Submit with 2001-char description → Error

3. **Category Cascade**
   - Select category → Subcategories enabled
   - Change category → Subcategory reset
   - Select subcategory → Sub-subcategories enabled
   - Change subcategory → Sub-subcategory reset

4. **Save Flow**
   - Fill valid data → Submit → onSave called
   - Verify correct updates object passed

5. **Cancel Flow**
   - Make changes → Cancel → Form reset
   - Modal closed → onClose called

## Performance Considerations

- Queries only enabled when modal is open
- Form resets on close to free memory
- Category filtering uses memoized values
- No unnecessary re-renders during typing

## Known Limitations

- Categories must be loaded before editing
- No support for creating new categories
- URL must be HTTPS (no HTTP fallback)
- Single resource edit only (no batch editing)

## Future Enhancements

- [ ] Bulk edit multiple resources
- [ ] AI-powered description generation
- [ ] URL preview/thumbnail
- [ ] Change history/audit log
- [ ] Undo/redo functionality
- [ ] Autosave drafts
- [ ] Tag management UI

## Dependencies

```json
{
  "react": "^18.3.0",
  "react-hook-form": "^7.x",
  "@hookform/resolvers": "^3.x",
  "zod": "^3.x",
  "@tanstack/react-query": "^5.x",
  "lucide-react": "^0.x",
  "@radix-ui/react-dialog": "^1.x",
  "@radix-ui/react-select": "^2.x",
  "@radix-ui/react-label": "^2.x"
}
```

## License

MIT

## Support

For issues or questions, please refer to the main project documentation or contact the development team.
