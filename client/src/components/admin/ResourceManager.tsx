import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiRequest, ApiError } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  ExternalLink,
  Database,
  Filter,
  X,
  Save,
  CheckCircle2
} from "lucide-react";
import type { Resource, Category, Subcategory, SubSubcategory } from "@shared/schema";
// Task 275: same fast numbered + jump pagination as the public listings.
import { Paginator } from "@/components/ui/paginator";
import { parsePageFromSearch } from "@/lib/page-param";
// BUG-049: client-side validation mirrors the server's shared schemas so the
// dialog flags bad input inline instead of only failing server-side.
import { resourceTitleSchema, resourceDescriptionSchema, webUrlSchema, httpsUrlSchema } from "@shared/validation";
import {
  RESOURCE_FORMAT_LABELS,
  RESOURCE_FORMAT_VALUES,
  RESOURCE_PROVIDER_LABELS,
  RESOURCE_PROVIDER_VALUES,
  RESOURCE_SKILL_LEVEL_LABELS,
  RESOURCE_SKILL_LEVEL_VALUES,
  type ResourceFormat,
  type ResourceProvider,
  type ResourceSkillLevel,
} from "@shared/resourceFacets";
import {
  RESOURCE_KIND_VALUES,
  resolveResourceKindFrom,
  resourceKindSchema,
  type ResourceKind,
} from "@shared/resourceKinds";
import "@/styles/pages/admin-catalog-resources.css";

const RESOURCE_KIND_LABELS: Record<ResourceKind, string> = {
  tools: "Tools",
  libraries: "Libraries",
  standards: "Standards",
  events: "Events",
  protocols: "Protocols",
  other: "Other",
};
const resourceKindLabel = (kind: ResourceKind) => RESOURCE_KIND_LABELS[kind];
type ResourceMetadata = Record<string, unknown> & { featured?: boolean };
type AdminResourceWire = Omit<Resource, "kind" | "metadata"> & {
  kind: ResourceKind | null;
  metadata: ResourceMetadata | null;
};
type AdminResource = Omit<AdminResourceWire, "metadata"> & {
  metadata: ResourceMetadata | null;
  resolvedKind: ResourceKind;
};
type ResourcePatchResponse = AdminResourceWire;

const safeResourceMetadata = (metadata: unknown): ResourceMetadata | null => {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  return metadata as ResourceMetadata;
};

const safeResourceMetadataTags = (
  metadata: ResourceMetadata | null,
): readonly unknown[] | undefined => {
  const tags = metadata?.tags;
  return Array.isArray(tags) ? tags : undefined;
};

const normalizeAdminResource = (resource: AdminResourceWire): AdminResource => {
  const metadata = safeResourceMetadata(resource.metadata);
  const parsedKind = resourceKindSchema.safeParse(resource.kind);
  const kind = parsedKind.success ? parsedKind.data : null;
  const resolvedKind = resolveResourceKindFrom({
    storedKind: kind,
    tags: safeResourceMetadataTags(metadata),
    taxonomy: [resource.category, resource.subcategory, resource.subSubcategory],
  }).kind;
  return { ...resource, kind, metadata, resolvedKind };
};

const featuredValue = (resource: AdminResource) => resource.metadata?.featured === true;

