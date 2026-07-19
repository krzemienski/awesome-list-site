import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";
import { Loader2, Plus, CheckCircle, AlertCircle, AlertTriangle, LogIn, RefreshCw } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useDebounce } from "@/hooks/useDebounce";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { humanizeApiError, extractFieldErrors } from "@/lib/apiError";
import { safeGetItem, safeSetItem, safeRemoveItem } from "@/lib/safeStorage";
import { redirectToLogin } from "@/lib/authUtils";
import { trackGenerateLead } from "@/lib/analytics";
import SEOHead from "@/components/layout/SEOHead";
import { submitSeoTitle, submitSeoDescription } from "@shared/seo-templates";

// BUG-009 (run10): reject raw HTML/script markup in text fields client-side
// (mirrors the server-side guard — markup is never legitimate catalog content).
// Run21 R4-015/048: rules now come from the SHARED validation module so the
// two layers can't drift (visible-char titles, 2048-char URL cap).
import { NO_HTML_RE as NO_HTML, MAX_URL_LENGTH, hasVisibleChars } from "@shared/validation";

// Form validation schema
const submitResourceSchema = z.object({
  // BUG-011 (run9): .trim() so whitespace-only input fails min-length
  // validation instead of slipping through as a "filled" field.
  title: z.string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or less")
    // Run21 R4-015: zero-width-only titles render blank — require VISIBLE chars.
    .refine(hasVisibleChars, "Title is required")
    .refine((v) => !NO_HTML.test(v), "Title must not contain HTML tags"),
  // Run16 BUG-061: an EMPTY url used to say "Please enter a valid URL" —
  // min(1) fires first so a blank field reads "URL is required".
  url: z.string()
    .trim()
    .min(1, "URL is required")
    // Run21 R4-048: same 2048 cap the server enforces — inline error, not a 400.
    .max(MAX_URL_LENGTH, `URL must be at most ${MAX_URL_LENGTH} characters`)
    .url("Please enter a valid URL")
    .refine((url) => url.startsWith("https://"), {
      message: "URL must use HTTPS protocol"
    }),
  description: z.string()
    .trim()
    .min(10, "Description must be at least 10 characters")
    .max(1000, "Description must be 1000 characters or less")
    .refine((v) => !NO_HTML.test(v), "Description must not contain HTML tags"),
  category: z.string().min(1, "Please select a category"),
  subcategory: z.string().optional(),
  subSubcategory: z.string().optional(),
  // Run15 BUG-008: an 11th tag used to be silently dropped by a .slice(0, 10)
  // at submit time — reject loudly instead so the user knows what happened.
  // Run16 BUG-065: cap each individual tag at 50 chars (a 300-char "tag"
  // previously sailed through client validation).
  tags: z.string()
    .optional()
    .refine(
      (v) => !v || v.split(',').map((t) => t.trim()).filter(Boolean).length <= 10,
      "At most 10 tags allowed — remove some tags",
    )
    .refine(
      (v) =>
        !v ||
        v.split(',').map((t) => t.trim()).filter(Boolean).every((t) => t.length <= 50),
      "Each tag must be 50 characters or fewer",
    ),
});

type SubmitResourceFormData = z.infer<typeof submitResourceSchema>;

