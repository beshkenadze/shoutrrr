/**
 * JSON HTTP client — port of Go `pkg/util/jsonclient`.
 *
 * GET/POST helpers that (de)serialize JSON and throw `ApiError` on non-2xx
 * responses, carrying the parsed body.
 *
 * Built on the standard `fetch` API so it runs identically on Bun and Node.
 * An undici `Dispatcher` may be injected (constructor `dispatcher` option) and
 * is forwarded to `fetch` when supplied — keeping the connection pool / proxy
 * configurable on the Node/undici runtime.
 */
import type { Dispatcher } from 'undici';

/** Error thrown on a non-2xx JSON response. */
export class ApiError extends Error {
  readonly statusCode: number;
  readonly body: unknown;

  constructor(statusCode: number, body: unknown) {
    super(`unknown error (HTTP ${statusCode})`);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.body = body;
  }
}

const DEFAULT_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

export class JsonClient {
  headers: Record<string, string>;
  private readonly dispatcher?: Dispatcher;

  constructor(opts?: { dispatcher?: Dispatcher }) {
    this.headers = { ...DEFAULT_HEADERS };
    this.dispatcher = opts?.dispatcher;
  }

  /** Sends a GET request and parses the JSON response. */
  async get<T>(url: string): Promise<T> {
    return this.do<T>('GET', url, undefined);
  }

  /** Sends a POST request with a JSON body and parses the JSON response. */
  async post<TRes>(url: string, body: unknown): Promise<TRes> {
    return this.do<TRes>('POST', url, JSON.stringify(body));
  }

  private async do<T>(
    method: 'GET' | 'POST',
    url: string,
    payload: string | undefined,
  ): Promise<T> {
    const init: RequestInit = {
      method,
      headers: this.headers,
      ...(payload === undefined ? {} : { body: payload }),
    };
    // undici's fetch accepts a `dispatcher`; the standard RequestInit type
    // does not declare it, so it is attached without widening the public API.
    if (this.dispatcher) {
      (init as Record<string, unknown>).dispatcher = this.dispatcher;
    }

    const res = await fetch(url, init);
    const text = await res.text();
    const parsed = parseJSON(text);

    if (!res.ok) {
      throw new ApiError(res.status, parsed);
    }

    return parsed as T;
  }
}

function parseJSON(text: string): unknown {
  if (text === '') {
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
