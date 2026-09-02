// Shared design-system token contract used by the repository gate and the
// editor-time Stylelint rule. Keep the peer-selection policy here so the two
// feedback paths cannot silently disagree about what counts as a complete
// system look.

export const SHARED_TOKEN_PEER_RATIO = 0.75;

export const MINIMAL_TOKEN_SYSTEMS = new Map([
  // ['example', 'Written reason: this system intentionally changes only ...'],
]);

const SYSTEM_BLOCK_RE = /^[ \t]*:root\[data-system=["']([A-Za-z0-9_-]+)["']\]\s*\{([^}]*)\}/gm;

function stripComments(src) {
  return String(src).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

/**
 * Parse only the bare token blocks. Descendant component skins deliberately
 * do not count as a system's token block.
 */
export function parseCssSystemBlocks(cssSrc) {
  const source = stripComments(cssSrc);
  const blocks = new Map();
  for (const match of source.matchAll(SYSTEM_BLOCK_RE)) blocks.set(match[1], match[2]);
  return blocks;
}

export function parseCssCustomProperties(body) {
  return new Set(
    [...String(body ?? '').matchAll(/(?:^|[\s;{])(--[\w-]+)\s*:/g)].map((match) => match[1]),
  );
}

export function declaresCustomProperty(body) {
  return parseCssCustomProperties(body).size > 0;
}

/**
 * Find the established peer set and the custom properties that at least the
 * configured proportion of those peers declare. A newly added small block is
 * filtered by the lower median before it can weaken the contract.
 */
export function sharedSystemTokens(systemIds, cssBlocks, excludedIds = new Set()) {
  const candidates = systemIds.filter(
    (id) => cssBlocks.has(id) && declaresCustomProperty(cssBlocks.get(id)) && !excludedIds.has(id),
  );
  const declarationCounts = new Map(
    candidates.map((id) => [id, parseCssCustomProperties(cssBlocks.get(id)).size]),
  );
  const sortedCounts = [...declarationCounts.values()].sort((a, b) => a - b);
  const medianCount = sortedCounts.length ? sortedCounts[Math.floor((sortedCounts.length - 1) / 2)] : 0;
  const peerIds = candidates.filter((id) => declarationCounts.get(id) >= medianCount);
  const counts = new Map();
  for (const id of peerIds) {
    for (const token of parseCssCustomProperties(cssBlocks.get(id))) {
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
  }
  const minimumPeers = Math.ceil(peerIds.length * SHARED_TOKEN_PEER_RATIO);
  const tokens = new Set(
    [...counts].filter(([, count]) => count >= minimumPeers).map(([token]) => token),
  );
  return { peerIds, tokens };
}

/**
 * Return the exact omissions the editor and repository gate should report.
 * Systems absent from the current stylesheet, empty blocks, and excluded
 * systems are handled by the broader gate; this helper is specifically the
 * shared-token contract for blocks that do declare tokens.
 */
export function findMissingSystemTokens(systemIds, cssBlocks, excludedIds = new Set()) {
  const { peerIds, tokens } = sharedSystemTokens(systemIds, cssBlocks, excludedIds);
  const missingBySystem = new Map();
  for (const id of systemIds) {
    const body = cssBlocks.get(id);
    if (body == null || excludedIds.has(id)) continue;
    const declared = parseCssCustomProperties(body);
    const missing = [...tokens].filter((token) => !declared.has(token)).sort();
    if (missing.length) missingBySystem.set(id, { declaredCount: declared.size, missing });
  }
  return { peerIds, tokens, missingBySystem };
}

export function formatMissingSystemTokensMessage(id, declaredCount, contractSize, missing) {
  return `design system "${id}" declares ${declaredCount} custom propert${declaredCount === 1 ? 'y' : 'ies'}, but its established peers agree on ${contractSize}; missing shared token(s): ${missing.join(', ')} — add them to its :root[data-system="${id}"] block, or record a written reason in MINIMAL_TOKEN_SYSTEMS if this smaller look is intentional`;
}

/**
 * Only reasoned entries for offered systems with a non-empty token block are
 * usable exemptions. Both the gate and editor call this before computing the
 * contract, so a blank or stale pin can never silence diagnostics in one path.
 */
export function validateMinimalTokenSystems(systemIds, cssBlocks, minimalTokenSystems = MINIMAL_TOKEN_SYSTEMS) {
  const offered = new Set(systemIds);
  const exemptIds = new Set();
  const failures = [];
  for (const [id, reason] of minimalTokenSystems) {
    const written = String(reason ?? '').trim();
    if (!written) {
      failures.push({
        id,
        message: `design system "${id}" is pinned in MINIMAL_TOKEN_SYSTEMS with no written reason — write why its intentionally minimal token set is sufficient or delete the entry`,
      });
      continue;
    }
    if (!offered.has(id)) {
      failures.push({
        id,
        message: `design system "${id}" is pinned in MINIMAL_TOKEN_SYSTEMS but is not an offered system in this contract — drop the stale entry (reason was: ${written})`,
      });
      continue;
    }
    const body = cssBlocks.get(id);
    if (body == null || !declaresCustomProperty(body)) continue;
    exemptIds.add(id);
  }
  return { exemptIds, failures };
}

/**
 * An exemption becomes stale once the block satisfies the established peer
 * contract. Keep this check shared so the editor and gate retire pins alike.
 */
export function findStaleMinimalTokenSystems(
  exemptIds,
  cssBlocks,
  sharedTokens,
  minimalTokenSystems = MINIMAL_TOKEN_SYSTEMS,
) {
  if (!sharedTokens.size) return [];
  const failures = [];
  for (const id of exemptIds) {
    const declared = parseCssCustomProperties(cssBlocks.get(id));
    const missing = [...sharedTokens].filter((token) => !declared.has(token));
    if (missing.length) continue;
    failures.push({
      id,
      message: `design system "${id}" is pinned in MINIMAL_TOKEN_SYSTEMS but now declares the full shared token contract — drop the stale entry (reason was: ${String(minimalTokenSystems.get(id)).trim()})`,
    });
  }
  return failures;
}