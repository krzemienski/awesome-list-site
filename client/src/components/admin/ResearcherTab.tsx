import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Play,
  XCircle,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Brain,
  ExternalLink,
  Activity,
  Zap,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ResearchJob, ResearchDiscovery } from "@shared/schema";

function getStatusBadge(status: string) {
  switch (status) {
    case "processing":
      return <Badge variant="default" className="bg-blue-500/20 text-blue-400 border-blue-500/30"><Activity className="w-3 h-3 mr-1 animate-pulse" />Running</Badge>;
    case "completed":
      return <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle2 className="w-3 h-3 mr-1" />Completed</Badge>;
    case "failed":
      return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Failed</Badge>;
    case "cancelled":
      return <Badge variant="outline"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
    default:
      return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />{status}</Badge>;
  }
}

function getDiscoveryStatusBadge(status: string) {
  switch (status) {
    case "pending_review":
      return <Badge variant="outline" className="border-yellow-500/30 text-yellow-400"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    case "approved":
      return <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30"><ThumbsUp className="w-3 h-3 mr-1" />Approved</Badge>;
    case "rejected":
      return <Badge variant="destructive"><ThumbsDown className="w-3 h-3 mr-1" />Rejected</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default function ResearcherTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [prompt, setPrompt] = useState("Find new, high-quality video streaming and development resources that aren't already in our database. Focus on recently launched tools, libraries, and platforms.");
  const [categoryFocus, setCategoryFocus] = useState("");
  const [maxBudget, setMaxBudget] = useState("1.00");
  const [maxTurns, setMaxTurns] = useState(30);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [rejectDialogId, setRejectDialogId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [isPolling, setIsPolling] = useState(false);

  const { data: jobs, isLoading: jobsLoading } = useQuery<ResearchJob[]>({
    queryKey: ['/api/researcher/jobs'],
    refetchInterval: isPolling ? 5000 : false,
  });

  const { data: selectedJob } = useQuery<ResearchJob & { isActive: boolean }>({
    queryKey: ['/api/researcher/jobs', selectedJobId],
    enabled: !!selectedJobId,
    refetchInterval: showJobDetails ? 3000 : false,
  });

  const { data: pendingDiscoveries } = useQuery<ResearchDiscovery[]>({
    queryKey: ['/api/researcher/discoveries'],
    refetchInterval: isPolling ? 10000 : false,
  });

  const { data: jobDiscoveries } = useQuery<ResearchDiscovery[]>({
    queryKey: ['/api/researcher/discoveries', selectedJobId ? `?jobId=${selectedJobId}` : ''],
    enabled: !!selectedJobId && showJobDetails,
    queryFn: async () => {
      const res = await fetch(`/api/researcher/discoveries?jobId=${selectedJobId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });

  const { data: categoriesData } = useQuery<any>({
    queryKey: ['/api/awesome-list'],
  });

  const categoryNames = categoriesData?.categories
    ? categoriesData.categories.map((c: any) => c.name || c.title)
    : [];

  const startMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/researcher/start', {
        method: 'POST',
        body: JSON.stringify({
          prompt,
          categoryFocus: categoryFocus && categoryFocus !== 'all' ? categoryFocus : undefined,
          maxBudgetUsd: maxBudget,
          maxTurns,
        }),
      });
    },
    onSuccess: () => {
      setIsPolling(true);
      queryClient.invalidateQueries({ queryKey: ['/api/researcher/jobs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/researcher/discoveries'] });
      toast({ title: "Research started", description: "AI researcher is now discovering new resources." });
    },
    onError: (error: any) => {
      toast({ title: "Failed to start research", description: error.message, variant: "destructive" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (jobId: number) => {
      return await apiRequest(`/api/researcher/jobs/${jobId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/researcher/jobs'] });
      toast({ title: "Job cancelled" });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (discoveryId: number) => {
      return await apiRequest(`/api/researcher/discoveries/${discoveryId}/approve`, { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/researcher/discoveries'] });
      queryClient.invalidateQueries({ queryKey: ['/api/researcher/jobs'] });
      toast({ title: "Resource approved", description: "Discovery added to the database." });
    },
    onError: (error: any) => {
      toast({ title: "Failed to approve", description: error.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason?: string }) => {
      return await apiRequest(`/api/researcher/discoveries/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/researcher/discoveries'] });
      queryClient.invalidateQueries({ queryKey: ['/api/researcher/jobs'] });
      setRejectDialogId(null);
      setRejectReason("");
      toast({ title: "Discovery rejected" });
    },
  });

  const activeJobs = jobs?.filter(j => j.status === 'processing') || [];

  useEffect(() => {
    const hasActive = activeJobs.length > 0;
    if (hasActive !== isPolling) {
      setIsPolling(hasActive);
    }
  }, [activeJobs.length]);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="launch" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="launch"><Brain className="w-4 h-4 mr-1" />Launch Research</TabsTrigger>
          <TabsTrigger value="review">
            <Search className="w-4 h-4 mr-1" />Review Discoveries
            {pendingDiscoveries && pendingDiscoveries.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 px-1.5 text-xs">{pendingDiscoveries.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history"><Clock className="w-4 h-4 mr-1" />Job History</TabsTrigger>
        </TabsList>

        <TabsContent value="launch">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Brain className="w-5 h-5 text-primary" />New Research Job</CardTitle>
                <CardDescription>Configure and launch an AI researcher to discover new video streaming resources</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="prompt">Research Prompt</Label>
                  <Textarea
                    id="prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe what types of resources to search for..."
                    className="mt-1 min-h-[100px]"
                  />
                </div>

                <div>
                  <Label>Category Focus (Optional)</Label>
                  <Select value={categoryFocus} onValueChange={setCategoryFocus}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      {categoryNames.map((name: string) => (
                        <SelectItem key={name} value={name}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="budget">Budget (USD)</Label>
                    <div className="flex items-center gap-1 mt-1">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <Input
                        id="budget"
                        type="number"
                        step="0.25"
                        min="0.25"
                        max="10.00"
                        value={maxBudget}
                        onChange={(e) => setMaxBudget(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="turns">Max Turns</Label>
                    <Input
                      id="turns"
                      type="number"
                      min={5}
                      max={100}
                      value={maxTurns}
                      onChange={(e) => setMaxTurns(parseInt(e.target.value) || 30)}
                      className="mt-1"
                    />
                  </div>
                </div>

                <Alert>
                  <Zap className="w-4 h-4" />
                  <AlertDescription>
                    Uses Claude Sonnet 4 (~$3/M input, $15/M output tokens). Typical job costs $0.10-$0.50. The researcher automatically deduplicates against {categoriesData?.resources?.length || '~1,950'} existing resources.
                  </AlertDescription>
                </Alert>

                <Button
                  onClick={() => startMutation.mutate()}
                  disabled={startMutation.isPending || prompt.trim().length < 10}
                  className="w-full"
                >
                  {startMutation.isPending ? (
                    <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Starting...</>
                  ) : (
                    <><Play className="w-4 h-4 mr-2" />Launch Researcher</>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5 text-primary" />Active Jobs</CardTitle>
                <CardDescription>Currently running research jobs</CardDescription>
              </CardHeader>
              <CardContent>
                {activeJobs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No active research jobs</p>
                ) : (
                  <div className="space-y-3">
                    {activeJobs.map(job => (
                      <Card key={job.id} className="border-blue-500/20">
                        <CardContent className="p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Job #{job.id}</span>
                            {getStatusBadge(job.status)}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">{job.prompt}</p>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">Found:</span>{' '}
                              <span className="font-medium">{job.totalDiscoveries || 0}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Turns:</span>{' '}
                              <span className="font-medium">{job.turnsUsed || 0}/{job.maxTurns}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Cost:</span>{' '}
                              <span className="font-medium">${job.estimatedCostUsd || '0.00'}</span>
                            </div>
                          </div>
                          {job.maxTurns && (
                            <Progress value={((job.turnsUsed || 0) / job.maxTurns) * 100} className="h-1" />
                          )}
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => { setSelectedJobId(job.id); setShowJobDetails(true); }}
                            >
                              <Eye className="w-3 h-3 mr-1" />Details
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => cancelMutation.mutate(job.id)}
                            >
                              <XCircle className="w-3 h-3 mr-1" />Cancel
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="review">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5 text-primary" />
                Pending Discoveries
                {pendingDiscoveries && pendingDiscoveries.length > 0 && (
                  <Badge variant="destructive" className="ml-2">{pendingDiscoveries.length}</Badge>
                )}
              </CardTitle>
              <CardDescription>Review and approve or reject AI-discovered resources</CardDescription>
            </CardHeader>
            <CardContent>
              {!pendingDiscoveries || pendingDiscoveries.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No pending discoveries to review</p>
              ) : (
                <div className="space-y-3">
                  {pendingDiscoveries.map(d => (
                    <Card key={d.id} className="border-border/50">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-sm truncate">{d.title}</h4>
                              {d.confidence && (
                                <Badge variant="outline" className="text-xs shrink-0">
                                  {d.confidence}% confident
                                </Badge>
                              )}
                            </div>
                            <a href={d.url} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline flex items-center gap-1 truncate">
                              {d.url} <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
                            {d.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2">{d.description}</p>
                            )}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {d.suggestedCategory && <Badge variant="secondary" className="text-xs">{d.suggestedCategory}</Badge>}
                              {d.suggestedSubcategory && <Badge variant="outline" className="text-xs">{d.suggestedSubcategory}</Badge>}
                              <span>Job #{d.jobId}</span>
                            </div>
                            {d.reasoning && (
                              <p className="text-xs text-muted-foreground italic mt-1">"{d.reasoning}"</p>
                            )}
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button
                              size="sm"
                              variant="default"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => approveMutation.mutate(d.id)}
                              disabled={approveMutation.isPending}
                            >
                              <ThumbsUp className="w-3 h-3 mr-1" />Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setRejectDialogId(d.id)}
                            >
                              <ThumbsDown className="w-3 h-3 mr-1" />Reject
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Research Job History</CardTitle>
              <CardDescription>All past research jobs and their results</CardDescription>
            </CardHeader>
            <CardContent>
              {jobsLoading ? (
                <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
              ) : !jobs || jobs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No research jobs yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Prompt</TableHead>
                      <TableHead>Found</TableHead>
                      <TableHead>Approved</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Turns</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.map(job => (
                      <TableRow key={job.id}>
                        <TableCell className="font-medium">#{job.id}</TableCell>
                        <TableCell>{getStatusBadge(job.status)}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-xs">{job.prompt}</TableCell>
                        <TableCell>{job.totalDiscoveries || 0}</TableCell>
                        <TableCell>
                          <span className="text-green-400">{job.approvedDiscoveries || 0}</span>
                          {' / '}
                          <span className="text-red-400">{job.rejectedDiscoveries || 0}</span>
                        </TableCell>
                        <TableCell>${job.estimatedCostUsd || '0.00'}</TableCell>
                        <TableCell>{job.turnsUsed || 0}/{job.maxTurns}</TableCell>
                        <TableCell className="text-xs">
                          {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => { setSelectedJobId(job.id); setShowJobDetails(true); }}
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                            {job.status === 'processing' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive"
                                onClick={() => cancelMutation.mutate(job.id)}
                              >
                                <XCircle className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showJobDetails} onOpenChange={setShowJobDetails}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Research Job #{selectedJob?.id}
              {selectedJob && getStatusBadge(selectedJob.status)}
            </DialogTitle>
          </DialogHeader>
          {selectedJob && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center p-2 border rounded">
                  <div className="text-lg font-bold">{selectedJob.totalDiscoveries || 0}</div>
                  <div className="text-xs text-muted-foreground">Discovered</div>
                </div>
                <div className="text-center p-2 border rounded">
                  <div className="text-lg font-bold text-green-400">{selectedJob.approvedDiscoveries || 0}</div>
                  <div className="text-xs text-muted-foreground">Approved</div>
                </div>
                <div className="text-center p-2 border rounded">
                  <div className="text-lg font-bold">{selectedJob.duplicatesSkipped || 0}</div>
                  <div className="text-xs text-muted-foreground">Duplicates</div>
                </div>
                <div className="text-center p-2 border rounded">
                  <div className="text-lg font-bold">${selectedJob.estimatedCostUsd || '0.00'}</div>
                  <div className="text-xs text-muted-foreground">Cost</div>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Prompt</Label>
                <p className="text-sm mt-1">{selectedJob.prompt}</p>
              </div>

              {selectedJob.categoryFocus && (
                <div>
                  <Label className="text-xs text-muted-foreground">Focus</Label>
                  <p className="text-sm mt-1">{selectedJob.categoryFocus}</p>
                </div>
              )}

              {selectedJob.errorMessage && (
                <Alert variant="destructive">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>{selectedJob.errorMessage}</AlertDescription>
                </Alert>
              )}

              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">
                  Turns: {selectedJob.turnsUsed || 0}/{selectedJob.maxTurns} |
                  Input: {(selectedJob.totalInputTokens || 0).toLocaleString()} |
                  Output: {(selectedJob.totalOutputTokens || 0).toLocaleString()} tokens
                </Label>
                <Button variant="outline" size="sm" onClick={() => setShowLog(!showLog)}>
                  {showLog ? 'Hide' : 'Show'} Log
                </Button>
              </div>

              {showLog && selectedJob.agentLog && (
                <ScrollArea className="h-[300px] border rounded p-2">
                  <div className="space-y-1 font-mono text-xs">
                    {(selectedJob.agentLog as Array<{ role: string; content: string; timestamp: string }>).map((entry, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="text-muted-foreground shrink-0">
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </span>
                        <Badge variant="outline" className="shrink-0 h-5 text-[10px]">{entry.role}</Badge>
                        <span className={
                          entry.role === 'error' ? 'text-red-400' :
                          entry.role === 'system' ? 'text-yellow-400' :
                          entry.role === 'tool_call' ? 'text-cyan-400' :
                          entry.role === 'tool_result' ? 'text-green-400' :
                          'text-foreground'
                        }>
                          {entry.content}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}

              {jobDiscoveries && jobDiscoveries.length > 0 && (
                <>
                  <Separator />
                  <Label className="text-xs text-muted-foreground">Discoveries from this job</Label>
                  <div className="space-y-2">
                    {jobDiscoveries.map(d => (
                      <div key={d.id} className="flex items-center justify-between border rounded p-2 text-sm">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{d.title}</span>
                            {getDiscoveryStatusBadge(d.status)}
                          </div>
                          <a href={d.url} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline truncate block">
                            {d.url}
                          </a>
                        </div>
                        {d.status === 'pending_review' && (
                          <div className="flex gap-1 ml-2">
                            <Button size="sm" variant="ghost" className="text-green-400 h-7"
                              onClick={() => approveMutation.mutate(d.id)}>
                              <ThumbsUp className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-red-400 h-7"
                              onClick={() => setRejectDialogId(d.id)}>
                              <ThumbsDown className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectDialogId} onOpenChange={(open) => { if (!open) { setRejectDialogId(null); setRejectReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Discovery</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Reason (optional)</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Why is this resource being rejected?"
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectDialogId(null)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={() => rejectDialogId && rejectMutation.mutate({ id: rejectDialogId, reason: rejectReason || undefined })}
                disabled={rejectMutation.isPending}
              >
                Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
