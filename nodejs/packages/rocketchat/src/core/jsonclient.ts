import type { Dispatcher } from 'undici';
import { request, type HttpResponse } from './httpRequest.js';

// ApiError carries the HTTP status and parsed body of a non-2xx response,
// faithful port of Go pkg/util/jsonclient error semantics.
export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown) {
    super(`api error: ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

// JsonClient performs JSON request/response exchanges over undici, with an
// injectable dispatcher so tests can substitute a MockAgent.
export class JsonClient {
  headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  private readonly dispatcher?: Dispatcher;

  constructor(opts?: { dispatcher?: Dispatcher }) {
    if (opts?.dispatcher) {
      this.dispatcher = opts.dispatcher;
    }
  }

  async get<T>(url: string): Promise<T> {
    const res = await request(url, {
      method: 'GET',
      headers: this.headers,
      ...(this.dispatcher ? { dispatcher: this.dispatcher } : {}),
    });
    return this.handle<T>(res);
  }

  async post<TRes>(url: string, body: unknown): Promise<TRes> {
    const res = await request(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
      ...(this.dispatcher ? { dispatcher: this.dispatcher } : {}),
    });
    return this.handle<TRes>(res);
  }

  private async handle<T>(res: HttpResponse): Promise<T> {
    const text = await res.body.text();
    const parsed = text ? safeParse(text) : undefined;
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw new ApiError(res.statusCode, parsed ?? text);
    }
    return parsed as T;
  }
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
