# Component Library Documentation

## Overview

This project uses [shadcn/ui](https://ui.shadcn.com/) as its component library foundation. shadcn/ui provides beautifully designed, accessible components built with Radix UI primitives and styled with Tailwind CSS.

All components follow these principles:
- **Accessible**: Built on Radix UI primitives with ARIA attributes
- **Customizable**: Styled with Tailwind CSS utility classes
- **Type-safe**: Full TypeScript support with proper prop types
- **Composable**: Can be combined and extended as needed

## Import Pattern

All UI components are imported from `@/components/ui/[component-name]`:

```tsx
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
```

## Utility Helper

All components use the `cn()` utility from `@/lib/utils` to merge Tailwind classes:

```tsx
import { cn } from "@/lib/utils"
```

---

## Core Components

### Button

Versatile button component with multiple variants and sizes.

**Import:**
```tsx
import { Button } from "@/components/ui/button"
```

**Props:**
- `variant`: `"default"` | `"destructive"` | `"outline"` | `"secondary"` | `"ghost"` | `"link"`
- `size`: `"default"` | `"sm"` | `"lg"` | `"icon"`
- `asChild`: boolean (renders as Slot component when true)

**Example:**
```tsx
// Default button
<Button>Click me</Button>

// Variant examples
<Button variant="destructive">Delete</Button>
<Button variant="outline">Cancel</Button>
<Button variant="ghost">Menu</Button>

// Size examples
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
<Button size="icon"><IconComponent /></Button>

// As child (polymorphic)
<Button asChild>
  <a href="/link">Link Button</a>
</Button>
```

---

### Card

Flexible card container with semantic sub-components.

**Import:**
```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from "@/components/ui/card"
```

**Components:**
- `Card`: Main container (`<article>` element)
- `CardHeader`: Header section with padding
- `CardTitle`: Styled heading (text-2xl, font-semibold)
- `CardDescription`: Muted text for descriptions
- `CardContent`: Main content area
- `CardFooter`: Footer section with flex layout

**Example:**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description text</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Main content goes here</p>
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

---

### Badge

Small label component for tags and status indicators.

**Import:**
```tsx
import { Badge } from "@/components/ui/badge"
```

**Props:**
- `variant`: `"default"` | `"secondary"` | `"destructive"` | `"outline"`

**Example:**
```tsx
<Badge>Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="destructive">Error</Badge>
<Badge variant="outline">Outlined</Badge>
```

---

### Input

Standard text input field.

**Import:**
```tsx
import { Input } from "@/components/ui/input"
```

**Props:**
- All standard HTML input attributes
- `type`: string (default: "text")

**Example:**
```tsx
<Input type="text" placeholder="Enter text..." />
<Input type="email" placeholder="Email address" />
<Input type="password" placeholder="Password" disabled />
```

---

### Textarea

Multi-line text input field.

**Import:**
```tsx
import { Textarea } from "@/components/ui/textarea"
```

**Props:**
- All standard HTML textarea attributes

**Example:**
```tsx
<Textarea placeholder="Enter your message..." />
<Textarea placeholder="Comments" rows={5} />
```

---

### Label

Accessible form label component.

**Import:**
```tsx
import { Label } from "@/components/ui/label"
```

**Example:**
```tsx
<div>
  <Label htmlFor="email">Email</Label>
  <Input id="email" type="email" />
</div>
```

---

### Checkbox

Custom checkbox input with checked indicator.

**Import:**
```tsx
import { Checkbox } from "@/components/ui/checkbox"
```

**Props:**
- Extends Radix UI Checkbox.Root props
- Includes `checked`, `onCheckedChange`, `disabled`, etc.

**Example:**
```tsx
<div className="flex items-center space-x-2">
  <Checkbox id="terms" />
  <Label htmlFor="terms">Accept terms and conditions</Label>
</div>
```

---

### Switch

Toggle switch component.

**Import:**
```tsx
import { Switch } from "@/components/ui/switch"
```

**Props:**
- Extends Radix UI Switch.Root props
- Includes `checked`, `onCheckedChange`, `disabled`, etc.

**Example:**
```tsx
<div className="flex items-center space-x-2">
  <Switch id="airplane-mode" />
  <Label htmlFor="airplane-mode">Airplane Mode</Label>
</div>
```

---

### Select

Dropdown select component with custom styling.

**Import:**
```tsx
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
  SelectSeparator
} from "@/components/ui/select"
```

**Example:**
```tsx
<Select>
  <SelectTrigger>
    <SelectValue placeholder="Select an option" />
  </SelectTrigger>
  <SelectContent>
    <SelectGroup>
      <SelectLabel>Fruits</SelectLabel>
      <SelectItem value="apple">Apple</SelectItem>
      <SelectItem value="banana">Banana</SelectItem>
      <SelectItem value="orange">Orange</SelectItem>
    </SelectGroup>
    <SelectSeparator />
    <SelectGroup>
      <SelectLabel>Vegetables</SelectLabel>
      <SelectItem value="carrot">Carrot</SelectItem>
    </SelectGroup>
  </SelectContent>
</Select>
```

---

### Dialog

Modal dialog component with overlay.

**Import:**
```tsx
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
```

**Example:**
```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
      <DialogDescription>
        This is a description of what the dialog is for.
      </DialogDescription>
    </DialogHeader>
    <div>Dialog content goes here</div>
    <DialogFooter>
      <Button variant="outline">Cancel</Button>
      <Button>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

### Alert

Notification and message display component.

**Import:**
```tsx
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
```

**Props:**
- `variant`: `"default"` | `"destructive"`

**Example:**
```tsx
<Alert>
  <AlertTitle>Heads up!</AlertTitle>
  <AlertDescription>
    You can add components to your app using the cli.
  </AlertDescription>
</Alert>

<Alert variant="destructive">
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>
    Your session has expired. Please log in again.
  </AlertDescription>
</Alert>
```

---

### Tabs

Tabbed interface component.

**Import:**
```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
```

**Example:**
```tsx
<Tabs defaultValue="account">
  <TabsList>
    <TabsTrigger value="account">Account</TabsTrigger>
    <TabsTrigger value="password">Password</TabsTrigger>
  </TabsList>
  <TabsContent value="account">
    Account settings content
  </TabsContent>
  <TabsContent value="password">
    Password settings content
  </TabsContent>
</Tabs>
```

---

### Tooltip

Hoverable tooltip component.

**Import:**
```tsx
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider
} from "@/components/ui/tooltip"
```

**Example:**
```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="outline">Hover me</Button>
    </TooltipTrigger>
    <TooltipContent>
      <p>Tooltip content</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

