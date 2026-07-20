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
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { humanizeApiError } from "@/lib/apiError";
import type { Resource } from "@shared/schema";

// BUG-024 (run14): the HTTPS rule applies to NEW urls only. Legacy resources
// whose canonical URL is still http:// (their https twin is broken — see the
// http-recheck journal) pre-fill the form with that value; an unchanged URL
// must never block an edit to other fields.
const makeSuggestEditSchema = (originalUrl: string) => z.object({
  title: z.string()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or less"),
  url: z.string()
    .url("Please enter a valid URL")
    .refine((url) => url === originalUrl || url.startsWith("https://"), {
      message: "New URLs must use HTTPS (keeping the current URL unchanged is fine)"
    }),
  description: z.string()
    // Run22 BUG-021: an empty description should say it's required, not
    // surface the misleading minimum-length message.
    .min(1, "Description is required")
    .min(10, "Description must be at least 10 characters")
    .max(1000, "Description must be 1000 characters or less"),
  category: z.string().min(1, "Please select a category"),
  subcategory: z.string().optional(),
  subSubcategory: z.string().optional(),
});

type SuggestEditFormData = z.infer<ReturnType<typeof makeSuggestEditSchema>>;

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
  suggestedSubSubcategory?: string;
  confidence: number;
  keyTopics: string[];
}

interface SuggestEditDialogProps {
  resource: Resource;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// BUG-023 (run14): the diff is computed on RESOLVED NAMES (the caller maps
// select IDs back to taxonomy names first). Comparing the stored name against
// the raw select ID made every submit look like a change (no-op edits sailed
// through) and persisted raw IDs like "1089" into proposedChanges/proposedData
// — which the admin approve path would then merge into the resource verbatim.
function calculateDiff(original: Resource, updated: SuggestEditFormData): Record<string, { old: unknown; new: unknown }> {
  const diff: Record<string, { old: unknown; new: unknown }> = {};

  // SECURITY FIX: Improved diff calculation with array support (ISSUE 4)
  const EDITABLE_FIELDS = ['title', 'description', 'url', 'tags', 'category', 'subcategory', 'subSubcategory'] as const;

  // null / undefined / "" are the same "empty" for comparison purposes
  // (original subcategory NULL pre-fills the form as "").
  const norm = (v: unknown) => (v === null || v === undefined ? "" : v);

  for (const field of EDITABLE_FIELDS) {
    const oldValue = original[field as keyof Resource];
    const newValue = updated[field as keyof SuggestEditFormData];

    // Deep comparison for arrays (tags)
    if (Array.isArray(oldValue) && Array.isArray(newValue)) {
      const oldSorted = [...oldValue].sort().join(',');
      const newSorted = [...newValue].sort().join(',');
      if (oldSorted !== newSorted) {
        diff[field] = { old: oldValue, new: newValue };
      }
    }
    // Regular comparison for scalars
    else if (norm(oldValue) !== norm(newValue)) {
      diff[field] = { old: oldValue, new: newValue };
    }
  }

  return diff;
}

export function SuggestEditDialog({ resource, open, onOpenChange }: SuggestEditDialogProps) {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
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
    resolver: zodResolver(makeSuggestEditSchema(resource.url || "")),
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
        if (claudeSuggestions.suggestedSubcategory) {
          const matchingSubcategory = subcategories.find(
            s => s.categoryId === matchingCategory.id &&
                 s.name.toLowerCase() === claudeSuggestions.suggestedSubcategory!.toLowerCase()
          );
          if (matchingSubcategory) {
            form.setValue('subcategory', matchingSubcategory.id.toString());
            if (claudeSuggestions.suggestedSubSubcategory) {
              const matchingSubSub = subSubcategories.find(
                ss => ss.subcategoryId === matchingSubcategory.id &&
                      ss.name.toLowerCase() === claudeSuggestions.suggestedSubSubcategory!.toLowerCase()
              );
              if (matchingSubSub) {
                form.setValue('subSubcategory', matchingSubSub.id.toString());
              }
            }
          }
        }
      }
    }
    
    toast({
      title: "AI Suggestions Applied",
      description: "Review the changes before submitting",
    });
  };

  const submitMutation = useMutation({
    mutationFn: async ({ data, proposedChanges }: { data: SuggestEditFormData; proposedChanges: Record<string, { old: unknown; new: unknown }> }) => {
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
    onError: (error: Error) => {
      // BUG-007 (run14): map raw "STATUS: body" API errors to friendly copy.
      toast({
        title: "Submission Failed",
        description: humanizeApiError(error, "Failed to submit edit suggestion. Please try again."),
        variant: "destructive",
      });
    },
  });

  // BUG-023 (run14): resolve select IDs back to taxonomy NAMES before diffing
  // and submitting — the edit queue stores/merges these values verbatim, and
  // the old→new diff must compare like with like or no-op submits pass.
  const onSubmit = (data: SuggestEditFormData) => {
    const idToName = (list: { id: number; name: string }[], id?: string) =>
      id ? list.find((x) => x.id.toString() === id)?.name ?? id : "";

    const resolved: SuggestEditFormData = {
      ...data,
      category: idToName(categories, data.category),
      subcategory: idToName(subcategories, data.subcategory),
      subSubcategory: idToName(subSubcategories, data.subSubcategory),
    };

    const proposedChanges = calculateDiff(resource, resolved);
    if (Object.keys(proposedChanges).length === 0) {
      toast({
        title: "No changes to submit",
        description: "The form matches the current resource — edit a field first.",
      });
      return;
    }

    submitMutation.mutate({ data: resolved, proposedChanges });
  };

  if (!isAuthenticated) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            {/* BUG-048 (run14): user-facing copy, not dev jargon */}
            <div className="eyebrow" aria-hidden>// Sign in required</div>
            <DialogTitle className="font-display text-2xl font-medium tracking-tight">
              Sign in <em className="not-italic" style={{ fontStyle: 'italic', color: 'var(--accent)' }}>required</em>
            </DialogTitle>
            <DialogDescription>
              Please sign in to suggest edits for this resource. This helps us maintain the quality of our curated list and track contributions.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm mb-4" style={{ color: 'var(--text-2)' }}>
                  We value your input! Once signed in, you can propose updates to titles, descriptions, categories, and more.
                </p>
                {/* BUG-001 (run14): /auth was a 404 — route to the real login
                    page and come back here afterwards via ?next= */}
                <Button
                  className="w-full"
                  onClick={() => {
                    const next = encodeURIComponent(
                      window.location.pathname + window.location.search,
                    );
                    window.location.href = `/login?next=${next}`;
                  }}
                  data-testid="button-login-redirect"
                >
                  Sign in
                </Button>
              </CardContent>
            </Card>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="eyebrow" aria-hidden>// Suggest edit</div>
          <DialogTitle className="font-display text-2xl font-medium tracking-tight">
            Suggest <em className="not-italic" style={{ fontStyle: 'italic', color: 'var(--accent)' }}>edit</em>
            <span className="block text-sm font-body font-normal mt-1" style={{ color: 'var(--text-2)' }}>
              for “{resource.title}”
            </span>
          </DialogTitle>
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
