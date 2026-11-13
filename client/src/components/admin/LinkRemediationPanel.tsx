import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, apiRequest } from "@/lib/queryClient";
import { describeWriteError } from "@/lib/apiError";
import { useToast } from "@/hooks/use-toast";
import { formatAdminDateTime } from "@/lib/utils";
import { AdminOpsTable as Table, TableShell } from "@/components/admin/AdminOpsPrimitives";
import { AdminLoadError } from "@/components/admin/AdminLoadError";

type RemediationKind = "archive" | "restore" | "rewrite-url" | "duplicate" | "review" | "watch";

interface RemediationAction {
  resourceId: number;
  title: string;
  url: string;
  kind: RemediationKind;
  reason: string;
  jobId: number;
  to?: string;
}

interface RemediationResponse {
  intervalHours: number;
  nextDueAt: string | null;
  lastCompleted: { id: number; completedAt: string | null; checked: number; healthy: number; broken: number } | null;
  plan: { jobId: number | null; checked: number; counts: Partial<Record<RemediationKind, number>>; actions: RemediationAction[] };
  ignored: { id: number; title: string; url: string }[];
}

const QUERY_KEY = ["/api/admin/link-health/remediation"];

const KIND_LABEL: Record<RemediationKind, string> = {
  archive: "Hide (dead)",
  restore: "Restore",
  "rewrite-url": "Update URL",
  duplicate: "Duplicate",
  review: "Review",
  watch: "Watching",
};

