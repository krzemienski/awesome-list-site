# ResourceEditModal - Technical Architecture

## Component Hierarchy

```
ResourceEditModal
├─ Dialog (shadcn/ui)
│  └─ DialogContent
│     ├─ DialogHeader
│     │  ├─ DialogTitle ("Edit Resource")
│     │  └─ DialogDescription
│     ├─ External Link (view resource)
│     ├─ Form (React Hook Form)
│     │  ├─ FormField (Title)
│     │  │  ├─ FormLabel
│     │  │  ├─ FormControl → Input
│     │  │  ├─ FormDescription
│     │  │  └─ FormMessage
│     │  ├─ FormField (URL)
│     │  │  ├─ FormLabel
│     │  │  ├─ FormControl → Input[type=url]
│     │  │  ├─ FormDescription
│     │  │  └─ FormMessage
│     │  ├─ FormField (Description)
│     │  │  ├─ FormLabel
│     │  │  ├─ FormControl → Textarea
│     │  │  ├─ FormDescription
│     │  │  └─ FormMessage
│     │  ├─ FormField (Category)
│     │  │  ├─ FormLabel
│     │  │  ├─ Select
│     │  │  │  ├─ SelectTrigger
│     │  │  │  └─ SelectContent
│     │  │  │     └─ SelectItem[] (categories)
│     │  │  └─ FormMessage
│     │  ├─ FormField (Subcategory)
│     │  │  ├─ FormLabel
│     │  │  ├─ Select (filtered by category)
│     │  │  │  ├─ SelectTrigger
│     │  │  │  └─ SelectContent
│     │  │  │     ├─ SelectItem (None)
│     │  │  │     └─ SelectItem[] (filtered subcategories)
│     │  │  └─ FormMessage
│     │  ├─ FormField (Sub-Subcategory)
│     │  │  ├─ FormLabel
│     │  │  ├─ Select (filtered by subcategory)
│     │  │  │  ├─ SelectTrigger
│     │  │  │  └─ SelectContent
│     │  │  │     ├─ SelectItem (None)
│     │  │  │     └─ SelectItem[] (filtered sub-subcategories)
│     │  │  └─ FormMessage
│     │  └─ FormField (Status)
│     │     ├─ FormLabel
│     │     ├─ Select
│     │     │  ├─ SelectTrigger
│     │     │  └─ SelectContent
│     │     │     ├─ SelectItem (Pending)
│     │     │     ├─ SelectItem (Approved)
│     │     │     ├─ SelectItem (Rejected)
│     │     │     └─ SelectItem (Archived)
│     │     └─ FormMessage
│     └─ DialogFooter
│        ├─ Button (Cancel)
│        └─ Button (Save Changes)
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Parent Component                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   resource   │  │    isOpen    │  │  onSave()    │     │
│  │   (prop)     │  │    (prop)    │  │   (prop)     │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│              ResourceEditModal Component                    │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  useEffect (resource changes)                        │  │
│  │    └─> form.reset(resourceData)                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  useQuery('/api/categories')                         │  │
│  │    ├─> categories[] (enabled when isOpen)            │  │
│  │  useQuery('/api/subcategories')                      │  │
│  │    ├─> subcategories[] (enabled when isOpen)         │  │
│  │  useQuery('/api/sub-subcategories')                  │  │
│  │    └─> subSubcategories[] (enabled when isOpen)      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Form State (React Hook Form)                        │  │
│  │    ├─ title                                           │  │
│  │    ├─ url                                             │  │
│  │    ├─ description                                     │  │
│  │    ├─ category  ──┐                                   │  │
│  │    ├─ subcategory ├─> Cascading Logic                │  │
│  │    ├─ subSubcategory ┘                                │  │
│  │    └─ status                                          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Validation (Zod)                                     │  │
│  │    ├─ Title: min(3), max(200)                         │  │
│  │    ├─ URL: valid, HTTPS                               │  │
│  │    ├─ Description: max(2000)                          │  │
│  │    ├─ Category: required                              │  │
│  │    └─ Status: enum                                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  onSubmit()                                           │  │
│  │    ├─> Build updates object                           │  │
│  │    ├─> Call onSave(resourceId, updates)               │  │
│  │    └─> Close modal on success                         │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## State Management Flow

```
┌────────────────────────────────────────────────────────────┐
│                   Initial State                            │
│  resource: null                                            │
│  isOpen: false                                             │
└────────────────────────────────────────────────────────────┘
                         │
                         │ User clicks "Edit Resource"
                         ▼