---

### Dropdown Menu

Feature-rich dropdown menu component.

**Import:**
```tsx
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent
} from "@/components/ui/dropdown-menu"
```

**Example:**
```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline">Open Menu</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuLabel>My Account</DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem>
      Profile
      <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
    </DropdownMenuItem>
    <DropdownMenuItem>Settings</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem>Log out</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

---

### Separator

Visual divider component.

**Import:**
```tsx
import { Separator } from "@/components/ui/separator"
```

**Props:**
- `orientation`: `"horizontal"` | `"vertical"` (default: "horizontal")
- `decorative`: boolean (default: true)

**Example:**
```tsx
<div>
  <div>Section 1</div>
  <Separator className="my-4" />
  <div>Section 2</div>
</div>

<div className="flex h-5 items-center space-x-4">
  <div>Item 1</div>
  <Separator orientation="vertical" />
  <div>Item 2</div>
</div>
```

---

### Skeleton

Loading placeholder component with animation.

**Import:**
```tsx
import { Skeleton } from "@/components/ui/skeleton"
```

**Example:**
```tsx
<div className="space-y-2">
  <Skeleton className="h-4 w-[250px]" />
  <Skeleton className="h-4 w-[200px]" />
  <Skeleton className="h-12 w-12 rounded-full" />
</div>
```

---

## Additional Components

The component library also includes these advanced components:

### Layout & Navigation
- **Accordion** - Collapsible content sections
- **Breadcrumb** - Navigation breadcrumbs
- **Collapsible** - Toggle visibility of content
- **Navigation Menu** - Complex navigation menus
- **Menubar** - Application menu bar
- **Sheet** - Side panel/drawer component
- **Sidebar** - Application sidebar

### Overlays & Popovers
- **Alert Dialog** - Confirmation dialogs
- **Popover** - Floating content container
- **Hover Card** - Content shown on hover
- **Context Menu** - Right-click menu

### Data Display
- **Table** - Styled table component
- **Avatar** - User avatar with fallback
- **Progress** - Progress indicator
- **Chart** - Chart components (via Recharts)
- **Calendar** - Date picker calendar
- **Carousel** - Image/content carousel

### Forms
- **Form** - Form wrapper with validation (React Hook Form)
- **Radio Group** - Radio button group
- **Slider** - Range slider input
- **Toggle** - Toggle button
- **Toggle Group** - Group of toggle buttons
- **Input OTP** - One-time password input

### Utilities
- **Scroll Area** - Custom scrollable area
- **Resizable** - Resizable panels
- **Aspect Ratio** - Maintain aspect ratio
- **Command** - Command palette/search
- **Toast** - Notification toasts
- **Drawer** - Mobile-friendly drawer

---

## Styling Patterns

### Using the `cn()` Utility

All components accept a `className` prop that is merged with default styles:

```tsx
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

<Button className="w-full">Full Width Button</Button>
<Button className={cn("mt-4", isActive && "bg-blue-500")}>
  Conditional Styles
</Button>
```

### Variant Pattern with CVA

Many components use `class-variance-authority` (CVA) for variant management:

```tsx
import { cva, type VariantProps } from "class-variance-authority"

