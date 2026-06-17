// Bun-compatible undici accessor.
//
// Bun ships a partial built-in `undici` shim that lacks a working MockAgent and
// whose top-level `request` differs from the installed package. Importing the
// real package entry (`undici/index.js`) crashes under Bun because it eagerly
// loads the web cache module. We therefore import the low-level submodules that
// DO load cleanly under Bun and reconstruct the public `request` wrapper exactly
// as undici's index.js does (see makeDispatcher in node_modules/undici/index.js).
import type { Dispatcher } from 'undici';
// @ts-expect-error - no type declarations for the deep submodule path.
import apiRequest from 'undici/lib/api/api-request.js';
// @ts-expect-error - no type declarations for the deep submodule path.
import { getGlobalDispatcher } from 'undici/lib/global.js';

export type { Dispatcher } from 'undici';

export interface RequestOptions {
  method: string;
  headers?: Record<string, string>;
  body?: string;
  dispatcher?: Dispatcher;
}

export interface ResponseData {
  statusCode: number;
  body: { text(): Promise<string> };
}

type ApiRequestFn = (
  this: Dispatcher | undefined,
  opts: Record<string, unknown>,
) => Promise<ResponseData>;

const lowLevelRequest = apiRequest as unknown as ApiRequestFn;
const resolveGlobalDispatcher = getGlobalDispatcher as () => Dispatcher;

/**
 * Mirrors undici's top-level `request(url, opts)`:
 * resolves the URL, strips the dispatcher from opts, and dispatches through it
 * (or the global dispatcher when none is provided — matching undici's
 * makeDispatcher in node_modules/undici/index.js).
 */
export function request(url: string, opts: RequestOptions): Promise<ResponseData> {
  const parsed = new URL(url);
  const { dispatcher = resolveGlobalDispatcher(), ...restOpts } = opts;
  return lowLevelRequest.call(dispatcher, {
    ...restOpts,
    origin: parsed.origin,
    path: parsed.search ? `${parsed.pathname}${parsed.search}` : parsed.pathname,
    method: restOpts.method || (restOpts.body ? 'PUT' : 'GET'),
  });
}
