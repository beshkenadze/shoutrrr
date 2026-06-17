// Vendored core kit — faithful port of Go pkg/util/jsonclient.

import { type Dispatcher, request } from 'undici';

/** ApiError carries the HTTP status and the parsed (or raw) response body. */
export class ApiError extends Error {
  readonly statusCode: number;
  readonly body: unknown;

  constructor(statusCode: number, body: unknown) {
    super(`API error (HTTP ${statusCode})`);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.body = body;
  }
}

export interface JsonClientOptions {
  dispatcher?: Dispatcher;
}

/** JsonClient is a thin JSON wrapper around undici, mirroring Go jsonclient.Client. */
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
    return this.parse<T>(res);
  }

  async post<TRes>(url: string, body: unknown): Promise<TRes> {
    const res = await request(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
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
      parsed = text.length > 0 ? JSON.parse(text) : undefined;
    } catch {
      parsed = text;
    }

    if (res.statusCode >= 400) {
      throw new ApiError(res.statusCode, parsed);
    }

    return parsed as T;
  }
}
