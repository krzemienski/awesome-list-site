import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileCheck,
  Link,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle
} from "lucide-react";
import type { ValidationStatus } from "@/components/admin/types/validation";
import type { UseMutationResult } from "@tanstack/react-query";

/**
 * @description Props for the ValidationTab component
 */
interface ValidationTabProps {
  validationStatus: ValidationStatus | null;
  validateMutation: UseMutationResult<any, Error, void, unknown>;
  checkLinksMutation: UseMutationResult<any, Error, void, unknown>;
}

/**
 * @description Displays validation results and link check status for the awesome list.
 * Shows awesome-lint validation errors/warnings and broken link details.
 * Extracted from the main Admin Dashboard component for better code organization.
 */
export default function ValidationTab({
  validationStatus,
  validateMutation,
  checkLinksMutation
}: ValidationTabProps) {
  return (
    <div className="space-y-4">
      {/* Awesome Lint Validation */}
      <Card className="border-pink-500/20 bg-black">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Awesome List Validation
          </CardTitle>
          <CardDescription>
            Validate the generated markdown against awesome-lint rules
          </CardDescription>
        </CardHeader>
        <CardContent>
          {validationStatus?.awesomeLint ? (
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
                  <h4 className="text-sm font-semibold text-red-400">
                    Errors ({validationStatus.awesomeLint.errors.length})
                  </h4>
                  <ScrollArea className="h-48 rounded-md border border-red-500/20 p-3">
                    {validationStatus.awesomeLint.errors.map((error, i) => (
                      <div key={i} className="mb-2 text-sm">
                        <div className="flex items-start gap-2">
                          <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
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
                </div>
              )}

              {validationStatus.awesomeLint.warnings.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-yellow-400">
                    Warnings ({validationStatus.awesomeLint.warnings.length})
                  </h4>
                  <ScrollArea className="h-48 rounded-md border border-yellow-500/20 p-3">
                    {validationStatus.awesomeLint.warnings.map((warning, i) => (
                      <div key={i} className="mb-2 text-sm">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
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
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">No validation results available</p>
              <Button
                onClick={() => validateMutation.mutate()}
                disabled={validateMutation.isPending}
                className="mt-4"
                variant="outline"
              >
                Run Validation
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Link Checker Results */}
      <Card className="border-cyan-500/20 bg-black">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Link Check Results
          </CardTitle>
          <CardDescription>
            Check all resource URLs for availability and redirects
          </CardDescription>
        </CardHeader>
        <CardContent>
          {validationStatus?.linkCheck ? (
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
                            <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
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

              <div className="text-xs text-gray-400">
                Average response time: {validationStatus.linkCheck.summary.averageResponseTime.toFixed(0)}ms
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">No link check results available</p>
              <Button
                onClick={() => checkLinksMutation.mutate()}
                disabled={checkLinksMutation.isPending}
                className="mt-4"
                variant="outline"
              >
                Check Links
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