const buttonVariants = cva(
  "base-classes",
  {
    variants: {
      variant: {
        default: "variant-classes",
        // ...
      },
      size: {
        default: "size-classes",
        // ...
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)
```

### Radix UI Integration

Components built on Radix UI primitives maintain their full API:

```tsx
// Dialog example showing Radix UI props
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  {/* ... */}
</Dialog>

// Select example showing Radix UI props
<Select value={value} onValueChange={setValue}>
  {/* ... */}
</Select>
```

---

## Accessibility

All components follow WAI-ARIA best practices:

- **Keyboard Navigation**: Full keyboard support
- **Screen Readers**: Proper ARIA labels and roles
- **Focus Management**: Visible focus indicators
- **Semantic HTML**: Appropriate HTML elements

### Example: Accessible Form

```tsx
<form>
  <div className="space-y-2">
    <Label htmlFor="email">Email</Label>
    <Input
      id="email"
      type="email"
      aria-describedby="email-description"
      required
    />
    <p id="email-description" className="text-sm text-muted-foreground">
      We'll never share your email.
    </p>
  </div>
</form>
```

---

## Theming

Components use CSS variables for theming (defined in `globals.css`):

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --primary: 221.2 83.2% 53.3%;
  /* ... */
}
```

### Dark Mode

Components automatically adapt to dark mode via the `dark` class:

```tsx
<html className="dark">
  {/* All components will use dark mode colors */}
</html>
```

---

## Best Practices

### 1. Component Composition

Build complex UIs by composing simple components:

```tsx
<Card>
  <CardHeader>
    <div className="flex items-center justify-between">
      <CardTitle>User Profile</CardTitle>
      <Badge>Active</Badge>
    </div>
    <CardDescription>Manage your account settings</CardDescription>
  </CardHeader>
  <CardContent>
    <form className="space-y-4">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" />
      </div>
    </form>
  </CardContent>
  <CardFooter>
    <Button className="w-full">Save Changes</Button>
  </CardFooter>
</Card>
```

### 2. Controlled vs Uncontrolled

Use controlled components for form validation:

```tsx
const [value, setValue] = useState("")

<Input
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>
```

### 3. Type Safety

Leverage TypeScript for prop validation:

```tsx
import { ButtonProps } from "@/components/ui/button"

const CustomButton = ({ variant = "default", ...props }: ButtonProps) => {
  return <Button variant={variant} {...props} />
}
```

### 4. Extending Components

Create custom variants while maintaining type safety:

```tsx
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

<Button className={cn(buttonVariants({ variant: "outline" }), "custom-class")}>
  Custom Button
</Button>
```

---

## Usage Patterns and Best Practices

### Accessibility Guidelines

#### Touch Target Sizes

All interactive elements must meet minimum touch target sizes for mobile accessibility:

```tsx
// ✅ Good - Meets 44px minimum
<Button size="default" className="min-h-[44px]">
  Click Me
</Button>

// ✅ Good - Icon button with proper size
<Button size="icon" className="min-h-[44px] min-w-[44px]">
  <Icon className="h-4 w-4" />
</Button>

// ❌ Bad - Too small for touch
<button className="h-6 w-6">X</button>
```

**Minimum sizes:**
- Default buttons: `min-h-[44px]`
- Icon buttons: `min-h-[44px] min-w-[44px]`
- Small buttons: `min-h-[44px]` (adjust padding instead of height)

#### ARIA Labels and Semantic HTML

Always provide proper ARIA labels and use semantic HTML:

```tsx
// ✅ Good - Proper ARIA label for icon-only button
<Button
  variant="ghost"
  size="icon"
  aria-label="Close dialog"
  title="Close dialog"
>
  <X className="h-4 w-4" />
</Button>

// ✅ Good - Semantic form structure
<form>
  <Label htmlFor="email">Email Address</Label>
  <Input
    id="email"
    type="email"
    aria-describedby="email-hint"
    required
  />
  <p id="email-hint" className="text-sm text-muted-foreground">
    We'll never share your email
  </p>
</form>

// ✅ Good - Data test IDs for testing
<Button
  data-testid="submit-button"
  aria-label="Submit form"
>
  Submit
</Button>
```

#### Keyboard Navigation

Ensure all interactive elements are keyboard accessible:

```tsx
// ✅ Good - Focus visible states
<Button className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
  Accessible Button
</Button>

// ✅ Good - Custom element with keyboard support
<div
  role="button"
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }}
>
  Custom Interactive Element
</div>
```

#### Screen Reader Support

Use descriptive text and hide decorative elements:

```tsx
// ✅ Good - Descriptive link text
<Button asChild>
  <a href="/resource/123">
    View React Documentation Details
  </a>
</Button>

// ✅ Good - Hidden decorative icon
<div>
  <ChevronRight className="h-4 w-4" aria-hidden="true" />
  <span>Next Step</span>
</div>

// ❌ Bad - Non-descriptive link
<a href="/resource/123">Click here</a>
```

### Event Handling Patterns

#### Click Event Propagation

Stop propagation when handling nested interactive elements:

```tsx
// ✅ Good - Prevents card click when clicking button
<Card onClick={handleCardClick}>
  <CardHeader>
    <CardTitle>{resource.name}</CardTitle>
  </CardHeader>
  <CardContent>
    <Button
      onClick={(e) => {
        e.stopPropagation();
        handleButtonClick();
      }}
    >
      Action
    </Button>
  </CardContent>
</Card>

// ✅ Good - Multiple action buttons in a card
<Card onClick={navigateToDetails}>
  <CardHeader>
    <div className="flex items-center gap-1">
      <FavoriteButton
        resourceId={id}
        onClick={(e) => e.stopPropagation()}
      />
      <BookmarkButton
        resourceId={id}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  </CardHeader>
</Card>
```

#### External Link Handling

Properly handle external links with security attributes:

```tsx
// ✅ Good - Secure external link
<Button asChild>
  <a
    href={resource.url}
    target="_blank"
    rel="noopener,noreferrer"
  >
    <ExternalLink className="h-4 w-4 mr-2" />
    Open Link
  </a>
</Button>

// ✅ Good - Programmatic external link
const handleExternalLink = (e: React.MouseEvent) => {
  e.stopPropagation();
  window.open(url, '_blank', 'noopener,noreferrer');
};
```

### Component Composition Patterns

#### Conditional Rendering with Authentication

Show different UI based on authentication state:

```tsx
import { useAuth } from "@/hooks/useAuth";

function ResourceActions({ resource }) {
  const { isAuthenticated } = useAuth();

  return (
    <div className="flex gap-2">
      {/* Always visible */}
      <Button variant="outline" onClick={handleShare}>
        <Share className="h-4 w-4 mr-2" />
        Share
      </Button>

      {/* Authenticated users only */}
      {isAuthenticated && (
        <>
          <FavoriteButton resourceId={resource.id} />
          <BookmarkButton resourceId={resource.id} />
        </>
      )}

      {/* Admin users only */}
      {isAuthenticated && user?.role === 'admin' && (
        <Button variant="destructive">Delete</Button>
      )}
    </div>
  );
}
```

#### Layout Composition

Use flexible layouts with proper spacing:

```tsx
// ✅ Good - Responsive grid layout
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {resources.map((resource) => (
    <ResourceCard key={resource.id} resource={resource} />
  ))}
</div>

// ✅ Good - Flex layout with spacing
<div className="flex flex-wrap items-center gap-2">
  {resource.tags?.slice(0, 3).map((tag) => (
    <Badge key={tag} variant="outline">#{tag}</Badge>
  ))}
  {resource.tags.length > 3 && (
    <span className="text-xs text-muted-foreground">
      +{resource.tags.length - 3} more
    </span>
  )}
</div>
```

#### Dynamic Class Composition

Use `cn()` for conditional styling:

```tsx
import { cn } from "@/lib/utils";

// ✅ Good - Conditional classes
<Card
  className={cn(
    "group hover:border-pink-500/50 transition-all cursor-pointer",
    isSelected && "border-pink-500 bg-pink-50",
    isDisabled && "opacity-50 pointer-events-none",
    className
  )}
>
  {/* ... */}
</Card>

// ✅ Good - State-based styling
<Button
  className={cn(
    "min-h-[44px]",
    isFavorited ? "text-pink-500" : "text-muted-foreground",
    isLoading && "animate-pulse"
  )}
>
  {/* ... */}
</Button>
```

### Performance Optimization

#### Component Memoization

Use React.memo for expensive components:

```tsx
import { memo } from "react";

// ✅ Good - Memoized card component
export const ResourceCard = memo(function ResourceCard({
  resource,
  onClick
}: ResourceCardProps) {
  // Component implementation
}, (prevProps, nextProps) => {
  // Custom comparison function
  return prevProps.resource.id === nextProps.resource.id &&
         prevProps.resource.isFavorited === nextProps.resource.isFavorited;
});

// ✅ Good - Memoized callback
const handleClick = useCallback(() => {
  setLocation(`/resource/${resource.id}`);
}, [resource.id, setLocation]);
```

#### Lazy Loading Images

Optimize image loading:

```tsx
// ✅ Good - Lazy loaded images
{fullResource?.metadata?.ogImage && (
  <div className="rounded-md overflow-hidden border">
    <img
      src={fullResource.metadata.ogImage}
      alt={fullResource.metadata.ogTitle || resource.name}
      className="w-full h-32 object-cover"
      loading="lazy"
    />
  </div>
)}
```

#### Text Clamping

Prevent layout shifts with text clamping:

```tsx
// ✅ Good - Clamp long text
<CardTitle className="text-lg line-clamp-1 flex-1 min-w-0">
  {resource.name}
</CardTitle>

<p className="text-sm text-muted-foreground line-clamp-2">
  {resource.description}
</p>
```

### Error Handling and Validation

#### Form Validation

Implement proper form validation:

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(2, "Name must be at least 2 characters"),
});

function MyForm() {
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", name: "" },
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          {...form.register("email")}
          aria-invalid={!!form.formState.errors.email}
        />
        {form.formState.errors.email && (
          <p className="text-sm text-destructive mt-1">
            {form.formState.errors.email.message}
          </p>
        )}
      </div>
    </form>
  );
}
```

#### Mutation Error Handling

Handle API errors gracefully:

```tsx
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

