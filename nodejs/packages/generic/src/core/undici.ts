/**
 * Bun-compatible undici loader.
 *
 * Bun ships a built-in `undici` shim whose `MockAgent` is a stub and whose native `request`
 * ignores JS-level dispatchers, while the npm package's `index.js` crashes under Bun (webidl).
 * Importing undici's deep `lib/*` subpaths sidesteps both problems: the genuine `request` and
 * `MockAgent` load and interoperate, so the injectable-dispatcher design works under Bun and Node.
 *
 * This module re-exports a minimal, typed surface: `request` (matching undici's public signature),
 * `MockAgent`, `Agent`, and the global dispatcher accessors.
 */
// @ts-expect-error - deep subpath has no bundled type declarations
import { request as apiRequest } from 'undici/lib/api/index.js';
// @ts-expect-error - deep subpath has no bundled type declarations
import MockAgentImpl from 'undici/lib/mock/mock-agent.js';
// @ts-expect-error - deep subpath has no bundled type declarations
import AgentImpl from 'undici/lib/dispatcher/agent.js';
// @ts-expect-error - deep subpath has no bundled type declarations
import { getGlobalDispatcher } from 'undici/lib/global.js';

import type { Dispatcher, MockAgent as MockAgentType, Agent as AgentType } from 'undici';

export type { Dispatcher };

export interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  dispatcher?: Dispatcher;
}

export interface ResponseData {
  statusCode: number;
  body: { text(): Promise<string> };
}

type ApiRequestFn = (this: Dispatcher, opts: Record<string, unknown>) => Promise<ResponseData>;

/**
 * request mirrors undici's public `request`, dispatching through the provided dispatcher
 * (or the global one). Reimplements the small `makeDispatcher` wrapper from undici's index.js.
 */
export function request(url: string, opts: RequestOptions = {}): Promise<ResponseData> {
  const { dispatcher = getGlobalDispatcher() as Dispatcher, ...rest } = opts;
  const parsed = new URL(url);
  return (apiRequest as ApiRequestFn).call(dispatcher, {
    ...rest,
    origin: parsed.origin,
    path: parsed.search ? `${parsed.pathname}${parsed.search}` : parsed.pathname,
    method: opts.method ?? (opts.body ? 'PUT' : 'GET'),
  });
}

export const MockAgent = MockAgentImpl as unknown as typeof MockAgentType;
export const Agent = AgentImpl as unknown as typeof AgentType;

/** Options passed to a MockInterceptor reply callback, used by tests to assert request shape. */
export interface MockReplyOptions {
  path: string;
  method: string;
  headers?: Record<string, string | string[] | undefined>;
  origin?: string;
  body?: string;
}
