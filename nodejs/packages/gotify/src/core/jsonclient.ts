// Faithful port of Go pkg/util/jsonclient, built on undici with an injectable dispatcher.
import { request, type Dispatcher } from 'undici';

/** ContentType is the default mime type for JSON. */
export const CONTENT_TYPE = 'application/json';

/** Standard HTTP reason phrases, mirroring Go's net/http StatusText for the message format. */
const STATUS_TEXT: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  409: 'Conflict',
  413: 'Request Entity Too Large',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
};

function httpStatus(statusCode: number): string {
  const text = STATUS_TEXT[statusCode];
  return text ? `${statusCode} ${text}` : String(statusCode);
}

/** ApiError carries the HTTP status code and the parsed (or raw) response body. */
export class ApiError extends Error {
  constructor(
    readonly statusCode: number,
    readonly body: unknown,
  ) {
    // Mirrors Go jsonclient: fmt.Errorf("got HTTP %v", res.Status)
    super(`got HTTP ${httpStatus(statusCode)}`);
    this.name = 'ApiError';
  }
}

export interface JsonClientOptions {
  dispatcher?: Dispatcher;
}

/** JsonClient is a JSON wrapper around undici request. */
export class JsonClient {
  readonly headers: Record<string, string> = { 'Content-Type': CONTENT_TYPE };
  private readonly dispatcher?: Dispatcher;

  constructor(opts?: JsonClientOptions) {
    this.dispatcher = opts?.dispatcher;
  }

  /** get fetches url using GET and parses the JSON response. */
  async get<T>(url: string): Promise<T> {
    const res = await request(url, {
      method: 'GET',
      headers: this.headers,
      ...(this.dispatcher ? { dispatcher: this.dispatcher } : {}),
    });
    return this.parse<T>(res.statusCode, res.body);
  }

  /** post sends body as JSON and parses the JSON response. */
  async post<TRes>(url: string, body: unknown): Promise<TRes> {
    const res = await request(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
      ...(this.dispatcher ? { dispatcher: this.dispatcher } : {}),
    });
    return this.parse<TRes>(res.statusCode, res.body);
  }

  private async parse<T>(
    statusCode: number,
    body: Dispatcher.ResponseData['body'],
  ): Promise<T> {
    const text = await body.text();

    // Mirror Go parseResponse: a >=400 status is an error; the body is still
    // parsed (best effort) so callers can inspect a structured error response.
    if (statusCode >= 400) {
      throw new ApiError(statusCode, tryParseJSON(text));
    }

    // For success responses Go always json.Unmarshal-s the body and surfaces any
    // failure (including empty/non-JSON bodies) as an error.
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new ApiError(statusCode, text.length > 0 ? text : undefined);
    }
  }
}

/** tryParseJSON returns the parsed JSON object/value, or the raw text on failure. */
function tryParseJSON(text: string): unknown {
  if (text.length === 0) {
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
