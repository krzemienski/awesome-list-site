import { sql } from "drizzle-orm";
import { db } from "../db";
import { createLogger } from "../lib/logger";
import { restoreDocDeltas, takeDocDeltas } from "./operationalTelemetry";

const logger = createLogger("traffic-flush");

const FLUSH_EVERY_MS = 5 * 60 * 1000;
const PRUNE_EVERY_MS = 24 * 60 * 60 * 1000;
export const TRAFFIC_RETENTION_DAYS = 400;

let timer: NodeJS.Timeout | undefined;
let flushing: Promise<void> | undefined;
let lastPruneAt = 0;

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

export function initializeTrafficFlush(): void {
  if (process.env.NODE_ENV === "test" || process.env.VITEST || timer) return;
  timer = setInterval(() => void flushTraffic(), FLUSH_EVERY_MS);
  timer.unref();
}
