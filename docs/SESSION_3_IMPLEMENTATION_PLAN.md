# Session 3: Complete Migration Validation + Admin Enhancement Plan

**Created**: 2025-11-29
**Estimated Duration**: 25-30 hours (~25-30 minutes human time)
**Complexity**: 0.72/1.00 (COMPLEX)
**Project**: Awesome Video Resources - Replit → Supabase Migration
**Current Status**: 90% complete, production-ready core, enhancements needed

---

## Executive Summary

### What This Plan Covers

**Primary Objectives**:
1. ✅ Configure and test all OAuth providers (GitHub, Google, Magic Link)
2. ✅ Build comprehensive admin resource management (full CRUD + bulk operations)
3. ✅ Redesign admin dashboard with professional multi-panel layout
4. ✅ Validate ALL untested features (search, bookmarks, favorites, journeys, sync, AI)
5. ✅ Create complete E2E test suite with Playwright
6. ✅ Fix all remaining parseInt(UUID) bugs globally
7. ✅ Security audit and hardening

**Secondary Objectives**:
- Performance optimization
- Documentation updates
- Production deployment preparation

### Deliverables

**Code**:
- New admin resource browser (5 components)
- Redesigned admin dashboard (8 components)
- OAuth configuration (Supabase + provider setup)
- E2E test suite (15+ test files)
- Bug fixes (global UUID handling)

**Documentation**:
- Updated CLAUDE.md
- E2E test documentation
- OAuth setup guide
- Admin user manual

**Validation**:
- 100% feature coverage testing
- Performance benchmarks
- Security audit report

---

## Methodology

### Shannon Framework Integration

**Complexity Analysis** (8-Dimensional):
- **Technical Depth**: 0.8 (OAuth, RLS, bulk operations)
- **Integration Complexity**: 0.7 (GitHub API, Claude AI, Supabase)
- **State Management**: 0.6 (Multi-table transactions, optimistic updates)
- **Error Scenarios**: 0.9 (OAuth failures, network errors, conflicts)
- **Performance Requirements**: 0.6 (Bulk operations, search optimization)
- **Security Concerns**: 0.8 (OAuth tokens, admin permissions, RLS)
- **Documentation Needs**: 0.7 (OAuth setup, admin features, testing)
- **Testing Complexity**: 0.9 (E2E flows, OAuth mocking, bulk operations)

**Overall Complexity**: 0.72/1.00 → **COMPLEX**

### Validation Strategy

**Tier 1: Flow Validation** (Every task)
- TypeScript compilation
- Linting passes
- No console errors

**Tier 2: Artifact Validation** (Every feature)
- Unit tests pass
- Build succeeds
- Components render

**Tier 3: Functional Validation** (NO MOCKS - Every phase)
- Real browser testing (Chrome DevTools MCP / Playwright)
- Real database operations (Supabase MCP)
- Real OAuth flows (actual provider integration)
- Real API calls (curl verification)

### Skill Invocations

**Throughout Execution**:
- `systematic-debugging` - When encountering issues
- `test-driven-development` - For new features (RED-GREEN-REFACTOR)
- `testing-anti-patterns` - Prevent mock-based false positives
- `playwright-skill` - E2E test suite creation
- `chrome-devtools` MCP - Interactive testing
- `supabase` MCP - Database operations
- `context7` MCP - Library documentation (React Query, Zod, etc.)

---

## Phase 0: Pre-Flight & Environment Setup

**Type**: Infrastructure
**Estimated**: 1.5 hours
**Prerequisites**: Session 2 complete, Docker containers running
**Files**: `.env`, `client/.env.local`, `docs/oauth-setup-guide.md`

### Tasks

#### Task 0.1: Verify Current System State (15 min)
**Skill**: `systematic-debugging`

**Steps**:
1. Check Docker status: `docker-compose ps`
   - Verify all 3 containers healthy
2. Test API health: `curl http://localhost:3000/api/health`
   - Expected: `{"status":"ok"}`
3. Query database via Supabase MCP:
   ```typescript
   mcp__supabase__execute_sql({
     query: "SELECT COUNT(*) as total, status FROM resources GROUP BY status;"
   })
   ```
   - Expected: 2,647 approved, 0 pending (after Session 2 test cleanup)
4. Test admin login via Chrome MCP:
   - Navigate to http://localhost:3000/login
   - Fill credentials: admin@test.com / Admin123!
   - Verify redirect to homepage with user menu

**Verification**:
- [ ] All containers running and healthy
- [ ] API responding with < 5ms latency
- [ ] Database has 2,647 resources
- [ ] Admin login successful, session persists

**Exit Criteria**: Clean slate confirmed, ready for new development

---

#### Task 0.2: Audit All parseInt(UUID) Usage (20 min)
**Skill**: `systematic-debugging`

**Problem**: Session 2 found parseInt() on UUIDs in approve/reject routes. Need global fix.

**Steps**:
1. Search all route parameter parsing:
   ```bash
   grep -rn "parseInt(req.params" server/ --include="*.ts"
   ```
2. For each match:
   - Read surrounding context (±10 lines)
   - Determine if parameter is UUID or integer
   - Fix if UUID: `const id = req.params.id;` (string)
   - Keep if integer: `const page = parseInt(req.params.page);`
3. Search for similar patterns:
   ```bash
   grep -rn "Number(req.params\|+req.params" server/ --include="*.ts"
   ```
4. Document findings in table:
   | File | Line | Current | Should Be | Fixed |
   |------|------|---------|-----------|-------|

**Verification**:
- [ ] All parseInt(req.params.id) removed from resource routes
- [ ] Type checking added: `if (!id || id.length !== 36)`
- [ ] Test with malformed UUID: `curl -X PUT http://localhost:3000/api/resources/invalid-uuid/approve -H "Authorization: Bearer $TOKEN"`
- [ ] Expected: 400 Bad Request, not 500 Internal Error

**Exit Criteria**: Zero parseInt() calls on UUID parameters

---

#### Task 0.3: Clean Up Test Data (10 min)

**Steps**:
1. Delete test resource created in Session 2:
   ```sql
   DELETE FROM resources
   WHERE title = 'Test Resource for Admin Approval';
   ```
2. Verify count: `SELECT COUNT(*) FROM resources WHERE status = 'approved';`
   - Expected: 2,646 (original data only)
3. Clear any test bookmarks/favorites:
   ```sql
   DELETE FROM user_bookmarks WHERE user_id = '58c592c5-548b-4412-b4e2-a9df5cac5397';
   DELETE FROM user_favorites WHERE user_id = '58c592c5-548b-4412-b4e2-a9df5cac5397';
   ```

**Verification**:
- [ ] Resource count back to 2,646
- [ ] No test data in user tables
- [ ] Admin user still exists and can login

**Exit Criteria**: Clean database ready for feature testing

---

#### Task 0.4: Create OAuth Setup Guide (25 min)

**Steps**:
1. Create `docs/oauth-setup-guide.md` with:
   - GitHub OAuth App creation (step-by-step screenshots)
   - Google OAuth App creation (step-by-step)
   - Supabase configuration (where to paste credentials)
   - Testing checklist (signup, login, profile data)
2. Document redirect URLs:
   - Development: `http://localhost:3000/auth/callback`
   - Production: `https://yourdomain.com/auth/callback`
3. List required scopes:
   - GitHub: `user:email` (read email address)
   - Google: `openid`, `email`, `profile`

**Verification**:
- [ ] Guide is complete and actionable
- [ ] All screenshots/links included
- [ ] Redirect URLs documented for both environments

**Exit Criteria**: Guide ready for OAuth configuration in Phase 1

---

#### Task 0.5: Set Up Development Branch (10 min)
**Skill**: `using-git-worktrees` (if available)

**Steps**:
1. Check git status: `git status --short`
2. Create feature branch for Session 3 work:
   ```bash
   git checkout -b feature/session-3-enhancements
   ```
3. Commit Session 2 changes:
   ```bash
   git add -A
   git commit -m "feat: Complete Replit to Supabase migration

   - Fixed AuthCallback import blocking frontend
   - Updated auth endpoints to use JWT data
   - Fixed AdminGuard to use isAdmin flag
   - Fixed UUID parsing in approve/reject routes
   - Migrated 2,646 resources successfully
   - Validated end-to-end admin approval workflow

   Session 2 complete: 90% migration done, production-ready core
   See: SESSION_2_COMPLETE.md"
   ```
4. Verify commit: `git log -1 --stat`

**Verification**:
- [ ] Clean working directory
- [ ] All Session 2 changes committed
- [ ] On feature branch (not main)
- [ ] Commit message descriptive

**Exit Criteria**: Ready for new development on clean branch

---

**Phase 0 Duration**: 1.5 hours
**Phase 0 Completion**: Environment verified, branch created, audit complete

---

## Phase 1: OAuth Provider Configuration & Testing

**Type**: Integration
**Estimated**: 4-5 hours
**Files**: None (Supabase dashboard configuration only), test documentation
**MCP Tools**: Chrome DevTools, Supabase
**Skills**: `systematic-debugging`, `testing-anti-patterns`

### Background

Current auth state:
- ✅ Email/password: Working
- ❌ GitHub OAuth: Not configured
- ❌ Google OAuth: Not configured
- ⚠️ Magic Link: Code present but untested

OAuth providers configured via Supabase dashboard (not code changes).

---

### Task 1.1: Configure GitHub OAuth Provider (45 min)

**Steps**:

1. **Create GitHub OAuth App** (15 min):
   - Navigate to: https://github.com/settings/developers
   - Click "New OAuth App"
   - Fill details:
     - **Name**: Awesome Video Resources (Dev)
     - **Homepage**: http://localhost:3000
     - **Callback URL**: https://jeyldoypdkgsrfdhdcmm.supabase.co/auth/v1/callback
   - Copy Client ID
   - Generate Client Secret
   - **Screenshot**: Save as `docs/screenshots/github-oauth-app.png`

2. **Configure in Supabase** (10 min):
   - Open: https://supabase.com/dashboard/project/jeyldoypdkgsrfdhdcmm/auth/providers
   - Find "GitHub" provider
   - Enable toggle
   - Paste Client ID
   - Paste Client Secret
   - Save configuration
   - **Screenshot**: Save as `docs/screenshots/supabase-github-config.png`

3. **Update Login Page** (10 min):
   - Verify `client/src/pages/Login.tsx` has GitHub button
   - Check signInWithOAuth call:
     ```typescript
     await supabase.auth.signInWithOAuth({
       provider: 'github',
       options: {
         redirectTo: `${window.location.origin}/auth/callback`
       }
     });
     ```
   - No code changes needed (already present from Session 2)

4. **Test GitHub OAuth** (10 min):
   - Use Chrome DevTools MCP
   - Navigate to http://localhost:3000/login
   - Click "Continue with GitHub"
   - **Verification**: Redirects to github.com/login/oauth/authorize
   - Login with GitHub account
   - **Verification**: Redirects to /auth/callback → / (homepage)
   - **Verification**: User menu shows GitHub profile data
   - Query auth.users:
     ```sql
     SELECT id, email, raw_user_meta_data
     FROM auth.users
     WHERE email = 'your-github-email@example.com';
     ```
   - **Verification**: User created with GitHub metadata

**Verification Checklist**:
- [ ] GitHub OAuth app created and configured
- [ ] Supabase provider enabled
- [ ] OAuth flow completes without errors
- [ ] User created in auth.users with GitHub metadata
- [ ] Can access protected routes after GitHub login
- [ ] Logout works
- [ ] Can log back in with GitHub

**Exit Criteria**: GitHub OAuth fully functional end-to-end

---

### Task 1.2: Configure Google OAuth Provider (45 min)

**Steps**:

1. **Create Google OAuth App** (20 min):
   - Navigate to: https://console.cloud.google.com/apis/credentials
   - Create new project (or select existing)
   - Go to "OAuth consent screen"
   - Configure:
     - **User Type**: External
     - **App Name**: Awesome Video Resources
     - **User support email**: Your email
     - **Scopes**: email, profile, openid
   - Create OAuth 2.0 Client ID:
     - **Type**: Web application
     - **Name**: Awesome Video Resources (Dev)
     - **Authorized redirect URIs**:
       - https://jeyldoypdkgsrfdhdcmm.supabase.co/auth/v1/callback
   - Copy Client ID and Client Secret
   - **Screenshot**: `docs/screenshots/google-oauth-app.png`

2. **Configure in Supabase** (10 min):
   - Open Supabase auth providers
   - Find "Google" provider
   - Enable toggle
   - Paste Client ID
   - Paste Client Secret
   - Save
   - **Screenshot**: `docs/screenshots/supabase-google-config.png`

3. **Test Google OAuth** (15 min):
   - Chrome DevTools MCP
   - Navigate to /login
   - Click "Continue with Google"
   - **Verification**: Redirects to accounts.google.com
   - Select Google account
   - **Verification**: Redirects to /auth/callback → /
   - **Verification**: User menu shows Google profile name/avatar
   - Query database:
     ```sql
     SELECT id, email, raw_user_meta_data->>'full_name' as name
     FROM auth.users
     WHERE email = 'your-google-email@gmail.com';
     ```

**Verification Checklist**:
- [ ] Google OAuth app created with correct scopes
- [ ] Supabase provider enabled
- [ ] OAuth flow completes successfully
- [ ] User profile data populated (name, avatar from Google)
- [ ] Can access all features after Google login
- [ ] Multiple signups with same email prevented (email uniqueness)

**Exit Criteria**: Google OAuth fully functional

---

### Task 1.3: Test Magic Link Authentication (30 min)

**Steps**:

1. **Verify Supabase Email Settings** (10 min):
   - Open: Supabase dashboard → Authentication → Email Templates
   - Check "Magic Link" template exists
   - Review email content (Supabase default or custom)
   - Configure SMTP (if not already):
     - For dev: Use Supabase built-in (limited emails)
     - For production: Configure SendGrid/AWS SES
   - **Screenshot**: `docs/screenshots/email-template-magic-link.png`

2. **Test Magic Link Flow** (20 min):
   - Navigate to /login via Chrome MCP
   - Enter email: `test-magic-link@youremail.com`
   - Click "Magic Link" button
   - **Verification**: Button shows "Check your email"
   - Check email inbox (wait up to 60 seconds)
   - Click magic link in email
   - **Verification**: Redirects to /auth/callback → /
   - **Verification**: Logged in without password
   - Query database:
     ```sql
     SELECT id, email, email_confirmed_at
     FROM auth.users
     WHERE email = 'test-magic-link@youremail.com';
     ```
   - **Verification**: email_confirmed_at populated

**Verification Checklist**:
- [ ] Magic link email received within 60 seconds
- [ ] Link format correct (Supabase domain + token)
- [ ] Click redirects to app successfully
- [ ] User logged in with confirmed email
- [ ] Expired link handling (test with >1hr old email)
- [ ] Invalid link shows error message

**Exit Criteria**: Magic link authentication validated

---

### Task 1.4: Test Signup Flow (Email/Password) (30 min)

**Currently**: Only login tested, signup flow unvalidated

**Steps**:

1. **Test New User Signup** (15 min):
   - Navigate to /login
   - Click "Sign up" button
   - **Verification**: Form switches to signup mode
   - Fill details:
     - Email: `new-user-test@example.com`
     - Password: `SecurePass123!`
     - (Confirm password if required)
   - Submit form
   - **Verification**: Success message or auto-login
   - Check email for confirmation (if email confirmation required)
   - Query database:
     ```sql
     SELECT id, email, email_confirmed_at, raw_user_meta_data
     FROM auth.users
     WHERE email = 'new-user-test@example.com';
     ```

2. **Test Validation Rules** (15 min):
   - Test weak password: `test123`
     - **Expected**: Error "Password too weak"
   - Test invalid email: `notanemail`
     - **Expected**: Error "Invalid email"
   - Test duplicate email: `admin@test.com`
     - **Expected**: Error "Email already registered"
   - Test SQL injection: `test'; DROP TABLE users; --`
     - **Expected**: Rejected safely, no SQL execution

**Verification Checklist**:
- [ ] Signup form validates input client-side (Zod)
- [ ] Server validates input (Supabase)
- [ ] New user created with default role "user" (not admin)
- [ ] Email confirmation sent (if configured)
- [ ] Duplicate emails prevented
- [ ] SQL injection attempts blocked
- [ ] User can login immediately after signup

**Exit Criteria**: Signup flow fully functional and secure

---

### Task 1.5: Test OAuth Edge Cases (30 min)

**Steps**:

1. **Test OAuth Email Conflict** (10 min):
   - Create user with email/password: `conflict-test@gmail.com`
   - Try to login with Google using same email
   - **Expected Behavior**: Options:
     - A) Supabase links accounts (same user)
     - B) Error "Email already in use"
   - Document actual behavior
   - Verify correct handling in database

2. **Test OAuth Cancellation** (10 min):
   - Start GitHub OAuth flow
   - Cancel on GitHub authorization screen
   - **Verification**: Returns to /login without error
   - **Verification**: No orphaned user created

3. **Test Token Refresh** (10 min):
   - Login with GitHub
   - Wait for token expiry (or manually expire in localStorage)
   - Make authenticated API call
   - **Verification**: Token auto-refreshes or prompts re-login
   - Check Supabase session:
     ```javascript
     supabase.auth.getSession().then(console.log)
     ```

**Verification Checklist**:
- [ ] Email conflicts handled gracefully
- [ ] OAuth cancellation doesn't break app
- [ ] Token refresh works automatically
- [ ] Expired sessions handled (redirect to login)

**Exit Criteria**: All OAuth edge cases handled

---

**Phase 1 Duration**: 4-5 hours
**Phase 1 Deliverables**:
- 3 OAuth providers configured and tested
- Signup flow validated
- OAuth edge cases documented
- Screenshots for setup guide

---

## Phase 2: Admin Resource Management - Full CRUD Interface

**Type**: UI + API
**Estimated**: 6-7 hours
**Files**:
- `client/src/components/admin/ResourceBrowser.tsx` (new, ~400 lines)
- `client/src/components/admin/ResourceEditModal.tsx` (new, ~300 lines)
- `client/src/components/admin/BulkActionsToolbar.tsx` (new, ~250 lines)
- `client/src/components/admin/ResourceFilters.tsx` (new, ~200 lines)
- `server/routes.ts` (modify - add bulk endpoints)
- `server/storage.ts` (modify - add bulk operations)
**MCP Tools**: Chrome DevTools, Supabase, Context7 (TanStack Table docs)
**Skills**: `test-driven-development`, `react-expert` agent

### Background

