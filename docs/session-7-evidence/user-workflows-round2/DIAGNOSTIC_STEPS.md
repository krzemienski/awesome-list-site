# Search Dialog Bug - Diagnostic Steps for Developers

## Quick Diagnosis (5 minutes)

### Step 1: Check if Component Exists
```bash
# Find search/command-k components
find client/src -type f -name "*[Cc]ommand*" -o -name "*[Ss]earch*[Dd]ialog*"

# Expected files:
# client/src/components/CommandKDialog.tsx (or similar)
# client/src/components/SearchDialog.tsx (or similar)
```

**If NO files found**: Component doesn't exist, need to create it

**If files found**: Proceed to Step 2

---

### Step 2: Check if Keyboard Listener Registered
```bash
# Search for "/" key handler
grep -r "key === '/' " client/src/

# Or check for cmd-k style shortcuts
grep -r "keydown" client/src/ | grep -E "cmd|meta|/"

# Expected output:
# client/src/App.tsx:  if (e.key === '/' && !isInputFocused()) {
```

**If NOT found**: Add keyboard listener (see Fix Section below)

**If found**: Proceed to Step 3

---

### Step 3: Verify Component is Rendered
```bash
# Check App.tsx for dialog component
grep -A 5 "CommandK\|SearchDialog" client/src/App.tsx

# Expected output:
# <CommandKDialog open={open} onOpenChange={setOpen}>
```

**If NOT found in App.tsx**: Component not rendered, add to layout

**If found**: Proceed to Step 4

---

### Step 4: Check State Management
```bash
# Look for state hook
grep -B 2 -A 2 "useState.*open" client/src/App.tsx

# Expected output:
# const [open, setOpen] = useState(false);
```

**If NOT found**: Add state management (see Fix Section below)

**If found**: Proceed to Step 5

---

### Step 5: Test in Browser with DevTools

1. **Start dev server**:
   ```bash
   npm run dev
   ```

2. **Open browser**: http://localhost:3000

3. **Open DevTools**: Press F12

4. **Add debug logging** (paste in console):
   ```javascript
   // Listen for ALL keyboard events
   window.addEventListener('keydown', (e) => {
     console.log('Key pressed:', e.key, 'Target:', e.target.tagName, 'Prevented:', e.defaultPrevented);
     if (e.key === '/') {
       console.error('⚠️ SLASH KEY DETECTED BUT DIALOG NOT OPENING');
     }
   });
   ```

5. **Press "/" key**

6. **Check console**:
   - If you see "SLASH KEY DETECTED" → Listener exists but dialog not opening
   - If you see nothing → Listener not registered at all

---

## Common Issues & Fixes

### Issue 1: Keyboard Listener Not Registered

**Symptom**: No console logs when pressing "/"

**Fix**: Add keyboard listener to App.tsx
```tsx
// client/src/App.tsx
import { useState, useEffect } from 'react';

function App() {
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      // Open search on "/" key
      if (e.key === '/') {
        e.preventDefault();
        setSearchOpen(true);
      }

      // Close search on Escape
      if (e.key === 'Escape') {
        setSearchOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      {/* Your app layout */}

      {/* Search Dialog */}
      <CommandKDialog open={searchOpen} onOpenChange={setSearchOpen}>
        {/* Dialog content */}
      </CommandKDialog>
    </>
  );
}
```

---

### Issue 2: Component Not in DOM

**Symptom**: Console logs work but dialog doesn't appear

**Fix 1**: Verify dialog component is rendered
```tsx
// Check if this exists in App.tsx
<CommandKDialog open={searchOpen} onOpenChange={setSearchOpen}>
  <CommandInput placeholder="Search resources..." />
  <CommandList>
    {/* Results */}
  </CommandList>
</CommandKDialog>
```

**Fix 2**: Check if dialog is hidden by CSS
```bash
# Search for display:none or visibility:hidden
grep -r "CommandK\|SearchDialog" client/src/styles/
```

---

### Issue 3: Dialog Opens but Input Not Focused

**Symptom**: Dialog appears but cursor not in search box

**Fix**: Add autoFocus to input
```tsx
<CommandInput
  placeholder="Search resources..."
  autoFocus
/>
```

---

### Issue 4: Event Propagation Blocked

**Symptom**: Listener exists but event never fires

**Fix**: Check for stopPropagation in parent components
```bash
# Search for stopPropagation calls
grep -r "stopPropagation" client/src/components/
```

