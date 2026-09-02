// Shared stage-5 DS-OK parsing helpers.
//
// Keep this logic in one place so the client palette ratchet and standalone
// artifact checks agree about what counts as a written exception reason.

export const DS_OK_LOOKBACK = 5;
export const DS_OK_RE = /DS-OK\b/g;

function dsOkReasonText(line, markerStart, markerEnd) {
  const blockStart = line.lastIndexOf('/*', markerStart);
  const blockEndBefore = line.lastIndexOf('*/', markerStart);
  if (blockStart > blockEndBefore) {
    const blockEnd = line.indexOf('*/', markerEnd);
    return line.slice(markerEnd, blockEnd === -1 ? line.length : blockEnd);
  }
  return line.slice(markerEnd);
}

function dsOkTagHasReason(line, markerStart, markerEnd) {
  return /[^\p{P}\s]/u.test(dsOkReasonText(line, markerStart, markerEnd));
}

export function lineHasReasonedDsOkTag(line) {
  return [...line.matchAll(DS_OK_RE)].some((match) =>
    dsOkTagHasReason(line, match.index, match.index + match[0].length),
  );
}

export function lineHasBareDsOkTag(line) {
  return [...line.matchAll(DS_OK_RE)].some((match) =>
    !dsOkTagHasReason(line, match.index, match.index + match[0].length),
  );
}

export function hasDsOkTag(lines, i) {
  for (let j = Math.max(0, i - DS_OK_LOOKBACK); j <= i; j++) {
    if (lineHasReasonedDsOkTag(lines[j])) return true;
  }
  return false;
}

export function hasBareDsOkTag(lines, i) {
  for (let j = Math.max(0, i - DS_OK_LOOKBACK); j <= i; j++) {
    if (lineHasBareDsOkTag(lines[j])) return true;
  }
  return false;
}