function FavoriteButton({ resourceId }) {
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: () => fetch(`/api/favorites/${resourceId}`, {
      method: 'POST'
    }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Resource favorited!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to favorite resource",
        variant: "destructive",
      });
    },
  });

  return (
    <Button
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
    >
      {mutation.isPending ? "Loading..." : "Favorite"}
    </Button>
  );
}
```

### Common Usage Scenarios

#### Loading States

Show appropriate loading UI:

```tsx
// ✅ Good - Loading skeleton
{isLoading && (
  <div className="space-y-2">
    <Skeleton className="h-4 w-[250px]" />
    <Skeleton className="h-4 w-[200px]" />
  </div>
)}

// ✅ Good - Loading button
<Button disabled={isPending}>
  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  {isPending ? "Saving..." : "Save"}
</Button>
```

#### Empty States

Provide helpful empty state messages:

```tsx
// ✅ Good - Informative empty state
{resources.length === 0 && (
  <Card className="p-12 text-center">
    <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
      <Search className="h-6 w-6 text-muted-foreground" />
    </div>
    <h3 className="text-lg font-semibold mb-2">No resources found</h3>
    <p className="text-muted-foreground mb-4">
      Try adjusting your search or filters
    </p>
    <Button onClick={clearFilters}>Clear Filters</Button>
  </Card>
)}
```

#### Error States

Display user-friendly error messages:

```tsx
// ✅ Good - Error alert
{isError && (
  <Alert variant="destructive">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Error</AlertTitle>
    <AlertDescription>
      {error?.message || "Something went wrong. Please try again."}
    </AlertDescription>
  </Alert>
)}
```

#### Confirmation Dialogs

Confirm destructive actions:

```tsx
// ✅ Good - Delete confirmation
<Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Are you sure?</DialogTitle>
      <DialogDescription>
        This action cannot be undone. This will permanently delete
        your resource.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline" onClick={() => setConfirmOpen(false)}>
        Cancel
      </Button>
      <Button
        variant="destructive"
        onClick={handleDelete}
      >
        Delete
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

