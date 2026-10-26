import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, ApiError } from "@/lib/queryClient";
import { describeWriteError } from "@/lib/apiError";
import { formatAdminDateTime } from "@/lib/utils";
import { describeTaxonomyPlan, type TaxonomyLevel } from "@shared/github-import";
import "./github-import-preview.css";

/** The plan half of POST /api/admin/import-github with dryRun: true. */
interface ImportPlan {
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
  /** Notes about the plan itself: taxonomy merges, repeat listings. */
  warnings: string[];
  /** awesome-lint findings on the README, as "Line n: [rule] message". */
  lintWarnings: string[];
  wouldCreateTaxonomy: { level: TaxonomyLevel; name: string; parent?: string }[];
}

interface LintFinding { line: number; rule: string; message: string }

const isLintFinding = (value: unknown): value is LintFinding => {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.line === "number" && typeof v.rule === "string" && typeof v.message === "string";
};

/**
 * One dry run of one repository. A run that stopped before planning (repo
 * not found, README unreadable) has a reason and no plan: its zero counts
 * describe nothing.
 */
type ImportPreview = { repo: string; previewedAt: string } & (
  | { kind: "plan"; plan: ImportPlan }
  | { kind: "stopped"; reason: string }
);

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

/** Reads a dry-run body, or returns null when it is not one. */
function parseDryRun(body: unknown): { plan: ImportPlan; runError: string | null } | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;
  const counts = [b.imported, b.updated, b.skipped];
  if (!counts.every((n) => typeof n === "number")) return null;
  if (!isStringArray(b.errors) || !isStringArray(b.warnings) || !Array.isArray(b.wouldCreateTaxonomy)) return null;
  const lint = Array.isArray(b.validationWarnings) ? b.validationWarnings.filter(isLintFinding) : [];
  return {
    plan: {
      ...(b as unknown as ImportPlan),
      lintWarnings: lint.map((w) => `Line ${w.line}: [${w.rule}] ${w.message}`),
    },
    runError: typeof b.runError === "string" && b.runError ? b.runError : null,
  };
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function runDryRun(repo: string): Promise<ImportPreview> {
  const request = { method: "POST", body: JSON.stringify({ repoUrl: repo, dryRun: true }) };
  let body: unknown;
  try {
    body = await apiRequest("/api/admin/import-github", request);
  } catch (error) {
    // A run in which nothing would succeed answers 422 and is still a dry run.
    if (!(error instanceof ApiError) || error.status !== 422) throw error;
    body = parseJson(error.body);
    if (!parseDryRun(body)) throw error;
  }
  const parsed = parseDryRun(body);
  if (!parsed) throw new Error("The server's preview answer could not be read.");
  const previewedAt = new Date().toISOString();
  return parsed.runError
    ? { repo, previewedAt, kind: "stopped", reason: parsed.runError }
    : { repo, previewedAt, kind: "plan", plan: parsed.plan };
}

/**
 * The dry-run state of the GitHub panel. `current` is the preview of `target`
 * only: editing the target retires a preview of another repository.
 */
export function useImportPreview(target: string | null) {
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const mutation = useMutation({ mutationFn: runDryRun, onSuccess: setPreview });
  return {
    target,
    preview,
    current: preview?.repo === target ? preview : null,
    isPending: mutation.isPending,
    pendingRepo: mutation.variables,
    error: mutation.isError ? mutation.error : null,
    run: () => { if (target) mutation.mutate(target); },
    /** The target changed: a failure to reach the old one no longer applies. */
    retarget: () => { if (mutation.isError) mutation.reset(); },
    /** A real pull started: the plan is history. */
    clear: () => setPreview(null),
  };
}

export type ImportPreviewState = ReturnType<typeof useImportPreview>;

