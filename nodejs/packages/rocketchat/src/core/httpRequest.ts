import type { Dispatcher } from 'undici';
// Import the functional implementations from undici's internals. Bun shims the
// bare `undici` specifier with a native client whose `request` ignores the
// injected `dispatcher` (so MockAgent interception is bypassed) and whose
// MockAgent is a non-functional stub. The deep imports below resolve to the
// real undici implementation, which honours a dispatcher and works under Bun.
// @ts-expect-error -- no type declarations for the internal module path
import { request as apiRequest } from 'undici/lib/api/index.js';
// @ts-expect-error -- no type declarations for the internal module path
import { getGlobalDispatcher } from 'undici/lib/global.js';

export interface HttpResponse {
  statusCode: number;
  body: {
    text(): Promise<string>;
    dump(): Promise<void>;
  };
}

export interface HttpRequestOptions {
  method: string;
  headers?: Record<string, string>;
  body?: string;
  dispatcher?: Dispatcher;
}

// request performs an HTTP request through undici, routing it via the injected
// dispatcher when provided (e.g. a MockAgent in tests) or the global dispatcher
// otherwise. The url is split into origin + path because the internal undici
// request entrypoint is the dispatcher-bound `(opts)` form.
export function request(url: string, opts: HttpRequestOptions): Promise<HttpResponse> {
  const parsed = new URL(url);
  const dispatcher = (opts.dispatcher ?? getGlobalDispatcher()) as {
    dispatch: unknown;
  };
  const requestOpts: Record<string, unknown> = {
    origin: parsed.origin,
    path: `${parsed.pathname}${parsed.search}`,
    method: opts.method,
  };
  if (opts.headers) {
    requestOpts.headers = opts.headers;
  }
  if (opts.body !== undefined) {
    requestOpts.body = opts.body;
  }
  return (apiRequest as (this: unknown, o: unknown) => Promise<HttpResponse>).call(
    dispatcher,
    requestOpts,
  );
}
