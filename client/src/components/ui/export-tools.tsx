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
  Filter,
  CheckCircle
} from "lucide-react";
import { AwesomeList, Resource, Category } from "../../types/awesome-list";

interface ExportToolsProps {
  awesomeList: AwesomeList;
  selectedCategory?: string;
  className?: string;
}

type ExportFormat = "markdown" | "json" | "csv" | "pdf" | "html" | "yaml";

interface ExportOptions {
  format: ExportFormat;
  includeDescriptions: boolean;
  includeTags: boolean;
  includeCategories: boolean;
  groupByCategory: boolean;
  selectedCategories: string[];
}

export default function ExportTools({ awesomeList, selectedCategory, className }: ExportToolsProps) {
  const { toast } = useToast();
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: "markdown",
    includeDescriptions: true,
    includeTags: true,
    includeCategories: true,
    groupByCategory: true,
    selectedCategories: selectedCategory ? [selectedCategory] : []
  });
  const [isExporting, setIsExporting] = useState(false);

  const formatIcons = {
    markdown: <FileText className="h-4 w-4" />,
    json: <Code className="h-4 w-4" />,
    csv: <Database className="h-4 w-4" />,
    pdf: <File className="h-4 w-4" />,
    html: <BookOpen className="h-4 w-4" />,
    yaml: <Code className="h-4 w-4" />
  };

  const formatDescriptions = {
    markdown: "Standard Markdown format compatible with GitHub",
    json: "Structured JSON data for programmatic use",
    csv: "Spreadsheet-compatible format for data analysis",
    pdf: "Professional PDF document for sharing",
    html: "Web-ready HTML with styling",
    yaml: "YAML configuration format"
  };

  const getFilteredResources = (): Resource[] => {
    if (exportOptions.selectedCategories.length === 0) {
      return awesomeList.resources;
    }
    return awesomeList.resources.filter(resource => 
      exportOptions.selectedCategories.includes(resource.category)
    );
  };

  const generateMarkdown = (resources: Resource[]): string => {
    let content = `# ${awesomeList.title}\n\n`;
    
    if (exportOptions.includeDescriptions) {
      content += `${awesomeList.description}\n\n`;
    }

    if (exportOptions.groupByCategory) {
      const categorizedResources = resources.reduce((acc, resource) => {
        if (!acc[resource.category]) acc[resource.category] = [];
        acc[resource.category].push(resource);
        return acc;
      }, {} as Record<string, Resource[]>);

      Object.entries(categorizedResources).forEach(([category, categoryResources]) => {
        content += `## ${category}\n\n`;
        categoryResources.forEach(resource => {
          content += `- [${resource.title}](${resource.url})`;
          if (exportOptions.includeDescriptions && resource.description) {
            content += ` - ${resource.description}`;
          }
          if (exportOptions.includeTags && resource.tags?.length) {
            content += ` \`${resource.tags.join('` `')}\``;
          }
          content += '\n';
        });
        content += '\n';
      });
    } else {
      resources.forEach(resource => {
        content += `- [${resource.title}](${resource.url})`;
        if (exportOptions.includeCategories) {
          content += ` (${resource.category})`;
        }
        if (exportOptions.includeDescriptions && resource.description) {
          content += ` - ${resource.description}`;
        }
        if (exportOptions.includeTags && resource.tags?.length) {
          content += ` \`${resource.tags.join('` `')}\``;
        }
        content += '\n';
      });
    }

    content += `\n---\n*Exported from ${awesomeList.title} on ${new Date().toLocaleDateString()}*\n`;
    return content;
  };

  const generateJSON = (resources: Resource[]): string => {
    const exportData = {
      title: awesomeList.title,
      description: awesomeList.description,
      exportDate: new Date().toISOString(),
      totalResources: resources.length,
      resources: resources.map(resource => ({
        title: resource.title,
        url: resource.url,
        ...(exportOptions.includeDescriptions && { description: resource.description }),
        ...(exportOptions.includeCategories && { category: resource.category }),
        ...(exportOptions.includeTags && resource.tags?.length && { tags: resource.tags })
      }))
    };
    return JSON.stringify(exportData, null, 2);
  };

  const generateCSV = (resources: Resource[]): string => {
    const headers = ['Title', 'URL'];
    if (exportOptions.includeCategories) headers.push('Category');
    if (exportOptions.includeDescriptions) headers.push('Description');
    if (exportOptions.includeTags) headers.push('Tags');

    let content = headers.join(',') + '\n';
    
    resources.forEach(resource => {
      const row = [
        `"${resource.title.replace(/"/g, '""')}"`,
        resource.url
      ];
      
      if (exportOptions.includeCategories) {
        row.push(`"${resource.category}"`);
      }
      if (exportOptions.includeDescriptions) {
        row.push(`"${(resource.description || '').replace(/"/g, '""')}"`);
      }
      if (exportOptions.includeTags) {
        row.push(`"${(resource.tags || []).join('; ')}"`);
      }
      
      content += row.join(',') + '\n';
    });

    return content;
  };

  const generateHTML = (resources: Resource[]): string => {
    let content = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${awesomeList.title}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1 { color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px; }
        h2 { color: #666; margin-top: 30px; }
        .resource { margin-bottom: 10px; padding: 10px; border-left: 3px solid #007acc; background: #f9f9f9; }
        .resource-title { font-weight: bold; margin-bottom: 5px; }
        .resource-description { color: #666; margin-bottom: 5px; }
        .tags { margin-top: 5px; }
        .tag { background: #e1e8ed; padding: 2px 6px; border-radius: 3px; font-size: 12px; margin-right: 5px; }
        .footer { margin-top: 40px; text-align: center; color: #999; font-size: 14px; }
    </style>
</head>
<body>
    <h1>${awesomeList.title}</h1>`;

    if (exportOptions.includeDescriptions) {
      content += `<p>${awesomeList.description}</p>`;
    }

    if (exportOptions.groupByCategory) {
      const categorizedResources = resources.reduce((acc, resource) => {
        if (!acc[resource.category]) acc[resource.category] = [];
        acc[resource.category].push(resource);
        return acc;
      }, {} as Record<string, Resource[]>);

      Object.entries(categorizedResources).forEach(([category, categoryResources]) => {
        content += `<h2>${category}</h2>`;
        categoryResources.forEach(resource => {
          content += `<div class="resource">
            <div class="resource-title"><a href="${resource.url}" target="_blank">${resource.title}</a></div>`;
          if (exportOptions.includeDescriptions && resource.description) {
            content += `<div class="resource-description">${resource.description}</div>`;
          }
          if (exportOptions.includeTags && resource.tags?.length) {
            content += `<div class="tags">${resource.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>`;
          }
          content += `</div>`;
        });
      });
    } else {
      resources.forEach(resource => {
        content += `<div class="resource">
          <div class="resource-title"><a href="${resource.url}" target="_blank">${resource.title}</a></div>`;
        if (exportOptions.includeCategories) {
          content += `<div class="resource-category">Category: ${resource.category}</div>`;
        }
        if (exportOptions.includeDescriptions && resource.description) {
          content += `<div class="resource-description">${resource.description}</div>`;
        }
        if (exportOptions.includeTags && resource.tags?.length) {
          content += `<div class="tags">${resource.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>`;
        }
        content += `</div>`;
      });
    }

    content += `<div class="footer">Exported from ${awesomeList.title} on ${new Date().toLocaleDateString()}</div>
</body>
</html>`;
    return content;
  };

  const generateYAML = (resources: Resource[]): string => {
    let content = `title: "${awesomeList.title}"\n`;
    content += `description: "${awesomeList.description}"\n`;
    content += `export_date: "${new Date().toISOString()}"\n`;
    content += `total_resources: ${resources.length}\n`;
    content += `resources:\n`;
    
    resources.forEach(resource => {
      content += `  - title: "${resource.title}"\n`;
      content += `    url: "${resource.url}"\n`;
      if (exportOptions.includeCategories) {
        content += `    category: "${resource.category}"\n`;
      }
      if (exportOptions.includeDescriptions && resource.description) {
        content += `    description: "${resource.description.replace(/"/g, '\\"')}"\n`;
      }
      if (exportOptions.includeTags && resource.tags?.length) {
        content += `    tags: [${resource.tags.map(tag => `"${tag}"`).join(', ')}]\n`;
      }
    });

    return content;
  };

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      const resources = getFilteredResources();
      let content = '';
      let filename = '';
      let mimeType = '';

      switch (exportOptions.format) {
        case 'markdown':
          content = generateMarkdown(resources);
          filename = `${awesomeList.title.toLowerCase().replace(/\s+/g, '-')}.md`;
          mimeType = 'text/markdown';
          break;
        case 'json':
          content = generateJSON(resources);
          filename = `${awesomeList.title.toLowerCase().replace(/\s+/g, '-')}.json`;
          mimeType = 'application/json';
          break;
        case 'csv':
          content = generateCSV(resources);
          filename = `${awesomeList.title.toLowerCase().replace(/\s+/g, '-')}.csv`;
          mimeType = 'text/csv';
          break;
        case 'html':
          content = generateHTML(resources);
          filename = `${awesomeList.title.toLowerCase().replace(/\s+/g, '-')}.html`;
          mimeType = 'text/html';
          break;
        case 'yaml':
          content = generateYAML(resources);
          filename = `${awesomeList.title.toLowerCase().replace(/\s+/g, '-')}.yaml`;
          mimeType = 'text/yaml';
          break;
        case 'pdf':
          toast({
            title: "PDF Export",
            description: "PDF export requires a premium subscription. Please use HTML export and print to PDF as an alternative.",
            variant: "default",
          });
          return;
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
        description: `${resources.length} resources exported as ${exportOptions.format.toUpperCase()}`,
        variant: "default",
      });

    } catch (error) {
      toast({
        title: "Export Failed",
        description: "There was an error exporting your data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const toggleCategory = (categoryName: string) => {
    setExportOptions(prev => ({
      ...prev,
      selectedCategories: prev.selectedCategories.includes(categoryName)
        ? prev.selectedCategories.filter(c => c !== categoryName)
        : [...prev.selectedCategories, categoryName]
    }));
  };

  const selectAllCategories = () => {
    setExportOptions(prev => ({
      ...prev,
      selectedCategories: awesomeList.categories.map(c => c.name)
    }));
  };

  const clearAllCategories = () => {
    setExportOptions(prev => ({
      ...prev,
      selectedCategories: []
    }));
  };

  const resourceCount = getFilteredResources().length;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Export Tools
        </CardTitle>
        <CardDescription>
          Export your awesome list data in various formats for sharing and analysis
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

        {/* Category Filter */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Category Filter
            </label>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAllCategories}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={clearAllCategories}>
                Clear All
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
            {awesomeList.categories.map(category => (
              <div key={category.name} className="flex items-center space-x-2">
                <Checkbox
                  id={`category-${category.name}`}
                  checked={exportOptions.selectedCategories.includes(category.name)}
                  onCheckedChange={() => toggleCategory(category.name)}
                />
                <label htmlFor={`category-${category.name}`} className="text-sm cursor-pointer">
                  {category.name} ({category.resources.length})
                </label>
              </div>
            ))}
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
            <div>Resources: <span className="font-medium">{resourceCount}</span></div>
            <div>Categories: <span className="font-medium">
              {exportOptions.selectedCategories.length === 0 ? 'All' : exportOptions.selectedCategories.length}
            </span></div>
          </div>
        </div>

        {/* Export Button */}
        <Button 
          onClick={handleExport} 
          disabled={isExporting || resourceCount === 0}
          className="w-full"
          size="lg"
        >
          {isExporting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Export {resourceCount} Resources
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}