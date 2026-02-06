# Bug Fix: 404 Route Not Working

## Problem
Navigating to invalid routes (e.g., `/invalid-page`) was showing the Journeys page instead of the NotFound component.

## Root Cause
In wouter v3.9.0, the catch-all route syntax `<Route component={NotFound} />` without a path does not work as expected. Wouter requires an explicit path pattern for catch-all routes.

## Solution
Changed the catch-all route from:
```tsx
<Route component={NotFound} />
```

To:
```tsx
<Route path="/:rest*" component={NotFound} />
```

The `/:rest*` pattern catches all unmatched routes and passes them to the NotFound component.

## Files Modified
- `client/src/App.tsx` (line 145)

## Verification
1. Build passes: ✅ No TypeScript errors
2. LSP diagnostics: ✅ No errors in App.tsx
3. Route configuration: ✅ Catch-all route is last in Switch

## Testing
To test manually:
1. Navigate to http://localhost:3000/some-invalid-route
2. Should see the NotFound component with:
   - "Page Not Found" title
   - Error message explaining the page doesn't exist
   - "Go Home" and "Browse Categories" buttons

## Expected Behavior
- Invalid routes show the 404 page with proper error messaging
- 404 page has navigation options to return to valid pages
- NotFound component renders with AlertCircle icon and helpful message
