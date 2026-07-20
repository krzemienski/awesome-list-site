import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  ListOrdered,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";

interface JourneyStep {
  id: number;
  journeyId: number;
  stepNumber: number;
  title: string;
  description: string | null;
  resourceId: number | null;
  isOptional: boolean | null;
}

interface AdminJourney {
  id: number;
  title: string;
  description: string;
  category: string;
  status: string | null;
  difficulty: string | null;
  estimatedDuration: string | null;
  steps: JourneyStep[];
  stepCount: number;
}

interface ResourceLite {
  id: number;
  title: string;
  url: string;
}

interface StepFormState {
  title: string;
  description: string;
  resourceId: number | null;
  isOptional: boolean;
}

const EMPTY_FORM: StepFormState = {
  title: "",
  description: "",
  resourceId: null,
  isOptional: false,
};

// Run16 BUG-013: the DB stores one row per step-resource (up to 3 rows share a
// stepNumber). The editor previously rendered every raw row as its own step
// (badges 1,1,1,2,2,2…) while the card/public page said "6 steps". The dialog
// now groups rows into logical steps.
interface StepGroup {
  stepNumber: number;
  rows: JourneyStep[];
}

function groupSteps(steps: JourneyStep[]): StepGroup[] {
  const map = new Map<number, JourneyStep[]>();
  for (const s of steps) {
    const arr = map.get(s.stepNumber);
    if (arr) arr.push(s);
    else map.set(s.stepNumber, [s]);
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([stepNumber, rows]) => ({ stepNumber, rows }));
}

function ResourcePicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (id: number | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const { data, isFetching } = useQuery<{ resources: ResourceLite[]; total: number }>({
    queryKey: ["/api/resources", { search: query, limit: 10 }],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "10" });
      if (query.trim()) params.set("search", query.trim());
      const res = await fetch(`/api/resources?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to search resources");
      return res.json();
    },
    enabled: open,
  });

  const { data: selectedResource } = useQuery<ResourceLite | null>({
    queryKey: ["/api/resources/picker", value],
    queryFn: async () => {
      if (!value) return null;
      const res = await fetch(`/api/resources/${value}`, { credentials: "include" });
      if (!res.ok) return null;
      const json = await res.json();
      return { id: json.id, title: json.title, url: json.url };
    },
    enabled: value !== null,
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {value !== null ? (
          <Badge variant="secondary" className="gap-1" data-testid="step-resource-selected">
            #{value}
            {selectedResource ? ` — ${selectedResource.title}` : ""}
            <button
              type="button"
              onClick={() => onChange(null)}
              className="hover:opacity-80"
              aria-label="Clear resource"
              data-testid="step-resource-clear"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ) : (
          <span className="text-sm text-muted-foreground">No resource linked</span>
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setOpen((v) => !v)}
          data-testid="step-resource-toggle"
        >
          {open ? "Close picker" : value !== null ? "Change" : "Pick resource"}
        </Button>
      </div>

      {open && (
        <div className="border rounded-md p-2 space-y-2 bg-background">
          <Input
            placeholder="Search resources by title…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            data-testid="step-resource-search"
          />
          <div className="max-h-48 overflow-y-auto divide-y">
            {isFetching && (
              <p className="text-xs text-muted-foreground p-2">Searching…</p>
            )}
            {!isFetching && (data?.resources?.length ?? 0) === 0 && (
              <p className="text-xs text-muted-foreground p-2">No results.</p>
            )}
            {data?.resources?.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  onChange(r.id);
                  setOpen(false);
                }}
                className="w-full text-left p-2 hover:bg-accent text-sm"
                data-testid={`step-resource-option-${r.id}`}
              >
                <div className="font-medium line-clamp-1 break-words" title={r.title}>{r.title}</div>
                <div className="text-xs text-muted-foreground truncate">{r.url}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StepEditor({
  open,
  onOpenChange,
  initial,
  title,
  submitLabel,
  onSubmit,
  isPending,
  showResourcePicker = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: StepFormState;
  title: string;
  submitLabel: string;
  onSubmit: (form: StepFormState) => void;
  isPending: boolean;
  showResourcePicker?: boolean;
}) {
  const [form, setForm] = useState<StepFormState>(initial);

  useEffect(() => {
    if (open) setForm(initial);
  }, [open, initial]);

  const canSubmit = form.title.trim().length > 0 && !isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="step-editor-dialog">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Step content shows on the public journey page immediately after saving.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="step-title">Title *</Label>
            <Input
              id="step-title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              data-testid="step-title-input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="step-description">Description</Label>
            <Textarea
              id="step-description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={4}
              data-testid="step-description-input"
            />
          </div>
          {showResourcePicker ? (
            <div className="space-y-2">
              <Label>Resource (optional)</Label>
              <ResourcePicker
                value={form.resourceId}
                onChange={(id) => setForm((f) => ({ ...f, resourceId: id }))}
              />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              This step links multiple resources — manage them from the step list.
            </p>
          )}
          <div className="flex items-center gap-2">
            <Checkbox
              id="step-optional"
              checked={form.isOptional}
              onCheckedChange={(v) => setForm((f) => ({ ...f, isOptional: !!v }))}
              data-testid="step-optional-checkbox"
            />
            <Label htmlFor="step-optional" className="cursor-pointer">
              Mark this step as optional
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              onSubmit({
                title: form.title.trim(),
                description: form.description,
                resourceId: form.resourceId,
                isOptional: form.isOptional,
              })
            }
            disabled={!canSubmit}
            data-testid="step-editor-submit"
          >
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StepsDialog({
  journey,
  open,
  onOpenChange,
}: {
  journey: AdminJourney;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const journeyId = journey.id;

  const { data, isLoading } = useQuery<{ steps: JourneyStep[] }>({
    queryKey: ["/api/admin/journeys", journeyId, "steps"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/journeys/${journeyId}/steps`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch steps");
      return res.json();
    },
    enabled: open,
  });

  const steps = useMemo(() => data?.steps ?? [], [data]);
  // Run16 BUG-013: render LOGICAL steps (rows grouped by stepNumber), not raw
  // step-resource rows — the raw list showed 18 rows with badges 1,1,1,2,2,2…
  const groups = useMemo(() => groupSteps(steps), [steps]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/journeys", journeyId, "steps"] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/journeys"] });
    queryClient.invalidateQueries({ queryKey: [`/api/journeys/${journeyId}`] });
    queryClient.invalidateQueries({ queryKey: ["/api/journeys"] });
  };

  const createMutation = useMutation({
    mutationFn: async (form: StepFormState) =>
      apiRequest(`/api/admin/journeys/${journeyId}/steps`, {
        method: "POST",
        body: JSON.stringify({
          title: form.title,
          description: form.description || null,
          resourceId: form.resourceId,
          isOptional: form.isOptional,
        }),
      }),
    onSuccess: () => {
      toast({ title: "Step added" });
      setCreateOpen(false);
      invalidate();
    },
    onError: (err: Error) =>
      toast({ title: "Could not add step", description: err.message, variant: "destructive" }),
  });

  // Group edit: title/description/isOptional apply to EVERY row of the logical
  // step; each row keeps its own linked resource (except single-row steps,
  // where the picker is shown and resourceId is editable).
  const updateMutation = useMutation({
    mutationFn: async ({ group, form }: { group: StepGroup; form: StepFormState }) => {
      for (const row of group.rows) {
        await apiRequest(`/api/admin/journeys/${journeyId}/steps/${row.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            title: form.title,
            description: form.description || null,
            resourceId: group.rows.length === 1 ? form.resourceId : row.resourceId,
            isOptional: form.isOptional,
          }),
        });
      }
    },
    onSuccess: () => {
      toast({ title: "Step saved" });
      setEditingGroup(null);
      invalidate();
    },
    onError: (err: Error) => {
      toast({ title: "Could not save step", description: err.message, variant: "destructive" });
      invalidate();
    },
  });

  // Deletes a whole logical step (all of its rows). The server renumbers the
  // remaining steps group-aware.
  const deleteGroupMutation = useMutation({
    mutationFn: async (group: StepGroup) => {
      for (const row of group.rows) {
        await apiRequest(`/api/admin/journeys/${journeyId}/steps/${row.id}`, {
          method: "DELETE",
        });
      }
    },
    onSuccess: () => {
      toast({ title: "Step deleted" });
      setDeletingGroup(null);
      invalidate();
    },
    onError: (err: Error) => {
      toast({ title: "Could not delete step", description: err.message, variant: "destructive" });
      invalidate();
    },
  });

  // Removes a single linked resource row from a multi-resource step.
  const removeRowMutation = useMutation({
    mutationFn: async (id: number) =>
      apiRequest(`/api/admin/journeys/${journeyId}/steps/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast({ title: "Resource removed from step" });
      setRemovingRow(null);
      invalidate();
    },
    onError: (err: Error) =>
      toast({ title: "Could not remove resource", description: err.message, variant: "destructive" }),
  });

  const reorderMutation = useMutation({
    mutationFn: async (stepGroups: number[][]) =>
      apiRequest(`/api/admin/journeys/${journeyId}/steps/reorder`, {
        method: "POST",
        body: JSON.stringify({ stepGroups }),
      }),
    onSuccess: () => invalidate(),
    onError: (err: Error) =>
      toast({ title: "Could not reorder", description: err.message, variant: "destructive" }),
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<StepGroup | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<StepGroup | null>(null);
  const [removingRow, setRemovingRow] = useState<JourneyStep | null>(null);

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= groups.length) return;
    const next = [...groups];
    [next[index], next[target]] = [next[target], next[index]];
    reorderMutation.mutate(next.map((g) => g.rows.map((r) => r.id)));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="steps-dialog">
        <DialogHeader>
          <DialogTitle>Steps · {journey.title}</DialogTitle>
          <DialogDescription>
            Add, reorder, edit, or remove the steps shown on this journey's public page.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end">
          <Button
            onClick={() => setCreateOpen(true)}
            data-testid="add-step-button"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add step
          </Button>
        </div>

        <div className="space-y-2 mt-3">
          {isLoading && (
            <>
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </>
          )}
          {!isLoading && steps.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              No steps yet — click "Add step" to create the first one.
            </p>
          )}
          {groups.map((group, index) => {
            const primary = group.rows[0];
            const linkedRows = group.rows.filter((r) => r.resourceId !== null);
            return (
              <div
                key={primary.id}
                className="flex gap-3 items-start border rounded-md p-3"
                data-testid={`step-group-${primary.id}`}
              >
                <div className="flex flex-col items-center gap-1 pt-1">
                  <Badge variant="outline">{index + 1}</Badge>
                  <div className="flex flex-col">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => move(index, -1)}
                      disabled={index === 0 || reorderMutation.isPending}
                      aria-label="Move step up"
                      data-testid={`step-up-${primary.id}`}
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => move(index, 1)}
                      disabled={index === groups.length - 1 || reorderMutation.isPending}
                      aria-label="Move step down"
                      data-testid={`step-down-${primary.id}`}
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{primary.title}</span>
                    {primary.isOptional && <Badge variant="secondary">Optional</Badge>}
                  </div>
                  {primary.description && (
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap break-words">
                      {primary.description}
                    </p>
                  )}
                  {linkedRows.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap mt-2">
                      <span className="text-xs text-muted-foreground">
                        {linkedRows.length} linked resource{linkedRows.length !== 1 ? "s" : ""}:
                      </span>
                      {linkedRows.map((row) => (
                        <Badge key={row.id} variant="outline" className="gap-1">
                          <ExternalLink className="h-3 w-3" />
                          #{row.resourceId}
                          {group.rows.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setRemovingRow(row)}
                              className="hover:opacity-80"
                              aria-label={`Remove resource #${row.resourceId} from this step`}
                              data-testid={`step-remove-resource-${row.id}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setEditingGroup(group)}
                    aria-label="Edit step"
                    data-testid={`step-edit-${primary.id}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setDeletingGroup(group)}
                    aria-label="Delete step"
                    data-testid={`step-delete-${primary.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <StepEditor
          open={createOpen}
          onOpenChange={setCreateOpen}
          initial={EMPTY_FORM}
          title="Add step"
          submitLabel={createMutation.isPending ? "Adding…" : "Add step"}
          onSubmit={(form) => createMutation.mutate(form)}
          isPending={createMutation.isPending}
        />

        <StepEditor
          open={editingGroup !== null}
          onOpenChange={(o) => {
            if (!o) setEditingGroup(null);
          }}
          initial={
            editingGroup
              ? {
                  title: editingGroup.rows[0].title,
                  description: editingGroup.rows[0].description ?? "",
                  resourceId: editingGroup.rows[0].resourceId,
                  isOptional: !!editingGroup.rows[0].isOptional,
                }
              : EMPTY_FORM
          }
          title="Edit step"
          submitLabel={updateMutation.isPending ? "Saving…" : "Save changes"}
          onSubmit={(form) =>
            editingGroup && updateMutation.mutate({ group: editingGroup, form })
          }
          isPending={updateMutation.isPending}
          showResourcePicker={(editingGroup?.rows.length ?? 1) === 1}
        />

        <AlertDialog
          open={deletingGroup !== null}
          onOpenChange={(o) => {
            if (!o) setDeletingGroup(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this step?</AlertDialogTitle>
              <AlertDialogDescription>
                Removing "{deletingGroup?.rows[0]?.title}"
                {(deletingGroup?.rows.length ?? 0) > 1
                  ? ` and its ${deletingGroup?.rows.length} linked resources`
                  : ""}{" "}
                will renumber the remaining steps. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deletingGroup && deleteGroupMutation.mutate(deletingGroup)}
                data-testid="confirm-delete-step"
              >
                {deleteGroupMutation.isPending ? "Deleting…" : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={removingRow !== null}
          onOpenChange={(o) => {
            if (!o) setRemovingRow(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove this resource?</AlertDialogTitle>
              <AlertDialogDescription>
                Resource #{removingRow?.resourceId} will be unlinked from
                "{removingRow?.title}". The step itself stays.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => removingRow && removeRowMutation.mutate(removingRow.id)}
                data-testid="confirm-remove-resource"
              >
                {removeRowMutation.isPending ? "Removing…" : "Remove"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}

export default function JourneyStepsManager() {
  const { data, isLoading, error } = useQuery<{ journeys: AdminJourney[] }>({
    queryKey: ["/api/admin/journeys"],
    queryFn: async () => {
      const res = await fetch("/api/admin/journeys", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch journeys");
      return res.json();
    },
  });

  const [activeJourney, setActiveJourney] = useState<AdminJourney | null>(null);

  return (
    <Card data-testid="journey-steps-manager">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListOrdered className="h-5 w-5" />
          Learning Journeys
        </CardTitle>
        <CardDescription>
          Edit the steps shown on each learning journey. Changes go live immediately.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}
        {error && (
          <p className="text-sm text-destructive">Failed to load journeys.</p>
        )}
        {!isLoading && !error && (data?.journeys?.length ?? 0) === 0 && (
          <p className="text-sm text-muted-foreground">No journeys yet.</p>
        )}
        <div className="space-y-2">
          {data?.journeys?.map((j) => (
            <div
              key={j.id}
              className="flex items-center justify-between border rounded-md p-3 gap-3"
              data-testid={`journey-row-${j.id}`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium line-clamp-1 break-words min-w-0" title={j.title}>{j.title}</span>
                  <Badge variant="outline">{j.category}</Badge>
                  {j.status && j.status !== "published" && (
                    <Badge variant="secondary">{j.status}</Badge>
                  )}
                  <Badge variant="outline">{j.stepCount} steps</Badge>
                </div>
                {j.description && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {j.description}
                  </p>
                )}
              </div>
              <Button
                size="sm"
                onClick={() => setActiveJourney(j)}
                data-testid={`edit-steps-${j.id}`}
              >
                <ListOrdered className="h-4 w-4 mr-1" />
                Steps
              </Button>
            </div>
          ))}
        </div>
      </CardContent>

      {activeJourney && (
        <StepsDialog
          journey={activeJourney}
          open={true}
          onOpenChange={(o) => {
            if (!o) setActiveJourney(null);
          }}
        />
      )}
    </Card>
  );
}
