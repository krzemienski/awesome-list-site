import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Database,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  CheckCircle2
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
    totalDeleted?: number;
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

  const seedDatabaseMutation = useMutation({
    mutationFn: async (options: { clearExisting?: boolean } = {}) => {
      return await apiRequest('/api/admin/seed-database', {
        method: 'POST',
        body: JSON.stringify(options)
      }) as SeedDatabaseResponse;
    },
    onSuccess: (data: SeedDatabaseResponse) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({
        title: "Database Seeded Successfully",
        description: `Added ${data.counts.resourcesInserted} resources, ${data.counts.categoriesInserted} categories, ${data.counts.subcategoriesInserted} subcategories, and ${data.counts.subSubcategoriesInserted} sub-subcategories.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Database Seeding Failed",
        description: error.message || "Failed to seed database. Please try again.",
        variant: "destructive",
      });
    }
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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Management
          </CardTitle>
          <CardDescription>
            Seed the database with video resources from the awesome-video JSON source
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-primary/20 bg-primary/5">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Database Seeding</AlertTitle>
            <AlertDescription>
              This operation will populate the PostgreSQL database with all categories, subcategories,
              sub-subcategories, and resources from the awesome-video JSON source. Resources already
              in the database will be skipped.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => seedDatabaseMutation.mutate({ clearExisting: false })}
                disabled={seedDatabaseMutation.isPending}
               
                data-testid="button-seed-database"
              >
                {seedDatabaseMutation.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Seeding Database...
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-4 w-4" />
                    Seed Database
                  </>
                )}
              </Button>
              <span className="text-sm text-[var(--text-2)]">
                Add new resources without removing existing data
              </span>
            </div>

            <div className="flex items-center gap-4">
              <Button
                onClick={handleClearAndReseed}
                disabled={seedDatabaseMutation.isPending}
                variant="destructive"
                data-testid="button-clear-reseed"
              >
                {seedDatabaseMutation.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Clearing & Reseeding...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Clear & Re-seed
                  </>
                )}
              </Button>
              <span className="text-sm text-[var(--text-2)]">
                Remove all data and re-populate (use with caution)
              </span>
            </div>
          </div>

          {seedDatabaseMutation.isSuccess && seedDatabaseMutation.data && (
            <Alert className="border-green-500/20 bg-green-500/5">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertTitle>Seeding Completed Successfully</AlertTitle>
              <AlertDescription>
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Categories inserted:</span>
                    <span className="font-mono font-semibold text-primary">
                      {seedDatabaseMutation.data.counts.categoriesInserted}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Subcategories inserted:</span>
                    <span className="font-mono font-semibold text-primary">
                      {seedDatabaseMutation.data.counts.subcategoriesInserted}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sub-subcategories inserted:</span>
                    <span className="font-mono font-semibold text-primary">
                      {seedDatabaseMutation.data.counts.subSubcategoriesInserted}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Resources inserted:</span>
                    <span className="font-mono font-semibold text-primary">
                      {seedDatabaseMutation.data.counts.resourcesInserted}
                    </span>
                  </div>
                  {seedDatabaseMutation.data.totalErrors > 0 && (
                    <div className="flex justify-between text-yellow-400">
                      <span>Errors:</span>
                      <span className="font-mono font-semibold">
                        {seedDatabaseMutation.data.totalErrors}
                      </span>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="pt-4 border-t border-[var(--border)]">
            <h4 className="text-sm font-semibold text-[var(--text)] mb-2">Current Database Stats</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <div className="text-xs text-[var(--text-2)]">Live Resources</div>
                <div className="text-xl font-mono font-bold text-primary" data-testid="stat-db-live-resources">
                  {(stats?.totalPublic ?? stats?.resources ?? 0).toLocaleString()}
                </div>
                {(stats?.totalPending ?? 0) + (stats?.totalDeleted ?? 0) > 0 && (
                  <div className="text-[10px] text-[var(--text-2)]">
                    {/* R2-M22: only mention non-zero buckets (no "+0 pending"). */}
                    {[
                      (stats?.totalPending ?? 0) > 0 ? `+${stats?.totalPending} pending` : null,
                      (stats?.totalDeleted ?? 0) > 0 ? `${stats?.totalDeleted} rejected` : null,
                    ].filter(Boolean).join(" · ")}
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <div className="text-xs text-[var(--text-2)]">Users</div>
                <div className="text-xl font-mono font-bold text-primary">
                  {stats?.users || 0}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-[var(--text-2)]">Journeys</div>
                <div className="text-xl font-mono font-bold text-primary">
                  {stats?.journeys || 0}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