#### Search with Debouncing

Optimize search performance:

```tsx
import { useState, useEffect } from "react";
import { useDebouncedCallback } from "use-debounce";

function SearchInput() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  const debouncedSearch = useDebouncedCallback(
    (searchQuery: string) => {
      // Perform search
      performSearch(searchQuery).then(setResults);
    },
    300
  );

  useEffect(() => {
    if (query.length >= 2) {
      debouncedSearch(query);
    } else {
      setResults([]);
    }
  }, [query, debouncedSearch]);

  return (
    <Input
      type="search"
      placeholder="Search resources..."
      value={query}
      onChange={(e) => setQuery(e.target.value)}
    />
  );
}
```

### Responsive Design Patterns

#### Mobile-First Approach

Use Tailwind's responsive prefixes:

```tsx
// ✅ Good - Mobile-first responsive design
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {/* Cards stack on mobile, 2 cols on tablet, 3 on desktop, 4 on xl */}
</div>

// ✅ Good - Responsive spacing
<Card className="p-4 md:p-6 lg:p-8">
  {/* Smaller padding on mobile */}
</Card>

// ✅ Good - Hide on mobile
<div className="hidden md:flex items-center gap-2">
  {/* Only shown on tablet and up */}
</div>
```

#### Touch-Friendly Interactions

Optimize for touch devices:

```tsx
// ✅ Good - Larger touch targets on mobile
<Button
  size="default"
  className="min-h-[44px] w-full sm:w-auto"
>
  Submit
</Button>

// ✅ Good - Simplified mobile layout
<CardFooter className="flex-col gap-2 sm:flex-row sm:gap-4">
  <Button className="w-full sm:w-auto">Primary</Button>
  <Button variant="outline" className="w-full sm:w-auto">
    Secondary
  </Button>
</CardFooter>
```

### Testing Best Practices

#### Data Test IDs

Add test IDs for reliable testing:

```tsx
// ✅ Good - Consistent test ID naming
<Button
  data-testid={`button-submit-${formId}`}
  onClick={handleSubmit}
>
  Submit
</Button>

<Card data-testid={`card-resource-${resource.id}`}>
  {/* ... */}
</Card>

// ✅ Good - Action-specific test IDs
<Button
  data-testid={`button-visit-${resource.id}`}
  onClick={handleVisit}
>
  Visit
</Button>

<Button
  data-testid={`button-suggest-edit-${resource.id}`}
  onClick={handleEdit}
>
  Edit
</Button>
```

#### Accessible Component Testing

Ensure components are testable:

```tsx
// ✅ Good - Testable with accessible queries
<form aria-label="Login form">
  <Label htmlFor="username">Username</Label>
  <Input
    id="username"
    name="username"
    aria-label="Username"
  />

  <Button type="submit" aria-label="Log in">
    Log In
  </Button>
</form>

// Can be tested with:
// screen.getByLabelText('Username')
// screen.getByRole('button', { name: 'Log in' })
```

---

## Custom Feature Components

These are application-specific components built using the core shadcn/ui components and tailored for the Awesome List site's functionality.

### SearchDialog

Global search dialog with fuzzy search powered by Fuse.js. Activated via Cmd+K / Ctrl+K keyboard shortcut.

**Import:**
```tsx
import SearchDialog from "@/components/ui/search-dialog"
```

**Props:**
```tsx
interface SearchDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  resources: Resource[];
}
```

**Features:**
- Fuzzy search across resource titles, descriptions, categories, and subcategories
- Keyboard shortcut support (Cmd+K / Ctrl+K)
- Real-time search results with 2-character minimum
- Analytics tracking for searches and clicks
- Opens results in new tabs
- Performance tracking for search operations

**Example:**
```tsx
const [searchOpen, setSearchOpen] = useState(false);

<SearchDialog
  isOpen={searchOpen}
  setIsOpen={setSearchOpen}
  resources={allResources}
/>
```

---

### ViewModeToggle

Toggle component for switching between grid, list, and compact view modes.

**Import:**
```tsx
import { ViewModeToggle } from "@/components/ui/view-mode-toggle"
```

**Props:**
```tsx
interface ViewModeToggleProps {
  value: ViewMode; // "grid" | "list" | "compact"
  onChange: (value: ViewMode) => void;
  className?: string;
}
```

