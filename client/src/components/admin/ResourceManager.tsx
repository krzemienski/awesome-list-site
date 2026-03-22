import { useState, useMemo } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
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

const STATUS_OPTIONS = [
  { value: "approved", label: "Approved", color: "bg-green-500" },
  { value: "pending", label: "Pending", color: "bg-yellow-500" },
  { value: "rejected", label: "Rejected", color: "bg-red-500" }
];

export default function ResourceManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
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
    queryKey: ['/api/admin/resources', page, limit, search, categoryFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', limit.toString());
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
    setCreateDialogOpen(true);
  };

  const openDeleteDialog = (resource: Resource) => {
    setSelectedResource(resource);
    setDeleteDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!selectedResource) return;
    updateMutation.mutate({
      id: selectedResource.id,
      data: editForm
    });
  };

  const handleCreate = () => {
    if (!editForm.title || !editForm.url) {
      toast({
        title: "Validation Error",
        description: "Title and URL are required",
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
      <Badge className={`${statusInfo?.color || 'bg-gray-500'} text-white`}>
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
      <Card className="border-primary/20 bg-card">
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
      <Card className="border-primary/20 bg-card">
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
              className="bg-primary hover:bg-primary/90"
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
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by title or URL..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-gray-900 border-gray-700"
                data-testid="input-search-resources"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48 bg-gray-900 border-gray-700" data-testid="select-category-filter">
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-36 bg-gray-900 border-gray-700" data-testid="select-status-filter">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {STATUS_OPTIONS.map(status => (
                  <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" variant="outline" data-testid="button-search">
              <Search className="h-4 w-4" />
            </Button>
            {(search || categoryFilter || statusFilter) && (
              <Button type="button" variant="ghost" onClick={clearFilters} data-testid="button-clear-filters">
                <X className="h-4 w-4" />
              </Button>
            )}
          </form>

          {selectedResourceIds.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-gray-800 border border-primary/30 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-300">
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
                className="text-gray-400 hover:text-white"
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

          <ScrollArea className="h-[600px]">
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
                    <TableCell className="font-mono text-xs text-gray-400">
                      {resource.id}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium truncate max-w-[300px]" title={resource.title || ''}>
                          {resource.title || 'Untitled'}
                        </div>
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1 truncate max-w-[300px]"
                        >
                          {resource.url}
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        </a>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="text-sm text-gray-400">
                        {resource.category || "Uncategorized"}
                      </div>
                      {resource.subcategory && (
                        <div className="text-xs text-gray-500">{resource.subcategory}</div>
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
                          data-testid={`button-edit-${resource.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => openDeleteDialog(resource)}
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
          </ScrollArea>

          <div className="flex items-center justify-between pt-4 border-t border-gray-800">
            <div className="text-sm text-gray-400">
              Showing {((page - 1) * limit) + 1} - {Math.min(page * limit, data?.total || 0)} of {data?.total || 0} resources
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                data-testid="button-prev-page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-gray-400">
                Page {page} of {data?.totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(data?.totalPages || 1, p + 1))}
                disabled={page >= (data?.totalPages || 1)}
                data-testid="button-next-page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl bg-gray-900 border-gray-700">
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
                className="bg-gray-800 border-gray-600"
                data-testid="input-edit-title"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-url">URL *</Label>
              <Input
                id="edit-url"
                value={editForm.url}
                onChange={(e) => setEditForm(f => ({ ...f, url: e.target.value }))}
                className="bg-gray-800 border-gray-600"
                data-testid="input-edit-url"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))}
                className="bg-gray-800 border-gray-600"
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
                  <SelectTrigger className="bg-gray-800 border-gray-600" data-testid="select-edit-category">
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
                  <SelectTrigger className="bg-gray-800 border-gray-600" data-testid="select-edit-status">
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
                  <SelectTrigger className="bg-gray-800 border-gray-600" data-testid="select-edit-subcategory">
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
                  <SelectTrigger className="bg-gray-800 border-gray-600" data-testid="select-edit-subsubcategory">
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
              className="bg-primary hover:bg-primary/90"
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
        <DialogContent className="max-w-2xl bg-gray-900 border-gray-700">
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
                className="bg-gray-800 border-gray-600"
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
                className="bg-gray-800 border-gray-600"
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
                className="bg-gray-800 border-gray-600"
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
                  <SelectTrigger className="bg-gray-800 border-gray-600" data-testid="select-create-category">
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
                  <SelectTrigger className="bg-gray-800 border-gray-600" data-testid="select-create-status">
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
                  <SelectTrigger className="bg-gray-800 border-gray-600" data-testid="select-create-subcategory">
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
                  <SelectTrigger className="bg-gray-800 border-gray-600" data-testid="select-create-subsubcategory">
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
              className="bg-primary hover:bg-primary/90"
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
        <AlertDialogContent className="bg-gray-900 border-gray-700">
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