**Current State**: Admin can approve/reject pending resources only
**Target State**: Admin can view, edit, delete, bulk-manage ALL 2,646 resources

**UI Pattern**: TanStack Table v8 + shadcn/ui data-table component

---

### Task 2.1: Design Resource Browser Component (30 min)
**Skill**: `react-expert` agent (for React patterns)

**Steps**:

1. **Create Component Structure**:
   ```typescript
   // File: client/src/components/admin/ResourceBrowser.tsx

   interface ResourceBrowserProps {
     initialFilters?: ResourceFilters;
   }

   interface ResourceFilters {
     status?: 'pending' | 'approved' | 'rejected' | 'archived' | 'all';
     category?: string;
     subcategory?: string;
     search?: string;
     submittedBy?: string;
     dateRange?: { start: Date; end: Date };
     tags?: string[];
   }

   export function ResourceBrowser({ initialFilters }: ResourceBrowserProps) {
     const [filters, setFilters] = useState<ResourceFilters>(initialFilters || {});
     const [selectedRows, setSelectedRows] = useState<string[]>([]);
     const [page, setPage] = useState(1);

     // TanStack Query for data fetching
     const { data, isLoading } = useQuery({
       queryKey: ['/api/admin/resources', filters, page],
       queryFn: () => fetchAdminResources({ ...filters, page, limit: 50 })
     });

     // TanStack Table for rendering
     const table = useReactTable({
       data: data?.resources || [],
       columns: resourceColumns,
       // ... table configuration
     });

     return (
       <div className="resource-browser">
         <ResourceFilters filters={filters} onFilterChange={setFilters} />
         <BulkActionsToolbar
           selectedIds={selectedRows}
           onAction={handleBulkAction}
         />
         <DataTable table={table} />
         <Pagination page={page} total={data?.total} onChange={setPage} />
       </div>
     );
   }
   ```

2. **Define Column Schema**:
   ```typescript
   const resourceColumns: ColumnDef<Resource>[] = [
     {
       id: 'select',
       header: ({ table }) => (
         <Checkbox
           checked={table.getIsAllPageRowsSelected()}
           onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
         />
       ),
       cell: ({ row }) => (
         <Checkbox
           checked={row.getIsSelected()}
           onCheckedChange={(value) => row.toggleSelected(!!value)}
         />
       ),
     },
     {
       accessorKey: 'title',
       header: 'Title',
       cell: ({ row }) => (
         <div className="flex items-center gap-2">
           <span className="font-medium">{row.original.title}</span>
           <a href={row.original.url} target="_blank" className="text-blue-500">
             <ExternalLink className="h-3 w-3" />
           </a>
         </div>
       ),
     },
     {
       accessorKey: 'category',
       header: 'Category',
       cell: ({ row }) => (
         <Badge variant="outline">{row.original.category}</Badge>
       ),
     },
     {
       accessorKey: 'status',
       header: 'Status',
       cell: ({ row }) => {
         const status = row.original.status;
         const variant = {
           approved: 'success',
           pending: 'warning',
           rejected: 'destructive',
           archived: 'secondary'
         }[status];
         return <Badge variant={variant}>{status}</Badge>;
       },
     },
     {
       accessorKey: 'updatedAt',
       header: 'Last Modified',
       cell: ({ row }) => formatDistanceToNow(new Date(row.original.updatedAt)),
     },
     {
       id: 'actions',
       header: 'Actions',
       cell: ({ row }) => (
         <DropdownMenu>
           <DropdownMenuTrigger asChild>
             <Button variant="ghost" size="sm">
               <MoreHorizontal className="h-4 w-4" />
             </Button>
           </DropdownMenuTrigger>
           <DropdownMenuContent align="end">
             <DropdownMenuItem onClick={() => handleEdit(row.original)}>
               <Edit className="h-4 w-4 mr-2" /> Edit
             </DropdownMenuItem>
             <DropdownMenuItem onClick={() => handleViewDetails(row.original)}>
               <Eye className="h-4 w-4 mr-2" /> View Details
             </DropdownMenuItem>
             <DropdownMenuSeparator />
             <DropdownMenuItem onClick={() => handleDelete(row.original)}>
               <Trash className="h-4 w-4 mr-2" /> Archive
             </DropdownMenuItem>
           </DropdownMenuContent>
         </DropdownMenu>
       ),
     },
   ];
   ```

**Verification**:
- [ ] TypeScript compiles without errors
- [ ] Component renders skeleton loading state
- [ ] Column definitions typed correctly

**Exit Criteria**: Component structure complete, ready for implementation

---

### Task 2.2: Implement Resource Filters Component (45 min)
**Skill**: `test-driven-development` (write tests first)

**TDD Cycle**:

**🔴 RED** (10 min):
```typescript
// File: client/src/components/admin/ResourceFilters.test.tsx

describe('ResourceFilters', () => {
  it('renders all filter controls', () => {
    render(<ResourceFilters filters={{}} onFilterChange={jest.fn()} />);
    expect(screen.getByPlaceholderText('Search resources...')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Status' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Category' })).toBeInTheDocument();
  });

  it('calls onFilterChange when search input changes', () => {
    const mockOnChange = jest.fn();
    render(<ResourceFilters filters={{}} onFilterChange={mockOnChange} />);

    const searchInput = screen.getByPlaceholderText('Search resources...');
    fireEvent.change(searchInput, { target: { value: 'ffmpeg' } });

    expect(mockOnChange).toHaveBeenCalledWith({ search: 'ffmpeg' });
  });

  it('shows active filter badges', () => {
    render(<ResourceFilters filters={{ status: 'pending', category: 'Encoding & Codecs' }} onFilterChange={jest.fn()} />);
    expect(screen.getByText('Status: pending')).toBeInTheDocument();
    expect(screen.getByText('Category: Encoding & Codecs')).toBeInTheDocument();
  });
});
```

**Run test**: `npm test ResourceFilters.test.tsx`
**Expected**: ❌ FAIL (component doesn't exist yet)

**🟢 GREEN** (25 min):
```typescript
// File: client/src/components/admin/ResourceFilters.tsx

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface ResourceFiltersProps {
  filters: ResourceFilters;
  onFilterChange: (filters: ResourceFilters) => void;
}

export function ResourceFilters({ filters, onFilterChange }: ResourceFiltersProps) {
  // Fetch categories for dropdown
  const { data: categories } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: () => fetch('/api/categories').then(r => r.json())
  });

  const handleSearchChange = (search: string) => {
    onFilterChange({ ...filters, search: search || undefined });
  };

  const handleStatusChange = (status: string) => {
    onFilterChange({ ...filters, status: status === 'all' ? undefined : status });
  };

  const handleCategoryChange = (category: string) => {
    onFilterChange({ ...filters, category: category === 'all' ? undefined : category });
  };

  const handleRemoveFilter = (key: keyof ResourceFilters) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    onFilterChange(newFilters);
  };

  // Active filter badges
  const activeFilters = Object.entries(filters).filter(([k, v]) => v !== undefined);

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-card">
      {/* Search */}
      <Input
        placeholder="Search resources..."
        value={filters.search || ''}
        onChange={(e) => handleSearchChange(e.target.value)}
        className="max-w-md"
      />

      {/* Dropdowns */}
      <div className="flex gap-4 flex-wrap">
        <Select value={filters.status || 'all'} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.category || 'all'} onValueChange={handleCategoryChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories?.map(cat => (
              <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Add more filters: date range, tags, etc */}
      </div>

      {/* Active filter badges */}
      {activeFilters.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {activeFilters.map(([key, value]) => (
            <Badge key={key} variant="secondary" className="gap-1">
              {key}: {String(value)}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleRemoveFilter(key as keyof ResourceFilters)}
              />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Run test**: `npm test ResourceFilters.test.tsx`
**Expected**: ✅ PASS

**♻️ REFACTOR** (10 min):
- Extract filter badge logic to separate component
- Add debouncing to search input (300ms delay)
- Memoize category options

**Verification**:
- [ ] Tests pass
- [ ] Search updates filters with debounce
- [ ] Status/category dropdowns work
- [ ] Active filters show as removable badges
- [ ] TypeScript types correct

**Exit Criteria**: Filters component complete and tested

---

### Task 2.3: Build Backend API for Admin Resource Management (60 min)

**Steps**:

1. **Add GET /api/admin/resources Endpoint** (20 min):
   ```typescript
   // File: server/routes.ts (add after existing admin routes)

   // GET /api/admin/resources - List ALL resources with advanced filtering (admin only)
   app.get('/api/admin/resources', isAuthenticated, isAdmin, async (req, res) => {
     try {
       const page = parseInt(req.query.page as string) || 1;
       const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
       const status = req.query.status as string; // 'all' | 'pending' | 'approved' | etc
       const category = req.query.category as string;
       const subcategory = req.query.subcategory as string;
       const search = req.query.search as string;
       const submittedBy = req.query.submittedBy as string;
       const dateFrom = req.query.dateFrom as string;
       const dateTo = req.query.dateTo as string;

       const result = await storage.listAdminResources({
         page,
         limit,
         status: status === 'all' ? undefined : status,
         category,
         subcategory,
         search,
         submittedBy,
         dateFrom: dateFrom ? new Date(dateFrom) : undefined,
         dateTo: dateTo ? new Date(dateTo) : undefined,
       });

       res.json(result);
     } catch (error) {
       console.error('Error fetching admin resources:', error);
       res.status(500).json({ message: 'Failed to fetch resources' });
     }
   });
   ```

2. **Implement storage.listAdminResources()** (30 min):
   ```typescript
   // File: server/storage.ts

   async listAdminResources(options: AdminResourceListOptions): Promise<ResourceListResult> {
     const { page, limit, status, category, subcategory, search, submittedBy, dateFrom, dateTo } = options;

     let query = db.select().from(resources);

     // Apply filters
     const conditions: SQL[] = [];

     if (status) {
       conditions.push(eq(resources.status, status));
     }

     if (category) {
       conditions.push(eq(resources.category, category));
     }

     if (subcategory) {
       conditions.push(eq(resources.subcategory, subcategory));
     }

     if (search) {
       // Full-text search using pg_trgm
       conditions.push(
         sql`${resources.searchVector} @@ plainto_tsquery('english', ${search})`
       );
     }

     if (submittedBy) {
       conditions.push(eq(resources.submittedBy, submittedBy));
     }

     if (dateFrom) {
       conditions.push(gte(resources.createdAt, dateFrom));
     }

     if (dateTo) {
       conditions.push(lte(resources.createdAt, dateTo));
     }

     if (conditions.length > 0) {
       query = query.where(and(...conditions));
     }

     // Count total before pagination
     const [{ count: total }] = await db
       .select({ count: sql<number>`count(*)::int` })
       .from(resources)
       .where(conditions.length > 0 ? and(...conditions) : undefined);

     // Apply pagination and sorting
     const offset = (page - 1) * limit;
     const results = await query
       .orderBy(desc(resources.updatedAt))
       .limit(limit)
       .offset(offset);

     return {
       resources: results,
       total,
       page,
       limit,
       totalPages: Math.ceil(total / limit)
     };
   }
   ```

3. **Test Endpoint** (10 min):
   ```bash
   # Test basic fetch
   curl -H "Authorization: Bearer $ADMIN_TOKEN" \
     "http://localhost:3000/api/admin/resources?page=1&limit=10"

   # Test filtering
   curl -H "Authorization: Bearer $ADMIN_TOKEN" \
     "http://localhost:3000/api/admin/resources?status=pending&category=Encoding%20%26%20Codecs"

   # Test search
   curl -H "Authorization: Bearer $ADMIN_TOKEN" \
     "http://localhost:3000/api/admin/resources?search=ffmpeg&limit=20"
   ```

**Verification**:
- [ ] GET /api/admin/resources returns 200 with resources array
- [ ] Pagination works (page, limit, total, totalPages)
- [ ] Status filter works (pending, approved, rejected, all)
- [ ] Category filter works
- [ ] Search works (full-text search on title, description)
- [ ] Date range filter works
- [ ] Multiple filters combine correctly (AND logic)
- [ ] Non-admin users get 403 Forbidden

**Exit Criteria**: Admin resources endpoint fully functional

---

### Task 2.4: Implement Resource Edit Modal (60 min)
**Skill**: `react-hook-form-zod` skill (if available), else manual RHF + Zod

**Steps**:

1. **Define Zod Schema** (10 min):
   ```typescript
   // File: client/src/components/admin/ResourceEditModal.tsx

   import { z } from 'zod';
   import { useForm } from 'react-hook-form';
   import { zodResolver } from '@hookform/resolvers/zod';

   const resourceEditSchema = z.object({
     title: z.string().min(3).max(200),
     url: z.string().url(),
     description: z.string().max(2000).optional(),
     category: z.string(),
     subcategory: z.string().optional(),
     subSubcategory: z.string().optional(),
     status: z.enum(['pending', 'approved', 'rejected', 'archived']),
     tags: z.array(z.string()).max(20).optional(),
   });

   type ResourceEditForm = z.infer<typeof resourceEditSchema>;
   ```

2. **Build Modal Component** (40 min):
   ```typescript
   interface ResourceEditModalProps {
     resource: Resource;
     isOpen: boolean;
     onClose: () => void;
     onSave: (updated: Partial<Resource>) => Promise<void>;
   }

   export function ResourceEditModal({ resource, isOpen, onClose, onSave }: ResourceEditModalProps) {
     const form = useForm<ResourceEditForm>({
       resolver: zodResolver(resourceEditSchema),
       defaultValues: {
         title: resource.title,
         url: resource.url,
         description: resource.description || '',
         category: resource.category,
         subcategory: resource.subcategory || '',
         subSubcategory: resource.subSubcategory || '',
         status: resource.status,
         tags: [], // TODO: Load existing tags
       },
     });

     const [isSubmitting, setIsSubmitting] = useState(false);

     const handleSubmit = async (data: ResourceEditForm) => {
       setIsSubmitting(true);
       try {
         await onSave(data);
         onClose();
       } catch (error) {
         form.setError('root', { message: error.message });
       } finally {
         setIsSubmitting(false);
       }
     };

     return (
       <Dialog open={isOpen} onOpenChange={onClose}>
         <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
           <DialogHeader>
             <DialogTitle>Edit Resource</DialogTitle>
             <DialogDescription>
               Update resource details. Changes are saved immediately.
             </DialogDescription>
           </DialogHeader>

           <Form {...form}>
             <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
               {/* Title */}
               <FormField
                 control={form.control}
                 name="title"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>Title *</FormLabel>
                     <FormControl>
                       <Input {...field} placeholder="Resource title" />
                     </FormControl>
                     <FormMessage />
                   </FormItem>
                 )}
               />

               {/* URL */}
               <FormField
                 control={form.control}
                 name="url"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>URL *</FormLabel>
                     <FormControl>
                       <Input {...field} type="url" placeholder="https://..." />
                     </FormControl>
                     <FormMessage />
                   </FormItem>
                 )}
               />

               {/* Description */}
               <FormField
                 control={form.control}
                 name="description"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>Description</FormLabel>
                     <FormControl>
                       <Textarea {...field} rows={4} placeholder="Describe the resource..." />
                     </FormControl>
                     <FormMessage />
                   </FormItem>
                 )}
               />

               {/* Category, Subcategory, Status (similar pattern) */}

               {/* Action Buttons */}
               <DialogFooter>
                 <Button type="button" variant="outline" onClick={onClose}>
                   Cancel
                 </Button>
                 <Button type="submit" disabled={isSubmitting}>
                   {isSubmitting ? 'Saving...' : 'Save Changes'}
                 </Button>
               </DialogFooter>
             </form>
           </Form>
         </DialogContent>
       </Dialog>
     );
   }
   ```

3. **Add Update Endpoint** (10 min):
   ```typescript
   // File: server/routes.ts

   // PUT /api/admin/resources/:id - Update any resource field (admin only)
   app.put('/api/admin/resources/:id', isAuthenticated, isAdmin, async (req, res) => {
     try {
       const id = req.params.id; // UUID string
       const updates = req.body; // Partial<Resource>

       // Validate allowed fields (prevent updating id, createdAt, etc)
       const allowedFields = ['title', 'url', 'description', 'category', 'subcategory', 'subSubcategory', 'status'];
       const sanitized = Object.keys(updates)
         .filter(key => allowedFields.includes(key))
         .reduce((obj, key) => ({ ...obj, [key]: updates[key] }), {});

       const updated = await storage.updateResource(id, sanitized);

       res.json(updated);
     } catch (error) {
       console.error('Error updating resource:', error);
       res.status(500).json({ message: 'Failed to update resource' });
     }
   });
   ```

**Verification**:
- [ ] Modal opens with pre-filled form data
- [ ] Validation works (try invalid URL, too-long title)
- [ ] Save button disabled during submission
- [ ] Success updates resource in database
- [ ] Errors shown in form (not just console)
- [ ] Cancel closes modal without saving
- [ ] Optimistic update in parent component

**Exit Criteria**: Resource editing fully functional

---

### Task 2.5: Implement Bulk Actions Toolbar (45 min)

**Steps**:

1. **Create Toolbar Component** (30 min):
   ```typescript
   // File: client/src/components/admin/BulkActionsToolbar.tsx

   interface BulkActionsToolbarProps {
     selectedIds: string[];
     onAction: (action: BulkAction, ids: string[]) => Promise<void>;
     onClearSelection: () => void;
   }

   type BulkAction = 'approve' | 'reject' | 'archive' | 'delete' | 'tag' | 'export';

   export function BulkActionsToolbar({ selectedIds, onAction, onClearSelection }: BulkActionsToolbarProps) {
     const [isProcessing, setIsProcessing] = useState(false);
     const [showTagDialog, setShowTagDialog] = useState(false);

     const handleAction = async (action: BulkAction) => {
       if (selectedIds.length === 0) return;

       // Confirm destructive actions
       if (['delete', 'reject'].includes(action)) {
         const confirmed = window.confirm(
           `Are you sure you want to ${action} ${selectedIds.length} resource(s)?`
         );
         if (!confirmed) return;
       }

       setIsProcessing(true);
       try {
         await onAction(action, selectedIds);
         onClearSelection();
       } catch (error) {
         console.error(`Bulk ${action} failed:`, error);
         alert(`Failed to ${action} resources. See console for details.`);
       } finally {
         setIsProcessing(false);
       }
     };

     if (selectedIds.length === 0) {
       return null; // Hide when nothing selected
     }

     return (
       <div className="flex items-center gap-4 p-4 bg-muted/50 border rounded-lg">
         <span className="font-medium">
           {selectedIds.length} resource{selectedIds.length !== 1 ? 's' : ''} selected
         </span>

         <div className="flex gap-2 flex-1">
           <Button
             size="sm"
             variant="default"
             onClick={() => handleAction('approve')}
             disabled={isProcessing}
           >
             <Check className="h-4 w-4 mr-1" /> Approve
           </Button>

           <Button
             size="sm"
             variant="secondary"
             onClick={() => handleAction('reject')}
             disabled={isProcessing}
           >
             <X className="h-4 w-4 mr-1" /> Reject
           </Button>

           <Button
             size="sm"
             variant="outline"
             onClick={() => handleAction('archive')}
             disabled={isProcessing}
           >
             <Archive className="h-4 w-4 mr-1" /> Archive
           </Button>

           <Button
             size="sm"
             variant="outline"
             onClick={() => setShowTagDialog(true)}
             disabled={isProcessing}
           >
             <Tag className="h-4 w-4 mr-1" /> Add Tags
           </Button>

           <Button
             size="sm"
             variant="outline"
             onClick={() => handleAction('export')}
             disabled={isProcessing}
           >
             <Download className="h-4 w-4 mr-1" /> Export CSV
           </Button>
         </div>

         <Button
           size="sm"
           variant="ghost"
           onClick={onClearSelection}
         >
           Clear Selection
         </Button>
       </div>
     );
   }
   ```

2. **Add Bulk Operations Endpoint** (15 min):
   ```typescript
   // File: server/routes.ts

   // POST /api/admin/resources/bulk - Bulk update resources
   app.post('/api/admin/resources/bulk', isAuthenticated, isAdmin, async (req, res) => {
     try {
       const { action, resourceIds, data } = req.body;
       const userId = req.user.id;

       // Validate input
       if (!action || !resourceIds || !Array.isArray(resourceIds)) {
         return res.status(400).json({ message: 'Invalid request body' });
       }

       if (resourceIds.length === 0 || resourceIds.length > 100) {
         return res.status(400).json({ message: 'Must select 1-100 resources' });
       }

       let result;
       switch (action) {
         case 'approve':
           result = await storage.bulkUpdateStatus(resourceIds, 'approved', userId);
           break;
         case 'reject':
           result = await storage.bulkUpdateStatus(resourceIds, 'rejected', userId);
           break;
         case 'archive':
           result = await storage.bulkUpdateStatus(resourceIds, 'archived', userId);
           break;
         case 'delete':
           result = await storage.bulkDeleteResources(resourceIds);
           break;
         case 'tag':
           result = await storage.bulkAddTags(resourceIds, data.tags);
           break;
         default:
           return res.status(400).json({ message: 'Invalid action' });
       }

       res.json({ success: true, affected: result.count });
     } catch (error) {
       console.error('Bulk operation failed:', error);
       res.status(500).json({ message: 'Bulk operation failed' });
     }
   });
   ```

**Verification**:
- [ ] Toolbar shows when rows selected
- [ ] Toolbar hides when selection cleared
- [ ] Approve button works (bulk approve 5 resources)
- [ ] Reject button works with confirmation
- [ ] Archive button works
- [ ] Export generates CSV with selected resources
- [ ] Selection cleared after successful action
- [ ] Errors displayed to user

**Exit Criteria**: Bulk operations functional for all actions

---

### Task 2.6: Implement storage.bulkUpdateStatus() and bulkDeleteResources() (45 min)

**Steps**:

1. **Add Bulk Update Method** (25 min):
   ```typescript
   // File: server/storage.ts

   async bulkUpdateStatus(
     resourceIds: string[],
     status: ResourceStatus,
     approvedBy: string
   ): Promise<{ count: number }> {
     // Use transaction for atomicity
     await db.transaction(async (tx) => {
       // Update all resources
       await tx
         .update(resources)
         .set({
           status,
           approvedBy: status === 'approved' ? approvedBy : null,
           approvedAt: status === 'approved' ? new Date() : null,
           updatedAt: new Date(),
         })
         .where(inArray(resources.id, resourceIds));

       // Log bulk action in audit log
       for (const resourceId of resourceIds) {
         await tx.insert(resourceAuditLog).values({
           id: uuidv4(),
           resourceId,
           action: `bulk_${status}`,
           performedBy: approvedBy,
           changes: { status },
           createdAt: new Date(),
         });
       }
     });

     return { count: resourceIds.length };
   }
   ```

2. **Add Bulk Delete Method** (20 min):
   ```typescript
   async bulkDeleteResources(resourceIds: string[]): Promise<{ count: number }> {
     // Soft delete (archive) by default for safety
     await db
       .update(resources)
       .set({
         status: 'archived',
         updatedAt: new Date(),
       })
       .where(inArray(resources.id, resourceIds));

     return { count: resourceIds.length };
   }

   // For hard delete (use with extreme caution):
   async bulkDeleteResourcesPermanent(resourceIds: string[]): Promise<{ count: number }> {
     const deleted = await db
       .delete(resources)
       .where(inArray(resources.id, resourceIds))
       .returning();

     return { count: deleted.length };
   }
   ```

**Verification**:
- [ ] Bulk approve 10 resources: All status → approved
- [ ] Bulk reject 5 resources: All status → rejected
- [ ] Bulk archive 3 resources: All status → archived
- [ ] Audit log records each action
- [ ] Transaction rollback on error (test by causing constraint violation)
- [ ] Performance: 100 resource bulk update < 2 seconds

**Exit Criteria**: Bulk operations reliable and atomic

---

### Task 2.7: Add Resource Delete/Archive Functionality (30 min)

**Steps**:

1. **Add Delete Confirmation Dialog**:
   ```typescript
   // In ResourceBrowser component

   const [deleteTarget, setDeleteTarget] = useState<Resource | null>(null);

   const handleDelete = async (resource: Resource) => {
     setDeleteTarget(resource);
   };

   const confirmDelete = async () => {
     if (!deleteTarget) return;

     await apiRequest(`/api/admin/resources/${deleteTarget.id}`, {
       method: 'DELETE',
     });

     setDeleteTarget(null);
     queryClient.invalidateQueries(['/api/admin/resources']);
   };
   ```

2. **Add DELETE Endpoint**:
   ```typescript
   // File: server/routes.ts

   // DELETE /api/admin/resources/:id - Archive resource (admin only)
   app.delete('/api/admin/resources/:id', isAuthenticated, isAdmin, async (req, res) => {
     try {
       const id = req.params.id;

       // Soft delete (archive)
       const archived = await storage.archiveResource(id);

       res.json({ success: true, resource: archived });
     } catch (error) {
       console.error('Error archiving resource:', error);
       res.status(500).json({ message: 'Failed to archive resource' });
     }
   });
   ```

**Verification**:
- [ ] Delete shows confirmation dialog
- [ ] Confirm archives resource (status → archived)
- [ ] Cancel closes dialog without action
- [ ] Archived resources not visible in public /api/resources
- [ ] Archived resources visible in admin browser with status filter
- [ ] Audit log records archive action

**Exit Criteria**: Delete/archive functional with safety confirmations

---

### Task 2.8: Add CSV Export Functionality (30 min)

**Steps**:

1. **Create Export Utility**:
   ```typescript
   // File: client/src/lib/exportUtils.ts

   export function exportResourcesAsCSV(resources: Resource[]): void {
     const headers = ['ID', 'Title', 'URL', 'Description', 'Category', 'Subcategory', 'Status', 'Created', 'Approved'];

     const rows = resources.map(r => [
       r.id,
       `"${r.title.replace(/"/g, '""')}"`, // Escape quotes
       r.url,
       `"${(r.description || '').replace(/"/g, '""')}"`,
       r.category,
       r.subcategory || '',
       r.status,
       r.createdAt,
       r.approvedAt || '',
     ]);

     const csv = [headers, ...rows]
       .map(row => row.join(','))
       .join('\n');

     // Trigger download
     const blob = new Blob([csv], { type: 'text/csv' });
     const url = URL.createObjectURL(blob);
     const a = document.createElement('a');
     a.href = url;
     a.download = `awesome-video-resources-${new Date().toISOString().split('T')[0]}.csv`;
     document.body.appendChild(a);
     a.click();
     document.body.removeChild(a);
     URL.revokeObjectURL(url);
   }
   ```

2. **Wire to Bulk Actions**:
   ```typescript
   const handleBulkAction = async (action: BulkAction, ids: string[]) => {
     if (action === 'export') {
       const selectedResources = data?.resources.filter(r => ids.includes(r.id)) || [];
       exportResourcesAsCSV(selectedResources);
       return; // Client-side only, no API call
     }

     // ... other actions call API
   };
   ```

**Verification**:
- [ ] Export selected resources (10 items) → CSV downloads
- [ ] CSV has correct headers
- [ ] Data properly escaped (test with quotes in description)
- [ ] Export all filtered resources (not just current page)
- [ ] File named with current date

**Exit Criteria**: CSV export working for any selection

---

**Phase 2 Duration**: 6-7 hours
**Phase 2 Deliverables**:
- Admin resource browser with filters
- Edit modal with validation
- Bulk operations (approve, reject, archive, tag, export)
- CSV export utility
- 3 new API endpoints

---

## Phase 3: Admin Dashboard Redesign

**Type**: UI
**Estimated**: 5-6 hours
**Files**:
- `client/src/components/admin/AdminLayout.tsx` (new, ~200 lines)
- `client/src/components/admin/AdminSidebar.tsx` (new, ~300 lines)
- `client/src/components/admin/DashboardWidgets.tsx` (new, ~400 lines)
- `client/src/components/admin/ActivityFeed.tsx` (new, ~250 lines)
- `client/src/pages/AdminDashboard.tsx` (refactor, ~600 → ~200 lines)
**MCP Tools**: Chrome DevTools, shadcn/ui MCP
**Skills**: `react-expert` agent, `tailwind-v4-shadcn` skill

### Design Vision

**Current**: Simple tab interface (flat navigation)
**New**: Professional admin tool with sidebar navigation + context panels

```
┌─────────────────────────────────────────────────────────┐
│  [Logo] Admin Dashboard               [🔍] [🔔] [👤]   │ ← Top Bar
├─────────┬───────────────────────────────────────────────┤
│ 📊 Dash │  📈 System Overview                          │
│ 📚 Res  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐        │
│ ✓ Pend  │  │2,647 │ │  12  │ │  8   │ │ 95%  │        │
│ 📝 Edits│  │ Res  │ │Pend  │ │Users │ │ Qual │        │
│ 🤖 AI   │  └──────┘ └──────┘ └──────┘ └──────┘        │
│ 🔄 Sync │                                              │
│ 👥 Users│  📊 Recent Activity                          │
│ 🔧 Sett │  • Admin approved "FFmpeg Guide"  2m ago     │
│ 📋 Audit│  • User submitted "AV1 Decoder"   15m ago    │
│ 🗄️ DB   │  • AI enriched 50 resources       1h ago    │
└─────────┴───────────────────────────────────────────────┘
  Sidebar     Main Content Area
