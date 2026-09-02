#!/usr/bin/env node
import stylelint from 'stylelint';
import plugin from '../stylelint/design-system-token-contract.mjs';

const RULE = 'awesome/design-system-token-contract';
const completeBlocks = `
:root[data-system="complete-a"] { --a: 1; --b: 2; --c: 3; --d: 4; }
:root[data-system="complete-b"] { --a: 1; --b: 2; --c: 3; --d: 4; }
:root[data-system="complete-c"] { --a: 1; --b: 2; --c: 3; --d: 4; }
`;

async function warningsFor(code, minimalTokenSystems = undefined) {
  const result = await stylelint.lint({
    code,
    codeFilename: 'design-system-token-contract-canary.css',
    config: {
      plugins: [plugin],
      rules: {
        [RULE]: [true, { minimalTokenSystems }],
      },
    },
  });
  return result.results[0]?.warnings ?? [];
}

function assert(condition, message) {
  if (!condition) throw new Error(`FAIL Stylelint token-contract canary :: ${message}`);
}

const complete = await warningsFor(completeBlocks);
assert(complete.length === 0, 'complete peer blocks must pass');

const partialSource = `${completeBlocks}
:root[data-system="partial"] { --a: 1; }
`;
const partial = await warningsFor(partialSource);
assert(partial.length === 1, 'partial block must produce one diagnostic');
assert(
  partial[0].line === partialSource.split('\n').findIndex((line) => line.includes('data-system="partial"')) + 1,
  'partial diagnostic must point at the offending selector',
);
assert(/--b, --c, --d/.test(partial[0].text), 'partial diagnostic must name every missing token');

const emptySource = `${completeBlocks}
:root[data-system="empty"] {}
`;
const empty = await warningsFor(emptySource);
assert(empty.length === 1, 'empty block must produce one diagnostic');
assert(
  empty[0].line === emptySource.split('\n').findIndex((line) => line.includes('data-system="empty"')) + 1,
  'empty diagnostic must point at the offending selector',
);
assert(/declares 0 custom properties/.test(empty[0].text), 'empty diagnostic must identify the empty contract');
assert(/--a, --b, --c, --d/.test(empty[0].text), 'empty diagnostic must name the full missing contract');

const validMinimal = await warningsFor(
  `${completeBlocks}
:root[data-system="minimal"] { --a: 1; }
`,
  { minimal: 'Written reason: this system intentionally changes only its background.' },
);
assert(validMinimal.length === 0, 'reasoned partial minimal system must be exempt');

const invalidMinimal = await warningsFor(
  `${completeBlocks}
:root[data-system="minimal"] { --a: 1; }
`,
  { minimal: '   ' },
);
assert(
  invalidMinimal.some(({ text }) => /no written reason/.test(text)),
  'blank minimal-system reason must be rejected',
);
assert(
  invalidMinimal.some(({ text }) => /--b, --c, --d/.test(text)),
  'blank minimal-system reason must not suppress missing-token diagnostics',
);

const staleMinimal = await warningsFor(
  `${completeBlocks}
:root[data-system="minimal"] { --a: 1; --b: 2; --c: 3; --d: 4; }
`,
  { minimal: 'Written reason: this system used to be intentionally small.' },
);
assert(
  staleMinimal.some(({ text }) => /full shared token contract/.test(text)),
  'full minimal system must reject its stale exemption',
);

console.log('PASS stylelint-design-system-token-contract :: complete, partial, empty, valid-minimal, blank-reason, and stale-minimal editor diagnostics verified');