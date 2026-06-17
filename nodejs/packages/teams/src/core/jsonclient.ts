import type { Dispatcher } from 'undici';
// Import the real undici entry: Bun shims the bare `undici` specifier with an
// incomplete built-in, so we resolve the package's index to get full behaviour
// (and MockAgent interop) under both Bun and Node.
import { request } from 'undici/index.js';

/** ApiError carries the HTTP status and the parsed (or raw) response body. */
export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown) {
    super(`server returned response status code ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

/** Options for constructing a JsonClient. */
export interface JsonClientOptions {
  /** Optional undici dispatcher, e.g. a MockAgent for tests. */
  dispatcher?: Dispatcher;
}

/**
 * JsonClient is a minimal JSON-over-HTTP client, ported from Go's
 * pkg/util/jsonclient. It sends/receives JSON, throws ApiError on non-2xx,
 * and tolerates empty or non-JSON success bodies.
 */
export class JsonClient {
  readonly headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  private readonly dispatcher?: Dispatcher;

  constructor(opts: JsonClientOptions = {}) {
    this.dispatcher = opts.dispatcher;
  }

  /** Performs a GET request and parses the JSON response. */
  async get<T>(url: string): Promise<T> {
    return this.do<T>('GET', url, undefined);
  }

  /** Performs a POST request with a JSON body and parses the JSON response. */
  async post<TRes>(url: string, body: unknown): Promise<TRes> {
    return this.do<TRes>('POST', url, JSON.stringify(body));
  }

  private async do<T>(
    method: 'GET' | 'POST',
    url: string,
    payload: string | undefined,
  ): Promise<T> {
    const res = await request(url, {
      method,
      headers: this.headers,
      body: payload,
      ...(this.dispatcher ? { dispatcher: this.dispatcher } : {}),
    });

    const text = await res.body.text();
    const parsed = parseMaybeJson(text);

    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw new ApiError(res.statusCode, parsed);
    }

    return parsed as T;
  }
}

/** Parses JSON when possible; falls back to the raw string (or undefined when empty). */
function parseMaybeJson(text: string): unknown {
  if (text.length === 0) {
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