**Features:**
- Three view mode options with corresponding icons
- Accessible toggle buttons with ARIA labels
- Test IDs for automated testing
- Custom styling support

**Example:**
```tsx
const [viewMode, setViewMode] = useState<ViewMode>("grid");

<ViewModeToggle
  value={viewMode}
  onChange={setViewMode}
  className="ml-auto"
/>
```

---

### AnalyticsDashboard

Comprehensive analytics dashboard with charts and metrics powered by Recharts.

**Import:**
```tsx
import AnalyticsDashboard from "@/components/ui/analytics-dashboard"
```

**Props:**
```tsx
interface AnalyticsDashboardProps {
  resources: Resource[];
  isOpen: boolean;
  onClose: () => void;
}
```

**Features:**
- Multiple analytics tabs (Overview, Categories, Resources, Activity)
- Interactive charts (bar, pie, line, area)
- Real-time data from localStorage tracking
- Popular resources and trending items
- Category distribution visualization
- Time-based usage patterns
- Search term analytics
- Export capabilities

**Analytics Tracked:**
- Total resources and categories
- View counts and click tracking
- Popular tags with percentages
- Category distribution
- Views and clicks trends
- Time of day usage patterns
- Search history and growth metrics

**Example:**
```tsx
const [dashboardOpen, setDashboardOpen] = useState(false);

<AnalyticsDashboard
  resources={allResources}
  isOpen={dashboardOpen}
  onClose={() => setDashboardOpen(false)}
/>
```

---

### AIRecommendationsPanel

AI-powered recommendation system using Claude API to suggest personalized resources.

**Import:**
```tsx
import AIRecommendationsPanel from "@/components/ui/ai-recommendations-panel"
```

**Props:**
```tsx
interface AIRecommendationsPanelProps {
  resources: Resource[];
}
```

**Features:**
- Personalized recommendations based on user profile
- Skill level-based filtering (beginner, intermediate, advanced)
- Category and tag preferences
- Learning goals integration
- Resource type preferences
- Time commitment options
- Confidence scoring for recommendations
- Feedback collection system
- Learning path suggestions

**User Profile Options:**
- **Skill Levels**: beginner, intermediate, advanced
- **Preferred Categories**: Multiple selection from available categories
- **Learning Goals**: Customizable learning objectives
- **Resource Types**: Documentation, tutorials, tools, libraries, etc.
- **Time Commitment**: daily, weekly, flexible

**Example:**
```tsx
<AIRecommendationsPanel resources={allResources} />
```

**Recommendation Result Structure:**
```tsx
interface RecommendationResult {
  resourceUrl: string;
  confidence: number;
  reasoning: string;
  learningPath?: string[];
  estimatedTime?: string;
  prerequisites?: string[];
  tags?: string[];
}
```

---

### CategoryExplorer

Advanced category browsing and exploration interface with filtering and search.

**Import:**
```tsx
import CategoryExplorer from "@/components/ui/category-explorer"
```

**Props:**
```tsx
interface CategoryExplorerProps {
  categories: Category[];
  resources: Resource[];
  className?: string;
}
```

**Features:**
- Real-time search across categories and resources
- Tag-based filtering with multi-select
- Multiple sort options (name, resource count, activity)
- Expandable/collapsible categories
- Subcategory display toggle
- Category statistics (resource count, subcategories, tags)
- Visual hierarchy with badges and icons
- External link support
- Responsive layout

**Sorting Options:**
- **Name**: Alphabetical order
- **Resource Count**: Number of resources per category
- **Activity**: Based on resource popularity

**Example:**
```tsx
<CategoryExplorer
  categories={allCategories}
  resources={allResources}
  className="mt-6"
/>
```

**Category Statistics Display:**
Each category shows:
- Total resource count
- Number of subcategories
- Unique tag count
- Expandable resource lists
- Quick links to resources

---

## Resource Components

### ResourceCard

A comprehensive card component for displaying individual resources with integrated favorite/bookmark functionality.

**Import:**
```tsx
import ResourceCard from "@/components/resource/ResourceCard"
```

**Props:**
```tsx
interface ResourceCardProps {
  resource: {
    id: string;
    name: string;
    url: string;
    description?: string;
    category?: string;
    tags?: string[];
    isFavorited?: boolean;
    isBookmarked?: boolean;
    favoriteCount?: number;
    bookmarkNotes?: string;
  };
  fullResource?: Resource;  // Optional full resource object with metadata
  className?: string;
  onClick?: () => void;     // Custom click handler
}
```

**Features:**
- Displays resource title, description, and URL
- Shows category and tag badges
- Integrates FavoriteButton and BookmarkButton (when user is authenticated)
- Displays scraped metadata (og:image, title, description) when available
- Responsive hover effects with pink border
- Click to view details or external link
- Suggest edit functionality for database resources
- Optimized with memo for performance

**Behavior:**
- **Database Resources** (numeric ID > 0): Click navigates to resource detail page
- **External Resources**: Click opens URL in new tab
- **Metadata Display**: Shows Open Graph images and scraped content when available
- **Authentication**: Action buttons only shown to authenticated users