function PlanList({ label, items }: { label: string; items: string[] }) {
  return (
    <details className="github-import-preview__details">
      <summary>{label} ({items.length.toLocaleString()})</summary>
      <ul className="github-import-preview__list" tabIndex={0} aria-label={`${label}, ${items.length.toLocaleString()}, scrollable`}>
        {items.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    </details>
  );
}

function PlanBody({ plan }: { plan: ImportPlan }) {
  const taxonomy = describeTaxonomyPlan(plan.wouldCreateTaxonomy);
  return (
    <>
      <dl className="github-import-preview__counts" data-testid="import-preview-counts">
        <div><dt>Add</dt><dd>{plan.imported.toLocaleString()}</dd></div>
        <div><dt>Update</dt><dd>{plan.updated.toLocaleString()}</dd></div>
        <div><dt>Skip</dt><dd>{plan.skipped.toLocaleString()}</dd></div>
        <div><dt>Fail</dt><dd>{plan.errors.length.toLocaleString()}</dd></div>
      </dl>
      <p className="text-sm" data-testid="text-import-preview-taxonomy">
        {taxonomy ? `Create ${taxonomy}.` : "Create no new categories, subcategories or sub-subcategories."}
      </p>
      {plan.wouldCreateTaxonomy.length > 0 && (
        <PlanList
          label="Taxonomy it would create"
          items={plan.wouldCreateTaxonomy.map((node) =>
            `${node.level} “${node.name}”${node.parent ? ` under “${node.parent}”` : ""}`)}
        />
      )}
      {plan.errors.length > 0 && <PlanList label="Items that would fail" items={plan.errors} />}
      {plan.warnings.length > 0 && <PlanList label="Import warnings" items={plan.warnings} />}
      {plan.lintWarnings.length > 0 && <PlanList label="README formatting warnings (awesome-lint)" items={plan.lintWarnings} />}
    </>
  );
}

function statusText({ isPending, pendingRepo, current, preview, error, target }: ImportPreviewState): string | null {
  if (isPending) return `Reading ${pendingRepo} and planning the import. Nothing is written.`;
  if (error) return null;
  if (current) {
    const at = `Dry run at ${formatAdminDateTime(current.previewedAt)}. Nothing was written.`;
    return current.kind === "plan" ? `${at} Pulling now would:` : at;
  }
  if (preview) return `This preview was for ${preview.repo}. Preview ${target ?? "the new target"} to see its plan.`;
  return null;
}

/** The dry-run plan under the repository row of the GitHub panel. */
export function GitHubImportPreview({ state }: { state: ImportPreviewState }) {
  const { isPending, error, preview } = state;
  if (!isPending && !error && !preview) return null;
  // A run in flight or a failed run supersedes the last result for this repo.
  const current = isPending || error ? null : state.current;
  return (
    <section className="github-import-preview" aria-labelledby="import-preview-title" data-testid="import-preview">
      <h3 id="import-preview-title" className="github-import-preview__title">
        Import preview{current ? ` · ${current.repo}` : ""}
      </h3>
      <p role="status" className="github-import-preview__status" data-testid="text-import-preview-status">
        {statusText(state)}
      </p>
      {error && (
        <p role="alert" className="github-import-preview__error" data-testid="text-import-preview-error">
          The preview did not run. {describeWriteError(error, { fallback: "Failed to preview the import", outcome: "Nothing was written. Try the preview again." })}
        </p>
      )}
      {current?.kind === "stopped" && (
        <p role="alert" className="github-import-preview__error" data-testid="text-import-preview-error">
          The preview could not plan an import: {current.reason}
        </p>
      )}
      {current?.kind === "plan" && <PlanBody plan={current.plan} />}
    </section>
  );
}

/** What the Pull confirmation knows about the import from the last preview. */
export function ImportPreviewConfirmNote({ preview }: { preview: ImportPreview | null }) {
  if (!preview) {
    return (
      <span data-testid="text-import-plan">
        New resources are added and existing ones may be updated. Cancel and
        use Preview import to see how many before pulling.
      </span>
    );
  }
  const at = formatAdminDateTime(preview.previewedAt);
  if (preview.kind === "stopped") {
    return (
      <span data-testid="text-import-plan">
        The preview at {at} could not plan this import: {preview.reason.replace(/\.$/, "")}. A Pull
        would stop the same way, so Start Import stays off. Check the target,
        then run Preview import again.
      </span>
    );
  }
  const { plan } = preview;
  const taxonomy = describeTaxonomyPlan(plan.wouldCreateTaxonomy);
  return (
    <span data-testid="text-import-plan">
      The preview at {at} found it would add {plan.imported.toLocaleString()}, update{" "}
      {plan.updated.toLocaleString()} and skip {plan.skipped.toLocaleString()} resources
      {plan.errors.length ? `, with ${plan.errors.length.toLocaleString()} failing` : ""}
      {taxonomy ? `, and create ${taxonomy}` : ", creating no new categories"}.
      {" "}Edits since then can change these numbers.
    </span>
  );
}
