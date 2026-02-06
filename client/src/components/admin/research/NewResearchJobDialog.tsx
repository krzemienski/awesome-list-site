import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Sparkles,
  Info,
  RefreshCw,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useCreateResearchJob, useAwesomeLists } from "./hooks/useResearchJobs";
import type { ResearchJobType, ResearchDepth } from "./types";

interface NewResearchJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const JOB_TYPES = [
  {
    value: "comprehensive" as ResearchJobType,
    label: "Comprehensive Research",
    description: "Full analysis: dead links, enrichment, new resources, categories",
  },
  {
    value: "dead_link_check" as ResearchJobType,
    label: "Dead Link Check",
    description: "Scan for broken links and suggest replacements",
  },
  {
    value: "enrichment_suggestions" as ResearchJobType,
    label: "Enrichment Suggestions",
    description: "Improve descriptions, tags, and metadata",
  },
  {
    value: "category_review" as ResearchJobType,
    label: "Category Review",
    description: "Review and suggest category improvements",
  },
];

const DEPTH_OPTIONS = [
  {
    value: "shallow" as ResearchDepth,
    label: "Shallow",
    description: "Quick scan, basic checks",
  },
  {
    value: "medium" as ResearchDepth,
    label: "Medium",
    description: "Balanced depth and speed",
  },
  {
    value: "deep" as ResearchDepth,
    label: "Deep",
    description: "Thorough analysis, detailed findings",
  },
];

const FOCUS_AREAS = [
  { id: "quality", label: "Quality Check", description: "Verify resource quality and relevance" },
  { id: "metadata", label: "Metadata", description: "Improve descriptions and tags" },
  { id: "links", label: "Link Health", description: "Check for dead/broken links" },
  { id: "discovery", label: "New Resources", description: "Discover new relevant resources" },
  { id: "categorization", label: "Categorization", description: "Review category assignments" },
  { id: "duplicates", label: "Duplicates", description: "Find duplicate entries" },
];

export default function NewResearchJobDialog({ open, onOpenChange }: NewResearchJobDialogProps) {
  const [awesomeListId, setAwesomeListId] = useState<number | null>(null);
  const [jobType, setJobType] = useState<ResearchJobType>("comprehensive");
  const [depth, setDepth] = useState<ResearchDepth>("medium");
  const [focusAreas, setFocusAreas] = useState<string[]>(["quality", "links"]);
  const [agentCount, setAgentCount] = useState<number>(2);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: listsData, isLoading: listsLoading } = useAwesomeLists();
  const createMutation = useCreateResearchJob();

  const lists = listsData?.lists || [];
  const filteredLists = lists.filter((list) =>
    list.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleFocusArea = (areaId: string) => {
    setFocusAreas((prev) =>
      prev.includes(areaId)
        ? prev.filter((id) => id !== areaId)
        : [...prev, areaId]
    );
  };

  const handleSubmit = () => {
    if (!awesomeListId) {
      return;
    }

    if (focusAreas.length === 0) {
      return;
    }

    createMutation.mutate(
      {
        awesomeListId,
        jobType,
        depth,
        focusAreas,
        agentCount,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          // Reset form
          setAwesomeListId(null);
          setJobType("comprehensive");
          setDepth("medium");
          setFocusAreas(["quality", "links"]);
          setAgentCount(2);
          setSearchTerm("");
        },
      }
    );
  };

  const isValid = awesomeListId !== null && focusAreas.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-pink-500" />
            Create Research Job
          </DialogTitle>
          <DialogDescription>
            Configure an AI research job to analyze and improve your awesome list
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-180px)] pr-4">
          <div className="space-y-6 py-4">
            {/* Awesome List Selection */}
            <div className="space-y-3">
              <Label htmlFor="awesome-list">Awesome List *</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search lists..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <ScrollArea className="h-[150px] border rounded-md">
                {listsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredLists.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No lists found
                  </div>
                ) : (
                  <div className="p-2 space-y-2">
                    {filteredLists.map((list) => (
                      <div
                        key={list.id}
                        onClick={() => setAwesomeListId(list.id)}
                        className={`p-3 border rounded cursor-pointer transition-colors ${
                          awesomeListId === list.id
                            ? "border-pink-500 bg-pink-500/10"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{list.name}</span>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline">{list.resourceCount} resources</Badge>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground line-clamp-1">
                          {list.description}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            <Separator />

            {/* Job Type */}
            <div className="space-y-3">
              <Label>Job Type *</Label>
              <RadioGroup value={jobType} onValueChange={(v) => setJobType(v as ResearchJobType)}>
                <div className="space-y-2">
                  {JOB_TYPES.map((type) => (
                    <div
                      key={type.value}
                      className={`flex items-start space-x-3 p-3 border rounded cursor-pointer transition-colors ${
                        jobType === type.value ? "border-pink-500 bg-pink-500/10" : "hover:bg-muted/50"
                      }`}
                      onClick={() => setJobType(type.value)}
                    >
                      <RadioGroupItem value={type.value} id={type.value} className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor={type.value} className="font-medium cursor-pointer">
                          {type.label}
                        </Label>
                        <p className="text-sm text-muted-foreground">{type.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            <Separator />

            {/* Depth */}
            <div className="space-y-3">
              <Label>Research Depth *</Label>
              <RadioGroup value={depth} onValueChange={(v) => setDepth(v as ResearchDepth)}>
                <div className="grid grid-cols-3 gap-2">
                  {DEPTH_OPTIONS.map((option) => (
                    <div
                      key={option.value}
                      className={`flex flex-col p-3 border rounded cursor-pointer transition-colors ${
                        depth === option.value ? "border-pink-500 bg-pink-500/10" : "hover:bg-muted/50"
                      }`}
                      onClick={() => setDepth(option.value)}
                    >
                      <div className="flex items-center space-x-2 mb-2">
                        <RadioGroupItem value={option.value} id={option.value} />
                        <Label htmlFor={option.value} className="font-medium cursor-pointer">
                          {option.label}
                        </Label>
                      </div>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            <Separator />

            {/* Focus Areas */}
            <div className="space-y-3">
              <Label>Focus Areas * (select at least one)</Label>
              <div className="grid grid-cols-2 gap-3">
                {FOCUS_AREAS.map((area) => (
                  <div
                    key={area.id}
                    className={`flex items-start space-x-3 p-3 border rounded cursor-pointer transition-colors ${
                      focusAreas.includes(area.id) ? "border-pink-500 bg-pink-500/10" : "hover:bg-muted/50"
                    }`}
                    onClick={() => handleToggleFocusArea(area.id)}
                  >
                    <Checkbox
                      checked={focusAreas.includes(area.id)}
                      onCheckedChange={() => handleToggleFocusArea(area.id)}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{area.label}</div>
                      <p className="text-xs text-muted-foreground">{area.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              {focusAreas.length === 0 && (
                <Alert className="border-yellow-500/20 bg-yellow-500/5">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    Please select at least one focus area
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <Separator />

            {/* Agent Count */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Number of AI Agents</Label>
                <Badge variant="outline" className="font-mono">
                  {agentCount}
                </Badge>
              </div>
              <Slider
                value={[agentCount]}
                onValueChange={(v) => setAgentCount(v[0])}
                min={1}
                max={4}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                More agents = faster processing but higher API costs
              </p>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || createMutation.isPending}
            className="bg-pink-500 hover:bg-pink-600"
          >
            {createMutation.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Start Research
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
