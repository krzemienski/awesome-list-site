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
import { Users, ChevronLeft, ChevronRight, Shield, User as UserIcon, Trash2, Search, Eye, EyeOff, Download } from "lucide-react";
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
  // R2-M17: server-side user search (email / first / last name).
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  // R2-H05: ids whose emails are currently revealed.
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const limit = 20;

  // Debounce the search box → query param, resetting to page 1 on change.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading } = useQuery<UsersResponse>({
    queryKey: ['/api/admin/users', page, limit, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
      if (searchQuery) params.set('q', searchQuery);
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.users && data.users.length > 0 ? (
              data.users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
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
                      <span className="font-medium">
                        {user.firstName || user.lastName
                          ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                          : user.email || user.id.slice(0, 8)}
                      </span>
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
                      <Select
                        value={user.role || 'user'}
                        onValueChange={(role) => updateRoleMutation.mutate({ userId: user.id, role })}
                      >
                        <SelectTrigger className="w-32 h-8 text-xs" aria-label="Change user role">
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
                          aria-label={`Delete user ${user.email || user.id}`}
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
