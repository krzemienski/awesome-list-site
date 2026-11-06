import type { LogTransport } from "./logSink";

const DEFAULT_AXIOM_URL = "https://us-east-1.aws.edge.axiom.co";
const REQUEST_TIMEOUT_MS = 5000;

/** NDJSON ingest over plain fetch; undefined when the token or dataset is unset. */
export function createAxiomTransport(env: NodeJS.ProcessEnv): LogTransport | undefined {
  const token = env.AXIOM_TOKEN;
  const dataset = env.AXIOM_DATASET;
  if (!token || !dataset) return undefined;
  const url = `${(env.AXIOM_URL ?? DEFAULT_AXIOM_URL).replace(/\/+$/, "")}/v1/ingest/${encodeURIComponent(dataset)}`;
  return async (ndjson) => {
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/x-ndjson" },
      body: ndjson,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`axiom ingest HTTP ${response.status}`);
  };
}
