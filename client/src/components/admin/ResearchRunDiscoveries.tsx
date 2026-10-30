import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, ThumbsDown, ThumbsUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { sanitizeDisplay } from "@/lib/sanitize-display";
import { focusElement } from "@/hooks/focus-handoff";
import type { ResearchDiscovery } from "@shared/schema";
import { OK_SOLID_BUTTON, getDiscoveryStatusBadge, getVerificationBadges } from "./researchDisplay";
import { useDiscoveryReview } from "./useDiscoveryReview";
import { useMotionTokens } from "./useMotionTokens";

/**
 * A run's saved discoveries. Each new one animates into the list while the
 * run is live; the same rows carry approve / reject so the run's ending is
 * reviewed in place.
 */
export function ResearchRunDiscoveries({ discoveries, active }: { discoveries: ResearchDiscovery[]; active: boolean }) {
  const m = useMotionTokens();
  // A reviewed row loses its buttons; keep keyboard focus on that row.
  const { approve, requestReject, rejectDialog } = useDiscoveryReview((id) => {
    requestAnimationFrame(() => focusElement(document.querySelector<HTMLElement>(`[data-testid="run-discovery-${id}"]`)));
  });

  if (discoveries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="text-run-discoveries-empty">
        {active ? "Saved discoveries appear here as the agent finds them." : "This run saved no discoveries."}
      </p>
    );
  }

  return (
    <>
      <ul className="research-run__discoveries" aria-label="Discoveries from this run" data-testid="list-run-discoveries">
        <AnimatePresence initial={false}>
          {discoveries.map((d) => {
            const title = sanitizeDisplay(d.title);
            const pending = d.status === "pending_review";
            const busy = approve.isPending && approve.variables === d.id;
            return (
              <motion.li
                key={d.id}
                layout="position"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: m.slow, ease: m.ease }}
                className="research-run__discovery"
                data-testid={`run-discovery-${d.id}`}
                data-status={d.status}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="min-w-0 break-words font-medium">{title}</span>
                    {getDiscoveryStatusBadge(d.status)}
                    {getVerificationBadges(d)}
                  </div>
                  <a href={d.url} target="_blank" rel="noopener noreferrer"
                    className="mt-1 flex min-h-6 max-lg:min-h-11 min-w-0 items-center gap-1 text-xs text-primary hover:underline">
                    <span className="truncate">{sanitizeDisplay(d.url)}</span><ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                  </a>
                  {d.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{sanitizeDisplay(d.description)}</p>}
                  <div className="mt-1 flex flex-wrap gap-1">
                    {d.suggestedCategory && <Badge variant="secondary" className="text-xs">{d.suggestedCategory}</Badge>}
                    {d.suggestedSubcategory && <Badge variant="outline" className="text-xs">{d.suggestedSubcategory}</Badge>}
                    {d.confidence != null && <Badge variant="outline" className="text-xs">{d.confidence}% confidence</Badge>}
                  </div>
                </div>
                {pending && (
                  <div className="research-run__discovery-actions">
                    <Button size="sm" className={`min-h-11 ${OK_SOLID_BUTTON}`}
                      onClick={() => approve.mutate(d.id)} disabled={approve.isPending}
                      aria-label={`Approve discovery: ${title}`} data-testid={`button-run-approve-${d.id}`}>
                      <ThumbsUp className="mr-1 h-3 w-3" />{busy ? "Approving…" : "Approve"}
                    </Button>
                    <Button size="sm" variant="destructive" className="min-h-11"
                      onClick={() => requestReject(d.id)}
                      aria-label={`Reject discovery: ${title}`} data-testid={`button-run-reject-${d.id}`}>
                      <ThumbsDown className="mr-1 h-3 w-3" />Reject
                    </Button>
                  </div>
                )}
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
      {rejectDialog}
    </>
  );
}
