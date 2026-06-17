import { type Dispatcher, request } from 'undici';

/** Error thrown for non-2xx HTTP responses, carrying the parsed body. */
export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown) {
    super(`API error: status ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export interface JsonClientOptions {
  dispatcher?: Dispatcher;
}

/**
 * Minimal JSON HTTP client mirroring Go's pkg/util/jsonclient. The dispatcher is
 * injectable so tests can route requests through undici's MockAgent. A small
 * form-encoded POST helper is provided for services (like Zulip) that use
 * application/x-www-form-urlencoded bodies with basic auth.
 */
export class JsonClient {
  headers: Record<string, string> = {};
  private readonly dispatcher?: Dispatcher;

  constructor(opts: JsonClientOptions = {}) {
    this.dispatcher = opts.dispatcher;
  }

  async get<T>(url: string): Promise<T> {
    const res = await request(url, {
      method: 'GET',
      headers: this.headers,
      dispatcher: this.dispatcher,
    });
    return this.handle<T>(res);
  }

  async post<TRes>(url: string, body: unknown): Promise<TRes> {
    const res = await request(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...this.headers },
      body: JSON.stringify(body),
      dispatcher: this.dispatcher,
    });
    return this.handle<TRes>(res);
  }

  /**
   * POSTs an application/x-www-form-urlencoded body, optionally with basic auth.
   * Returns the raw status code and body text; the caller decides which status
   * codes count as success (Zulip's API treats only 200 as OK). A transport
   * failure (connection refused, DNS, etc.) rejects.
   */
  async postForm(
    url: string,
    form: URLSearchParams,
    auth?: { user: string; pass: string },
  ): Promise<{ status: number; text: string }> {
    const headers: Record<string, string> = {
      ...this.headers,
      'content-type': 'application/x-www-form-urlencoded',
    };
    if (auth) {
      const token = Buffer.from(`${auth.user}:${auth.pass}`).toString('base64');
      headers.authorization = `Basic ${token}`;
    }

    const res = await request(url, {
      method: 'POST',
      headers,
      body: form.toString(),
      dispatcher: this.dispatcher,
    });

    const text = await res.body.text();
    return { status: res.statusCode, text };
  }

  private async handle<T>(res: Dispatcher.ResponseData): Promise<T> {
    const text = await res.body.text();
    let parsed: unknown;
    try {
      parsed = text.length > 0 ? JSON.parse(text) : undefined;
    } catch {
      parsed = text;
    }

    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw new ApiError(res.statusCode, parsed);
    }
    return parsed as T;
  }
}
