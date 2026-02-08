import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, FileCheck, Link, Clock } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ValidationStatus } from "@/components/admin/types/validation";

/**
 * @description Props for the ExportTab component
 */
interface ExportTabProps {
  validationStatus?: ValidationStatus;
}

/**
 * @description Handles exporting the awesome list to markdown format with quick action buttons.
 * Provides functionality to export markdown, run validation, and check links.
 * Extracted from the main Admin Dashboard component for better code organization.
 */
export default function ExportTab({ validationStatus }: ExportTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const response = await fetch('/api/admin/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          title: 'Awesome Video',
          description: 'A curated list of awesome video streaming resources, tools, frameworks, and learning materials.',
          includeContributing: true,
          includeLicense: true
        })
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Create download
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
          <div className="flex items-center gap-4">
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
            <span className="text-sm text-gray-400">
              Generates awesome-lint compliant markdown file
            </span>
          </div>

          {validationStatus?.lastUpdated && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Clock className="h-4 w-4" />
              Last exported: {new Date(validationStatus.lastUpdated).toLocaleString()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="border-primary/20 bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={() => validateMutation.mutate()}
              disabled={validateMutation.isPending}
              variant="outline"
              className="justify-start"
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
              className="justify-start"
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
        </CardContent>
      </Card>
    </div>
  );
}