// R4-055: localStorage key for the in-progress /submit draft so an accidental
// refresh, tab close, or navigation no longer wipes everything the user typed.
const DRAFT_KEY = "submit-resource-draft";

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
  const { isAuthenticated, isLoading: authLoading, error: authError, refetchAuth } = useAuth();
  // BUG-002 (run19): a non-401 auth failure (network error, 5xx) used to leave
  // the form silently disabled forever — useAuth keeps the query in error state
  // (retryOnMount:false per NB-028) and isAuthenticated stays false with no UI.
  // Surface it explicitly with a retry; 401 is the normal logged-out case.
  const authFailed =
    !!authError &&
    !(typeof authError === "object" && "status" in authError && (authError as { status: number }).status === 401);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showSuccess, setShowSuccess] = useState(false);
  // NB-054 (run18): styled discard-confirmation dialog state (replaces window.confirm)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [duplicateResource, setDuplicateResource] = useState<{ id: number; title: string } | null>(null);

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
  // BUG-033 (run14): react-hook-form's formState is a Proxy — isDirty is only
  // tracked once it's read during render. Reading it for the first time inside
  // the Cancel click handler returns a stale `false`, silently skipping the
  // discard confirmation. Subscribe here, use the value in the handler.
  const { isDirty } = form.formState;

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
        // BUG-025 (run10): the public check-url endpoint no longer returns
        // internal moderation status, so the client type/UI dropped it too.
        const data = (await response.json()) as {
          exists?: boolean;
          resource?: { id: number; title: string };
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

  // R4-055: draft persistence + unload guard so an accidental refresh, tab
  // close, or navigation no longer destroys everything typed into /submit.
  const draftRestoredRef = useRef(false);
  const draftSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const draftHasContent = (v: Partial<SubmitResourceFormData>) =>
    !!(v.title || v.url || v.description || v.tags || v.category);

  // Restore a saved draft once on mount, before the auto-save subscription is
  // wired (draftRestoredRef gates saving until the restore has run so we never
  // clobber the stored draft with the empty defaults).
  useEffect(() => {
    const saved = safeGetItem(DRAFT_KEY);
    if (saved) {
      try {
        const draft = JSON.parse(saved) as Partial<SubmitResourceFormData>;
        if (draftHasContent(draft)) {
          form.reset({ ...form.getValues(), ...draft });
          toast({
            title: "Draft restored",
            description:
              "We brought back your unsaved submission — pick up where you left off.",
          });
        }
      } catch {
        safeRemoveItem(DRAFT_KEY);
      }
    }
    draftRestoredRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced auto-save of the in-progress form to localStorage.
  useEffect(() => {
    const subscription = form.watch((values) => {
      if (!draftRestoredRef.current) return;
      if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current);
      draftSaveTimer.current = setTimeout(() => {
        if (draftHasContent(values)) {
          safeSetItem(DRAFT_KEY, JSON.stringify(values));
        } else {
          safeRemoveItem(DRAFT_KEY);
        }
      }, 600);
    });
    return () => {
      subscription.unsubscribe();
      if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  // Warn before the browser unloads (refresh/close/hard nav) while the form has
  // unsaved edits — a second safety net alongside the draft above.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!isDirty || showSuccess) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty, showSuccess]);

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async (data: SubmitResourceFormData) => {
      // Parse tags from comma-separated string. Run15 BUG-008: no silent
      // .slice(0, 10) — the form schema rejects >10 tags with an error.
      const tagsArray = data.tags 
        ? data.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
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
      // BUG-005 (run19): the server's 400 carries per-field messages in
      // `fieldErrors` — surface each at its form field (focusing the first)
      // instead of discarding them behind a generic toast.
      const fieldErrors = extractFieldErrors(error);
      const formFields = [
        "title",
        "url",
        "description",
        "category",
        "subcategory",
        "subSubcategory",
        "tags",
      ] as const;
      let mapped = 0;
      if (fieldErrors) {
        for (const key of formFields) {
          const message = fieldErrors[key];
          if (message) {
            form.setError(key, { type: "server", message }, { shouldFocus: mapped === 0 });
            mapped++;
          }
        }
      }
      // BUG-007 (run14): map raw "STATUS: body" API errors to friendly copy.
      toast({
        title: "Submission Failed",
        description:
          mapped > 0
            ? "Please fix the highlighted fields below."
            : humanizeApiError(error, "Failed to submit resource. Please try again."),
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

  // BUG-002 (run19): no full-page spinner gate anymore — the form renders
  // immediately (usable well under 500ms) with an inline labeled status while
  // the sign-in check resolves, and an explicit error + retry if it fails.
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
              {authLoading ? (
                <Alert className="mb-6" data-testid="alert-auth-loading">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <AlertTitle>Verifying sign-in…</AlertTitle>
                  <AlertDescription>
                    Checking your session. The form unlocks in a moment.
                  </AlertDescription>
                </Alert>
              ) : authFailed ? (
                <Alert variant="destructive" className="mb-6" data-testid="alert-auth-error">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Couldn't verify your sign-in</AlertTitle>
                  <AlertDescription className="space-y-2">
                    <p>
                      The sign-in check failed, so the form is locked. This is
                      usually a temporary network problem.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => refetchAuth()}
                      data-testid="button-auth-retry"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : !isAuthenticated ? (
                <Alert className="mb-6 border-yellow-500/50 bg-yellow-500/10" data-testid="alert-login-required">
                  <LogIn className="h-4 w-4 text-yellow-500" />
                  <AlertTitle className="text-yellow-500">Login required to submit</AlertTitle>
                  <AlertDescription>
                    The form below is read-only. Please{" "}
                    <a href="/login?next=%2Fsubmit" className="inline-flex items-center min-h-[24px] align-middle underline" data-testid="link-login">log in</a>{" "}
                    to submit a resource.
                  </AlertDescription>
                </Alert>
              ) : null}
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
                            {/* Run16 BUG-061: the server hard-blocks duplicate
                                URLs with a 409 — the old copy promised "you
                                can still submit", which was never true. */}
                            This URL is already in the catalog.
                            <br />
                            <span className="text-xs text-muted-foreground mt-1 block">
                              It can't be submitted again — if something about the existing entry is wrong, use "Suggest Edit" on the resource page instead.
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
                    onClick={() => {
                      // BUG-033 (run14): don't silently discard a filled form.
                      // NB-054 (run18): native window.confirm() replaced with the
                      // app's styled AlertDialog — visually consistent, keyboard
                      // accessible, and themable (native confirm is neither).
                      if (isDirty) {
                        setShowDiscardConfirm(true);
                        return;
                      }
                      setLocation('/');
                    }}
                    disabled={submitMutation.isPending}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                </div>

                {/* NB-054 (run18): styled discard-confirmation dialog */}
                <AlertDialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
                  <AlertDialogContent data-testid="dialog-discard-confirm">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Discard your unsaved submission?</AlertDialogTitle>
                      <AlertDialogDescription>
                        You have unsaved changes in this form. Leaving now will
                        discard everything you've entered.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel data-testid="button-discard-cancel">
                        Keep editing
                      </AlertDialogCancel>
                      <AlertDialogAction
                        data-testid="button-discard-confirm"
                        onClick={() => setLocation('/')}
                      >
                        Discard
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
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
