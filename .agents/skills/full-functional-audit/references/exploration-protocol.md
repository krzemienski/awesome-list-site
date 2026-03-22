# Exploration Protocol — Building the Interaction Inventory

## Screen Discovery Patterns

### iOS / SwiftUI
```bash
# Find all top-level View structs
grep -rn "struct.*View.*:.*View" Views/ --include="*.swift" | grep -v "private struct"

# Find navigation route enum (the master screen list)
grep -rn "case \." Views/Root/ --include="*.swift" | grep -v "//"

# Find sidebar/tab items
grep -rn "NavigationLink\|\.tag(" Views/Root/ --include="*.swift"

# Find deep link handlers
grep -rn "handleURL\|openURL\|onOpenURL" --include="*.swift"
```

### Web / React
```bash
# Find all page/route components
grep -rn "export.*function\|export.*const" pages/ app/ --include="*.tsx"

# Find router configuration
grep -rn "Route\|path:" src/ --include="*.tsx" --include="*.ts"

# Find navigation items
grep -rn "NavLink\|Link to=" src/ --include="*.tsx"
```

## In-Screen Interaction Discovery

For each screen, grep for these interaction patterns:

### iOS / SwiftUI
```bash
SCREEN="Views/Chat/ChatView.swift"

# Sheets, popovers, alerts
grep -n "\.sheet\|\.popover\|\.alert\|\.confirmationDialog\|\.fullScreenCover" "$SCREEN"

# Buttons and tap targets
grep -n "Button(\|\.onTapGesture\|\.contextMenu\|\.swipeActions" "$SCREEN"

# Navigation
grep -n "NavigationLink\|\.navigationDestination" "$SCREEN"

# API calls
grep -n "apiClient\.\|URLSession\|\.fetch(" "$SCREEN"
```

### Web / React
```bash
SCREEN="src/pages/Dashboard.tsx"

# Modals, dialogs, drawers
grep -n "Modal\|Dialog\|Drawer\|Popover\|Sheet" "$SCREEN"

# Click handlers
grep -n "onClick\|onPress\|onSubmit" "$SCREEN"

# API calls
grep -n "fetch(\|axios\.\|useSWR\|useQuery" "$SCREEN"
```

## Backend Endpoint Mapping

### Vapor (Swift)
```bash
# Find all registered controllers
grep -n "register(collection:" Sources/*/App/routes.swift

# Find route definitions per controller
grep -rn "routes\.\(get\|post\|put\|delete\|patch\)" Sources/*/Controllers/
```

### Express / Fastify / Next.js
```bash
# Find route registrations
grep -rn "app\.\(get\|post\|put\|delete\)\|router\.\(get\|post\)" src/ --include="*.ts"

# Find API route files
find pages/api/ app/api/ -name "*.ts" -o -name "*.tsx" 2>/dev/null
```

## Cross-Reference Pattern

After discovering frontend API calls and backend routes:

```
For each frontend API call:
  1. Extract the path (e.g., "/api/v1/sessions")
  2. Search backend routes for matching path
  3. If NO match → FLAG as endpoint mismatch (CRITICAL)
  4. If match → record the pair in inventory

For each backend route:
  1. Search frontend for calls to that path
  2. If NO frontend consumer → FLAG as unused endpoint (LOW)
```

## Inventory Output Format

```markdown
## Screen: HomeView
Navigation: Sidebar > Home | Deep link: ils://home
Backend deps: /api/v1/stats, /api/v1/sessions (recent)

| ID | Interaction | Type | Trigger | Backend | Priority |
|----|-------------|------|---------|---------|----------|
| H1 | View dashboard | render | screen load | GET /stats | P0 |
| H2 | Edit layout | sheet | "Edit" button | none | P1 |
| H3 | Layout picker | sheet | gear icon | none | P2 |
| H4 | Quick Actions | grid tap | grid items | varies | P0 |
| H5 | Session tap | navigation | row tap | GET /sessions/:id | P0 |
```

## Prioritization Rules

- **P0**: Core user flows — screen renders, primary action works, data loads from backend
- **P1**: Secondary features — sheets, popovers, edit modes, context menus
- **P2**: Edge cases — error states, empty states, settings, configuration
- Validate P0 items first across ALL screens before P1/P2