┌────────────────────────────────────────────────────────────┐
│              Parent Sets State                             │
│  setResource(selectedResource)                             │
│  setIsOpen(true)                                           │
└────────────────────────────────────────────────────────────┘
                         │
                         │ Props update triggers useEffect
                         ▼
┌────────────────────────────────────────────────────────────┐
│            Modal Initialization                            │
│  1. Dialog opens                                           │
│  2. Queries fetch categories/subcategories                 │
│  3. Form resets with resource data                         │
│  4. Validation rules applied                               │
└────────────────────────────────────────────────────────────┘
                         │
                         │ User edits fields
                         ▼
┌────────────────────────────────────────────────────────────┐
│              Form Updates                                  │
│  1. onChange triggers for each field                       │
│  2. Validation runs in real-time                           │
│  3. Category changes trigger cascade:                      │
│     - selectedCategory changes                             │
│     - filteredSubcategories recalculated                   │
│     - subcategory/subSubcategory reset                     │
└────────────────────────────────────────────────────────────┘
                         │
                         │ User clicks "Save Changes"
                         ▼
┌────────────────────────────────────────────────────────────┐
│              Form Submission                               │
│  1. Validation check (Zod schema)                          │
│  2. If invalid: Show errors, prevent submit                │
│  3. If valid:                                              │
│     a. Build updates object                                │
│     b. Set formState.isSubmitting = true                   │
│     c. Call onSave(resourceId, updates)                    │
│     d. Wait for promise resolution                         │
└────────────────────────────────────────────────────────────┘
                         │
                         ├─> Success
                         │   └─> onClose() → Modal closes
                         │
                         └─> Error
                             └─> Log error, modal stays open
```

## Cascading Dropdown Logic

```
User selects Category "Encoding & Codecs"
  │
  ├─> selectedCategory = "Encoding & Codecs"
  │
  ├─> useEffect triggered (category change)
  │    ├─> form.setValue("subcategory", "")
  │    └─> form.setValue("subSubcategory", "")
  │
  ├─> filteredSubcategories calculation
  │    ├─> Find categoryObj where name = "Encoding & Codecs"
  │    ├─> Filter subcategories where categoryId = categoryObj.id
  │    └─> Result: ["Codecs", "Encoding Tools", ...]
  │
  └─> Subcategory dropdown enabled with filtered options

User selects Subcategory "Codecs"
  │
  ├─> selectedSubcategory = "Codecs"
  │
  ├─> useEffect triggered (subcategory change)
  │    └─> form.setValue("subSubcategory", "")
  │
  ├─> filteredSubSubcategories calculation
  │    ├─> Find subcategoryObj where name = "Codecs"
  │    ├─> Filter subSubcategories where subcategoryId = subcategoryObj.id
  │    └─> Result: ["AV1", "HEVC", "VP9", ...]
  │
  └─> Sub-Subcategory dropdown enabled with filtered options

User selects Sub-Subcategory "AV1"
  │
  └─> subSubcategory = "AV1"
      └─> Final hierarchy: Encoding & Codecs > Codecs > AV1
```

## Validation Flow

```
┌────────────────────────────────────────────────────────────┐
│                   Form Field Changed                       │
│  (e.g., user types in title field)                        │
└────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────┐
│          React Hook Form Controller                        │
│  1. Captures onChange event                                │
│  2. Updates form state                                     │
│  3. Triggers validation                                    │
└────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────┐
│               Zod Schema Validation                        │
│  resourceEditSchema.safeParse(formData)                    │
│    ├─ title: min(3), max(200)                              │
│    ├─ url: valid URL + HTTPS check                         │
│    ├─ description: max(2000)                               │
│    ├─ category: non-empty string                           │
│    └─ status: enum check                                   │
└────────────────────────────────────────────────────────────┘
                         │
                         ├─> Validation Success
                         │   └─> No error message shown
                         │       FormMessage = null
                         │
                         └─> Validation Failure
                             └─> Error message displayed
                                 FormMessage = "Error text"
                                 Field highlighted red
