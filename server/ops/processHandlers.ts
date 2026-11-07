import { createLogger, flushLogs } from "../lib/logger";
import { flushTraffic } from "./trafficFlush";

const logger = createLogger("process");
const FLUSH_TIMEOUT_MS = 3000;

let installed = false;
let exiting = false;

const asError = (reason: unknown): Error =>
  reason instanceof Error ? reason : new Error(typeof reason === "string" ? reason : "non-Error rejection");

async function flushThenExit(code: number, beforeFlush?: () => Promise<unknown>): Promise<void> {
  try {
    if (beforeFlush) {
      await Promise.race([beforeFlush(), new Promise((resolve) => setTimeout(resolve, FLUSH_TIMEOUT_MS))]);
    }
    await flushLogs(FLUSH_TIMEOUT_MS);
  } finally {
    process.exit(code);
  }
}

/**
 * Crash and shutdown visibility. An uncaught exception leaves Node in an
 * undefined state, so it is logged, flushed and followed by exit 1. An
 * unhandled rejection is logged and the server keeps serving (owner decision
 * 18). SIGTERM and SIGINT log one line, write the pending traffic counts, flush buffered logs and exit 0.
 */
export function installProcessHandlers(): void {
  if (installed) return;
  installed = true;

  process.on("uncaughtException", (error, origin) => {
    if (exiting) return;
    exiting = true;
    logger.error("Uncaught exception; exiting", error, { origin });
    void flushThenExit(1);
  });

  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled promise rejection; still serving", asError(reason));
  });

  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.on(signal, () => {
      if (exiting) return;
      exiting = true;
      logger.warn(`${signal} received; flushing logs and exiting`, { uptimeS: Math.round(process.uptime()) });
      void flushThenExit(0, flushTraffic);
    });
  }
}