```

---

### Task 3.1: Design New Admin Layout Structure (45 min)
**Skill**: `ui-ux-designer` agent (if available)

**Steps**:

1. **Create AdminLayout Component**:
   ```typescript
   // File: client/src/components/admin/AdminLayout.tsx

   interface AdminLayoutProps {
     children: React.ReactNode;
   }

   export function AdminLayout({ children }: AdminLayoutProps) {
     const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

     return (
       <div className="flex h-screen bg-background">
         {/* Sidebar */}
         <AdminSidebar
           collapsed={sidebarCollapsed}
           onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
         />

         {/* Main Area */}
         <div className="flex-1 flex flex-col overflow-hidden">
           {/* Top Bar */}
           <div className="border-b px-6 py-4 flex items-center justify-between">
             <div className="flex items-center gap-4">
               <h1 className="text-2xl font-bold">Admin Dashboard</h1>
             </div>

             <div className="flex items-center gap-4">
               {/* Global search */}
               <Input
                 placeholder="Search anything..."
                 className="w-64"
               />

               {/* Notifications */}
               <Button variant="ghost" size="icon">
                 <Bell className="h-5 w-5" />
               </Button>

               {/* User menu */}
               <DropdownMenu>
                 <DropdownMenuTrigger>
                   <Avatar>
                     <AvatarFallback>A</AvatarFallback>
                   </Avatar>
                 </DropdownMenuTrigger>
                 <DropdownMenuContent>
                   <DropdownMenuItem>Settings</DropdownMenuItem>
                   <DropdownMenuItem>Sign Out</DropdownMenuItem>
                 </DropdownMenuContent>
               </DropdownMenu>
             </div>
           </div>

           {/* Content */}
           <div className="flex-1 overflow-y-auto p-6">
             {children}
           </div>
         </div>
       </div>
     );
   }
   ```

2. **Create AdminSidebar Navigation**:
   ```typescript
   // File: client/src/components/admin/AdminSidebar.tsx

   interface NavItem {
     id: string;
     label: string;
     icon: React.ReactNode;
     href: string;
     badge?: number;
   }

   export function AdminSidebar({ collapsed, onToggle }: AdminSidebarProps) {
     const [location] = useLocation();

     const navItems: NavItem[] = [
       {
         id: 'dashboard',
         label: 'Dashboard',
         icon: <LayoutDashboard className="h-5 w-5" />,
         href: '/admin',
       },
       {
         id: 'resources',
         label: 'All Resources',
         icon: <Database className="h-5 w-5" />,
         href: '/admin/resources',
       },
       {
         id: 'pending',
         label: 'Pending Approvals',
         icon: <CheckCircle className="h-5 w-5" />,
         href: '/admin/pending',
         badge: pendingCount, // From API
       },
       {
         id: 'edits',
         label: 'Edit Suggestions',
         icon: <Edit className="h-5 w-5" />,
         href: '/admin/edits',
         badge: editCount,
       },
       {
         id: 'enrichment',
         label: 'AI Enrichment',
         icon: <Sparkles className="h-5 w-5" />,
         href: '/admin/enrichment',
       },
       {
         id: 'github',
         label: 'GitHub Sync',
         icon: <Github className="h-5 w-5" />,
         href: '/admin/github',
       },
       {
         id: 'users',
         label: 'Users',
         icon: <Users className="h-5 w-5" />,
         href: '/admin/users',
       },
       {
         id: 'settings',
         label: 'Settings',
         icon: <Settings className="h-5 w-5" />,
         href: '/admin/settings',
       },
       {
         id: 'audit',
         label: 'Audit Log',
         icon: <FileText className="h-5 w-5" />,
         href: '/admin/audit',
       },
     ];

     return (
       <aside
         className={cn(
           "border-r bg-card transition-all duration-300",
           collapsed ? "w-16" : "w-64"
         )}
       >
         {/* Logo + Collapse Toggle */}
         <div className="p-4 border-b flex items-center justify-between">
           {!collapsed && <span className="font-bold text-lg">Admin</span>}
           <Button variant="ghost" size="icon" onClick={onToggle}>
             {collapsed ? <ChevronRight /> : <ChevronLeft />}
           </Button>
         </div>

         {/* Navigation */}
         <nav className="p-4 space-y-2">
           {navItems.map(item => (
             <Link key={item.id} href={item.href}>
               <Button
                 variant={location === item.href ? 'secondary' : 'ghost'}
                 className={cn(
                   "w-full justify-start",
                   collapsed && "justify-center px-2"
                 )}
               >
                 {item.icon}
                 {!collapsed && (
                   <>
                     <span className="ml-3">{item.label}</span>
                     {item.badge && (
                       <Badge variant="destructive" className="ml-auto">
                         {item.badge}
                       </Badge>
                     )}
                   </>
                 )}
               </Button>
             </Link>
           ))}
         </nav>
       </aside>
     );
   }
   ```

**Verification**:
- [ ] Sidebar renders with all navigation items
- [ ] Active route highlighted
- [ ] Collapse/expand works smoothly
- [ ] Badge counts fetched from API
- [ ] Icons visible in both modes
- [ ] Mobile responsive (auto-collapse on small screens)

**Exit Criteria**: Navigation structure complete

---

### Task 3.2: Build Dashboard Widgets (90 min)
**Skill**: `react-expert` agent

**Steps**:

1. **Create Stat Widget Component** (30 min):
   ```typescript
   // File: client/src/components/admin/DashboardWidgets.tsx

   interface StatWidgetProps {
     title: string;
     value: string | number;
     change?: number; // Percentage change
     icon: React.ReactNode;
     trend?: 'up' | 'down' | 'neutral';
   }

   function StatWidget({ title, value, change, icon, trend }: StatWidgetProps) {
     return (
       <Card>
         <CardHeader className="flex flex-row items-center justify-between pb-2">
           <CardTitle className="text-sm font-medium text-muted-foreground">
             {title}
           </CardTitle>
           <div className="text-primary">{icon}</div>
         </CardHeader>
         <CardContent>
           <div className="text-3xl font-bold">{value.toLocaleString()}</div>
           {change !== undefined && (
             <div className={cn(
               "text-sm flex items-center gap-1 mt-2",
               trend === 'up' && "text-green-500",
               trend === 'down' && "text-red-500",
               trend === 'neutral' && "text-muted-foreground"
             )}>
               {trend === 'up' && <TrendingUp className="h-4 w-4" />}
               {trend === 'down' && <TrendingDown className="h-4 w-4" />}
               <span>{change > 0 ? '+' : ''}{change}% from last week</span>
             </div>
           )}
         </CardContent>
       </Card>
     );
   }

   export function DashboardWidgets() {
     const { data: stats } = useQuery({
       queryKey: ['/api/admin/stats/detailed'],
       queryFn: () => apiRequest('/api/admin/stats/detailed'),
       refetchInterval: 30000, // Update every 30s
     });

     if (!stats) return <div>Loading stats...</div>;

     return (
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <StatWidget
           title="Total Resources"
           value={stats.totalResources}
           change={stats.resourceGrowth}
           trend={stats.resourceGrowth > 0 ? 'up' : 'neutral'}
           icon={<Database className="h-5 w-5" />}
         />

         <StatWidget
           title="Pending Approvals"
           value={stats.pendingResources}
           icon={<Clock className="h-5 w-5" />}
           trend={stats.pendingResources > 0 ? 'down' : 'neutral'}
         />

         <StatWidget
           title="Active Users"
           value={stats.activeUsers}
           change={stats.userGrowth}
           trend={stats.userGrowth > 0 ? 'up' : 'down'}
           icon={<Users className="h-5 w-5" />}
         />

         <StatWidget
           title="Quality Score"
           value={`${stats.qualityScore}%`}
           change={stats.qualityChange}
           trend={stats.qualityChange > 0 ? 'up' : 'down'}
           icon={<Star className="h-5 w-5" />}
         />
       </div>
     );
   }
   ```

2. **Add Detailed Stats Endpoint** (20 min):
   ```typescript
   // File: server/routes.ts

   // GET /api/admin/stats/detailed - Enhanced dashboard statistics
   app.get('/api/admin/stats/detailed', isAuthenticated, isAdmin, async (req, res) => {
     try {
       const stats = await storage.getDetailedAdminStats();
       res.json(stats);
     } catch (error) {
       console.error('Error fetching detailed stats:', error);
       res.status(500).json({ message: 'Failed to fetch statistics' });
     }
   });
   ```

3. **Implement getDetailedAdminStats()** (40 min):
   ```typescript
   // File: server/storage.ts

   async getDetailedAdminStats(): Promise<DetailedAdminStats> {
     const now = new Date();
     const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

     // Current counts
     const [current] = await db.select({
       totalResources: sql<number>`COUNT(DISTINCT ${resources.id})::int`,
       pendingResources: sql<number>`COUNT(DISTINCT CASE WHEN ${resources.status} = 'pending' THEN ${resources.id} END)::int`,
       approvedResources: sql<number>`COUNT(DISTINCT CASE WHEN ${resources.status} = 'approved' THEN ${resources.id} END)::int`,
     }).from(resources);

     // Week-ago counts for growth calculation
     const [weekAgo] = await db.select({
       totalResources: sql<number>`COUNT(DISTINCT ${resources.id})::int`,
     })
     .from(resources)
     .where(lte(resources.createdAt, sevenDaysAgo));

     // User counts from Supabase Auth
     const { count: totalUsers } = await supabaseAdmin
       .from('auth.users')
       .select('*', { count: 'exact', head: true });

     const { count: activeUsers } = await supabaseAdmin
       .from('auth.users')
       .select('*', { count: 'exact', head: true })
       .gte('last_sign_in_at', sevenDaysAgo.toISOString());

     // Quality score (resources with descriptions, tags, metadata)
     const [quality] = await db.select({
       withDescription: sql<number>`COUNT(DISTINCT CASE WHEN ${resources.description} IS NOT NULL AND ${resources.description} != '' THEN ${resources.id} END)::int`,
       total: sql<number>`COUNT(DISTINCT ${resources.id})::int`,
     }).from(resources).where(eq(resources.status, 'approved'));

     const qualityScore = Math.round((quality.withDescription / quality.total) * 100);

     return {
       totalResources: current.totalResources,
       pendingResources: current.pendingResources,
       approvedResources: current.approvedResources,
       totalUsers: totalUsers || 0,
       activeUsers: activeUsers || 0,
       resourceGrowth: weekAgo.totalResources > 0
         ? Math.round(((current.totalResources - weekAgo.totalResources) / weekAgo.totalResources) * 100)
         : 0,
       userGrowth: 0, // TODO: Need week-ago user count
       qualityScore,
       qualityChange: 0, // TODO: Need week-ago quality score
     };
   }
   ```

**Verification**:
- [ ] All 4 widgets render with live data
- [ ] Counts match database (verify with SQL)
- [ ] Growth percentages calculated correctly
- [ ] Auto-refresh every 30 seconds
- [ ] Loading states during fetch
- [ ] Error states if API fails

**Exit Criteria**: Dashboard widgets displaying real-time stats

---

### Task 3.3: Build Activity Feed Component (60 min)

**Steps**:

1. **Query Audit Log for Recent Activity**:
   ```typescript
   // Add to server/storage.ts

   async getRecentActivity(limit: number = 20): Promise<AuditLogEntry[]> {
     const entries = await db
       .select({
         id: resourceAuditLog.id,
         action: resourceAuditLog.action,
         resourceId: resourceAuditLog.resourceId,
         resourceTitle: resources.title,
         performedBy: resourceAuditLog.performedBy,
         performedByEmail: sql<string>`auth_users.email`, // Need join to auth.users
         changes: resourceAuditLog.changes,
         createdAt: resourceAuditLog.createdAt,
       })
       .from(resourceAuditLog)
       .leftJoin(resources, eq(resourceAuditLog.resourceId, resources.id))
       .orderBy(desc(resourceAuditLog.createdAt))
       .limit(limit);

     return entries;
   }
   ```

2. **Create Activity Feed UI**:
   ```typescript
   // File: client/src/components/admin/ActivityFeed.tsx

   export function ActivityFeed() {
     const { data: activities } = useQuery({
       queryKey: ['/api/admin/activity'],
       queryFn: () => apiRequest('/api/admin/activity'),
       refetchInterval: 10000, // Refresh every 10s
     });

     return (
       <Card>
         <CardHeader>
           <CardTitle>Recent Activity</CardTitle>
           <CardDescription>Latest admin actions and system events</CardDescription>
         </CardHeader>
         <CardContent>
           <div className="space-y-4">
             {activities?.map(activity => (
               <div key={activity.id} className="flex items-start gap-4 text-sm">
                 <div className="mt-1">
                   {getActivityIcon(activity.action)}
                 </div>
                 <div className="flex-1">
                   <p className="font-medium">
                     {formatActivity(activity)}
                   </p>
                   <p className="text-muted-foreground text-xs">
                     {activity.performedByEmail} • {formatDistanceToNow(new Date(activity.createdAt))} ago
                   </p>
                 </div>
               </div>
             ))}
           </div>
         </CardContent>
       </Card>
     );
   }

   function getActivityIcon(action: string) {
     switch (action) {
       case 'approved': return <CheckCircle className="h-4 w-4 text-green-500" />;
       case 'rejected': return <XCircle className="h-4 w-4 text-red-500" />;
       case 'created': return <Plus className="h-4 w-4 text-blue-500" />;
       case 'updated': return <Edit className="h-4 w-4 text-yellow-500" />;
       case 'bulk_approve': return <CheckSquare className="h-4 w-4 text-green-500" />;
       default: return <Activity className="h-4 w-4 text-gray-500" />;
     }
   }

   function formatActivity(activity: AuditLogEntry): string {
     switch (activity.action) {
       case 'approved':
         return `Approved "${activity.resourceTitle}"`;
       case 'rejected':
         return `Rejected "${activity.resourceTitle}"`;
       case 'bulk_approve':
         return `Bulk approved ${activity.changes.count} resources`;
       // ... more cases
       default:
         return `${activity.action} on "${activity.resourceTitle}"`;
     }
   }
   ```

**Verification**:
- [ ] Feed shows last 20 activities
- [ ] Icons match action types
- [ ] Timestamps in relative format ("2m ago")
- [ ] Auto-refreshes every 10 seconds
- [ ] Clicking activity item navigates to resource
- [ ] Empty state when no activity

**Exit Criteria**: Activity feed displaying real-time admin actions

---

### Task 3.4: Refactor AdminDashboard to Use New Layout (45 min)

**Steps**:

1. **Update AdminDashboard Page**:
   ```typescript
   // File: client/src/pages/AdminDashboard.tsx (refactor)

   import { AdminLayout } from '@/components/admin/AdminLayout';
   import { DashboardWidgets } from '@/components/admin/DashboardWidgets';
   import { ActivityFeed } from '@/components/admin/ActivityFeed';
   import { ResourceBrowser } from '@/components/admin/ResourceBrowser';

   export default function AdminDashboard() {
     return (
       <AdminLayout>
         {/* Dashboard Overview */}
         <div className="space-y-6">
           <div>
             <h2 className="text-2xl font-bold mb-2">Overview</h2>
             <p className="text-muted-foreground">
               System health and recent activity
             </p>
           </div>

           <DashboardWidgets />

           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             <ActivityFeed />

             <Card>
               <CardHeader>
                 <CardTitle>Quick Actions</CardTitle>
               </CardHeader>
               <CardContent className="grid grid-cols-2 gap-4">
                 <Link href="/admin/pending">
                   <Button className="w-full" variant="outline">
                     <CheckCircle className="mr-2 h-4 w-4" />
                     Review Pending
                   </Button>
                 </Link>

                 <Link href="/admin/enrichment">
                   <Button className="w-full" variant="outline">
                     <Sparkles className="mr-2 h-4 w-4" />
                     AI Enrichment
                   </Button>
                 </Link>

                 <Link href="/admin/github">
                   <Button className="w-full" variant="outline">
                     <Github className="mr-2 h-4 w-4" />
                     GitHub Sync
                   </Button>
                 </Link>

                 <Link href="/admin/resources">
                   <Button className="w-full" variant="outline">
                     <Database className="mr-2 h-4 w-4" />
                     Browse All
                   </Button>
                 </Link>
               </CardContent>
             </Card>
           </div>
         </div>
       </AdminLayout>
     );
   }
   ```

2. **Add New Admin Routes** (15 min):
   ```typescript
   // File: client/src/App.tsx (add to Switch)

   <Route path="/admin" component={() => (
     <AdminGuard>
       <AdminDashboard />
     </AdminGuard>
   )} />

   <Route path="/admin/resources" component={() => (
     <AdminGuard>
       <AdminLayout>
         <ResourceBrowser initialFilters={{ status: 'all' }} />
       </AdminLayout>
     </AdminGuard>
   )} />

   <Route path="/admin/pending" component={() => (
     <AdminGuard>
       <AdminLayout>
         <ResourceBrowser initialFilters={{ status: 'pending' }} />
       </AdminLayout>
     </AdminGuard>
   )} />

   {/* More admin routes... */}
   ```

**Verification**:
- [ ] /admin shows redesigned dashboard
- [ ] All widgets display correct data
- [ ] Activity feed updates in real-time
- [ ] Quick action buttons navigate correctly
- [ ] Layout responsive (mobile, tablet, desktop)
- [ ] Sidebar collapse persists in localStorage

**Exit Criteria**: Dashboard redesign complete and functional

---

**Phase 3 Duration**: 5-6 hours
**Phase 3 Deliverables**:
- Professional admin layout with sidebar navigation
- 4 stat widgets with live data
- Activity feed with real-time updates
- Quick action shortcuts
- Responsive design

---

## Phase 4: Validate Untested Features

**Type**: Testing + Bug Fixes
**Estimated**: 8-10 hours
**Files**: Multiple (bug fixes as discovered)
**MCP Tools**: Chrome DevTools, Supabase, Playwright
**Skills**: `systematic-debugging`, `testing-anti-patterns`

---

### Task 4.1: Test Search Functionality (60 min)
**Skill**: `systematic-debugging`

**Current State**: Search dialog opens, but actual search untested

**Steps**:

1. **Test Client-Side Search** (20 min):
   - Navigate to homepage via Chrome MCP
   - Press `/` key (keyboard shortcut)
   - **Verification**: Search dialog opens
   - Type: `ffmpeg`
   - **Verification**: Results filter in real-time
   - Click result
   - **Verification**: Navigates to resource page
   - Test empty search: ``
   - **Verification**: Shows placeholder or all resources

2. **Test Full-Text Search API** (20 min):
   ```bash
   # Test search endpoint
   curl "http://localhost:3000/api/resources?search=ffmpeg&limit=10"

   # Expected: Resources with "ffmpeg" in title or description
   ```

   - Verify Postgres full-text search working:
     ```sql
     SELECT id, title, description,
            ts_rank(search_vector, plainto_tsquery('english', 'ffmpeg')) as rank
     FROM resources
     WHERE search_vector @@ plainto_tsquery('english', 'ffmpeg')
     ORDER BY rank DESC
     LIMIT 10;
     ```

3. **Test Search Edge Cases** (20 min):
   - Special characters: `H.264/AVC`
   - Multi-word: `video streaming protocol`
   - Misspellings: `ffmeg` (should still find ffmpeg?)
   - Empty: `` (return all or error?)
   - Very long query: `[500 character string]` (truncate or reject?)

**Verification**:
- [ ] Search returns relevant results
- [ ] Ranking by relevance works (pg_trgm or ts_rank)
- [ ] Search works across title AND description
- [ ] Special characters handled
- [ ] Empty search handled gracefully
- [ ] Search performance < 500ms for 2,646 resources

**Exit Criteria**: Search fully functional with edge cases handled

---

### Task 4.2: Test Bookmarks Functionality (60 min)

**Current State**: UI exists, backend endpoints exist, integration untested

**Steps**:

1. **Test Add Bookmark** (15 min):
   - Login as regular user (not admin)
   - Navigate to category page
   - Click bookmark icon on resource card
   - **Verification**: Icon changes to "bookmarked" state
   - **Verification**: Toast notification "Added to bookmarks"
   - Query database:
     ```sql
     SELECT * FROM user_bookmarks
     WHERE user_id = '[user-id]' AND resource_id = '[resource-id]';
     ```
   - **Verification**: Row created

2. **Test Remove Bookmark** (10 min):
   - Click bookmark icon again (toggle off)
   - **Verification**: Icon returns to unbookmarked state
   - **Verification**: Toast "Removed from bookmarks"
   - Query database:
     - **Verification**: Row deleted

3. **Test Bookmarks Page** (20 min):
   - Navigate to /bookmarks
   - **Verification**: Shows all bookmarked resources
   - **Verification**: Resources grouped by category
   - Add notes to bookmark:
     - Click "Add note" button
     - Type: "Watch this for FFmpeg tutorial"
     - Save
   - **Verification**: Notes saved and displayed
   - Remove bookmark from /bookmarks page
   - **Verification**: Removed from list

4. **Test Bookmark Persistence** (15 min):
   - Add 5 bookmarks
   - Logout
   - Login again
   - Navigate to /bookmarks
   - **Verification**: All 5 bookmarks still present
   - **Verification**: Notes preserved

**Verification**:
- [ ] Add bookmark API works (POST /api/bookmarks/:resourceId)
- [ ] Remove bookmark API works (DELETE /api/bookmarks/:resourceId)
- [ ] List bookmarks API works (GET /api/bookmarks)
- [ ] Notes field saves and loads
- [ ] Optimistic updates in UI
- [ ] RLS prevents users from seeing others' bookmarks

**Exit Criteria**: Bookmarks fully functional end-to-end

---

### Task 4.3: Test Favorites Functionality (45 min)

**Similar to bookmarks but simpler (no notes field)**

**Steps**:

1. **Test Add/Remove Favorite** (20 min):
   - Click star icon on resource card
   - **Verification**: Star filled
   - **Verification**: POST /api/favorites/:resourceId returns 201
   - Click again to unfavorite
   - **Verification**: Star unfilled
   - **Verification**: DELETE /api/favorites/:resourceId returns 204

2. **Test Favorites in Profile** (15 min):
   - Navigate to /profile
   - Click "Favorites" tab
   - **Verification**: Shows favorited resources
   - **Verification**: Count matches database
   - Remove favorite from profile page
   - **Verification**: Removed from list

3. **Test Favorite Limits** (10 min):
   - Add 100 favorites
   - Try to add 101st
   - **Expected**: Success or limit message (check if limit exists)

**Verification**:
- [ ] Favorite/unfavorite instant feedback
- [ ] API calls succeed
- [ ] Profile shows favorites
- [ ] RLS enforced (users can't modify others' favorites)

**Exit Criteria**: Favorites working end-to-end

---

### Task 4.4: Test Learning Journeys Complete Flow (90 min)

**Current State**: UI exists, database tables exist, flow untested

**Steps**:

1. **Test Journey Discovery** (15 min):
   - Navigate to /journeys
   - **Verification**: Shows list of available journeys
   - **Verification**: Each journey shows:
     - Title, description
     - Difficulty (beginner/intermediate/advanced)
     - Duration estimate
     - Step count
   - Click journey card
   - Navigate to /journey/:id

2. **Test Journey Enrollment** (20 min):
   - Click "Start Journey" button
   - **Verification**: Button changes to "Continue Journey"
   - **Verification**: Progress indicator appears (0% complete)
   - Query database:
     ```sql
     SELECT * FROM user_journey_progress
     WHERE user_id = '[user-id]' AND journey_id = '[journey-id]';
     ```
   - **Verification**: Row created with current_step_id = first step

3. **Test Step Completion** (30 min):
   - View journey steps list
   - Click "Mark Complete" on step 1
   - **Verification**: Checkbox checked
   - **Verification**: Progress updates (e.g., 10% → 20%)
   - **Verification**: Next step unlocked
   - Query database:
     ```sql
     SELECT completed_steps, current_step_id
     FROM user_journey_progress
     WHERE user_id = '[user-id]' AND journey_id = '[journey-id]';
     ```
   - **Verification**: completed_steps includes step 1 ID
   - Complete all steps
   - **Verification**: Journey shows "Completed" badge
   - **Verification**: completed_at timestamp set

4. **Test Journey Progress Tracking** (15 min):
   - Navigate to /profile
   - **Verification**: "My Journeys" section shows enrolled journeys
   - **Verification**: Progress percentages correct
   - **Verification**: "Continue" button goes to next incomplete step

5. **Test AI-Generated Journeys** (10 min):
   - Navigate to /journeys
   - Click "Generate Custom Journey"
   - Fill form:
     - Skill level: Intermediate
     - Topics: HLS streaming, video encoding
     - Duration: 20 hours
   - Submit
   - **Verification**: Journey generated (if AI configured) or fallback template used
   - **Verification**: Journey added to database
   - **Verification**: Can enroll in generated journey

**Verification**:
- [ ] Journey list loads from database
- [ ] Enrollment creates user_journey_progress row
- [ ] Step completion updates progress
- [ ] Progress percentage calculated correctly
- [ ] Journey completion recorded with timestamp
- [ ] Multiple users can enroll in same journey (separate progress)
- [ ] AI generation works OR fallback to templates

**Exit Criteria**: Learning journeys fully functional from discovery to completion

---

### Task 4.5: Test GitHub Sync (Import/Export) (120 min)
**Skill**: `systematic-debugging`

**Current State**: UI exists, syncService.ts exists, untested

**Steps**:

1. **Test GitHub Import (Dry Run)** (30 min):
   - Navigate to /admin/github
   - Fill form:
     - Repository: krzemienski/awesome-video
     - Action: Import
     - Options: Dry run (preview only)
   - Click "Start Sync"
   - **Verification**: Shows preview:
       - "Will add: 50 new resources"
       - "Will update: 12 existing resources"
       - "Will skip: 2,584 unchanged resources"
   - Query database to confirm no changes yet

2. **Test GitHub Import (Live)** (40 min):
   - Uncheck "Dry run"
   - Click "Start Import"
   - **Verification**: Progress indicator appears
   - **Verification**: Status updates (Processing → Completed)
   - Query github_sync_history:
     ```sql
     SELECT * FROM github_sync_history
     ORDER BY created_at DESC
     LIMIT 1;
     ```
   - **Verification**:
     - resources_added count matches preview
     - resources_updated count matches preview
     - commit_sha populated
   - Check resources table:
     ```sql
     SELECT COUNT(*) FROM resources
     WHERE last_synced_at > NOW() - INTERVAL '5 minutes';
     ```
   - **Verification**: Count matches imported resources

3. **Test GitHub Export** (40 min):
   - Navigate to /admin/github
   - Select action: Export
   - Options:
     - Include CONTRIBUTING.md
     - Commit message: "Update resources from admin panel"
   - Click "Start Export"
   - **Verification**: Shows diff preview
   - Confirm export
   - **Verification**: GitHub API called (check server logs)
   - **Verification**: Commit created on GitHub
   - Visit https://github.com/krzemienski/awesome-video
   - **Verification**: README.md updated
   - Check commit:
     - **Verification**: Authored by your GitHub token
     - **Verification**: Commit message correct

4. **Test Sync Conflict Handling** (10 min):
   - Manually edit resource in database
   - Manually edit same resource on GitHub
   - Run import
   - **Verification**: Conflict detected and logged
   - **Verification**: Resolution strategy applied (GitHub wins vs DB wins vs merge)

**Verification**:
- [ ] Import preview accurate
- [ ] Import creates/updates resources correctly
- [ ] Export generates valid awesome-list markdown
- [ ] Export commits to GitHub successfully
- [ ] Sync history recorded
- [ ] Conflicts detected and handled
- [ ] github_synced flag updated
- [ ] No duplicate resources created

**Exit Criteria**: GitHub bidirectional sync fully functional

---

### Task 4.6: Test AI Enrichment Batch Processing (90 min)
**Skill**: `systematic-debugging`

**Current State**: BatchEnrichmentPanel exists, enrichmentService exists, untested

**Steps**:

1. **Verify AI Configuration** (10 min):
   - Check environment:
     ```bash
     echo $ANTHROPIC_API_KEY | head -c 20
     # Should show: sk-ant-api03-...
     ```
   - Test Claude API connectivity:
     ```bash
     curl https://api.anthropic.com/v1/messages \
       -H "x-api-key: $ANTHROPIC_API_KEY" \
       -H "anthropic-version: 2023-06-01" \
       -H "content-type: application/json" \
       -d '{"model":"claude-haiku-4-5","max_tokens":50,"messages":[{"role":"user","content":"Test"}]}'
     ```
   - Expected: 200 response with completion

2. **Test Enrichment Job Creation** (20 min):
   - Navigate to /admin/enrichment
   - Configure job:
     - Filter: "Unenriched only"
     - Batch size: 5
   - Click "Start Enrichment"
   - **Verification**: Job created in enrichment_jobs table
   - **Verification**: Queue items created in enrichment_queue
   - Query:
     ```sql
     SELECT id, status, total_resources, processed_resources
     FROM enrichment_jobs
     ORDER BY created_at DESC
     LIMIT 1;
     ```

3. **Monitor Job Progress** (40 min):
   - Watch progress bar update in real-time
   - **Verification**: Processed count increments
   - **Verification**: Success/failed counts update
   - Check server logs for Claude API calls:
     ```bash
     docker-compose logs web -f | grep "Claude"
     ```
   - **Verification**: Requests to Claude API (one per resource)
   - **Verification**: Responses cached (subsequent identical URLs hit cache)

4. **Verify Enrichment Results** (20 min):
   - Wait for job completion (status: completed)
   - Query enrichment_queue:
     ```sql
     SELECT resource_id, status, ai_metadata
     FROM enrichment_queue
     WHERE job_id = '[job-id]'
     LIMIT 5;
     ```
   - **Verification**: ai_metadata populated with:
     - Suggested tags
     - Improved description
     - Category/subcategory suggestions
     - Confidence scores
   - Check resources table:
     ```sql
     SELECT id, title, metadata
     FROM resources
     WHERE id IN (SELECT resource_id FROM enrichment_queue WHERE job_id = '[job-id]')
     LIMIT 5;
     ```
   - **Verification**: metadata field updated with AI analysis

**Verification**:
- [ ] Enrichment job processes all resources in batch
- [ ] Claude API rate limiting respected (1 req/second)
- [ ] Successful enrichments update resource metadata
- [ ] Failed enrichments logged with error messages
- [ ] Retry logic works (test by causing API error)
- [ ] Job can be cancelled mid-process
- [ ] Progress persists across page refreshes

**Exit Criteria**: AI enrichment working end-to-end with error handling

---

### Task 4.7: Test Recommendations Engine (45 min)

**Current State**: Code exists, untested

**Steps**:

1. **Test Personalized Recommendations** (25 min):
   - Login as user with profile data
   - Navigate to /recommendations (or component on homepage)
   - **Verification**: Shows 10 recommended resources
   - **Verification**: Recommendations based on:
     - User's favorite categories
     - Bookmarked resources (similar tags)
     - Skill level (from user_preferences)
   - Check that recommendations differ for different users
   - Test fallback when AI unavailable:
     - Temporarily set invalid ANTHROPIC_API_KEY
     - Reload recommendations
     - **Verification**: Rule-based recommendations shown

2. **Test Recommendation Feedback** (20 min):
   - Click "👍" or "👎" on recommendation
   - **Verification**: Feedback recorded
   - Query:
     ```sql
     SELECT * FROM user_interactions
     WHERE user_id = '[user-id]' AND interaction_type = 'recommendation_feedback'
     ORDER BY timestamp DESC
     LIMIT 5;
     ```
   - Reload recommendations
   - **Verification**: Feedback influences future recommendations

**Verification**:
- [ ] Recommendations personalized per user
- [ ] AI-powered recommendations work (when API key valid)
- [ ] Fallback to rule-based works
- [ ] Feedback system functional
- [ ] Cache works (same request within 5min returns cached)

**Exit Criteria**: Recommendations working with AI and fallback

---

### Task 4.8: Test Resource Edit Suggestions (60 min)

**Current State**: UI exists (PendingEdits component), workflow untested

**Steps**:

1. **Test Submit Edit Suggestion** (25 min):
   - Login as regular user
   - Navigate to resource detail page
   - Click "Suggest Edit"
   - Modify fields:
     - Description: "Improved description with more details..."
     - Tags: Add "webrtc", "live-streaming"
   - Submit suggestion
   - **Verification**: Success message
   - **Verification**: Edit suggestion created:
     ```sql
     SELECT * FROM resource_edits
     WHERE submitted_by = '[user-id]' AND status = 'pending'
     ORDER BY created_at DESC
     LIMIT 1;
     ```
   - **Verification**: proposed_changes shows field diff
   - **Verification**: Claude analysis populated (if AI configured)

2. **Test Admin Review Edit** (25 min):
   - Login as admin
   - Navigate to /admin/edits
   - **Verification**: Pending edit appears
   - Click "Review"
   - **Verification**: Shows diff:
     - Original value highlighted in red
     - Proposed value highlighted in green
   - Click "Approve"
   - **Verification**: Resource updated with proposed changes
   - **Verification**: Edit status → approved
   - **Verification**: Original submitter notified (if notifications implemented)

3. **Test Conflict Detection** (10 min):
   - Submit edit suggestion
   - Admin modifies same resource before reviewing
   - Admin tries to approve edit
   - **Verification**: Conflict warning shown
   - **Verification**: Edit marked as outdated

**Verification**:
- [ ] Edit suggestions submitted successfully
- [ ] Diff calculation correct (field-level)
- [ ] AI analysis provides helpful context
- [ ] Admin can approve/reject edits
- [ ] Conflicts detected via original_resource_updated_at
- [ ] Rejection reason recorded
- [ ] Audit trail complete

**Exit Criteria**: Edit suggestion workflow complete

---

### Task 4.9: Test Link Validation (45 min)

**Current State**: Endpoint exists (/api/admin/check-links), untested

**Steps**:

1. **Trigger Link Check** (10 min):
   - Navigate to /admin/validation
   - Click "Check All Links"
   - **Verification**: Shows warning "This will take 15-20 minutes for 2,646 resources"
   - Confirm
   - **Verification**: Progress indicator appears
   - **Verification**: Status updates (Checking 245/2646...)

2. **Monitor Link Checking** (20 min):
   - Watch progress in UI
   - Check server logs:
     ```bash
     docker-compose logs web -f | grep "link check"
     ```
   - **Verification**: HTTP requests to resource URLs
   - **Verification**: Timeouts handled (max 10s per URL)
   - **Verification**: Rate limiting respected (not hammering servers)

3. **Review Results** (15 min):
   - Wait for completion
   - **Verification**: Results shown:
     - Total checked: 2,646
     - Valid: 2,500
     - Broken: 120 (404/500/timeout)
     - Redirects: 26 (301/302)
   - **Verification**: Broken links listed with details
   - **Verification**: Can filter resources by link status
   - Export broken links as CSV

**Verification**:
- [ ] Link checking completes for all resources
- [ ] HTTP status codes recorded correctly
- [ ] Timeouts don't crash process
- [ ] Results saved to database (or file)
- [ ] Broken links exportable for fixing
- [ ] Can re-run check without duplicating data

**Exit Criteria**: Link validation functional and useful

---

**Phase 4 Duration**: 8-10 hours
**Phase 4 Deliverables**:
- Search validated and working
- Bookmarks fully tested
- Favorites fully tested
- Learning journeys complete flow validated
- GitHub sync import/export tested
- AI enrichment batch processing tested
- Edit suggestions workflow tested
- Link validation working

---

## Phase 5: E2E Test Suite with Playwright

**Type**: Testing
**Estimated**: 6-8 hours
**Files**:
- `tests/e2e/anonymous-flows.spec.ts` (new)
- `tests/e2e/auth-flows.spec.ts` (new)
- `tests/e2e/user-flows.spec.ts` (new)
- `tests/e2e/admin-flows.spec.ts` (new)
- `tests/e2e/performance.spec.ts` (new)
- `tests/helpers/test-utils.ts` (new)
- `playwright.config.ts` (update)
**MCP Tools**: Playwright MCP
**Skills**: `playwright-skill`, `testing-anti-patterns`

---

### Task 5.1: Set Up Playwright Test Infrastructure (45 min)
**Skill**: `playwright-expert` agent

**Steps**:

1. **Install Dependencies**:
   ```bash
   npm install --save-dev @playwright/test
   npx playwright install chromium firefox webkit
   ```

2. **Configure Playwright**:
   ```typescript
   // File: playwright.config.ts

   import { defineConfig, devices } from '@playwright/test';

   export default defineConfig({
     testDir: './tests/e2e',
     fullyParallel: false, // Sequential for database state management
     forbidOnly: !!process.env.CI,
     retries: process.env.CI ? 2 : 0,
     workers: 1, // Single worker to avoid database conflicts
     reporter: [
       ['html'],
       ['json', { outputFile: 'test-results/results.json' }],
       ['list'],
     ],
     use: {
       baseURL: 'http://localhost:3000',
       trace: 'on-first-retry',
       screenshot: 'only-on-failure',
       video: 'retain-on-failure',
     },
     projects: [
       {
         name: 'chromium',
         use: { ...devices['Desktop Chrome'] },
       },
       {
         name: 'firefox',
         use: { ...devices['Desktop Firefox'] },
       },
       {
         name: 'mobile',
         use: { ...devices['iPhone 13'] },
       },
     ],
     webServer: {
       command: 'docker-compose up',
       url: 'http://localhost:3000',
       reuseExistingServer: true,
       timeout: 120000,
     },
   });
   ```

3. **Create Test Utilities**:
   ```typescript
   // File: tests/helpers/test-utils.ts

   import { Page } from '@playwright/test';
   import { createClient } from '@supabase/supabase-js';

   const supabaseUrl = process.env.SUPABASE_URL!;
   const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

   export const testSupabase = createClient(supabaseUrl, supabaseKey);

   export async function loginAsAdmin(page: Page) {
     await page.goto('/login');
     await page.fill('input[type="email"]', 'admin@test.com');
     await page.fill('input[type="password"]', 'Admin123!');
     await page.click('button:has-text("Sign In")');
     await page.waitForURL('/');
   }

   export async function loginAsUser(page: Page, email: string, password: string) {
     await page.goto('/login');
     await page.fill('input[type="email"]', email);
     await page.fill('input[type="password"]', password);
     await page.click('button:has-text("Sign In")');
     await page.waitForURL('/');
   }

   export async function createTestUser(email: string, password: string, role: string = 'user') {
     const { data, error } = await testSupabase.auth.admin.createUser({
       email,
       password,
       email_confirm: true,
       user_metadata: { role },
     });

     return data.user;
   }

   export async function cleanupTestUsers() {
     // Delete test users created during tests
     const { data: users } = await testSupabase.auth.admin.listUsers();
     const testUsers = users.users.filter(u => u.email?.includes('test-e2e'));

     for (const user of testUsers) {
       await testSupabase.auth.admin.deleteUser(user.id);
     }
   }

   export async function cleanupTestResources() {
     await testSupabase
       .from('resources')
       .delete()
       .like('title', '%E2E Test%');
   }
   ```

**Verification**:
- [ ] Playwright installed
- [ ] Config loads without errors
- [ ] Test utils compile
- [ ] Can create test users programmatically
- [ ] Can cleanup test data

**Exit Criteria**: Test infrastructure ready

---

### Task 5.2: Write Anonymous User Flow Tests (90 min)
**Skill**: `playwright-skill`

**Steps**:

```typescript
// File: tests/e2e/anonymous-flows.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Anonymous User Flows', () => {

  test('homepage loads and displays resources', async ({ page }) => {
    await page.goto('/');

    // Wait for resources to load
    await page.waitForSelector('text=Awesome Video Resources');

    // Verify category cards
    const categories = await page.locator('[data-testid="category-card"]').count();
    expect(categories).toBe(9);

    // Verify resource count
    const heading = await page.locator('h1').textContent();
    expect(heading).toContain('2,647'); // or current count

    // Take screenshot
    await page.screenshot({ path: 'test-results/homepage.png' });
  });

  test('category navigation works', async ({ page }) => {
    await page.goto('/');

    // Click first category
    await page.click('a:has-text("Intro & Learning")');

    // Verify navigation
    await expect(page).toHaveURL(/\/category\/intro-learning/);

    // Verify filtered resources
    await expect(page.locator('h1')).toContainText('Intro & Learning');
    await expect(page.locator('text=229 resources')).toBeVisible();

    // Verify resource cards
    const resources = await page.locator('[data-testid="resource-card"]').count();
    expect(resources).toBeGreaterThan(0);
    expect(resources).toBeLessThanOrEqual(20); // First page
  });

  test('search dialog opens and searches', async ({ page }) => {
    await page.goto('/');

    // Open search with keyboard shortcut
    await page.keyboard.press('/');

    // Verify dialog opened
    await expect(page.locator('role=dialog[name="Search Resources"]')).toBeVisible();

    // Type search query
    await page.fill('input[placeholder*="Search"]', 'ffmpeg');

    // Wait for results
    await page.waitForTimeout(500); // Debounce

    // Verify results shown
    const results = await page.locator('[data-testid="search-result"]').count();
    expect(results).toBeGreaterThan(0);

    // Click first result
    await page.click('[data-testid="search-result"]:first-child');

    // Verify navigation to resource
    // (depends on resource detail page implementation)
  });

  test('theme switching works', async ({ page }) => {
    await page.goto('/');

    // Check initial theme (dark by default)
    const html = await page.locator('html').getAttribute('class');
    expect(html).toContain('dark');

    // No light theme (forced dark in current implementation)
    // Test theme persistence across pages
    await page.goto('/about');
    await page.goto('/');

    const stillDark = await page.locator('html').getAttribute('class');
    expect(stillDark).toContain('dark');
  });

  test('mobile navigation works', async ({ page, isMobile }) => {
    if (!isMobile) test.skip();

    await page.goto('/');

    // Verify mobile menu button exists
    await expect(page.locator('button[aria-label="Toggle menu"]')).toBeVisible();

    // Open mobile menu
    await page.click('button[aria-label="Toggle menu"]');

    // Verify sidebar visible
    await expect(page.locator('nav')).toBeVisible();

    // Navigate via mobile menu
    await page.click('text=Encoding & Codecs');

    // Verify navigation
    await expect(page).toHaveURL(/\/category\/encoding-codecs/);
  });

  test('pagination works', async ({ page }) => {
    await page.goto('/category/intro-learning');

    // Wait for resources
    await page.waitForSelector('[data-testid="resource-card"]');

    // Check pagination controls
    if (await page.locator('text=Next').isVisible()) {
      const firstPageUrl = page.url();

      // Go to page 2
      await page.click('text=Next');
      await page.waitForURL(/page=2/);

      // Verify different resources loaded
      const page2Url = page.url();
      expect(page2Url).not.toBe(firstPageUrl);

      // Go back
      await page.click('text=Previous');
      await page.waitForURL(/page=1|\/category\//);
    }
  });

  test('external links open in new tab', async ({ page }) => {
    await page.goto('/category/intro-learning');

    // Find resource with GitHub link
    const githubLink = page.locator('a[href*="github.com"]:first-child');

    // Verify target="_blank"
    const target = await githubLink.getAttribute('target');
    expect(target).toBe('_blank');

    // Verify rel attribute for security
    const rel = await githubLink.getAttribute('rel');
    expect(rel).toContain('noopener');
  });

  test('404 page shows for invalid routes', async ({ page }) => {
    await page.goto('/this-page-does-not-exist');

    await expect(page.locator('h1')).toContainText('404');
    await expect(page.locator('text=Page Not Found')).toBeVisible();
  });

  test('about page loads', async ({ page }) => {
    await page.goto('/about');

    await expect(page.locator('h1')).toBeVisible();
    // Verify content specific to About page
  });

  test('performance: homepage loads under 2 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('/');
    await page.waitForSelector('text=Awesome Video Resources');
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
  });
});
```

**Verification**:
- [ ] All 10 tests pass
- [ ] Tests run in < 5 minutes total
- [ ] Screenshots captured on failures
- [ ] HTML report generated

**Exit Criteria**: Anonymous flow tests passing

---

### Task 5.3: Write Authentication Flow Tests (90 min)

```typescript
// File: tests/e2e/auth-flows.spec.ts

