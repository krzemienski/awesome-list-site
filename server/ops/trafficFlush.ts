import { sql } from "drizzle-orm";
import { db } from "../db";
import { createLogger } from "../lib/logger";
import { restoreDocDeltas, takeDocDeltas } from "./operationalTelemetry";
import { isServingTraffic, lastServedAt } from "./serviceActivity";

const logger = createLogger("traffic-flush");

const FLUSH_EVERY_MS = 5 * 60 * 1000;
const PRUNE_EVERY_MS = 24 * 60 * 60 * 1000;
export const TRAFFIC_RETENTION_DAYS = 400;

let timer: NodeJS.Timeout | undefined;
let flushing: Promise<void> | undefined;
let lastPruneAt = 0;
let lastTickAt = 0;

async function writeDeltas(): Promise<void> {
  const deltas = takeDocDeltas();
  if (deltas.length > 0) {
    try {
      const values = deltas.map(
        (d) => sql`(${d.hour.toISOString()}::timestamptz, ${d.template}, ${d.clientClass}, ${d.statusClass}, ${d.count})`,
      );
      await db.execute(sql`
        INSERT INTO traffic_hourly (hour, template, class, status_class, count)
        VALUES ${sql.join(values, sql`, `)}
        ON CONFLICT (hour, template, class, status_class)
        DO UPDATE SET count = traffic_hourly.count + EXCLUDED.count`);
    } catch (error) {
      restoreDocDeltas(deltas);
      logger.warn("Traffic flush failed; keeping counts for the next attempt", {
        rows: deltas.length,
        errorClass: error instanceof Error ? error.name : "unknown",
        code: (error as { code?: unknown } | null)?.code ?? undefined,
      });
      return;
    }
  }
  if (Date.now() - lastPruneAt >= PRUNE_EVERY_MS) {
    try {
      await db.execute(sql`
        DELETE FROM traffic_hourly WHERE hour < now() - ${`${TRAFFIC_RETENTION_DAYS} days`}::interval`);
      lastPruneAt = Date.now();
    } catch (error) {
      logger.warn("Traffic retention prune failed; retrying next flush", {
        errorClass: error instanceof Error ? error.name : "unknown",
      });
    }
  }
}

/** Writes the counts gathered since the last flush. Never throws; concurrent calls share one write. */
export function flushTraffic(): Promise<void> {
  flushing ??= writeDeltas()
    .catch(() => undefined)
    .finally(() => {
      flushing = undefined;
    });
  return flushing;
}

/**
 * One timer tick. An idle Autoscale instance has no CPU for a connect, so a
 * tick writes only while the instance serves traffic. The first tick after the
 * last request also writes once: that is the final chance to save the counts
 * before the platform stops the idle instance, and it happens once per
 * serving-to-idle transition, never on every idle tick.
 */
function flushTick(): void {
  const servedSinceLastTick = lastServedAt() > lastTickAt;
  lastTickAt = Date.now();
  if (servedSinceLastTick || isServingTraffic()) void flushTraffic();
}

export function initializeTrafficFlush(): void {
  if (process.env.NODE_ENV === "test" || process.env.VITEST || timer) return;
  lastTickAt = Date.now();
  timer = setInterval(flushTick, FLUSH_EVERY_MS);
  timer.unref();
}
