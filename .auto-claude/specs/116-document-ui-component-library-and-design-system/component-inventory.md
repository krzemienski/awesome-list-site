# shadcn/ui Component Inventory

This document catalogs all base shadcn/ui components used in the Awesome List Site project, documenting their props, variants, and usage patterns.

## Table of Contents
- [Accordion](#accordion)
- [Alert Dialog](#alert-dialog)
- [Alert](#alert)
- [Aspect Ratio](#aspect-ratio)
- [Avatar](#avatar)
- [Badge](#badge)
- [Breadcrumb](#breadcrumb)
- [Button](#button)
- [Calendar](#calendar)
- [Card](#card)
- [Carousel](#carousel)
- [Chart](#chart)
- [Checkbox](#checkbox)
- [Collapsible](#collapsible)
- [Command](#command)
- [Context Menu](#context-menu)
- [Dialog](#dialog)
- [Drawer](#drawer)
- [Dropdown Menu](#dropdown-menu)
- [Form](#form)
- [Hover Card](#hover-card)
- [Input OTP](#input-otp)
- [Input](#input)
- [Label](#label)
- [Menubar](#menubar)
- [Navigation Menu](#navigation-menu)
- [Popover](#popover)
- [Progress](#progress)
- [Radio Group](#radio-group)
- [Resizable](#resizable)
- [Scroll Area](#scroll-area)
- [Select](#select)
- [Separator](#separator)
- [Sheet](#sheet)
- [Skeleton](#skeleton)
- [Slider](#slider)
- [Switch](#switch)
- [Table](#table)
- [Tabs](#tabs)
- [Textarea](#textarea)
- [Toast](#toast)
- [Toggle Group](#toggle-group)
- [Toggle](#toggle)
- [Tooltip](#tooltip)

---

# Custom Feature Components

This section documents custom-built feature components that extend the base shadcn/ui library with application-specific functionality.

## Table of Contents - Custom Components
- [AI Recommendations Panel](#ai-recommendations-panel)
- [Analytics Dashboard](#analytics-dashboard)
- [Awesome List Explorer](#awesome-list-explorer)
- [Breadcrumbs](#breadcrumbs-custom)
- [Category Explorer](#category-explorer)
- [Export Tools](#export-tools)
- [List Switcher](#list-switcher)
- [Recommendation Feedback](#recommendation-feedback)
- [Recommendation Panel](#recommendation-panel)
- [Resource Card](#resource-card)
- [Bookmark Button](#bookmark-button)
- [Favorite Button](#favorite-button)
- [Share Button](#share-button)
- [Search Dialog](#search-dialog)
- [Suggest Edit Dialog](#suggest-edit-dialog)
- [Tag Filter](#tag-filter)
- [Theme Selector](#theme-selector)
- [User Preferences](#user-preferences)
- [View Mode Toggle](#view-mode-toggle)

---

## AI Recommendations Panel

Comprehensive AI-powered recommendations interface with form-based preference configuration.

**Components:**
- Main panel with multi-section form for user preferences

**Props:**
- `resources: Resource[]` - Available resources for recommendations
- Uses `useAIRecommendations` hook
- Uses `useUserProfile` hook

**Features:**
- Skill level selection (beginner, intermediate, advanced)
- Category preferences with checkboxes
- Learning goals selection
- Resource type preferences
- Time commitment configuration
- AI-generated recommendations display with confidence scores
- Feedback collection per recommendation
- Loading, error, and success states

**Usage:**
```tsx
<AIRecommendationsPanel resources={allResources} />
```

---

## Analytics Dashboard

Full-featured analytics and metrics dashboard with charts and statistics.

**Components:**
- Dashboard with multiple tabs and chart types
- Uses Recharts for visualizations (Bar, Pie, Line, Area charts)

**Props:**
- `resources: Resource[]` - Resources to analyze
- `isOpen: boolean` - Dialog open state
- `onClose: () => void` - Close handler

**Features:**
- Overview tab with key metrics
- Category distribution pie chart
- Popular resources with view/click tracking
- Views trend over time (line/area chart)
- Time of day usage patterns
- Search terms analytics
- Tag cloud visualization
- Multiple timeframe options (7d, 30d, 90d)

**Usage:**
```tsx
<AnalyticsDashboard
  resources={resources}
  isOpen={showAnalytics}
  onClose={() => setShowAnalytics(false)}
/>
```

---

## Awesome List Explorer

Dialog interface for discovering and switching between different awesome lists from GitHub.

**Components:**
- Dialog with search and category filtering
- List cards with metadata (stars, contributors, language)

**Props:**
- Internal state management with hooks
- Uses `useQuery` and `useMutation` from @tanstack/react-query

**Features:**
- Search awesome lists from GitHub
- Category-based filtering
- Display list metadata (stars, contributors, topics)
- Switch to different awesome list
- Load more pagination
- Mobile-responsive design

**Usage:**
```tsx
<AwesomeListExplorer />
```

---

## Breadcrumbs (Custom)

Navigation breadcrumb trail with home icon and chevron separators.

**Props:**
- `items: BreadcrumbItem[]` - Array of breadcrumb items
  - `label: string` - Display text
  - `href?: string` - Optional link (last item typically has no href)

**Usage:**
```tsx
<Breadcrumbs
  items={[
    { label: "Category", href: "/category/encoding" },
    { label: "Subcategory" }
  ]}
/>
```

---

## Category Explorer

Advanced category browsing interface with search, filtering, and statistics.

**Components:**
- Search and filter controls
- Category cards with resource previews
- Collapsible subcategory views

**Props:**
- `categories: Category[]` - Categories to display
- `resources: Resource[]` - All resources
- `className?: string` - Optional styling

**Features:**
- Full-text search across categories and resources
- Tag-based filtering
- Sort by name, resource count, or activity
- Show/hide subcategories toggle
- Resource count and tag statistics per category
- Quick preview of top resources
- Navigate to category/subcategory pages

**Usage:**
```tsx
<CategoryExplorer
  categories={categories}
  resources={resources}
/>
```

---

## Export Tools

Comprehensive export functionality supporting multiple file formats.

**Components:**
- Card interface with format selection and options
- Export configuration controls

**Props:**
- `awesomeList: AwesomeList` - List data to export
- `selectedCategory?: string` - Optional category filter
- `className?: string` - Optional styling

**Supported Formats:**
- Markdown (.md)
- JSON (.json)
- CSV (.csv)
- HTML (.html)
- YAML (.yaml)
- PDF (premium - shows alternative)

**Export Options:**
- Include/exclude descriptions, tags, categories
- Group by category
- Category filtering
- Export summary preview

**Usage:**
```tsx
<ExportTools
  awesomeList={list}
  selectedCategory="Encoding & Codecs"
/>
```

---

## List Switcher

Dialog for managing and switching between featured and custom awesome lists.

**Components:**
- Tabbed dialog (Browse Lists, Custom Lists)
- List cards with metadata
- Custom list management

**Props:**
- `currentList: AwesomeListConfig` - Active list
- `onListChange: (list: AwesomeListConfig) => void` - Switch handler
- `isOpen: boolean` - Dialog state
- `onClose: () => void` - Close handler

**Features:**
- Browse featured awesome lists
- Search and filter by category
- Add custom GitHub repositories
- Remove custom lists
- View list metadata (stars, contributors, language, topics)
- Persist custom lists to localStorage

**Usage:**
```tsx
<ListSwitcher
  currentList={activeList}
  onListChange={handleSwitch}
  isOpen={open}
  onClose={() => setOpen(false)}
/>
```

---

## Recommendation Feedback

Thumbs up/down feedback buttons for recommendations with optimistic updates.

**Components:**
- Memoized component with mutation handling

**Props:**
- `resourceId: number` - Resource identifier
- `userId?: string` - User identifier
- `className?: string` - Optional styling
- `size?: "sm" | "default" | "lg"` - Button size
- `showCount?: boolean` - Display feedback count
- `onFeedbackChange?: (feedback) => void` - Callback

**Features:**
- Thumbs up/down buttons with icons
- Optimistic UI updates
- Ripple animation on click
- Toggle feedback (click again to remove)
- Disabled state when not logged in
- Toast notifications
- Query invalidation for improved recommendations

**Usage:**
```tsx
<RecommendationFeedback
  resourceId={resource.id}
  userId={user.id}
  size="sm"
/>
```

---

## Recommendation Panel

AI-powered recommendation system with resources and learning paths.

**Components:**
- Tabbed interface (Resources, Learning Paths)
- Resource recommendation cards
- Learning path cards with detailed modals

**Props:**
- `userProfile: UserProfile` - User preferences and history
- `resources?: Resource[]` - Available resources
- `onResourceClick?: (resourceId: string) => void` - Click handler
- `onStartLearningPath?: (pathId: string) => void` - Path start handler

**Features:**
- Personalized resource recommendations with confidence scores
- AI-enhanced recommendations badge
- Learning path suggestions with:
  - Skill level badges
  - Duration estimates
  - Resource counts
  - Match scores and reasons
  - Prerequisites
  - Learning objectives
- Interaction tracking
- Sticky positioning for sidebar
- Loading states with skeletons

**Usage:**
```tsx
<RecommendationPanel
  userProfile={profile}
  resources={allResources}
  onResourceClick={handleClick}
  onStartLearningPath={handleStart}
/>
```

---

## Resource Card

Comprehensive card component for displaying resource information with interactive features.

**Components:**
- Card with header, content, and action buttons
- Integrated FavoriteButton, BookmarkButton, and SuggestEditDialog
- Conditional rendering based on resource type (DB vs. GitHub)

**Props:**
- `resource: object` - Resource display data
  - `id: string` - Resource identifier
  - `name: string` - Resource title
  - `url: string` - External resource URL
  - `description?: string` - Resource description
  - `category?: string` - Category name
  - `tags?: string[]` - Associated tags
  - `isFavorited?: boolean` - Favorite status
  - `isBookmarked?: boolean` - Bookmark status
  - `favoriteCount?: number` - Total favorites
  - `bookmarkNotes?: string` - User's bookmark notes
- `fullResource?: Resource` - Complete resource object with metadata
- `className?: string` - Optional styling
- `onClick?: () => void` - Custom click handler

**Features:**
- **Visual Design:**
  - Hover border animation (pink accent)
  - Line-clamped title and description
  - Badge display for category and tags
  - OG image preview from scraped metadata
  - Group hover effects
- **Interactive Elements:**
  - Click to view resource details (DB resources)
  - "Open Link" button with external link icon
  - "Suggest Edit" button (DB resources only)
  - Integrated favorite and bookmark buttons
- **Smart Behavior:**
  - Validates numeric resource ID for DB resources
  - Opens external URL for non-DB resources
  - Event propagation control for nested interactions
  - Scraped metadata display (title, description, image)
- **Accessibility:**
  - Semantic HTML structure
  - Test IDs for automation
  - ARIA labels on buttons
  - Keyboard navigation support

**Usage:**
```tsx
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
  fullResource={fullResourceObject}
/>
```

---

## Bookmark Button

Toggle button for bookmarking resources with optional notes dialog.

**Components:**
- Memoized button component
- Integrated notes dialog with textarea
- Optimistic updates with TanStack Query

**Props:**
- `resourceId: string` - Resource identifier
- `isBookmarked?: boolean` - Initial bookmark state (default: false)
- `notes?: string` - Initial bookmark notes (default: "")
- `className?: string` - Optional styling
- `size?: "sm" | "default" | "lg"` - Button size (default: "default")
- `showNotesDialog?: boolean` - Show notes dialog on bookmark (default: true)

**Features:**
- **Two-State Icon:**
  - Bookmark (filled) when bookmarked
  - BookmarkPlus (outline) when not bookmarked
  - NotebookPen indicator when notes exist
- **Notes Dialog:**
  - Optional textarea for bookmark notes (max 500 chars)
  - Character counter
  - "Save with notes" or "Save without notes" options
  - Gradient button styling (cyan)
- **State Management:**
  - Optimistic UI updates for instant feedback
  - Server sync with error rollback
  - Query invalidation for /api/bookmarks and resource
- **Visual Feedback:**
  - Ripple animation during mutation
  - Scale animation on hover
  - Toast notifications (success/error)
  - Cyan color theming
- **Accessibility:**
  - ARIA labels for screen readers
  - Disabled state during mutations
  - Keyboard navigation support
  - Test ID: "button-bookmark"

**Usage:**
```tsx
<BookmarkButton
  resourceId="123"
  isBookmarked={false}
  notes=""
  size="sm"
  showNotesDialog={true}
/>
```

---

## Favorite Button

Toggle button for favoriting resources with count display and optimistic updates.

**Components:**
- Memoized button component
- Heart icon with fill animation
- Optional favorite count display

**Props:**
- `resourceId: string` - Resource identifier
- `isFavorited?: boolean` - Initial favorite state (default: false)
- `favoriteCount?: number` - Initial favorite count (default: 0)
- `className?: string` - Optional styling
- `size?: "sm" | "default" | "lg"` - Button size (default: "default")
- `showCount?: boolean` - Display favorite count (default: true)

**Features:**
- **Dynamic Icon:**
  - Heart icon with fill when favorited
  - Outline when not favorited
  - Scale animation on hover (110%)
- **State Management:**
  - Optimistic updates for immediate feedback
  - Automatic count increment/decrement
  - Server sync with error rollback
  - Query invalidation for /api/favorites and resource
- **Visual Feedback:**
  - Ripple animation during mutation (pink)
  - Pink color theme when favorited
  - Toast notifications
  - Smooth transitions
- **Count Display:**
  - Shows count > 0 next to icon
  - Font-medium styling
  - Respects showCount prop
  - Updates optimistically
- **Accessibility:**
  - ARIA labels ("Add to favorites" / "Remove from favorites")
  - Disabled state during mutations
  - Keyboard navigation
  - Test ID: "button-favorite"

**Usage:**
```tsx
<FavoriteButton
  resourceId="123"
  isFavorited={true}
  favoriteCount={42}
  size="default"
  showCount={true}
/>
```

---

## Share Button

Share button with Web Share API fallback to clipboard copy.

**Components:**
- Simple button with share icon
- Progressive enhancement (Web Share API → Clipboard)

**Props:**
- `resourceId: string` - Resource identifier
- `title?: string` - Share title
- `description?: string` - Share description/text
- `url?: string` - URL to share (defaults to current page)
- `className?: string` - Optional styling
- `size?: "sm" | "default" | "lg"` - Button size (default: "default")

**Features:**
- **Progressive Sharing:**
  - Primary: Native Web Share API (mobile/supported browsers)
  - Fallback: Copy to clipboard
  - Double fallback: Manual copy instruction
- **Smart Behavior:**
  - Auto-detects Web Share API support
  - Handles user cancellation gracefully
  - Falls back to clipboard on share failure
  - Uses window.location.href if no URL provided
- **Visual Feedback:**
  - Ripple animation during share action (blue)
  - Scale animation on hover
  - Loading state during share
  - Toast notifications:
    - "Link copied" (clipboard)
    - "Unable to share" (error)
    - "Unable to copy" (clipboard error)
- **Share Metadata:**
  - Title: Passed or defaults to resource name
  - Text: Description or fallback message
  - URL: Custom or current page URL
- **Accessibility:**
  - ARIA label: "Share resource"
  - Disabled state while sharing
  - Keyboard navigation
  - Test ID: "button-share"

**Usage:**
```tsx
<ShareButton
  resourceId="123"
  title="React Documentation"
  description="Check out React Documentation"
  url="https://react.dev"
  size="sm"
/>
```

---

## Search Dialog

Global search dialog with fuzzy matching and keyboard shortcuts.

**Components:**
- Command palette style dialog
- Search results list with resource details

**Props:**
- `isOpen: boolean` - Dialog state
- `setIsOpen: (open: boolean) => void` - State setter
- `resources: Resource[]` - Searchable resources

**Features:**
- Fuzzy search using Fuse.js
- Global keyboard shortcut (Cmd/Ctrl + K)
- Search across title, description, category, subcategory
- Results preview with category breadcrumb
- Click result to open in new tab
- Search analytics tracking
- Performance monitoring
- Minimum 2 character search
- Top 15 results displayed
- Empty state messages

**Usage:**
```tsx
<SearchDialog
  isOpen={searchOpen}
  setIsOpen={setSearchOpen}
  resources={resources}
/>
```

---

## Suggest Edit Dialog

Community-driven resource editing interface with AI-powered assistance.

**Components:**
- Multi-step form with validation
- AI analysis integration
- Diff calculation display

**Props:**
- `resource: Resource` - Resource to edit
- `open: boolean` - Dialog state
- `onOpenChange: (open: boolean) => void` - State handler

**Features:**
- Form fields: title, URL, description, category, subcategory, sub-subcategory
- Zod validation schema
- AI-powered analysis (Claude)
- AI suggestion application
- Category/subcategory cascading selects
- Change diff calculation
- Authentication requirement
- Loading and error states
- Submission to admin review queue

**Usage:**
```tsx
<SuggestEditDialog
  resource={resource}
  open={editDialogOpen}
  onOpenChange={setEditDialogOpen}
/>
```

---

## Tag Filter

Popover-based tag filtering with counts and multi-select.

**Components:**
- Popover trigger button
- Checkbox list of tags
- Selected tag badges

**Props:**
- `resources: Resource[]` - Resources to extract tags from
- `selectedTags: string[]` - Active tag filters
- `onTagsChange: (tags: string[]) => void` - Selection handler

**Features:**
- Extract unique tags from resources
- Tag counts per resource
- Multi-select checkboxes
- Display selected tags as removable badges
- Clear all option
- "Filtered by:" label
- Scroll area for large tag lists

**Usage:**
```tsx
<TagFilter
  resources={resources}
  selectedTags={activeTags}
  onTagsChange={setActiveTags}
/>
```

---

## Theme Selector

Theme selection popover with light/dark/system modes and AI palette generator.

**Components:**
- Popover with theme mode buttons
- Color palette generator integration

**Props:**
- Uses `useTheme` hook
- No external props (self-contained)

**Features:**
- Light, Dark, System theme modes
- Visual selection with icons (Sun/Moon)
- Active theme highlighting
- Theme change analytics tracking
- AI Color Palette Generator button
- Transition animations

**Usage:**
```tsx
<ThemeSelector />
```

---

## User Preferences

Comprehensive user preference management dialog with multiple tabs.

**Components:**
- Multi-tab dialog (Profile, Interests, Goals, Style)
- Form controls with checkboxes and selects

**Props:**
- `userProfile: UserProfile` - Current user profile
- `onProfileUpdate: (profile: Partial<UserProfile>) => void` - Update handler
- `availableCategories: string[]` - Available category options
- `open?: boolean` - External dialog control
- `onOpenChange?: (open: boolean) => void` - External handler

**Features:**
- **Profile Tab:**
  - Skill level selection
  - Learning schedule (daily, weekly, flexible)
  - Profile statistics overview
- **Interests Tab:**
  - Category preferences with checkboxes
  - Selected category badges
- **Goals Tab:**
  - Quick add common learning goals
  - Custom goal input
  - Remove goals
- **Style Tab:**
  - Resource type preferences
  - Recommendation explainer

**Usage:**
```tsx
<UserPreferences
  userProfile={profile}
  onProfileUpdate={handleUpdate}
  availableCategories={categories}
/>
```

---

## View Mode Toggle

Toggle group for switching between grid, list, and compact view modes.

**Components:**
- ToggleGroup with three options

**Props:**
- `value: ViewMode` - Current mode ("grid" | "list" | "compact")
- `onChange: (value: ViewMode) => void` - Change handler
- `className?: string` - Optional styling

**Features:**
- Three view modes with icons:
  - Grid (LayoutGrid icon)
  - List (List icon)
  - Compact (LayoutList icon)
- Single selection only
- Active state styling
- Test IDs for automation

**Usage:**
```tsx
<ViewModeToggle
  value={viewMode}
  onChange={setViewMode}
/>
```

---

# Base shadcn/ui Components

---

## Accordion

Vertically stacked set of interactive headings that reveal associated content.

**Components:**
- `Accordion` - Root component from @radix-ui/react-accordion
- `AccordionItem` - Individual accordion item
- `AccordionTrigger` - Trigger button for accordion item
- `AccordionContent` - Content panel for accordion item

**Props:**
- `AccordionItem`: Extends Radix AccordionPrimitive.Item props
  - `className?: string`
- `AccordionTrigger`: Extends Radix AccordionPrimitive.Trigger props
  - `className?: string`
  - `children: ReactNode`
- `AccordionContent`: Extends Radix AccordionPrimitive.Content props
  - `className?: string`
  - `children: ReactNode`

**Usage:**
```tsx
<Accordion type="single" collapsible>
  <AccordionItem value="item-1">
    <AccordionTrigger>Section 1</AccordionTrigger>
    <AccordionContent>Content for section 1</AccordionContent>
  </AccordionItem>
</Accordion>
```

---

## Alert Dialog

Modal dialog that interrupts the user with important content and expects a response.

**Components:**
- `AlertDialog` - Root component
- `AlertDialogTrigger` - Trigger button
- `AlertDialogPortal` - Portal for rendering overlay/content
- `AlertDialogOverlay` - Background overlay
- `AlertDialogContent` - Dialog content container
- `AlertDialogHeader` - Header section
- `AlertDialogFooter` - Footer section for actions
- `AlertDialogTitle` - Dialog title
- `AlertDialogDescription` - Dialog description
- `AlertDialogAction` - Action button (styled with button variants)
- `AlertDialogCancel` - Cancel button (styled with outline variant)

**Props:**
- All components extend their respective Radix UI primitive props
- `AlertDialogHeader`, `AlertDialogFooter`: `React.HTMLAttributes<HTMLDivElement>`
- `AlertDialogAction`, `AlertDialogCancel`: Automatically styled with buttonVariants

**Usage:**
```tsx
<AlertDialog>
  <AlertDialogTrigger>Delete</AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
      <AlertDialogDescription>
        This action cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction>Delete</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## Alert

Displays a callout for user attention.

**Components:**
- `Alert` - Container component
- `AlertTitle` - Alert title
- `AlertDescription` - Alert description

**Props:**
- `Alert`: Extends `React.HTMLAttributes<HTMLDivElement>`
  - `variant?: "default" | "destructive"`
  - `className?: string`

**Variants:**
- `default` - Standard alert with default background
- `destructive` - Red/destructive styling for errors

**Usage:**
```tsx
<Alert variant="destructive">
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>
    Something went wrong. Please try again.
  </AlertDescription>
</Alert>
```

---

## Aspect Ratio

Displays content within a desired ratio.

**Components:**
- `AspectRatio` - Direct export from @radix-ui/react-aspect-ratio

**Props:**
- Extends Radix AspectRatioPrimitive.Root props
- `ratio?: number` - The desired aspect ratio (e.g., 16/9)

**Usage:**
```tsx
<AspectRatio ratio={16 / 9}>
  <img src="..." alt="..." />
</AspectRatio>
```

---

## Avatar

An image element with a fallback for representing the user.

**Components:**
- `Avatar` - Container component
- `AvatarImage` - Image element
- `AvatarFallback` - Fallback content (initials, icon, etc.)

**Props:**
- All extend their respective Radix UI primitive props
- Default size: `h-10 w-10` (40px)
- Shape: circular (`rounded-full`)

**Usage:**
```tsx
<Avatar>
  <AvatarImage src="/avatar.jpg" alt="User" />
  <AvatarFallback>JD</AvatarFallback>
</Avatar>
```

---

## Badge

Displays a badge or tag.

**Components:**
- `Badge` - Badge component

**Props:**
- Extends `React.HTMLAttributes<HTMLDivElement>`
- `variant?: "default" | "secondary" | "destructive" | "outline"`
- `className?: string`

**Variants:**
- `default` - Primary badge with primary background
- `secondary` - Secondary badge with muted background
- `destructive` - Red/destructive badge for errors
- `outline` - Outlined badge with border only

**Usage:**
```tsx
<Badge variant="secondary">New</Badge>
<Badge variant="destructive">Error</Badge>
```

---

## Breadcrumb

Displays the path to the current resource using a hierarchy of links.

**Components:**
- `Breadcrumb` - Root nav component
- `BreadcrumbList` - Ordered list container
- `BreadcrumbItem` - Individual breadcrumb item
- `BreadcrumbLink` - Link element (supports asChild pattern)
- `BreadcrumbPage` - Current page (non-clickable)
- `BreadcrumbSeparator` - Separator between items (default: ChevronRight)
- `BreadcrumbEllipsis` - Ellipsis for collapsed items

**Props:**
- `Breadcrumb`: Extends `React.ComponentPropsWithoutRef<"nav">`
  - `separator?: React.ReactNode`
- `BreadcrumbLink`:
  - `asChild?: boolean` - Use Slot pattern for custom link components

**Usage:**
```tsx
<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem>
      <BreadcrumbLink href="/">Home</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbPage>Current</BreadcrumbPage>
    </BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>
```

---

## Button

Displays a button or a component that looks like a button.

**Components:**
- `Button` - Button component
- `buttonVariants` - CVA variants function (exported for reuse)

**Props:**
- Extends `React.ButtonHTMLAttributes<HTMLButtonElement>`
- `variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"`
- `size?: "default" | "sm" | "lg" | "icon"`
- `asChild?: boolean` - Use Slot pattern
- `className?: string`

**Variants:**
- `default` - Primary button with primary background
- `destructive` - Red/destructive button
- `outline` - Outlined button with border
- `secondary` - Secondary button with muted background
- `ghost` - Transparent button with hover effect
- `link` - Text button styled as link

**Sizes:**
- `default` - `min-h-[44px] px-4 py-2`
- `sm` - `min-h-[44px] px-3`
- `lg` - `min-h-[48px] px-8`
- `icon` - `min-h-[44px] min-w-[44px]`

**Usage:**
```tsx
<Button variant="default" size="lg">Click me</Button>
<Button variant="outline" size="icon">
  <Icon />
</Button>
```

---

## Calendar

A date picker calendar component.

**Components:**
- `Calendar` - Calendar component (wraps react-day-picker)

**Props:**
- Extends `React.ComponentProps<typeof DayPicker>`
- `showOutsideDays?: boolean` - Default: true
- `className?: string`
- `classNames?: object` - Custom class names for DayPicker parts

**Features:**
- Supports single and range selection
- Customized with buttonVariants for navigation
- Integrated with form components

**Usage:**
```tsx
<Calendar
  mode="single"
  selected={date}
  onSelect={setDate}
/>
```

---

## Card

Displays a card with header, content, and footer.

**Components:**
- `Card` - Container (renders as `<article>`)
- `CardHeader` - Header section
- `CardTitle` - Title (renders as styled `<div>`)
- `CardDescription` - Description with muted text
- `CardContent` - Main content area
- `CardFooter` - Footer section

**Props:**
- All extend `React.HTMLAttributes<HTMLDivElement>` (except Card which extends `React.HTMLAttributes<HTMLElement>`)
- `className?: string`

**Usage:**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>Content here</CardContent>
  <CardFooter>Footer content</CardFooter>
</Card>
```

---

## Carousel

A carousel component built with Embla Carousel.

**Components:**
- `Carousel` - Root container with context
- `CarouselContent` - Slides container
- `CarouselItem` - Individual slide
- `CarouselPrevious` - Previous button
- `CarouselNext` - Next button

**Props:**
- `Carousel`:
  - `opts?: CarouselOptions` - Embla carousel options
  - `plugins?: CarouselPlugin`
  - `orientation?: "horizontal" | "vertical"`
  - `setApi?: (api: CarouselApi) => void`
- `CarouselPrevious`, `CarouselNext`: Extend Button props

**Hooks:**
- `useCarousel()` - Access carousel context

**Usage:**
```tsx
<Carousel>
  <CarouselContent>
    <CarouselItem>Slide 1</CarouselItem>
    <CarouselItem>Slide 2</CarouselItem>
  </CarouselContent>
  <CarouselPrevious />
  <CarouselNext />
</Carousel>
```

---

## Chart

Chart components built with Recharts.

**Components:**
- `ChartContainer` - Container with config and responsive wrapper
- `ChartTooltip` - Recharts Tooltip wrapper
- `ChartTooltipContent` - Custom tooltip content
- `ChartLegend` - Recharts Legend wrapper
- `ChartLegendContent` - Custom legend content
- `ChartStyle` - Injects CSS variables for theming

**Props:**
- `ChartContainer`:
  - `config: ChartConfig` - Chart configuration
  - `children: ReactNode` - Recharts components
- `ChartTooltipContent`:
  - `hideLabel?: boolean`
  - `hideIndicator?: boolean`
  - `indicator?: "line" | "dot" | "dashed"`
  - `nameKey?: string`
  - `labelKey?: string`

**Types:**
- `ChartConfig` - Configuration object with labels, colors, and theme support

**Usage:**
```tsx
<ChartContainer config={chartConfig}>
  <BarChart data={data}>
    <ChartTooltip content={<ChartTooltipContent />} />
  </BarChart>
</ChartContainer>
```

---

## Checkbox

A control that allows the user to toggle between checked and not checked.

**Components:**
- `Checkbox` - Checkbox component

**Props:**
- Extends Radix CheckboxPrimitive.Root props
- `className?: string`
- `checked?: boolean | "indeterminate"`
- `onCheckedChange?: (checked: boolean) => void`

**Usage:**
```tsx
<Checkbox
  checked={checked}
  onCheckedChange={setChecked}
/>
```

---

## Collapsible

An interactive component which expands/collapses a panel.

**Components:**
- `Collapsible` - Root component
- `CollapsibleTrigger` - Trigger button
- `CollapsibleContent` - Collapsible content

**Props:**
- All are direct exports from @radix-ui/react-collapsible

**Usage:**
```tsx
<Collapsible>
  <CollapsibleTrigger>Toggle</CollapsibleTrigger>
  <CollapsibleContent>
    Hidden content
  </CollapsibleContent>
</Collapsible>
```

---

## Command

Fast, composable, command menu.

**Components:**
- `Command` - Root component (from cmdk)
- `CommandDialog` - Command in a dialog
- `CommandInput` - Search input with icon
- `CommandList` - Scrollable list container
- `CommandEmpty` - Empty state
- `CommandGroup` - Group of items
- `CommandItem` - Individual item
- `CommandSeparator` - Separator between groups
- `CommandShortcut` - Keyboard shortcut display

**Props:**
- All extend their respective cmdk primitive props
- `CommandDialog`: Extends DialogProps

**Usage:**
```tsx
<Command>
  <CommandInput placeholder="Search..." />
  <CommandList>
    <CommandEmpty>No results found.</CommandEmpty>
    <CommandGroup heading="Suggestions">
      <CommandItem>Item 1</CommandItem>
      <CommandItem>Item 2</CommandItem>
    </CommandGroup>
  </CommandList>
</Command>
```

---

## Context Menu

Displays a menu to the user when right-clicking.

**Components:**
- `ContextMenu` - Root component
- `ContextMenuTrigger` - Trigger area
- `ContextMenuContent` - Menu content
- `ContextMenuItem` - Menu item
- `ContextMenuCheckboxItem` - Checkbox menu item
- `ContextMenuRadioItem` - Radio menu item
- `ContextMenuRadioGroup` - Radio group container
- `ContextMenuLabel` - Label for sections
- `ContextMenuSeparator` - Separator
- `ContextMenuShortcut` - Keyboard shortcut
- `ContextMenuSub` - Submenu root
- `ContextMenuSubTrigger` - Submenu trigger
- `ContextMenuSubContent` - Submenu content

**Props:**
- `ContextMenuItem`, `ContextMenuSubTrigger`, `ContextMenuLabel`:
  - `inset?: boolean` - Add left padding for alignment
- `ContextMenuCheckboxItem`:
  - `checked?: boolean`

**Usage:**
```tsx
<ContextMenu>
  <ContextMenuTrigger>Right click me</ContextMenuTrigger>
  <ContextMenuContent>
    <ContextMenuItem>Edit</ContextMenuItem>
    <ContextMenuItem>Delete</ContextMenuItem>
  </ContextMenuContent>
</ContextMenu>
```

---

## Dialog

A window overlaid on either the primary window or another dialog window.

**Components:**
- `Dialog` - Root component
- `DialogTrigger` - Trigger button
- `DialogPortal` - Portal for rendering
- `DialogOverlay` - Background overlay
- `DialogClose` - Close button primitive
- `DialogContent` - Dialog content (includes close button)
- `DialogHeader` - Header section
- `DialogFooter` - Footer section
- `DialogTitle` - Dialog title
- `DialogDescription` - Dialog description

**Props:**
- All extend their respective Radix UI primitive props
- `DialogHeader`, `DialogFooter`: `React.HTMLAttributes<HTMLDivElement>`

**Usage:**
```tsx
<Dialog>
  <DialogTrigger>Open</DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
      <DialogDescription>Description</DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button>Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## Drawer

A drawer component for mobile and desktop (uses Vaul).

**Components:**
- `Drawer` - Root component
- `DrawerTrigger` - Trigger button
- `DrawerPortal` - Portal for rendering
- `DrawerOverlay` - Background overlay
- `DrawerClose` - Close button primitive
- `DrawerContent` - Drawer content (includes handle)
- `DrawerHeader` - Header section
- `DrawerFooter` - Footer section
- `DrawerTitle` - Drawer title
- `DrawerDescription` - Drawer description

**Props:**
- `Drawer`:
  - `shouldScaleBackground?: boolean` - Default: true
- All other components extend their Vaul primitive props

**Usage:**
```tsx
<Drawer>
  <DrawerTrigger>Open</DrawerTrigger>
  <DrawerContent>
    <DrawerHeader>
      <DrawerTitle>Title</DrawerTitle>
    </DrawerHeader>
    <DrawerFooter>
      <Button>Action</Button>
    </DrawerFooter>
  </DrawerContent>
</Drawer>
```

---

## Dropdown Menu

Displays a menu to the user triggered by a button.

**Components:**
- `DropdownMenu` - Root component
- `DropdownMenuTrigger` - Trigger button
- `DropdownMenuContent` - Menu content
- `DropdownMenuItem` - Menu item
- `DropdownMenuCheckboxItem` - Checkbox menu item
- `DropdownMenuRadioItem` - Radio menu item
- `DropdownMenuRadioGroup` - Radio group container
- `DropdownMenuLabel` - Label for sections
- `DropdownMenuSeparator` - Separator
- `DropdownMenuShortcut` - Keyboard shortcut
- `DropdownMenuGroup` - Group container
- `DropdownMenuSub` - Submenu root
- `DropdownMenuSubTrigger` - Submenu trigger
- `DropdownMenuSubContent` - Submenu content

**Props:**
- `DropdownMenuContent`:
  - `sideOffset?: number` - Default: 4
- `DropdownMenuItem`, `DropdownMenuSubTrigger`, `DropdownMenuLabel`:
  - `inset?: boolean` - Add left padding for alignment
- `DropdownMenuCheckboxItem`:
  - `checked?: boolean`

**Usage:**
```tsx
<DropdownMenu>
  <DropdownMenuTrigger>Options</DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>Edit</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem>Delete</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

---

## Form

Form components built with react-hook-form.

**Components:**
- `Form` - FormProvider wrapper
- `FormField` - Field controller with context
- `FormItem` - Field container
- `FormLabel` - Field label
- `FormControl` - Input control wrapper (Slot)
- `FormDescription` - Field description
- `FormMessage` - Validation message

**Props:**
- `FormField`: ControllerProps from react-hook-form
- All other components extend their base HTML element props

**Hooks:**
- `useFormField()` - Access field context and state

**Usage:**
```tsx
<Form {...form}>
  <FormField
    control={form.control}
    name="username"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Username</FormLabel>
        <FormControl>
          <Input {...field} />
        </FormControl>
        <FormDescription>Your public username</FormDescription>
        <FormMessage />
      </FormItem>
    )}
  />
</Form>
```

---

## Hover Card

For sighted users to preview content available behind a link.

**Components:**
- `HoverCard` - Root component
- `HoverCardTrigger` - Trigger element
- `HoverCardContent` - Card content

**Props:**
- `HoverCardContent`:
  - `align?: "start" | "center" | "end"` - Default: "center"
  - `sideOffset?: number` - Default: 4

**Usage:**
```tsx
<HoverCard>
  <HoverCardTrigger>Hover me</HoverCardTrigger>
  <HoverCardContent>
    Preview content here
  </HoverCardContent>
</HoverCard>
```

---

## Input OTP

Accessible one-time password component (uses input-otp).

**Components:**
- `InputOTP` - Root component
- `InputOTPGroup` - Group of slots
- `InputOTPSlot` - Individual digit slot
- `InputOTPSeparator` - Separator between groups

**Props:**
- `InputOTP`: Extends OTPInput props
  - `containerClassName?: string`
- `InputOTPSlot`:
  - `index: number` - Slot index (required)

**Usage:**
```tsx
<InputOTP maxLength={6}>
  <InputOTPGroup>
    <InputOTPSlot index={0} />
    <InputOTPSlot index={1} />
    <InputOTPSlot index={2} />
  </InputOTPGroup>
  <InputOTPSeparator />
  <InputOTPGroup>
    <InputOTPSlot index={3} />
    <InputOTPSlot index={4} />
    <InputOTPSlot index={5} />
  </InputOTPGroup>
</InputOTP>
```

---

## Input

Displays a form input field.

**Components:**
- `Input` - Input component

**Props:**
- Extends `React.ComponentProps<"input">`
- `type?: string`
- `className?: string`

**Styling:**
- Height: `h-10`
- Border radius: `rounded-lg`
- Focus ring with offset
- File input styling

**Usage:**
```tsx
<Input type="email" placeholder="Email" />
<Input type="password" placeholder="Password" />
```

---

## Label

Renders an accessible label associated with controls.

**Components:**
- `Label` - Label component

**Props:**
- Extends Radix LabelPrimitive.Root props
- `className?: string`

**Features:**
- Peer disabled styling
- Medium font weight
- Small text size

**Usage:**
```tsx
<Label htmlFor="email">Email</Label>
<Input id="email" type="email" />
```

---

## Menubar

A visually persistent menu common in desktop applications.

**Components:**
- `Menubar` - Root component
- `MenubarMenu` - Menu container
- `MenubarTrigger` - Menu trigger
- `MenubarContent` - Menu content
- `MenubarItem` - Menu item
- `MenubarCheckboxItem` - Checkbox menu item
- `MenubarRadioItem` - Radio menu item
- `MenubarRadioGroup` - Radio group container
- `MenubarLabel` - Label for sections
- `MenubarSeparator` - Separator
- `MenubarShortcut` - Keyboard shortcut
- `MenubarGroup` - Group container
- `MenubarSub` - Submenu root
- `MenubarSubTrigger` - Submenu trigger
- `MenubarSubContent` - Submenu content

**Props:**
- Similar to DropdownMenu
- `MenubarContent`:
  - `align?: string` - Default: "start"
  - `alignOffset?: number` - Default: -4
  - `sideOffset?: number` - Default: 8

**Usage:**
```tsx
<Menubar>
  <MenubarMenu>
    <MenubarTrigger>File</MenubarTrigger>
    <MenubarContent>
      <MenubarItem>New</MenubarItem>
      <MenubarItem>Open</MenubarItem>
    </MenubarContent>
  </MenubarMenu>
</Menubar>
```

---

## Navigation Menu

A collection of links for navigating websites.

**Components:**
- `NavigationMenu` - Root component with viewport
- `NavigationMenuList` - List container
- `NavigationMenuItem` - Menu item
- `NavigationMenuTrigger` - Trigger for dropdown
- `NavigationMenuContent` - Dropdown content
- `NavigationMenuLink` - Link primitive
- `NavigationMenuViewport` - Viewport for content
- `NavigationMenuIndicator` - Active indicator

**Exports:**
- `navigationMenuTriggerStyle` - CVA function for styling triggers

**Usage:**
```tsx
<NavigationMenu>
  <NavigationMenuList>
    <NavigationMenuItem>
      <NavigationMenuTrigger>Item</NavigationMenuTrigger>
      <NavigationMenuContent>
        Content here
      </NavigationMenuContent>
    </NavigationMenuItem>
  </NavigationMenuList>
</NavigationMenu>
```

---

## Popover

Displays rich content in a portal, triggered by a button.

**Components:**
- `Popover` - Root component
- `PopoverTrigger` - Trigger button
- `PopoverContent` - Popover content

**Props:**
- `PopoverContent`:
  - `align?: "start" | "center" | "end"` - Default: "center"
  - `sideOffset?: number` - Default: 4

**Usage:**
```tsx
<Popover>
  <PopoverTrigger>Open</PopoverTrigger>
  <PopoverContent>
    Content here
  </PopoverContent>
</Popover>
```

---

## Progress

Displays an indicator showing the completion progress of a task.

**Components:**
- `Progress` - Progress component

**Props:**
- Extends Radix ProgressPrimitive.Root props
- `value?: number` - Progress value (0-100)
- `className?: string`

**Styling:**
- Default height: `h-4`
- Rounded full
- Animated indicator

**Usage:**
```tsx
<Progress value={progress} />
```

---

## Radio Group

A set of checkable buttons where only one can be checked at a time.

**Components:**
- `RadioGroup` - Group container
- `RadioGroupItem` - Individual radio button

**Props:**
- `RadioGroup`: Extends Radix RadioGroupPrimitive.Root props
  - `className?: string`
- `RadioGroupItem`: Extends Radix RadioGroupPrimitive.Item props
  - `value: string` - Required
  - `className?: string`

**Usage:**
```tsx
<RadioGroup value={value} onValueChange={setValue}>
  <RadioGroupItem value="option1" />
  <RadioGroupItem value="option2" />
</RadioGroup>
```

---

## Resizable

Resizable panel groups and layouts (uses react-resizable-panels).

**Components:**
- `ResizablePanelGroup` - Container for panels
- `ResizablePanel` - Individual panel
- `ResizableHandle` - Resize handle between panels

**Props:**
- `ResizablePanelGroup`: Extends PanelGroup props
  - `direction?: "horizontal" | "vertical"`
- `ResizableHandle`:
  - `withHandle?: boolean` - Show visual handle

**Usage:**
```tsx
<ResizablePanelGroup direction="horizontal">
  <ResizablePanel defaultSize={50}>
    Panel 1
  </ResizablePanel>
  <ResizableHandle withHandle />
  <ResizablePanel defaultSize={50}>
    Panel 2
  </ResizablePanel>
</ResizablePanelGroup>
```

---

## Scroll Area

Augments native scroll functionality for custom, cross-browser styling.

**Components:**
- `ScrollArea` - Scroll container
- `ScrollBar` - Scrollbar component

**Props:**
- `ScrollArea`: Extends Radix ScrollAreaPrimitive.Root props
- `ScrollBar`:
  - `orientation?: "vertical" | "horizontal"` - Default: "vertical"

**Usage:**
```tsx
<ScrollArea className="h-[200px]">
  <div className="p-4">
    Long content here...
  </div>
</ScrollArea>
```

---

## Select

Displays a list of options for the user to pick from.

**Components:**
- `Select` - Root component
- `SelectGroup` - Group container
- `SelectValue` - Selected value display
- `SelectTrigger` - Trigger button
- `SelectContent` - Options container
- `SelectLabel` - Group label
- `SelectItem` - Individual option
- `SelectSeparator` - Separator
- `SelectScrollUpButton` - Scroll up button
- `SelectScrollDownButton` - Scroll down button

**Props:**
- `SelectTrigger`:
  - Minimum height: `min-h-[44px]` for accessibility
- `SelectItem`:
  - Minimum height: `min-h-[44px]` for accessibility
  - `value: string` - Required
- `SelectContent`:
  - `position?: "popper" | "item-aligned"` - Default: "popper"

**Usage:**
```tsx
<Select value={value} onValueChange={setValue}>
  <SelectTrigger>
    <SelectValue placeholder="Select option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="1">Option 1</SelectItem>
    <SelectItem value="2">Option 2</SelectItem>
  </SelectContent>
</Select>
```

---

## Separator

Visually or semantically separates content.

**Components:**
- `Separator` - Separator component

**Props:**
- Extends Radix SeparatorPrimitive.Root props
- `orientation?: "horizontal" | "vertical"` - Default: "horizontal"
- `decorative?: boolean` - Default: true
- `className?: string`

**Usage:**
```tsx
<Separator />
<Separator orientation="vertical" />
```

---

## Sheet

Extends Dialog to display content that complements the main content (uses Radix Dialog).

**Components:**
- `Sheet` - Root component
- `SheetTrigger` - Trigger button
- `SheetPortal` - Portal for rendering
- `SheetOverlay` - Background overlay
- `SheetClose` - Close button primitive
- `SheetContent` - Sheet content with close button
- `SheetHeader` - Header section
- `SheetFooter` - Footer section
- `SheetTitle` - Sheet title
- `SheetDescription` - Sheet description

**Props:**
- `SheetContent`:
  - `side?: "top" | "bottom" | "left" | "right"` - Default: "right"
  - Side-specific animations and sizing

**Variants:**
- `top` - Slides from top, full width
- `bottom` - Slides from bottom, full width
- `left` - Slides from left, `w-3/4 sm:max-w-sm`
- `right` - Slides from right, `w-3/4 sm:max-w-sm`

**Usage:**
```tsx
<Sheet>
  <SheetTrigger>Open</SheetTrigger>
  <SheetContent side="right">
    <SheetHeader>
      <SheetTitle>Title</SheetTitle>
    </SheetHeader>
  </SheetContent>
</Sheet>
```

---

## Skeleton

Used to show a placeholder while content is loading.

**Components:**
- `Skeleton` - Skeleton component

**Props:**
- Extends `React.HTMLAttributes<HTMLDivElement>`
- `className?: string`

**Features:**
- Pulse animation
- Muted background
- Accessible with role="status" and aria-label

**Usage:**
```tsx
<Skeleton className="h-12 w-12 rounded-full" />
<Skeleton className="h-4 w-[250px]" />
```

---

## Slider

An input where the user selects a value from within a given range.

**Components:**
- `Slider` - Slider component

**Props:**
- Extends Radix SliderPrimitive.Root props
- `min?: number`
- `max?: number`
- `step?: number`
- `value?: number[]`
- `onValueChange?: (value: number[]) => void`
- `className?: string`

**Usage:**
```tsx
<Slider
  min={0}
  max={100}
  step={1}
  value={[value]}
  onValueChange={([newValue]) => setValue(newValue)}
/>
```

---

## Switch

A control that allows the user to toggle between checked and not checked.

**Components:**
- `Switch` - Switch component

**Props:**
- Extends Radix SwitchPrimitives.Root props
- `checked?: boolean`
- `onCheckedChange?: (checked: boolean) => void`
- `className?: string`

**Styling:**
- Height: `h-6`
- Width: `w-11`
- Thumb size: `h-5 w-5`

**Usage:**
```tsx
<Switch
  checked={checked}
  onCheckedChange={setChecked}
/>
```

---

## Table

A responsive table component.

**Components:**
- `Table` - Table wrapper with overflow
- `TableHeader` - Table header (thead)
- `TableBody` - Table body (tbody)
- `TableFooter` - Table footer (tfoot)
- `TableRow` - Table row (tr)
- `TableHead` - Table header cell (th)
- `TableCell` - Table cell (td)
- `TableCaption` - Table caption

**Props:**
- All extend their respective HTML element props
- `className?: string`

**Features:**
- Responsive with overflow scroll
- Hover effects on rows
- Selection state support

**Usage:**
```tsx
<Table>
  <TableCaption>A list of items</TableCaption>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Status</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Item 1</TableCell>
      <TableCell>Active</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

---

## Tabs

A set of layered sections of content (tab panels) that display one panel at a time.

**Components:**
- `Tabs` - Root component
- `TabsList` - Tabs list container
- `TabsTrigger` - Individual tab button
- `TabsContent` - Tab content panel

**Props:**
- `Tabs`: Extends Radix TabsPrimitive.Root props
  - `value?: string`
  - `onValueChange?: (value: string) => void`
- `TabsTrigger`:
  - `value: string` - Required

**Usage:**
```tsx
<Tabs value={tab} onValueChange={setTab}>
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Content 1</TabsContent>
  <TabsContent value="tab2">Content 2</TabsContent>
</Tabs>
```

---

## Textarea

Displays a form textarea field.

**Components:**
- `Textarea` - Textarea component

**Props:**
- Extends `React.TextareaHTMLAttributes<HTMLTextAreaElement>`
- `className?: string`

**Styling:**
- Minimum height: `min-h-[80px]`
- Border radius: `rounded-lg`
- Focus ring with offset

**Usage:**
```tsx
<Textarea placeholder="Type your message..." />
```

---

## Toast

A succinct message displayed temporarily.

**Components:**
- `ToastProvider` - Provider for toast system
- `ToastViewport` - Viewport container for toasts
- `Toast` - Toast component
- `ToastTitle` - Toast title
- `ToastDescription` - Toast description
- `ToastClose` - Close button
- `ToastAction` - Action button

**Props:**
- `Toast`:
  - `variant?: "default" | "destructive"`
- All extend their respective Radix UI primitive props

**Types:**
- `ToastProps` - Toast component props
- `ToastActionElement` - Action button element type

**Usage:**
```tsx
<ToastProvider>
  <Toast variant="default">
    <ToastTitle>Success</ToastTitle>
    <ToastDescription>
      Your changes have been saved.
    </ToastDescription>
    <ToastAction altText="Undo">Undo</ToastAction>
  </Toast>
  <ToastViewport />
</ToastProvider>
```

---

## Toggle Group

A set of two-state buttons that can be toggled on or off.

**Components:**
- `ToggleGroup` - Group container
- `ToggleGroupItem` - Individual toggle button

**Props:**
- `ToggleGroup`: Extends Radix ToggleGroupPrimitive.Root props
  - `type?: "single" | "multiple"`
  - `variant?: "default" | "outline"`
  - `size?: "default" | "sm" | "lg"`
- `ToggleGroupItem`:
  - `value: string` - Required
  - Can override group variant and size

**Usage:**
```tsx
<ToggleGroup type="single" value={value} onValueChange={setValue}>
  <ToggleGroupItem value="left">Left</ToggleGroupItem>
  <ToggleGroupItem value="center">Center</ToggleGroupItem>
  <ToggleGroupItem value="right">Right</ToggleGroupItem>
</ToggleGroup>
```

---

## Toggle

A two-state button that can be toggled on or off.

**Components:**
- `Toggle` - Toggle component
- `toggleVariants` - CVA variants function (exported for reuse)

**Props:**
- Extends Radix TogglePrimitive.Root props
- `variant?: "default" | "outline"`
- `size?: "default" | "sm" | "lg"`
- `className?: string`

**Variants:**
- `default` - Transparent background
- `outline` - With border

**Sizes:**
- `default` - `h-10 px-3 min-w-10`
- `sm` - `h-9 px-2.5 min-w-9`
- `lg` - `h-11 px-5 min-w-11`

**Usage:**
```tsx
<Toggle
  pressed={pressed}
  onPressedChange={setPressed}
  variant="outline"
>
  <Icon />
</Toggle>
```

---

## Tooltip

A popup that displays information related to an element when focused or hovered.

**Components:**
- `TooltipProvider` - Provider for tooltip system
- `Tooltip` - Root component
- `TooltipTrigger` - Trigger element
- `TooltipContent` - Tooltip content

**Props:**
- `TooltipContent`:
  - `sideOffset?: number` - Default: 4

**Usage:**
```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger>Hover me</TooltipTrigger>
    <TooltipContent>
      Helpful information
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

---

## Design Patterns

### Common Patterns Across Components

1. **Styling with cn() utility**
   - All components use the `cn()` utility from `@/lib/utils` for className merging
   - Supports Tailwind CSS classes

2. **Variant-based styling with CVA**
   - Components like Button, Badge, Alert use `class-variance-authority` for variants
   - Exported variant functions can be reused (e.g., `buttonVariants`, `toggleVariants`)

3. **Radix UI primitives**
   - Most interactive components wrap Radix UI primitives
   - Maintains accessibility while allowing custom styling

4. **Forwarded refs**
   - All components support ref forwarding with `React.forwardRef`
   - Enables imperative access when needed

5. **Slot pattern (asChild)**
   - Components like Button, BreadcrumbLink support `asChild` prop
   - Allows composition with custom components while maintaining styles

6. **Compound components**
   - Complex components (Dialog, Sheet, Card) use compound component pattern
   - Related components work together as a family

7. **Context-based state**
   - Components like Carousel, Chart, Form use React Context
   - Provides hooks for accessing shared state

8. **Accessibility-first**
   - All components follow ARIA best practices
   - Keyboard navigation support
   - Screen reader friendly
   - Touch target sizes (min-h-[44px] for interactive elements)

### Theming

All components support theming through CSS variables:
- Colors: `--primary`, `--secondary`, `--destructive`, `--accent`, etc.
- Backgrounds: `--background`, `--card`, `--popover`
- Text colors: `--foreground`, `--muted-foreground`, `--card-foreground`
- Borders: `--border`, `--input`, `--ring`

### Responsive Design

- Mobile-first approach with Tailwind breakpoints (sm, md, lg, xl)
- Touch-friendly sizing for interactive elements
- Responsive dialog/sheet behavior
- Adaptive layouts for different screen sizes
