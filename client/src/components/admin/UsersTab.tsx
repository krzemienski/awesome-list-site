import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiRequest, ApiError } from "@/lib/queryClient";
import { maskEmail } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Trash2, Search, Eye, EyeOff, Download, ArrowUpDown, ArrowUp, ArrowDown, Plus, X } from "lucide-react";
import type { User } from "@shared/schema";
import { AdminOpsTable as Table, StatusChip, TableShell } from "@/components/admin/AdminOpsPrimitives";
import "@/styles/pages/admin-ops-users-audit.css";

interface UsersResponse {
  users: User[];
  total: number;
}

export default function UsersTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [page, setPage] = useState(1);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  // Run16 BUG-037: role changes are privilege changes — confirm before applying.
  const [pendingRoleChange, setPendingRoleChange] = useState<{ user: User; role: string } | null>(null);
  // R2-M17: server-side user search (email / first / last name).
  const [searchInput, setSearchInput] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  // R2-H05: ids whose emails are currently revealed.
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  // The role menu replaces the row's Edit button, so the menu's own focus
  // return targets an unmounted trigger; hand focus back to Edit instead
  // (after the confirm dialog, when a change was staged).
  const editButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const refocusEditIdRef = useRef<string | null>(null);
  const closeRoleEditor = (userId: string) => {
    refocusEditIdRef.current = userId;
    setEditingRoleId(null);
  };
  const [userToolsOpen, setUserToolsOpen] = useState(false);
  // Run16 BUG-087: server-side column sorting.
  const [sortBy, setSortBy] = useState<"name" | "email" | "role" | "createdAt">("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const limit = 20;

  const toggleSort = (col: "name" | "email" | "role" | "createdAt") => {
    if (sortBy === col) {
      setSortDir(d => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir(col === "createdAt" ? "desc" : "asc");
    }
    setPage(1);
  };

  // Debounce the search box → query param, resetting to page 1 on change.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (editingRoleId !== null || pendingRoleChange || !refocusEditIdRef.current) return;
    editButtonRefs.current.get(refocusEditIdRef.current)?.focus();
    refocusEditIdRef.current = null;
  }, [editingRoleId, pendingRoleChange]);

  // The pressed pager button disables itself at either end, which dropped
  // focus to <body>; hand focus to its sibling once the new page renders.
  const prevPageRef = useRef<HTMLButtonElement>(null);
  const nextPageRef = useRef<HTMLButtonElement>(null);
  const pagerRefocusRef = useRef<"prev" | "next" | null>(null);
  useEffect(() => {
    const target = pagerRefocusRef.current;
    pagerRefocusRef.current = null;
    if (target === "prev") prevPageRef.current?.focus();
    if (target === "next") nextPageRef.current?.focus();
  }, [page]);

  const { data, isLoading } = useQuery<UsersResponse>({
    queryKey: ['/api/admin/users', page, limit, searchQuery, sortBy, sortDir],
    // R5-037: refresh admin data when the operator returns to the tab.
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
      if (searchQuery) params.set('q', searchQuery);
      params.set('sortBy', sortBy);
      params.set('sortDir', sortDir);
      const response = await fetch(`/api/admin/users?${params}`, { credentials: 'include' });
      if (!response.ok) throw new ApiError(response.status, 'Failed to fetch users');
      return response.json();
    },
    // Keep the previous page rendered while a new search/page loads so the
    // search input doesn't unmount (and lose focus) mid-typing.
    placeholderData: keepPreviousData,
  });

  const toggleReveal = (id: string) => {
    setRevealedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return await apiRequest(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role }),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: "Role Updated", description: "User role has been changed." });
    },
    onError: (error: Error) => {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    },
  });

  // NEW-004: admin user deletion (QA/test account cleanup). The server blocks
  // self-deletion, detaches the user's catalog resources instead of deleting
  // them, and cascades personal data away.
  // C6-SWEEP-13: a successful delete removes the row whose button opened the
  // dialog; Radix would return focus to that vanished trigger, so hand it to
  // the user search box instead. A failed delete keeps the row: default return.
  const deletedUserRef = useRef(false);
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest(`/api/admin/users/${userId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: "User Deleted", description: "The account and its sign-in identity have been removed." });
      deletedUserRef.current = true;
      setUserToDelete(null);
      // The Action button closes the dialog on click, so Radix usually
      // returns focus to the row's Delete trigger before this resolves; that
      // trigger unmounts with the row on refetch, dropping focus to <body>.
      searchInputRef.current?.focus();
    },
    onError: (error: Error) => {
      toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
      setUserToDelete(null);
    },
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <TableShell
        title={<Skeleton className="h-5 w-40" />}
        className="admin-ops-users-shell"
      >
          <div className="admin-ops-loading space-y-4">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
      </TableShell>
    );
  }

  return (
    <TableShell
      title={`Users (${data?.total ?? 0})`}
      description="Admins and contributors"
      className={`admin-ops-users-shell${userToolsOpen ? " admin-ops-users-shell--tools-open" : ""}`}
      actions={
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setUserToolsOpen((open) => !open)}
            aria-expanded={userToolsOpen}
            data-testid="button-user-tools"
          >
            {userToolsOpen ? "Hide row actions" : "Row actions"}
          </Button>
          <div className="admin-users-extra-action admin-ops-search relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              // C3-V5B-05: the field is a fixed 12.5rem in the card header, so
              // keep the hint short and reserve the clear-button gutter only
              // while the button is shown; the aria-label carries the full name.
              placeholder="Email or name…"
              aria-label="Search users by email or name"
              className={searchInput ? "pl-8 pr-8" : "pl-8"}
              data-testid="input-user-search"
            />
            {searchInput && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  setSearchInput("");
                  searchInputRef.current?.focus();
                }}
                className="absolute right-1 top-1/2 h-8 w-8 min-h-8 min-w-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear user search"
                data-testid="button-clear-user-search"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Button variant="outline" size="sm" className="admin-users-extra-action sm:ml-auto" asChild data-testid="button-export-users">
            <a href="/api/admin/users/export" download>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </a>
          </Button>
          <button
            type="button"
            className="btn ghost"
            disabled
            title="Invitations are not supported by the admin API."
            aria-label="Invite user unavailable"
            data-testid="button-invite-user"
          >
            <Plus className="h-3 w-3" />
            Invite unavailable
          </button>
        </>
      }
    >
        {/* Run16 BUG-088: on narrow screens the table scrolls sideways — a
            right-edge fade + explicit hint make the hidden columns
            discoverable instead of silently clipping them. */}
        <div className="admin-ops-table-wrap relative">
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-card to-transparent sm:hidden"
            aria-hidden="true"
          />
          <Table className="admin-ops-table admin-ops-users-table">
            <TableHeader>
            <TableRow>
              {/* Run16 BUG-087: sortable column headers (server-side sort). */}
              {([
                { key: "name", label: "Name" },
                { key: "email", label: "Email" },
                { key: "role", label: "Role" },
                { key: "createdAt", label: "Joined" },
              ] as const).map(col => (
                <TableHead
                  key={col.key}
                  aria-sort={sortBy === col.key ? (sortDir === "asc" ? "ascending" : "descending") : undefined}
                >
                  {/* Keep the canonical label in intrinsic layout while its
                      retained 44px sort target remains centred out of flow. */}
                  <span aria-hidden="true" className="invisible">{col.label}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => toggleSort(col.key)}
                    className="admin-ops-sort-button"
                    aria-label={`Sort by ${col.label}`}
                    data-testid={`button-sort-${col.key}`}
                  >
                    {col.label}
                    {sortBy === col.key
                      ? (sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />)
                      : <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />}
                  </Button>
                </TableHead>
              ))}
              <TableHead aria-label="Actions" />
            </TableRow>
            </TableHeader>
            <TableBody>
            {data?.users && data.users.length > 0 ? (
              data.users.map((user) => (
                <TableRow key={user.id} className="admin-ops-row">
                  {/* BUG-012 (run18): cap the name cell + truncate so a legal
                      101-char display name can't stretch the table (it was
                      unwrapping to ~2,369px); full value stays in the title. */}
                  <TableCell className="admin-ops-cell-name max-w-[240px]">
                    <div className="flex items-center gap-2 min-w-0">
                      {/* A nameless account is identified by its masked email (or
                          id), set in the same ink and weight as a real name — the
                          frozen AdminUsers name cell has one style for every row.
                          The reveal toggle governs the Email column only. */}
                      {user.firstName || user.lastName ? (
                        <span
                          className="font-medium truncate"
                          title={`${user.firstName || ''} ${user.lastName || ''}`.trim()}
                          data-testid={`text-name-${user.id}`}
                        >
                          {`${user.firstName || ''} ${user.lastName || ''}`.trim()}
                        </span>
                      ) : (
                        <span
                          className="font-medium truncate"
                          title={user.email ? maskEmail(user.email) : user.id}
                          data-testid={`text-name-${user.id}`}
                        >
                          {user.email ? maskEmail(user.email) : user.id}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="admin-ops-cell-email max-w-[280px] text-muted-foreground">
                    {user.email ? (
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span
                          className="min-w-0 truncate"
                          title={revealedIds.has(user.id) ? user.email : maskEmail(user.email)}
                          data-testid={`text-email-${user.id}`}
                        >
                          {revealedIds.has(user.id) ? user.email : maskEmail(user.email)}
                        </span>
                        {/* R4-041: aria-label includes a row identifier so repeated controls
                            have unique accessible names (masked email keeps PII out of the DOM). */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleReveal(user.id)}
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center min-h-[32px] min-w-[32px] text-muted-foreground/70 hover:bg-transparent hover:text-foreground transition-colors"
                          aria-label={`${revealedIds.has(user.id) ? "Mask" : "Reveal"} email for ${
                            `${user.firstName || ''} ${user.lastName || ''}`.trim() || maskEmail(user.email)
                          }`}
                          data-testid={`button-toggle-email-${user.id}`}
                        >
                          {revealedIds.has(user.id) ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </Button>
                      </span>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="admin-ops-cell-role">
                    <StatusChip status={user.role ?? "user"} />
                  </TableCell>
                  <TableCell className="admin-ops-cell-joined text-muted-foreground">
                    {formatDate(user.createdAt)}
                  </TableCell>
                  <TableCell className="admin-ops-cell-actions">
                    <div className="flex items-center gap-2">
                      {/* Run16 BUG-014: an admin must not be able to demote
                          themselves — like Delete, Edit is absent on the own
                          row (matching the server-side self-demote guard). The
                          role menu opens on Edit; closing it without a pick
                          cancels the edit. */}
                      {user.id === currentUser?.id ? null : editingRoleId === user.id ? <Select
                        value={user.role || 'user'}
                        defaultOpen
                        onOpenChange={(open) => { if (!open) closeRoleEditor(user.id); }}
                        /* Run16 BUG-037: stage the change and confirm first. */
                        onValueChange={(role) => {
                          closeRoleEditor(user.id);
                          if (role !== (user.role || 'user')) setPendingRoleChange({ user, role });
                        }}
                      >
                        <SelectTrigger
                          className="h-8 w-auto shrink-0 gap-1 text-xs"
                          aria-label={
                            /* R4-041: include a row identifier so the 20 role
                               selects don't share one accessible name (masked
                               email keeps PII out of the DOM, matching the
                               Reveal/Delete buttons). */
                            `Change role for ${
                              `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
                              (user.email ? maskEmail(user.email) : user.id)
                            }`
                          }
                        >
                          {/* The actions column is too narrow for the role
                              name; the open menu checks the current role. */}
                          Role
                        </SelectTrigger>
                        <SelectContent
                          onKeyDown={(e) => {
                            // Radix commits the pick on Enter keydown but keeps the
                            // key's default action, so its follow-up activation
                            // clicked whatever had focus next: the re-mounted Edit
                            // (re-opening this menu behind the confirm) or the
                            // confirm's Cancel. Runs after the item has selected.
                            if (e.key === "Enter") e.preventDefault();
                          }}
                        >
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="moderator">Moderator</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select> : (
                        <Button
                          ref={(el) => {
                            if (el) editButtonRefs.current.set(user.id, el);
                            else editButtonRefs.current.delete(user.id);
                          }}
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingRoleId(user.id)}
                          aria-label={`Edit role for ${
                            `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
                            (user.email ? maskEmail(user.email) : user.id)
                          }`}
                          data-testid={`button-edit-user-${user.id}`}
                        >
                          Edit
                        </Button>
                      )}
                      {user.id !== currentUser?.id && editingRoleId !== user.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => {
                            deletedUserRef.current = false;
                            setUserToDelete(user);
                          }}
                          aria-label={`Delete user ${
                            /* R4-H05: keep the raw email out of the DOM unless revealed.
                               R5-012: masked emails can collide (j***@gmail.com), so the
                               label always carries the unique user id too. */
                            user.email
                              ? `${revealedIds.has(user.id) ? user.email : maskEmail(user.email)} (${user.id})`
                              : user.id
                          }`}
                          data-testid={`button-delete-user-${user.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {searchQuery ? `No users match "${searchQuery}"` : "No users found"}
                </TableCell>
              </TableRow>
            )}
            </TableBody>
          </Table>
        </div>
        <p className="admin-ops-scroll-hint text-xs text-muted-foreground mt-2 sm:hidden">
          Swipe the table sideways to see role, join date, and actions.
        </p>

        {totalPages > 1 && (
          <div className="admin-ops-users-pagination">
            <span className="admin-ops-users-pagination__label">
              Page {page} of {totalPages}
            </span>
            <div className="admin-ops-users-pagination__controls">
              {/* BUG-057 (run25): icon-only pager buttons need accessible names. */}
              <Button
                ref={prevPageRef}
                variant="outline"
                size="sm"
                onClick={() => {
                  if (page - 1 <= 1) pagerRefocusRef.current = "next";
                  setPage(Math.max(1, page - 1));
                }}
                disabled={page <= 1}
                aria-label="Previous page"
                data-testid="button-users-prev-page"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                ref={nextPageRef}
                variant="outline"
                size="sm"
                onClick={() => {
                  if (page + 1 >= totalPages) pagerRefocusRef.current = "prev";
                  setPage(Math.min(totalPages, page + 1));
                }}
                disabled={page >= totalPages}
                aria-label="Next page"
                data-testid="button-users-next-page"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        )}

        {/* Run16 BUG-037: explicit confirmation before applying a role change. */}
        <AlertDialog open={!!pendingRoleChange} onOpenChange={(open) => { if (!open) setPendingRoleChange(null); }}>
          {/* The refocus effect has already put focus on the row's Edit; the
              dialog's own return target (the unmounted role menu) would drop it
              to <body>. */}
          <AlertDialogContent onCloseAutoFocus={(e) => e.preventDefault()}>
            <AlertDialogHeader>
              <AlertDialogTitle>Change user role?</AlertDialogTitle>
              <AlertDialogDescription>
                This will change{" "}
                <span className="font-medium text-foreground">
                  {pendingRoleChange?.user.email
                    ? maskEmail(pendingRoleChange.user.email)
                    : pendingRoleChange?.user.id}
                </span>{" "}
                from <span className="font-medium text-foreground">{pendingRoleChange?.user.role || "user"}</span>{" "}
                to <span className="font-medium text-foreground">{pendingRoleChange?.role}</span>.
                {pendingRoleChange?.role === "admin" && " Admins have full access to this panel, including user management."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-role-change">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (pendingRoleChange) {
                    updateRoleMutation.mutate({ userId: pendingRoleChange.user.id, role: pendingRoleChange.role });
                  }
                  setPendingRoleChange(null);
                }}
                disabled={updateRoleMutation.isPending}
                data-testid="button-confirm-role-change"
              >
                Change Role
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={!!userToDelete} onOpenChange={(open) => { if (!open) setUserToDelete(null); }}>
          <AlertDialogContent
            onCloseAutoFocus={(event) => {
              if (!deletedUserRef.current) return;
              deletedUserRef.current = false;
              event.preventDefault();
              searchInputRef.current?.focus();
            }}
          >
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this user?</AlertDialogTitle>
              <AlertDialogDescription>
                {/* BUG-046 (run25): don't undo the R2-H05 mask here — the
                    confirmation shows the masked email unless the operator
                    already revealed that row in the table. */}
                This permanently deletes{" "}
                <span className="font-medium text-foreground">
                  {userToDelete?.email
                    ? (revealedIds.has(userToDelete.id) ? userToDelete.email : maskEmail(userToDelete.email))
                    : userToDelete?.id}
                </span>{" "}
                along with their sign-in identity, bookmarks, favorites, progress,
                and API keys. They are signed out everywhere and the account
                cannot be re-created from an old session. Any resources they
                submitted stay in the catalog (attribution is removed). This
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => userToDelete && deleteUserMutation.mutate(userToDelete.id)}
                disabled={deleteUserMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid="button-confirm-delete-user"
              >
                {deleteUserMutation.isPending ? "Deleting…" : "Delete User"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </TableShell>
  );
}
