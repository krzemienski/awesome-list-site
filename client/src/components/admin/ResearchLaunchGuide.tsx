import { forwardRef, useImperativeHandle, useRef, useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ChevronDown, ChevronRight, Play, RefreshCw, Wand2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ResearchRunConfigSummary } from "@/components/admin/ResearchRunConfigSummary";
import { useResearcherConfig, type ResearcherConfigOverrides } from "@/hooks/useResearcherConfig";
import { useDebounce } from "@/hooks/useDebounce";
import { useToast } from "@/hooks/use-toast";
import { ApiError, apiRequest } from "@/lib/queryClient";
import { describeWriteError } from "@/lib/apiError";
import { plainHttpHost } from "@shared/validation";
import { WARN_OUTLINE, WARN_TEXT, type CheapestSavingRun } from "./researchDisplay";

export interface ResearchLaunchGuideHandle {
  /** Bring the budget field into view and focus it ("relaunch with a higher cap"). */
  focusBudget: () => void;
}

interface ResearchLaunchGuideProps {
  categoryNames: string[];
  /** False while the job list is loading or failed: an active run can't be ruled out. */
  activeStateKnown: boolean;
  activeStateError: boolean;
  activeJobId: number | null;
  onFollow: (jobId: number) => void;
  onLaunched: (jobId: number) => void;
  costRange: { min: number; max: number } | null;
  /** The cheapest completed or budget-stopped run that saved a discovery, over the whole history. */
  cheapestSavingRun: CheapestSavingRun | null;
  catalogSize: number | null;
}

type BriefMode = "auto" | "custom";

// The low-budget threshold when the loaded job history has no run that saved
// a discovery. docs/AI-SERVICES.md "Budget": $0.30 caps (jobs 65, 68)
// stopped after 3 turns without a search.
const LOW_BUDGET_USD = 1.25;

const hint = (warn: boolean) => `mt-1 text-xs ${warn ? WARN_TEXT : "text-muted-foreground"}`;

function Step({ n, title, summary, children }: { n: number; title: string; summary?: ReactNode; children: ReactNode }) {
  const id = `research-step-${n}`;
  return (
    <section className="research-guide__step" aria-labelledby={id}>
      <div className="research-guide__step-head">
        <span className="research-guide__step-num" aria-hidden="true">{n}</span>
        <h4 id={id} className="text-sm font-semibold">{title}</h4>
        {summary ? <span className="research-guide__step-summary text-xs text-muted-foreground">{summary}</span> : null}
      </div>
      <div className="research-guide__step-body">{children}</div>
    </section>
  );
}

/**
 * Guided launch: brief → focus → limits → endpoint & model → "about to run
 * on" (GET /api/researcher/config, re-queried as the advanced fields change)
 * → confirm. Always mounted by ResearcherTab, so a launch works from
 * wherever the admin is on the tab.
 */
