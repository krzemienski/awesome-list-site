import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Download,
  FileText,
  File,
  Database,
  Code,
  BookOpen,
  Bookmark,
  CheckCircle
} from "lucide-react";

interface BookmarkedResource {
  id: string;
  name: string;
  url: string;
  description?: string;
  category?: string;
  tags?: string[];
  notes?: string;
}

interface BookmarkExportToolsProps {
  bookmarks: BookmarkedResource[];
  className?: string;
}

type ExportFormat = "markdown" | "json" | "csv" | "html" | "yaml";

interface ExportOptions {
  format: ExportFormat;
  includeDescriptions: boolean;
  includeTags: boolean;
  includeCategories: boolean;
  includeNotes: boolean;
  groupByCategory: boolean;
}

export default function BookmarkExportTools({ bookmarks, className }: BookmarkExportToolsProps) {
  const { toast } = useToast();
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: "markdown",
    includeDescriptions: true,
    includeTags: true,
    includeCategories: true,
    includeNotes: true,
    groupByCategory: false
  });
  const [isExporting, setIsExporting] = useState(false);

  const formatIcons = {
    markdown: <FileText className="h-4 w-4" />,
    json: <Code className="h-4 w-4" />,
    csv: <Database className="h-4 w-4" />,
    html: <BookOpen className="h-4 w-4" />,
    yaml: <Code className="h-4 w-4" />
  };

  const formatDescriptions = {
    markdown: "Standard Markdown format compatible with GitHub",
    json: "Structured JSON data for programmatic use",
    csv: "Spreadsheet-compatible format for data analysis",
    html: "Web-ready HTML with styling",
    yaml: "YAML configuration format"
  };

  const generateMarkdown = (bookmarks: BookmarkedResource[]): string => {
    let content = `# My Bookmarks\n\n`;
    content += `Exported on ${new Date().toLocaleDateString()}\n\n`;
    content += `Total Bookmarks: ${bookmarks.length}\n\n`;

    if (exportOptions.groupByCategory) {
      const categorizedBookmarks = bookmarks.reduce((acc, bookmark) => {
        const category = bookmark.category || 'Uncategorized';
        if (!acc[category]) acc[category] = [];
        acc[category].push(bookmark);
        return acc;
      }, {} as Record<string, BookmarkedResource[]>);

      Object.entries(categorizedBookmarks).forEach(([category, categoryBookmarks]) => {
        content += `## ${category}\n\n`;
        categoryBookmarks.forEach(bookmark => {
          content += `- [${bookmark.name}](${bookmark.url})`;
          if (exportOptions.includeDescriptions && bookmark.description) {
            content += ` - ${bookmark.description}`;
          }
          if (exportOptions.includeTags && bookmark.tags?.length) {
            content += ` \`${bookmark.tags.join('` `')}\``;
          }
          content += '\n';
          if (exportOptions.includeNotes && bookmark.notes) {
            content += `  > **Notes:** ${bookmark.notes}\n`;
          }
        });
        content += '\n';
      });
    } else {
      bookmarks.forEach(bookmark => {
        content += `- [${bookmark.name}](${bookmark.url})`;
        if (exportOptions.includeCategories && bookmark.category) {
          content += ` (${bookmark.category})`;
        }
        if (exportOptions.includeDescriptions && bookmark.description) {
          content += ` - ${bookmark.description}`;
        }
        if (exportOptions.includeTags && bookmark.tags?.length) {
          content += ` \`${bookmark.tags.join('` `')}\``;
        }
        content += '\n';
        if (exportOptions.includeNotes && bookmark.notes) {
          content += `  > **Notes:** ${bookmark.notes}\n`;
        }
      });
    }

    content += `\n---\n*Exported from My Bookmarks on ${new Date().toLocaleDateString()}*\n`;
    return content;
  };

  const generateJSON = (bookmarks: BookmarkedResource[]): string => {
    const exportData = {
      title: "My Bookmarks",
      exportDate: new Date().toISOString(),
      totalBookmarks: bookmarks.length,
      bookmarks: bookmarks.map(bookmark => ({
        id: bookmark.id,
        name: bookmark.name,
        url: bookmark.url,
        ...(exportOptions.includeDescriptions && { description: bookmark.description }),
        ...(exportOptions.includeCategories && { category: bookmark.category }),
        ...(exportOptions.includeTags && bookmark.tags?.length && { tags: bookmark.tags }),
        ...(exportOptions.includeNotes && { notes: bookmark.notes })
      }))
    };
    return JSON.stringify(exportData, null, 2);
  };

  const generateCSV = (bookmarks: BookmarkedResource[]): string => {
    const headers = ['Name', 'URL'];
    if (exportOptions.includeCategories) headers.push('Category');
    if (exportOptions.includeDescriptions) headers.push('Description');
    if (exportOptions.includeTags) headers.push('Tags');
    if (exportOptions.includeNotes) headers.push('Notes');

    let content = headers.join(',') + '\n';

    bookmarks.forEach(bookmark => {
      const row = [
        `"${bookmark.name.replace(/"/g, '""')}"`,
        bookmark.url
      ];

      if (exportOptions.includeCategories) {
        row.push(`"${bookmark.category || ''}"`);
      }
      if (exportOptions.includeDescriptions) {
        row.push(`"${(bookmark.description || '').replace(/"/g, '""')}"`);
      }
      if (exportOptions.includeTags) {
        row.push(`"${(bookmark.tags || []).join('; ')}"`);
      }
      if (exportOptions.includeNotes) {
        row.push(`"${(bookmark.notes || '').replace(/"/g, '""')}"`);
      }

      content += row.join(',') + '\n';
    });

    return content;
  };

  const generateHTML = (bookmarks: BookmarkedResource[]): string => {
    let content = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Bookmarks</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1 { color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px; }
        h2 { color: #666; margin-top: 30px; }
        .bookmark { margin-bottom: 15px; padding: 15px; border-left: 3px solid #06b6d4; background: #f9f9f9; }
        .bookmark-title { font-weight: bold; margin-bottom: 5px; }
        .bookmark-title a { color: #06b6d4; text-decoration: none; }
        .bookmark-title a:hover { text-decoration: underline; }
        .bookmark-description { color: #666; margin-bottom: 5px; }
        .bookmark-notes { background: #fff3cd; padding: 10px; margin-top: 10px; border-left: 3px solid #ffc107; font-style: italic; }
        .tags { margin-top: 5px; }
        .tag { background: #e1e8ed; padding: 2px 6px; border-radius: 3px; font-size: 12px; margin-right: 5px; }
        .category { color: #999; font-size: 14px; }
        .footer { margin-top: 40px; text-align: center; color: #999; font-size: 14px; }
    </style>
</head>
<body>
    <h1>My Bookmarks</h1>
    <p>Exported on ${new Date().toLocaleDateString()} • ${bookmarks.length} bookmark${bookmarks.length === 1 ? '' : 's'}</p>`;

    if (exportOptions.groupByCategory) {
      const categorizedBookmarks = bookmarks.reduce((acc, bookmark) => {
        const category = bookmark.category || 'Uncategorized';
        if (!acc[category]) acc[category] = [];
        acc[category].push(bookmark);
        return acc;
      }, {} as Record<string, BookmarkedResource[]>);

      Object.entries(categorizedBookmarks).forEach(([category, categoryBookmarks]) => {
        content += `<h2>${category}</h2>`;
        categoryBookmarks.forEach(bookmark => {
          content += `<div class="bookmark">
            <div class="bookmark-title"><a href="${bookmark.url}" target="_blank">${bookmark.name}</a></div>`;
          if (exportOptions.includeDescriptions && bookmark.description) {
            content += `<div class="bookmark-description">${bookmark.description}</div>`;
          }
          if (exportOptions.includeTags && bookmark.tags?.length) {
            content += `<div class="tags">${bookmark.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>`;
          }
          if (exportOptions.includeNotes && bookmark.notes) {
            content += `<div class="bookmark-notes"><strong>Notes:</strong> ${bookmark.notes}</div>`;
          }
          content += `</div>`;
        });
      });
    } else {
      bookmarks.forEach(bookmark => {
        content += `<div class="bookmark">
          <div class="bookmark-title"><a href="${bookmark.url}" target="_blank">${bookmark.name}</a></div>`;
        if (exportOptions.includeCategories && bookmark.category) {
          content += `<div class="category">Category: ${bookmark.category}</div>`;
        }
        if (exportOptions.includeDescriptions && bookmark.description) {
          content += `<div class="bookmark-description">${bookmark.description}</div>`;
        }
        if (exportOptions.includeTags && bookmark.tags?.length) {
          content += `<div class="tags">${bookmark.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>`;
        }
        if (exportOptions.includeNotes && bookmark.notes) {
          content += `<div class="bookmark-notes"><strong>Notes:</strong> ${bookmark.notes}</div>`;
        }
        content += `</div>`;
      });
    }

    content += `<div class="footer">Exported from My Bookmarks on ${new Date().toLocaleDateString()}</div>
</body>
</html>`;
    return content;
  };

  const generateYAML = (bookmarks: BookmarkedResource[]): string => {
    let content = `title: "My Bookmarks"\n`;
    content += `export_date: "${new Date().toISOString()}"\n`;
    content += `total_bookmarks: ${bookmarks.length}\n`;
    content += `bookmarks:\n`;

    bookmarks.forEach(bookmark => {
      content += `  - id: "${bookmark.id}"\n`;
      content += `    name: "${bookmark.name}"\n`;
      content += `    url: "${bookmark.url}"\n`;
      if (exportOptions.includeCategories && bookmark.category) {
        content += `    category: "${bookmark.category}"\n`;
      }
      if (exportOptions.includeDescriptions && bookmark.description) {
        content += `    description: "${bookmark.description.replace(/"/g, '\\"')}"\n`;
      }
      if (exportOptions.includeTags && bookmark.tags?.length) {
        content += `    tags: [${bookmark.tags.map(tag => `"${tag}"`).join(', ')}]\n`;
      }
      if (exportOptions.includeNotes && bookmark.notes) {
        content += `    notes: "${bookmark.notes.replace(/"/g, '\\"')}"\n`;
      }
    });

    return content;
  };

  const handleExport = async () => {
    setIsExporting(true);

    try {
      let content = '';
      let filename = '';
      let mimeType = '';

      switch (exportOptions.format) {
        case 'markdown':
          content = generateMarkdown(bookmarks);
          filename = `my-bookmarks-${new Date().toISOString().split('T')[0]}.md`;
          mimeType = 'text/markdown';
          break;
        case 'json':
          content = generateJSON(bookmarks);
          filename = `my-bookmarks-${new Date().toISOString().split('T')[0]}.json`;
          mimeType = 'application/json';
          break;
        case 'csv':
          content = generateCSV(bookmarks);
          filename = `my-bookmarks-${new Date().toISOString().split('T')[0]}.csv`;
          mimeType = 'text/csv';
          break;
        case 'html':
          content = generateHTML(bookmarks);
          filename = `my-bookmarks-${new Date().toISOString().split('T')[0]}.html`;
          mimeType = 'text/html';
          break;
        case 'yaml':
          content = generateYAML(bookmarks);
          filename = `my-bookmarks-${new Date().toISOString().split('T')[0]}.yaml`;
          mimeType = 'text/yaml';
          break;
      }

      // Create and download file
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: `${bookmarks.length} bookmark${bookmarks.length === 1 ? '' : 's'} exported as ${exportOptions.format.toUpperCase()}`,
        variant: "default",
      });

    } catch (error) {
      toast({
        title: "Export Failed",
        description: "There was an error exporting your bookmarks. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Export Bookmarks
        </CardTitle>
        <CardDescription>
          Export your bookmarks with notes in various formats for backup and sharing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Format Selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Export Format</label>
          <Select
            value={exportOptions.format}
            onValueChange={(value: ExportFormat) =>
              setExportOptions(prev => ({ ...prev, format: value }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(formatDescriptions).map(([format, description]) => (
                <SelectItem key={format} value={format}>
                  <div className="flex items-center gap-2">
                    {formatIcons[format as ExportFormat]}
                    <div>
                      <div className="font-medium">{format.toUpperCase()}</div>
                      <div className="text-xs text-muted-foreground">{description}</div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Content Options */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Content Options</label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="descriptions"
                checked={exportOptions.includeDescriptions}
                onCheckedChange={(checked) =>
                  setExportOptions(prev => ({ ...prev, includeDescriptions: !!checked }))
                }
              />
              <label htmlFor="descriptions" className="text-sm">Include descriptions</label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="tags"
                checked={exportOptions.includeTags}
                onCheckedChange={(checked) =>
                  setExportOptions(prev => ({ ...prev, includeTags: !!checked }))
                }
              />
              <label htmlFor="tags" className="text-sm">Include tags</label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="categories"
                checked={exportOptions.includeCategories}
                onCheckedChange={(checked) =>
                  setExportOptions(prev => ({ ...prev, includeCategories: !!checked }))
                }
              />
              <label htmlFor="categories" className="text-sm">Include categories</label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="notes"
                checked={exportOptions.includeNotes}
                onCheckedChange={(checked) =>
                  setExportOptions(prev => ({ ...prev, includeNotes: !!checked }))
                }
              />
              <label htmlFor="notes" className="text-sm">Include notes</label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="groupByCategory"
                checked={exportOptions.groupByCategory}
                onCheckedChange={(checked) =>
                  setExportOptions(prev => ({ ...prev, groupByCategory: !!checked }))
                }
              />
              <label htmlFor="groupByCategory" className="text-sm">Group by category</label>
            </div>
          </div>
        </div>

        {/* Export Summary */}
        <div className="p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium">Export Summary</span>
          </div>
          <div className="text-sm text-muted-foreground space-y-1">
            <div>Format: <Badge variant="outline">{exportOptions.format.toUpperCase()}</Badge></div>
            <div>Bookmarks: <span className="font-medium">{bookmarks.length}</span></div>
            {exportOptions.includeNotes && (
              <div>With Notes: <span className="font-medium">
                {bookmarks.filter(b => b.notes).length}
              </span></div>
            )}
          </div>
        </div>

        {/* Export Button */}
        <Button
          onClick={handleExport}
          disabled={isExporting || bookmarks.length === 0}
          className="w-full"
          size="lg"
        >
          {isExporting ? (
            <>
              <div className="animate-spin h-4 w-4 border-b-2 border-current mr-2" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Export {bookmarks.length} Bookmark{bookmarks.length === 1 ? '' : 's'}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
