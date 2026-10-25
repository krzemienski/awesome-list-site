import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import type { ResolvedResearchConfig } from "@shared/researcherContract";

const OVERRIDE_BADGE = "ml-1.5 h-4 px-1 text-[10px] uppercase tracking-wide border-[var(--status-warn)]/60 text-[var(--status-warn)]"; // DS-OK: status warn

function OverrideBadge({ children = "Override" }: { children?: string }) {
  return (
    <Badge variant="outline" className={OVERRIDE_BADGE}>
      {children}
    </Badge>
  );
}

function Row({ label, value, source, override, extra }: { label: string; value: string | null; source?: string; override?: boolean; extra?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">
        {label}
        {override && <OverrideBadge />}
        {extra && <OverrideBadge>{extra}</OverrideBadge>}
      </dt>
      <dd className="mt-0.5 break-all font-mono text-xs">
        {value ?? "unresolved"}
        {source && <span className="text-muted-foreground"> · {source}</span>}
      </dd>
    </div>
  );
}

/**
 * Where a research run goes and on which models, with every per-run override
 * labelled. Used before launch (preview from GET /api/researcher/config) and
 * on a job's details (the resolved_config stored on the run).
 */
export function ResearchRunConfigSummary({ config, testId }: { config: ResolvedResearchConfig; testId?: string }) {
  const o = config.overrides;
  const scoutSource =
    config.scout.source === "override" ? "override"
      : config.scout.source === "inherit" ? "inherits the orchestrator model"
        : `${config.scout.value} via ${config.scout.source}`;
  return (
    <div className="space-y-2" data-testid={testId}>
      <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Row
          label="Endpoint"
          value={config.endpoint.host}
          source={config.endpoint.source === "env" ? "ANTHROPIC_BASE_URL" : config.endpoint.scheme ?? undefined}
          override={o.baseUrl}
          extra={o.insecureHttp ? "plain http" : undefined}
        />
        <Row label="Credential" value={config.credential.label} override={o.authToken} />
        <Row
          label="Orchestrator model"
          value={config.orchestrator.model}
          source={config.orchestrator.source === "override" ? undefined : config.orchestrator.source}
          override={o.model}
        />
        <Row label="Scout model" value={config.scout.model} source={scoutSource} override={o.scoutModel} />
      </dl>
      {!config.preflight.ok && (
        <Alert variant="destructive" role="alert">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc space-y-1 pl-4">
              {config.preflight.issues.map((issue) => (
                <li key={`${issue.code}:${issue.variable ?? ""}`} className="break-words">{issue.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