import { test, expect } from '@playwright/test';
import { createTestUser, cleanupTestUsers, loginAsUser } from '../helpers/test-utils';

test.describe('Authentication Flows', () => {

  test.afterAll(async () => {
    await cleanupTestUsers();
  });

  test('email/password signup works', async ({ page }) => {
    const email = `test-e2e-${Date.now()}@example.com`;
    const password = 'SecureTest123!';

    await page.goto('/login');

    // Click signup
    await page.click('text=Sign up');

    // Fill signup form
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);

    // Submit
    await page.click('button:has-text("Sign Up")');

    // Verify redirect or success message
    await page.waitForURL('/', { timeout: 5000 });

    // Verify logged in
    await expect(page.locator('button[aria-haspopup="menu"]')).toBeVisible();
  });

  test('email/password login works', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[type="email"]', 'admin@test.com');
    await page.fill('input[type="password"]', 'Admin123!');
    await page.click('button:has-text("Sign In")');

    await page.waitForURL('/');

    // Verify user menu
    const userMenu = page.locator('button[aria-haspopup="menu"]');
    await expect(userMenu).toBeVisible();
  });

  test('GitHub OAuth redirects correctly', async ({ page }) => {
    await page.goto('/login');

    // Click GitHub button
    const githubButton = page.locator('button:has-text("Continue with GitHub")');
    await githubButton.click();

    // Verify redirect to GitHub
    await page.waitForURL(/github\.com\/login\/oauth/, { timeout: 5000 });

    // Note: Can't complete OAuth flow in automated test without real credentials
    // This validates the redirect works
  });

  test('invalid credentials show error', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[type="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button:has-text("Sign In")');

    // Verify error message
    await expect(page.locator('text=/Invalid.*credentials|Email.*password.*incorrect/i')).toBeVisible({ timeout: 3000 });

    // Verify still on login page
    await expect(page).toHaveURL('/login');
  });

  test('session persists across page reloads', async ({ page }) => {
    // Login
    await loginAsUser(page, 'admin@test.com', 'Admin123!');

    // Reload page
    await page.reload();

    // Verify still logged in
    await expect(page.locator('button[aria-haspopup="menu"]')).toBeVisible();
  });

  test('logout works', async ({ page }) => {
    await loginAsUser(page, 'admin@test.com', 'Admin123!');

    // Open user menu
    await page.click('button[aria-haspopup="menu"]');

    // Click logout
    await page.click('text=Sign Out');

    // Verify redirected and logged out
    await page.waitForURL('/', { timeout: 3000 });
    await expect(page.locator('button:has-text("Login")')).toBeVisible();
  });

  test('protected routes redirect when not logged in', async ({ page }) => {
    // Clear any existing session
    await page.context().clearCookies();
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());

    // Try to access protected route
    await page.goto('/profile');

    // Should redirect to login
    await page.waitForURL('/login', { timeout: 3000 });
  });

  test('admin routes return 403 for non-admin users', async ({ page }) => {
    // Create regular user
    const testUser = await createTestUser(
      `test-user-${Date.now()}@example.com`,
      'UserTest123!',
      'user'
    );

    await loginAsUser(page, testUser.email!, 'UserTest123!');

    // Try to access admin
    await page.goto('/admin');

    // Should show 404 or access denied
    await expect(page.locator('text=/404|Access.*denied|Not.*found/i')).toBeVisible();
  });
});
```

**Verification**:
- [ ] All 8 auth tests pass
- [ ] Signup creates users in database
- [ ] Login validates credentials
- [ ] Session persistence works
- [ ] Logout clears session
- [ ] Protected routes guarded
- [ ] Admin routes restricted

**Exit Criteria**: Auth flow tests comprehensive and passing

---

### Task 5.4: Write User Feature Tests (120 min)

```typescript
// File: tests/e2e/user-flows.spec.ts

