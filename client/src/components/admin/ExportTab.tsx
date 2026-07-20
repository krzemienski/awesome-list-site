import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Download,
  RefreshCw,
  FileCheck,
  Link,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatAdminDateTime } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { ValidationStatus } from "@/components/admin/types/validation";

interface ExportTabProps {
  validationStatus?: ValidationStatus;
}

export default function ExportTab({ validationStatus: propValidationStatus }: ExportTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isExporting, setIsExporting] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [showWarnings, setShowWarnings] = useState(false);
  // Run23 NB-040: explicit confirmation before starting validation/link-check jobs.
  const [confirmAction, setConfirmAction] = useState<'validate' | 'links' | null>(null);

  const { data: fetchedValidationStatus } = useQuery<ValidationStatus>({
    queryKey: ['/api/admin/validation-status'],
    // R5-037: refresh admin data when the operator returns to the tab.
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  // R5-040: group lint findings by rule so 100+ repeats of the same rule read
  // as "rule × N" with the individual lines nested under one heading.
  const groupByRule = (items: Array<{ line: number; rule: string; message: string }>) => {
    const groups = new Map<string, Array<{ line: number; rule: string; message: string }>>();
    for (const item of items) {
      const key = item.rule || 'unknown-rule';
      const list = groups.get(key);
      if (list) list.push(item); else groups.set(key, [item]);
    }
    return Array.from(groups.entries()).sort((a, b) => b[1].length - a[1].length);
  };

  const validationStatus = propValidationStatus || fetchedValidationStatus;

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const response = await fetch('/api/admin/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: 'Awesome Video',
          description: 'A curated list of awesome video streaming resources, tools, frameworks, and learning materials.',
          includeContributing: true,
          includeLicense: true
        })
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'awesome-list.md';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export Successful",
        description: "Awesome list markdown file has been downloaded.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export awesome list. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const validateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/admin/validate', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Awesome Video',
          description: 'A curated list of awesome video streaming resources, tools, frameworks, and learning materials.',
          includeContributing: true,
          includeLicense: true
        })
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/validation-status'] });
      toast({
        title: "Validation Complete",
        description: "Awesome list validation has been completed.",
      });
    },
    onError: () => {
      toast({
        title: "Validation Failed",
        description: "Failed to validate awesome list. Please try again.",
        variant: "destructive",
      });
    }
  });

  const checkLinksMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/admin/check-links', {
        method: 'POST',
        body: JSON.stringify({
          timeout: 10000,
          concurrent: 5,
          retryCount: 1
        })
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/validation-status'] });
      toast({
        title: "Link Check Complete",
        description: "All resource links have been checked.",
      });
    },
    onError: () => {
      toast({
        title: "Link Check Failed",
        description: "Failed to check links. Please try again.",
        variant: "destructive",
      });
    }
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="font-display font-medium tracking-tight flex items-center gap-2">
            <Download className="h-5 w-5 text-[var(--accent)]" />
            Export Awesome List
          </CardTitle>
          <CardDescription>
            Generate and download the awesome list in markdown format
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <Button
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export Markdown
                </>
              )}
            </Button>

            <Button
              onClick={() => setConfirmAction('validate')}
              disabled={validateMutation.isPending}
              variant="outline"
            >
              {validateMutation.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <FileCheck className="mr-2 h-4 w-4" />
                  Run Validation
                </>
              )}
            </Button>

            <Button
              onClick={() => setConfirmAction('links')}
              disabled={checkLinksMutation.isPending}
              variant="outline"
            >
              {checkLinksMutation.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Checking Links...
                </>
              ) : (
                <>
                  <Link className="mr-2 h-4 w-4" />
                  Run Link Check
                </>
              )}
            </Button>
          </div>

          {validationStatus?.lastUpdated && (
            <div className="flex items-center gap-2 text-sm text-[var(--text-2)]">
              <Clock className="h-4 w-4" />
              Last validated: {formatAdminDateTime(validationStatus.lastUpdated)}
            </div>
          )}
        </CardContent>
      </Card>

      {validationStatus?.awesomeLint && (
        <Card>
          <CardHeader>
            <CardTitle className="font-display font-medium tracking-tight flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-[var(--accent)]" />
              Validation Results
            </CardTitle>
            <CardDescription>
              Awesome-lint compliance check on exported markdown
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {validationStatus.awesomeLint.valid ? (
                  <Badge variant="default" className="bg-green-600 hover:bg-green-600">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Passed
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <XCircle className="mr-1 h-3 w-3" />
                    Failed
                  </Badge>
                )}
                <span className="text-sm text-[var(--text-2)]">
                  {validationStatus.awesomeLint.stats.totalResources} resources,{' '}
                  {validationStatus.awesomeLint.stats.totalCategories} categories
                </span>
              </div>

              {validationStatus.awesomeLint.errors.length > 0 && (
                <div className="space-y-2">
                  {/* Run16 BUG-073: expanders get a ≥44px touch target. */}
                  <button
                    onClick={() => setShowErrors(!showErrors)}
                    className="flex min-h-11 items-center gap-2 text-sm font-semibold text-red-400 hover:text-red-300"
                  >
                    {showErrors ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    Errors ({validationStatus.awesomeLint.errors.length})
                  </button>
                  {showErrors && (
                    /* R5-040: same rule-grouping as warnings. */
                    <ScrollArea className="h-48 rounded-md border border-red-500/20 p-3">
                      {groupByRule(validationStatus.awesomeLint.errors).map(([rule, items]) => (
                        <div key={rule} className="mb-3 text-sm" data-testid={`error-group-${rule}`}>
                          <div className="flex items-center gap-2 font-semibold text-red-400">
                            <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                            <span className="font-mono text-xs">{rule}</span>
                            <Badge variant="outline" className="text-[10px]">{items.length}</Badge>
                          </div>
                          <div className="ml-6 mt-1 space-y-1">
                            {items.map((error, i) => (
                              <div key={i}>
                                <span className="font-mono text-xs text-[var(--text-2)]">Line {error.line}: </span>
                                <span className="text-[var(--text)]">{error.message}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </ScrollArea>
                  )}
                </div>
              )}

              {validationStatus.awesomeLint.warnings.length > 0 && (
                <div className="space-y-2">
                  {/* Run16 BUG-073: 140×20px expander → ≥44px touch target. */}
                  <button
                    onClick={() => setShowWarnings(!showWarnings)}
                    className="flex min-h-11 items-center gap-2 text-sm font-semibold text-yellow-400 hover:text-yellow-300"
                  >
                    {showWarnings ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    Warnings ({validationStatus.awesomeLint.warnings.length})
                  </button>
                  {showWarnings && (
                    /* R5-040: grouped by rule (rule × count headings) instead
                       of a flat repeat-heavy list. */
                    <ScrollArea className="h-48 rounded-md border border-yellow-500/20 p-3">
                      {groupByRule(validationStatus.awesomeLint.warnings).map(([rule, items]) => (
                        <div key={rule} className="mb-3 text-sm" data-testid={`warning-group-${rule}`}>
                          <div className="flex items-center gap-2 font-semibold text-yellow-400">
                            <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
                            <span className="font-mono text-xs">{rule}</span>
                            <Badge variant="outline" className="text-[10px]">{items.length}</Badge>
                          </div>
                          <div className="ml-6 mt-1 space-y-1">
                            {items.map((warning, i) => (
                              <div key={i}>
                                <span className="font-mono text-xs text-[var(--text-2)]">Line {warning.line}: </span>
                                <span className="text-[var(--text)]">{warning.message}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </ScrollArea>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {validationStatus?.linkCheck && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link className="h-5 w-5" />
              Link Check Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-2xl font-bold text-green-500">
                    {validationStatus.linkCheck.validLinks}
                  </div>
                  <div className="text-xs text-[var(--text-2)]">Valid Links</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-500">
                    {validationStatus.linkCheck.brokenLinks}
                  </div>
                  <div className="text-xs text-[var(--text-2)]">Broken Links</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-500">
                    {validationStatus.linkCheck.redirects}
                  </div>
                  <div className="text-xs text-[var(--text-2)]">Redirects</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[var(--text-2)]">
                    {validationStatus.linkCheck.errors}
                  </div>
                  <div className="text-xs text-[var(--text-2)]">Errors</div>
                </div>
              </div>

              {validationStatus.linkCheck.brokenResources &&
               validationStatus.linkCheck.brokenResources.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-red-400">
                    Broken Links ({validationStatus.linkCheck.brokenResources.length})
                  </h4>
                  <ScrollArea className="h-64 rounded-md border border-red-500/20">
                    <div className="p-3">
                      {validationStatus.linkCheck.brokenResources.map((link, i) => (
                        <div key={i} className="mb-3 pb-3 border-b border-[var(--border)] last:border-0">
                          <div className="flex items-start gap-2">
                            <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                            <div className="flex-1">
                              <div className="font-semibold text-sm text-[var(--text)]">
                                {link.resourceTitle || 'Unknown Resource'}
                              </div>
                              <div className="text-xs text-[var(--text-2)] font-mono break-all">
                                {link.url}
                              </div>
                              <div className="text-xs text-red-400 mt-1">
                                {link.status} {link.statusText}
                                {link.error && ` - ${link.error}`}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {validationStatus.linkCheck.summary && (
                <div className="text-xs text-[var(--text-2)]">
                  Average response time: {validationStatus.linkCheck.summary.averageResponseTime.toFixed(0)}ms
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {!validationStatus?.awesomeLint && !validationStatus?.linkCheck && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-[var(--text-2)] mx-auto mb-4" />
              <p className="text-[var(--text-2)] mb-2">No validation results yet</p>
              <p className="text-sm text-[var(--text-2)]">
                Click "Run Validation" above to check the exported markdown against awesome-lint rules
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Run23 NB-040: explicit confirmation before starting validation/link-check jobs. */}
      <AlertDialog open={confirmAction !== null} onOpenChange={(open) => { if (!open) setConfirmAction(null); }}>
        <AlertDialogContent data-testid="dialog-confirm-export-job">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === 'validate' ? 'Run awesome-lint validation?' : 'Run link check?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === 'validate'
                ? 'This validates the exported markdown against awesome-lint rules. It runs in the background and can take a minute.'
                : 'This checks the links in the exported markdown against the live web. It runs in the background and can take several minutes.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-export-job">Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-confirm-export-job"
              onClick={() => {
                const action = confirmAction;
                setConfirmAction(null);
                if (action === 'validate') validateMutation.mutate();
                else if (action === 'links') checkLinksMutation.mutate();
              }}
            >
              {confirmAction === 'validate' ? 'Run validation' : 'Run link check'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
