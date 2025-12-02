import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Database, Save, X, Layers3 } from "lucide-react";

interface CategoryWithCount {
  id: number;
  name: string;
  slug: string;
  resourceCount: number;
}

interface SubcategoryWithCount {
  id: number;
  name: string;
  slug: string;
  categoryId: number;
  resourceCount: number;
}

interface SubSubcategoryWithCount {
  id: number;
  name: string;
  slug: string;
  subcategoryId: number;
  resourceCount: number;
}

export default function SubSubcategoryManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSubSubcategory, setSelectedSubSubcategory] = useState<SubSubcategoryWithCount | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    categoryId: "",
    subcategoryId: ""
  });

  // Fetch categories for cascading selection
  const { data: categories } = useQuery<CategoryWithCount[]>({
    queryKey: ['/api/admin/categories'],
    queryFn: async () => {
      const response = await fetch('/api/admin/categories', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    }
  });

  // Fetch subcategories for cascading selection
  const { data: subcategories } = useQuery<SubcategoryWithCount[]>({
    queryKey: ['/api/admin/subcategories'],
    queryFn: async () => {
      const response = await fetch('/api/admin/subcategories', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch subcategories');
      return response.json();
    }
  });

  // Fetch sub-subcategories with resource counts
  const { data: subSubcategories, isLoading } = useQuery<SubSubcategoryWithCount[]>({
    queryKey: ['/api/admin/sub-subcategories'],
    queryFn: async () => {
      const response = await fetch('/api/admin/sub-subcategories', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch sub-subcategories');
      return response.json();
    }
  });

  // Filter subcategories based on selected category
  const filteredSubcategories = useMemo(() => {
    if (!formData.categoryId || !subcategories) return [];
    return subcategories.filter(s => s.categoryId === parseInt(formData.categoryId));
  }, [formData.categoryId, subcategories]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; slug: string; subcategoryId: number }) => {
      return await apiRequest('/api/admin/sub-subcategories', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sub-subcategories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sub-subcategories'] });
      toast({
        title: "Success",
        description: "Sub-subcategory created successfully"
      });
      setCreateDialogOpen(false);
      setFormData({ name: "", slug: "", categoryId: "", subcategoryId: "" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create sub-subcategory",
        variant: "destructive"
      });
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<{ name: string; slug: string; subcategoryId: number }> }) => {
      return await apiRequest(`/api/admin/sub-subcategories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sub-subcategories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sub-subcategories'] });
      toast({
        title: "Success",
        description: "Sub-subcategory updated successfully"
      });
      setEditDialogOpen(false);
      setSelectedSubSubcategory(null);
      setFormData({ name: "", slug: "", categoryId: "", subcategoryId: "" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update sub-subcategory",
        variant: "destructive"
      });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/admin/sub-subcategories/${id}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sub-subcategories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sub-subcategories'] });
      toast({
        title: "Success",
        description: "Sub-subcategory deleted successfully"
      });
      setDeleteDialogOpen(false);
      setSelectedSubSubcategory(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete sub-subcategory",
        variant: "destructive"
      });
      setDeleteDialogOpen(false);
    }
  });

  const handleCreate = () => {
    if (!formData.name.trim() || !formData.slug.trim() || !formData.subcategoryId) {
      toast({
        title: "Validation Error",
        description: "Name, slug, and parent subcategory are required",
        variant: "destructive"
      });
      return;
    }
    createMutation.mutate({
      name: formData.name,
      slug: formData.slug,
      subcategoryId: parseInt(formData.subcategoryId)
    });
  };

  const handleUpdate = () => {
    if (!selectedSubSubcategory) return;
    if (!formData.name.trim() || !formData.slug.trim() || !formData.subcategoryId) {
      toast({
        title: "Validation Error",
        description: "Name, slug, and parent subcategory are required",
        variant: "destructive"
      });
      return;
    }
    updateMutation.mutate({ 
      id: selectedSubSubcategory.id, 
      data: {
        name: formData.name,
        slug: formData.slug,
        subcategoryId: parseInt(formData.subcategoryId)
      }
    });
  };

  const handleDelete = () => {
    if (!selectedSubSubcategory) return;
    deleteMutation.mutate(selectedSubSubcategory.id);
  };

  const openCreateDialog = () => {
    setFormData({ name: "", slug: "", categoryId: "", subcategoryId: "" });
    setCreateDialogOpen(true);
  };

  const openEditDialog = (subSubcategory: SubSubcategoryWithCount) => {
    const subcategory = subcategories?.find(s => s.id === subSubcategory.subcategoryId);
    setSelectedSubSubcategory(subSubcategory);
    setFormData({ 
      name: subSubcategory.name, 
      slug: subSubcategory.slug,
      categoryId: subcategory?.categoryId?.toString() || "",
      subcategoryId: subSubcategory.subcategoryId.toString()
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (subSubcategory: SubSubcategoryWithCount) => {
    setSelectedSubSubcategory(subSubcategory);
    setDeleteDialogOpen(true);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleNameChange = (name: string) => {
    setFormData({ ...formData, name, slug: generateSlug(name) });
  };

  const getCategoryName = (subcategoryId: number) => {
    const subcategory = subcategories?.find(s => s.id === subcategoryId);
    const category = categories?.find(c => c.id === subcategory?.categoryId);
    return category?.name || 'Unknown';
  };

  const getSubcategoryName = (subcategoryId: number) => {
    return subcategories?.find(s => s.id === subcategoryId)?.name || 'Unknown';
  };

  return (
    <Card className="border-0" data-testid="subsubcategory-manager">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Layers3 className="h-5 w-5" />
              Sub-Subcategory Manager
            </CardTitle>
            <CardDescription>
              Manage level 3 sub-subcategories. Sub-subcategories with resources cannot be deleted.
            </CardDescription>
          </div>
          <Button 
            onClick={openCreateDialog}
            data-testid="button-create-subsubcategory"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Sub-Subcategory
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <Table data-testid="table-subsubcategories">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Parent Category</TableHead>
                <TableHead>Parent Subcategory</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead className="text-right">Resources</TableHead>
                <TableHead className="text-right w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subSubcategories?.map((subSubcategory) => (
                <TableRow key={subSubcategory.id} data-testid={`row-subsubcategory-${subSubcategory.id}`}>
                  <TableCell className="font-mono text-sm">{subSubcategory.id}</TableCell>
                  <TableCell className="font-medium" data-testid={`text-subsubcategory-name-${subSubcategory.id}`}>
                    {subSubcategory.name}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {getCategoryName(subSubcategory.subcategoryId)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {getSubcategoryName(subSubcategory.subcategoryId)}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {subSubcategory.slug}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge 
                      variant="secondary"
                      data-testid={`badge-count-${subSubcategory.id}`}
                    >
                      {subSubcategory.resourceCount}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(subSubcategory)}
                        data-testid={`button-edit-${subSubcategory.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteDialog(subSubcategory)}
                        disabled={subSubcategory.resourceCount > 0}
                        data-testid={`button-delete-${subSubcategory.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent data-testid="dialog-create-subsubcategory">
          <DialogHeader>
            <DialogTitle>Create Sub-Subcategory</DialogTitle>
            <DialogDescription>
              Add a new level 3 sub-subcategory under a parent subcategory.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="create-category">Parent Category *</Label>
              <Select
                value={formData.categoryId}
                onValueChange={(value) => setFormData({ ...formData, categoryId: value, subcategoryId: "" })}
              >
                <SelectTrigger id="create-category" data-testid="select-create-category">
                  <SelectValue placeholder="Select parent category" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-subcategory">Parent Subcategory *</Label>
              <Select
                value={formData.subcategoryId}
                onValueChange={(value) => setFormData({ ...formData, subcategoryId: value })}
                disabled={!formData.categoryId}
              >
                <SelectTrigger id="create-subcategory" data-testid="select-create-subcategory">
                  <SelectValue placeholder="Select parent subcategory" />
                </SelectTrigger>
                <SelectContent>
                  {filteredSubcategories.map((subcategory) => (
                    <SelectItem key={subcategory.id} value={subcategory.id.toString()}>
                      {subcategory.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-name">Name *</Label>
              <Input
                id="create-name"
                placeholder="e.g., HLS"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                data-testid="input-create-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-slug">Slug *</Label>
              <Input
                id="create-slug"
                placeholder="e.g., hls"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                data-testid="input-create-slug"
              />
              <p className="text-xs text-muted-foreground">
                Auto-generated from name. Edit if needed.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              data-testid="button-cancel-create"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              data-testid="button-confirm-create"
            >
              <Save className="h-4 w-4 mr-2" />
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent data-testid="dialog-edit-subsubcategory">
          <DialogHeader>
            <DialogTitle>Edit Sub-Subcategory</DialogTitle>
            <DialogDescription>
              Update the sub-subcategory name, slug, or parent subcategory.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-category">Parent Category *</Label>
              <Select
                value={formData.categoryId}
                onValueChange={(value) => setFormData({ ...formData, categoryId: value, subcategoryId: "" })}
              >
                <SelectTrigger id="edit-category" data-testid="select-edit-category">
                  <SelectValue placeholder="Select parent category" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-subcategory">Parent Subcategory *</Label>
              <Select
                value={formData.subcategoryId}
                onValueChange={(value) => setFormData({ ...formData, subcategoryId: value })}
                disabled={!formData.categoryId}
              >
                <SelectTrigger id="edit-subcategory" data-testid="select-edit-subcategory">
                  <SelectValue placeholder="Select parent subcategory" />
                </SelectTrigger>
                <SelectContent>
                  {filteredSubcategories.map((subcategory) => (
                    <SelectItem key={subcategory.id} value={subcategory.id.toString()}>
                      {subcategory.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                placeholder="e.g., HLS"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                data-testid="input-edit-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-slug">Slug *</Label>
              <Input
                id="edit-slug"
                placeholder="e.g., hls"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                data-testid="input-edit-slug"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              data-testid="button-cancel-edit"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={updateMutation.isPending}
              data-testid="button-confirm-edit"
            >
              <Save className="h-4 w-4 mr-2" />
              {updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-testid="dialog-delete-subsubcategory">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sub-Subcategory</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedSubSubcategory?.name}"?
              {selectedSubSubcategory && selectedSubSubcategory.resourceCount > 0 && (
                <span className="block mt-2 text-red-500 font-semibold">
                  This sub-subcategory has {selectedSubSubcategory.resourceCount} resources and cannot be deleted.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending || (selectedSubSubcategory?.resourceCount ?? 0) > 0}
              className="bg-destructive hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
