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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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

  const { data: fetchedValidationStatus } = useQuery<ValidationStatus>({
    queryKey: ['/api/admin/validation-status'],
  });

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
      <Card className="border-primary/20 bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
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
              className="bg-primary hover:bg-primary/90"
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
              onClick={() => validateMutation.mutate()}
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
              onClick={() => checkLinksMutation.mutate()}
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
                  Check All Links
                </>
              )}
            </Button>
          </div>

          {validationStatus?.lastUpdated && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Clock className="h-4 w-4" />
              Last validated: {new Date(validationStatus.lastUpdated).toLocaleString()}
            </div>
          )}
        </CardContent>
      </Card>

      {validationStatus?.awesomeLint && (
        <Card className="border-primary/20 bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
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
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Passed
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <XCircle className="mr-1 h-3 w-3" />
                    Failed
                  </Badge>
                )}
                <span className="text-sm text-gray-400">
                  {validationStatus.awesomeLint.stats.totalResources} resources,{' '}
                  {validationStatus.awesomeLint.stats.totalCategories} categories
                </span>
              </div>

              {validationStatus.awesomeLint.errors.length > 0 && (
                <div className="space-y-2">
                  <button
                    onClick={() => setShowErrors(!showErrors)}
                    className="flex items-center gap-2 text-sm font-semibold text-red-400 hover:text-red-300"
                  >
                    {showErrors ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    Errors ({validationStatus.awesomeLint.errors.length})
                  </button>
                  {showErrors && (
                    <ScrollArea className="h-48 rounded-md border border-red-500/20 p-3">
                      {validationStatus.awesomeLint.errors.map((error, i) => (
                        <div key={i} className="mb-2 text-sm">
                          <div className="flex items-start gap-2">
                            <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                            <div>
                              <div className="font-mono text-xs text-gray-400">
                                Line {error.line}: {error.rule}
                              </div>
                              <div className="text-gray-300">{error.message}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </ScrollArea>
                  )}
                </div>
              )}

              {validationStatus.awesomeLint.warnings.length > 0 && (
                <div className="space-y-2">
                  <button
                    onClick={() => setShowWarnings(!showWarnings)}
                    className="flex items-center gap-2 text-sm font-semibold text-yellow-400 hover:text-yellow-300"
                  >
                    {showWarnings ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    Warnings ({validationStatus.awesomeLint.warnings.length})
                  </button>
                  {showWarnings && (
                    <ScrollArea className="h-48 rounded-md border border-yellow-500/20 p-3">
                      {validationStatus.awesomeLint.warnings.map((warning, i) => (
                        <div key={i} className="mb-2 text-sm">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                            <div>
                              <div className="font-mono text-xs text-gray-400">
                                Line {warning.line}: {warning.rule}
                              </div>
                              <div className="text-gray-300">{warning.message}</div>
                            </div>
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
        <Card className="border-primary/20 bg-card">
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
                  <div className="text-xs text-gray-400">Valid Links</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-500">
                    {validationStatus.linkCheck.brokenLinks}
                  </div>
                  <div className="text-xs text-gray-400">Broken Links</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-500">
                    {validationStatus.linkCheck.redirects}
                  </div>
                  <div className="text-xs text-gray-400">Redirects</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-500">
                    {validationStatus.linkCheck.errors}
                  </div>
                  <div className="text-xs text-gray-400">Errors</div>
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
                        <div key={i} className="mb-3 pb-3 border-b border-gray-800 last:border-0">
                          <div className="flex items-start gap-2">
                            <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                            <div className="flex-1">
                              <div className="font-semibold text-sm text-gray-300">
                                {link.resourceTitle || 'Unknown Resource'}
                              </div>
                              <div className="text-xs text-gray-400 font-mono break-all">
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
                <div className="text-xs text-gray-400">
                  Average response time: {validationStatus.linkCheck.summary.averageResponseTime.toFixed(0)}ms
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {!validationStatus?.awesomeLint && !validationStatus?.linkCheck && (
        <Card className="border-primary/20 bg-card">
          <CardContent className="py-8">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400 mb-2">No validation results yet</p>
              <p className="text-sm text-gray-500">
                Click "Run Validation" above to check the exported markdown against awesome-lint rules
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
