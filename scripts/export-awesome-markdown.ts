/**
 * Export the Awesome-list Markdown exactly as the GitHub export path builds it.
 *
 * Fetches approved resources, runs AwesomeListFormatter with the same options
 * the export uses, validates with the in-repo awesome-lint rules, and writes
 * the Markdown to the given path (default: /tmp/validation/awesome-bot/awesome-list.md).
 *
 * Used by scripts/check-awesome-bot.sh to give awesome_bot a real pre-publish
 * artifact to scan. Exits 1 if lint validation fails (no point link-checking
 * a malformed list).
 */

import { db } from '../server/db';
import { resources } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { AwesomeListFormatter } from '../server/github/formatter';
import { validateAwesomeList } from '../server/validation/awesomeLint';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

async function main() {
  const outPath = process.argv[2] || '/tmp/validation/awesome-bot/awesome-list.md';

  const approvedResources = await db
    .select()
    .from(resources)
    .where(eq(resources.status, 'approved'))
    .execute();

  console.log(`Fetched ${approvedResources.length} approved resources`);

  const formatter = new AwesomeListFormatter(approvedResources, {
    title: 'Awesome Video',
    description: 'A curated list of awesome video resources, tools, and learning materials.',
    includeContributing: true,
    includeLicense: true,
    websiteUrl: 'https://awesome.video',
    repoUrl: 'https://github.com/krzemienski/awesome-video',
  });

  const markdown = formatter.generate();

  const validation = validateAwesomeList(markdown);
  if (!validation.valid) {
    console.error(`awesome-lint validation FAILED with ${validation.errors.length} error(s):`);
    for (const e of validation.errors.slice(0, 20)) {
      console.error(`  line ${e.line}: [${e.rule}] ${e.message}`);
    }
    process.exit(1);
  }

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, markdown);
  console.log(`Wrote ${markdown.split('\n').length} lines to ${outPath}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Export failed:', err);
  process.exit(1);
});
