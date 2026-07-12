import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";
import { Loader2, Plus, CheckCircle, AlertCircle, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useDebounce } from "@/hooks/useDebounce";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { redirectToLogin } from "@/lib/authUtils";
import { trackGenerateLead } from "@/lib/analytics";
import SEOHead from "@/components/layout/SEOHead";
import { submitSeoTitle, submitSeoDescription } from "@shared/seo-templates";

// Form validation schema
const submitResourceSchema = z.object({
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
  tags: z.string().optional(),
});

type SubmitResourceFormData = z.infer<typeof submitResourceSchema>;

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

export default function SubmitResource() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showSuccess, setShowSuccess] = useState(false);
  const [duplicateResource, setDuplicateResource] = useState<{ id: number; title: string; status: string } | null>(null);

  // Fetch categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    enabled: isAuthenticated,
  });

  // Fetch subcategories
  const { data: subcategories = [] } = useQuery<Subcategory[]>({
    queryKey: ['/api/subcategories'],
    enabled: isAuthenticated,
  });

  // Fetch sub-subcategories
  const { data: subSubcategories = [] } = useQuery<SubSubcategory[]>({
    queryKey: ['/api/sub-subcategories'],
    enabled: isAuthenticated,
  });

  const form = useForm<SubmitResourceFormData>({
    resolver: zodResolver(submitResourceSchema),
    mode: "onTouched",
    defaultValues: {
      title: "",
      url: "",
      description: "",
      category: "",
      subcategory: "",
      subSubcategory: "",
      tags: "",
    },
  });

  const FIELD_ORDER: (keyof SubmitResourceFormData)[] = [
    "title",
    "url",
    "description",
    "category",
    "subcategory",
    "subSubcategory",
    "tags",
  ];

  const onInvalid = (errors: Record<string, unknown>) => {
    const firstBad = FIELD_ORDER.find((name) => name in errors);
    if (firstBad) {
      try {
        form.setFocus(firstBad);
      } catch {
        // Some controls (Select) cannot be focused programmatically; fall back
        // to focusing the rendered input/trigger by name.
        const el = document.querySelector<HTMLElement>(
          `[name="${firstBad}"], [data-testid="input-${firstBad}"], [data-testid="select-${firstBad}"]`
        );
        el?.focus();
      }
    }
    toast({
      title: "Please fix the highlighted fields",
      description: "Some required fields are missing or invalid.",
      variant: "destructive",
    });
  };

  const selectedCategory = form.watch("category");
  const selectedSubcategory = form.watch("subcategory");
  const urlValue = form.watch("url");
  const debouncedUrl = useDebounce(urlValue, 500);

  // Filter subcategories based on selected category ID
  const filteredSubcategories = subcategories.filter(
    (sub) => {
      const categoryId = selectedCategory ? parseInt(selectedCategory) : null;
      return categoryId ? sub.categoryId === categoryId : false;
    }
  );

  // Filter sub-subcategories based on selected subcategory ID
  const filteredSubSubcategories = subSubcategories.filter(
    (subSub) => {
      const subcategoryId = selectedSubcategory ? parseInt(selectedSubcategory) : null;
      return subcategoryId ? subSub.subcategoryId === subcategoryId : false;
    }
  );

  // Reset subcategory when category changes
  useEffect(() => {
    form.setValue("subcategory", "");
    form.setValue("subSubcategory", "");
  }, [selectedCategory, form]);

  // Reset sub-subcategory when subcategory changes
  useEffect(() => {
    form.setValue("subSubcategory", "");
  }, [selectedSubcategory, form]);

  // Check for duplicate URLs
  useEffect(() => {
    const checkDuplicateUrl = async () => {
      // Only check if URL is valid and starts with https://
      if (!debouncedUrl?.startsWith("https://")) {
        setDuplicateResource(null);
        return;
      }

      try {
        const response = await fetch(`/api/resources/check-url?url=${encodeURIComponent(debouncedUrl)}`);
        const data = (await response.json()) as {
          exists?: boolean;
          resource?: { id: number; title: string; status: string };
        };

        if (data.exists && data.resource) {
          setDuplicateResource(data.resource);
        } else {
          setDuplicateResource(null);
        }
      } catch {
        // Silently handle errors - don't block the user
        setDuplicateResource(null);
      }
    };

    void checkDuplicateUrl();
  }, [debouncedUrl]);

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async (data: SubmitResourceFormData) => {
      // Parse tags from comma-separated string
      const tagsArray = data.tags 
        ? data.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0).slice(0, 10)
        : [];

      // Find the selected entities to get their names for submission
      const categoryId = parseInt(data.category);
      const subcategoryId = data.subcategory ? parseInt(data.subcategory) : null;
      const subSubcategoryId = data.subSubcategory ? parseInt(data.subSubcategory) : null;

      const category = categories.find(c => c.id === categoryId);
      const subcategory = subcategoryId ? subcategories.find(s => s.id === subcategoryId) : null;
      const subSubcategory = subSubcategoryId ? subSubcategories.find(ss => ss.id === subSubcategoryId) : null;

      if (!category) {
        throw new Error("Invalid category selected");
      }

      return apiRequest('/api/resources', {
        method: 'POST',
        body: JSON.stringify({
          title: data.title,
          url: data.url,
          description: data.description,
          category: category.name,
          subcategory: subcategory?.name ?? undefined,
          subSubcategory: subSubcategory?.name ?? undefined,
          metadata: tagsArray.length > 0 ? { tags: tagsArray } : {},
        }),
      }) as Promise<unknown>;
    },
    onSuccess: (_data, variables) => {
      // GA4 conversion: resource submission completed.
      const category = categories.find((c) => c.id === parseInt(variables.category));
      trackGenerateLead({
        content_type: 'resource_submission',
        category: category?.name,
      });

      setShowSuccess(true);
      form.reset();
      toast({
        title: "Success!",
        description: "Your resource has been submitted for review. It will be visible once approved by an admin.",
        variant: "default",
      });
      
      // Invalidate resources cache
      void queryClient.invalidateQueries({ queryKey: ['/api/resources'] });
      
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    onError: (error: Error) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit resource. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SubmitResourceFormData) => {
    if (!isAuthenticated) {
      toast({
        title: "Login required",
        description: "Please log in to submit a resource.",
        variant: "destructive",
      });
      redirectToLogin();
      return;
    }
    submitMutation.mutate(data);
  };

  if (authLoading) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-12">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEOHead title={submitSeoTitle} description={submitSeoDescription} />

      <div className="container max-w-2xl mx-auto px-4 py-12">
        <h1 className="sr-only">Submit a Resource</h1>
        {/* Success Message */}
        {showSuccess && (
          <Card className="mb-6 border-green-500/20 bg-green-500/5">
            <CardHeader>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-green-500" />
                <div>
                  <CardTitle className="text-green-500">Submission Successful!</CardTitle>
                  <CardDescription>
                    Your resource is pending review. You can submit another resource below.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        )}

        {/* Main Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Plus className="h-6 w-6 text-primary" />
              Submit a Resource
            </CardTitle>
            <CardDescription>
              Share a valuable resource with the community. All submissions are reviewed before being published.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              {!isAuthenticated && (
                <Alert className="mb-6 border-yellow-500/50 bg-yellow-500/10" data-testid="alert-login-required">
                  <LogIn className="h-4 w-4 text-yellow-500" />
                  <AlertTitle className="text-yellow-500">Login required to submit</AlertTitle>
                  <AlertDescription>
                    The form below is read-only. Please{" "}
                    <a href="/login" className="underline" data-testid="link-login">log in</a>{" "}
                    to submit a resource.
                  </AlertDescription>
                </Alert>
              )}
              {/* Run3 audit R3-04: explicit method="post" — submission goes via
                  fetch (react-hook-form onSubmit), but if JS ever fails the
                  browser must not leak form fields into the URL as a GET. */}
              <form method="post" onSubmit={(e) => void form.handleSubmit(onSubmit, onInvalid)(e)} className="space-y-6" noValidate>
                {/* Fields are disabled for logged-out visitors — they can see the
                    form layout as a preview but cannot fill or submit it (BUG-018). */}
                <fieldset disabled={!isAuthenticated} className="space-y-6 border-0 p-0 m-0 min-w-0">
                {/* Title Field */}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., FFmpeg - Video encoding tool"
                          {...field}
                          data-testid="input-title"
                        />
                      </FormControl>
                      <FormDescription>
                        A clear, descriptive title for the resource (1-200 characters)
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
                      <FormLabel>URL *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://example.com/resource"
                          type="url"
                          autoComplete="url"
                          {...field}
                          data-testid="input-url"
                        />
                      </FormControl>
                      <FormDescription>
                        Must be a valid HTTPS URL
                      </FormDescription>
                      <FormMessage />

                      {/* Duplicate URL Warning */}
                      {duplicateResource && (
                        <Alert className="mt-2 border-yellow-500/50 bg-yellow-500/10">
                          <AlertCircle className="h-4 w-4 text-yellow-500" />
                          <AlertTitle className="text-yellow-500">Duplicate URL Detected</AlertTitle>
                          <AlertDescription>
                            This URL already exists: <strong>{duplicateResource.title}</strong>
                            {' '}(Status: <span className="capitalize">{duplicateResource.status}</span>)
                            <br />
                            <span className="text-xs text-muted-foreground mt-1 block">
                              You can still submit, but this may be rejected as a duplicate.
                            </span>
                          </AlertDescription>
                        </Alert>
                      )}
                    </FormItem>
                  )}
                />

                {/* Description Field */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe what this resource is about and why it's useful..."
                          className="min-h-[100px]"
                          {...field}
                          data-testid="input-description"
                        />
                      </FormControl>
                      <FormDescription>
                        Provide a detailed description (10-1000 characters)
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
                      <FormLabel>Category *</FormLabel>
                      {/* R3-04: name gives the hidden native select a non-empty
                          name; the visible trigger is labeled via FormLabel. */}
                      <Select name={field.name} onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue placeholder="Select a category" />
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
                      <FormDescription>
                        Choose the most relevant category for this resource
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Subcategory Field */}
                {filteredSubcategories.length > 0 && (
                  <FormField
                    control={form.control}
                    name="subcategory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subcategory (Optional)</FormLabel>
                        <Select name={field.name} onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-subcategory">
                              <SelectValue placeholder="Select a subcategory" />
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
                        <FormDescription>
                          Narrow down the classification (optional)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Sub-subcategory Field */}
                {filteredSubSubcategories.length > 0 && (
                  <FormField
                    control={form.control}
                    name="subSubcategory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Specific Topic (Optional)</FormLabel>
                        <Select name={field.name} onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-subsubcategory">
                              <SelectValue placeholder="Select a specific topic" />
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
                        <FormDescription>
                          Further specify the topic (optional)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Tags Field */}
                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., video, encoding, streaming (comma-separated)"
                          {...field}
                          data-testid="input-tags"
                        />
                      </FormControl>
                      <FormDescription>
                        Add up to 10 tags, separated by commas
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                </fieldset>

                {/* Submit Button */}
                <div className="flex gap-3 pt-4">
                  <Button
                    type="submit"
                    disabled={submitMutation.isPending || !isAuthenticated}
                    className="flex-1"
                    data-testid="button-submit"
                  >
                    {submitMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Submit Resource
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation('/')}
                    disabled={submitMutation.isPending}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="mt-6 border-blue-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertCircle className="h-5 w-5 text-blue-500" />
              Submission Guidelines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>Ensure the resource is relevant to video streaming, encoding, or related technologies</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>Provide a clear, concise description that helps others understand the resource</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>Only submit resources with valid HTTPS URLs that are publicly accessible</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>Your submission will be reviewed by admins before being published</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>Please check if the resource already exists before submitting</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
