/**
 * Off-box log shipping. `logger.ts` hands every already-scrubbed record to
 * `getLogSink().push()`, which is a synchronous append to a bounded buffer.
 * The network call runs on a timer and is never awaited by a request; the
 * only awaited path is `flush()` in the crash/SIGTERM handlers, with a hard
 * timeout. Sink failures go to raw `console.error`, never through the logger,
 * so a broken sink cannot feed itself.
 */
import { createAxiomTransport } from "./logSinkAxiom";
import { createStorageTransport, STORAGE_FLUSH_AT, STORAGE_FLUSH_EVERY_MS } from "./logSinkStorage";

export interface LogRecord {
  _time: string;
  level: "info" | "warn" | "error";
  area: string;
  message: string;
  /** Scrubbed key=value details as one JSON string, so the dataset's field count stays fixed. */
  fields?: string;
  rid?: string;
  req?: string;
  job?: string;
  jobId?: string;
  instance: string;
  deployment: string;
  stack?: string;
}

export interface LogSinkStats {
  sent: number;
  dropped: number;
  queued: number;
}

export interface LogSink {
  push(record: LogRecord): void;
  flush(timeoutMs: number): Promise<void>;
  stats(): LogSinkStats;
}

/** Sends one batch as NDJSON; rejects on any failure. */
export type LogTransport = (ndjson: string) => Promise<void>;

export const LOG_BUFFER_MAX = 2000;
export const LOG_FLUSH_AT = 200;
export const LOG_FLUSH_EVERY_MS = 2000;
export const LOG_BATCH_MAX_EVENTS = 10_000;
const LOG_BATCH_MAX_BYTES = 900_000;
const RETRY_DELAY_MS = 1000;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const nullSink: LogSink = {
  push: () => undefined,
  flush: () => Promise.resolve(),
  stats: () => ({ sent: 0, dropped: 0, queued: 0 }),
};

/** Writes the sink's own status line (the logger formats it; the sink never logs through `emit`). */
export type SinkNotice = (message: string) => void;

export interface BufferedSinkOptions {
  flushAt: number;
  flushEveryMs: number;
}

const DEFAULT_SINK_OPTIONS: BufferedSinkOptions = { flushAt: LOG_FLUSH_AT, flushEveryMs: LOG_FLUSH_EVERY_MS };

export function createBufferedSink(
  transport: LogTransport,
  notice: SinkNotice,
  { flushAt, flushEveryMs }: BufferedSinkOptions = DEFAULT_SINK_OPTIONS,
): LogSink {
  const queue: LogRecord[] = [];
  let sent = 0;
  let dropped = 0;
  let reportedDropped = 0;
  let timer: NodeJS.Timeout | null = null;
  let inFlight: Promise<void> | null = null;

  const takeBatch = (): LogRecord[] => {
    let bytes = 0;
    let count = 0;
    while (count < queue.length && count < LOG_BATCH_MAX_EVENTS) {
      bytes += JSON.stringify(queue[count]).length + 1;
      if (count > 0 && bytes > LOG_BATCH_MAX_BYTES) break;
      count++;
    }
    return queue.splice(0, count);
  };

  const sendWithRetry = async (batch: LogRecord[]): Promise<void> => {
    const body = batch.map((record) => JSON.stringify(record)).join("\n");
    try {
      await transport(body);
    } catch {
      await wait(RETRY_DELAY_MS);
      try {
        await transport(body);
      } catch (error) {
        dropped += batch.length;
        notice(`send failed: ${error instanceof Error ? error.message : "unknown"}`);
        return;
      }
    }
    sent += batch.length;
  };

  const reportDrops = () => {
    if (dropped > reportedDropped) {
      notice(`dropped=${dropped - reportedDropped} total_dropped=${dropped}`);
      reportedDropped = dropped;
    }
  };

  const flushOnce = (): Promise<void> => {
    if (inFlight) return inFlight;
    if (queue.length === 0) return Promise.resolve();
    inFlight = sendWithRetry(takeBatch()).finally(() => {
      inFlight = null;
      reportDrops();
    });
    return inFlight;
  };

  const ensureTimer = () => {
    if (timer) return;
    timer = setInterval(() => void flushOnce(), flushEveryMs);
    timer.unref();
  };

  return {
    push(record) {
      try {
        if (queue.length >= LOG_BUFFER_MAX) {
          const oldestInfo = queue.findIndex((queued) => queued.level === "info");
          queue.splice(oldestInfo === -1 ? 0 : oldestInfo, 1);
          dropped++;
        }
        queue.push(record);
        ensureTimer();
        if (queue.length >= flushAt && !inFlight) setTimeout(() => void flushOnce(), 0).unref();
      } catch {
        dropped++;
      }
    },
    async flush(timeoutMs) {
      const drain = async () => {
        while (queue.length > 0 || inFlight) await flushOnce();
      };
      let timeout: NodeJS.Timeout | undefined;
      await Promise.race([
        drain(),
        new Promise<void>((resolve) => {
          timeout = setTimeout(resolve, timeoutMs);
        }),
      ]);
      clearTimeout(timeout);
    },
    stats: () => ({ sent, dropped, queued: queue.length }),
  };
}

let sink: LogSink | null = null;

/**
 * The Axiom sink when AXIOM_TOKEN and AXIOM_DATASET are both set; else, in a
 * deployment with the private App Storage bucket, JSONL objects in that bucket;
 * else the null sink.
 */
export function getLogSink(notice: SinkNotice = console.error): LogSink {
  if (sink) return sink;
  const axiom = createAxiomTransport(process.env);
  const storage = axiom ? undefined : createStorageTransport(process.env, notice);
  if (axiom) sink = createBufferedSink(axiom, notice);
  else if (storage) sink = createBufferedSink(storage, notice, { flushAt: STORAGE_FLUSH_AT, flushEveryMs: STORAGE_FLUSH_EVERY_MS });
  else sink = nullSink;
  return sink;
}
