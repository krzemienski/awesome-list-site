import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, DatabaseBackup, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { apiRequest } from "@/lib/queryClient";
import { describeWriteError, isServerError } from "@/lib/apiError";
import { formatAdminDateTime } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { AdminOpsTable as Table, TableShell } from "@/components/admin/AdminOpsPrimitives";
import { AdminLoadError } from "@/components/admin/AdminLoadError";

interface DatabaseBackupSummary {
  id: string;
  environment: "production" | "development";
  createdAt: string;
  completedAt: string;
  durationMs: number;
  createdBy: string | null;
  bytes: number;
  sha256: string;
  totalRows: number;
  tableCount: number;
  sequenceCount: number;
  excludedSchemas: string[];
  inventory: {
    schemas: string[];
    columns: number;
    primaryKeys: number;
    foreignKeys: number;
    uniqueConstraints: number;
    checkConstraints: number;
    indexes: number;
    sequences: number;
    extensions: string[];
  };
  tables: { table: string; rows: number }[];
}

interface DatabaseBackupList {
  environment: "production" | "development";
  storageConfigured: boolean;
  inFlight: boolean;
  backups: DatabaseBackupSummary[];
}

const BACKUPS_KEY = ["/api/admin/database-backups"];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Full, restorable database backup (pg_dump of every table) kept in the
 * project's private App Storage. The archive is never sent to the browser —
 * this panel only creates backups and shows their verified contents. Restore
 * is the operator runbook in docs/DATABASE-BACKUP.md.
 */
