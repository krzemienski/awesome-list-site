import { useState } from "react";
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
import { Plus, Pencil, Trash2, Database, Save, X, Layers } from "lucide-react";

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

export default function SubcategoryManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSubcategory, setSelectedSubcategory] = useState<SubcategoryWithCount | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    categoryId: ""
  });

  // Fetch categories for parent selection
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

  // Fetch subcategories with resource counts
  const { data: subcategories, isLoading } = useQuery<SubcategoryWithCount[]>({
    queryKey: ['/api/admin/subcategories'],
    queryFn: async () => {
      const response = await fetch('/api/admin/subcategories', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch subcategories');
      return response.json();
    }
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; slug: string; categoryId: number }) => {
      return await apiRequest('/api/admin/subcategories', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/subcategories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/subcategories'] });
      toast({
        title: "Success",
        description: "Subcategory created successfully"
      });
      setCreateDialogOpen(false);
      setFormData({ name: "", slug: "", categoryId: "" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create subcategory",
        variant: "destructive"
      });
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<{ name: string; slug: string; categoryId: number }> }) => {
      return await apiRequest(`/api/admin/subcategories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/subcategories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/subcategories'] });
      toast({
        title: "Success",
        description: "Subcategory updated successfully"
      });
      setEditDialogOpen(false);
      setSelectedSubcategory(null);
      setFormData({ name: "", slug: "", categoryId: "" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update subcategory",
        variant: "destructive"
      });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/admin/subcategories/${id}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/subcategories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/subcategories'] });
      toast({
        title: "Success",
        description: "Subcategory deleted successfully"
      });
      setDeleteDialogOpen(false);
      setSelectedSubcategory(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete subcategory",
        variant: "destructive"
      });
      setDeleteDialogOpen(false);
    }
  });

  const handleCreate = () => {
    if (!formData.name.trim() || !formData.slug.trim() || !formData.categoryId) {
      toast({
        title: "Validation Error",
        description: "Name, slug, and parent category are required",
        variant: "destructive"
      });
      return;
    }
    createMutation.mutate({
      name: formData.name,
      slug: formData.slug,
      categoryId: parseInt(formData.categoryId)
    });
  };

  const handleUpdate = () => {
    if (!selectedSubcategory) return;
    if (!formData.name.trim() || !formData.slug.trim() || !formData.categoryId) {
      toast({
        title: "Validation Error",
        description: "Name, slug, and parent category are required",
        variant: "destructive"
      });
      return;
    }
    updateMutation.mutate({ 
      id: selectedSubcategory.id, 
      data: {
        name: formData.name,
        slug: formData.slug,
        categoryId: parseInt(formData.categoryId)
      }
    });
  };

  const handleDelete = () => {
    if (!selectedSubcategory) return;
    deleteMutation.mutate(selectedSubcategory.id);
  };

  const openCreateDialog = () => {
    setFormData({ name: "", slug: "", categoryId: "" });
    setCreateDialogOpen(true);
  };

  const openEditDialog = (subcategory: SubcategoryWithCount) => {
    setSelectedSubcategory(subcategory);
    setFormData({ 
      name: subcategory.name, 
      slug: subcategory.slug,
      categoryId: subcategory.categoryId.toString()
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (subcategory: SubcategoryWithCount) => {
    setSelectedSubcategory(subcategory);
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

  const getCategoryName = (categoryId: number) => {
    return categories?.find(c => c.id === categoryId)?.name || 'Unknown';
  };

  return (
    <Card className="border-0" data-testid="subcategory-manager">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Subcategory Manager
            </CardTitle>
            <CardDescription>
              Manage level 2 subcategories. Subcategories with resources cannot be deleted.
            </CardDescription>
          </div>
          <Button 
            onClick={openCreateDialog}
            data-testid="button-create-subcategory"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Subcategory
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
          <Table data-testid="table-subcategories">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Parent Category</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead className="text-right">Resources</TableHead>
                <TableHead className="text-right w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subcategories?.map((subcategory) => (
                <TableRow key={subcategory.id} data-testid={`row-subcategory-${subcategory.id}`}>
                  <TableCell className="font-mono text-sm">{subcategory.id}</TableCell>
                  <TableCell className="font-medium" data-testid={`text-subcategory-name-${subcategory.id}`}>
                    {subcategory.name}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {getCategoryName(subcategory.categoryId)}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {subcategory.slug}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge 
                      variant="secondary"
                      data-testid={`badge-count-${subcategory.id}`}
                    >
                      {subcategory.resourceCount}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(subcategory)}
                        data-testid={`button-edit-${subcategory.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteDialog(subcategory)}
                        disabled={subcategory.resourceCount > 0}
                        data-testid={`button-delete-${subcategory.id}`}
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
        <DialogContent data-testid="dialog-create-subcategory">
          <DialogHeader>
            <DialogTitle>Create Subcategory</DialogTitle>
            <DialogDescription>
              Add a new level 2 subcategory under a parent category.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="create-category">Parent Category *</Label>
              <Select
                value={formData.categoryId}
                onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
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
              <Label htmlFor="create-name">Name *</Label>
              <Input
                id="create-name"
                placeholder="e.g., Mobile Players"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                data-testid="input-create-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-slug">Slug *</Label>
              <Input
                id="create-slug"
                placeholder="e.g., mobile-players"
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
        <DialogContent data-testid="dialog-edit-subcategory">
          <DialogHeader>
            <DialogTitle>Edit Subcategory</DialogTitle>
            <DialogDescription>
              Update the subcategory name, slug, or parent category.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-category">Parent Category *</Label>
              <Select
                value={formData.categoryId}
                onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
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
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                placeholder="e.g., Mobile Players"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                data-testid="input-edit-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-slug">Slug *</Label>
              <Input
                id="edit-slug"
                placeholder="e.g., mobile-players"
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
        <AlertDialogContent data-testid="dialog-delete-subcategory">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subcategory</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedSubcategory?.name}"?
              {selectedSubcategory && selectedSubcategory.resourceCount > 0 && (
                <span className="block mt-2 text-red-500 font-semibold">
                  This subcategory has {selectedSubcategory.resourceCount} resources and cannot be deleted.
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
              disabled={deleteMutation.isPending || (selectedSubcategory?.resourceCount ?? 0) > 0}
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