export default function LinkRemediationPanel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const query = useQuery<RemediationResponse>({
    queryKey: QUERY_KEY,
    queryFn: () => apiRequest(QUERY_KEY[0]),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    void queryClient.invalidateQueries({ queryKey: ["/api/admin/link-health/broken-links"] });
  };

  const apply = useMutation({
    mutationFn: (): Promise<{ results: { outcome: string }[]; breaker?: string }> =>
      apiRequest("/api/admin/link-health/remediation/apply", { method: "POST" }),
    onSuccess: (data) => {
      const applied = data.results.filter((r) => r.outcome === "applied").length;
      toast({
        title: data.breaker ? "Dead links not hidden" : "Remediation applied",
        description: `${applied} of ${data.results.length} changes made. Each one is in the resource audit log.${data.breaker ? ` ${data.breaker}` : ""}`,
        variant: data.breaker ? "destructive" : undefined,
      });
      refresh();
    },
    onError: (error: Error) => error instanceof ApiError && error.status === 409
      ? toast({ title: "Nothing applied", description: error.message, variant: "destructive" })
      : toast({
      title: "Remediation failed",
      description: describeWriteError(error, { fallback: "The plan could not be applied.", outcome: "Some changes may have been made. Reload the plan before trying again." }),
      variant: "destructive",
    }),
  });

  const ignore = useMutation({
    mutationFn: ({ id, ignored }: { id: number; ignored: boolean }) =>
      apiRequest(`/api/admin/link-health/resources/${id}/ignore`, { method: "POST", body: JSON.stringify({ ignored }) }),
    onSuccess: (_data, { ignored }) => {
      toast({ title: ignored ? "Link marked fine" : "Checks resumed", description: ignored ? "Remediation will leave this resource alone." : "Remediation acts on this link again." });
      refresh();
    },
    onError: (error: Error) => toast({ title: "Could not update the link", description: describeWriteError(error, { fallback: "The change was not saved." }), variant: "destructive" }),
  });

  if (query.isError) return <AdminLoadError subject="link remediation" error={query.error} onRetry={() => void query.refetch()} retrying={query.isFetching} />;
  const data = query.data;
  const actions = data?.plan.actions ?? [];
  const changes = actions.filter((a) => a.kind === "archive" || a.kind === "restore" || a.kind === "rewrite-url").length;

  return (
    <Card data-testid="link-remediation-panel">
      <CardHeader>
        <CardTitle>Automatic remediation</CardTitle>
        <CardDescription>
          {data
            ? data.intervalHours
              ? `A full scan runs every ${data.intervalHours} h. ${data.nextDueAt ? `Next due ${formatAdminDateTime(data.nextDueAt)}.` : ""} `
              : "Scheduled scans are off. "
            : "Loading schedule… "}
          {data && "Nothing is changed automatically. Hide, Restore and Update URL items wait for Apply here; Review, Watching and Duplicate items always wait for a person."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {data?.lastCompleted && (
          <p className="text-sm text-[color:var(--text-2)]" data-testid="text-last-scan">
            Last scan #{data.lastCompleted.id} finished {data.lastCompleted.completedAt ? formatAdminDateTime(data.lastCompleted.completedAt) : "—"}:
            {` ${data.lastCompleted.checked} checked, ${data.lastCompleted.healthy} healthy, ${data.lastCompleted.broken} dead.`}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2" data-testid="remediation-counts">
          {(Object.keys(KIND_LABEL) as RemediationKind[]).map((k) => (
            <Badge key={k} variant="outline">{KIND_LABEL[k]}: {data?.plan.counts[k] ?? 0}</Badge>
          ))}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button className="ml-auto" disabled={!changes || apply.isPending} data-testid="button-apply-remediation">
                {apply.isPending ? "Applying…" : changes ? `Apply ${changes} change${changes === 1 ? "" : "s"}` : "No changes to apply"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Apply the remediation plan?</AlertDialogTitle>
                <AlertDialogDescription>
                  {`${data?.plan.counts.archive ?? 0} dead links will be hidden (refused if more than 2% of the catalog at once), ${data?.plan.counts.restore ?? 0} restored and ${data?.plan.counts["rewrite-url"] ?? 0} URLs updated. ${data?.plan.counts.duplicate ?? 0} duplicate listings are not touched. Nothing is deleted, and every change is logged in the resource audit log with its previous value.`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => apply.mutate()}>Apply changes</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        {actions.length === 0 ? (
          <p className="text-sm text-[color:var(--text-2)]">{query.isLoading ? "Loading plan…" : "No link needs attention."}</p>
        ) : (
          <TableShell title="Planned changes" sub="From the last three scans. Nothing is deleted.">
            <Table scrollLabel="Planned link remediation">
              <TableHeader>
                <TableRow>
                  <TableHead>Resource</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Why</TableHead>
                  <TableHead><span className="sr-only">Override</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {actions.map((a) => (
                  <TableRow key={`${a.resourceId}-${a.kind}`} data-testid={`remediation-row-${a.resourceId}`}>
                    <TableCell>
                      <a href={`/resource/${a.resourceId}`} className="inline-flex min-h-6 max-lg:min-h-11 items-center hover:underline">{a.title}</a>
                      <div className="break-all text-xs text-[color:var(--text-2)]">{a.url}{a.to ? ` → ${a.to}` : ""}</div>
                    </TableCell>
                    <TableCell><Badge variant={a.kind === "archive" ? "destructive" : "outline"}>{KIND_LABEL[a.kind]}</Badge></TableCell>
                    <TableCell className="text-sm">{a.reason}</TableCell>
                    <TableCell>
                      {a.kind !== "restore" && a.kind !== "duplicate" && (
                        <Button variant="ghost" size="sm" disabled={ignore.isPending} onClick={() => ignore.mutate({ id: a.resourceId, ignored: true })}
                          aria-label={`Link is fine for ${a.title}`}>
                          Link is fine
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableShell>
        )}
        {(data?.ignored.length ?? 0) > 0 && (
          <details data-testid="remediation-ignored">
            <summary className="cursor-pointer text-sm">Marked fine by an admin ({data?.ignored.length})</summary>
            <ul className="mt-2 space-y-1">
              {data?.ignored.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <a href={`/resource/${r.id}`} className="hover:underline">{r.title}</a>
                  <Button variant="ghost" size="sm" disabled={ignore.isPending} onClick={() => ignore.mutate({ id: r.id, ignored: false })}
                    aria-label={`Resume checks for ${r.title}`}>
                    Resume checks
                  </Button>
                </li>
              ))}
            </ul>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