**Example:**
```tsx
// Basic usage
<ResourceCard
  resource={{
    id: "123",
    name: "React Documentation",
    url: "https://react.dev",
    description: "Official React documentation",
    category: "Frontend",
    tags: ["react", "javascript"],
    isFavorited: true,
    isBookmarked: false,
    favoriteCount: 42
  }}
/>

// With full resource metadata
<ResourceCard
  resource={resourceSummary}
  fullResource={fullResourceData}
  className="shadow-lg"
/>

// With custom click handler
<ResourceCard
  resource={resource}
  onClick={() => handleCustomAction(resource.id)}
/>
```

**Visual Elements:**
- **Header**: Title with favorite/bookmark buttons
- **Description**: Two-line clamped text
- **Metadata Section**: OG image, scraped title/description (if available)
- **Badges**: "View Details" indicator, category badge, up to 3 tag badges
- **Actions**: "Open Link" button and suggest edit button

**Accessibility:**
- Semantic HTML with `<article>` element
- Proper ARIA labels on interactive elements
- Keyboard navigation support
- Focus indicators on hover

---

### FavoriteButton

Interactive button for favoriting/unfavoriting resources with optimistic updates and visual feedback.

**Import:**
```tsx
import FavoriteButton from "@/components/resource/FavoriteButton"
```

**Props:**
```tsx
interface FavoriteButtonProps {
  resourceId: string;
  isFavorited?: boolean;    // Initial favorited state
  favoriteCount?: number;   // Initial favorite count
  className?: string;
  size?: "sm" | "default" | "lg";
  showCount?: boolean;      // Display favorite count
}
```

**Features:**
- Optimistic UI updates for instant feedback
- Automatic query invalidation on success
- Heart icon with fill animation
- Favorite count display (optional)
- Ripple effect during mutation
- Toast notifications for success/error
- Hover scale animation
- Click event propagation stopping

**Styling:**
- **Unfavorited**: Ghost variant with default color
- **Favorited**: Pink text (`text-pink-500`) with filled heart
- **Hover**: Scale animation and pink hover color
- **Loading**: Ping animation with pink ripple

**Example:**
```tsx
// Default with count
<FavoriteButton
  resourceId="123"
  isFavorited={false}
  favoriteCount={42}
/>

// Small without count
<FavoriteButton
  resourceId="123"
  isFavorited={true}
  size="sm"
  showCount={false}
/>

// Large with custom styling
<FavoriteButton
  resourceId="123"
  favoriteCount={156}
  size="lg"
  className="hover:bg-pink-50"
/>
```

**API Integration:**
- `POST /api/favorites/:resourceId` - Add favorite
- `DELETE /api/favorites/:resourceId` - Remove favorite
- Invalidates queries: `/api/favorites`, `/api/resources/:id`

**State Management:**
- Uses TanStack Query mutations
- Optimistic updates with rollback on error
- Local state synced with server response
- Memoized for performance optimization

---

### BookmarkButton

Bookmark button with optional notes functionality and dialog interface.

**Import:**
```tsx
import BookmarkButton from "@/components/resource/BookmarkButton"
```

**Props:**
```tsx
interface BookmarkButtonProps {
  resourceId: string;
  isBookmarked?: boolean;   // Initial bookmarked state
  notes?: string;           // Existing bookmark notes
  className?: string;
  size?: "sm" | "default" | "lg";
  showNotesDialog?: boolean; // Show notes dialog on bookmark
}
```

**Features:**
- Add/remove bookmarks with single click
- Optional notes dialog for new bookmarks
- Save with or without notes
- Character limit (500) with counter
- Visual indicator when notes exist
- Optimistic UI updates
- Ripple effect during mutation
- Toast notifications
- Icon switching (BookmarkPlus → Bookmark filled)

**Notes Dialog:**
- Appears when creating new bookmark (if `showNotesDialog={true}`)
- Optional textarea for notes (max 500 characters)
- Two save options: "Save without notes" or "Save with notes"
- Character counter
- Responsive layout

**Styling:**
- **Unbookmarked**: BookmarkPlus icon with ghost variant
- **Bookmarked**: Filled Bookmark icon in cyan (`text-cyan-500`)
- **Has Notes**: Small notebook icon indicator
- **Loading**: Ping animation with cyan ripple

**Example:**
```tsx
// Basic usage
<BookmarkButton
  resourceId="123"
  isBookmarked={false}
/>

// With existing notes
<BookmarkButton
  resourceId="123"
  isBookmarked={true}
  notes="Great resource for learning React hooks"
/>

// Small without dialog
<BookmarkButton
  resourceId="123"
  size="sm"
  showNotesDialog={false}
/>

// Large with custom styling
<BookmarkButton
  resourceId="123"
  size="lg"
  className="hover:bg-cyan-50"
/>
```

**API Integration:**
- `POST /api/bookmarks/:resourceId` - Add bookmark (with optional notes)
- `DELETE /api/bookmarks/:resourceId` - Remove bookmark
- Invalidates queries: `/api/bookmarks`, `/api/resources/:id`

**User Flow:**
1. User clicks unbookmarked button
2. Notes dialog appears (if enabled)
3. User can add notes or skip
4. Bookmark saved with confirmation toast
5. Icon updates to filled state

---

### ShareButton

Share button with Web Share API support and clipboard fallback.

**Import:**
```tsx
import ShareButton from "@/components/resource/ShareButton"
```

