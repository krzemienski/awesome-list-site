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

## Resources

- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Radix UI Primitives](https://www.radix-ui.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Class Variance Authority](https://cva.style/)

---

## Related Documentation

- [DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md) - Design tokens, colors, and theming
- [Architecture Documentation](./ARCHITECTURE.md) - Project structure and patterns
