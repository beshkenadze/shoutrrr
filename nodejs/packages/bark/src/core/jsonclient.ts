import { request, type Dispatcher } from 'undici';

/**
 * ApiError is thrown when the server responds with a non-2xx status. It carries
 * the HTTP status code and the parsed (or raw) response body, mirroring Go's
 * jsonclient.Error.
 */
export class ApiError<T = unknown> extends Error {
  readonly statusCode: number;
  readonly body: T;

  constructor(statusCode: number, body: T) {
    super(`got HTTP ${statusCode}`);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.body = body;
  }
}

/**
 * JsonClient is a thin JSON wrapper around undici's request, mirroring Go's
 * jsonclient.Client. The dispatcher can be injected (e.g. a MockAgent) for tests.
 */
export class JsonClient {
  headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  private readonly dispatcher?: Dispatcher;

  constructor(opts?: { dispatcher?: Dispatcher }) {
    this.dispatcher = opts?.dispatcher;
  }

  async get<T>(url: string): Promise<T> {
    const res = await request(url, {
      method: 'GET',
      headers: this.headers,
      ...(this.dispatcher ? { dispatcher: this.dispatcher } : {}),
    });
    return this.parseResponse<T>(res.statusCode, await res.body.text());
  }

  async post<TRes>(url: string, body: unknown): Promise<TRes> {
    const payload = typeof body === 'string' ? body : JSON.stringify(body);
    const res = await request(url, {
      method: 'POST',
      headers: this.headers,
      body: payload,
      ...(this.dispatcher ? { dispatcher: this.dispatcher } : {}),
    });
    return this.parseResponse<TRes>(res.statusCode, await res.body.text());
  }

  private parseResponse<T>(statusCode: number, text: string): T {
    let parsed: unknown;
    try {
      parsed = text.length > 0 ? JSON.parse(text) : undefined;
    } catch {
      parsed = text;
    }

    if (statusCode >= 400) {
      throw new ApiError(statusCode, parsed);
    }

    return parsed as T;
  }
}
