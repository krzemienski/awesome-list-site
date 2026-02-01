import cron from 'node-cron';
import { linkHealthMonitor } from '../services/linkHealthMonitor';

let scheduledJob: cron.ScheduledTask | null = null;

/**
 * Initialize the link health monitoring cron job
 * Runs every Sunday at 2:00 AM to check all resource links
 */
export function initializeLinkHealthScheduler(): void {
  const isEnabled = process.env.LINK_HEALTH_CRON_ENABLED === 'true';

  if (!isEnabled) {
    console.log('[LinkHealthScheduler] Cron job disabled via LINK_HEALTH_CRON_ENABLED env variable');
    return;
  }

  // Schedule: '0 2 * * 0' = Every Sunday at 2:00 AM
  // Minute: 0
  // Hour: 2
  // Day of Month: * (any)
  // Month: * (any)
  // Day of Week: 0 (Sunday)
  const schedule = '0 2 * * 0';

  if (scheduledJob) {
    console.log('[LinkHealthScheduler] Cron job already scheduled, skipping initialization');
    return;
  }

  scheduledJob = cron.schedule(schedule, async () => {
    console.log('[LinkHealthScheduler] Starting scheduled link health check');
    try {
      const jobId = await linkHealthMonitor.runHealthCheck('cron-scheduler');
      console.log(`[LinkHealthScheduler] Link health check initiated with job ID: ${jobId}`);
    } catch (error) {
      console.error('[LinkHealthScheduler] Error running scheduled link health check:', error);
    }
  });

  console.log(`[LinkHealthScheduler] Cron job scheduled: ${schedule} (Every Sunday at 2:00 AM)`);
}

/**
 * Stop the scheduled cron job (useful for testing or graceful shutdown)
 */
export function stopLinkHealthScheduler(): void {
  if (scheduledJob) {
    scheduledJob.stop();
    scheduledJob = null;
    console.log('[LinkHealthScheduler] Cron job stopped');
  }
}
