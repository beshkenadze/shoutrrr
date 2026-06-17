// Faithful port of Go pkg/util/jsonclient, using undici for HTTP.
import { type Dispatcher, request } from './undici.js';

/** ApiError preserves the HTTP status and the parsed (or raw) response body. */
export class ApiError extends Error {
  readonly statusCode: number;
  readonly body: unknown;

  constructor(statusCode: number, body: unknown) {
    super(`got HTTP ${statusCode}`);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.body = body;
  }
}

export interface JsonClientOptions {
  dispatcher?: Dispatcher;
}

/** JsonClient is a thin JSON wrapper over undici's request(). */
export class JsonClient {
  readonly headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
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
    return this.parse<T>(res.statusCode, res.body);
  }

  async post<TRes>(url: string, body: unknown): Promise<TRes> {
    const payload =
      typeof body === 'string' ? body : JSON.stringify(body);
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
    let parsed: unknown;
    try {
      parsed = text.length > 0 ? JSON.parse(text) : {};
    } catch {
      parsed = text;
    }

    if (statusCode >= 400) {
      throw new ApiError(statusCode, parsed);
    }

    return parsed as T;
  }
}
