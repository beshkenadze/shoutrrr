import { ZulipService } from './zulip.js';

export { Config, Scheme, ErrorMessage, createConfigFromURL } from './config.js';
export { ZulipService } from './zulip.js';
export type { ZulipServiceOptions } from './zulip.js';
export type { Service, Params, Logger } from './core/types.js';

/** Service descriptor for registration with the shoutrrr router. */
export const descriptor = {
  schemes: ['zulip'] as const,
  factory: (): ZulipService => new ZulipService(),
};