export default function DatabaseBackupPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showContents, setShowContents] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<DatabaseBackupList>({
    queryKey: BACKUPS_KEY,
    queryFn: () => apiRequest("/api/admin/database-backups", { cache: "no-store" }),
    staleTime: 30_000,
  });

  const createBackup = useMutation({
    mutationFn: async () =>
      (await apiRequest("/api/admin/database-backups", { method: "POST" })) as DatabaseBackupSummary,
    onSuccess: (backup) => {
      void queryClient.invalidateQueries({ queryKey: BACKUPS_KEY });
      void queryClient.invalidateQueries({ queryKey: ["/api/admin/audit-logs"] });
      toast({
        title: "Database backup stored",
        description: `Backup ${backup.id}: ${backup.tableCount} tables, ${backup.totalRows.toLocaleString()} rows saved to private storage.`,
      });
    },
  });

  const latest = data?.backups[0];
  const unavailable = data ? !data.storageConfigured : false;
  const busy = createBackup.isPending || Boolean(data?.inFlight);

  return (
    <TableShell
      className="admin-ops-backup"
      title="Full database backup"
      sub="Restorable copy of the whole database, kept in private storage."
      actions={
        <Button
          type="button"
          onClick={() => { if (!busy && !unavailable) setConfirmOpen(true); }}
          aria-disabled={busy || unavailable}
          aria-busy={busy}
          data-testid="button-create-database-backup"
        >
          {busy ? <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" /> : <DatabaseBackup className="h-4 w-4" aria-hidden="true" />}
          {busy ? "Backing up..." : "Create backup"}
        </Button>
      }
    >
      <div className="admin-ops-backup__scope" data-testid="database-backup-scope">
        <p>
          <strong>Covers:</strong> every table and row in the application database, with its primary keys, foreign-key
          relationships, unique and check constraints, indexes, sequence positions, extensions and the migration journal.
          That includes user accounts and their Clerk sign-in links, favorites, bookmarks and collections, journeys and
          progress, submissions and suggested edits, the audit log, AI enrichment and research jobs and their discoveries,
          notification preferences, API keys and sessions.
        </p>
        <p>
          <strong>Not covered:</strong> Clerk sign-in credentials (passwords, social logins, MFA), which Clerk holds outside this database,
          and the hosting platform&apos;s own <code>_system</code> schema.
        </p>
        <p>
          <strong>Storage:</strong> this project&apos;s private App Storage ({data?.environment ?? "current"} backups only).
          Backups contain personal data, so they are never downloaded to the browser.
        </p>
        <p>
          <strong>Restore:</strong> into a new, empty database with <code>npm run db:backup -- restore &lt;backup id&gt;</code>
          {" "}(runbook: <code>docs/DATABASE-BACKUP.md</code>). The restore checks the archive&apos;s SHA-256, then compares
          every table&apos;s row count, every sequence and the schema with the backup&apos;s record.
        </p>
      </div>

      {createBackup.isError ? (
        <p className="admin-ops-table__error" role="alert" data-testid="database-backup-error">
          Backup failed:{" "}
          {isServerError(createBackup.error)
            ? describeWriteError(createBackup.error, { outcome: "A backup may still have been stored. Refresh the backup list before trying again." })
            : `${describeWriteError(createBackup.error, { fallback: "unknown error" }).replace(/\.$/, "")}. Nothing was stored.`}
        </p>
      ) : null}

      {isLoading ? (
        <p className="admin-ops-table__empty">Loading backups...</p>
      ) : isError ? (
        <AdminLoadError
          subject="the backup list"
          error={error}
          onRetry={() => { void refetch(); }}
          retrying={isFetching}
          testId="alert-database-backups-error"
          retryTestId="button-retry-database-backups"
        />
      ) : unavailable ? (
        <p className="admin-ops-table__error" role="alert">
          Backup storage is not configured for this environment, so no backup can be taken.
        </p>
      ) : !data || data.backups.length === 0 ? (
        <p className="admin-ops-table__empty">No {data?.environment ?? ""} backups yet.</p>
      ) : (
        <>
          <Table className="table admin-ops-table" data-testid="table-database-backups">
            <thead>
              <tr>
                <th>Backup id</th>
                <th>Created</th>
                <th>Tables</th>
                <th>Rows</th>
                <th>Size</th>
                <th>SHA-256</th>
              </tr>
            </thead>
            <tbody>
              {data.backups.slice(0, 10).map((backup) => (
                <tr key={backup.id} data-testid={`database-backup-row-${backup.id}`}>
                  <td className="admin-ops-table__mono">{backup.id}</td>
                  <td className="admin-ops-table__mono">{formatAdminDateTime(backup.createdAt)}</td>
                  <td className="admin-ops-table__mono">{backup.tableCount}</td>
                  <td className="admin-ops-table__mono">{backup.totalRows.toLocaleString()}</td>
                  <td className="admin-ops-table__mono">{formatBytes(backup.bytes)}</td>
                  <td className="admin-ops-table__mono" title={backup.sha256}>{backup.sha256.slice(0, 12)}…</td>
                </tr>
              ))}
            </tbody>
          </Table>

          {latest ? (
            <div className="admin-ops-backup__contents">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowContents(!showContents)}
                aria-expanded={showContents}
                className="admin-ops-backup__toggle"
                data-testid="button-toggle-backup-contents"
              >
                {showContents ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
                Contents of the latest backup ({latest.tableCount} tables)
              </Button>
              {showContents ? (
                <>
                  <p className="admin-ops-backup__inventory">
                    Schemas {latest.inventory.schemas.join(", ")} · {latest.inventory.primaryKeys} primary keys ·{" "}
                    {latest.inventory.foreignKeys} foreign keys · {latest.inventory.uniqueConstraints} unique and{" "}
                    {latest.inventory.checkConstraints} check constraints · {latest.inventory.indexes} indexes ·{" "}
                    {latest.sequenceCount} sequences
                    {latest.inventory.extensions.length ? ` · extensions ${latest.inventory.extensions.join(", ")}` : ""}
                  </p>
                  <Table className="table admin-ops-table" data-testid="table-database-backup-contents">
                    <thead>
                      <tr>
                        <th>Table</th>
                        <th>Rows in backup</th>
                      </tr>
                    </thead>
                    <tbody>
                      {latest.tables.map((table) => (
                        <tr key={table.table}>
                          <td className="admin-ops-table__mono">{table.table}</td>
                          <td className="admin-ops-table__mono">{table.rows.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </>
              ) : null}
            </div>
          ) : null}
        </>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent data-testid="dialog-confirm-database-backup">
          <AlertDialogHeader>
            <AlertDialogTitle>Create a full database backup?</AlertDialogTitle>
            <AlertDialogDescription>
              This copies every table and row, including user accounts and other personal data, into this
              project&apos;s private App Storage. It runs while you wait. Existing data is not changed; the audit log records
              the backup.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-database-backup">Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-confirm-database-backup"
              onClick={() => {
                setConfirmOpen(false);
                createBackup.mutate();
              }}
            >
              Create backup
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TableShell>
  );
}