import { test, expect } from '@playwright/test';
import { loginAsUser, createTestUser, cleanupTestResources } from '../helpers/test-utils';

test.describe('User Feature Flows', () => {
  let testUser: any;

  test.beforeAll(async () => {
    testUser = await createTestUser(
      `test-user-features-${Date.now()}@example.com`,
      'TestUser123!',
      'user'
    );
  });

  test.afterAll(async () => {
    await cleanupTestResources();
  });

  test('user can bookmark resources', async ({ page }) => {
    await loginAsUser(page, testUser.email, 'TestUser123!');

    await page.goto('/category/intro-learning');

    // Find first resource
    const bookmarkButton = page.locator('[data-testid="bookmark-button"]').first();

    // Verify initial state (not bookmarked)
    await expect(bookmarkButton).toHaveAttribute('aria-label', /Add.*bookmark/i);

    // Click to bookmark
    await bookmarkButton.click();

    // Verify state changed
    await expect(bookmarkButton).toHaveAttribute('aria-label', /Remove.*bookmark/i);

    // Verify toast notification
    await expect(page.locator('text=/Added.*bookmarks/i')).toBeVisible();

    // Navigate to bookmarks page
    await page.click('button[aria-haspopup="menu"]');
    await page.click('text=My Bookmarks');

    // Verify bookmark appears
    await expect(page.locator('[data-testid="resource-card"]')).toHaveCount(1);
  });

  test('user can add notes to bookmarks', async ({ page }) => {
    await loginAsUser(page, testUser.email, 'TestUser123!');

    await page.goto('/bookmarks');

    // Click "Add note" on first bookmark
    await page.click('[data-testid="add-note-button"]');

    // Type note
    await page.fill('textarea[placeholder*="note"]', 'Important resource for learning FFmpeg');

    // Save
    await page.click('button:has-text("Save")');

    // Verify note displayed
    await expect(page.locator('text=Important resource for learning FFmpeg')).toBeVisible();
  });

  test('user can favorite resources', async ({ page }) => {
    await loginAsUser(page, testUser.email, 'TestUser123!');

    await page.goto('/category/encoding-codecs');

    // Click star icon
    const starButton = page.locator('[data-testid="favorite-button"]').first();
    await starButton.click();

    // Verify state changed (star filled)
    await expect(starButton).toHaveClass(/fill-yellow/); // or whatever class indicates favorited

    // Navigate to profile
    await page.goto('/profile');

    // Click Favorites tab
    await page.click('button[role="tab"]:has-text("Favorites")');

    // Verify favorite listed
    await expect(page.locator('[data-testid="resource-card"]')).toHaveCount(1);
  });

  test('user can submit new resource', async ({ page }) => {
    await loginAsUser(page, testUser.email, 'TestUser123!');

    await page.goto('/submit');

    // Fill submission form
    await page.fill('input[name="title"]', 'E2E Test Resource - Delete Me');
    await page.fill('input[name="url"]', 'https://github.com/test/e2e-resource');
    await page.fill('textarea[name="description"]', 'This is an automated test resource, please delete.');
    await page.selectOption('select[name="category"]', 'General Tools');

    // Submit
    await page.click('button:has-text("Submit Resource")');

    // Verify success message
    await expect(page.locator('text=/submitted.*review|success/i')).toBeVisible();

    // Verify resource created in database (via API)
    const response = await page.request.get('/api/admin/resources?search=E2E%20Test%20Resource&status=pending', {
      headers: {
        'Authorization': `Bearer ${await getAuthToken(page)}`
      }
    });
    const data = await response.json();
    expect(data.total).toBeGreaterThan(0);
  });

  test('user can enroll in learning journey', async ({ page }) => {
    await loginAsUser(page, testUser.email, 'TestUser123!');

    await page.goto('/journeys');

    // Click on first journey
    await page.click('[data-testid="journey-card"]');

    // Start journey
    await page.click('button:has-text("Start Journey")');

    // Verify enrolled
    await expect(page.locator('button:has-text("Continue Journey")')).toBeVisible();
    await expect(page.locator('text=/Progress.*0%/i')).toBeVisible();
  });

  test('user can mark journey step complete', async ({ page }) => {
    await loginAsUser(page, testUser.email, 'TestUser123!');

    await page.goto('/journeys');
    await page.click('[data-testid="journey-card"]');

    // If not enrolled, enroll first
    if (await page.locator('button:has-text("Start Journey")').isVisible()) {
      await page.click('button:has-text("Start Journey")');
    }

    // Mark first step complete
    await page.click('[data-testid="complete-step-button"]');

    // Verify checkbox checked
    await expect(page.locator('[data-testid="step-1-checkbox"]')).toBeChecked();

    // Verify progress updated
    await expect(page.locator('text=/Progress.*[1-9][0-9]%/i')).toBeVisible();
  });

  test('user profile displays correct stats', async ({ page }) => {
    await loginAsUser(page, testUser.email, 'TestUser123!');

    await page.goto('/profile');

    // Verify profile sections
    await expect(page.locator('text=Favorites')).toBeVisible();
    await expect(page.locator('text=Bookmarks')).toBeVisible();
    await expect(page.locator('text=Learning Streak')).toBeVisible();

    // Verify counts (should match actions from previous tests)
    await expect(page.locator('[data-testid="favorites-count"]')).toContainText('1');
    await expect(page.locator('[data-testid="bookmarks-count"]')).toContainText('1');
  });

  test('user can view submission history', async ({ page }) => {
    await loginAsUser(page, testUser.email, 'TestUser123!');

    await page.goto('/profile');
    await page.click('button[role="tab"]:has-text("Submissions")');

    // Verify submitted resource appears
    await expect(page.locator('text=E2E Test Resource')).toBeVisible();
    await expect(page.locator('text=pending')).toBeVisible();
  });
});

