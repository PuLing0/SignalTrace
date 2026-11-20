export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  fetchImpl?: typeof fetch;
  sleep?: (milliseconds: number) => Promise<void>;
}

const defaultSleep = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

function retryAfterMs(response: Response, fallbackMs: number): number {
  const value = response.headers.get("retry-after");
  if (!value) return fallbackMs;

  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);

  const date = Date.parse(value);
  if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  return fallbackMs;
}

export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  options: RetryOptions = {},
): Promise<Response> {
  const maxRetries = options.maxRetries ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 250;
  const maxDelayMs = options.maxDelayMs ?? 4_000;
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleep = options.sleep ?? defaultSleep;

  let lastResponse: Response | undefined;
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const response = await fetchImpl(input, init);
      lastResponse = response;
      if (response.status !== 429 && response.status < 500) return response;
      if (attempt === maxRetries) return response;
    } catch (error) {
      lastError = error;
      if (attempt === maxRetries) break;
    }

    const exponentialDelay = Math.min(
      maxDelayMs,
      baseDelayMs * 2 ** attempt,
    );
    const delay = lastResponse
      ? retryAfterMs(lastResponse, exponentialDelay)
      : exponentialDelay;
    await sleep(delay);
    lastResponse = undefined;
  }

  if (lastError) throw lastError;
  if (lastResponse) return lastResponse;
  throw new Error("Request failed without a response");
}
