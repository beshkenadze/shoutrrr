import { type Dispatcher, request } from './undici.js';

/** ApiError is thrown for non-2xx HTTP responses, carrying the status and parsed body. */
export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown) {
    super(`got HTTP ${status} response`);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export interface RawResponse {
  status: number;
  body: string;
}

export interface RawRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

/**
 * JsonClient is a small JSON-over-HTTP client, faithful port of Go `pkg/util/jsonclient`,
 * extended with a raw POST path used by the generic service (arbitrary content-type/body).
 * The undici dispatcher is injectable so tests can substitute a MockAgent.
 */
export class JsonClient {
  headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  private readonly dispatcher?: Dispatcher;

  constructor(opts?: { dispatcher?: Dispatcher }) {
    this.dispatcher = opts?.dispatcher;
  }

  async get<T>(url: string): Promise<T> {
    const res = await request(url, {
      method: 'GET',
      headers: this.headers,
      dispatcher: this.dispatcher,
    });
    const text = await res.body.text();
    return this.parse<T>(res.statusCode, text);
  }

  async post<TRes>(url: string, body: unknown): Promise<TRes> {
    const res = await request(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
      dispatcher: this.dispatcher,
    });
    const text = await res.body.text();
    return this.parse<TRes>(res.statusCode, text);
  }

  private parse<T>(status: number, text: string): T {
    let parsed: unknown = text;
    if (text.length > 0) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }
    }
    if (status < 200 || status >= 300) {
      throw new ApiError(status, parsed);
    }
    return parsed as T;
  }

  /**
   * raw sends a request with an arbitrary method, content-type, custom headers and raw body,
   * returning the status and body text without JSON parsing. Used by the generic webhook service.
   */
  async raw(url: string, opts: RawRequestOptions): Promise<RawResponse> {
    const res = await request(url, {
      method: (opts.method ?? 'POST') as Dispatcher.HttpMethod,
      headers: opts.headers,
      body: opts.body,
      dispatcher: this.dispatcher,
    });
    const text = await res.body.text();
    return { status: res.statusCode, body: text };
  }
}
