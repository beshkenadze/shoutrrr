import type { Dispatcher } from 'undici';
import { request } from 'undici';

/** ApiError is thrown for non-2xx responses, carrying the status and parsed body. */
export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown) {
    super(`got HTTP ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

/** FormResponse is the raw result of a form POST (no success/failure check applied). */
export interface FormResponse {
  statusCode: number;
  /** Go-style status line, e.g. "200 OK" / "500 Internal Server Error". */
  status: string;
  body: string;
}

/** Common HTTP reason phrases, mirroring Go's http.StatusText. */
const reasonPhrases: Record<number, string> = {
  200: 'OK',
  201: 'Created',
  202: 'Accepted',
  204: 'No Content',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
};

/** formatStatusLine builds Go's res.Status string ("<code> <reason>"). */
function formatStatusLine(code: number): string {
  const reason = reasonPhrases[code];
  return reason ? `${code} ${reason}` : `${code}`;
}

/**
 * JsonClient is a minimal JSON HTTP client. A `dispatcher` may be injected so
 * tests can route requests through an undici MockAgent. Faithful port of Go
 * util/jsonclient with an added form-encoded POST helper for services (such as
 * Pushover) that post application/x-www-form-urlencoded bodies.
 */
export class JsonClient {
  headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  private readonly dispatcher?: Dispatcher;

  constructor(opts?: { dispatcher?: Dispatcher }) {
    this.dispatcher = opts?.dispatcher;
  }

  async get<T>(url: string): Promise<T> {
    const res = await request(url, {
      method: 'GET',
      headers: this.headers,
      dispatcher: this.dispatcher,
    });
    const text = await res.body.text();
    return this.handleResponse<T>(res.statusCode, text);
  }

  async post<TRes>(url: string, body: unknown): Promise<TRes> {
    const res = await request(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
      dispatcher: this.dispatcher,
    });
    const text = await res.body.text();
    return this.handleResponse<TRes>(res.statusCode, text);
  }

  /**
   * postForm sends an application/x-www-form-urlencoded request and returns the
   * raw response (status code, Go-style status line, and body text) WITHOUT
   * throwing. Callers apply their own success check, mirroring how each Go
   * service decides its acceptable status (e.g. Pushover accepts only 200).
   */
  async postForm(url: string, data: URLSearchParams): Promise<FormResponse> {
    const res = await request(url, {
      method: 'POST',
      headers: {
        ...this.headers,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: data.toString(),
      dispatcher: this.dispatcher,
    });
    const text = await res.body.text();
    return {
      statusCode: res.statusCode,
      status: formatStatusLine(res.statusCode),
      body: text,
    };
  }

  private handleResponse<T>(status: number, text: string): T {
    const parsed = this.tryParse(text);
    if (status < 200 || status >= 300) {
      throw new ApiError(status, parsed);
    }
    return parsed as T;
  }

  private tryParse(text: string): unknown {
    if (text === '') {
      return null;
    }
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
}
