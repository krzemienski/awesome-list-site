import type { ReactElement } from "react";
import { Badge } from "@/components/ui/badge";
import { Activity, AlertCircle, Archive, CheckCircle2, Clock, Star, ThumbsDown, ThumbsUp, XCircle } from "lucide-react";
import type { CostBasis } from "@shared/researcherContract";
import type { ResearchDiscovery } from "@shared/schema";

export const INFO_STATUS_BADGE = "bg-[var(--status-info)]/20 text-[var(--status-info)] border-[var(--status-info)]/30"; // DS-OK: cyan info (DS chart/info constant)
export const OK_STATUS_BADGE = "bg-[var(--status-ok)]/20 text-[var(--status-ok)] border-[var(--status-ok)]/30"; // DS-OK: status ok
export const WARN_OUTLINE = "border-[var(--status-warn)]/30 text-[var(--status-warn)]"; // DS-OK: status warn
const OK_OUTLINE = "text-xs shrink-0 text-[var(--status-ok)] border-[var(--status-ok)]/30"; // DS-OK: status ok
export const WARN_TEXT = "text-[var(--status-warn)]"; // DS-OK: status warn
export const OK_SOLID_BUTTON = "bg-[var(--status-ok)] text-black hover:bg-[var(--status-ok)]/90"; // DS-OK: status ok
export const OK_TEXT = "text-[var(--status-ok)]"; // DS-OK: status ok
export const BAD_TEXT = "text-[var(--status-bad)]"; // DS-OK: status bad

/** Research job statuses that mean the agent may still be working. */
export function isActiveJobStatus(status: string | null | undefined): boolean {
  return status === "pending" || status === "processing";
}

export function getStatusBadge(status: string) {
  const statusClass =
    status === "completed" || status === "approved"
      ? "queues-agent__status--ok"
      : status === "failed" || status === "rejected"
        ? "queues-agent__status--bad"
        : status === "processing" || status === "pending" || status === "pending_review" || status === "budget_stopped"
          ? "queues-agent__status--warn"
          : "queues-agent__status--muted";
  switch (status) {
    case "processing":
      return <Badge variant="default" className={`queues-agent__status ${statusClass} ${INFO_STATUS_BADGE}`}><Activity className="w-3 h-3 mr-1 animate-pulse" />Running</Badge>;
    case "completed":
      return <Badge variant="default" className={`queues-agent__status ${statusClass} ${OK_STATUS_BADGE}`}><CheckCircle2 className="w-3 h-3 mr-1" />Completed</Badge>;
    case "failed":
      return <Badge variant="destructive" className={`queues-agent__status ${statusClass}`}><AlertCircle className="w-3 h-3 mr-1" />Failed</Badge>;
    case "cancelled":
      return <Badge variant="outline" className={`queues-agent__status ${statusClass}`}><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
    case "budget_stopped":
      // The run spent its configured USD cap — not a crash, not a normal finish.
      return <Badge variant="outline" className={`queues-agent__status ${statusClass} ${WARN_OUTLINE}`}><AlertCircle className="w-3 h-3 mr-1" />Stopped at budget</Badge>;
    default:
      return <Badge variant="outline" className={`queues-agent__status ${statusClass}`}><Clock className="w-3 h-3 mr-1" />{status}</Badge>;
  }
}

// Run16 BUG-026: raw SDK failures like "Claude Code process exited with code 1"
// are meaningless to an admin. Map known patterns to a plain-language
// explanation while keeping the raw text for debugging.
export function humanizeJobError(msg: string): string {
  if (/exited with code \d+/i.test(msg) || /process exited/i.test(msg)) {
    return `The research agent crashed before finishing. This is usually transient — try launching the job again; if it keeps happening, try setting explicit budget/turn limits. (Technical detail: ${msg})`;
  }
  if (/abort/i.test(msg)) {
    return `The job was stopped before it could finish. (Technical detail: ${msg})`;
  }
  return msg;
}

// NB-033 (run18): one cost formatter — always $X.XXXX (4 decimals) so the cost
// column/detail never mixes $0.00 / $0.0000 / $12.3801 representations.
export function formatCost(value: string | number | null | undefined): string {
  return `$${Number(value ?? 0).toFixed(4)}`;
}

/** Short qualifier for a cost that is not the Agent SDK's reported total. */
export const COST_BASIS_NOTE: Record<CostBasis, string | null> = {
  reported: null,
  lower_bound: "lower bound",
  unknown: "unknown",
};

export function getDiscoveryStatusBadge(status: string) {
  switch (status) {
    case "pending_review":
      return <Badge variant="outline" className={`queues-agent__status queues-agent__status--warn ${WARN_OUTLINE}`}><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    case "approved":
      return <Badge variant="default" className={`queues-agent__status queues-agent__status--ok ${OK_STATUS_BADGE}`}><ThumbsUp className="w-3 h-3 mr-1" />Approved</Badge>;
    case "rejected":
      return <Badge variant="destructive" className="queues-agent__status queues-agent__status--bad"><ThumbsDown className="w-3 h-3 mr-1" />Rejected</Badge>;
    default:
      return <Badge variant="outline" className="queues-agent__status queues-agent__status--muted">{status}</Badge>;
  }
}

/**
 * WS3 (July 30, 2026): verification badges from the async post-save verifier.
 * Shows liveness (dead link / verified) and GitHub repo signals (stars,
 * archived). No badge at all = verification still pending or predates WS3.
 */
export function getVerificationBadges(d: ResearchDiscovery) {
  const v = d.verification;
  if (!v) return null;
  const badges: ReactElement[] = [];
  if (v.liveness === "dead") {
    badges.push(
      <Badge key="dead" variant="destructive" className="text-xs shrink-0" title={v.suspicion ?? v.error ?? undefined} data-testid={`badge-verification-dead-${d.id}`}>
        <XCircle className="w-3 h-3 mr-1" />{v.suspicion ? "Suspicious link" : "Link check failed"}
      </Badge>
    );
  } else if (v.liveness === "ok") {
    badges.push(
      <Badge key="ok" variant="outline" className={OK_OUTLINE} data-testid={`badge-verification-ok-${d.id}`}>
        <CheckCircle2 className="w-3 h-3 mr-1" />Link OK
      </Badge>
    );
  }
  if (v.github && !v.github.unavailable) {
    if (typeof v.github.stars === "number") {
      badges.push(
        <Badge key="stars" variant="secondary" className="text-xs shrink-0" title={v.github.pushedAt ? `Last push ${new Date(v.github.pushedAt).toLocaleDateString()}` : undefined}>
          <Star className="w-3 h-3 mr-1" />{v.github.stars.toLocaleString()}
        </Badge>
      );
    }
    if (v.github.archived) {
      badges.push(
        <Badge key="archived" variant="outline" className={`text-xs shrink-0 ${WARN_OUTLINE}`}>
          <Archive className="w-3 h-3 mr-1" />Archived repo
        </Badge>
      );
    }
  }
  return badges.length > 0 ? badges : null;
}
