# Artifact docs generation handoff

## Scope

The generated Markdown chapters in
`artifacts/awesome-video-design-system/docs/` are a byte-preserving projection
of the frozen chapters in `awesome-list-site-ds/docs/01..18`. The projection
adds YAML frontmatter to every chapter:

```yaml
---
source: awesome-list-site-ds/docs/01-overview.md
sha256: <sha256 of the complete frozen source file>
---
```

`README.md` is also generated from the frozen docs README. It keeps the
canonical 18-chapter Markdown guide index, adds the same source/hash
frontmatter, and includes the live artifact route plus links to all 21 live
docs chapters (`/#docs-<chapter>`).

## Exact generator integration

The standalone helper is
`scripts/validation/design-system-artifact-docs.mjs`. It exports
`generateArtifactDocs({ rootDir })` and `checkArtifactDocs({ rootDir })`, and
its CLI defaults to the repository root:

```sh
node scripts/validation/design-system-artifact-docs.mjs --docs
node scripts/validation/design-system-artifact-docs.mjs --docs --check
node scripts/validation/design-system-artifact-docs.mjs --check
```

To integrate it into `scripts/generate-design-system-artifact.mjs` without
duplicating source discovery or hash logic, add this import near its other
imports:

```js
import {
  checkArtifactDocs,
  generateArtifactDocs,
} from "./validation/design-system-artifact-docs.mjs";
```

Add the `--docs` branch after `fromRoot` is defined but before any token or
stylesheet reads. This makes `--docs` a docs-only operation and ensures it
cannot be skipped by token parsing:

```js
const docsOnly = process.argv.includes("--docs");

if (docsOnly) {
  if (checkOnly) {
    checkArtifactDocs({ rootDir: projectRoot });
  } else {
    generateArtifactDocs({ rootDir: projectRoot });
  }
  process.exit(0);
}

const css = fs.readFileSync(fromRoot(cssPath), "utf8");
```

For the ordinary generator path, call the matching operation after the existing
`current` artifact read and before the generator's first `if (current === next)`
branch. This location is important: the existing generator exits early when
tokens are already current, so a call placed only beside its final success
output would skip the docs check/generation. The ordinary `--check` path must
therefore check docs before that early token-up-to-date exit:

```js
if (checkOnly) {
  checkArtifactDocs({ rootDir: projectRoot });
} else {
  generateArtifactDocs({ rootDir: projectRoot });
}
```

The existing token projection's `checkOnly` branch must retain its current
stale-token failure behavior; therefore the call above is an additional
artifact-docs check/generation step, not a replacement for the token
comparison and write. A future shared npm script can invoke the helper
directly while this handoff remains the integration contract.

## Verification contract

Run the helper against the repository, then prove source drift is rejected in
an isolated `/tmp` copy:

```sh
node scripts/validation/design-system-artifact-docs.mjs --docs
node scripts/validation/design-system-artifact-docs.mjs --check
```

The helper checks the complete expected file set, exact source paths, SHA-256
values, and byte-for-byte generated bodies. A source mutation changes the
expected body/hash and fails `--check`; no browser or workflow is required.