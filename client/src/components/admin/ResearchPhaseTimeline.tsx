import { AnimatePresence, motion } from "framer-motion";
import { Check, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { OUTCOME_LABEL, STEP_LABEL, TIMELINE_STEPS, type RunProgress, type ScoutActivity } from "./researchRunProgress";
import { useMotionTokens } from "./useMotionTokens";

function clock(ts: string | undefined): string | null {
  if (!ts) return null;
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function seconds(ms: number | null): string | null {
  return ms === null ? null : `${Math.max(1, Math.round(ms / 1000))}s`;
}

const SCOUT_STATUS_LABEL: Record<ScoutActivity["status"], string> = {
  running: "Searching",
  completed: "Reported",
  failed: "Failed",
  aborted: "Stopped",
};

/**
 * Phase timeline (planning → scouting → verifying → saving → done) with a
 * marker that slides to the current step, and the run's scouts as live
 * activity cards. Motion is framer-motion under the run view's
 * MotionConfig reducedMotion="user", so reduced-motion users get the same
 * updates without movement.
 */
export function ResearchPhaseTimeline({ progress, active }: { progress: RunProgress; active: boolean }) {
  const m = useMotionTokens();
  const { current, visited, enteredAt, outcome, scouts } = progress;
  const running = scouts.filter((s) => s.status === "running").length;

  return (
    <div className="research-run__timeline-wrap">
      <ol className="research-run__timeline" aria-label="Run phases" data-testid="research-phase-timeline">
        {TIMELINE_STEPS.map((step) => {
          const isCurrent = current === step;
          const isDone = visited.has(step) && !isCurrent;
          const label = step === "done"
            ? outcome ? OUTCOME_LABEL[outcome] : isCurrent ? "Finishing" : STEP_LABEL.done
            : STEP_LABEL[step];
          const tone = step === "done" && outcome && outcome !== "completed" ? ` research-run__step--${outcome}` : "";
          return (
            <li
              key={step}
              className={`research-run__step${isCurrent ? " research-run__step--current" : ""}${isDone ? " research-run__step--done" : ""}${tone}`}
              aria-current={isCurrent ? "step" : undefined}
              data-testid={`research-phase-${step}`}
              data-state={isCurrent ? "current" : isDone ? "done" : "todo"}
            >
              <span className="research-run__step-dot" aria-hidden="true">
                {isCurrent && (
                  <motion.span
                    layoutId="research-phase-marker"
                    className="research-run__step-marker"
                    transition={{ duration: m.base, ease: m.ease }}
                  />
                )}
                {isDone && <Check className="h-3 w-3" />}
              </span>
              <span className="research-run__step-label">
                <span className="text-sm font-medium">{label}</span>
                <span className="block text-xs text-muted-foreground">
                  {clock(enteredAt[step]) ?? (isCurrent ? "now" : " ")}
                </span>
              </span>
              <span className="sr-only">{isCurrent ? " (current)" : isDone ? " (done)" : " (not reached)"}</span>
            </li>
          );
        })}
      </ol>

      <div className="research-run__scouts">
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Scouts
          <span className="text-xs font-normal text-muted-foreground" data-testid="text-scout-count">
            {scouts.length === 0
              ? active ? "none started yet" : "none ran"
              : `${scouts.length} started${running > 0 ? ` · ${running} searching` : ""}`}
          </span>
        </h4>
        {scouts.length > 0 && (
          <ul className="research-run__scout-list" aria-label="Scouts">
            <AnimatePresence initial={false}>
              {scouts.map((s) => (
                <motion.li
                  key={s.index}
                  layout="position"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: m.base, ease: m.ease }}
                  className={`research-run__scout${s.status === "running" ? " research-run__scout--running" : ""}`}
                  data-testid={`research-scout-${s.index}`}
                  data-status={s.status}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-medium">Scout {s.index}</span>
                    <Badge variant="outline" className="shrink-0 text-xs">{SCOUT_STATUS_LABEL[s.status]}</Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground" title={s.description}>{s.description}</p>
                  {s.status === "running" ? (
                    <span className="research-run__scout-bar" aria-hidden="true" />
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {[
                        s.webSearches !== null ? `${s.webSearches} search${s.webSearches === 1 ? "" : "es"}` : null,
                        s.candidateUrls !== null ? `${s.candidateUrls} candidate${s.candidateUrls === 1 ? "" : "s"}` : null,
                        seconds(s.durationMs),
                      ].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  );
}
