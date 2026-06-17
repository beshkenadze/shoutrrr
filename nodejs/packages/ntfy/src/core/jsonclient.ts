// Ported from Go pkg/util/jsonclient. Uses undici so the dispatcher can be
// swapped for a MockAgent in tests.
import { request, type Dispatcher } from 'undici';

/** ContentType is the default mime type for JSON requests. */
export const ContentType = 'application/json';

/** ApiError carries the HTTP status and parsed body of a non-2xx response. */
export class ApiError extends Error {
  readonly statusCode: number;
  readonly body: unknown;

  constructor(statusCode: number, body: unknown) {
    super(`server responded with HTTP ${statusCode}`);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.body = body;
  }
}

export interface JsonClientOptions {
  dispatcher?: Dispatcher;
}

/** JsonClient is a thin JSON wrapper around undici with mutable default headers. */
export class JsonClient {
  /** headers are sent on every request; mutate directly to add/remove entries. */
  readonly headers: Record<string, string> = { 'Content-Type': ContentType };
  private readonly dispatcher?: Dispatcher;

  constructor(opts: JsonClientOptions = {}) {
    this.dispatcher = opts.dispatcher;
  }

  async get<T>(url: string): Promise<T> {
    const res = await request(url, {
      method: 'GET',
      headers: this.headers,
      ...(this.dispatcher ? { dispatcher: this.dispatcher } : {}),
    });
    return this.parse<T>(res);
  }

  /**
   * post sends body as the request payload. A string body is passed through
   * verbatim (matching Go behaviour for raw payloads); any other value is
   * JSON-serialized.
   */
  async post<TRes>(url: string, body: unknown): Promise<TRes> {
    const payload = typeof body === 'string' ? body : JSON.stringify(body);
    const res = await request(url, {
      method: 'POST',
      headers: this.headers,
      body: payload,
      ...(this.dispatcher ? { dispatcher: this.dispatcher } : {}),
    });
    return this.parse<TRes>(res);
  }

  private async parse<T>(res: {
    statusCode: number;
    body: { text(): Promise<string> };
  }): Promise<T> {
    const text = await res.body.text();
    let parsed: unknown;
    try {
      parsed = text === '' ? undefined : JSON.parse(text);
    } catch {
      parsed = text;
    }
    if (res.statusCode >= 400) {
      throw new ApiError(res.statusCode, parsed);
    }
    return parsed as T;
  }
}
