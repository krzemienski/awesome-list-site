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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Helmet } from "react-helmet";

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
  id: string; // UUID
  name: string;
  slug: string;
}

interface Subcategory {
  id: string; // UUID
  name: string;
  slug: string;
  categoryId: string; // UUID
}

interface SubSubcategory {
  id: string; // UUID
  name: string;
  slug: string;
  subcategoryId: string; // UUID
}

export default function SubmitResource() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showSuccess, setShowSuccess] = useState(false);

  // Fetch categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    queryFn: () => apiRequest('/api/categories'),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch subcategories
  const { data: subcategories = [], isLoading: subcategoriesLoading } = useQuery<Subcategory[]>({
    queryKey: ['/api/subcategories'],
    queryFn: () => apiRequest('/api/subcategories'),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch sub-subcategories
  const { data: subSubcategories = [], isLoading: subSubcategoriesLoading } = useQuery<SubSubcategory[]>({
    queryKey: ['/api/sub-subcategories'],
    queryFn: () => apiRequest('/api/sub-subcategories'),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  const form = useForm<SubmitResourceFormData>({
    resolver: zodResolver(submitResourceSchema),
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

  const selectedCategory = form.watch("category");
  const selectedSubcategory = form.watch("subcategory");

  // Filter subcategories based on selected category ID (UUID)
  const filteredSubcategories = subcategories.filter(
    (sub) => selectedCategory ? sub.categoryId === selectedCategory : false
  );

  // Filter sub-subcategories based on selected subcategory ID (UUID)
  const filteredSubSubcategories = subSubcategories.filter(
    (subSub) => selectedSubcategory ? subSub.subcategoryId === selectedSubcategory : false
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

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async (data: SubmitResourceFormData) => {
      // Parse tags from comma-separated string
      const tagsArray = data.tags 
        ? data.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0).slice(0, 10)
        : [];

      // Find the selected entities to get their names for submission (UUIDs)
      const category = categories.find(c => c.id === data.category);
      const subcategory = data.subcategory ? subcategories.find(s => s.id === data.subcategory) : null;
      const subSubcategory = data.subSubcategory ? subSubcategories.find(ss => ss.id === data.subSubcategory) : null;

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
          subcategory: subcategory?.name || undefined,
          subSubcategory: subSubcategory?.name || undefined,
          metadata: tagsArray.length > 0 ? { tags: tagsArray } : {},
        }),
      });
    },
    onSuccess: () => {
      setShowSuccess(true);
      form.reset();
      toast({
        title: "Success!",
        description: "Your resource has been submitted for review. It will be visible once approved by an admin.",
        variant: "default",
      });
      
      // Invalidate resources cache
      queryClient.invalidateQueries({ queryKey: ['/api/resources'] });
      
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit resource. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SubmitResourceFormData) => {
    submitMutation.mutate(data);
  };

  // Show auth required message for unauthenticated users
  if (!authLoading && !isAuthenticated) {
    return (
      <>
        <Helmet>
          <title>Submit Resource - Login Required</title>
          <meta name="description" content="Login to submit resources to the awesome list" />
        </Helmet>
        
        <div className="container max-w-2xl mx-auto px-4 py-12">
          <Card className="border-pink-500/20">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 rounded-full bg-pink-500/10 p-4 w-fit">
                <LogIn className="h-12 w-12 text-pink-500" />
              </div>
              <CardTitle className="text-2xl">Authentication Required</CardTitle>
              <CardDescription>
                You need to be logged in to submit resources. Please login to continue.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Button 
                onClick={() => window.location.href = '/api/login'}
                className="w-full bg-pink-500 hover:bg-pink-600"
                data-testid="button-login"
              >
                <LogIn className="mr-2 h-4 w-4" />
                Login
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setLocation('/')}
                data-testid="button-back-home"
              >
                Back to Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  if (authLoading || categoriesLoading) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-12">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
          <span className="ml-2">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Submit Resource | Awesome Video</title>
        <meta name="description" content="Submit a new resource to the awesome video list for community review" />
      </Helmet>

      <div className="container max-w-2xl mx-auto px-4 py-12">
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
              <Plus className="h-6 w-6 text-pink-500" />
              Submit a Resource
            </CardTitle>
            <CardDescription>
              Share a valuable resource with the community. All submissions are reviewed before being published.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                          {...field}
                          data-testid="input-url"
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
                      <Select onValueChange={field.onChange} value={field.value}>
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
                        <Select onValueChange={field.onChange} value={field.value}>
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
                        <Select onValueChange={field.onChange} value={field.value}>
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

                {/* Submit Button */}
                <div className="flex gap-3 pt-4">
                  <Button
                    type="submit"
                    disabled={submitMutation.isPending}
                    className="flex-1 bg-pink-500 hover:bg-pink-600"
                    data-testid="button-submit"
                  >
                    {submitMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
                <span className="text-pink-500">•</span>
                <span>Ensure the resource is relevant to video streaming, encoding, or related technologies</span>
              </li>
              <li className="flex gap-2">
                <span className="text-pink-500">•</span>
                <span>Provide a clear, concise description that helps others understand the resource</span>
              </li>
              <li className="flex gap-2">
                <span className="text-pink-500">•</span>
                <span>Only submit resources with valid HTTPS URLs that are publicly accessible</span>
              </li>
              <li className="flex gap-2">
                <span className="text-pink-500">•</span>
                <span>Your submission will be reviewed by admins before being published</span>
              </li>
              <li className="flex gap-2">
                <span className="text-pink-500">•</span>
                <span>Please check if the resource already exists before submitting</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
