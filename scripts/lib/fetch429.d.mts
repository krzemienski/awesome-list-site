export function fetchWith429Retry(
  url: string,
  options?: RequestInit,
  maxRetries?: number,
): Promise<Response>;