// Helper function
async function getAuthToken(page: Page): Promise<string> {
  return await page.evaluate(() => {
    const authData = JSON.parse(
      localStorage.getItem('sb-jeyldoypdkgsrfdhdcmm-auth-token') || '{}'
    );
    return authData.access_token;
  });
}
```

**Verification**:
- [ ] All 8 user feature tests pass
- [ ] Bookmarks CRUD works
- [ ] Favorites CRUD works
- [ ] Resource submission works
- [ ] Learning journeys work
- [ ] Profile stats accurate
- [ ] Test cleanup successful

**Exit Criteria**: User feature tests passing

---

### Task 5.5: Write Admin Flow Tests (120 min)

```typescript
// File: tests/e2e/admin-flows.spec.ts

import { test, expect } from '@playwright/test';
import { loginAsAdmin, cleanupTestResources } from '../helpers/test-utils';

test.describe('Admin Flows', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.afterAll(async () => {
    await cleanupTestResources();
  });

  test('admin dashboard loads with correct stats', async ({ page }) => {
    await page.goto('/admin');

    // Verify stat widgets
    await expect(page.locator('text=Total Resources')).toBeVisible();
    await expect(page.locator('text=Pending Approvals')).toBeVisible();

    // Verify counts are numbers
    const resourceCount = await page.locator('[data-testid="total-resources"]').textContent();
    expect(parseInt(resourceCount!)).toBeGreaterThan(0);
  });

  test('admin can approve pending resource', async ({ page }) => {
    // First create a pending resource (via API)
    const token = await page.evaluate(() => {
      const authData = JSON.parse(localStorage.getItem('sb-jeyldoypdkgsrfdhdcmm-auth-token') || '{}');
      return authData.access_token;
    });

    const createResponse = await page.request.post('/api/resources', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: {
        title: 'E2E Test - Approve Flow',
        url: 'https://github.com/test/approve-test',
        description: 'Testing approval workflow',
        category: 'General Tools'
      }
    });

    const resource = await createResponse.json();

    // Navigate to pending approvals
    await page.goto('/admin/pending');

    // Find the test resource
    await expect(page.locator('text=E2E Test - Approve Flow')).toBeVisible();

    // Click approve
    await page.click(`[data-resource-id="${resource.id}"] button:has-text("Approve")`);

    // Confirm in dialog
    await page.click('button:has-text("Approve")');

    // Verify removed from pending list
    await expect(page.locator('text=E2E Test - Approve Flow')).not.toBeVisible({ timeout: 3000 });

    // Verify in approved resources
    await page.goto('/admin/resources?status=approved');
    await expect(page.locator('text=E2E Test - Approve Flow')).toBeVisible();
  });

  test('admin can bulk approve resources', async ({ page }) => {
    await page.goto('/admin/resources?status=pending');

    // Select multiple checkboxes
    await page.click('[data-testid="select-all-checkbox"]');

    // Verify bulk toolbar appears
    await expect(page.locator('text=/[0-9]+ resource.*selected/i')).toBeVisible();

    // Click bulk approve
    await page.click('button:has-text("Approve")');

    // Confirm
    await page.click('button:has-text("Approve") >> nth=1'); // Confirmation dialog

    // Verify success message
    await expect(page.locator('text=/successfully approved/i')).toBeVisible();
  });

  test('admin can edit resource details', async ({ page }) => {
    await page.goto('/admin/resources');

    // Click edit on first resource
    await page.click('[data-testid="resource-actions-menu"]');
    await page.click('text=Edit');

    // Modify fields
    await page.fill('input[name="title"]', 'Updated Title - E2E Test');
    await page.fill('textarea[name="description"]', 'Updated description via admin panel');

    // Save
    await page.click('button:has-text("Save Changes")');

    // Verify update
    await expect(page.locator('text=Updated Title - E2E Test')).toBeVisible();
  });

  test('admin can export resources as CSV', async ({ page }) => {
    await page.goto('/admin/resources?category=Encoding+%26+Codecs&limit=10');

    // Select some resources
    await page.click('[data-row-index="0"] input[type="checkbox"]');
    await page.click('[data-row-index="1"] input[type="checkbox"]');

    // Export
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Export")');
    const download = await downloadPromise;

    // Verify file downloaded
    expect(download.suggestedFilename()).toMatch(/\.csv$/);

    // Verify CSV content
    const path = await download.path();
    const fs = require('fs');
    const content = fs.readFileSync(path, 'utf-8');

    expect(content).toContain('ID,Title,URL');
    expect(content.split('\n').length).toBeGreaterThan(2); // Header + 2 rows
  });

  test('admin can start AI enrichment job', async ({ page }) => {
    await page.goto('/admin/enrichment');

    // Configure job
    await page.selectOption('select[name="filter"]', 'unenriched');
    await page.fill('input[name="batchSize"]', '3');

    // Start
    await page.click('button:has-text("Start Enrichment")');

    // Verify job created
    await expect(page.locator('text=/Job.*created|processing/i')).toBeVisible();

    // Verify progress indicator
    await expect(page.locator('[role="progressbar"]')).toBeVisible();

    // Wait for completion (or cancel for speed)
    await page.waitForTimeout(5000);

    // Check job status
    const status = await page.locator('[data-testid="job-status"]').textContent();
    expect(status).toMatch(/processing|completed/i);
  });

  test('admin can view and approve edit suggestions', async ({ page }) => {
    await page.goto('/admin/edits');

    // If there are pending edits
    if (await page.locator('[data-testid="edit-suggestion"]').count() > 0) {
      // Click review on first
      await page.click('[data-testid="review-edit-button"]');

      // Verify diff shown
      await expect(page.locator('.diff-old')).toBeVisible();
      await expect(page.locator('.diff-new')).toBeVisible();

      // Approve edit
      await page.click('button:has-text("Approve")');

      // Verify removed from pending list
      await expect(page.locator('text=/no.*pending.*edits/i')).toBeVisible();
    }
  });
});
```

**Verification**:
- [ ] All user feature tests pass
- [ ] Bookmarks tested end-to-end
- [ ] Favorites tested end-to-end
- [ ] Resource submission tested
- [ ] AI enrichment job tested
- [ ] Edit suggestions tested
- [ ] CSV export tested

**Exit Criteria**: User feature test suite passing

---

### Task 5.6: Write Performance Tests (60 min)

```typescript
// File: tests/e2e/performance.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {

  test('homepage loads under 2 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('/');
    await page.waitForSelector('h1:has-text("Awesome Video Resources")');
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    console.log(`Homepage loaded in ${duration}ms`);
  });

  test('API endpoints respond under 200ms', async ({ page }) => {
    const endpoints = [
      '/api/health',
      '/api/categories',
      '/api/resources?limit=10',
    ];

    for (const endpoint of endpoints) {
      const start = Date.now();
      const response = await page.request.get(endpoint);
      const duration = Date.now() - start;

      expect(response.status()).toBe(200);
      expect(duration).toBeLessThan(200);
      console.log(`${endpoint}: ${duration}ms`);
    }
  });

  test('search returns results under 500ms', async ({ page }) => {
    await page.goto('/');

    const start = Date.now();
    await page.keyboard.press('/');
    await page.fill('input[placeholder*="Search"]', 'ffmpeg');
    await page.waitForSelector('[data-testid="search-result"]');
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(500);
  });

  test('large category page loads efficiently', async ({ page }) => {
    // Encoding & Codecs has 392 resources (largest category)
    const start = Date.now();
    await page.goto('/category/encoding-codecs');
    await page.waitForSelector('[data-testid="resource-card"]');
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(3000);

    // Verify pagination (not loading all 392 at once)
    const resourcesOnPage = await page.locator('[data-testid="resource-card"]').count();
    expect(resourcesOnPage).toBeLessThanOrEqual(20);
  });

  test('concurrent user simulation', async ({ browser }) => {
    // Simulate 10 concurrent users browsing
    const contexts = await Promise.all(
      Array.from({ length: 10 }, () => browser.newContext())
    );

    const pages = await Promise.all(
      contexts.map(ctx => ctx.newPage())
    );

    // All navigate to homepage simultaneously
    const start = Date.now();
    await Promise.all(
      pages.map(page => page.goto('/'))
    );
    const duration = Date.now() - start;

    // All should load within 5 seconds
    expect(duration).toBeLessThan(5000);

    // Cleanup
    await Promise.all(contexts.map(ctx => ctx.close()));
  });

  test('memory leak detection', async ({ page }) => {
    await page.goto('/');

    // Navigate through multiple pages
    for (let i = 0; i < 20; i++) {
      await page.goto('/category/intro-learning');
      await page.goto('/category/encoding-codecs');
      await page.goto('/');
    }

    // Measure memory (if available)
    const metrics = await page.metrics();
    console.log('Memory metrics:', metrics);

    // Basic check: page still responsive
    await expect(page.locator('h1')).toBeVisible({ timeout: 1000 });
  });
});
```

**Verification**:
- [ ] All performance targets met
- [ ] No memory leaks detected
- [ ] Concurrent users handled gracefully
- [ ] Large datasets paginated efficiently

**Exit Criteria**: Performance benchmarks passing

---

**Phase 5 Duration**: 6-8 hours
**Phase 5 Deliverables**:
- Complete Playwright test suite (5 test files)
- Test utilities and helpers
- Performance benchmarks
- Test documentation
- CI/CD integration ready

---

## Phase 6: Bug Fixes & Polish

**Type**: Refactoring + Bug Fixes
**Estimated**: 3-4 hours
**Files**: Various (as bugs discovered)
**Skills**: `systematic-debugging`, `refactoring-expert` agent

### Task 6.1: Fix All parseInt(UUID) Bugs Globally (60 min)

**Steps**:

1. **Find All Instances**:
   ```bash
   grep -rn "parseInt(req.params" server/ --include="*.ts" | tee parseInt-audit.txt
   grep -rn "Number(req.params" server/ --include="*.ts" | tee -a parseInt-audit.txt
   ```

2. **Audit Each Instance**:
   - For each match:
     - Determine parameter type from route definition
     - Check database schema for ID column type
     - If UUID: Remove parseInt, use string directly
     - If integer: Keep parseInt but add validation
   - Create fix checklist

3. **Apply Fixes Systematically**:
   - Start with most-used endpoints (resources, admin)
   - Add type guards:
     ```typescript
     const id = req.params.id;
     if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
       return res.status(400).json({ message: 'Invalid resource ID format' });
     }
     ```

4. **Test Each Fix**:
   - Valid UUID: Should work
   - Invalid UUID: Should return 400
   - Integer on UUID route: Should return 400
   - Missing ID: Should return 400

**Verification**:
- [ ] Zero parseInt() calls on UUID parameters remain
- [ ] All UUID routes validated with regex
- [ ] Invalid IDs return 400 (not 500)
- [ ] Error messages helpful ("Invalid resource ID format")

**Exit Criteria**: UUID handling robust across all endpoints

---

### Task 6.2: Fix React Hydration Warnings (60 min)

**Steps**:

1. **Fix Analytics Dashboard Math.random()** (20 min):
   ```typescript
   // File: client/src/components/ui/analytics-dashboard.tsx

   // BEFORE: Math.random() in render
   const viewsTrend = Array.from({ length: 30 }, (_, i) => {
     return {
       views: Math.floor(Math.random() * 500) + 100, // ❌ Different on server vs client
     };
   });

   // AFTER: Generate in useEffect
   const [viewsTrend, setViewsTrend] = useState<any[]>([]);

   useEffect(() => {
     setViewsTrend(Array.from({ length: 30 }, (_, i) => {
       const date = new Date();
       date.setDate(date.getDate() - (29 - i));
       return {
         date: date.toISOString().split('T')[0],
         views: Math.floor(Math.random() * 500) + 100,
         clicks: Math.floor(Math.random() * 200) + 50
       };
     }));
   }, []);
   ```

2. **Fix Community Metrics** (15 min):
   - Same pattern: Move Math.random() to useEffect
   - Or: Fetch real data from API instead of mocks

3. **Fix Color Palette Generator** (15 min):
   - Use seed-based random (same seed = same colors on server + client)
   - Or: Suppress hydration warning on preview components

4. **Fix Interactive Resource Preview** (10 min):
   - Move mock GitHub metrics to useEffect
   - Or: Show skeleton initially, populate after mount

**Verification**:
- [ ] Zero React #418, #423 errors in console
- [ ] Page still renders correctly
- [ ] No visual changes (mock data still appears)
- [ ] SSR + client render match exactly

**Exit Criteria**: Hydration warnings eliminated

---

### Task 6.3: Remove Commented Replit Code (30 min)

**Steps**:

1. **Find Commented Code Blocks**:
   ```bash
   grep -rn "\/\* Replit\|\/\/ Replit" server/ client/src/ --include="*.ts" --include="*.tsx"
   ```

2. **Remove Each Block**:
   - server/routes.ts: Old Passport.js login endpoint
   - Any other Replit-specific code

3. **Verify No Breakage**:
   - Run TypeScript check: `npm run check`
   - Test app still works

**Verification**:
- [ ] All Replit comments removed
- [ ] TypeScript compiles
- [ ] App functions normally

**Exit Criteria**: Codebase clean of legacy code

---

### Task 6.4: Fix TypeScript Errors (45 min)

**Current**: 8 pre-existing TypeScript errors (non-blocking but should fix)

**Steps**:

1. **List All Errors**:
   ```bash
   npm run check 2>&1 | tee ts-errors.txt
   ```

2. **Fix Each Error**:
   - Group by file
   - Fix in order of severity (errors > warnings > info)
   - Add proper types instead of `any` where possible

3. **Verify Zero Errors**:
   ```bash
   npm run check
   # Expected: No errors, possibly some warnings
   ```

**Verification**:
- [ ] TypeScript compiles with zero errors
- [ ] Build succeeds: `npm run build`
- [ ] Runtime behavior unchanged

**Exit Criteria**: Strict TypeScript compliance

---

**Phase 6 Duration**: 3-4 hours
**Phase 6 Deliverables**:
- All parseInt(UUID) bugs fixed
- React hydration warnings eliminated
- Commented code removed
- TypeScript errors fixed
- Code quality improved

---

## Phase 7: Security Audit & Hardening

**Type**: Security
**Estimated**: 3-4 hours
**Files**: `server/routes.ts`, `nginx.conf`, `.env.example`, `docs/security-audit.md`
**MCP Tools**: Supabase
**Skills**: `security-auditor` agent, `owasp-top10-expert` agent

---

### Task 7.1: Audit Row-Level Security Policies (60 min)
**Skill**: `security-auditor` agent

**Steps**:

1. **Test RLS for Resources Table** (20 min):
   - Create test user (non-admin)
   - Login as test user
   - Try to access admin endpoints:
     ```bash
     curl -H "Authorization: Bearer $USER_TOKEN" \
       http://localhost:3000/api/admin/stats
     ```
   - **Expected**: 403 Forbidden
   - Try to view pending resources:
     ```bash
     curl -H "Authorization: Bearer $USER_TOKEN" \
       http://localhost:3000/api/resources?status=pending
     ```
   - **Expected**: Empty array or 403 (pending should be admin-only)

2. **Test RLS for User Data Tables** (20 min):
   - Login as User A
   - Create bookmark
   - Get User A's bookmarks via API
   - **Verification**: Returns User A's bookmarks only
   - Try to access User B's bookmarks:
     ```bash
     curl -H "Authorization: Bearer $USER_A_TOKEN" \
       http://localhost:3000/api/users/[user-b-id]/bookmarks
     ```
   - **Expected**: 403 or empty (RLS blocks)
   - Test direct database access:
     ```sql
     SET request.jwt.claims.sub = '[user-a-id]';
     SELECT * FROM user_bookmarks; -- Should only see User A's data
     ```

3. **Review All RLS Policies** (20 min):
   - Query Supabase for active policies:
     ```sql
     SELECT schemaname, tablename, policyname, qual, with_check
     FROM pg_policies
     WHERE schemaname = 'public'
     ORDER BY tablename;
     ```
   - Verify each policy:
     - resources: Public can SELECT approved, only admins INSERT/UPDATE/DELETE
     - user_favorites: Users can only manage their own (user_id = auth.uid())
     - user_bookmarks: Same as favorites
     - user_preferences: Users own their preferences
     - enrichment_jobs: Admin-only
   - Document any missing policies

**Verification**:
- [ ] Users cannot access other users' data
- [ ] Non-admins cannot approve resources
- [ ] Public users cannot see pending resources
- [ ] RLS policies cover all user-facing tables
- [ ] No policy bypasses found

**Exit Criteria**: RLS policies comprehensive and tested

---

### Task 7.2: Test Input Validation & Injection Prevention (60 min)
**Skill**: `owasp-top10-expert` agent

**Steps**:

1. **SQL Injection Tests** (20 min):
   - Test resource creation with malicious input:
     ```json
     POST /api/resources
     {
       "title": "'; DROP TABLE resources; --",
       "url": "https://evil.com",
       "category": "General Tools"
     }
     ```
   - **Expected**: Safely escaped, no SQL execution
   - Verify database unchanged
   - Test search with SQL:
     ```
     GET /api/resources?search=test' OR '1'='1
     ```
   - **Expected**: Search string escaped, no injection

2. **XSS Prevention** (20 min):
   - Submit resource with script tags:
     ```json
     {
       "title": "<script>alert('XSS')</script>",
       "description": "<img src=x onerror='alert(1)'>"
     }
     ```
   - Approve resource
   - View on public site
   - **Verification**: Scripts not executed (escaped or sanitized)
   - Check HTML source: Scripts should be entities

3. **CSRF Protection** (20 min):
   - Verify all POST/PUT/DELETE endpoints require authentication
   - Test cross-origin request:
     ```bash
     curl -X POST http://localhost:3000/api/resources \
       -H "Origin: https://evil.com" \
       -H "Content-Type: application/json" \
       -d '{"title":"CSRF Test"}'
     ```
   - **Expected**: 401 (no token) or 403 (CORS blocked)

**Verification**:
- [ ] SQL injection attempts safely handled
- [ ] XSS prevented (scripts escaped)
- [ ] CSRF tokens or SameSite cookies configured
- [ ] All mutations require authentication
- [ ] CORS restricts origins (or at least checks Origin header)

**Exit Criteria**: No injection vulnerabilities found

---

### Task 7.3: Audit Authentication & Session Security (45 min)

**Steps**:

1. **Test JWT Expiration** (15 min):
   - Login and get token
   - Manually expire token (change `exp` claim or wait)
   - Make authenticated request
   - **Expected**: 401 Unauthorized, prompt to re-login
   - **Verification**: Refresh token used automatically (if implemented)

2. **Test Token Theft Scenarios** (15 min):
   - Copy JWT from localStorage
   - Open incognito window
   - Manually set token in localStorage
   - **Verification**: Can access account (expected, JWT is bearer token)
   - Document: JWTs are bearer tokens, protect with HTTPS, httpOnly cookies (future enhancement)

3. **Test Password Strength** (15 min):
   - Try to signup with weak password: `test`
   - **Expected**: Rejected (Supabase default: 6 chars min)
   - Try common password: `password123`
   - **Expected**: Rejected (if password strength configured)
   - Try strong password: `X8f#mK9$nP2qL5wR`
   - **Expected**: Accepted

