import { AsyncLocalStorage } from "node:async_hooks";
import { randomBytes } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

type OperationalRequestState = {
  databaseUnavailable: boolean;
  /** Short per-request id so every log line of one request can be traced. */
  id: string;
  method: string;
  /** Raw path; the logger scrubs it before printing. */
  path: string;
};

const requestContext = new AsyncLocalStorage<OperationalRequestState>();

export function markRequestDatabaseUnavailable(): void {
  const state = requestContext.getStore();
  if (state) state.databaseUnavailable = true;
}

/** Request id, method and path for log lines written inside a request. */
export function getRequestLogContext(): { id: string; method: string; path: string } | null {
  const state = requestContext.getStore();
  return state ? { id: state.id, method: state.method, path: state.path } : null;
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
  const id = randomBytes(3).toString("hex");
  res.locals.requestId = id;
  requestContext.run({ databaseUnavailable: false, id, method: req.method, path: req.path }, () => {
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