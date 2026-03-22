"use client"

import * as React from "react"
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Play, Pause, Trash2, FileText, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

interface ResearchJob {
  id: string
  type: "validation" | "enrichment" | "discovery" | "trend_analysis"
  status: "pending" | "running" | "completed" | "failed" | "cancelled"
  model: "haiku" | "sonnet" | "opus"
  progress: number
  cost: number
  createdAt: string
  completedAt?: string
  error?: string
}

interface NewJobConfig {
  type: string
  model: string
  depth: "shallow" | "standard" | "deep"
  focusAreas: string[]
}

const jobTypeLabels = {
  validation: "Data Validation",
  enrichment: "Content Enrichment",
  discovery: "Category Discovery",
  trend_analysis: "Trend Analysis"
}

const modelCosts = {
  haiku: { input: 0.25, output: 1.25, label: "Haiku (Fast)" },
  sonnet: { input: 3.0, output: 15.0, label: "Sonnet (Balanced)" },
  opus: { input: 15.0, output: 75.0, label: "Opus (Deep)" }
}

const statusColors = {
  pending: "bg-muted text-muted-foreground",
  running: "bg-accent text-accent-foreground animate-pulse",
  completed: "bg-primary text-primary-foreground",
  failed: "bg-destructive text-destructive-foreground",
  cancelled: "bg-muted text-muted-foreground"
}

export function ResearchPanel() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newJob, setNewJob] = useState<NewJobConfig>({
    type: "validation",
    model: "sonnet",
    depth: "standard",
    focusAreas: []
  })
  const queryClient = useQueryClient()

  // Fetch all jobs
  const { data: jobs = [], isLoading } = useQuery<ResearchJob[]>({
    queryKey: ["research-jobs"],
    queryFn: async () => {
      const response = await fetch("/api/research/jobs")
      if (!response.ok) throw new Error("Failed to fetch jobs")
      return response.json()
    },
    refetchInterval: 5000 // Auto-refresh every 5s
  })

  // Start new job
  const startJobMutation = useMutation({
    mutationFn: async (config: NewJobConfig) => {
      const response = await fetch("/api/research/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config)
      })
      if (!response.ok) throw new Error("Failed to start job")
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["research-jobs"] })
      setDialogOpen(false)
      setNewJob({ type: "validation", model: "sonnet", depth: "standard", focusAreas: [] })
    }
  })

  // Cancel job
  const cancelJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const response = await fetch(`/api/research/jobs/${jobId}`, {
        method: "DELETE"
      })
      if (!response.ok) throw new Error("Failed to cancel job")
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["research-jobs"] })
    }
  })

  const activeJobs = jobs.filter(j => j.status === "running" || j.status === "pending")
  const recentJobs = jobs.filter(j => j.status !== "running" && j.status !== "pending").slice(0, 10)

  return (
    <div className="space-y-6 font-mono">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-primary">AI Research</h2>
          <p className="text-sm text-muted-foreground">Automated content analysis and enrichment</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Research Job
            </Button>
          </DialogTrigger>
          <DialogContent className="font-mono max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-primary">Start New Research Job</DialogTitle>
              <DialogDescription>
                Configure AI-powered research parameters
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Job Type */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Job Type</label>
                <Select value={newJob.type} onValueChange={(value) => setNewJob({ ...newJob, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="validation">Data Validation</SelectItem>
                    <SelectItem value="enrichment">Content Enrichment</SelectItem>
                    <SelectItem value="discovery">Category Discovery</SelectItem>
                    <SelectItem value="trend_analysis">Trend Analysis</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Model Selection */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">AI Model</label>
                <Select value={newJob.model} onValueChange={(value) => setNewJob({ ...newJob, model: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(modelCosts).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center justify-between w-full gap-4">
                          <span>{config.label}</span>
                          <span className="text-xs text-muted-foreground">
                            ${config.input}/MTok in • ${config.output}/MTok out
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Depth */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Analysis Depth</label>
                <Select value={newJob.depth} onValueChange={(value) => setNewJob({ ...newJob, depth: value as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="shallow">Shallow (Fast, lower cost)</SelectItem>
                    <SelectItem value="standard">Standard (Balanced)</SelectItem>
                    <SelectItem value="deep">Deep (Thorough, higher cost)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Cost Estimate */}
              <div className="rounded border border-accent/20 bg-card p-4">
                <div className="flex items-center gap-2 text-sm">
                  <AlertCircle className="h-4 w-4 text-accent" />
                  <span className="text-muted-foreground">
                    Estimated cost:
                    <span className="ml-1 font-bold text-accent">
                      ${modelCosts[newJob.model as keyof typeof modelCosts].input * 0.5} - ${modelCosts[newJob.model as keyof typeof modelCosts].output * 0.1}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={() => startJobMutation.mutate(newJob)}
                disabled={startJobMutation.isPending}
              >
                <Play className="h-4 w-4 mr-2" />
                Start Job
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Jobs Section */}
      {activeJobs.length > 0 && (
        <Card className="border-accent/30">
          <CardHeader>
            <CardTitle className="text-accent flex items-center gap-2">
              <Pause className="h-5 w-5 animate-pulse" />
              Active Jobs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeJobs.map((job) => (
              <div key={job.id} className="space-y-2 rounded border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge className={cn("uppercase", statusColors[job.status])}>
                      {job.status}
                    </Badge>
                    <span className="font-semibold">{jobTypeLabels[job.type]}</span>
                    <span className="text-xs text-muted-foreground">
                      {job.model.toUpperCase()}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => cancelJobMutation.mutate(job.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Progress</span>
                    <span className="font-bold">{job.progress}%</span>
                  </div>
                  <Progress value={job.progress} className="h-2" />
                </div>

                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Cost: ${job.cost.toFixed(4)}</span>
                  <span className="text-muted-foreground">
                    Started {new Date(job.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent Jobs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Jobs</CardTitle>
          <CardDescription>Completed and failed research jobs</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : recentJobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No completed jobs yet</div>
          ) : (
            <div className="space-y-2">
              {recentJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between rounded border border-border bg-card p-3 hover:bg-accent/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Badge className={cn("uppercase text-xs", statusColors[job.status])}>
                      {job.status}
                    </Badge>
                    <div className="flex flex-col">
                      <span className="font-semibold">{jobTypeLabels[job.type]}</span>
                      <span className="text-xs text-muted-foreground">
                        {job.model.toUpperCase()} • ${job.cost.toFixed(4)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {job.completedAt && new Date(job.completedAt).toLocaleString()}
                    </span>
                    {job.status === "completed" && (
                      <Button size="sm" variant="ghost">
                        <FileText className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
