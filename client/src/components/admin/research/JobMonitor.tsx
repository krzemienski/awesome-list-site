"use client"

import * as React from "react"
import { useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { X, Clock, Zap, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface JobMonitorProps {
  jobId: string
  onClose?: () => void
}

interface JobStatus {
  id: string
  type: string
  status: "pending" | "running" | "completed" | "failed" | "cancelled"
  progress: number
  tokensInput: number
  tokensOutput: number
  cost: number
  startedAt: string
  estimatedCompletion?: string
  currentPhase?: string
  error?: string
}

export function JobMonitor({ jobId, onClose }: JobMonitorProps) {
  const queryClient = useQueryClient()

  // Fetch job status with auto-refresh
  const { data: job, isLoading } = useQuery<JobStatus>({
    queryKey: ["research-job", jobId],
    queryFn: async () => {
      const response = await fetch(`/api/research/jobs/${jobId}`)
      if (!response.ok) throw new Error("Failed to fetch job status")
      return response.json()
    },
    refetchInterval: (query) => {
      const data = query.state.data
      // Only auto-refresh if job is active
      return data?.status === "running" || data?.status === "pending" ? 5000 : false
    },
    enabled: !!jobId
  })

  // Cancel job mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/research/jobs/${jobId}`, {
        method: "DELETE"
      })
      if (!response.ok) throw new Error("Failed to cancel job")
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["research-job", jobId] })
      queryClient.invalidateQueries({ queryKey: ["research-jobs"] })
    }
  })

  // Calculate elapsed time
  const [elapsedTime, setElapsedTime] = React.useState<string>("0s")

  useEffect(() => {
    if (!job?.startedAt) return

    const interval = setInterval(() => {
      const start = new Date(job.startedAt).getTime()
      const now = Date.now()
      const elapsed = Math.floor((now - start) / 1000)

      const hours = Math.floor(elapsed / 3600)
      const minutes = Math.floor((elapsed % 3600) / 60)
      const seconds = elapsed % 60

      if (hours > 0) {
        setElapsedTime(`${hours}h ${minutes}m ${seconds}s`)
      } else if (minutes > 0) {
        setElapsedTime(`${minutes}m ${seconds}s`)
      } else {
        setElapsedTime(`${seconds}s`)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [job?.startedAt])

  if (isLoading) {
    return (
      <Card className="border-accent/30">
        <CardContent className="p-8">
          <div className="text-center text-muted-foreground font-mono animate-pulse">
            Loading job status...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!job) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="p-8">
          <div className="text-center text-destructive font-mono">
            Job not found
          </div>
        </CardContent>
      </Card>
    )
  }

  const isActive = job.status === "running" || job.status === "pending"
  const isError = job.status === "failed"

  return (
    <Card className={cn(
      "font-mono border-2",
      isActive && "border-accent/50 bg-accent/5",
      isError && "border-destructive/50 bg-destructive/5",
      job.status === "completed" && "border-primary/50 bg-primary/5"
    )}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className={cn(
              "text-lg",
              isActive && "text-accent",
              isError && "text-destructive",
              job.status === "completed" && "text-primary"
            )}>
              Job Monitor
            </CardTitle>
            <Badge className={cn(
              "uppercase",
              isActive && "bg-accent text-accent-foreground animate-pulse",
              isError && "bg-destructive text-destructive-foreground",
              job.status === "completed" && "bg-primary text-primary-foreground",
              job.status === "cancelled" && "bg-muted text-muted-foreground"
            )}>
              {job.status}
            </Badge>
          </div>
          {onClose && (
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current Phase */}
        {job.currentPhase && (
          <div className="text-sm">
            <span className="text-muted-foreground">Current Phase: </span>
            <span className="font-semibold text-foreground">{job.currentPhase}</span>
          </div>
        )}

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground font-semibold">Progress</span>
            <span className="font-bold tabular-nums text-accent">{job.progress}%</span>
          </div>
          <Progress
            value={job.progress}
            className={cn(
              "h-3",
              isActive && "bg-accent/20"
            )}
          />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Token Usage */}
          <div className="space-y-1 rounded border border-border bg-card p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Zap className="h-3 w-3" />
              <span className="uppercase tracking-wider">Tokens</span>
            </div>
            <div className="text-lg font-bold tabular-nums">
              {(job.tokensInput + job.tokensOutput).toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">
              {job.tokensInput.toLocaleString()} in • {job.tokensOutput.toLocaleString()} out
            </div>
          </div>

          {/* Current Cost */}
          <div className="space-y-1 rounded border border-border bg-card p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <DollarSign className="h-3 w-3" />
              <span className="uppercase tracking-wider">Cost</span>
            </div>
            <div className="text-lg font-bold tabular-nums text-primary">
              ${job.cost.toFixed(4)}
            </div>
            <div className="text-xs text-muted-foreground">
              Running total
            </div>
          </div>

          {/* Elapsed Time */}
          <div className="space-y-1 rounded border border-border bg-card p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span className="uppercase tracking-wider">Elapsed</span>
            </div>
            <div className="text-lg font-bold tabular-nums">
              {elapsedTime}
            </div>
            <div className="text-xs text-muted-foreground">
              Since start
            </div>
          </div>

          {/* Estimated Completion */}
          {job.estimatedCompletion && (
            <div className="space-y-1 rounded border border-border bg-card p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span className="uppercase tracking-wider">ETA</span>
              </div>
              <div className="text-lg font-bold tabular-nums">
                {new Date(job.estimatedCompletion).toLocaleTimeString()}
              </div>
              <div className="text-xs text-muted-foreground">
                Estimated
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {job.error && (
          <div className="rounded border border-destructive/30 bg-destructive/10 p-3">
            <div className="text-sm font-semibold text-destructive mb-1">Error</div>
            <div className="text-xs text-destructive/90">{job.error}</div>
          </div>
        )}

        {/* Actions */}
        {isActive && (
          <div className="flex justify-end pt-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Cancel Job
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