const formatResourceUpdatedAt = (updatedAt: Date | string | null | undefined) => {
  if (!updatedAt) return "—";
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

interface ResourcesResponse {
  resources: AdminResource[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface AdminResourcesWireResponse {
  resources: AdminResourceWire[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const normalizeAdminResourcesResponse = (
  response: AdminResourcesWireResponse,
): ResourcesResponse => ({
  ...response,
  resources: response.resources.map(normalizeAdminResource),
});

/* WP-6 a11y: black ink on mid-tone badges — white on -500 tones is 2.3–3.8:1 (fails AA). */
/**
 * Status badge colors use the global DS status constants rather than raw
 * Tailwind palette classes.
 */
const STATUS_OPTIONS = [
  { value: "approved", label: "Approved", color: "bg-[#34d08c] text-black" }, // DS-OK: status ok
  { value: "pending", label: "Pending", color: "bg-[#ffb84d] text-black" }, // DS-OK: status warn
  { value: "rejected", label: "Rejected", color: "bg-[#ff5c7a] text-black" } // DS-OK: status bad
];

export default function ResourceManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Task 275: honor ?page= on load so the paginator's real hrefs
  // (copy-link / cmd-click) actually land on the linked page.
  const [page, setPage] = useState(() => parsePageFromSearch(window.location.search).page);
  // Run16 BUG-035: page size + sort are now user-selectable.
  const [limit, setLimit] = useState(25);
  const [sort, setSort] = useState<"newest" | "oldest" | "name-asc" | "name-desc">("newest");
  const [search, setSearch] = useState("");
  const [catalogToolsOpen, setCatalogToolsOpen] = useState(false);
  // Audit2 BUG-003: debounce the search text into the query key. Every
  // keystroke used to swap the queryKey immediately; the fresh key had no
  // cached data, `isLoading` went true, and the whole component fell into the
  // skeleton branch — unmounting the search input mid-typing (text truncated
  // to the first character, focus lost, one request per remount, and rapid
  // typing could hang the page). Debounce + keepPreviousData keep the form
  // mounted and send ONE request for the full string.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  // P1-04: seed the status filter from ?status= on first load so a deep-link
  // (the dashboard's "N rejected" stat) and a plain reload/bookmark of
  // /admin?tab=resources&status=rejected both land on the same filtered table.
  const [statusFilter, setStatusFilter] = useState<string>(() => {
    const s = new URLSearchParams(window.location.search).get("status");
    return s && STATUS_OPTIONS.some(o => o.value === s) ? s : "approved";
  });

  // Task 275: mirror the effective page into ?page= (replaceState, no history
  // spam) so the paginator's hrefs stay honest and refresh keeps your place.
  useEffect(() => {
    const url = new URL(window.location.href);
    const current = url.searchParams.get("page");
    const want = page > 1 ? String(page) : null;
    if (current === want) return;
    if (want) url.searchParams.set("page", want);
    else url.searchParams.delete("page");
    window.history.replaceState({}, "", url.pathname + url.search + url.hash);
  }, [page]);

  // P1-04: keep ?status= in sync with the active status filter (replaceState,
  // no history spam) so the deep-linked/filtered view round-trips on reload,
  // share, and bookmark — and clearing the filter removes the param instead of
  // leaving a stale ?status=rejected behind.
  useEffect(() => {
    const url = new URL(window.location.href);
    const current = url.searchParams.get("status");
    const want = statusFilter || null;
    if (current === want) return;
    if (want) url.searchParams.set("status", want);
    else url.searchParams.delete("status");
    window.history.replaceState({}, "", url.pathname + url.search + url.hash);
  }, [statusFilter]);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<AdminResource | null>(null);
  const [selectedResourceIds, setSelectedResourceIds] = useState<number[]>([]);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  // R2-H04 companion: bulk hard-delete needs an explicit confirmation dialog.
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  // R4-054: Bulk Approve was the only batch action firing instantly — it now
  // confirms first (stating the exact count), matching bulk reject/delete.
  const [bulkApproveDialogOpen, setBulkApproveDialogOpen] = useState(false);

  // BUG-049: per-field inline errors + a dialog-level banner for server 400s.
  const [fieldErrors, setFieldErrors] = useState<{ title?: string; url?: string; description?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  // Catalog controls use narrow PATCH endpoints. Keep failures next to the
  // control that initiated them so an error never closes/remounts the dialog.
  const [resourceActionErrors, setResourceActionErrors] = useState<Record<string, string>>({});

  const [editForm, setEditForm] = useState({
    title: "",
    url: "",
    description: "",
    category: "",
    subcategory: "",
    subSubcategory: "",
    resourceFormat: "unknown" as ResourceFormat,
    provider: "unknown" as ResourceProvider,
    skillLevel: "unknown" as ResourceSkillLevel,
    kind: "" as ResourceKind | "",
    featured: false,
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

  const { data: publicCatalogNav } = useQuery<{ totalResources?: number }>({
    queryKey: ['/api/awesome-list/nav']
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

  const { data, isLoading, isError, refetch } = useQuery<ResourcesResponse>({
    queryKey: ['/api/admin/resources', page, limit, debouncedSearch, categoryFilter, statusFilter, sort],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', limit.toString());
      if (sort !== 'newest') params.set('sort', sort);
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (categoryFilter) params.set('category', categoryFilter);
      if (statusFilter) params.set('status', statusFilter);
      const response = await fetch(`/api/admin/resources?${params.toString()}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new ApiError(response.status, 'Failed to fetch resources');
      return normalizeAdminResourcesResponse(
        (await response.json()) as AdminResourcesWireResponse,
      );
    },
    // Audit2 BUG-003: hold the previous page while a new key fetches so the
    // table (and the search input above it) never unmounts between requests.
    placeholderData: keepPreviousData,
    refetchInterval: 30000,
    // R5-037: refresh admin data when the operator returns to the tab.
    staleTime: 30_000,
    refetchOnWindowFocus: true
  });

  // Task 275: clamp an out-of-range page (stale ?page= link, shrunk result
  // set) back to the last real page instead of showing an empty table.
  const totalPages = data?.totalPages || 1;
  useEffect(() => {
    if (data && page > totalPages) setPage(totalPages);
  }, [data, page, totalPages]);

  // Run17 BUG-028: unfiltered grand total so the header never claims
  // "Manage all 0 resources" while a filter is active.
  const { data: grandTotalData } = useQuery<ResourcesResponse>({
    queryKey: ['/api/admin/resources', 'grand-total'],
    queryFn: async () => {
      const response = await fetch('/api/admin/resources?page=1&limit=1', {
        credentials: 'include'
      });
      if (!response.ok) throw new ApiError(response.status, 'Failed to fetch resource total');
      return normalizeAdminResourcesResponse(
        (await response.json()) as AdminResourcesWireResponse,
      );
    },
    staleTime: 60000
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<AdminResource> }) => {
      return await apiRequest(`/api/admin/resources/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/resources'] });
      queryClient.invalidateQueries({ queryKey: ['/api/resources'] });
      queryClient.invalidateQueries({ queryKey: ["awesome-list-data"] });
      queryClient.invalidateQueries({ queryKey: ["awesome-list-nav"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setEditDialogOpen(false);
      setSelectedResource(null);
      toast({
        title: "Resource Updated",
        description: "The resource has been successfully updated.",
      });
    },
    onError: (error: Error) => {
      // BUG-049: keep the dialog open and surface the server's message inline
      // so the operator can correct the field, not just see a vanishing toast.
      setFormError(error.message || "Failed to update resource");
    }
  });

  const invalidateResourceCaches = (resourceId?: number) => {
    void queryClient.invalidateQueries({ queryKey: ['/api/admin/resources'] });
    void queryClient.invalidateQueries({ queryKey: ['/api/admin/audit-logs'] });
    void queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
    void queryClient.invalidateQueries({ queryKey: ['/api/resources'] });
    void queryClient.invalidateQueries({ queryKey: ['/api/resources/kinds/counts'] });
    void queryClient.invalidateQueries({ queryKey: ["awesome-list-data"] });
    void queryClient.invalidateQueries({ queryKey: ["awesome-list-nav"] });
    if (resourceId !== undefined) {
      // ResourceDetail uses the split key while older resource controls use
      // the exact URL key; invalidate both rather than relying on a prefix.
      void queryClient.invalidateQueries({ queryKey: ["/api/resources", String(resourceId)] });
      void queryClient.invalidateQueries({ queryKey: [`/api/resources/${resourceId}`] });
    }
  };

  const patchAdminResourceCaches = (id: number, patch: Partial<AdminResource>) => {
    const snapshots = queryClient.getQueriesData<ResourcesResponse>({
      queryKey: ['/api/admin/resources'],
    });
    snapshots.forEach(([queryKey, snapshot]) => {
      if (!snapshot?.resources) return;
      queryClient.setQueryData<ResourcesResponse>(queryKey, {
        ...snapshot,
        resources: snapshot.resources.map((resource) =>
          resource.id === id ? { ...resource, ...patch } : resource,
        ),
      });
    });
    return snapshots;
  };

  const clearResourceActionError = (key: string) => {
    setResourceActionErrors((previous) => {
      if (!previous[key]) return previous;
      const next = { ...previous };
      delete next[key];
      return next;
    });
  };

  const reconcilePatchedResource = (
    id: number,
    updated: ResourcePatchResponse,
    field: "kind" | "featured",
  ) => {
    const normalized = normalizeAdminResource(updated);
    patchAdminResourceCaches(id, {
      ...normalized,
    });

    setSelectedResource((resource) => {
      if (resource?.id !== id) return resource;
      return normalized;
    });

    if (field === "kind") {
      setEditForm((form) => ({ ...form, kind: normalized.kind ?? "" }));
    } else {
      setEditForm((form) => ({
        ...form,
        featured: featuredValue(normalized),
      }));
    }
  };

  const kindMutation = useMutation({
    mutationFn: async ({ id, kind }: { id: number; kind: ResourceKind | null }) => {
      const updated = (await apiRequest(`/api/admin/resources/${id}/kind`, {
        method: 'PATCH',
        body: JSON.stringify({ kind }),
      })) as ResourcePatchResponse;
      return updated;
    },
    onMutate: async ({ id, kind }) => {
      await queryClient.cancelQueries({ queryKey: ['/api/admin/resources'] });
      clearResourceActionError(`kind:${id}`);
      const current = data?.resources.find((resource) => resource.id === id) ?? selectedResource;
      const previousResource = current ? { ...current } : undefined;
      const snapshots = patchAdminResourceCaches(id, {
        kind,
        // The list stays responsive while the PATCH is in flight. Its
        // read-time inferred kind is reconciled from the server response below.
        resolvedKind: kind ?? current?.resolvedKind ?? "other",
      });
      setSelectedResource((resource) =>
        resource?.id === id
          ? { ...resource, kind, resolvedKind: kind ?? resource.resolvedKind }
          : resource,
      );
      return { snapshots, previousResource };
    },
    onSuccess: (updated, { id }) => {
      reconcilePatchedResource(id, updated, "kind");
      clearResourceActionError(`kind:${id}`);
    },
    onError: (error, { id }, context) => {
      context?.snapshots?.forEach(([queryKey, snapshot]) => {
        queryClient.setQueryData<ResourcesResponse>(queryKey, snapshot);
      });
      const previous = context?.previousResource;
      if (previous) {
        setSelectedResource((resource) => resource?.id === id ? previous : resource);
        setEditForm((form) => ({ ...form, kind: previous.kind ?? "" }));
      }
      setResourceActionErrors((previousErrors) => ({
        ...previousErrors,
        [`kind:${id}`]: error instanceof Error ? error.message : "Failed to update resource kind",
      }));
    },
    onSettled: (_updated, _error, { id }) => {
      invalidateResourceCaches(id);
    },
  });

  const featuredMutation = useMutation({
    mutationFn: async ({ id, featured }: { id: number; featured: boolean }) => {
      const updated = (await apiRequest(`/api/admin/resources/${id}/featured`, {
        method: 'PATCH',
        body: JSON.stringify({ featured }),
      })) as ResourcePatchResponse;
      return updated;
    },
    onMutate: async ({ id, featured }) => {
      await queryClient.cancelQueries({ queryKey: ['/api/admin/resources'] });
      clearResourceActionError(`featured:${id}`);
      const current = data?.resources.find((resource) => resource.id === id) ?? selectedResource;
      const previousFeatured = current ? featuredValue(current) : false;
      const snapshots = patchAdminResourceCaches(id, {
        metadata: { ...(current?.metadata ?? {}), featured },
      });
      setSelectedResource((resource) =>
        resource?.id === id
          ? { ...resource, metadata: { ...(resource.metadata ?? {}), featured } }
          : resource,
      );
      return { snapshots, previousFeatured };
    },
    onSuccess: (updated, { id }) => {
      reconcilePatchedResource(id, updated, "featured");
      clearResourceActionError(`featured:${id}`);
    },
    onError: (error, { id }, context) => {
      context?.snapshots?.forEach(([queryKey, snapshot]) => {
        queryClient.setQueryData<ResourcesResponse>(queryKey, snapshot);
      });
      const previousFeatured = context?.previousFeatured ?? false;
      setSelectedResource((resource) =>
        resource?.id === id
          ? { ...resource, metadata: { ...(resource.metadata ?? {}), featured: previousFeatured } }
          : resource,
      );
      setEditForm((form) => ({ ...form, featured: previousFeatured }));
      setResourceActionErrors((previousErrors) => ({
        ...previousErrors,
        [`featured:${id}`]: error instanceof Error ? error.message : "Failed to update featured status",
      }));
    },
    onSettled: (_updated, _error, { id }) => {
      invalidateResourceCaches(id);
    },
  });

  // PATCH mutations share cache snapshots, so serialize them rather than
  // allowing a second optimistic edit to roll back the first one.
  const resourcePatchPending = kindMutation.isPending || featuredMutation.isPending;
  const editControlsPending = resourcePatchPending || updateMutation.isPending;

  const createMutation = useMutation({
    mutationFn: async (data: Partial<AdminResource>) => {
      return await apiRequest('/api/admin/resources', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/resources'] });
      queryClient.invalidateQueries({ queryKey: ['/api/resources'] });
      queryClient.invalidateQueries({ queryKey: ["awesome-list-data"] });
      queryClient.invalidateQueries({ queryKey: ["awesome-list-nav"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setCreateDialogOpen(false);
      resetEditForm();
      toast({
        title: "Resource Created",
        description: "The new resource has been added successfully.",
      });
    },
    onError: (error: Error) => {
      // BUG-049: surface server-side rejection inline in the open dialog.
      setFormError(error.message || "Failed to create resource");
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
      queryClient.invalidateQueries({ queryKey: ["awesome-list-data"] });
      queryClient.invalidateQueries({ queryKey: ["awesome-list-nav"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
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
      queryClient.invalidateQueries({ queryKey: ["awesome-list-data"] });
      queryClient.invalidateQueries({ queryKey: ["awesome-list-nav"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
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
      queryClient.invalidateQueries({ queryKey: ["awesome-list-data"] });
      queryClient.invalidateQueries({ queryKey: ["awesome-list-nav"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
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
      queryClient.invalidateQueries({ queryKey: ["awesome-list-data"] });
      queryClient.invalidateQueries({ queryKey: ["awesome-list-nav"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
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
    // BUG-049: stale errors must not carry over into a fresh dialog.
    setFieldErrors({});
    setFormError(null);
    setResourceActionErrors({});
    setEditForm({
      title: "",
      url: "",
      description: "",
      category: "",
      subcategory: "",
      subSubcategory: "",
      resourceFormat: "unknown",
      provider: "unknown",
      skillLevel: "unknown",
      kind: "",
      featured: false,
      status: "approved"
    });
  };

  // P1-06: remember the control that opened the (shared) edit dialog so focus
  // returns there on close (Radix onCloseAutoFocus) instead of falling to
  // <body> — keyboard/AT users keep their place in the table row.
  const editTriggerRef = useRef<HTMLElement | null>(null);

  const openEditDialog = (resource: AdminResource) => {
    // Capture the triggering row button (falls back to null for the
    // deep-link path, where there is no in-page trigger to restore to).
    const active = document.activeElement;
    editTriggerRef.current = active instanceof HTMLElement && active !== document.body ? active : null;
    setSelectedResource(resource);
    // BUG-049: fresh dialog, fresh error state.
    setFieldErrors({});
    setFormError(null);
    setResourceActionErrors((previous) => {
      const next = { ...previous };
      delete next[`kind:${resource.id}`];
      delete next[`featured:${resource.id}`];
      return next;
    });
    setEditForm({
      title: resource.title || "",
      url: resource.url || "",
      description: resource.description || "",
      category: resource.category || "",
      subcategory: resource.subcategory || "",
      subSubcategory: resource.subSubcategory || "",
      resourceFormat: resource.resourceFormat || "unknown",
      provider: resource.provider || "unknown",
      skillLevel: resource.skillLevel || "unknown",
      kind: resource.kind ?? "",
      featured: featuredValue(resource),
      status: resource.status || "approved"
    });
    setEditDialogOpen(true);
  };

  const openCreateDialog = () => {
    resetEditForm();
    // Run16 BUG-031: new resources follow the approval workflow by default —
    // the admin can still explicitly pick "approved" in the dialog.
    setEditForm(prev => ({ ...prev, status: "pending" }));
    setCreateDialogOpen(true);
  };

  // Canonical masthead deep-link: open the existing create workflow, then strip
  // the one-shot flag so refresh and Back do not reopen the modal.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("create") !== "1") return;
    openCreateDialog();
    const url = new URL(window.location.href);
    url.searchParams.delete("create");
    window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // NEW-013: /admin/resources?resourceId=N (ResourceDetail's "Edit in Admin"
  // deep-link) opens that resource's edit dialog directly instead of dumping
  // the admin on an unfiltered table. The param is stripped afterwards so a
  // refresh or tab switch doesn't reopen the dialog.
  const deepLinkHandled = useRef(false);
  useEffect(() => {
    if (deepLinkHandled.current) return;
    deepLinkHandled.current = true;
    const params = new URLSearchParams(window.location.search);
    // P1-04: ?status=rejected|pending|approved is seeded into `statusFilter`'s
    // initial state (above) and kept in the URL by the sync effect, so the
    // filtered view round-trips on reload/share/bookmark. Nothing to strip here.
    const rid = parseInt(params.get("resourceId") || "", 10);
    if (!rid || Number.isNaN(rid)) return;
    const stripParam = () => {
      const url = new URL(window.location.href);
      url.searchParams.delete("resourceId");
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    };
    fetch(`/api/resources/${rid}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((resource: AdminResource) => openEditDialog(resource))
      .catch(() => {
        toast({
          title: "Resource not found",
          description: `Resource #${rid} could not be loaded for editing.`,
          variant: "destructive",
        });
      })
      .finally(stripParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openDeleteDialog = (resource: AdminResource) => {
    setSelectedResource(resource);
    setDeleteDialogOpen(true);
  };

  // Run16 BUG-012 → BUG-049: both dialogs validate with the SAME shared
  // schemas the server enforces (shared/validation.ts) and render the failures
  // inline next to each field instead of toast-only. Edit accepts legacy
  // http:// URLs (server PUT uses webUrlSchema); Create requires https
  // (server POST uses httpsUrlSchema).
  const validateEditForm = (mode: 'edit' | 'create'): boolean => {
    const errors: { title?: string; url?: string; description?: string } = {};
    const titleParsed = resourceTitleSchema.safeParse(editForm.title.trim());
    if (!titleParsed.success) {
      errors.title = titleParsed.error.issues[0]?.message || "Invalid title";
    }
    const urlSchema = mode === 'create' ? httpsUrlSchema : webUrlSchema;
    const urlParsed = urlSchema.safeParse(editForm.url.trim());
    if (!urlParsed.success) {
      errors.url = urlParsed.error.issues[0]?.message || "Invalid URL";
    }
    if (editForm.description.trim()) {
      const descParsed = resourceDescriptionSchema.safeParse(editForm.description.trim());
      if (!descParsed.success) {
        errors.description = descParsed.error.issues[0]?.message || "Invalid description";
      }
    }
    setFieldErrors(errors);
    setFormError(null);
    return Object.keys(errors).length === 0;
  };

  const clearFieldError = (field: 'title' | 'url' | 'description') => {
    setFieldErrors(prev => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  const handleSaveEdit = () => {
    if (!selectedResource) return;
    if (!validateEditForm('edit')) return;
    // Kind and featured are immediate PATCH-owned controls. The general PUT
    // must never replay either value (or its metadata envelope) on Save.
    const fields = { ...editForm };
    delete (fields as Partial<typeof editForm>).kind;
    delete (fields as Partial<typeof editForm>).featured;
    updateMutation.mutate({
      id: selectedResource.id,
      data: fields as Partial<AdminResource>,
    });
  };

  const handleKindChange = (value: string) => {
    const kind = value === "" ? null : (value as ResourceKind);
    setEditForm((form) => ({ ...form, kind: kind ?? "" }));
    if (selectedResource) {
      kindMutation.mutate({ id: selectedResource.id, kind });
    }
  };

  const handleFeaturedChange = (featured: boolean) => {
    setEditForm((form) => ({ ...form, featured }));
    if (selectedResource) {
      featuredMutation.mutate({ id: selectedResource.id, featured });
    }
  };

  const handleCreate = () => {
    if (!validateEditForm('create')) return;
    // Run16 BUG-031: require a category on create so new resources never
    // land in the catalog as "Uncategorized".
    if (!editForm.category) {
      setFormError("Please select a category for the new resource");
      return;
    }
    const { featured, kind, ...fields } = editForm;
    createMutation.mutate({
      ...fields,
      kind: kind || null,
      metadata: { featured },
    } as Partial<AdminResource>);
  };

  const handleDelete = () => {
    if (!selectedResource) return;
    deleteMutation.mutate(selectedResource.id);
  };

  const handleBulkApprove = () => {
    if (selectedResourceIds.length === 0) return;
    setBulkApproveDialogOpen(true);
  };

  const confirmBulkApprove = () => {
    setBulkApproveDialogOpen(false);
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
    setBulkDeleteDialogOpen(true);
  };

  const confirmBulkDelete = () => {
    setBulkDeleteDialogOpen(false);
    bulkDeleteMutation.mutate(selectedResourceIds);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Explicit submit skips the debounce window (Audit2 BUG-003).
    setDebouncedSearch(search);
    setPage(1);
    setSelectedResourceIds([]);
  };

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setCategoryFilter("");
    setStatusFilter("approved");
    setPage(1);
    setSelectedResourceIds([]);
  };

  const getStatusBadge = (status: string) => {
    const statusInfo = STATUS_OPTIONS.find(s => s.value === status);
    return (
      <Badge className={`${statusInfo?.color || 'bg-[var(--surface-3)] text-white'}`}>
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

  // Audit2 BUG-003: only the true first load may show the skeleton. With
  // keepPreviousData above, later key changes (typing, paging, filters) keep
  // `data` populated, so this branch can never unmount the search input
  // mid-typing again.
  if (isLoading && !data) {
    return (
      <Card>
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
    <div className={`admin-catalog-resources space-y-4${catalogToolsOpen ? " admin-catalog-resources--tools-open" : ""}`}>
      <Card className="admin-catalog-resources__shell">
        <CardHeader className="admin-catalog-resources__header">
          <div>
            <CardTitle className="admin-catalog-resources__title flex items-center gap-2">
              <Database className="h-5 w-5" />
              Resources ({data?.resources.length ?? 0} of {Number(publicCatalogNav?.totalResources ?? data?.total ?? 0).toLocaleString()})
            </CardTitle>
            <CardDescription className="admin-catalog-resources__subtitle">
              Manage every entry in the index
              {(search || categoryFilter || (statusFilter && statusFilter !== "approved")) ? " · Filters applied" : ""}
            </CardDescription>
          </div>
          <div className="admin-catalog-resources__header-actions">
            <Input
              placeholder="Search…"
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1); }}
              data-testid="input-search-resources-header"
            />
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCatalogToolsOpen((open) => !open)}
              aria-expanded={catalogToolsOpen}
              data-testid="button-resource-tools"
            >
              More
            </Button>
            <Button onClick={openCreateDialog} data-testid="button-add-resource">
              <Plus className="h-3 w-3 mr-2" />
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="admin-catalog-resources__content space-y-4">
          <form onSubmit={handleSearch} className="admin-catalog-resources__filters flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--text-2)]" />
              <Input
                placeholder="Search by title or URL..."
                value={search}
                /* R4-018: the query key includes `search`, so each keystroke
                   refetches live — reset to page 1 too, or a deep page index
                   survives into a smaller result set ("Page 101 of 11"). */
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-10"
                data-testid="input-search-resources"
              />
            </div>
            {/* Run16 BUG-009: the "All ..." items carry value="all" (Radix forbids
                value=""), but the API treats a literal status/category of "all"
                as a real filter value and matches nothing. Map "all" back to ""
                (= param omitted) so resetting a filter actually resets it. */}
            <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v === "all" ? "" : v); setPage(1); setSelectedResourceIds([]); }}>
              <SelectTrigger className="w-full sm:w-48" aria-label="Filter by category" data-testid="select-category-filter">
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
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === "all" ? "" : v); setPage(1); setSelectedResourceIds([]); }}>
              <SelectTrigger className="w-full sm:w-36" aria-label="Filter by status" data-testid="select-status-filter">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {STATUS_OPTIONS.map(status => (
                  <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Run16 BUG-035: user-selectable sort order (server-side, whitelisted). */}
            <Select value={sort} onValueChange={(v) => { setSort(v as typeof sort); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-40" aria-label="Sort resources" data-testid="select-sort">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
                <SelectItem value="name-asc">Title A–Z</SelectItem>
                <SelectItem value="name-desc">Title Z–A</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" variant="outline" aria-label="Search" data-testid="button-search">
              <Search className="h-4 w-4" />
            </Button>
            {(search || categoryFilter || statusFilter) && (
              <Button type="button" variant="ghost" onClick={clearFilters} aria-label="Clear filters" data-testid="button-clear-filters">
                <X className="h-4 w-4" />
              </Button>
            )}
          </form>

          {selectedResourceIds.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-[var(--surface-2)] border border-[var(--accent)]/30 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-[var(--text)]">
                  {selectedResourceIds.length} {selectedResourceIds.length === 1 ? 'item' : 'items'} selected
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className={"bg-[#34d08c]/10 hover:bg-[#34d08c]/20 border-[#34d08c]/30 text-[#34d08c]" /* DS-OK: status ok */}
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
                    className={"bg-[#ffb84d]/10 hover:bg-[#ffb84d]/20 border-[#ffb84d]/30 text-[#ffb84d]" /* DS-OK: status warn */}
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
                    className={"bg-[#ff5c7a]/10 hover:bg-[#ff5c7a]/20 border-[#ff5c7a]/30 text-[#ff5c7a]" /* DS-OK: status bad */}
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
                className="text-[var(--text-2)] hover:text-[var(--text)]"
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
                    {rejectReason.trim().length}/10 characters minimum
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
                  className={"bg-[#ffb84d] text-black hover:bg-[#ffb84d]/90" /* DS-OK: status warn */}
                >
                  Confirm Rejection
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* R4-054: Bulk Approve Confirmation — states the exact count so a
              batch publish can't fire on a single misclick. */}
          <AlertDialog open={bulkApproveDialogOpen} onOpenChange={setBulkApproveDialogOpen}>
            <AlertDialogContent data-testid="dialog-bulk-approve">
              <AlertDialogHeader>
                <AlertDialogTitle>Approve {selectedResourceIds.length} resource{selectedResourceIds.length === 1 ? '' : 's'}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This publishes the selected resource{selectedResourceIds.length === 1 ? '' : 's'} to the
                  live catalog immediately. You can still edit or remove {selectedResourceIds.length === 1 ? 'it' : 'them'} afterwards.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-testid="button-bulk-approve-cancel">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={confirmBulkApprove}
                  className={"bg-[#34d08c] text-black hover:bg-[#34d08c]/90" /* DS-OK: status ok */}
                  data-testid="button-bulk-approve-confirm"
                >
                  Approve {selectedResourceIds.length}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Bulk Delete Confirmation */}
          <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
            <AlertDialogContent data-testid="dialog-bulk-delete">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {selectedResourceIds.length} resource{selectedResourceIds.length === 1 ? '' : 's'}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently deletes the selected resource{selectedResourceIds.length === 1 ? '' : 's'} from
                  the catalog, including any bookmarks, favorites, and journey references
                  pointing at {selectedResourceIds.length === 1 ? 'it' : 'them'}. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-testid="button-bulk-delete-cancel">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={confirmBulkDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  data-testid="button-bulk-delete-confirm"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Run16 BUG-011: Radix ScrollArea's viewport renders content at
              display:table/min-width:100%, so the table's own overflow-auto
              wrapper grows to full table width and never scrolls horizontally —
              Actions were physically unreachable at 375/768px. A native
              overflow-auto div scrolls BOTH axes. */}
          {/* F016: a failed fetch used to leave a silent empty table — surface
              the error and offer a retry (stale rows stay visible if we have
              them via placeholderData). */}
          {isError && (
            <div
              role="alert"
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3"
              data-testid="banner-resources-error"
            >
              <p className="text-sm text-[var(--text)]">
                {data
                  ? "Refreshing the resource list failed — showing the last loaded results."
                  : "Couldn't load resources. Check your connection and try again."}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                data-testid="button-resources-retry"
              >
                Retry
              </Button>
            </div>
          )}
          <div className="admin-catalog-resources__table-scroll overflow-auto">
            <Table className="admin-catalog-resources__table">
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Featured</TableHead>
                  <TableHead aria-label="Actions" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Run16 BUG-080: explicit empty state instead of a blank table. */}
                {!isLoading && (data?.resources.length || 0) === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-sm text-[var(--text-2)]" data-testid="row-empty-state">
                      {(search || categoryFilter || statusFilter)
                        ? <>No resources match the current search or filters.{' '}
                            <button type="button" className="text-primary underline" onClick={clearFilters} data-testid="button-empty-clear-filters">
                              Clear filters
                            </button></>
                        : "No resources yet."}
                    </TableCell>
                  </TableRow>
                )}
                {data?.resources.map((resource) => (
                  <TableRow
                    key={resource.id}
                    data-testid={`row-resource-${resource.id}`}
                    data-state={selectedResourceIds.includes(resource.id) ? "selected" : undefined}
                  >
                    <TableCell className="admin-catalog-resources__id-cell">
                      <span>{resource.id}</span>
                      <Checkbox
                        checked={selectedResourceIds.includes(resource.id)}
                        onCheckedChange={() => toggleResourceSelection(resource.id)}
                        aria-label={`Select ${resource.title || `resource #${resource.id}`}`}
                        className="admin-catalog-resources__row-select h-8 w-8"
                      />
                    </TableCell>
                    <TableCell>
                        <div className="admin-catalog-resources__resource-title" title={resource.title || ''}>
                          {resource.title || 'Untitled'}
                        </div>
                    </TableCell>
                    <TableCell>
                      {resource.category || "Uncategorized"}
                    </TableCell>
                    <TableCell>
                      <div className="admin-catalog-resources__tags">
                        {(safeResourceMetadataTags(resource.metadata) || []).slice(0, 2).map((tag, index) => (
                          <Badge key={index} variant="chip">
                            {typeof tag === "object" && tag && "name" in tag ? String(tag.name) : String(tag)}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {featuredValue(resource) ? <Badge variant="accent">★</Badge> : <span className="admin-catalog-resources__muted">—</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="admin-catalog-resources__row-actions">
                        <Button variant="ghost" size="sm" asChild>
                          <a href={`/resource/${resource.id}`}>View</a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(resource)}
                          aria-label={`Edit ${resource.title || `resource #${resource.id}`}`}
                          data-testid={`button-edit-${resource.id}`}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="admin-catalog-resources__delete-action"
                          onClick={() => openDeleteDialog(resource)}
                          aria-label={`Delete ${resource.title || `resource #${resource.id}`}`}
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
          </div>
          {/* Run17 BUG-033: same sideways-scroll hint the Users table has. */}
          <p className="admin-catalog-resources__scroll-hint text-xs text-muted-foreground mt-2 sm:hidden">
            Swipe the table sideways to see category, status, and actions.
          </p>

          {/* Run16 BUG-035: page-size selector + first/last jump buttons. */}
          <div className="admin-catalog-resources__pagination-summary flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[var(--border)]">
            <div className="flex items-center gap-3">
              <div className="text-sm text-[var(--text-2)]">
                {/* P1-01: thousands separators everywhere (matches the header
                    and stats card). P1-05: count-aware noun — "1 resource". */}
                {(data?.total || 0) === 0
                  ? "0 resources"
                  : `Showing ${(((page - 1) * limit) + 1).toLocaleString()} - ${Math.min(page * limit, data?.total || 0).toLocaleString()} of ${(data?.total || 0).toLocaleString()} ${(data?.total || 0) === 1 ? 'resource' : 'resources'}`}
              </div>
              <Select value={String(limit)} onValueChange={(v) => { setLimit(parseInt(v, 10)); setPage(1); }}>
                {/* Run17 BUG-034: shrink-0 — flexbox squeezed the trigger below w-28
                    at 375px and ellipsis-clipped "25 / page" to "25 /…". */}
                <SelectTrigger className="w-28 h-8 shrink-0" aria-label="Rows per page" data-testid="select-page-size">
                  <SelectValue />
                </SelectTrigger>
                {/* NB-019 (run18): popper positioning is collision-aware and
                    caps the listbox to --radix-select-content-available-height,
                    so at the table footer it flips up instead of opening below
                    the viewport (or forcing a scroll-lock). */}
                <SelectContent position="popper">
                  <SelectItem value="25">25 / page</SelectItem>
                  <SelectItem value="50">50 / page</SelectItem>
                  <SelectItem value="100">100 / page</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* Task 275: shared numbered paginator (same component as the
              public listings) — any of the 100+ pages is reachable in ≤2
              interactions via the number links or the jump input. */}
          <Paginator
            currentPage={page}
            totalPages={totalPages}
            makeHref={(p) => {
              const url = new URL(window.location.href);
              if (p > 1) url.searchParams.set("page", String(p));
              else url.searchParams.delete("page");
              return url.pathname + url.search + url.hash;
            }}
            onNavigate={(p) => setPage(p)}
            className="admin-catalog-resources__paginator pt-4"
          />
        </CardContent>
      </Card>

      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          if (!open && editControlsPending) return;
          setEditDialogOpen(open);
        }}
      >
        {/* NB-005 (run18): cap height to the small-viewport unit (svh accounts
            for mobile URL bars) and scroll internally so every field + the
            Save/Cancel footer stay reachable at 812×375 landscape. */}
        {/* P1-06: restore focus to the row's edit button on close. Radix's
            default drops focus to <body> because this one Dialog is shared
            across rows rather than nested under a per-row trigger. */}
        <DialogContent
          className="max-w-2xl max-h-[90svh] overflow-y-auto bg-[var(--bg-2)] border-[var(--border)]"
          onCloseAutoFocus={(e) => {
            const trigger = editTriggerRef.current;
            if (trigger && document.contains(trigger)) {
              e.preventDefault();
              trigger.focus();
            }
            editTriggerRef.current = null;
          }}
        >
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
            {/* BUG-049: dialog-level banner for server-side rejections. */}
            {formError && (
              <div
                role="alert"
                className="rounded border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                data-testid="error-edit-form"
              >
                {formError}
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                value={editForm.title}
                onChange={(e) => { clearFieldError('title'); setEditForm(f => ({ ...f, title: e.target.value })); }}
                aria-invalid={!!fieldErrors.title}
                aria-describedby={fieldErrors.title ? "edit-title-error" : undefined}
                data-testid="input-edit-title"
              />
              {fieldErrors.title && (
                <p id="edit-title-error" className="text-sm text-destructive" data-testid="error-edit-title">
                  {fieldErrors.title}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-url">URL *</Label>
              <Input
                id="edit-url"
                value={editForm.url}
                onChange={(e) => { clearFieldError('url'); setEditForm(f => ({ ...f, url: e.target.value })); }}
                aria-invalid={!!fieldErrors.url}
                aria-describedby={fieldErrors.url ? "edit-url-error" : undefined}
                data-testid="input-edit-url"
              />
              {fieldErrors.url && (
                <p id="edit-url-error" className="text-sm text-destructive" data-testid="error-edit-url">
                  {fieldErrors.url}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) => { clearFieldError('description'); setEditForm(f => ({ ...f, description: e.target.value })); }}
                rows={3}
                aria-invalid={!!fieldErrors.description}
                aria-describedby={fieldErrors.description ? "edit-description-error" : undefined}
                data-testid="input-edit-description"
              />
              {fieldErrors.description && (
                <p id="edit-description-error" className="text-sm text-destructive" data-testid="error-edit-description">
                  {fieldErrors.description}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-category">Category</Label>
                <Select 
                  value={editForm.category} 
                  onValueChange={(v) => setEditForm(f => ({ ...f, category: v, subcategory: "", subSubcategory: "" }))}
                >
                  <SelectTrigger id="edit-category" data-testid="select-edit-category">
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
                  <SelectTrigger id="edit-status" data-testid="select-edit-status">
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
                  <SelectTrigger id="edit-subcategory" data-testid="select-edit-subcategory">
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
                  <SelectTrigger id="edit-subsubcategory" data-testid="select-edit-subsubcategory">
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
            <p className="text-xs text-[var(--text-2)]">Kind and featured: Changes save immediately.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="edit-kind">Kind override</Label>
                <div className="admin-catalog-resources__legacy-control" data-testid="select-edit-kind">
                  <select
                    id="edit-kind"
                    className="select admin-catalog-resources__native-select"
                    value={editForm.kind}
                    onChange={(event) => handleKindChange(event.target.value)}
                    disabled={editControlsPending}
                    aria-describedby="edit-kind-hint"
                    data-testid="admin-resource-kind-select"
                  >
                    <option value="">
                      Use inferred — resolved: {selectedResource?.resolvedKind ?? "other"} (inferred)
                    </option>
                    {RESOURCE_KIND_VALUES.map((kind) => (
                      <option key={kind} value={kind}>{resourceKindLabel(kind)}</option>
                    ))}
                  </select>
                </div>
                <p id="edit-kind-hint" className="text-xs text-[var(--text-2)]" data-testid="text-kind-storage-state">
                  {editForm.kind
                    ? `Stored override: ${resourceKindLabel(editForm.kind)}`
                    : `resolved: ${selectedResource?.resolvedKind ?? "other"} (inferred)`}
                </p>
                {selectedResource && resourceActionErrors[`kind:${selectedResource.id}`] && (
                  <p role="alert" className="admin-catalog-resources__action-error" data-testid="error-resource-kind">
                    {resourceActionErrors[`kind:${selectedResource.id}`]}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-featured">Curated placement</Label>
                <div className="admin-catalog-resources__switch-field" data-testid="checkbox-edit-featured">
                  <Switch
                    id="edit-featured"
                    checked={editForm.featured}
                    onCheckedChange={handleFeaturedChange}
                    disabled={editControlsPending}
                    aria-label="Feature this resource"
                    data-testid="admin-resource-featured-toggle"
                  />
                  <span className="text-sm">Feature this resource</span>
                </div>
                <p className="text-xs text-[var(--text-2)]">Drives Curated cards and the Index rail.</p>
                {selectedResource && resourceActionErrors[`featured:${selectedResource.id}`] && (
                  <p role="alert" className="admin-catalog-resources__action-error" data-testid="error-resource-featured">
                    {resourceActionErrors[`featured:${selectedResource.id}`]}
                  </p>
                )}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="edit-resource-format">Format</Label>
                <Select
                  value={editForm.resourceFormat}
                  onValueChange={(v) => setEditForm(f => ({ ...f, resourceFormat: v as ResourceFormat }))}
                >
                  <SelectTrigger id="edit-resource-format" className="min-h-11" data-testid="select-edit-resource-format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RESOURCE_FORMAT_VALUES.map((value) => (
                      <SelectItem key={value} value={value}>{RESOURCE_FORMAT_LABELS[value]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-provider">Provider</Label>
                <Select
                  value={editForm.provider}
                  onValueChange={(v) => setEditForm(f => ({ ...f, provider: v as ResourceProvider }))}
                >
                  <SelectTrigger id="edit-provider" className="min-h-11" data-testid="select-edit-provider">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RESOURCE_PROVIDER_VALUES.map((value) => (
                      <SelectItem key={value} value={value}>{RESOURCE_PROVIDER_LABELS[value]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-skill-level">Skill level</Label>
                <Select
                  value={editForm.skillLevel}
                  onValueChange={(v) => setEditForm(f => ({ ...f, skillLevel: v as ResourceSkillLevel }))}
                >
                  <SelectTrigger id="edit-skill-level" className="min-h-11" data-testid="select-edit-skill-level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RESOURCE_SKILL_LEVEL_VALUES.map((value) => (
                      <SelectItem key={value} value={value}>{RESOURCE_SKILL_LEVEL_LABELS[value]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={editControlsPending}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveEdit}
              disabled={editControlsPending}
             
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
        {/* NB-005 (run18): same svh height cap as the edit dialog so the Create
            form's footer stays reachable on short landscape viewports. */}
        <DialogContent className="max-w-2xl max-h-[90svh] overflow-y-auto bg-[var(--bg-2)] border-[var(--border)]">
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
            {/* BUG-049: dialog-level banner for server-side rejections. */}
            {formError && (
              <div
                role="alert"
                className="rounded border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                data-testid="error-create-form"
              >
                {formError}
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="create-title">Title *</Label>
              <Input
                id="create-title"
                value={editForm.title}
                onChange={(e) => { clearFieldError('title'); setEditForm(f => ({ ...f, title: e.target.value })); }}
                placeholder="e.g., Video.js Player"
                aria-invalid={!!fieldErrors.title}
                aria-describedby={fieldErrors.title ? "create-title-error" : undefined}
                data-testid="input-create-title"
              />
              {fieldErrors.title && (
                <p id="create-title-error" className="text-sm text-destructive" data-testid="error-create-title">
                  {fieldErrors.title}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-url">URL *</Label>
              <Input
                id="create-url"
                value={editForm.url}
                onChange={(e) => { clearFieldError('url'); setEditForm(f => ({ ...f, url: e.target.value })); }}
                placeholder="https://github.com/..."
                aria-invalid={!!fieldErrors.url}
                aria-describedby={fieldErrors.url ? "create-url-error" : undefined}
                data-testid="input-create-url"
              />
              {fieldErrors.url && (
                <p id="create-url-error" className="text-sm text-destructive" data-testid="error-create-url">
                  {fieldErrors.url}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-description">Description</Label>
              <Textarea
                id="create-description"
                value={editForm.description}
                onChange={(e) => { clearFieldError('description'); setEditForm(f => ({ ...f, description: e.target.value })); }}
                rows={3}
                placeholder="Brief description of the resource..."
                aria-invalid={!!fieldErrors.description}
                aria-describedby={fieldErrors.description ? "create-description-error" : undefined}
                data-testid="input-create-description"
              />
              {fieldErrors.description && (
                <p id="create-description-error" className="text-sm text-destructive" data-testid="error-create-description">
                  {fieldErrors.description}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="create-category">Category</Label>
                <Select 
                  value={editForm.category} 
                  onValueChange={(v) => setEditForm(f => ({ ...f, category: v, subcategory: "", subSubcategory: "" }))}
                >
                  <SelectTrigger id="create-category" data-testid="select-create-category">
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
                  <SelectTrigger id="create-status" data-testid="select-create-status">
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
                  <SelectTrigger id="create-subcategory" data-testid="select-create-subcategory">
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
                  <SelectTrigger id="create-subsubcategory" data-testid="select-create-subsubcategory">
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
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="create-kind">Kind override</Label>
                <Select value={editForm.kind || "inferred"} onValueChange={(value) => setEditForm((form) => ({ ...form, kind: value === "inferred" ? "" : value as ResourceKind }))}>
                  <SelectTrigger id="create-kind" className="min-h-11" data-testid="select-create-kind"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="inferred">No override (infer from tags)</SelectItem>{RESOURCE_KIND_VALUES.map((kind) => <SelectItem key={kind} value={kind}>{resourceKindLabel(kind)}</SelectItem>)}</SelectContent>
                </Select>
                <p className="text-xs text-[var(--text-2)]" data-testid="text-create-kind-storage-state">{editForm.kind ? `Stored override: ${editForm.kind}` : "Stored: null · resolved after creation"}</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="create-featured">Curated placement</Label>
                <label htmlFor="create-featured" className="flex min-h-11 cursor-pointer items-center gap-3 border border-[var(--border)] px-3 focus-within:ring-2 focus-within:ring-[var(--accent)]">
                  <Checkbox id="create-featured" checked={editForm.featured} onCheckedChange={(checked) => setEditForm((form) => ({ ...form, featured: checked === true }))} data-testid="checkbox-create-featured" />
                  <span className="text-sm">Feature this resource</span>
                </label>
                <p className="text-xs text-[var(--text-2)]">Persists as metadata.featured.</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="create-resource-format">Format</Label>
                <Select
                  value={editForm.resourceFormat}
                  onValueChange={(v) => setEditForm(f => ({ ...f, resourceFormat: v as ResourceFormat }))}
                >
                  <SelectTrigger id="create-resource-format" className="min-h-11" data-testid="select-create-resource-format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RESOURCE_FORMAT_VALUES.map((value) => (
                      <SelectItem key={value} value={value}>{RESOURCE_FORMAT_LABELS[value]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="create-provider">Provider</Label>
                <Select
                  value={editForm.provider}
                  onValueChange={(v) => setEditForm(f => ({ ...f, provider: v as ResourceProvider }))}
                >
                  <SelectTrigger id="create-provider" className="min-h-11" data-testid="select-create-provider">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RESOURCE_PROVIDER_VALUES.map((value) => (
                      <SelectItem key={value} value={value}>{RESOURCE_PROVIDER_LABELS[value]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="create-skill-level">Skill level</Label>
                <Select
                  value={editForm.skillLevel}
                  onValueChange={(v) => setEditForm(f => ({ ...f, skillLevel: v as ResourceSkillLevel }))}
                >
                  <SelectTrigger id="create-skill-level" className="min-h-11" data-testid="select-create-skill-level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RESOURCE_SKILL_LEVEL_VALUES.map((value) => (
                      <SelectItem key={value} value={value}>{RESOURCE_SKILL_LEVEL_LABELS[value]}</SelectItem>
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
        <AlertDialogContent className="bg-[var(--bg-2)] border-[var(--border)]">
          <AlertDialogHeader>
            <AlertDialogTitle className={"text-[#ff5c7a]" /* DS-OK: status bad */}>Delete Resource</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong className="text-white">"{selectedResource?.title}"</strong>? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className={"bg-[#ff5c7a] text-black hover:bg-[#ff5c7a]/90" /* DS-OK: status bad */}
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
