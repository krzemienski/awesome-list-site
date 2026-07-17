import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Database,
  Filter,
  X,
  Save,
  CheckCircle2
} from "lucide-react";
import type { Resource, Category, Subcategory, SubSubcategory } from "@shared/schema";

interface ResourcesResponse {
  resources: Resource[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/* WP-6 a11y: black ink on mid-tone badges — white on -500 tones is 2.3–3.8:1 (fails AA). */
const STATUS_OPTIONS = [
  { value: "approved", label: "Approved", color: "bg-green-500 text-black" },
  { value: "pending", label: "Pending", color: "bg-yellow-500 text-black" },
  { value: "rejected", label: "Rejected", color: "bg-red-500 text-black" }
];

export default function ResourceManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [page, setPage] = useState(1);
  // Run16 BUG-035: page size + sort are now user-selectable.
  const [limit, setLimit] = useState(25);
  const [sort, setSort] = useState<"newest" | "oldest" | "name-asc" | "name-desc">("newest");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [selectedResourceIds, setSelectedResourceIds] = useState<number[]>([]);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  // R2-H04 companion: bulk hard-delete needs an explicit confirmation dialog.
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  const [editForm, setEditForm] = useState({
    title: "",
    url: "",
    description: "",
    category: "",
    subcategory: "",
    subSubcategory: "",
    status: "approved"
  });

  const { data: categoriesData } = useQuery<Category[]>({
    queryKey: ['/api/categories']
  });

  const { data: subcategoriesData } = useQuery<Subcategory[]>({
    queryKey: ['/api/subcategories']
  });

  const { data: subSubcategoriesData } = useQuery<SubSubcategory[]>({
    queryKey: ['/api/sub-subcategories']
  });

  const categoryNames = useMemo(() => {
    return categoriesData?.map(c => c.name) || [];
  }, [categoriesData]);

  const filteredSubcategories = useMemo(() => {
    if (!editForm.category || !subcategoriesData || !categoriesData) return [];
    const selectedCat = categoriesData.find(c => c.name === editForm.category);
    if (!selectedCat) return [];
    return subcategoriesData.filter(s => s.categoryId === selectedCat.id);
  }, [editForm.category, subcategoriesData, categoriesData]);

  const filteredSubSubcategories = useMemo(() => {
    if (!editForm.subcategory || !subSubcategoriesData || !subcategoriesData) return [];
    const selectedSub = subcategoriesData.find(s => s.name === editForm.subcategory);
    if (!selectedSub) return [];
    return subSubcategoriesData.filter(ss => ss.subcategoryId === selectedSub.id);
  }, [editForm.subcategory, subSubcategoriesData, subcategoriesData]);

  const buildQueryKey = () => {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('limit', limit.toString());
    if (search) params.set('search', search);
    if (categoryFilter) params.set('category', categoryFilter);
    if (statusFilter) params.set('status', statusFilter);
    return `/api/admin/resources?${params.toString()}`;
  };

  const { data, isLoading } = useQuery<ResourcesResponse>({
    queryKey: ['/api/admin/resources', page, limit, search, categoryFilter, statusFilter, sort],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', limit.toString());
      if (sort !== 'newest') params.set('sort', sort);
      if (search) params.set('search', search);
      if (categoryFilter) params.set('category', categoryFilter);
      if (statusFilter) params.set('status', statusFilter);
      const response = await fetch(`/api/admin/resources?${params.toString()}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch resources');
      return response.json();
    },
    refetchInterval: 30000
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<Resource> }) => {
      return await apiRequest(`/api/admin/resources/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/resources'] });
      queryClient.invalidateQueries({ queryKey: ['/api/resources'] });
      queryClient.invalidateQueries({ queryKey: ['/api/awesome-list'] });
      setEditDialogOpen(false);
      setSelectedResource(null);
      toast({
        title: "Resource Updated",
        description: "The resource has been successfully updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update resource",
        variant: "destructive"
      });
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Resource>) => {
      return await apiRequest('/api/admin/resources', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/resources'] });
      queryClient.invalidateQueries({ queryKey: ['/api/resources'] });
      queryClient.invalidateQueries({ queryKey: ['/api/awesome-list'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      setCreateDialogOpen(false);
      resetEditForm();
      toast({
        title: "Resource Created",
        description: "The new resource has been added successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create resource",
        variant: "destructive"
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/admin/resources/${id}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/resources'] });
      queryClient.invalidateQueries({ queryKey: ['/api/resources'] });
      queryClient.invalidateQueries({ queryKey: ['/api/awesome-list'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      setDeleteDialogOpen(false);
      setSelectedResource(null);
      toast({
        title: "Resource Deleted",
        description: "The resource has been permanently deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Deletion Failed",
        description: error.message || "Failed to delete resource",
        variant: "destructive"
      });
    }
  });

  const bulkApproveMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      return await apiRequest('/api/admin/resources/bulk/approve', {
        method: 'POST',
        body: JSON.stringify({ ids })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/resources'] });
      queryClient.invalidateQueries({ queryKey: ['/api/resources'] });
      queryClient.invalidateQueries({ queryKey: ['/api/awesome-list'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      setSelectedResourceIds([]);
      toast({
        title: "Resources Approved",
        description: `Successfully approved ${selectedResourceIds.length} resource(s).`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Bulk Approve Failed",
        description: error.message || "Failed to approve resources",
        variant: "destructive"
      });
    }
  });

  const bulkRejectMutation = useMutation({
    mutationFn: async ({ ids, reason }: { ids: number[], reason: string }) => {
      return await apiRequest('/api/admin/resources/bulk/reject', {
        method: 'POST',
        body: JSON.stringify({ ids, reason })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/resources'] });
      queryClient.invalidateQueries({ queryKey: ['/api/resources'] });
      queryClient.invalidateQueries({ queryKey: ['/api/awesome-list'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      setSelectedResourceIds([]);
      setRejectDialogOpen(false);
      toast({
        title: "Resources Rejected",
        description: `Successfully rejected ${selectedResourceIds.length} resource(s).`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Bulk Reject Failed",
        description: error.message || "Failed to reject resources",
        variant: "destructive"
      });
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      return await apiRequest('/api/admin/resources/bulk/delete', {
        method: 'POST',
        body: JSON.stringify({ ids })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/resources'] });
      queryClient.invalidateQueries({ queryKey: ['/api/resources'] });
      queryClient.invalidateQueries({ queryKey: ['/api/awesome-list'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      setSelectedResourceIds([]);
      toast({
        title: "Resources Deleted",
        description: `Successfully deleted ${selectedResourceIds.length} resource(s).`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Bulk Delete Failed",
        description: error.message || "Failed to delete resources",
        variant: "destructive"
      });
    }
  });

  const resetEditForm = () => {
    setEditForm({
      title: "",
      url: "",
      description: "",
      category: "",
      subcategory: "",
      subSubcategory: "",
      status: "approved"
    });
  };

  const openEditDialog = (resource: Resource) => {
    setSelectedResource(resource);
    setEditForm({
      title: resource.title || "",
      url: resource.url || "",
      description: resource.description || "",
      category: resource.category || "",
      subcategory: resource.subcategory || "",
      subSubcategory: resource.subSubcategory || "",
      status: resource.status || "approved"
    });
    setEditDialogOpen(true);
  };

  const openCreateDialog = () => {
    resetEditForm();
    // Run16 BUG-031: new resources follow the approval workflow by default —
    // the admin can still explicitly pick "approved" in the dialog.
    setEditForm(prev => ({ ...prev, status: "pending" }));
    setCreateDialogOpen(true);
  };

  // NEW-013: /admin/resources?resourceId=N (ResourceDetail's "Edit in Admin"
  // deep-link) opens that resource's edit dialog directly instead of dumping
  // the admin on an unfiltered table. The param is stripped afterwards so a
  // refresh or tab switch doesn't reopen the dialog.
  const deepLinkHandled = useRef(false);
  useEffect(() => {
    if (deepLinkHandled.current) return;
    deepLinkHandled.current = true;
    const params = new URLSearchParams(window.location.search);
    // Run16 BUG-029: ?status=rejected|pending|approved pre-filters the table
    // (used by the dashboard's "N rejected" stat sublabel deep-link). The
    // param is stripped so refreshes don't re-apply a stale filter.
    const statusParam = params.get("status");
    if (statusParam && STATUS_OPTIONS.some(s => s.value === statusParam)) {
      setStatusFilter(statusParam);
      const url = new URL(window.location.href);
      url.searchParams.delete("status");
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    }
    const rid = parseInt(params.get("resourceId") || "", 10);
    if (!rid || Number.isNaN(rid)) return;
    const stripParam = () => {
      const url = new URL(window.location.href);
      url.searchParams.delete("resourceId");
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    };
    fetch(`/api/resources/${rid}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((resource: Resource) => openEditDialog(resource))
      .catch(() => {
        toast({
          title: "Resource not found",
          description: `Resource #${rid} could not be loaded for editing.`,
          variant: "destructive",
        });
      })
      .finally(stripParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openDeleteDialog = (resource: Resource) => {
    setSelectedResource(resource);
    setDeleteDialogOpen(true);
  };

  // Run16 BUG-012: the Edit dialog used to submit with no client-side checks
  // (blank title/URL only failed server-side with a raw error). Both dialogs
  // now share the same validation, mirroring the server's http(s) URL rule.
  const validateEditForm = (): boolean => {
    if (!editForm.title.trim() || !editForm.url.trim()) {
      toast({
        title: "Validation Error",
        description: "Title and URL are required",
        variant: "destructive"
      });
      return false;
    }
    if (!/^https?:\/\//i.test(editForm.url.trim())) {
      toast({
        title: "Validation Error",
        description: "URL must start with http:// or https://",
        variant: "destructive"
      });
      return false;
    }
    return true;
  };

  const handleSaveEdit = () => {
    if (!selectedResource) return;
    if (!validateEditForm()) return;
    updateMutation.mutate({
      id: selectedResource.id,
      data: editForm
    });
  };

  const handleCreate = () => {
    if (!validateEditForm()) return;
    // Run16 BUG-031: require a category on create so new resources never
    // land in the catalog as "Uncategorized".
    if (!editForm.category) {
      toast({
        title: "Validation Error",
        description: "Please select a category for the new resource",
        variant: "destructive"
      });
      return;
    }
    createMutation.mutate(editForm);
  };

  const handleDelete = () => {
    if (!selectedResource) return;
    deleteMutation.mutate(selectedResource.id);
  };

  const handleBulkApprove = () => {
    if (selectedResourceIds.length === 0) return;
    bulkApproveMutation.mutate(selectedResourceIds);
  };

  const handleBulkReject = () => {
    if (selectedResourceIds.length === 0) return;
    setRejectReason("");
    setRejectDialogOpen(true);
  };

  const confirmBulkReject = () => {
    if (rejectReason.trim().length < 10) {
      toast({
        title: "Validation Error",
        description: "Rejection reason must be at least 10 characters",
        variant: "destructive"
      });
      return;
    }
    bulkRejectMutation.mutate({ ids: selectedResourceIds, reason: rejectReason });
  };

  const handleBulkDelete = () => {
    if (selectedResourceIds.length === 0) return;
    setBulkDeleteDialogOpen(true);
  };

  const confirmBulkDelete = () => {
    setBulkDeleteDialogOpen(false);
    bulkDeleteMutation.mutate(selectedResourceIds);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSelectedResourceIds([]);
  };

  const clearFilters = () => {
    setSearch("");
    setCategoryFilter("");
    setStatusFilter("");
    setPage(1);
    setSelectedResourceIds([]);
  };

  const getStatusBadge = (status: string) => {
    const statusInfo = STATUS_OPTIONS.find(s => s.value === status);
    return (
      <Badge className={`${statusInfo?.color || 'bg-[var(--surface-3)] text-white'}`}>
        {statusInfo?.label || status}
      </Badge>
    );
  };

  const toggleResourceSelection = (id: number) => {
    if (selectedResourceIds.includes(id)) {
      setSelectedResourceIds(selectedResourceIds.filter(resId => resId !== id));
    } else {
      setSelectedResourceIds([...selectedResourceIds, id]);
    }
  };

  const toggleSelectAll = () => {
    if (!data?.resources) return;
    const currentPageIds = data.resources.map(r => r.id);
    const allSelected = currentPageIds.every(id => selectedResourceIds.includes(id));

    if (allSelected) {
      setSelectedResourceIds(selectedResourceIds.filter(id => !currentPageIds.includes(id)));
    } else {
      const newIds = [...selectedResourceIds];
      currentPageIds.forEach(id => {
        if (!newIds.includes(id)) {
          newIds.push(id);
        }
      });
      setSelectedResourceIds(newIds);
    }
  };

  const isAllSelected = useMemo(() => {
    if (!data?.resources || data.resources.length === 0) return false;
    return data.resources.every(r => selectedResourceIds.includes(r.id));
  }, [data?.resources, selectedResourceIds]);

  const isSomeSelected = useMemo(() => {
    if (!data?.resources || data.resources.length === 0) return false;
    return data.resources.some(r => selectedResourceIds.includes(r.id)) && !isAllSelected;
  }, [data?.resources, selectedResourceIds, isAllSelected]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Resource Database Editor
              </CardTitle>
              <CardDescription>
                Manage all {data?.total || 0} resources in the database
              </CardDescription>
            </div>
            <Button 
              onClick={openCreateDialog}
             
              data-testid="button-add-resource"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Resource
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--text-2)]" />
              <Input
                placeholder="Search by title or URL..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                data-testid="input-search-resources"
              />
            </div>
            {/* Run16 BUG-009: the "All ..." items carry value="all" (Radix forbids
                value=""), but the API treats a literal status/category of "all"
                as a real filter value and matches nothing. Map "all" back to ""
                (= param omitted) so resetting a filter actually resets it. */}
            <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-full sm:w-48" aria-label="Filter by category" data-testid="select-category-filter">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categoryNames.map((cat: string) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-full sm:w-36" aria-label="Filter by status" data-testid="select-status-filter">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {STATUS_OPTIONS.map(status => (
                  <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Run16 BUG-035: user-selectable sort order (server-side, whitelisted). */}
            <Select value={sort} onValueChange={(v) => { setSort(v as typeof sort); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-40" aria-label="Sort resources" data-testid="select-sort">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
                <SelectItem value="name-asc">Title A–Z</SelectItem>
                <SelectItem value="name-desc">Title Z–A</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" variant="outline" aria-label="Search" data-testid="button-search">
              <Search className="h-4 w-4" />
            </Button>
            {(search || categoryFilter || statusFilter) && (
              <Button type="button" variant="ghost" onClick={clearFilters} aria-label="Clear filters" data-testid="button-clear-filters">
                <X className="h-4 w-4" />
              </Button>
            )}
          </form>

          {selectedResourceIds.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-[var(--surface-2)] border border-[var(--accent)]/30 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-[var(--text)]">
                  {selectedResourceIds.length} {selectedResourceIds.length === 1 ? 'item' : 'items'} selected
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-green-500/10 hover:bg-green-500/20 border-green-500/30 text-green-400"
                    onClick={handleBulkApprove}
                    disabled={bulkApproveMutation.isPending}
                    data-testid="button-bulk-approve"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    {bulkApproveMutation.isPending ? "Approving..." : "Approve"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-yellow-500/10 hover:bg-yellow-500/20 border-yellow-500/30 text-yellow-400"
                    onClick={handleBulkReject}
                    disabled={bulkRejectMutation.isPending}
                    data-testid="button-bulk-reject"
                  >
                    <X className="h-4 w-4 mr-1" />
                    {bulkRejectMutation.isPending ? "Rejecting..." : "Reject"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-red-500/10 hover:bg-red-500/20 border-red-500/30 text-red-400"
                    onClick={handleBulkDelete}
                    disabled={bulkDeleteMutation.isPending}
                    data-testid="button-bulk-delete"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    {bulkDeleteMutation.isPending ? "Deleting..." : "Delete"}
                  </Button>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedResourceIds([])}
                className="text-[var(--text-2)] hover:text-[var(--text)]"
                data-testid="button-clear-selection"
              >
                Clear Selection
              </Button>
            </div>
          )}

          {/* Bulk Reject Reason Dialog */}
          <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reject Selected Resources</DialogTitle>
                <DialogDescription>
                  You are about to reject {selectedResourceIds.length} resource(s).
                  Please provide a reason (minimum 10 characters).
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="reject-reason">Rejection Reason</Label>
                  <Textarea
                    id="reject-reason"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Explain why these resources are being rejected..."
                    rows={4}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    {rejectReason.length}/10 characters minimum
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={confirmBulkReject}
                  disabled={rejectReason.trim().length < 10}
                  className="bg-yellow-600 hover:bg-yellow-700"
                >
                  Confirm Rejection
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Bulk Delete Confirmation */}
          <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
            <AlertDialogContent data-testid="dialog-bulk-delete">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {selectedResourceIds.length} resource{selectedResourceIds.length === 1 ? '' : 's'}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently deletes the selected resource{selectedResourceIds.length === 1 ? '' : 's'} from
                  the catalog, including any bookmarks, favorites, and journey references
                  pointing at {selectedResourceIds.length === 1 ? 'it' : 'them'}. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-testid="button-bulk-delete-cancel">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={confirmBulkDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  data-testid="button-bulk-delete-confirm"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Run16 BUG-011: Radix ScrollArea's viewport renders content at
              display:table/min-width:100%, so the table's own overflow-auto
              wrapper grows to full table width and never scrolls horizontally —
              Actions were physically unreachable at 375/768px. A native
              overflow-auto div scrolls BOTH axes. */}
          <div className="h-[600px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all resources on this page"
                      className={isSomeSelected ? "data-[state=checked]:bg-primary/50" : ""}
                    />
                  </TableHead>
                  <TableHead className="w-12">ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="hidden md:table-cell">Category</TableHead>
                  <TableHead className="hidden lg:table-cell">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Run16 BUG-080: explicit empty state instead of a blank table. */}
                {!isLoading && (data?.resources.length || 0) === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-sm text-[var(--text-2)]" data-testid="row-empty-state">
                      {(search || categoryFilter || statusFilter)
                        ? <>No resources match the current search or filters.{' '}
                            <button type="button" className="text-primary underline" onClick={clearFilters} data-testid="button-empty-clear-filters">
                              Clear filters
                            </button></>
                        : "No resources yet."}
                    </TableCell>
                  </TableRow>
                )}
                {data?.resources.map((resource) => (
                  <TableRow
                    key={resource.id}
                    data-testid={`row-resource-${resource.id}`}
                    data-state={selectedResourceIds.includes(resource.id) ? "selected" : undefined}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedResourceIds.includes(resource.id)}
                        onCheckedChange={() => toggleResourceSelection(resource.id)}
                        aria-label={`Select resource ${resource.id}`}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs text-[var(--text-2)]">
                      {resource.id}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium truncate max-w-[300px]" title={resource.title || ''}>
                          {resource.title || 'Untitled'}
                        </div>
                        {/* Run16 BUG-036: only http(s) URLs get a live anchor —
                            legacy rows with other schemes render as plain text. */}
                        {/^https?:\/\//i.test(resource.url || '') ? (
                          <a
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-1 truncate max-w-[300px]"
                          >
                            {resource.url}
                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                          </a>
                        ) : (
                          <span className="text-xs text-[var(--text-2)] truncate max-w-[300px] block">
                            {resource.url}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="text-sm text-[var(--text-2)]">
                        {resource.category || "Uncategorized"}
                      </div>
                      {resource.subcategory && (
                        <div className="text-xs text-[var(--text-2)]">{resource.subcategory}</div>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {getStatusBadge(resource.status || 'approved')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(resource)}
                          aria-label="Edit resource"
                          data-testid={`button-edit-${resource.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => openDeleteDialog(resource)}
                          aria-label="Delete resource"
                          data-testid={`button-delete-${resource.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Run16 BUG-035: page-size selector + first/last jump buttons. */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[var(--border)]">
            <div className="flex items-center gap-3">
              <div className="text-sm text-[var(--text-2)]">
                {(data?.total || 0) === 0
                  ? "0 resources"
                  : `Showing ${((page - 1) * limit) + 1} - ${Math.min(page * limit, data?.total || 0)} of ${data?.total || 0} resources`}
              </div>
              <Select value={String(limit)} onValueChange={(v) => { setLimit(parseInt(v, 10)); setPage(1); }}>
                <SelectTrigger className="w-28 h-8" aria-label="Rows per page" data-testid="select-page-size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25 / page</SelectItem>
                  <SelectItem value="50">50 / page</SelectItem>
                  <SelectItem value="100">100 / page</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(1)}
                disabled={page <= 1}
                aria-label="First page"
                data-testid="button-first-page"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                aria-label="Previous page"
                data-testid="button-prev-page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-[var(--text-2)]">
                Page {page} of {data?.totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(data?.totalPages || 1, p + 1))}
                disabled={page >= (data?.totalPages || 1)}
                aria-label="Next page"
                data-testid="button-next-page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(data?.totalPages || 1)}
                disabled={page >= (data?.totalPages || 1)}
                aria-label="Last page"
                data-testid="button-last-page"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl bg-[var(--bg-2)] border-[var(--border)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Edit Resource #{selectedResource?.id}
            </DialogTitle>
            <DialogDescription>
              Make changes to the resource below. Click save when done.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                value={editForm.title}
                onChange={(e) => setEditForm(f => ({ ...f, title: e.target.value }))}
                className="bg-[var(--bg-2)] border-[var(--border)]"
                data-testid="input-edit-title"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-url">URL *</Label>
              <Input
                id="edit-url"
                value={editForm.url}
                onChange={(e) => setEditForm(f => ({ ...f, url: e.target.value }))}
                className="bg-[var(--bg-2)] border-[var(--border)]"
                data-testid="input-edit-url"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))}
                className="bg-[var(--bg-2)] border-[var(--border)]"
                rows={3}
                data-testid="input-edit-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-category">Category</Label>
                <Select 
                  value={editForm.category} 
                  onValueChange={(v) => setEditForm(f => ({ ...f, category: v, subcategory: "", subSubcategory: "" }))}
                >
                  <SelectTrigger className="bg-[var(--bg-2)] border-[var(--border)]" data-testid="select-edit-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryNames.map((cat: string) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select 
                  value={editForm.status} 
                  onValueChange={(v) => setEditForm(f => ({ ...f, status: v }))}
                >
                  <SelectTrigger className="bg-[var(--bg-2)] border-[var(--border)]" data-testid="select-edit-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(status => (
                      <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-subcategory">Subcategory</Label>
                <Select 
                  value={editForm.subcategory} 
                  onValueChange={(v) => setEditForm(f => ({ ...f, subcategory: v, subSubcategory: "" }))}
                  disabled={!editForm.category || filteredSubcategories.length === 0}
                >
                  <SelectTrigger className="bg-[var(--bg-2)] border-[var(--border)]" data-testid="select-edit-subcategory">
                    <SelectValue placeholder={filteredSubcategories.length ? "Select subcategory" : "Select category first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredSubcategories.map((sub: Subcategory) => (
                      <SelectItem key={sub.id} value={sub.name}>{sub.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-subsubcategory">Sub-subcategory</Label>
                <Select 
                  value={editForm.subSubcategory} 
                  onValueChange={(v) => setEditForm(f => ({ ...f, subSubcategory: v }))}
                  disabled={!editForm.subcategory || filteredSubSubcategories.length === 0}
                >
                  <SelectTrigger className="bg-[var(--bg-2)] border-[var(--border)]" data-testid="select-edit-subsubcategory">
                    <SelectValue placeholder={filteredSubSubcategories.length ? "Select sub-subcategory" : "Select subcategory first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredSubSubcategories.map((subSub: SubSubcategory) => (
                      <SelectItem key={subSub.id} value={subSub.name}>{subSub.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveEdit}
              disabled={updateMutation.isPending}
             
              data-testid="button-save-edit"
            >
              {updateMutation.isPending ? (
                <>Saving...</>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl bg-[var(--bg-2)] border-[var(--border)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add New Resource
            </DialogTitle>
            <DialogDescription>
              Create a new resource entry. Required fields are marked with *.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="create-title">Title *</Label>
              <Input
                id="create-title"
                value={editForm.title}
                onChange={(e) => setEditForm(f => ({ ...f, title: e.target.value }))}
                className="bg-[var(--bg-2)] border-[var(--border)]"
                placeholder="e.g., Video.js Player"
                data-testid="input-create-title"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-url">URL *</Label>
              <Input
                id="create-url"
                value={editForm.url}
                onChange={(e) => setEditForm(f => ({ ...f, url: e.target.value }))}
                className="bg-[var(--bg-2)] border-[var(--border)]"
                placeholder="https://github.com/..."
                data-testid="input-create-url"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-description">Description</Label>
              <Textarea
                id="create-description"
                value={editForm.description}
                onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))}
                className="bg-[var(--bg-2)] border-[var(--border)]"
                rows={3}
                placeholder="Brief description of the resource..."
                data-testid="input-create-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="create-category">Category</Label>
                <Select 
                  value={editForm.category} 
                  onValueChange={(v) => setEditForm(f => ({ ...f, category: v, subcategory: "", subSubcategory: "" }))}
                >
                  <SelectTrigger className="bg-[var(--bg-2)] border-[var(--border)]" data-testid="select-create-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryNames.map((cat: string) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="create-status">Status</Label>
                <Select 
                  value={editForm.status} 
                  onValueChange={(v) => setEditForm(f => ({ ...f, status: v }))}
                >
                  <SelectTrigger className="bg-[var(--bg-2)] border-[var(--border)]" data-testid="select-create-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(status => (
                      <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="create-subcategory">Subcategory</Label>
                <Select 
                  value={editForm.subcategory} 
                  onValueChange={(v) => setEditForm(f => ({ ...f, subcategory: v, subSubcategory: "" }))}
                  disabled={!editForm.category || filteredSubcategories.length === 0}
                >
                  <SelectTrigger className="bg-[var(--bg-2)] border-[var(--border)]" data-testid="select-create-subcategory">
                    <SelectValue placeholder={filteredSubcategories.length ? "Select subcategory" : "Select category first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredSubcategories.map((sub: Subcategory) => (
                      <SelectItem key={sub.id} value={sub.name}>{sub.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="create-subsubcategory">Sub-subcategory</Label>
                <Select 
                  value={editForm.subSubcategory} 
                  onValueChange={(v) => setEditForm(f => ({ ...f, subSubcategory: v }))}
                  disabled={!editForm.subcategory || filteredSubSubcategories.length === 0}
                >
                  <SelectTrigger className="bg-[var(--bg-2)] border-[var(--border)]" data-testid="select-create-subsubcategory">
                    <SelectValue placeholder={filteredSubSubcategories.length ? "Select sub-subcategory" : "Select subcategory first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredSubSubcategories.map((subSub: SubSubcategory) => (
                      <SelectItem key={subSub.id} value={subSub.name}>{subSub.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreate}
              disabled={createMutation.isPending}
             
              data-testid="button-create-resource"
            >
              {createMutation.isPending ? (
                <>Creating...</>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Create Resource
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-[var(--bg-2)] border-[var(--border)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-400">Delete Resource</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong className="text-white">"{selectedResource?.title}"</strong>? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
