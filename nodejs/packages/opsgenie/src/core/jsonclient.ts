import type { Dispatcher } from "undici";
// Import from the package entry rather than the bare "undici" specifier so the
// real npm undici is used. Bun resolves bare "undici" to a built-in shim whose
// MockAgent is a non-functional stub; routing through the package entry keeps
// request() and any injected MockAgent dispatcher on the same undici instance.
import { request } from "undici/index.js";

/** ApiError is thrown for non-2xx JSON responses. */
export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown) {
    super(`got HTTP ${status} response`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

/**
 * JsonClient is a minimal JSON-over-HTTP client, a faithful port of Go's
 * pkg/util/jsonclient. The undici dispatcher is injectable so tests can supply
 * a MockAgent.
 */
export class JsonClient {
  /** Mutable request headers applied to every call (e.g. Authorization). */
  readonly headers: Record<string, string> = {};

  private readonly dispatcher: Dispatcher | undefined;

  constructor(opts?: { dispatcher?: Dispatcher }) {
    this.dispatcher = opts?.dispatcher;
  }

  async get<T>(url: string): Promise<T> {
    return this.do<T>("GET", url, undefined);
  }

  async post<TRes>(url: string, body: unknown): Promise<TRes> {
    return this.do<TRes>("POST", url, JSON.stringify(body));
  }

  /**
   * postRaw POSTs an already-serialized JSON string. Used when byte-exact field
   * ordering matters and JSON.stringify of an object cannot guarantee it.
   */
  async postRaw<TRes>(url: string, body: string): Promise<TRes> {
    return this.do<TRes>("POST", url, body);
  }

  private async do<T>(
    method: "GET" | "POST",
    url: string,
    body: string | undefined,
  ): Promise<T> {
    const hasBody = body !== undefined;
    const headers: Record<string, string> = { ...this.headers };
    if (hasBody && headers["Content-Type"] === undefined) {
      headers["Content-Type"] = "application/json";
    }

    const res = await request(url, {
      method,
      headers,
      ...(hasBody ? { body } : {}),
      ...(this.dispatcher ? { dispatcher: this.dispatcher } : {}),
    });

    const text = await res.body.text();
    const parsed = parseJson(text);

    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw new ApiError(res.statusCode, parsed);
    }

    return parsed as T;
  }
}

function parseJson(text: string): unknown {
  if (text.length === 0) {
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
