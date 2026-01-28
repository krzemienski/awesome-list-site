import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Loader2, Sparkles, CheckCircle } from "lucide-react";
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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Resource } from "@shared/schema";

const suggestEditSchema = z.object({
  title: z.string()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or less"),
  url: z.string()
    .url("Please enter a valid URL")
    .refine((url) => url.startsWith("https://"), {
      message: "URL must use HTTPS protocol"
    }),
  description: z.string()
    .min(10, "Description must be at least 10 characters")
    .max(1000, "Description must be 1000 characters or less"),
  category: z.string().min(1, "Please select a category"),
  subcategory: z.string().optional(),
  subSubcategory: z.string().optional(),
});

type SuggestEditFormData = z.infer<typeof suggestEditSchema>;

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

interface ClaudeSuggestions {
  suggestedTitle: string;
  suggestedDescription: string;
  suggestedTags: string[];
  suggestedCategory: string;
  suggestedSubcategory?: string;
  confidence: number;
  keyTopics: string[];
}

interface SuggestEditDialogProps {
  resource: Resource;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function calculateDiff(original: Resource, updated: SuggestEditFormData): Record<string, { old: any; new: any }> {
  const diff: Record<string, { old: any; new: any }> = {};
  
  // SECURITY FIX: Improved diff calculation with array support (ISSUE 4)
  const EDITABLE_FIELDS = ['title', 'description', 'url', 'tags', 'category', 'subcategory', 'subSubcategory'];
  
  for (const field of EDITABLE_FIELDS) {
    const oldValue = (original as any)[field];
    const newValue = (updated as any)[field];
    
    // Deep comparison for arrays (tags)
    if (Array.isArray(oldValue) && Array.isArray(newValue)) {
      const oldSorted = [...oldValue].sort().join(',');
      const newSorted = [...newValue].sort().join(',');
      if (oldSorted !== newSorted) {
        diff[field] = { old: oldValue, new: newValue };
      }
    }
    // Regular comparison for scalars
    else if (oldValue !== newValue) {
      diff[field] = { old: oldValue, new: newValue };
    }
  }
  
  return diff;
}

export function SuggestEditDialog({ resource, open, onOpenChange }: SuggestEditDialogProps) {
  const { toast } = useToast();
  const [claudeSuggestions, setClaudeSuggestions] = useState<ClaudeSuggestions | null>(null);
  const [analyzingWithAI, setAnalyzingWithAI] = useState(false);

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    enabled: open,
  });

  const { data: subcategories = [] } = useQuery<Subcategory[]>({
    queryKey: ['/api/subcategories'],
    enabled: open,
  });

  const { data: subSubcategories = [] } = useQuery<SubSubcategory[]>({
    queryKey: ['/api/sub-subcategories'],
    enabled: open,
  });

  const form = useForm<SuggestEditFormData>({
    resolver: zodResolver(suggestEditSchema),
    defaultValues: {
      title: resource.title || "",
      url: resource.url || "",
      description: resource.description || "",
      category: "",
      subcategory: "",
      subSubcategory: "",
    },
  });

  useEffect(() => {
    if (open && categories.length > 0) {
      const matchedCategory = categories.find(
        c => c.name.toLowerCase() === resource.category?.toLowerCase() ||
             c.slug === resource.category?.toLowerCase().replace(/\s+/g, '-')
      );
      if (matchedCategory) {
        form.setValue('category', matchedCategory.id.toString());
      }
    }
  }, [open, categories, resource.category, form]);

  useEffect(() => {
    const selectedCategoryId = form.watch('category');
    if (open && subcategories.length > 0 && selectedCategoryId && resource.subcategory) {
      const matchedSubcategory = subcategories.find(
        s => s.categoryId === parseInt(selectedCategoryId) &&
             (s.name.toLowerCase() === resource.subcategory?.toLowerCase() ||
              s.slug === resource.subcategory?.toLowerCase().replace(/\s+/g, '-'))
      );
      if (matchedSubcategory) {
        form.setValue('subcategory', matchedSubcategory.id.toString());
      }
    }
  }, [open, subcategories, resource.subcategory, form.watch('category'), form]);

  useEffect(() => {
    const selectedSubcategoryId = form.watch('subcategory');
    if (open && subSubcategories.length > 0 && selectedSubcategoryId && resource.subSubcategory) {
      const matchedSubSubcategory = subSubcategories.find(
        s => s.subcategoryId === parseInt(selectedSubcategoryId) &&
             (s.name.toLowerCase() === resource.subSubcategory?.toLowerCase() ||
              s.slug === resource.subSubcategory?.toLowerCase().replace(/\s+/g, '-'))
      );
      if (matchedSubSubcategory) {
        form.setValue('subSubcategory', matchedSubSubcategory.id.toString());
      }
    }
  }, [open, subSubcategories, resource.subSubcategory, form.watch('subcategory'), form]);

  const selectedCategory = form.watch("category");
  const selectedSubcategory = form.watch("subcategory");

  const filteredSubcategories = subcategories.filter(
    (sub) => {
      const categoryId = selectedCategory ? parseInt(selectedCategory) : null;
      return categoryId ? sub.categoryId === categoryId : false;
    }
  );

  const filteredSubSubcategories = subSubcategories.filter(
    (subSub) => {
      const subcategoryId = selectedSubcategory ? parseInt(selectedSubcategory) : null;
      return subcategoryId ? subSub.subcategoryId === subcategoryId : false;
    }
  );

  const handleAnalyzeWithAI = async () => {
    setAnalyzingWithAI(true);
    try {
      const response = await apiRequest('/api/claude/analyze', {
        method: 'POST',
        body: JSON.stringify({ url: resource.url }),
      });
      
      if (response.available === false) {
        toast({
          title: "AI Analysis Not Available",
          description: "Claude AI service is not configured. Please enter details manually.",
          variant: "default",
        });
        return;
      }
      
      setClaudeSuggestions(response);
      toast({
        title: "AI Analysis Complete",
        description: `Suggestions generated with ${Math.round(response.confidence * 100)}% confidence`,
      });
    } catch (error) {
      toast({
        title: "Analysis Failed",
        description: "Could not analyze URL with AI. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAnalyzingWithAI(false);
    }
  };

  const handleApplySuggestions = () => {
    if (!claudeSuggestions) return;
    
    if (claudeSuggestions.suggestedTitle) {
      form.setValue('title', claudeSuggestions.suggestedTitle);
    }
    if (claudeSuggestions.suggestedDescription) {
      form.setValue('description', claudeSuggestions.suggestedDescription);
    }
    if (claudeSuggestions.suggestedCategory) {
      const matchingCategory = categories.find(
        c => c.name.toLowerCase() === claudeSuggestions.suggestedCategory.toLowerCase()
      );
      if (matchingCategory) {
        form.setValue('category', matchingCategory.id.toString());
      }
    }
    
    toast({
      title: "AI Suggestions Applied",
      description: "Review the changes before submitting",
    });
  };

  const submitMutation = useMutation({
    mutationFn: async (data: SuggestEditFormData) => {
      const proposedChanges = calculateDiff(resource, data);
      
      if (Object.keys(proposedChanges).length === 0) {
        throw new Error("No changes detected");
      }
      
      const proposedData = {
        title: data.title,
        url: data.url,
        description: data.description,
        category: data.category,
        subcategory: data.subcategory,
        subSubcategory: data.subSubcategory,
      };
      
      return apiRequest(`/api/resources/${resource.id}/edits`, {
        method: 'POST',
        body: JSON.stringify({
          proposedChanges,
          proposedData,
          claudeMetadata: claudeSuggestions,
        }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Edit Suggestion Submitted",
        description: "Your edit will be reviewed by admins",
      });
      onOpenChange(false);
      form.reset();
      setClaudeSuggestions(null);
      queryClient.invalidateQueries({ queryKey: ['/api/resources'] });
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit edit suggestion",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SuggestEditFormData) => {
    submitMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Suggest Edit for "{resource.title}"</DialogTitle>
          <DialogDescription>
            Propose changes to this resource. Your suggestions will be reviewed by admins.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Resource title"
                      {...field}
                      data-testid="input-edit-title"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://example.com"
                      {...field}
                      data-testid="input-edit-url"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the resource..."
                      rows={4}
                      {...field}
                      data-testid="input-edit-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-edit-category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {filteredSubcategories.length > 0 && (
              <FormField
                control={form.control}
                name="subcategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subcategory (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-subcategory">
                          <SelectValue placeholder="Select subcategory" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredSubcategories.map((subcategory) => (
                          <SelectItem key={subcategory.id} value={subcategory.id.toString()}>
                            {subcategory.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {filteredSubSubcategories.length > 0 && (
              <FormField
                control={form.control}
                name="subSubcategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sub-subcategory (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-subsubcategory">
                          <SelectValue placeholder="Select sub-subcategory" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredSubSubcategories.map((subSubcategory) => (
                          <SelectItem key={subSubcategory.id} value={subSubcategory.id.toString()}>
                            {subSubcategory.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleAnalyzeWithAI}
                disabled={analyzingWithAI}
                data-testid="button-analyze-ai"
              >
                {analyzingWithAI ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Analyze with AI
                  </>
                )}
              </Button>

              {claudeSuggestions && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleApplySuggestions}
                  data-testid="button-apply-suggestions"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Apply AI Suggestions
                </Button>
              )}
            </div>

            {claudeSuggestions && (
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">AI Suggestions</h4>
                      <Badge variant="secondary">
                        {Math.round(claudeSuggestions.confidence * 100)}% confidence
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Title:</p>
                      <p className="text-sm text-muted-foreground">{claudeSuggestions.suggestedTitle}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Description:</p>
                      <p className="text-sm text-muted-foreground">{claudeSuggestions.suggestedDescription}</p>
                    </div>
                    {claudeSuggestions.keyTopics.length > 0 && (
                      <div>
                        <p className="text-sm font-medium">Key Topics:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {claudeSuggestions.keyTopics.map((topic, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {topic}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-edit"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitMutation.isPending}
                data-testid="button-submit-edit"
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Edit Suggestion"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
