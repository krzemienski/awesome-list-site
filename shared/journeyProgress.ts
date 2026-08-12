export interface LogicalJourneyStepRow {
  id: number;
  stepNumber: number | string;
  isOptional?: boolean | null;
  title?: string | null;
}

export interface LogicalJourneyStepGroup<T extends LogicalJourneyStepRow> {
  stepNumber: number;
  rows: T[];
}

/**
 * Journey rows sharing a stepNumber are one logical step. Required rows define
 * completion when present; an all-optional group falls back to all of its rows
 * so it cannot become vacuously complete.
 */
export function groupLogicalJourneySteps<T extends LogicalJourneyStepRow>(
  steps: T[],
): LogicalJourneyStepGroup<T>[] {
  const groups = new Map<number, T[]>();
  for (const step of steps) {
    const stepNumber =
      typeof step.stepNumber === 'number'
        ? step.stepNumber
        : Number.parseInt(step.stepNumber, 10);
    if (!Number.isInteger(stepNumber)) continue;
    const rows = groups.get(stepNumber) ?? [];
    rows.push(step);
    groups.set(stepNumber, rows);
  }
  return [...groups.entries()]
    .sort(([left], [right]) => left - right)
    .map(([stepNumber, rows]) => ({ stepNumber, rows }));
}

export function getCompletionRelevantRows<T extends LogicalJourneyStepRow>(
  rows: T[],
): T[] {
  const required = rows.filter((row) => !row.isOptional);
  return required.length > 0 ? required : rows;
}

export function isLogicalJourneyStepComplete(
  rows: LogicalJourneyStepRow[],
  completedRowIds: ReadonlySet<number>,
): boolean {
  const relevant = getCompletionRelevantRows(rows);
  return relevant.length > 0 && relevant.every((row) => completedRowIds.has(row.id));
}

export function areAllLogicalJourneyStepsComplete(
  steps: LogicalJourneyStepRow[],
  completedRowIds: ReadonlySet<number>,
): boolean {
  const groups = groupLogicalJourneySteps(steps);
  return (
    groups.length > 0 &&
    groups.every(({ rows }) =>
      isLogicalJourneyStepComplete(rows, completedRowIds),
    )
  );
}

export function summarizeLogicalJourneySteps(
  steps: LogicalJourneyStepRow[],
  completedRowIds: ReadonlySet<number>,
): {
  totalSteps: number;
  completedSteps: number;
  nextStep: { stepNumber: number; title: string } | null;
} {
  const groups = groupLogicalJourneySteps(steps);
  let completedSteps = 0;
  let nextStep: { stepNumber: number; title: string } | null = null;

  for (const { stepNumber, rows } of groups) {
    if (isLogicalJourneyStepComplete(rows, completedRowIds)) {
      completedSteps += 1;
    } else if (!nextStep) {
      nextStep = {
        stepNumber,
        title: rows[0]?.title?.trim() || `Step ${stepNumber}`,
      };
    }
  }

  return {
    totalSteps: groups.length,
    completedSteps,
    nextStep,
  };
}