**Props:**
```tsx
interface ShareButtonProps {
  resourceId: string;
  title?: string;           // Share title
  description?: string;     // Share description
  url?: string;             // URL to share (defaults to current page)
  className?: string;
  size?: "sm" | "default" | "lg";
}
```

**Features:**
- Native Web Share API when available
- Clipboard fallback for unsupported browsers
- Share URL, title, and description
- Loading state during share operation
- Toast notifications for success/error
- Graceful error handling
- Ripple effect during action
- Event propagation prevention

**Behavior:**
1. **Web Share API Available**: Opens native share dialog
2. **User Cancels Share**: Falls back to clipboard copy
3. **No Web Share API**: Directly copies URL to clipboard
4. **Copy Fails**: Shows error toast with manual copy instructions

**Styling:**
- Ghost variant button
- Blue ripple effect during operation (`bg-blue-500`)
- Hover scale animation
- Disabled state while sharing

**Example:**
```tsx
// Basic usage (shares current URL)
<ShareButton resourceId="123" />

// With custom share data
<ShareButton
  resourceId="123"
  title="React Documentation"
  description="Official React documentation and guides"
  url="https://react.dev"
/>

// Small size
<ShareButton
  resourceId="123"
  title="Awesome Resource"
  size="sm"
/>

// Custom styling
<ShareButton
  resourceId="123"
  className="hover:bg-blue-50"
  size="lg"
/>
```

**Share Data:**
- **title**: Resource name or custom title
- **text**: Description or default message
- **url**: Resource URL or current page URL

**Toast Messages:**
- **Share Success**: Native dialog (no toast)
- **Copy Success**: "Link copied - Resource link copied to clipboard"
- **Copy Failed**: "Unable to copy - Please copy the URL manually from the address bar"

---

### Resource Components Integration

These components work together seamlessly within ResourceCard:

**Example Integration:**
```tsx
<Card>
  <CardHeader>
    <div className="flex items-start justify-between">
      <CardTitle>{resource.name}</CardTitle>
      {isAuthenticated && (
        <div className="flex items-center gap-1">
          <FavoriteButton
            resourceId={resource.id}
            isFavorited={resource.isFavorited}
            favoriteCount={resource.favoriteCount}
            size="sm"
            showCount={false}
          />
          <BookmarkButton
            resourceId={resource.id}
            isBookmarked={resource.isBookmarked}
            notes={resource.bookmarkNotes}
            size="sm"
          />
        </div>
      )}
    </div>
  </CardHeader>
  <CardContent>
    {/* Resource content */}
  </CardContent>
</Card>
```

**Query Invalidation:**
All resource action buttons (favorite, bookmark) automatically invalidate related queries:
- `/api/favorites` - User's favorites list
- `/api/bookmarks` - User's bookmarks list
- `/api/resources/:id` - Specific resource details

**Authentication:**
Action buttons should only be rendered for authenticated users:
```tsx
import { useAuth } from "@/hooks/useAuth";

const { isAuthenticated } = useAuth();

{isAuthenticated && (
  <div className="flex gap-1">
    <FavoriteButton {...props} />
    <BookmarkButton {...props} />
    <ShareButton {...props} />
  </div>
)}
```

---

## Custom Component Patterns

### Analytics Integration

Custom components integrate with the analytics system for tracking user behavior:

```tsx
import { trackSearch, trackResourceClick, trackPerformance } from "@/lib/analytics"

// Track search queries
trackSearch(query, resultCount);

// Track resource clicks
trackResourceClick(resource.title, resource.url, resource.category);

// Track performance metrics
const startTime = performance.now();
// ... operation ...
trackPerformance('operation_name', performance.now() - startTime);
```

### User Profile Integration

Components that use user preferences integrate with the user profile hook:

```tsx
import { useUserProfile } from "@/hooks/use-user-profile"

const { userProfile } = useUserProfile();

// Access profile data
const skillLevel = userProfile.skillLevel;
const preferences = userProfile.preferredCategories;
const history = userProfile.viewHistory;
```

### AI Recommendations Hook

The AI recommendations feature uses a custom hook:

```tsx
import { useAIRecommendations } from "@/hooks/useAIRecommendations"

const {
  generateRecommendations,
  recommendations,
  isLoading,
  isError,
  error,
  isSuccess,
} = useAIRecommendations(undefined, { limit: 10 });

// Generate recommendations
generateRecommendations({
  userId: userProfile.userId,
  skillLevel: 'intermediate',
  preferredCategories: ['Encoding & Codecs'],
  // ... other preferences
});
```

### LocalStorage Persistence

Custom components persist data to localStorage for analytics and preferences:

```tsx
// Store view data
localStorage.setItem('resource-views', JSON.stringify(viewData));

// Store click data
localStorage.setItem('resource-clicks', JSON.stringify(clickData));

// Store search history
localStorage.setItem('search-history', JSON.stringify(searchHistory));

// Retrieve data
const views = localStorage.getItem('resource-views');
if (views) setViewData(JSON.parse(views));
```

---

## Resources

- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Radix UI Primitives](https://www.radix-ui.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Class Variance Authority](https://cva.style/)

---

## Related Documentation

- [DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md) - Design tokens, colors, and theming
- [Architecture Documentation](./ARCHITECTURE.md) - Project structure and patterns
