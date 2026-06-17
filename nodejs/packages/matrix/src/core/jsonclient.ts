import type { Dispatcher } from 'undici';
import { request } from 'undici';

// ApiError — thrown on non-2xx responses, carrying the parsed body when available.
export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown) {
    let msg = `got HTTP ${status}`;
    if (body && typeof body === 'object') {
      const errField = (body as Record<string, unknown>).error;
      if (typeof errField === 'string' && errField !== '') {
        msg = errField;
      }
    }
    super(msg);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export interface JsonClientOptions {
  dispatcher?: Dispatcher;
}

// JsonClient — faithful port of Go pkg/util/jsonclient.
// JSON in/out, optional Authorization bearer header, injectable dispatcher (for MockAgent).
export class JsonClient {
  headers: Record<string, string> = {};
  private readonly dispatcher: Dispatcher | undefined;

  constructor(opts: JsonClientOptions = {}) {
    this.dispatcher = opts.dispatcher;
  }

  async get<T>(url: string): Promise<T> {
    return this.do<T>('GET', url, undefined);
  }

  async post<TRes>(url: string, body: unknown): Promise<TRes> {
    return this.do<TRes>('POST', url, body);
  }

  async put<TRes>(url: string, body: unknown): Promise<TRes> {
    return this.do<TRes>('PUT', url, body);
  }

  private async do<T>(
    method: 'GET' | 'POST' | 'PUT',
    url: string,
    body: unknown,
  ): Promise<T> {
    const headers: Record<string, string> = { ...this.headers };
    const hasBody = body !== undefined && body !== null;
    if (hasBody) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await request(url, {
      method,
      headers,
      ...(hasBody ? { body: JSON.stringify(body) } : {}),
      ...(this.dispatcher ? { dispatcher: this.dispatcher } : {}),
    });

    const text = await res.body.text();
    let parsed: unknown;
    if (text !== '') {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = undefined;
      }
    }

    if (res.statusCode >= 400) {
      throw new ApiError(res.statusCode, parsed);
    }

    return parsed as T;
  }
}
