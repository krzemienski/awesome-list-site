import { AsyncLocalStorage } from "node:async_hooks";
import { randomBytes } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { markRequestServed } from "./serviceActivity";

type OperationalRequestState = {
  kind: "request";
  databaseUnavailable: boolean;
  /** Short per-request id so every log line of one request can be traced. */
  id: string;
  method: string;
  /** Raw path; the logger scrubs it before printing. */
  path: string;
};

interface JobState {
  kind: "job";
  databaseUnavailable: boolean;
  job: string;
  jobId: string;
}

const requestContext = new AsyncLocalStorage<OperationalRequestState | JobState>();

export type LogContext =
  | { kind: "request"; id: string; method: string; path: string }
  | { kind: "job"; job: string; jobId: string };

export function markRequestDatabaseUnavailable(): void {
  const state = requestContext.getStore();
  if (state) state.databaseUnavailable = true;
}

/** Request id, method and path (or job name and id) for log lines written inside either. */
export function getRequestLogContext(): LogContext | null {
  const state = requestContext.getStore();
  if (!state) return null;
  if (state.kind === "job") return { kind: "job", job: state.job, jobId: state.jobId };
  return { kind: "request", id: state.id, method: state.method, path: state.path };
}

/**
 * Runs a background job so every log line it writes carries `job=`/`jobId=`
 * instead of the request id of whatever happened to start it (a cron request,
 * a timer). Context follows the awaits, so repository logs are tagged too.
 */
export function runWithJobContext<T>(job: string, jobId: string | number, fn: () => T): T {
  return requestContext.run({ kind: "job", databaseUnavailable: false, job, jobId: String(jobId) }, fn);
}

export function requestHadDatabaseUnavailableError(): boolean {
  return requestContext.getStore()?.databaseUnavailable === true;
}

/**
 * Makes transient database failures consistently become a generic 503 even
 * when a legacy route catches its own error and attempts to send a 500.
 */
export function operationalRequestContext(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  markRequestServed();
  const id = randomBytes(3).toString("hex");
  res.locals.requestId = id;
  requestContext.run({ kind: "request", databaseUnavailable: false, id, method: req.method, path: req.path }, () => {
    const originalStatus = res.status.bind(res);
    const originalJson = res.json.bind(res);

    res.status = ((statusCode: number) => {
      if (
        statusCode === 500 &&
        requestHadDatabaseUnavailableError()
      ) {
        res.locals.databaseUnavailableTranslated = true;
        res.setHeader("Retry-After", "1");
        return originalStatus(503);
      }
      return originalStatus(statusCode);
    }) as Response["status"];

    res.json = ((body: unknown) => {
      if (res.locals.databaseUnavailableTranslated) {
        return originalJson({ message: "Service is temporarily unavailable" });
      }
      return originalJson(body);
    }) as Response["json"];

    next();
  });
}