If found, remove or add condition:
```tsx
// Before (WRONG)
onClick={(e) => {
  e.stopPropagation(); // Blocks ALL events
  handleClick();
}}

// After (CORRECT)
onClick={(e) => {
  handleClick();
  // Only stop propagation if needed
}}
```

---

### Issue 5: Auth Guard Blocking

**Symptom**: Dialog works when logged out, fails when logged in

**Fix**: Remove auth requirement from dialog
```tsx
// Before (WRONG)
{isAuthenticated && (
  <CommandKDialog open={searchOpen} onOpenChange={setSearchOpen}>
    {/* ... */}
  </CommandKDialog>
)}

// After (CORRECT)
<CommandKDialog open={searchOpen} onOpenChange={setSearchOpen}>
  {/* Anyone can search, even unauthenticated */}
</CommandKDialog>
```

---

## Complete Fix Template

If no search dialog exists, here's a complete implementation:

### 1. Install Dependencies (if needed)
```bash
npm install cmdk
# OR if using custom dialog
# Already have @radix-ui/react-dialog from shadcn/ui
```

### 2. Create CommandKDialog Component
```tsx
// client/src/components/CommandKDialog.tsx
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';

interface CommandKDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandKDialog({ open, onOpenChange }: CommandKDialogProps) {
  const [query, setQuery] = useState('');

  // Fetch resources matching query
  const { data: results } = useQuery({
    queryKey: ['/api/resources', { search: query }],
    queryFn: async () => {
      if (!query) return [];
      const res = await fetch(`/api/resources?search=${encodeURIComponent(query)}&limit=10`);
      return res.json();
    },
    enabled: query.length > 0,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Search Resources</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            type="search"
            placeholder="Type to search resources..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full"
          />

          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {results?.map((resource: any) => (
              <div
                key={resource.id}
                className="p-3 rounded-lg border cursor-pointer hover:bg-accent"
                onClick={() => {
                  window.location.href = `/resources/${resource.id}`;
                  onOpenChange(false);
                }}
              >
                <div className="font-medium">{resource.title}</div>
                <div className="text-sm text-muted-foreground truncate">
                  {resource.description}
                </div>
              </div>
            ))}

            {query && results?.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No results found for "{query}"
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### 3. Update App.tsx
```tsx
// client/src/App.tsx
import { useState, useEffect } from 'react';
import { CommandKDialog } from '@/components/CommandKDialog';

function App() {
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === '/') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      {/* Existing layout */}
      <YourAppLayout />

      {/* Search Dialog (global) */}
      <CommandKDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
```

### 4. Test
```bash
# Start dev server
npm run dev

# Open browser
open http://localhost:3000

# Press "/" key → Dialog should open
# Type "ffmpeg" → Results should appear
# Click result → Should navigate to resource
# Press Escape → Dialog should close
```

---

## Verification Checklist

After implementing fix:

- [ ] "/" key opens dialog ✅
- [ ] Input is auto-focused ✅
- [ ] Typing shows results ✅
- [ ] Clicking result navigates ✅
- [ ] Escape closes dialog ✅
- [ ] Works when logged in ✅
- [ ] Works when logged out ✅
- [ ] No console errors ✅
- [ ] Automated test passes ✅

---

## Re-run Automated Tests

```bash
# Run user workflows Round 2 tests
npx playwright test tests/e2e/user-workflows-round2.spec.ts \
  --project=chromium-desktop \
  --workers=1

# Expected output:
# ✅ Task 31-40: Search Dialog - Bug #1 Verification (PASSED)
# ✅ Task 41-50: Profile Page - Bug #2 Fix Verification (PASSED)
# ✅ Task 51-60: Bookmarks Page (PASSED)
# ✅ Task 61-70: Learning Journeys (PASSED)
```

---

## Need Help?

1. **Check Playwright Trace**:
   ```bash
   npx playwright show-trace test-results/.../trace.zip
   ```

2. **Review Test Video**:
   ```bash
   open test-results/.../video.webm
   ```

3. **Check Test Log**:
   ```bash
   cat docs/session-7-evidence/user-workflows-round2/test-run.log
   ```

4. **Ask for clarification**:
   - What specific error do you see?
   - Does the dialog exist in the codebase?
   - Can you share a screenshot?

---

**Last Updated**: 2025-11-30
**Created By**: Agent 2 (Round 2 Verification)
**Status**: Ready for developer action 🛠️
