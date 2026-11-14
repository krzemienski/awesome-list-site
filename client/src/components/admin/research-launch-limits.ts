// One predicate per launch-limit rule: the render-time hints and the click-time validate() share them.
export const budgetInRange = (n: number) => Number.isFinite(n) && n > 0;
export const turnsInRange = (n: number) => Number.isInteger(n) && n > 0;
export const minutesInRange = (n: number) => Number.isInteger(n) && n >= 1 && n <= 240;
export const targetInRange = (n: number) => Number.isInteger(n) && n > 0 && n <= 1000;
