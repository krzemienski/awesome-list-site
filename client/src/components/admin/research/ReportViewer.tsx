"use client"

import * as React from "react"
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { FileText, Download, Check, X, ExternalLink, AlertCircle, Info, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface ReportViewerProps {
  jobId: string
}

interface Finding {
  id: string
  title: string
  description: string
  severity: "info" | "warning" | "critical"
  category: string
  recommendation?: string
  affectedItems?: string[]
  metadata?: Record<string, any>
}

interface Source {
  id: string
  title: string
  url: string
  type: "documentation" | "repository" | "article" | "other"
  relevance: number
}

interface ResearchReport {
  id: string
  jobId: string
  type: string
  summary: string
  methodology: string
  findings: Finding[]
  recommendations: string[]
  sources: Source[]
  metadata: {
    itemsAnalyzed: number
    duration: string
    model: string
    confidence: number
  }
  createdAt: string
}

const severityConfig = {
  info: {
    icon: Info,
    color: "text-accent",
    bg: "bg-accent/10",
    border: "border-accent/30"
  },
  warning: {
    icon: AlertTriangle,
    color: "text-[oklch(0.85_0.1485_79.1207)]",
    bg: "bg-[oklch(0.85_0.1485_79.1207)]/10",
    border: "border-[oklch(0.85_0.1485_79.1207)]/30"
  },
  critical: {
    icon: AlertCircle,
    color: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/30"
  }
}

export function ReportViewer({ jobId }: ReportViewerProps) {
  const queryClient = useQueryClient()
  const [expandedFindings, setExpandedFindings] = useState<Set<string>>(new Set())

  // Fetch report
  const { data: report, isLoading } = useQuery<ResearchReport>({
    queryKey: ["research-report", jobId],
    queryFn: async () => {
      const response = await fetch(`/api/research/jobs/${jobId}/report`)
      if (!response.ok) throw new Error("Failed to fetch report")
      return response.json()
    },
    enabled: !!jobId
  })

  // Apply finding mutation
  const applyFindingMutation = useMutation({
    mutationFn: async (findingId: string) => {
      const response = await fetch(`/api/research/findings/${findingId}/apply`, {
        method: "POST"
      })
      if (!response.ok) throw new Error("Failed to apply finding")
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["research-report", jobId] })
    }
  })

  // Dismiss finding mutation
  const dismissFindingMutation = useMutation({
    mutationFn: async (findingId: string) => {
      const response = await fetch(`/api/research/findings/${findingId}/dismiss`, {
        method: "POST"
      })
      if (!response.ok) throw new Error("Failed to dismiss finding")
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["research-report", jobId] })
    }
  })

  // Export as markdown
  const exportMarkdown = () => {
    if (!report) return

    const markdown = `# Research Report: ${report.type}

## Executive Summary
${report.summary}

## Methodology
${report.methodology}

## Key Metrics
- Items Analyzed: ${report.metadata.itemsAnalyzed}
- Duration: ${report.metadata.duration}
- Model: ${report.metadata.model.toUpperCase()}
- Confidence: ${(report.metadata.confidence * 100).toFixed(1)}%

## Findings (${report.findings.length})

${report.findings.map((finding, idx) => `
### ${idx + 1}. ${finding.title} [${finding.severity.toUpperCase()}]

${finding.description}

${finding.recommendation ? `**Recommendation:** ${finding.recommendation}` : ''}

${finding.affectedItems && finding.affectedItems.length > 0 ? `**Affected Items:** ${finding.affectedItems.join(', ')}` : ''}
`).join('\n')}

## Recommendations

${report.recommendations.map((rec, idx) => `${idx + 1}. ${rec}`).join('\n')}

## Sources

${report.sources.map(source => `- [${source.title}](${source.url}) (${source.type})`).join('\n')}

---
Generated: ${new Date(report.createdAt).toLocaleString()}
`

    const blob = new Blob([markdown], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `research-report-${report.id}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const toggleFinding = (id: string) => {
    const newSet = new Set(expandedFindings)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setExpandedFindings(newSet)
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-muted-foreground font-mono animate-pulse">
            Loading report...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!report) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="p-8">
          <div className="text-center text-destructive font-mono">
            Report not available
          </div>
        </CardContent>
      </Card>
    )
  }

  const findingsBySeverity = {
    critical: report.findings.filter(f => f.severity === "critical"),
    warning: report.findings.filter(f => f.severity === "warning"),
    info: report.findings.filter(f => f.severity === "info")
  }

  return (
    <div className="space-y-6 font-mono">
      {/* Header */}
      <Card className="border-primary/30">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle className="text-primary">Research Report</CardTitle>
              </div>
              <CardDescription className="text-sm">
                Job ID: {report.jobId} • Generated {new Date(report.createdAt).toLocaleString()}
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={exportMarkdown} className="gap-2">
              <Download className="h-4 w-4" />
              Export MD
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Executive Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Executive Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-foreground">{report.summary}</p>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Key Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Items Analyzed</div>
              <div className="text-2xl font-bold tabular-nums">{report.metadata.itemsAnalyzed}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Duration</div>
              <div className="text-2xl font-bold">{report.metadata.duration}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Model</div>
              <div className="text-2xl font-bold uppercase">{report.metadata.model}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Confidence</div>
              <div className="text-2xl font-bold tabular-nums">{(report.metadata.confidence * 100).toFixed(1)}%</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Methodology */}
      <Card>
        <CardHeader>
          <CardTitle>Methodology</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-muted-foreground">{report.methodology}</p>
        </CardContent>
      </Card>

      {/* Findings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Findings ({report.findings.length})</CardTitle>
            <div className="flex gap-2">
              {findingsBySeverity.critical.length > 0 && (
                <Badge variant="destructive" className="tabular-nums">
                  {findingsBySeverity.critical.length} Critical
                </Badge>
              )}
              {findingsBySeverity.warning.length > 0 && (
                <Badge className="tabular-nums bg-[oklch(0.85_0.1485_79.1207)] text-black">
                  {findingsBySeverity.warning.length} Warning
                </Badge>
              )}
              {findingsBySeverity.info.length > 0 && (
                <Badge variant="secondary" className="tabular-nums">
                  {findingsBySeverity.info.length} Info
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {report.findings.map((finding) => {
            const config = severityConfig[finding.severity]
            const Icon = config.icon
            const isExpanded = expandedFindings.has(finding.id)

            return (
              <div
                key={finding.id}
                className={cn(
                  "rounded border p-4 space-y-3",
                  config.bg,
                  config.border
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <Icon className={cn("h-5 w-5 mt-0.5", config.color)} />
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-foreground">{finding.title}</h4>
                        <Badge
                          variant="outline"
                          className={cn("uppercase text-xs", config.color)}
                        >
                          {finding.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{finding.description}</p>

                      {isExpanded && (
                        <>
                          {finding.recommendation && (
                            <div className="mt-3 p-3 rounded bg-card border border-border">
                              <div className="text-xs font-semibold text-primary mb-1">RECOMMENDATION</div>
                              <p className="text-sm">{finding.recommendation}</p>
                            </div>
                          )}

                          {finding.affectedItems && finding.affectedItems.length > 0 && (
                            <div className="mt-3">
                              <div className="text-xs font-semibold text-muted-foreground mb-2">
                                AFFECTED ITEMS ({finding.affectedItems.length})
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {finding.affectedItems.slice(0, 10).map((item, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    {item}
                                  </Badge>
                                ))}
                                {finding.affectedItems.length > 10 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{finding.affectedItems.length - 10} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleFinding(finding.id)}
                    >
                      {isExpanded ? "Less" : "More"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => applyFindingMutation.mutate(finding.id)}
                      disabled={applyFindingMutation.isPending}
                      className="text-primary hover:text-primary"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => dismissFindingMutation.mutate(finding.id)}
                      disabled={dismissFindingMutation.isPending}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Recommendations */}
      {report.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 list-decimal list-inside">
              {report.recommendations.map((rec, idx) => (
                <li key={idx} className="text-sm text-foreground leading-relaxed">
                  {rec}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Sources */}
      {report.sources.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sources ({report.sources.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {report.sources.map((source) => (
                <a
                  key={source.id}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start justify-between p-3 rounded border border-border hover:bg-accent/5 transition-colors group"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                        {source.title}
                      </span>
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {source.type} • Relevance: {(source.relevance * 100).toFixed(0)}%
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