**Verification**:
- [ ] Expired tokens rejected
- [ ] Weak passwords rejected
- [ ] JWTs properly signed (verify signature)
- [ ] No session fixation vulnerabilities
- [ ] Logout invalidates token

**Exit Criteria**: Auth security hardened

---

### Task 7.4: Configure Rate Limiting (30 min)

**Steps**:

1. **Verify Nginx Rate Limits** (15 min):
   - Check `docker/nginx/nginx.conf`:
     ```nginx
     limit_req_zone $binary_remote_addr zone=api:10m rate=60r/m;
     limit_req_zone $binary_remote_addr zone=auth:10m rate=10r/m;

     location /api/ {
       limit_req zone=api burst=20 nodelay;
     }

     location /api/auth/ {
       limit_req zone=auth burst=5 nodelay;
     }
     ```
   - If missing, add configuration

2. **Test Rate Limiting** (15 min):
   - Rapid-fire requests:
     ```bash
     for i in {1..100}; do
       curl http://localhost:3000/api/health &
     done
     wait
     ```
   - **Expected**: Some requests return 429 Too Many Requests
   - Verify in nginx logs:
     ```bash
     docker-compose logs nginx | grep "limit"
     ```

**Verification**:
- [ ] Rate limits configured in nginx
- [ ] Excessive requests return 429
- [ ] Burst allowance works
- [ ] Legitimate traffic not blocked

**Exit Criteria**: Rate limiting active and tested

---

### Task 7.5: Security Audit Report (30 min)

**Steps**:

1. **Generate Security Checklist**:
   ```markdown
   # Security Audit Report

   ## Authentication & Authorization
   - [x] JWT tokens properly signed and verified
   - [x] Admin role checked server-side (not just client)
   - [x] Expired tokens rejected
   - [x] RLS policies enforce data ownership
   - [ ] OAuth tokens stored securely (httpOnly cookies recommended)
   - [ ] 2FA available for admin accounts (future: Supabase supports)

   ## Input Validation
   - [x] SQL injection prevented (parameterized queries)
   - [x] XSS prevented (React escapes by default)
   - [x] CSRF protection (SameSite cookies)
   - [x] URL validation (whitelist for AI analysis)
   - [x] File upload validation (if applicable)

   ## Data Protection
   - [x] Sensitive data not logged (passwords, tokens)
   - [x] HTTPS enforced (production)
   - [x] Secrets in environment variables (not code)
   - [x] Database credentials not exposed
   - [x] API keys not in client bundle

   ## Rate Limiting & DoS
   - [x] Nginx rate limits configured
   - [x] API endpoints throttled
   - [x] Auth endpoints strictly limited
   - [ ] IP blocking for abuse (future)

   ## Recommendations
   1. Enable httpOnly cookies for JWT storage
   2. Add CSP headers
   3. Configure CORS for production domain only
   4. Enable Supabase 2FA for admin accounts
   5. Set up error monitoring (Sentry)
   ```

2. **Document Findings**:
   - Save report to `docs/security-audit.md`
   - Create GitHub issue for any HIGH severity items

**Verification**:
- [ ] Audit report complete
- [ ] All HIGH severity issues addressed
- [ ] MEDIUM issues documented for future

**Exit Criteria**: Security posture documented and acceptable

---

**Phase 7 Duration**: 3-4 hours
**Phase 7 Deliverables**:
- All UUID bugs fixed
- Rate limiting configured
- Security audit complete
- Recommendations documented

---

## Phase 8: Performance Optimization

**Type**: Performance
**Estimated**: 2-3 hours
**Files**: Various optimizations
**Skills**: `performance-engineer` agent

### Task 8.1: Optimize Database Queries (60 min)

**Steps**:

1. **Analyze Slow Queries** (20 min):
   - Enable Supabase query logging
   - Navigate through app while monitoring
   - Check Supabase dashboard → Logs → SQL
   - Identify queries > 100ms
   - Document in table:
     | Query | Duration | Table | Optimization |
     |-------|----------|-------|--------------|

2. **Add Missing Indexes** (30 min):
   - Resources table:
     ```sql
     CREATE INDEX IF NOT EXISTS idx_resources_category_status
     ON resources(category, status);

     CREATE INDEX IF NOT EXISTS idx_resources_submitted_by
     ON resources(submitted_by);

     CREATE INDEX IF NOT EXISTS idx_resources_created_at
     ON resources(created_at DESC);
     ```
   - User tables:
     ```sql
     CREATE INDEX IF NOT EXISTS idx_user_bookmarks_user_id
     ON user_bookmarks(user_id);

     CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id
     ON user_favorites(user_id);
     ```

3. **Test Performance Improvement** (10 min):
   - Re-run slow queries
   - **Verification**: Duration reduced by 50%+
   - Use EXPLAIN ANALYZE:
     ```sql
     EXPLAIN ANALYZE
     SELECT * FROM resources
     WHERE category = 'Encoding & Codecs' AND status = 'approved'
     LIMIT 20;
     ```
   - **Verification**: Index used (not sequential scan)

**Verification**:
- [ ] All queries < 100ms
- [ ] Indexes created successfully
- [ ] EXPLAIN ANALYZE shows index usage
- [ ] No sequential scans on large tables

**Exit Criteria**: Database queries optimized

---

### Task 8.2: Optimize Frontend Bundle Size (60 min)

**Steps**:

1. **Analyze Bundle** (15 min):
   ```bash
   npm run build
   # Check output: dist/public/assets/index-*.js

   # Use rollup-plugin-visualizer
   npm install --save-dev rollup-plugin-visualizer
   ```
   - Add to vite.config.ts:
     ```typescript
     import { visualizer } from 'rollup-plugin-visualizer';

     export default defineConfig({
       plugins: [
         react(),
         visualizer({ open: true, filename: 'bundle-analysis.html' })
       ],
     });
     ```
   - Build and open bundle-analysis.html
   - Identify large dependencies

2. **Implement Code Splitting** (30 min):
   ```typescript
   // File: client/src/App.tsx

   // Use React.lazy for route components
   import { lazy, Suspense } from 'react';

   const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'));
   const Journeys = lazy(() => import('@/pages/Journeys'));
   const Advanced = lazy(() => import('@/pages/Advanced'));

   // Wrap in Suspense
   <Route path="/admin" component={() => (
     <Suspense fallback={<LoadingSpinner />}>
       <AdminGuard>
         <AdminDashboard />
       </AdminGuard>
     </Suspense>
   )} />
   ```

3. **Test Bundle Size Reduction** (15 min):
   ```bash
   npm run build
   # Compare: Before vs After
   ```
   - **Target**: Main bundle < 500 KB (gzipped)
   - **Verification**: Lazy-loaded chunks created
   - **Verification**: Homepage loads without admin code

**Verification**:
- [ ] Bundle reduced by 20%+
- [ ] Code splitting working
- [ ] Lazy loading doesn't break routing
- [ ] Performance maintained

**Exit Criteria**: Bundle optimized

---

**Phase 8 Duration**: 2-3 hours
**Phase 8 Deliverables**:
- Database indexes optimized
- Frontend bundle reduced
- Performance benchmarks improved

---

## Phase 9: Documentation & Handoff

**Type**: Documentation
**Estimated**: 2-3 hours
**Files**: `CLAUDE.md`, `docs/admin-manual.md`, `docs/e2e-testing.md`, `README.md`

### Task 9.1: Update CLAUDE.md Architecture Doc (45 min)

**Steps**:

1. **Update Authentication Section**:
   - Add OAuth provider details (GitHub, Google, Magic Link)
   - Document JWT payload structure
   - Update flow diagrams

2. **Add Admin Resource Management Section**:
   - Document new CRUD interface
   - Screenshot all admin panels
   - List all bulk operations

3. **Update API Endpoints Table**:
   - Add new endpoints created in Phases 2-4
   - Update authentication requirements
   - Add request/response examples

4. **Add E2E Testing Section**:
   - How to run tests
   - How to add new tests
   - CI/CD integration

**Verification**:
- [ ] CLAUDE.md reflects current architecture
- [ ] All new features documented
- [ ] Screenshots up to date
- [ ] Examples accurate

**Exit Criteria**: CLAUDE.md is comprehensive and current

---

### Task 9.2: Create Admin User Manual (60 min)

**Steps**:

