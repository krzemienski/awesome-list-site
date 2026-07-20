import { useState, useEffect, useMemo, useRef } from "react";
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
import { AwesomeList, Resource, Category } from "@/types/awesome-list";

interface ExportToolsProps {
  awesomeList: AwesomeList;
  selectedCategory?: string;
  className?: string;
  /**
   * BUG-026 (run13): lets the parent page (Advanced → format showcase cards)
   * drive the selected export format so the cards are functional, not
   * decorative.
   */
  formatOverride?: ExportFormat;
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

// NB-010 (run18): escape EVERY content-derived value before it lands in the
// exported HTML document. Raw titles/descriptions/tags/URLs previously flowed
// straight into markup, so a resource description containing `<video>`,
// `<audio>`, `<mux-player>` or a stray `&` produced live embeds / broken
// entities in the exported file. Escapes &, <, >, ", ' — safe for both text
// nodes and double-quoted attribute values (e.g. href).
function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// NB-011 (run18): emit a strictly-parseable double-quoted YAML scalar.
// Unescaped backslashes (Windows paths, regex fragments in descriptions) used
// to break strict YAML parsers; here we escape `\` first then `"` and wrap the
// result so every scalar round-trips cleanly.
function yamlString(value: unknown): string {
  const escaped = String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"');
  return `"${escaped}"`;
}

// NB-012 (run18): the awesome-list payload carries per-resource tags in
// `metadata.tags` (jsonb) — there is NO top-level `tags` column, so the
// "Include tags" option was reading the always-empty `resource.tags`. Resolve
// tags from either shape so the option produces real values everywhere.
function getResourceTags(resource: Resource): string[] {
  const top = Array.isArray(resource.tags) ? resource.tags : [];
  const meta = Array.isArray(resource.metadata?.tags)
    ? (resource.metadata!.tags as unknown[])
    : [];
  const source = top.length ? top : meta;
  return source.filter(
    (t): t is string => typeof t === "string" && t.trim().length > 0
  );
}

export default function ExportTools({ awesomeList, selectedCategory, className, formatOverride }: ExportToolsProps) {
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
  // NB-032 (run23): synchronous re-entry latch for handleExport (state alone
  // is a render behind a fast double-click).
  const exportingRef = useRef(false);

  // BUG-026 (run13): apply a parent-driven format selection (Advanced page
  // format showcase cards) to the local export options.
  useEffect(() => {
    if (formatOverride) {
      setExportOptions(prev => ({ ...prev, format: formatOverride }));
    }
  }, [formatOverride]);

  // BUG-005 (run14): checkbox semantics are now literal — checked categories
  // are exported, none checked = nothing to export. To keep "everything" as
  // the default, the list initializes with ALL categories checked once the
  // taxonomy arrives (unless the parent pinned a single category).
  const categoriesInitialized = useRef(false);
  useEffect(() => {
    if (categoriesInitialized.current) return;
    if (awesomeList.categories.length === 0) return;
    categoriesInitialized.current = true;
    if (!selectedCategory) {
      setExportOptions(prev => ({
        ...prev,
        selectedCategories: awesomeList.categories.map(c => c.name),
      }));
    }
  }, [awesomeList.categories, selectedCategory]);

  // BUG-014 (run14): per-category counts must match what the export filter
  // actually selects (ALL resources in the flat list with that category name),
  // not just the category's direct children — subcategory resources were
  // missing from the label counts.
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of awesomeList.resources) {
      counts[r.category] = (counts[r.category] || 0) + 1;
    }
    return counts;
  }, [awesomeList.resources]);

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
    // BUG-005 (run14): no categories checked = no resources. "Clear All" used
    // to silently flip back to exporting EVERYTHING because [] meant "all".
    if (exportOptions.selectedCategories.length === 0) {
      return [];
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
          // NB-012 (run18): read tags from metadata.tags fallback.
          const tags = getResourceTags(resource);
          if (exportOptions.includeTags && tags.length) {
            content += ` \`${tags.join('` `')}\``;
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
        // NB-012 (run18): read tags from metadata.tags fallback.
        const tags = getResourceTags(resource);
        if (exportOptions.includeTags && tags.length) {
          content += ` \`${tags.join('` `')}\``;
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
      resources: resources.map(resource => {
        // NB-012 (run18): tags live in metadata.tags — emit a real tags key.
        const tags = getResourceTags(resource);
        return {
          title: resource.title,
          url: resource.url,
          ...(exportOptions.includeDescriptions && { description: resource.description }),
          ...(exportOptions.includeCategories && { category: resource.category }),
          ...(exportOptions.includeTags && tags.length > 0 && { tags })
        };
      })
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
        // NB-012 (run18): real tags from metadata.tags, semicolon-joined and
        // CSV-escaped (doubled quotes).
        const tags = getResourceTags(resource);
        row.push(`"${tags.join('; ').replace(/"/g, '""')}"`);
      }
      
      content += row.join(',') + '\n';
    });

    return content;
  };

  const generateHTML = (resources: Resource[]): string => {
    /* MR-DS-17 — DS-OK: standalone exported HTML, no runtime DS */
    let content = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(awesomeList.title)}</title>
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
    <h1>${escapeHtml(awesomeList.title)}</h1>`;

    if (exportOptions.includeDescriptions) {
      // NB-010 (run18): escape all content-derived interpolations.
      content += `<p>${escapeHtml(awesomeList.description)}</p>`;
    }

    if (exportOptions.groupByCategory) {
      const categorizedResources = resources.reduce((acc, resource) => {
        if (!acc[resource.category]) acc[resource.category] = [];
        acc[resource.category].push(resource);
        return acc;
      }, {} as Record<string, Resource[]>);

      Object.entries(categorizedResources).forEach(([category, categoryResources]) => {
        content += `<h2>${escapeHtml(category)}</h2>`;
        categoryResources.forEach(resource => {
          content += `<div class="resource">
            <div class="resource-title"><a href="${escapeHtml(resource.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(resource.title)}</a></div>`;
          if (exportOptions.includeDescriptions && resource.description) {
            content += `<div class="resource-description">${escapeHtml(resource.description)}</div>`;
          }
          const tags = getResourceTags(resource);
          if (exportOptions.includeTags && tags.length) {
            content += `<div class="tags">${tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>`;
          }
          content += `</div>`;
        });
      });
    } else {
      resources.forEach(resource => {
        content += `<div class="resource">
          <div class="resource-title"><a href="${escapeHtml(resource.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(resource.title)}</a></div>`;
        if (exportOptions.includeCategories) {
          content += `<div class="resource-category">Category: ${escapeHtml(resource.category)}</div>`;
        }
        if (exportOptions.includeDescriptions && resource.description) {
          content += `<div class="resource-description">${escapeHtml(resource.description)}</div>`;
        }
        const tags = getResourceTags(resource);
        if (exportOptions.includeTags && tags.length) {
          content += `<div class="tags">${tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>`;
        }
        content += `</div>`;
      });
    }

    content += `<div class="footer">Exported from ${escapeHtml(awesomeList.title)} on ${escapeHtml(new Date().toLocaleDateString())}</div>
</body>
</html>`;
    return content;
  };

  const generateYAML = (resources: Resource[]): string => {
    // NB-011 (run18): every scalar goes through yamlString() so backslashes and
    // quotes are escaped and the document parses under strict YAML parsers.
    let content = `title: ${yamlString(awesomeList.title)}\n`;
    content += `description: ${yamlString(awesomeList.description)}\n`;
    content += `export_date: ${yamlString(new Date().toISOString())}\n`;
    content += `total_resources: ${resources.length}\n`;
    content += `resources:\n`;
    
    resources.forEach(resource => {
      content += `  - title: ${yamlString(resource.title)}\n`;
      content += `    url: ${yamlString(resource.url)}\n`;
      if (exportOptions.includeCategories) {
        content += `    category: ${yamlString(resource.category)}\n`;
      }
      if (exportOptions.includeDescriptions && resource.description) {
        content += `    description: ${yamlString(resource.description)}\n`;
      }
      // NB-012 (run18): tags resolved from metadata.tags.
      const tags = getResourceTags(resource);
      if (exportOptions.includeTags && tags.length) {
        content += `    tags: [${tags.map(tag => yamlString(tag)).join(', ')}]\n`;
      }
    });

    return content;
  };

  const handleExport = async () => {
    // NB-032 (run23): ref-based re-entry guard. The isExporting state disables
    // the button, but state updates land a render later — a fast double-click
    // (or Enter-key repeat) could enter this handler twice and download the
    // same file twice. The ref flips synchronously, so the second call bails
    // before generating anything.
    if (exportingRef.current) return;
    exportingRef.current = true;
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
        case 'pdf': {
          // BUG-001 (run22): the previous hidden-iframe `print()` flow never
          // produced a .pdf — print dialogs are suppressed or manual in many
          // browsers (mobile especially), and the audit observed no request,
          // download, blob, or error. Generate a REAL PDF client-side with
          // jsPDF (lazy-loaded, so it never lands in the entry bundle) and
          // download it like every other format. Failures propagate to the
          // shared catch below → visible destructive toast.
          const { jsPDF } = await import("jspdf");
          const baseName = awesomeList.title.toLowerCase().replace(/\s+/g, '-');
          const doc = new jsPDF({ unit: "pt", format: "a4" });
          const pageWidth = doc.internal.pageSize.getWidth();
          const pageHeight = doc.internal.pageSize.getHeight();
          const margin = 48;
          const maxWidth = pageWidth - margin * 2;
          let y = margin;

          const ensureRoom = (needed: number) => {
            if (y + needed > pageHeight - margin) {
              doc.addPage();
              y = margin;
            }
          };
          const writeLines = (
            text: string,
            size: number,
            style: "normal" | "bold",
            gapAfter: number,
            rgb: [number, number, number] = [20, 20, 20],
          ) => {
            doc.setFontSize(size);
            doc.setFont("helvetica", style);
            doc.setTextColor(rgb[0], rgb[1], rgb[2]);
            const lines = doc.splitTextToSize(String(text ?? ""), maxWidth) as string[];
            const lineHeight = size * 1.35;
            for (const line of lines) {
              ensureRoom(lineHeight);
              doc.text(line, margin, y);
              y += lineHeight;
            }
            y += gapAfter;
          };

          writeLines(awesomeList.title, 20, "bold", 6);
          if (exportOptions.includeDescriptions && awesomeList.description) {
            writeLines(awesomeList.description, 11, "normal", 8, [90, 90, 90]);
          }
          writeLines(
            `${resources.length} resources — exported ${new Date().toLocaleDateString()}`,
            9,
            "normal",
            14,
            [130, 130, 130],
          );

          const writeResource = (resource: Resource, showCategory: boolean) => {
            writeLines(resource.title, 11, "bold", 0);
            if (showCategory) {
              writeLines(resource.category, 8, "normal", 0, [130, 130, 130]);
            }
            const hasDesc = exportOptions.includeDescriptions && !!resource.description;
            writeLines(resource.url, 9, "normal", hasDesc ? 0 : 2, [0, 90, 160]);
            if (hasDesc) {
              writeLines(resource.description!, 9, "normal", 2, [90, 90, 90]);
            }
            const tags = getResourceTags(resource);
            if (exportOptions.includeTags && tags.length) {
              writeLines(`Tags: ${tags.join(", ")}`, 8, "normal", 2, [130, 130, 130]);
            }
            y += 4;
          };

          // Yield to the event loop periodically so the "Exporting..." spinner
          // keeps painting during large generations (2,000+ resources).
          let processed = 0;
          const maybeYield = async () => {
            processed++;
            if (processed % 150 === 0) {
              await new Promise((resolve) => setTimeout(resolve, 0));
            }
          };

          if (exportOptions.groupByCategory) {
            const categorizedResources = resources.reduce((acc, resource) => {
              if (!acc[resource.category]) acc[resource.category] = [];
              acc[resource.category].push(resource);
              return acc;
            }, {} as Record<string, Resource[]>);
            for (const [category, categoryResources] of Object.entries(categorizedResources)) {
              ensureRoom(34);
              y += 8;
              writeLines(category, 15, "bold", 8);
              for (const resource of categoryResources) {
                writeResource(resource, false);
                await maybeYield();
              }
            }
          } else {
            for (const resource of resources) {
              writeResource(resource, exportOptions.includeCategories);
              await maybeYield();
            }
          }

          doc.save(`${baseName}.pdf`);
          toast({
            title: "Export Successful",
            description: `${resources.length} resources exported as PDF`,
            variant: "default",
          });
          return;
        }
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
      // Synchronous formats (everything except PDF) finish INSIDE the first
      // click's dispatch — an immediate reset would re-arm the handler before
      // the second click of a double-click lands, downloading the file twice.
      // Hold the latch through a short cooldown instead (longer than any OS
      // double-click interval, short enough to never block a deliberate
      // repeat export).
      window.setTimeout(() => {
        exportingRef.current = false;
      }, 600);
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
                className="h-6 w-6"
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
                className="h-6 w-6"
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
                className="h-6 w-6"
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
                className="h-6 w-6"
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
                  className="h-6 w-6"
                  id={`category-${category.name}`}
                  checked={exportOptions.selectedCategories.includes(category.name)}
                  onCheckedChange={() => toggleCategory(category.name)}
                />
                <label htmlFor={`category-${category.name}`} className="text-sm cursor-pointer">
                  {category.name} ({categoryCounts[category.name] || 0})
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Export Summary */}
        <div className="p-4 bg-muted">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium">Export Summary</span>
          </div>
          <div className="text-sm text-muted-foreground space-y-1">
            <div>Format: <Badge variant="outline">{exportOptions.format.toUpperCase()}</Badge></div>
            <div>Resources: <span className="font-medium">{resourceCount}</span></div>
            <div>Categories: <span className="font-medium">
              {exportOptions.selectedCategories.length === awesomeList.categories.length && awesomeList.categories.length > 0
                ? `All (${awesomeList.categories.length})`
                : exportOptions.selectedCategories.length}
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
              <div className="animate-spin h-4 w-4 border-b-2 border-current mr-2" />
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