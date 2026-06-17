import { type Dispatcher, request } from "undici";

/** ApiError is thrown for non-2xx JSON responses. */
export class ApiError extends Error {
  readonly statusCode: number;
  readonly body: unknown;

  constructor(statusCode: number, body: unknown) {
    super(`got HTTP ${statusCode}`);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.body = body;
  }
}

/**
 * JsonClient is a thin JSON-over-HTTP client, porting Go util/jsonclient.
 * The dispatcher is injectable so tests can supply an undici MockAgent.
 * post() tolerates empty success bodies (Discord webhooks reply 204 No Content).
 */
export class JsonClient {
  headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  private readonly dispatcher?: Dispatcher;

  constructor(opts?: { dispatcher?: Dispatcher }) {
    this.dispatcher = opts?.dispatcher;
  }

  async get<T>(url: string): Promise<T> {
    const res = await this.dispatch(url, { method: "GET" });
    return this.handle<T>(res);
  }

  async post<TRes>(url: string, body: unknown): Promise<TRes> {
    return this.postRaw<TRes>(url, JSON.stringify(body));
  }

  /** postRaw posts an already-serialized body verbatim (no JSON.stringify). */
  async postRaw<TRes>(url: string, body: string): Promise<TRes> {
    const res = await this.dispatch(url, { method: "POST", body });
    return this.handle<TRes>(res);
  }

  /**
   * dispatch issues the HTTP request. When a dispatcher is injected its own
   * request() method is used directly (so an undici MockAgent intercepts the
   * call); otherwise the top-level undici request() is used.
   */
  private dispatch(
    url: string,
    opts: { method: "GET" | "POST"; body?: string },
  ): Promise<{ statusCode: number; body: { text(): Promise<string> } }> {
    if (this.dispatcher) {
      const { origin, path } = splitUrl(url);
      return this.dispatcher.request({
        origin,
        path,
        method: opts.method,
        headers: this.headers,
        body: opts.body,
      });
    }
    return request(url, {
      method: opts.method,
      headers: this.headers,
      body: opts.body,
    });
  }

  private async handle<T>(res: {
    statusCode: number;
    body: { text(): Promise<string> };
  }): Promise<T> {
    const text = await res.body.text();
    const parsed = text.length > 0 ? safeParse(text) : undefined;

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

/** splitUrl splits an absolute URL into the origin and path+query expected by Dispatcher.request. */
function splitUrl(url: string): { origin: string; path: string } {
  const parsed = new URL(url);
  return { origin: parsed.origin, path: `${parsed.pathname}${parsed.search}` };
}
