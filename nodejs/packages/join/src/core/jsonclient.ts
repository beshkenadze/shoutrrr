// Faithful port of Go pkg/util/jsonclient.
// dispatcher is injectable so tests can supply an undici MockAgent.

import { request, type Dispatcher } from 'undici';

/** ContentType is the default mime type for JSON. */
export const ContentType = 'application/json';

/** ApiError carries the HTTP status and parsed/raw body of a failed request. */
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

/** JsonClient is a thin JSON wrapper around undici's request. */
export class JsonClient {
  readonly headers: Record<string, string> = {};
  private readonly dispatcher?: Dispatcher;

  constructor(opts: JsonClientOptions = {}) {
    this.dispatcher = opts.dispatcher;
  }

  /** get fetches url and parses the JSON response into T. */
  async get<T>(url: string): Promise<T> {
    const res = await request(url, {
      method: 'GET',
      headers: { ...this.headers },
      ...(this.dispatcher ? { dispatcher: this.dispatcher } : {}),
    });
    return this.parse<T>(res.statusCode, res.body);
  }

  /** post sends body as JSON and parses the JSON response into TRes. */
  async post<TRes>(url: string, body: unknown): Promise<TRes> {
    const payload = typeof body === 'string' ? body : JSON.stringify(body);
    const res = await request(url, {
      method: 'POST',
      headers: { 'content-type': ContentType, ...this.headers },
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
    if (statusCode >= 400) {
      throw new ApiError(statusCode, this.tryParse(text));
    }
    return JSON.parse(text) as T;
  }

  private tryParse(text: string): unknown {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
}
