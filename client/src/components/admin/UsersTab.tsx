import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, ChevronLeft, ChevronRight, Shield, User as UserIcon, Trash2, Search, Eye, EyeOff, Download, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import type { User } from "@shared/schema";

/**
 * R2-H05: mask emails by default so an over-the-shoulder look at the admin
 * panel doesn't leak the full user list. Per-row reveal toggle below.
 * "someone@example.com" -> "s•••@example.com"
 */
function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return email;
  return `${email[0]}•••${email.slice(at)}`;
}

interface UsersResponse {
  users: User[];
  total: number;
}

/* WP-6 a11y: black ink on mid-tone badges — white was 3.7–2.2:1 (fails AA). */
const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-500 text-black",
  moderator: "bg-yellow-500 text-black",
  user: "bg-blue-500 text-black",
};

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
  const [searchQuery, setSearchQuery] = useState("");
  // R2-H05: ids whose emails are currently revealed.
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
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

  const { data, isLoading } = useQuery<UsersResponse>({
    queryKey: ['/api/admin/users', page, limit, searchQuery, sortBy, sortDir],
    queryFn: async () => {
      const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
      if (searchQuery) params.set('q', searchQuery);
      params.set('sortBy', sortBy);
      params.set('sortDir', sortDir);
      const response = await fetch(`/api/admin/users?${params}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch users');
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
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: "Role Updated", description: "User role has been changed." });
    },
    onError: (error: Error) => {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    },
  });

  // NEW-004: admin user deletion (QA/test account cleanup). The server blocks
  // self-deletion, detaches the user's catalog resources instead of deleting
  // them, and cascades personal data away.
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest(`/api/admin/users/${userId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: "User Deleted", description: "The user account has been removed." });
      setUserToDelete(null);
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
      <Card>
        <CardHeader><Skeleton className="h-8 w-64" /></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          User Management
        </CardTitle>
        <CardDescription>
          {data?.total || 0} {searchQuery ? 'matching' : 'registered'} user{(data?.total || 0) !== 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by email or name…"
              className="pl-8"
              data-testid="input-user-search"
            />
          </div>
          <Button variant="outline" size="sm" className="sm:ml-auto" asChild data-testid="button-export-users">
            <a href="/api/admin/users/export" download>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </a>
          </Button>
        </div>
        {/* Run16 BUG-088: on narrow screens the table scrolls sideways — a
            right-edge fade + explicit hint make the hidden columns
            discoverable instead of silently clipping them. */}
        <div className="relative">
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-card to-transparent sm:hidden"
            aria-hidden="true"
          />
          <Table>
          <TableHeader>
            <TableRow>
              {/* Run16 BUG-087: sortable column headers (server-side sort). */}
              {([
                { key: "name", label: "User" },
                { key: "email", label: "Email" },
                { key: "role", label: "Role" },
                { key: "createdAt", label: "Joined" },
              ] as const).map(col => (
                <TableHead key={col.key}>
                  <button
                    type="button"
                    onClick={() => toggleSort(col.key)}
                    className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                    aria-label={`Sort by ${col.label}`}
                    data-testid={`button-sort-${col.key}`}
                  >
                    {col.label}
                    {sortBy === col.key
                      ? (sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />)
                      : <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />}
                  </button>
                </TableHead>
              ))}
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.users && data.users.length > 0 ? (
              data.users.map((user) => (
                <TableRow key={user.id}>
                  {/* BUG-012 (run18): cap the name cell + truncate so a legal
                      101-char display name can't stretch the table (it was
                      unwrapping to ~2,369px); full value stays in the title. */}
                  <TableCell className="max-w-[240px]">
                    <div className="flex items-center gap-2 min-w-0">
                      {user.profileImageUrl ? (
                        <img
                          src={user.profileImageUrl}
                          alt=""
                          className="h-8 w-8 object-cover"
                        />
                      ) : (
                        <div className="h-8 w-8 bg-muted flex items-center justify-center">
                          <UserIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      {/* Run16 BUG-087: nameless accounts no longer duplicate the
                          (masked) email from the adjacent column — show a muted
                          em-dash instead. (Replaces the R4-H05 email fallback.) */}
                      {user.firstName || user.lastName ? (
                        <span
                          className="font-medium truncate"
                          title={`${user.firstName || ''} ${user.lastName || ''}`.trim()}
                          data-testid={`text-name-${user.id}`}
                        >
                          {`${user.firstName || ''} ${user.lastName || ''}`.trim()}
                        </span>
                      ) : (
                        <span className="text-muted-foreground" data-testid={`text-name-${user.id}`}>—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {user.email ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span data-testid={`text-email-${user.id}`}>
                          {revealedIds.has(user.id) ? user.email : maskEmail(user.email)}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleReveal(user.id)}
                          className="text-muted-foreground/70 hover:text-foreground transition-colors"
                          aria-label={revealedIds.has(user.id) ? "Hide email" : "Reveal email"}
                          data-testid={`button-toggle-email-${user.id}`}
                        >
                          {revealedIds.has(user.id) ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </span>
                    ) : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge className={`${ROLE_COLORS[user.role || 'user'] || 'bg-gray-600 text-white'}`}>
                      <Shield className="h-3 w-3 mr-1" />
                      {user.role || 'user'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(user.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {/* Run16 BUG-014: an admin must not be able to demote
                          themselves with one click — the delete button already
                          hides on the own row, so the role select is disabled
                          there too (matching the server-side self-demote guard). */}
                      <Select
                        value={user.role || 'user'}
                        /* Run16 BUG-037: stage the change and confirm first. */
                        onValueChange={(role) => {
                          if (role !== (user.role || 'user')) setPendingRoleChange({ user, role });
                        }}
                        disabled={user.id === currentUser?.id}
                      >
                        <SelectTrigger
                          className="w-32 h-8 text-xs"
                          aria-label={
                            user.id === currentUser?.id
                              ? "You cannot change your own role"
                              : "Change user role"
                          }
                          title={
                            user.id === currentUser?.id
                              ? "You cannot change your own role"
                              : undefined
                          }
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="moderator">Moderator</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      {user.id !== currentUser?.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => setUserToDelete(user)}
                          aria-label={`Delete user ${
                            /* R4-H05: keep the raw email out of the DOM unless revealed. */
                            user.email
                              ? (revealedIds.has(user.id) ? user.email : maskEmail(user.email))
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
        <p className="text-xs text-muted-foreground mt-2 sm:hidden">
          Swipe the table sideways to see role, join date, and actions.
        </p>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Run16 BUG-037: explicit confirmation before applying a role change. */}
        <AlertDialog open={!!pendingRoleChange} onOpenChange={(open) => { if (!open) setPendingRoleChange(null); }}>
          <AlertDialogContent>
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
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this user?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently deletes{" "}
                <span className="font-medium text-foreground">
                  {userToDelete?.email || userToDelete?.id}
                </span>{" "}
                along with their bookmarks, favorites, progress, and API keys.
                Any resources they submitted stay in the catalog (attribution is
                removed). This cannot be undone.
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
      </CardContent>
    </Card>
  );
}
