import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Resource } from "@shared/schema";

// Zod validation schema
const resourceEditSchema = z.object({
  title: z.string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title must be 200 characters or less"),
  url: z.string()
    .url("Please enter a valid URL")
    .refine((url) => url.startsWith("https://"), {
      message: "URL must use HTTPS protocol"
    }),
  description: z.string()
    .max(2000, "Description must be 2000 characters or less")
    .optional()
    .default(""),
  category: z.string().min(1, "Category is required"),
  subcategory: z.string().optional(),
  subSubcategory: z.string().optional(),
  status: z.enum(['pending', 'approved', 'rejected', 'archived'], {
    errorMap: () => ({ message: "Invalid status" })
  }),
});

type ResourceEditFormData = z.infer<typeof resourceEditSchema>;

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface Subcategory {
  id: number;
  name: string;
  slug: string;
  categoryId: number;
}

interface SubSubcategory {
  id: number;
  name: string;
  slug: string;
  subcategoryId: number;
}

interface ResourceEditModalProps {
  resource: Resource | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (resourceId: string, updates: Partial<Resource>) => Promise<void>;
}

export default function ResourceEditModal({
  resource,
  isOpen,
  onClose,
  onSave,
}: ResourceEditModalProps) {
  // Fetch categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    enabled: isOpen,
  });

  // Fetch subcategories
  const { data: subcategories = [], isLoading: subcategoriesLoading } = useQuery<Subcategory[]>({
    queryKey: ['/api/subcategories'],
    enabled: isOpen,
  });

  // Fetch sub-subcategories
  const { data: subSubcategories = [], isLoading: subSubcategoriesLoading } = useQuery<SubSubcategory[]>({
    queryKey: ['/api/sub-subcategories'],
    enabled: isOpen,
  });

  const form = useForm<ResourceEditFormData>({
    resolver: zodResolver(resourceEditSchema),
    defaultValues: {
      title: "",
      url: "",
      description: "",
      category: "",
      subcategory: "",
      subSubcategory: "",
      status: "approved",
    },
  });

  const selectedCategory = form.watch("category");
  const selectedSubcategory = form.watch("subcategory");

  // Filter subcategories based on selected category
  const categoryObj = categories.find(c => c.name === selectedCategory);
  const filteredSubcategories = categoryObj
    ? subcategories.filter(sub => sub.categoryId === categoryObj.id)
    : [];

  // Filter sub-subcategories based on selected subcategory
  const subcategoryObj = subcategories.find(s => s.name === selectedSubcategory);
  const filteredSubSubcategories = subcategoryObj
    ? subSubcategories.filter(subSub => subSub.subcategoryId === subcategoryObj.id)
    : [];

  // Reset form when resource changes or modal opens
  useEffect(() => {
    if (resource && isOpen) {
      form.reset({
        title: resource.title || "",
        url: resource.url || "",
        description: resource.description || "",
        category: resource.category || "",
        subcategory: resource.subcategory || "",
        subSubcategory: resource.subSubcategory || "",
        status: (resource.status as "pending" | "approved" | "rejected" | "archived") || "approved",
      });
    }
  }, [resource, isOpen, form]);

  // Reset subcategory when category changes
  useEffect(() => {
    if (resource?.category !== selectedCategory) {
      form.setValue("subcategory", "");
      form.setValue("subSubcategory", "");
    }
  }, [selectedCategory, form, resource]);

  // Reset sub-subcategory when subcategory changes
  useEffect(() => {
    if (resource?.subcategory !== selectedSubcategory) {
      form.setValue("subSubcategory", "");
    }
  }, [selectedSubcategory, form, resource]);

  const onSubmit = async (data: ResourceEditFormData) => {
    if (!resource) return;

    try {
      await onSave(resource.id, {
        title: data.title,
        url: data.url,
        description: data.description,
        category: data.category,
        subcategory: data.subcategory || undefined,
        subSubcategory: data.subSubcategory || undefined,
        status: data.status,
      });
      onClose();
    } catch (error) {
      // Error handling is done in the parent component
      console.error("Error saving resource:", error);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const isLoading = categoriesLoading || subcategoriesLoading || subSubcategoriesLoading;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Resource</DialogTitle>
          <DialogDescription>
            Update the resource details below. All changes will be saved immediately.
          </DialogDescription>
        </DialogHeader>

        {resource && (
          <div className="text-sm text-muted-foreground mb-4">
            <a
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-primary"
            >
              <ExternalLink className="h-3 w-3" />
              View current resource
            </a>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Title Field */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter resource title"
                      {...field}
                      disabled={form.formState.isSubmitting}
                    />
                  </FormControl>
                  <FormDescription>
                    3-200 characters
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* URL Field */}
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://example.com"
                      {...field}
                      disabled={form.formState.isSubmitting}
                    />
                  </FormControl>
                  <FormDescription>
                    Must be a valid HTTPS URL
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description Field */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter resource description"
                      rows={4}
                      {...field}
                      disabled={form.formState.isSubmitting}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional, max 2000 characters
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category Field */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isLoading || form.formState.isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.name}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Subcategory Field */}
            <FormField
              control={form.control}
              name="subcategory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subcategory (Optional)</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || ""}
                    disabled={!selectedCategory || isLoading || form.formState.isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a subcategory" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {filteredSubcategories.map((subcategory) => (
                        <SelectItem key={subcategory.id} value={subcategory.name}>
                          {subcategory.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Sub-Subcategory Field */}
            <FormField
              control={form.control}
              name="subSubcategory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sub-Subcategory (Optional)</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || ""}
                    disabled={!selectedSubcategory || isLoading || form.formState.isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a sub-subcategory" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {filteredSubSubcategories.map((subSubcategory) => (
                        <SelectItem key={subSubcategory.id} value={subSubcategory.name}>
                          {subSubcategory.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Status Field */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={form.formState.isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={form.formState.isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting || isLoading}
              >
                {form.formState.isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
