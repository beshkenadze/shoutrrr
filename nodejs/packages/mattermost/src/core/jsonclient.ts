import { type Dispatcher, request } from 'undici';

/** Default mime type for JSON requests (port of jsonclient.ContentType). */
export const CONTENT_TYPE = 'application/json';

/** ApiError carries the HTTP status and parsed body of a non-2xx response. */
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

/**
 * JsonClient is a thin JSON wrapper around undici, mirroring Go's jsonclient.Client.
 * A custom dispatcher (e.g. undici MockAgent) can be injected for testing.
 */
export class JsonClient {
  readonly headers: Record<string, string> = { 'Content-Type': CONTENT_TYPE };
  private readonly dispatcher: Dispatcher | undefined;

  constructor(opts: { dispatcher?: Dispatcher } = {}) {
    this.dispatcher = opts.dispatcher;
  }

  /** GET `url` and parse the JSON response body. */
  async get<T>(url: string): Promise<T> {
    const res = await request(url, {
      method: 'GET',
      headers: this.headers,
      ...(this.dispatcher ? { dispatcher: this.dispatcher } : {}),
    });
    return this.parse<T>(res.statusCode, res.body);
  }

  /** POST `body` as JSON to `url` and parse the JSON response body. */
  async post<TRes>(url: string, body: unknown): Promise<TRes> {
    const payload = typeof body === 'string' ? body : JSON.stringify(body);
    const res = await request(url, {
      method: 'POST',
      headers: this.headers,
      body: payload,
      ...(this.dispatcher ? { dispatcher: this.dispatcher } : {}),
    });
    return this.parse<TRes>(res.statusCode, res.body);
  }

  private async parse<T>(
    statusCode: number,
    body: Dispatcher.ResponseData['body'],
  ): Promise<T> {
    const text = await body.text();
    const parsed = text === '' ? undefined : safeJsonParse(text);
    if (statusCode < 200 || statusCode >= 300) {
      throw new ApiError(statusCode, parsed ?? text);
    }
    return parsed as T;
  }
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
