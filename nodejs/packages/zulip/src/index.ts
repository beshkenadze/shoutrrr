import { ZulipService } from './zulip.ts';

export { Config, Scheme, ErrorMessage, createConfigFromURL } from './config.ts';
export { ZulipService } from './zulip.ts';
export type { ZulipServiceOptions } from './zulip.ts';
export type { Service, Params, Logger } from '@shoutrrr/core';

/** Service descriptor for registration with the shoutrrr router. */
export const descriptor = {
  schemes: ['zulip'] as const,
  factory: (): ZulipService => new ZulipService(),
};
