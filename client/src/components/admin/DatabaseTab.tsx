import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Database,
  RefreshCw,
  TerminalSquare,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AdminOpsTable as Table, Stat, StatusChip, TableShell } from "@/components/admin/AdminOpsPrimitives";
import "./admin-ops-export-database.css";

/**
 * @description Props for the DatabaseTab component
 */
interface DatabaseTabProps {
  stats?: {
    users: number;
    resources: number;
    journeys: number;
    pendingApprovals: number;
    // Run3 audit R3-22: status-split counts from /api/admin/stats so this
    // panel can show the live (public) number instead of the raw row count.
    totalPublic?: number;
    totalPending?: number;
    /** Rows with status='rejected' (Audit2 BUG-050: was misnamed totalDeleted). */
    totalRejected?: number;
  };
}

/**
 * @description Response type from the seed database API endpoint
 */
interface SeedDatabaseResponse {
  success: boolean;
  counts: {
    categoriesInserted: number;
    subcategoriesInserted: number;
    subSubcategoriesInserted: number;
    resourcesInserted: number;
  };
  totalErrors: number;
}

/**
 * @description Manages database seeding operations for the admin dashboard.
 * Provides functionality to seed and clear/reseed the database with video resources.
 * Extracted from the main Admin Dashboard component for better code organization.
 */