1. **Write Admin Guide**:
   ```markdown
   # Admin User Manual

   ## Getting Started

   ### Accessing Admin Panel
   1. Login with admin credentials
   2. Navigate to http://localhost:3000/admin
   3. Verify "Admin Dashboard" heading visible

   ## Dashboard Overview

   ### Stat Widgets
   - **Total Resources**: All resources in database (approved + pending + archived)
   - **Pending Approvals**: Resources awaiting admin review
   - **Active Users**: Users who logged in within last 30 days
   - **Quality Score**: Percentage of resources with descriptions and tags

   ### Quick Actions
   - Review Pending: Jump to pending approvals
   - AI Enrichment: Start batch enrichment job
   - GitHub Sync: Import/export to GitHub
   - Browse All: Access resource browser

   ## Managing Resources

   ### Viewing Resources
   1. Click "All Resources" in sidebar
   2. Use filters:
      - Status: All, Pending, Approved, Rejected, Archived
      - Category: Select from dropdown
      - Search: Type keywords
      - Date Range: Select dates
   3. Resources display in table with:
      - Title (with external link icon)
      - Category badge
      - Status badge
      - Last modified date
      - Actions menu

   ### Editing Resources
   1. Click ⋯ actions menu on resource
   2. Select "Edit"
   3. Modify fields in modal:
      - Title, URL, Description
      - Category, Subcategory, Sub-subcategory
      - Status
      - Tags
   4. Click "Save Changes"
   5. Verify update in table

   ### Bulk Operations
   1. Select resources using checkboxes
   2. Bulk toolbar appears showing count
   3. Choose action:
      - **Approve**: Set status to approved
      - **Reject**: Set status to rejected
      - **Archive**: Set status to archived (soft delete)
      - **Add Tags**: Bulk tag resources
      - **Export CSV**: Download selected as CSV
   4. Confirm action
   5. Verify completion message

   ### Approving Pending Resources
   1. Navigate to "Pending Approvals" (sidebar or quick action)
   2. Review each resource:
      - Check title, URL, description
      - Click URL to visit (opens new tab)
      - Verify quality and relevance
   3. Decision:
      - **Approve**: Resource becomes public
      - **Reject**: Resource hidden, submitter notified
      - **Edit**: Modify before approving
   4. Click action button
   5. Confirm in dialog

   ## AI Enrichment

   ### Starting an Enrichment Job
   1. Navigate to "AI Enrichment" in sidebar
   2. Configure job:
      - **Filter**:
        - "All": Enrich all resources (expensive!)
        - "Unenriched": Only resources without AI metadata
      - **Batch Size**: Resources per batch (5-50)
   3. Click "Start Enrichment"
   4. Monitor progress:
      - Progress bar updates in real-time
      - See processed/successful/failed counts
      - Estimated time remaining
   5. Wait for completion or cancel

   ### Reviewing Enrichment Results
   1. Navigate to enrichment job details
   2. View AI-generated:
      - Suggested tags
      - Improved descriptions
      - Category suggestions
      - Confidence scores
   3. Apply suggestions:
      - Bulk approve all high-confidence (>80%)
      - Manually review medium (50-80%)
      - Reject low confidence (<50%)

   ## GitHub Sync

   ### Importing from GitHub
   1. Navigate to "GitHub Sync"
   2. Select "Import"
   3. Enter repository: krzemienski/awesome-video
   4. Check "Dry Run" for preview
   5. Click "Start Import"
   6. Review preview:
      - Resources to add
      - Resources to update
      - Resources unchanged
   7. Uncheck "Dry Run" if preview looks good
   8. Re-run to execute
   9. Verify sync history recorded

   ### Exporting to GitHub
   1. Navigate to "GitHub Sync"
   2. Select "Export"
   3. Configure:
      - Commit message
      - Include CONTRIBUTING.md
   4. Preview diff
   5. Confirm export
   6. Verify commit on GitHub

   ## User Management

   ### Viewing Users
   1. Navigate to "Users" in sidebar
   2. View all registered users
   3. See: Email, role, signup date, last login

   ### Promoting to Admin
   1. Find user in list
   2. Click actions menu
   3. Select "Change Role"
   4. Select "Admin"
   5. Confirm
   6. Verify user can access /admin

   ## Audit Log

   ### Viewing Activity
   1. Navigate to "Audit Log"
   2. See all admin actions:
      - Who did what
      - When
      - What changed
   3. Filter by:
      - Action type
      - User
      - Date range
   4. Export audit log as CSV for compliance

   ## Best Practices

   - **Review pending resources daily**: Don't let queue build up
   - **Run enrichment weekly**: Keep metadata fresh
   - **Sync to GitHub monthly**: Keep awesome-video repo updated
   - **Check broken links quarterly**: Maintain quality
   - **Review audit log regularly**: Spot unusual activity
   ```

2. **Add Screenshots**:
   - Capture each admin panel
   - Annotate with arrows/labels
   - Save to `docs/screenshots/admin/`

**Verification**:
- [ ] Manual is comprehensive
- [ ] Screenshots clear and annotated
- [ ] All features covered
- [ ] Easy to follow for new admin

**Exit Criteria**: Admin manual complete

---

**Phase 9 Duration**: 2-3 hours
**Phase 9 Deliverables**:
- Updated CLAUDE.md
- Admin user manual
- E2E testing guide
- All docs synchronized

---

## Summary & Execution Strategy

### Total Plan Statistics

| Metric | Value |
|--------|-------|
| **Total Phases** | 9 phases |
| **Total Tasks** | 45+ detailed tasks |
| **Estimated Duration** | 25-30 hours |
| **Human Time** | ~25-30 minutes |
| **New Files Created** | ~25 files (components, tests, docs) |
| **Modified Files** | ~15 files |
| **Lines of Code** | ~8,000-10,000 new lines |

### Phase Dependencies

```
Phase 0 (Pre-Flight) ────┐
                         ├──→ Phase 1 (OAuth) ────┐
                         │                        │
                         ├──→ Phase 2 (Admin CRUD)┤
                         │                        ├──→ Phase 4 (Validate Features)
                         ├──→ Phase 3 (Dashboard) │
                         │                        │
                         └────────────────────────┘
                                                   │
                                                   ├──→ Phase 5 (E2E Tests)
                                                   │
                                                   ├──→ Phase 6 (Bug Fixes)
                                                   │
                                                   ├──→ Phase 7 (Security)
                                                   │
                                                   ├──→ Phase 8 (Performance)
                                                   │
                                                   └──→ Phase 9 (Documentation)
```

**Parallelizable**:
- Phases 1, 2, 3 can run in parallel (different developers)
- Phase 4 tasks can run in parallel (different features)

**Sequential**:
- Phase 0 must complete first (environment setup)
- Phase 5 requires Phases 1-4 complete (testing implemented features)
- Phases 6-9 final polishing (after functionality complete)

### Execution Recommendations

**Session 3A (4-5 hours)**: Phases 0-1
- Pre-flight checks
- OAuth configuration and testing
- **Checkpoint**: All auth methods working

**Session 3B (6-7 hours)**: Phases 2-3
- Admin resource management
- Dashboard redesign
- **Checkpoint**: Admin UI complete

**Session 3C (8-10 hours)**: Phase 4
- Validate all untested features
- **Checkpoint**: 100% feature coverage

**Session 3D (6-8 hours)**: Phase 5
- E2E test suite
- **Checkpoint**: Automated testing

**Session 3E (5-6 hours)**: Phases 6-9
- Bug fixes, security, performance, docs
- **Checkpoint**: Production-ready

**Total Sessions**: 5 sessions × 5 hours = 25 hours

### Skill Usage Summary

| Phase | Primary Skill | Agent/MCP |
|-------|---------------|-----------|
| 0 | systematic-debugging | Supabase MCP |
| 1 | systematic-debugging | Chrome DevTools MCP |
| 2 | test-driven-development | react-expert agent, Context7 MCP |
| 3 | react-expert agent | shadcn/ui MCP |
| 4 | systematic-debugging | Chrome DevTools, Playwright MCP |
| 5 | playwright-skill | Playwright MCP |
| 6 | refactoring-expert agent | - |
| 7 | security-auditor agent | owasp-top10-expert agent |
| 8 | performance-engineer agent | - |
| 9 | technical-writer agent | - |

### Validation Gate Summary

**Per Task**: TypeScript compile + linting + console clean
**Per Phase**: Functional tests with real systems (NO MOCKS)
**Per Session**: Review checkpoint with partner

**Final Validation** (After Phase 9):
- [ ] All E2E tests passing
- [ ] All features manually tested
- [ ] Security audit clean
- [ ] Performance targets met
- [ ] Documentation complete
- [ ] Ready for production deployment

---

## Risk Assessment

### High Risk Items

1. **OAuth Configuration** (Phase 1)
   - **Risk**: Provider setup failures, wrong redirect URLs
   - **Mitigation**: Detailed guide, test in dev first, screenshots at each step
   - **Contingency**: Fall back to email/password only

2. **Bulk Operations** (Phase 2)
   - **Risk**: Data corruption, race conditions, deadlocks
   - **Mitigation**: Database transactions, optimistic locking, extensive testing
   - **Contingency**: Disable bulk delete, keep audit trail

3. **GitHub Sync** (Phase 4)
   - **Risk**: Duplicate resources, data loss, commit failures
   - **Mitigation**: Dry run mode, diff preview, rollback capability
   - **Contingency**: Manual sync via CSV export/import

4. **AI Enrichment** (Phase 4)
   - **Risk**: API costs, rate limiting, incorrect metadata
   - **Mitigation**: Small batches, cost estimation, manual review
   - **Contingency**: Skip enrichment, manually curate

### Medium Risk Items

- Search performance with 2,646 resources
- E2E test flakiness
- TypeScript refactoring breaking runtime
- Security vulnerabilities in input handling

### Low Risk Items

- Dashboard redesign (cosmetic)
- Documentation updates
- Performance optimization (incremental)

---

## Success Criteria

### Functional Requirements

**Must Have** (Session 3 Complete):
- [ ] All 3 OAuth providers working (GitHub, Google, Magic Link)
- [ ] Admin can CRUD any resource (view, edit, delete, restore)
- [ ] Bulk operations functional (approve, reject, archive, tag, export)
- [ ] All features tested and working:
  - [ ] Search
  - [ ] Bookmarks
  - [ ] Favorites
  - [ ] Learning Journeys
  - [ ] GitHub Sync
  - [ ] AI Enrichment
  - [ ] Edit Suggestions
- [ ] E2E test suite passing (50+ tests)
- [ ] Zero critical bugs
- [ ] Security audit passed

**Should Have**:
- [ ] React hydration warnings fixed
- [ ] TypeScript strict mode compliance
- [ ] Performance optimized (queries < 100ms, homepage < 2s)
- [ ] Documentation complete

**Nice to Have**:
- [ ] CI/CD pipeline configured
- [ ] Monitoring set up (Sentry, Uptime Robot)
- [ ] Production deployment script

### Non-Functional Requirements

- **Performance**: All targets from CLAUDE.md met
- **Security**: OWASP Top 10 mitigations in place
- **Maintainability**: Code documented, tests comprehensive
- **Reliability**: Error handling robust, graceful degradation

---

## Appendix A: Detailed Skill Invocation Map

### When to Use Each Skill

**systematic-debugging**:
- OAuth redirect failures
- Database query errors
- API 500 errors
- Console errors in browser
- Unexpected behavior

**test-driven-development**:
- New components (ResourceBrowser, EditModal)
- New API endpoints (bulk operations)
- New features (filters, export)

**testing-anti-patterns**:
- When tempted to mock Supabase
- When tempted to mock GitHub API
- When tests pass but feature broken

**playwright-skill**:
- Writing E2E test suite
- Debugging test flakiness
- Setting up CI/CD testing

**react-expert** agent:
- Complex React patterns (table virtualization)
- State management questions
- Performance optimization

**security-auditor** agent:
- RLS policy review
- Input validation audit
- OWASP compliance check

**tailwind-v4-shadcn** skill:
- Admin dashboard styling
- Component library usage
- Responsive design

**Context7** MCP:
- TanStack Table documentation
- React Hook Form patterns
- Zod schema examples
- Supabase client API

---

## Appendix B: MCP Tool Usage Guide

### Chrome DevTools MCP

**When to use**:
- Interactive testing of OAuth flows
- Verifying UI state changes
- Debugging browser console errors
- Taking verification screenshots

**Key functions**:
- `navigate_page`: Load pages
- `take_snapshot`: Get accessibility tree
- `list_console_messages`: Check for errors
- `click`: Interact with UI
- `fill`: Fill forms
- `evaluate_script`: Run JavaScript in page context

### Supabase MCP

**When to use**:
- Creating test users
- Querying database for verification
- Checking RLS policies
- Running migrations

**Key functions**:
- `execute_sql`: Run SQL queries
- `list_tables`: Verify schema
- `get_advisors`: Check security/performance issues

### Playwright MCP

**When to use**:
- Writing automated E2E tests
- Running test suite in CI/CD
- Performance benchmarking
- Cross-browser testing

**Key functions**:
- `browser_navigate`: Go to URL
- `browser_click`: Click elements
- `browser_snapshot`: Get page state
- `browser_take_screenshot`: Capture visuals

### Context7 MCP

**When to use**:
- Need library documentation
- Unclear on API usage
- Want best practices for framework

**Key functions**:
- `resolve-library-id`: Find library
- `get-library-docs`: Fetch documentation

---

## Appendix C: Verification Templates

### API Endpoint Verification Template

For each new endpoint:

```markdown
## Testing: [METHOD] /api/[route]

### Test Cases

**Happy Path**:
- [ ] Valid request → 200 OK with expected data
- [ ] Response schema matches TypeScript type
- [ ] Database updated correctly

**Authentication**:
- [ ] No token → 401 Unauthorized
- [ ] Invalid token → 401 Unauthorized
- [ ] Expired token → 401 Unauthorized
- [ ] Valid user token (if admin-only) → 403 Forbidden

**Validation**:
- [ ] Missing required field → 400 Bad Request with helpful message
- [ ] Invalid field type → 400 Bad Request
- [ ] Invalid ID format → 400 Bad Request

**Edge Cases**:
- [ ] Empty request body → 400 Bad Request
- [ ] Extra fields ignored or rejected
- [ ] SQL injection attempt → Safely escaped
- [ ] XSS attempt → Sanitized

**Performance**:
- [ ] Response time < 200ms (avg of 10 requests)
- [ ] Database query count minimized (check logs)
```

### UI Component Verification Template

For each new component:

```markdown
## Testing: [ComponentName]

### Visual Testing
- [ ] Renders without console errors
- [ ] Matches design spec (screenshot comparison)
- [ ] Responsive (mobile, tablet, desktop)
- [ ] Dark mode compatible
- [ ] Accessible (ARIA labels, keyboard navigation)

### Functional Testing
- [ ] User interactions work (click, type, submit)
- [ ] Form validation shows errors
- [ ] Loading states display during async
- [ ] Error states handle failures gracefully
- [ ] Success states confirm actions

### Integration Testing
- [ ] Fetches data from API correctly
- [ ] Updates on data changes (TanStack Query invalidation)
- [ ] Optimistic updates work
- [ ] Rollback on error
- [ ] Multiple instances don't conflict

### Performance
- [ ] Renders in < 100ms (React DevTools profiler)
- [ ] No unnecessary re-renders
- [ ] Large lists virtualized (if >100 items)
```

---

## Appendix D: Emergency Rollback Procedures

If a phase goes catastrophically wrong:

### Rollback Steps

1. **Git Revert**:
   ```bash
   git status
   git checkout [last-known-good-commit]
   git branch -D feature/session-3-enhancements
   git checkout -b feature/session-3-enhancements-retry
   ```

2. **Database Rollback**:
   - Via Supabase dashboard: Restore from backup (automatic daily backups)
   - Or: Re-run migrations from clean state

3. **Docker Reset**:
   ```bash
   docker-compose down -v
   docker-compose up --build -d
   ```

4. **Verify System**:
   - Health check: `curl http://localhost:3000/api/health`
   - Database check: `SELECT COUNT(*) FROM resources;`
   - Login check: Test admin login

### When to Rollback

- Database corruption detected
- More than 3 critical bugs introduced
- Performance degraded by >50%
- Security vulnerability introduced
- Unable to fix within 2 hours

**Better to rollback and rethink than force broken code forward.**

---

## Appendix E: Post-Completion Checklist

After all 9 phases complete:

### Pre-Production Checklist

**Code Quality**:
- [ ] TypeScript strict mode: Zero errors
- [ ] ESLint: Zero errors, < 10 warnings
- [ ] All tests passing (unit, integration, E2E)
- [ ] No console.log in production code
- [ ] No commented-out code blocks

**Security**:
- [ ] Security audit passed
- [ ] RLS policies comprehensive
- [ ] Rate limiting configured
- [ ] HTTPS only in production
- [ ] Secrets not in code or logs

**Performance**:
- [ ] Homepage < 2s
- [ ] API < 200ms avg
- [ ] Database queries optimized
- [ ] Bundle size < 500 KB (gzipped)

**Documentation**:
- [ ] CLAUDE.md current
- [ ] README.md updated
- [ ] Admin manual complete
- [ ] API documented
- [ ] Deployment guide ready

**Infrastructure**:
- [ ] Docker containers stable
- [ ] Redis caching working
- [ ] Nginx configured
- [ ] Environment variables documented
- [ ] Backups configured

### Production Deployment Checklist

- [ ] OAuth providers configured with production URLs
- [ ] SSL certificates obtained
- [ ] nginx.conf updated with production domain
- [ ] CORS restricted to production domain
- [ ] Google Analytics configured
- [ ] Error monitoring enabled (Sentry)
- [ ] Uptime monitoring enabled
- [ ] DNS configured
- [ ] Firewall rules set
- [ ] First admin user created
- [ ] Test login on production
- [ ] Test all critical flows
- [ ] Monitor logs for 24 hours

---

## Next Steps

### To Execute This Plan

**Option 1: Systematic Batch Execution**
```bash
/shannon:execute-plan
# Or: /superpowers:execute-plan
```
- Loads this plan
- Executes in batches of 3 tasks
- Review checkpoint after each batch

**Option 2: Autonomous Wave Execution**
```bash
/shannon:do --with-plan
```
- Analyzes plan complexity
- Orchestrates parallel sub-agents
- Reports progress at wave boundaries

**Option 3: Manual Execution**
- Work through phases yourself
- Use TodoWrite to track progress
- Reference plan for verification criteria

### Getting Started

**Immediate Next Steps**:

1. Read this entire plan
2. Ask any clarifying questions
3. Decide execution approach
4. Start Phase 0 (Pre-Flight)
5. Report for review after Phase 0

---

**Plan Created**: 2025-11-29
**Plan Version**: 1.0
**Status**: Ready for review and execution

---

**Ready for your feedback!** Should I:
1. Begin executing Phase 0?
2. Adjust any phases?
3. Something else?
