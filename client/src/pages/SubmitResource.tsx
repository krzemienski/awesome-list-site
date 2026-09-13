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
import { serverConversionHeaders } from "@/lib/mixpanel";
import SEOHead from "@/components/layout/SEOHead";
import { submitSeoTitle, submitSeoDescription } from "@shared/seo-templates";
import "@/styles/pages/submit.css";

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
    // Run22 BUG-021: an EMPTY description used to surface the misleading
    // "must be at least 10 characters" — say what's actually wrong first.
    .min(1, "Description is required")
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
  const [duplicateResource, setDuplicateResource] = useState(false);

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
    let cancelled = false;
    const checkDuplicateUrl = async () => {
      // Only check if URL is valid and starts with https://
      if (!debouncedUrl?.startsWith("https://")) {
        setDuplicateResource(false);
        return;
      }

      try {
        const response = await fetch(`/api/resources/check-url?url=${encodeURIComponent(debouncedUrl)}`);
        // The public endpoint exposes existence only, not resource details.
        const data = (await response.json()) as {
          exists?: boolean;
        };

        if (!cancelled) setDuplicateResource(data.exists === true);
      } catch {
        // Silently handle errors - don't block the user
        if (!cancelled) setDuplicateResource(false);
      }
    };

    void checkDuplicateUrl();
    return () => { cancelled = true; };
  }, [debouncedUrl]);

  // R4-055: draft persistence + unload guard so an accidental refresh, tab
  // close, or navigation no longer destroys everything typed into /submit.
  // R5-015 (run24): drafts are now stored as a versioned envelope
  // { values, updatedAt } — before every write we re-read storage and skip the
  // write when another tab has stored a NEWER draft (a stale tab can no longer
  // clobber fresher content), and a `storage` listener hot-loads external
  // changes into this tab's form within a second.
  // R5-016 (run24): the draft is private state — restore ONLY when
  // authenticated, and the logout path (useAuth) removes the key so the next
  // (possibly different) visitor on this device never inherits it.
  const draftRestoredRef = useRef(false);
  const draftSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Timestamp of the newest draft THIS tab has loaded or written.
  const draftSeenAtRef = useRef(0);

  const draftHasContent = (v: Partial<SubmitResourceFormData>) =>
    !!(v.title || v.url || v.description || v.tags || v.category);

  // Parse either the versioned envelope or a legacy flat draft.
  const parseDraft = (
    raw: string,
  ): { values: Partial<SubmitResourceFormData>; updatedAt: number } | null => {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && "values" in parsed) {
        return {
          values: parsed.values as Partial<SubmitResourceFormData>,
          updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0,
        };
      }
      return { values: parsed as Partial<SubmitResourceFormData>, updatedAt: 0 };
    } catch {
      return null;
    }
  };

  // Restore a saved draft once auth has confirmed (R5-016) — before the
  // auto-save subscription is wired (draftRestoredRef gates saving until the
  // restore has run so we never clobber the stored draft with empty defaults).
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      // Anonymous visitors get a pristine form and never trigger a restore.
      draftRestoredRef.current = true;
      return;
    }
    if (draftRestoredRef.current) return;
    const saved = safeGetItem(DRAFT_KEY);
    if (saved) {
      const draft = parseDraft(saved);
      if (!draft) {
        safeRemoveItem(DRAFT_KEY);
      } else if (draftHasContent(draft.values)) {
        form.reset({ ...form.getValues(), ...draft.values });
        draftSeenAtRef.current = draft.updatedAt;
        toast({
          title: "Draft restored",
          description:
            "We brought back your unsaved submission — pick up where you left off.",
        });
      }
    }
    draftRestoredRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated]);

  // Debounced auto-save of the in-progress form to localStorage.
  useEffect(() => {
    const subscription = form.watch((values) => {
      if (!draftRestoredRef.current) return;
      if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current);
      draftSaveTimer.current = setTimeout(() => {
        // R5-015: last-write-wins with a staleness check — if another tab has
        // written a NEWER draft since we last loaded/wrote, do NOT overwrite
        // it with this tab's stale snapshot (the storage listener below will
        // pull the newer content in instead).
        const current = safeGetItem(DRAFT_KEY);
        if (current) {
          const stored = parseDraft(current);
          if (stored && stored.updatedAt > draftSeenAtRef.current) return;
        }
        if (draftHasContent(values)) {
          const updatedAt = Date.now();
          safeSetItem(DRAFT_KEY, JSON.stringify({ values, updatedAt }));
          draftSeenAtRef.current = updatedAt;
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

  // R5-015: live cross-tab propagation — the `storage` event fires only in
  // OTHER tabs, so when tab B saves a newer draft (or logout removes the key),
  // this tab reflects it without a reload.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== DRAFT_KEY) return;
      if (e.newValue === null) {
        // Draft cleared elsewhere (logout or emptied form): reset if we were
        // showing draft content and have no newer local edits in flight.
        draftSeenAtRef.current = 0;
        return;
      }
      const draft = parseDraft(e.newValue);
      if (!draft || draft.updatedAt <= draftSeenAtRef.current) return;
      draftSeenAtRef.current = draft.updatedAt;
      form.reset({ ...form.getValues(), ...draft.values });
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        // serverConversionHeaders: consent + Mixpanel distinct-id so the
        // server can emit the resource_submitted conversion (Task 233).
        headers: serverConversionHeaders(),
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
      void queryClient.invalidateQueries({ queryKey: ['/api/user/contributions'] });
      
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

      <div className="submit-page">
        <div className="submit-eyebrow">
          <Plus aria-hidden="true" />
          SUBMIT A RESOURCE
        </div>
        <h1 className="submit-title">
          Add to the <span className="serif-italic submit-title-accent">index</span>
        </h1>
        <p className="submit-lede">
          Submit a tool, library, paper, or talk. We hand-review every entry before it lands in the catalog.
        </p>

        {/* Success Message */}
        {showSuccess && (
          <Card className="submit-success-card"> {/* DS-OK: status ok */}
            <CardHeader className="submit-success-header">
              <div className="submit-success-heading">
                <CheckCircle aria-hidden="true" />
                <div>
                  <CardTitle>Submission Successful!</CardTitle>
                  <CardDescription>
                    Your resource is pending review. You can submit another resource below.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="submit-success-content"> {/* DS-OK: status ok */}
              <p>
                Track review status and outcomes in your private contribution timeline.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/contributions")}
                data-testid="link-submission-contributions"
              >
                View your contributions
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Canonical SubmitPage form card. */}
        <Card className="submit-form-card">
          <CardContent className="submit-form-card-content">
            <Form {...form}>
              {authLoading ? (
                <Alert className="submit-auth-alert" data-testid="alert-auth-loading">
                  <Loader2 className="submit-alert-icon animate-spin" />
                  <AlertTitle>Verifying sign-in…</AlertTitle>
                  <AlertDescription>
                    Checking your session. The form unlocks in a moment.
                  </AlertDescription>
                </Alert>
              ) : authFailed ? (
                <Alert variant="destructive" className="submit-auth-alert" data-testid="alert-auth-error">
                  <AlertTriangle className="submit-alert-icon" />
                  <AlertTitle>Couldn&apos;t verify your sign-in</AlertTitle>
                  <AlertDescription className="submit-alert-description">
                    <p>
                      The sign-in check failed, so the form is locked. This is
                      usually a temporary network problem.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        void refetchAuth();
                      }}
                      data-testid="button-auth-retry"
                    >
                      <RefreshCw aria-hidden="true" />
                      Retry
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : !isAuthenticated ? (
                <Alert className="submit-auth-alert submit-login-alert" data-testid="alert-login-required"> {/* DS-OK: status warn */}
                  <LogIn className="submit-alert-icon" /> {/* DS-OK: status warn */}
                  <AlertTitle>Login required to submit</AlertTitle> {/* DS-OK: status warn */}
                  <AlertDescription>
                    The form below is read-only. Please{" "}
                    <a href="/sign-in?redirect_url=%2Fsubmit" data-testid="link-login">log in</a>{" "}
                    to submit a resource.
                  </AlertDescription>
                </Alert>
              ) : null}
              {/* Run3 audit R3-04: explicit method="post" — submission goes via
                  fetch (react-hook-form onSubmit), but if JS ever fails the
                  browser must not leak form fields into the URL as a GET. */}
              <form
                method="post"
                onSubmit={(e) => void form.handleSubmit(onSubmit, onInvalid)(e)}
                className="submit-form"
                noValidate
              >
                {/* Fields are disabled for logged-out visitors — they can see the
                    form layout as a preview but cannot fill or submit it (BUG-018). */}
                <fieldset disabled={!isAuthenticated} className="submit-fields">
                  {/* Title Field */}
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem className="submit-field">
                        <FormLabel className="submit-label">Title</FormLabel>
                        <FormControl>
                          <Input
                            className="submit-control"
                            placeholder="e.g. ffmpeg-python"
                            {...field}
                            data-testid="input-title"
                          />
                        </FormControl>
                        <FormDescription className="submit-help">
                          A clear, descriptive title for the resource (1-200 characters)
                        </FormDescription>
                        <FormMessage className="submit-error" />
                      </FormItem>
                    )}
                  />

                  {/* URL Field */}
                  <FormField
                    control={form.control}
                    name="url"
                    render={({ field }) => (
                      <FormItem className="submit-field">
                        <FormLabel className="submit-label">URL</FormLabel>
                        <FormControl>
                          <Input
                            className="submit-control"
                            placeholder="https://github.com/..."
                            type="url"
                            autoComplete="url"
                            {...field}
                            data-testid="input-url"
                          />
                        </FormControl>
                        <FormDescription className="submit-help">
                          Must be a valid HTTPS URL
                        </FormDescription>
                        <FormMessage className="submit-error" />

                        {/* Duplicate URL Warning */}
                        {duplicateResource && (
                          <Alert className="submit-inline-alert"> {/* DS-OK: status warn */}
                            <AlertCircle className="submit-alert-icon" /> {/* DS-OK: status warn */}
                            <AlertTitle>Duplicate URL Detected</AlertTitle> {/* DS-OK: status warn */}
                            <AlertDescription>
                              {/* Run16 BUG-061: the server hard-blocks duplicate
                                  URLs with a 409 — the old copy promised "you
                                  can still submit", which was never true. */}
                              This URL is already in the catalog.
                              <br />
                              <span>
                                It can&apos;t be submitted again — if something about the existing entry is wrong, use &quot;Suggest Edit&quot; on the resource page instead.
                              </span>
                            </AlertDescription>
                          </Alert>
                        )}
                      </FormItem>
                    )}
                  />

                  {/* Canonical category + tags row. */}
                  <div className="submit-form-row">
                    {/* Category Field */}
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem className="submit-field">
                          <FormLabel className="submit-label">Category</FormLabel>
                          {/* R3-04: name gives the hidden native select a non-empty
                              name; the visible trigger is labeled via FormLabel. */}
                          <Select name={field.name} onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="submit-control" data-testid="select-category">
                                <SelectValue placeholder="Select…" />
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
                          <FormDescription className="submit-help">
                            Choose the most relevant category for this resource
                          </FormDescription>
                          <FormMessage className="submit-error" />
                        </FormItem>
                      )}
                    />

                    {/* Tags Field */}
                    <FormField
                      control={form.control}
                      name="tags"
                      render={({ field }) => (
                        <FormItem className="submit-field">
                          <FormLabel className="submit-label">Tags</FormLabel>
                          <FormControl>
                            <Input
                              className="submit-control"
                              placeholder="comma,separated"
                              {...field}
                              data-testid="input-tags"
                            />
                          </FormControl>
                          <FormDescription className="submit-help">
                            Add up to 10 tags, separated by commas
                          </FormDescription>
                          <FormMessage className="submit-error" />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Extra taxonomy fields are real API-backed inputs. They stay
                      hidden until a parent taxonomy has been selected, preserving
                      the canonical empty form without dropping the fields. */}
                  {filteredSubcategories.length > 0 && (
                    <FormField
                      control={form.control}
                      name="subcategory"
                      render={({ field }) => (
                        <FormItem className="submit-field submit-taxonomy-field">
                          <FormLabel className="submit-label">Subcategory (Optional)</FormLabel>
                          <Select name={field.name} onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="submit-control" data-testid="select-subcategory">
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
                          <FormDescription className="submit-help">
                            Narrow down the classification (optional)
                          </FormDescription>
                          <FormMessage className="submit-error" />
                        </FormItem>
                      )}
                    />
                  )}

                  {filteredSubSubcategories.length > 0 && (
                    <FormField
                      control={form.control}
                      name="subSubcategory"
                      render={({ field }) => (
                        <FormItem className="submit-field submit-taxonomy-field">
                          <FormLabel className="submit-label">Specific Topic (Optional)</FormLabel>
                          <Select name={field.name} onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="submit-control" data-testid="select-subsubcategory">
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
                          <FormDescription className="submit-help">
                            Further specify the topic (optional)
                          </FormDescription>
                          <FormMessage className="submit-error" />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Description Field */}
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem className="submit-field">
                        <FormLabel className="submit-label">Description</FormLabel>
                        <FormControl>
                          <Textarea
                            className="submit-control submit-description-control"
                            placeholder="What does this do? Why is it useful?"
                            {...field}
                            data-testid="input-description"
                          />
                        </FormControl>
                        <FormDescription className="submit-help">
                          Provide a detailed description (10-1000 characters)
                        </FormDescription>
                        <FormMessage className="submit-error" />
                      </FormItem>
                    )}
                  />
                </fieldset>

                {/* Canonical actions stay in one right-aligned row. */}
                <div className="submit-actions">
                  <Button
                    type="button"
                    variant="outline"
                    className="submit-cancel-button"
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
                  <Button
                    type="submit"
                    disabled={submitMutation.isPending || !isAuthenticated}
                    className="submit-submit-button"
                    data-testid="button-submit"
                  >
                    {submitMutation.isPending ? (
                      <>
                        <Loader2 aria-hidden="true" className="animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Plus aria-hidden="true" />
                        Submit for review
                      </>
                    )}
                  </Button>
                </div>

                {/* NB-054 (run18): styled discard-confirmation dialog */}
                <AlertDialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
                  <AlertDialogContent data-testid="dialog-discard-confirm">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Discard your unsaved submission?</AlertDialogTitle>
                      <AlertDialogDescription>
                        You have unsaved changes in this form. Leaving now will
                        discard everything you&apos;ve entered.
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
      </div>
    </>
  );
}
