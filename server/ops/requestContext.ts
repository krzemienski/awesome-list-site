import { AsyncLocalStorage } from "node:async_hooks";
import type { NextFunction, Request, Response } from "express";

type OperationalRequestState = {
  databaseUnavailable: boolean;
};

const requestContext = new AsyncLocalStorage<OperationalRequestState>();

export function markRequestDatabaseUnavailable(): void {
  const state = requestContext.getStore();
  if (state) state.databaseUnavailable = true;
}

export function requestHadDatabaseUnavailableError(): boolean {
  return requestContext.getStore()?.databaseUnavailable === true;
}

/**
 * Makes transient database failures consistently become a generic 503 even
 * when a legacy route catches its own error and attempts to send a 500.
 */
export function operationalRequestContext(
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  requestContext.run({ databaseUnavailable: false }, () => {
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