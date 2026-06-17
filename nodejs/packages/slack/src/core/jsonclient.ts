import type { Dispatcher } from 'undici';

/** ContentType is the default mime type for JSON (port of jsonclient.ContentType). */
export const ContentType = 'application/json';

/** ApiError carries the HTTP status and parsed body for non-2xx responses (port of jsonclient.Error). */
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

/** Minimal fetch shape so the transport can be injected/overridden in tests. */
export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface JsonClientOptions {
  /**
   * undici Dispatcher, forwarded to the underlying fetch when running on
   * Node with undici (e.g. an undici MockAgent for testing).
   */
  dispatcher?: Dispatcher;
  /** Override the fetch transport directly (used by Bun-based tests). */
  fetch?: FetchLike;
}

/**
 * JsonClient — port of Go pkg/util/jsonclient.Client.
 * Sends/receives JSON; throws ApiError on non-2xx. The transport is injectable
 * (via `fetch` or an undici `dispatcher`) so tests can mock HTTP.
 */
export class JsonClient {
  readonly headers: Record<string, string> = {};
  private readonly dispatcher: Dispatcher | undefined;
  private readonly fetchImpl: FetchLike;

  constructor(opts: JsonClientOptions = {}) {
    this.dispatcher = opts.dispatcher;
    this.fetchImpl = opts.fetch ?? ((input, init) => fetch(input, init));
  }

  async get<T>(url: string): Promise<T> {
    const res = await this.fetchImpl(url, {
      method: 'GET',
      headers: this.requestHeaders(),
      ...this.dispatcherInit(),
    });
    return this.handleResponse<T>(res);
  }

  async post<TRes>(url: string, body: unknown): Promise<TRes> {
    const res = await this.fetchImpl(url, {
      method: 'POST',
      headers: this.requestHeaders(),
      body: JSON.stringify(body),
      ...this.dispatcherInit(),
    });
    return this.handleResponse<TRes>(res);
  }

  private requestHeaders(): Record<string, string> {
    return { 'content-type': ContentType, ...this.headers };
  }

  /** undici's fetch accepts a `dispatcher` in RequestInit; native fetch ignores it. */
  private dispatcherInit(): RequestInit {
    return this.dispatcher ? ({ dispatcher: this.dispatcher } as RequestInit) : {};
  }

  private async handleResponse<T>(res: Response): Promise<T> {
    const text = await res.text();
    let parsed: unknown;
    try {
      parsed = text === '' ? undefined : JSON.parse(text);
    } catch {
      parsed = text;
    }

    if (res.status < 200 || res.status >= 300) {
      throw new ApiError(res.status, parsed);
    }

    return parsed as T;
  }
}
