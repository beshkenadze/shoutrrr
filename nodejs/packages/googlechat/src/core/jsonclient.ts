// Faithful port of Go pkg/util/jsonclient.
import { request, type Dispatcher } from './undici.js';

export class ApiError extends Error {
  readonly statusCode: number;
  readonly body: unknown;

  constructor(statusCode: number, body: unknown) {
    super(`API responded with HTTP ${statusCode}`);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.body = body;
  }
}

export interface JsonClientOptions {
  dispatcher?: Dispatcher;
}

export class JsonClient {
  readonly headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  private readonly dispatcher?: Dispatcher;

  constructor(opts: JsonClientOptions = {}) {
    this.dispatcher = opts.dispatcher;
  }

  async get<TRes>(url: string): Promise<TRes> {
    const res = await request(url, {
      method: 'GET',
      headers: this.headers,
      ...(this.dispatcher ? { dispatcher: this.dispatcher } : {}),
    });
    return this.handleResponse<TRes>(res);
  }

  async post<TRes>(url: string, body: unknown): Promise<TRes> {
    const res = await request(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
      ...(this.dispatcher ? { dispatcher: this.dispatcher } : {}),
    });
    return this.handleResponse<TRes>(res);
  }

  private async handleResponse<TRes>(res: {
    statusCode: number;
    body: { text(): Promise<string> };
  }): Promise<TRes> {
    const raw = await res.body.text();
    const parsed = raw.length > 0 ? this.tryParse(raw) : undefined;

    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw new ApiError(res.statusCode, parsed ?? raw);
    }

    return parsed as TRes;
  }

  private tryParse(raw: string): unknown {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
}
