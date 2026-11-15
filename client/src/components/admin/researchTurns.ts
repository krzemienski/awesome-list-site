/**
 * A research job's turn count is one run's total (researchService.ts sums its
 * in-run rounds against a single cap), so it only passes `maxTurns` when the
 * budget or turn stop cut off the turn that was already running.
 */
export const TURN_CUT_OFF_NOTE = "last turn cut off by the stop";

export function isTurnCutOff(
  status: string | null | undefined,
  turnsUsed: number,
  maxTurns: number | null | undefined,
): boolean {
  return (status === "budget_stopped" || status === "turn_stopped") && !!maxTurns && turnsUsed > maxTurns;
}

export function turnCutOffTitle(maxTurns: number): string {
  return `Cap ${maxTurns}; the last turn was cut off by the stop`;
}
