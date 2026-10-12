// Zod 4 probes `new Function("")` before its first object parse to decide
// whether to JIT-compile parsers. The production CSP has no 'unsafe-eval', so
// the probe always fails; Zod falls back silently, but Firefox reports every
// attempt as a CSP violation. Zod reads its global config from this key when
// the module first evaluates (zod/v4/core/core.js), so setting it here — the
// entry's first import — covers every lazily loaded schema chunk without
// pulling zod into the shell bundle.
const g = globalThis as { __zod_globalConfig?: { jitless?: boolean } };
(g.__zod_globalConfig ??= {}).jitless = true;
