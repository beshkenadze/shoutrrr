import { type Dispatcher, request } from "undici";

/**
 * ApiError carries the HTTP status and parsed body for a non-2xx JSON response,
 * ported from Go pkg/util/jsonclient.Error.
 */
export class ApiError extends Error {
  readonly statusCode: number;
  readonly body: unknown;

  constructor(statusCode: number, body: unknown) {
    super(`unknown error (HTTP ${statusCode})`);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.body = body;
  }
}

/**
 * JsonClient is a small JSON-over-HTTP client, ported from Go
 * pkg/util/jsonclient. The dispatcher is injectable so tests can route requests
 * through an undici MockAgent.
 */
export class JsonClient {
  headers: Record<string, string> = { "Content-Type": "application/json" };
  private readonly dispatcher: Dispatcher | undefined;

  constructor(opts?: { dispatcher?: Dispatcher }) {
    this.dispatcher = opts?.dispatcher;
  }

  async get<T>(url: string): Promise<T> {
    const res = await request(url, {
      method: "GET",
      headers: this.headers,
      ...(this.dispatcher ? { dispatcher: this.dispatcher } : {}),
    });
    return this.handle<T>(res);
  }

  async post<TRes>(url: string, body: unknown): Promise<TRes> {
    const res = await request(url, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
      ...(this.dispatcher ? { dispatcher: this.dispatcher } : {}),
    });
    return this.handle<TRes>(res);
  }

  private async handle<T>(res: {
    statusCode: number;
    body: { text(): Promise<string> };
  }): Promise<T> {
    const text = await res.body.text();
    const parsed = text === "" ? undefined : safeParse(text);
    if (res.statusCode < 200 || res.statusCode > 299) {
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