```

## Query Optimization

```
Modal Closed (isOpen = false)
  │
  ├─> Categories query: DISABLED
  ├─> Subcategories query: DISABLED
  └─> Sub-subcategories query: DISABLED
      └─> No API calls made

Modal Opens (isOpen = true)
  │
  ├─> Categories query: ENABLED
  │    ├─> Check cache
  │    ├─> If cached: Return immediately
  │    └─> If not: Fetch GET /api/categories
  │
  ├─> Subcategories query: ENABLED
  │    ├─> Check cache
  │    ├─> If cached: Return immediately
  │    └─> If not: Fetch GET /api/subcategories
  │
  └─> Sub-subcategories query: ENABLED
       ├─> Check cache
       ├─> If cached: Return immediately
       └─> If not: Fetch GET /api/sub-subcategories

Modal Closes (isOpen = false)
  │
  ├─> Queries disabled again
  └─> Data remains in cache (staleTime: 5min)
```

## Error Handling Strategy

```
┌────────────────────────────────────────────────────────────┐
│                   Error Sources                            │
├────────────────────────────────────────────────────────────┤
│  1. Validation Errors (Zod)                                │
│     └─> Handled by FormMessage component                   │
│         └─> Displayed below field                          │
│                                                             │
│  2. API Query Errors (categories/subcategories)            │
│     └─> TanStack Query error state                         │
│         └─> Component shows loading state                  │
│                                                             │
│  3. Submit Errors (onSave rejection)                       │
│     └─> try/catch in onSubmit()                            │
│         ├─> Logged to console                              │
│         └─> Parent handles toast notification              │
│                                                             │
│  4. Network Errors                                         │
│     └─> Caught by apiRequest wrapper                       │
│         └─> Propagated to parent's onSave handler          │
└────────────────────────────────────────────────────────────┘
```

## Performance Optimizations

1. **Conditional Queries**: Only fetch when modal open
2. **Query Caching**: TanStack Query caches for 5 minutes
3. **Memoized Filtering**: Category filters recalculated only on change
4. **Form Isolation**: Form state doesn't trigger parent re-renders
5. **Debounced Validation**: Real-time but efficient validation
6. **Reset on Close**: Form state cleared to free memory

## Accessibility Features

```
┌────────────────────────────────────────────────────────────┐
│              Accessibility Features                        │
├────────────────────────────────────────────────────────────┤
│  Dialog:                                                   │
│    ├─ aria-modal="true"                                    │
│    ├─ role="dialog"                                        │
│    └─ Escape key closes modal                              │
│                                                             │
│  Form Fields:                                              │
│    ├─ Labels properly linked (htmlFor)                     │
│    ├─ Error messages linked (aria-describedby)             │
│    ├─ Invalid state marked (aria-invalid)                  │
│    └─ Disabled state indicated                             │
│                                                             │
│  Keyboard Navigation:                                      │
│    ├─ Tab through all fields                               │
│    ├─ Enter submits form                                   │
│    ├─ Escape closes modal                                  │
│    └─ Arrow keys navigate selects                          │
│                                                             │
│  Focus Management:                                         │
│    ├─ Focus trapped in modal                               │
│    ├─ First field focused on open                          │
│    └─ Focus returned to trigger on close                   │
└────────────────────────────────────────────────────────────┘
```

## Testing Strategy

```
Unit Tests:
  ├─ Form validation rules
  ├─ Category filtering logic
  ├─ Reset behavior on close
  └─ Field value updates

Integration Tests:
  ├─ Form submission flow
  ├─ Category cascade behavior
  ├─ Query loading states
  └─ Error handling

E2E Tests:
  ├─ Open modal → Edit → Save
  ├─ Open modal → Edit → Cancel
  ├─ Validation error prevention
  └─ Category selection flow
```

This architecture ensures a robust, performant, and accessible resource editing experience!
