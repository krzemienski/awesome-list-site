import stylelint from 'stylelint';
import {
  MINIMAL_TOKEN_SYSTEMS,
  findStaleMinimalTokenSystems,
  findMissingSystemTokens,
  formatMissingSystemTokensMessage,
  parseCssSystemBlocks,
  validateMinimalTokenSystems,
} from '../validation/design-system-token-contract.mjs';

const ruleName = 'awesome/design-system-token-contract';
const { utils } = stylelint;

const rule = (_primary, secondaryOptions = {}) => (root, result) => {
  const cssBlocks = parseCssSystemBlocks(root.toString());
  if (!cssBlocks.size) return;

  const systemIds = [...cssBlocks.keys()];
  const minimalTokenSystems = secondaryOptions.minimalTokenSystems
    ? new Map(Object.entries(secondaryOptions.minimalTokenSystems))
    : MINIMAL_TOKEN_SYSTEMS;
  const minimalValidation = validateMinimalTokenSystems(systemIds, cssBlocks, minimalTokenSystems);
  const { tokens, missingBySystem } = findMissingSystemTokens(
    systemIds,
    cssBlocks,
    minimalValidation.exemptIds,
  );
  if (!tokens.size) return;

  const rulesBySystem = new Map();
  root.walkRules((ruleNode) => {
    const match = /^\s*:root\[data-system=["']([A-Za-z0-9_-]+)["']\]\s*$/.exec(ruleNode.selector);
    if (!match) return;

    const id = match[1];
    rulesBySystem.set(id, ruleNode);
    const missing = missingBySystem.get(id);
    if (!missing) return;

    utils.report({
      message: formatMissingSystemTokensMessage(id, missing.declaredCount, tokens.size, missing.missing),
      node: ruleNode,
      result,
      ruleName,
    });
  });

  for (const failure of [
    ...minimalValidation.failures,
    ...findStaleMinimalTokenSystems(
      minimalValidation.exemptIds,
      cssBlocks,
      tokens,
      minimalTokenSystems,
    ),
  ]) {
    utils.report({
      message: failure.message,
      node: rulesBySystem.get(failure.id) ?? root,
      result,
      ruleName,
    });
  }
};

rule.meta = {
  url: 'https://stylelint.io/user-guide/configure/plugins/',
};

export default stylelint.createPlugin(ruleName, rule);