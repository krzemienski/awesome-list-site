import { researchService } from '../server/ai/researchService';
import { db } from '../server/db';
import { researchJobs } from '../shared/schema';
import { eq } from 'drizzle-orm';

const jobId = await researchService.startResearchJob({
  prompt: 'Find ONE high-quality, currently-active resource related to WebRTC video streaming that is not already in our database. Verify via web_search.',
  categoryFocus: 'Players & Clients',
  maxBudgetUsd: '0.60',
  maxTurns: 8,
  startedBy: undefined,
});
console.log('started jobId =', jobId);

const start = Date.now();
while (Date.now() - start < 180_000) {
  await new Promise(r => setTimeout(r, 3000));
  const [j] = await db.select().from(researchJobs).where(eq(researchJobs.id, jobId));
  process.stdout.write(`[${Math.round((Date.now()-start)/1000)}s] status=${j.status} turns=${j.turnsUsed} discoveries=${j.totalDiscoveries} cost=$${j.estimatedCostUsd}\n`);
  if (j.status === 'completed' || j.status === 'failed' || j.status === 'cancelled') {
    console.log('\n=== FINAL JOB ===');
    console.log(JSON.stringify({
      status: j.status, turns: j.turnsUsed, discoveries: j.totalDiscoveries,
      duplicates: j.duplicatesSkipped, cost: j.estimatedCostUsd, error: j.errorMessage,
    }, null, 2));
    console.log('\n=== AGENT LOG (full) ===');
    for (const e of j.agentLog || []) {
      console.log(`[${e.role}] ${e.content}`);
    }
    process.exit(j.status === 'completed' ? 0 : 1);
  }
}
console.error('TIMEOUT after 180s');
process.exit(2);