export default function DatabaseTab({ stats }: DatabaseTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  // R2-H04: destructive Clear & Re-seed requires an explicit typed
  // confirmation inside a proper AlertDialog instead of a native confirm().
  const [reseedDialogOpen, setReseedDialogOpen] = useState(false);
  const [reseedConfirmText, setReseedConfirmText] = useState("");
  const reseedConfirmed = reseedConfirmText.trim().toUpperCase() === "RESEED";
  // Run16 BUG-010: plain Seed Database is also a DB mutation — it must ask
  // before firing (consistent with Clear & Re-seed, which types RESEED).
  // A simple confirm dialog suffices since seeding is additive, not destructive.
  const [seedDialogOpen, setSeedDialogOpen] = useState(false);
  const [sqlQuery, setSqlQuery] = useState("SELECT * FROM resources WHERE cat = 'protocols-transport' LIMIT 10;");

  const seedDatabaseMutation = useMutation({
    mutationFn: async (options: { clearExisting?: boolean } = {}) => {
      return (await apiRequest("/api/admin/seed-database", {
        method: "POST",
        body: JSON.stringify(options),
      })) as SeedDatabaseResponse;
    },
    onSuccess: (data: SeedDatabaseResponse) => {
      void queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Database Seeded Successfully",
        description: `Added ${data.counts.resourcesInserted} resources, ${data.counts.categoriesInserted} categories, ${data.counts.subcategoriesInserted} subcategories, and ${data.counts.subSubcategoriesInserted} sub-subcategories.`,
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Database Seeding Failed",
        description: error instanceof Error
          ? error.message
          : "Failed to seed database. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleClearAndReseed = () => {
    setReseedConfirmText("");
    setReseedDialogOpen(true);
  };

  const confirmClearAndReseed = () => {
    if (!reseedConfirmed) return;
    setReseedDialogOpen(false);
    seedDatabaseMutation.mutate({ clearExisting: true });
  };

  const tableRows = [
    { name: "resources", rows: stats?.resources },
    { name: "users", rows: stats?.users },
    { name: "learning_journeys", rows: stats?.journeys },
  ];

  return (
    <div className="admin-ops-database">
      <div className="admin-ops-stat-strip">
        <Stat
          label="Tables"
          value="—"
          description="Schema count is not exposed by the admin API"
        />
        <Stat
          label="Rows"
          value={
            <span data-testid="stat-db-live-resources">
              {(stats?.totalPublic ?? stats?.resources ?? 0).toLocaleString()}
            </span>
          }
          description={stats ? "Public resources reported by admin stats" : "Waiting for admin stats"}
        />
        <Stat
          label="Disk"
          value="—"
          description="Storage size is not exposed by the admin API"
        />
        <Stat
          label="Migrations"
          value="—"
          description="Migration status is not exposed by the admin API"
          accent
        />
      </div>

      <details className="admin-ops-more">
        <summary className="btn ghost">Database seeding</summary>
      <section className="card admin-ops-database__seed">
        <header className="admin-ops-database__seed-header">
          <Database className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
          <div>
            <h2>Database Management</h2>
            <p>Seed the database with video resources from the awesome-video JSON source</p>
          </div>
        </header>
        <div className="admin-ops-database__seed-body">
          <Alert className="admin-ops-database__seed-alert">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Database Seeding</AlertTitle>
            <AlertDescription>
              This operation will populate the PostgreSQL database with all categories, subcategories,
              sub-subcategories, and resources from the awesome-video JSON source. Resources already
              in the database will be skipped.
            </AlertDescription>
          </Alert>

          <div className="admin-ops-database__seed-actions">
            <div className="admin-ops-database__seed-action">
              <Button
                onClick={() => setSeedDialogOpen(true)}
                disabled={seedDatabaseMutation.isPending}
                data-testid="button-seed-database"
              >
                {seedDatabaseMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Seeding Database...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4" />
                    Seed Database
                  </>
                )}
              </Button>
              <p>Add new resources without removing existing data</p>
            </div>

            <div className="admin-ops-database__seed-action">
              <Button
                onClick={handleClearAndReseed}
                disabled={seedDatabaseMutation.isPending}
                variant="destructive"
                data-testid="button-clear-reseed"
              >
                {seedDatabaseMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Clearing &amp; Reseeding...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4" />
                    Clear &amp; Re-seed
                  </>
                )}
              </Button>
              <p>Remove all data and re-populate (use with caution)</p>
            </div>
          </div>

          {seedDatabaseMutation.isSuccess && seedDatabaseMutation.data && (
            <Alert className="admin-ops-database__seed-result">
              {/* DS-OK: global semantic status color for a completed seed result. */}
              <CheckCircle2 className="h-4 w-4 text-[#34d08c]" />
              <AlertTitle className="flex flex-wrap items-center gap-2">
                Seeding Completed Successfully
                <StatusChip status="Completed" />
              </AlertTitle>
              <AlertDescription>
                <dl>
                  <dt>Categories inserted:</dt>
                  <dd>{seedDatabaseMutation.data.counts.categoriesInserted}</dd>
                  <dt>Subcategories inserted:</dt>
                  <dd>{seedDatabaseMutation.data.counts.subcategoriesInserted}</dd>
                  <dt>Sub-subcategories inserted:</dt>
                  <dd>{seedDatabaseMutation.data.counts.subSubcategoriesInserted}</dd>
                  <dt>Resources inserted:</dt>
                  <dd>{seedDatabaseMutation.data.counts.resourcesInserted}</dd>
                  {seedDatabaseMutation.data.totalErrors > 0 ? (
                    <>
                      <dt>Errors:</dt>
                      <dd className="admin-ops-database__seed-errors">
                        {seedDatabaseMutation.data.totalErrors}
                        <span className="ml-2"><StatusChip status="Warning" /></span>
                      </dd>
                    </>
                  ) : null}
                </dl>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </section>
      </details>

      <TableShell title="Tables" sub="PostgreSQL — primary database">
        <Table className="table admin-ops-table" data-testid="table-database-tables">
          <thead>
            <tr>
              <th>Name</th>
              <th>Rows</th>
              <th>Size</th>
              <th>Last write</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row) => (
              <tr key={row.name}>
                <td className="admin-ops-table__name">{row.name}</td>
                <td className="admin-ops-table__mono">
                  {typeof row.rows === "number" ? row.rows.toLocaleString() : "—"}
                </td>
                <td className="admin-ops-table__mono">—</td>
                <td className="admin-ops-table__mono">—</td>
                <td className="admin-ops-table__actions">
                  <Button
                    variant="outline"
                    disabled
                    className="admin-ops-table__action"
                    title="Table inspection is not available from the admin API."
                  >
                    Inspect
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </TableShell>

      <section className="card admin-ops-database__console">
        <h2>SQL Console</h2>
        <p>Read-only — write queries require an admin token.</p>
        <textarea
          className="textarea"
          value={sqlQuery}
          onChange={(event) => setSqlQuery(event.target.value)}
          aria-label="SQL query"
        />
        <div className="admin-ops-database__console-actions">
          <Button className="btn ghost" variant="ghost" onClick={() => setSqlQuery("")}>Clear</Button>
          <Button
            className="btn primary"
            disabled
            title="No SQL-console endpoint is exposed by the admin API."
          >
            Run
          </Button>
        </div>
      </section>

      <AlertDialog open={seedDialogOpen} onOpenChange={setSeedDialogOpen}>
        <AlertDialogContent data-testid="dialog-seed-database">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Seed the database?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This adds all categories, subcategories, and resources from the
              awesome-video JSON source. Resources already in the database are
              skipped, so no existing data is removed — but new rows may be added.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-seed-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setSeedDialogOpen(false);
                seedDatabaseMutation.mutate({ clearExisting: false });
              }}
              data-testid="button-seed-confirm"
            >
              Seed Database
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={reseedDialogOpen} onOpenChange={setReseedDialogOpen}>
        <AlertDialogContent data-testid="dialog-clear-reseed">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Clear all data and re-seed?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes <strong>all existing resources, categories, and
              related data</strong> from the database and re-populates it from the
              awesome-video source. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reseed-confirm">
              Type <span className="font-mono font-bold">RESEED</span> to confirm
            </Label>
            <Input
              id="reseed-confirm"
              value={reseedConfirmText}
              onChange={(e) => setReseedConfirmText(e.target.value)}
              placeholder="RESEED"
              autoComplete="off"
              data-testid="input-reseed-confirm"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-reseed-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmClearAndReseed}
              disabled={!reseedConfirmed}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-reseed-confirm"
            >
              Clear &amp; Re-seed
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}