export const ResearchLaunchGuide = forwardRef<ResearchLaunchGuideHandle, ResearchLaunchGuideProps>(function ResearchLaunchGuide(
  { categoryNames, activeStateKnown, activeStateError, activeJobId, onFollow, onLaunched, costRange, cheapestSavingRun, catalogSize },
  ref,
) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const budgetRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => ({
    focusBudget: () => {
      budgetRef.current?.scrollIntoView({ block: "center" });
      budgetRef.current?.focus();
    },
  }));

  const [briefMode, setBriefModeState] = useState<BriefMode>("auto");
  const [prompt, setPrompt] = useState("");
  const [categoryFocus, setCategoryFocus] = useState("all");
  // $3 / 40 turns: on the cc/claude-opus-5 orchestrator one saved discovery
  // cost $1.14 in 8 turns and two hit a $1.50 cap (docs/AI-SERVICES.md).
  // Raw strings so typing "5.5" or "0" is never silently rewritten.
  const [maxBudget, setMaxBudget] = useState("3.00");
  const [maxTurns, setMaxTurns] = useState("40");
  const [targetDiscoveries, setTargetDiscoveries] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [model, setModel] = useState("");
  const [scoutModel, setScoutModel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [authToken, setAuthToken] = useState("");
  // Plain-http override endpoints need an explicit confirmation; the server
  // refuses them without allowInsecureHttp.
  const [confirmInsecureHttp, setConfirmInsecureHttp] = useState(false);
  const baseUrlIsPlainHttp = plainHttpHost(baseUrl) !== null;
  // After the first Launch click the error tracks the fields, so fixing one clears it.
  const [launchAttempted, setLaunchAttempted] = useState(false);
  // A new brief mode, or a finished launch, starts the form over: the next
  // validation message waits for the next Launch click.
  const setBriefMode = (mode: BriefMode) => {
    setBriefModeState(mode);
    setLaunchAttempted(false);
  };
  const [confirmOpen, setConfirmOpen] = useState(false);
  const launchedRef = useRef(false);

  // The summary is re-queried as the advanced fields change, debounced on a
  // string key (a fresh object each render would never settle).
  const overridesKey = JSON.stringify({
    model,
    scoutModel,
    baseUrl,
    hasAuthToken: authToken.trim() !== "",
    allowInsecureHttp: baseUrlIsPlainHttp && confirmInsecureHttp,
  });
  const debouncedKey = useDebounce(overridesKey, 400);
  const configQuery = useResearcherConfig(JSON.parse(debouncedKey) as ResearcherConfigOverrides);
  const config = configQuery.data?.config;
  // A preview that lags the typed fields must not unlock a launch.
  const previewCurrent = debouncedKey === overridesKey && !configQuery.isPlaceholderData && !!config;
  const preflightBlocked = !!config && !config.preflight.ok;
  const overrideCount = config ? Object.entries(config.overrides).filter(([k, v]) => k !== "insecureHttp" && v).length : 0;

  const effectivePrompt = briefMode === "custom" ? prompt : "";
  const target = targetDiscoveries.trim() === "" ? null : Number(targetDiscoveries);

  const brief = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/researcher/brief", { credentials: "include" });
      if (!res.ok) throw new ApiError(res.status, await res.text());
      return (await res.json()) as { brief?: string; angle?: string };
    },
    onSuccess: (data) => {
      if (!data.brief) return;
      setPrompt(data.brief);
      setBriefMode("custom");
      toast({ title: "Brief generated", description: data.angle ? `Campaign angle: ${data.angle}. Edit freely before launching.` : "Edit freely before launching." });
    },
    onError: (error) => {
      toast({ title: "Failed to generate brief", description: describeWriteError(error, { outcome: "No brief was generated. Please try again." }), variant: "destructive" });
    },
  });

  const start = useMutation({
    mutationFn: async () => (await apiRequest("/api/researcher/start", {
      method: "POST",
      body: JSON.stringify({
        prompt: effectivePrompt,
        categoryFocus: categoryFocus !== "all" ? categoryFocus : undefined,
        maxBudgetUsd: maxBudget.trim() === "" ? undefined : Number(maxBudget),
        maxTurns: maxTurns.trim() === "" ? undefined : Number(maxTurns),
        targetDiscoveries: target ?? undefined,
        model: model.trim() || undefined,
        scoutModel: scoutModel.trim() || undefined,
        baseUrl: baseUrl.trim() || undefined,
        authToken: authToken.trim() || undefined,
        allowInsecureHttp: baseUrlIsPlainHttp && confirmInsecureHttp ? true : undefined,
      }),
    })) as { jobId?: number },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["/api/researcher/jobs"] });
      void queryClient.invalidateQueries({ queryKey: ["/api/researcher/discoveries"] });
      setAuthToken("");
      setLaunchAttempted(false);
      if (typeof data.jobId === "number") {
        launchedRef.current = true;
        onLaunched(data.jobId);
      }
      setConfirmOpen(false);
    },
    // The confirmation dialog stays mounted on failure so its inline error
    // remains visible and the operator can retry without a toast remount.
  });

  const validate = (): string | null => {
    const trimmed = effectivePrompt.trim();
    if (briefMode === "custom" && trimmed.length < 10) {
      return "Brief too short: write at least 10 characters, or choose \"Auto-generate at launch\".";
    }
    if (maxBudget.trim() !== "") {
      const b = Number(maxBudget);
      if (!Number.isFinite(b) || b <= 0) return "Invalid budget: enter a positive number, or leave it blank for no cap.";
    }
    if (maxTurns.trim() !== "") {
      const t = Number(maxTurns);
      if (!Number.isInteger(t) || t <= 0) return "Invalid max turns: enter a positive whole number, or leave it blank for no cap.";
    }
    if (target !== null && (!Number.isInteger(target) || target <= 0 || target > 1000)) {
      return "Invalid discovery target: enter a whole number from 1 to 1000, or leave it blank for no target.";
    }
    return null;
  };
  const launchError = launchAttempted ? validate() : null;

  const handleLaunch = () => {
    setLaunchAttempted(true);
    if (validate()) return;
    start.reset();
    setConfirmOpen(true);
  };

  const launchBlockedReason = !activeStateKnown
    ? activeStateError ? "Job history failed to load, so an active run can't be ruled out. Retry the jobs table below first." : "Checking for an active run…"
    : activeJobId !== null ? null
      : preflightBlocked ? "Launch is blocked until the configuration issue above is fixed."
        : null;
  const launchDisabled = !activeStateKnown || activeJobId !== null || preflightBlocked || !previewCurrent || start.isPending;

  const budgetN = Number(maxBudget);
  const turnsN = Number(maxTurns);
  const limitsSummary = [
    target !== null && Number.isInteger(target) && target > 0 ? `stop after ${target}` : "no target",
    maxBudget.trim() === "" ? "no budget cap" : Number.isFinite(budgetN) && budgetN > 0 ? `$${budgetN.toFixed(2)} cap` : "budget?",
    maxTurns.trim() === "" ? "no turn cap" : Number.isInteger(turnsN) && turnsN > 0 ? `${turnsN} turns` : "turns?",
  ].join(" · ");

  return (
    <div className="research-guide" data-testid="research-launch-guide">
      <Step n={1} title="Brief" summary={briefMode === "auto" ? "Auto-generated at launch" : `${prompt.trim().length} characters`}>
        <RadioGroup value={briefMode} onValueChange={(v) => setBriefMode(v as BriefMode)} aria-label="Research brief" className="gap-1">
          <Label htmlFor="research-brief-auto" className="research-guide__choice">
            <RadioGroupItem id="research-brief-auto" value="auto" data-testid="radio-brief-auto" />
            <span>
              <span className="block text-sm font-medium">Auto-generate at launch</span>
              <span className="block text-xs font-normal text-muted-foreground">A gap-aware brief built from the catalog and past runs.</span>
            </span>
          </Label>
          <Label htmlFor="research-brief-custom" className="research-guide__choice">
            <RadioGroupItem id="research-brief-custom" value="custom" data-testid="radio-brief-custom" />
            <span>
              <span className="block text-sm font-medium">Write my own</span>
              <span className="block text-xs font-normal text-muted-foreground">Describe what to search for, or start from a generated brief.</span>
            </span>
          </Label>
        </RadioGroup>
        {briefMode === "custom" && (
          <div className="mt-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label htmlFor="prompt">Research brief</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="min-h-11"
                // aria-disabled (not disabled) keeps keyboard focus on the
                // button while the brief generates.
                onClick={() => { if (!brief.isPending) brief.mutate(); }}
                aria-disabled={brief.isPending}
                aria-busy={brief.isPending}
                data-testid="button-generate-brief"
              >
                {brief.isPending
                  ? <><RefreshCw className="mr-1 h-3 w-3 animate-spin" />Generating…</>
                  : <><Wand2 className="mr-1 h-3 w-3" />Start from a generated brief</>}
              </Button>
            </div>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Find open-source AV1 encoders not yet in the index"
              className="mt-1 min-h-[100px]"
              data-testid="input-research-prompt"
            />
            <p className={hint(prompt.trim().length < 10)} data-testid="text-prompt-hint">
              {prompt.trim().length < 10
                ? `At least 10 characters (${prompt.trim().length}/10).`
                : `${prompt.trim().length} characters`}
            </p>
          </div>
        )}
      </Step>

      <Step n={2} title="Focus" summary={categoryFocus === "all" ? "All categories" : categoryFocus}>
        <Select value={categoryFocus} onValueChange={setCategoryFocus}>
          <SelectTrigger className="min-h-11" aria-label="Category focus" data-testid="select-research-focus">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categoryNames.map((name) => (
              <SelectItem key={name} value={name}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Step>

      <Step n={3} title="Limits" summary={limitsSummary}>
        <div className="research-guide__limits">
          <div>
            <Label htmlFor="target-discoveries">Stop after (discoveries)</Label>
            <Input id="target-discoveries" type="number" min={1} max={1000} step={1} placeholder="No target"
              value={targetDiscoveries} onChange={(e) => setTargetDiscoveries(e.target.value)}
              className="mt-1 min-h-11" data-testid="input-target-discoveries" />
            <p className={hint(target !== null && (!Number.isInteger(target) || target <= 0 || target > 1000))} data-testid="text-target-hint">
              {target === null ? "No target — runs until the budget or turns end."
                : !Number.isInteger(target) || target <= 0 || target > 1000 ? "Whole number from 1 to 1000, or blank."
                  : `Stops after ${target} new ${target === 1 ? "discovery" : "discoveries"}.`}
            </p>
          </div>
          <div>
            <Label htmlFor="budget">Budget cap (USD)</Label>
            <Input id="budget" ref={budgetRef} type="number" step="0.25" min="0" placeholder="No cap"
              value={maxBudget} onChange={(e) => setMaxBudget(e.target.value)}
              className="mt-1 min-h-11" data-testid="input-research-budget" />
            <p className={hint(maxBudget.trim() !== "" && !(Number.isFinite(budgetN) && budgetN > 0))}>
              {maxBudget.trim() === "" ? "No cap — the run spends until it stops or you cancel it." : "Spend is checked between turns, so a run can go over this cap by up to one turn's cost before it stops."}
            </p>
            {Number.isFinite(budgetN) && budgetN > 0 && budgetN < (cheapestSavingRun?.costUsd ?? LOW_BUDGET_USD) && (
              <p className={hint(true)} data-testid="text-budget-low">
                {cheapestSavingRun !== null
                  ? `No run in the job history saved a discovery for less than ${cheapestSavingRun.costBasis === "reported" ? "" : "about "}$${cheapestSavingRun.costUsd.toFixed(2)}.`
                  : `Under $${LOW_BUDGET_USD.toFixed(2)} a run may stop before it saves anything.`}{" "}
                Each turn costs about $0.10–$0.15, and $0.30 caps ended after 3 turns with no searches.
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="turns">Max turns</Label>
            <Input id="turns" type="number" min={1} step={1} placeholder="No cap"
              value={maxTurns} onChange={(e) => setMaxTurns(e.target.value)}
              className="mt-1 min-h-11" data-testid="input-research-turns" />
            <p className={hint(maxTurns.trim() !== "" && !(Number.isInteger(turnsN) && turnsN > 0))} data-testid="text-turns-hint">
              {maxTurns.trim() === "" ? "No turn cap." : "Positive whole number (blank = no cap)."}
            </p>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {costRange
            ? costRange.min === costRange.max
              ? `The last run with a cost spent $${costRange.min.toFixed(2)}.`
              : `Past runs cost $${costRange.min.toFixed(2)}–$${costRange.max.toFixed(2)}.`
            : "Cost depends on scope — check the jobs table after your first run."}{" "}
          Discoveries are deduplicated against {catalogSize ? `the ${catalogSize.toLocaleString()} catalog resources` : "the catalog"}.
        </p>
      </Step>

      <Step n={4} title="Endpoint & model" summary={overrideCount > 0 ? <Badge variant="outline" className={WARN_OUTLINE}>{overrideCount} override{overrideCount === 1 ? "" : "s"}</Badge> : "Server configuration"}>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setShowAdvanced((v) => !v)}
          className="h-auto min-h-11 w-full justify-between whitespace-normal px-3 text-left text-sm font-medium"
          aria-expanded={showAdvanced}
          aria-controls="advanced-researcher-region"
          data-testid="button-toggle-advanced-researcher"
        >
          Override endpoint or models (optional)
          {showAdvanced ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
        {showAdvanced && (
          <div id="advanced-researcher-region" className="research-guide__advanced">
            <div>
              <Label htmlFor="research-model">Orchestrator model</Label>
              <Input id="research-model" value={model} onChange={(e) => setModel(e.target.value)}
                placeholder="Blank = ANTHROPIC_MODEL" className="mt-1 min-h-11 font-mono text-xs" data-testid="input-research-model" />
            </div>
            <div>
              <Label htmlFor="research-scout-model">Scout model</Label>
              <Input id="research-scout-model" value={scoutModel} onChange={(e) => setScoutModel(e.target.value)}
                placeholder="Blank = haiku tier" className="mt-1 min-h-11 font-mono text-xs" data-testid="input-research-scout-model" />
            </div>
            <div>
              <Label htmlFor="research-baseurl">Base URL</Label>
              <Input id="research-baseurl" value={baseUrl}
                onChange={(e) => { setBaseUrl(e.target.value); setConfirmInsecureHttp(false); }}
                placeholder="Blank = ANTHROPIC_BASE_URL" className="mt-1 min-h-11 font-mono text-xs" data-testid="input-research-baseurl" />
              <p className="mt-1 text-xs text-muted-foreground">A custom endpoint needs its own token below.</p>
            </div>
            <div>
              <Label htmlFor="research-token">Auth token</Label>
              <Input id="research-token" type="password" value={authToken} onChange={(e) => setAuthToken(e.target.value)}
                placeholder="Required with a base URL" autoComplete="off"
                className="mt-1 min-h-11 font-mono text-xs" data-testid="input-research-token" />
              <p className="mt-1 text-xs text-muted-foreground">Encrypted at rest; only the last 4 characters are shown afterwards.</p>
            </div>
            {baseUrlIsPlainHttp && (
              <Label htmlFor="research-confirm-insecure-http" className="research-guide__choice sm:col-span-2">
                <Checkbox id="research-confirm-insecure-http" checked={confirmInsecureHttp}
                  onCheckedChange={(v) => setConfirmInsecureHttp(v === true)} data-testid="checkbox-confirm-insecure-http" />
                <span className="text-xs font-normal">Send the auth token to this plain http:// endpoint unencrypted. Anyone on the network path can read it.</span>
              </Label>
            )}
          </div>
        )}
      </Step>

      <Step n={5} title="About to run on">
        <div aria-busy={!previewCurrent}>
          {config ? (
            <ResearchRunConfigSummary config={config} testId="research-launch-config" />
          ) : configQuery.isError ? (
            <p role="alert" className="text-xs text-destructive">{describeWriteError(configQuery.error, { outcome: "Could not resolve the run configuration." })}</p>
          ) : (
            <p className="text-xs text-muted-foreground">Resolving endpoint and models…</p>
          )}
        </div>
        {activeJobId !== null && (
          <Alert live="off" className="mt-3">
            <AlertDescription className="flex flex-wrap items-center gap-2">
              Run #{activeJobId} is still in progress. One run at a time.
              <Button type="button" size="sm" variant="outline" className="min-h-11" onClick={() => onFollow(activeJobId)} data-testid="button-follow-active-run">
                Follow run #{activeJobId}
              </Button>
            </AlertDescription>
          </Alert>
        )}
        <div className="mt-3 space-y-2">
          <Button
            type="button"
            onClick={handleLaunch}
            disabled={launchDisabled}
            className="min-h-11 w-full sm:w-auto"
            data-testid="button-launch-researcher-canonical"
          >
            {start.isPending ? <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Starting…</> : <><Play className="mr-2 h-4 w-4" />Launch research run</>}
          </Button>
          {launchBlockedReason && <p className="text-xs text-muted-foreground" data-testid="text-launch-blocked">{launchBlockedReason}</p>}
          {launchError && <p role="alert" className="text-sm text-destructive" data-testid="error-research-launch">{launchError}</p>}
        </div>
      </Step>

      <AlertDialog open={confirmOpen} onOpenChange={(open) => { if (!open && !start.isPending) setConfirmOpen(false); }}>
        <AlertDialogContent
          className="queues-agent__dialog"
          // After a launch the trigger is hidden; the run view takes focus.
          onCloseAutoFocus={(event) => { if (launchedRef.current) { event.preventDefault(); launchedRef.current = false; } }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Launch research run?</AlertDialogTitle>
            <AlertDialogDescription>
              This starts a paid Claude research agent ({limitsSummary}) on {config?.endpoint.host ?? "the configured endpoint"}. It runs in the background{maxBudget.trim() === "" && target === null ? " with no spending cap — cancel it when you're satisfied" : ""}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {start.isError && (
            <Alert variant="destructive" className="queues-agent__inline-error">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{describeWriteError(start.error, { outcome: "The job may not have started. Check the jobs table before starting another." })}</AlertDescription>
            </Alert>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-launch" disabled={start.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-confirm-launch"
              onClick={(event) => {
                event.preventDefault();
                if (launchDisabled) return;
                start.mutate();
              }}
              disabled={launchDisabled}
            >
              {start.isPending ? "Launching…" : "Launch"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});
