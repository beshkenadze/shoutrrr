export { PushoverService } from './pushover.js';
export { Config, Scheme, UserMissing, TokenMissing, fieldSchema } from './config.js';
export * from '@shoutrrr/core';

import { PushoverService } from './pushover.js';

/** descriptor registers this service's schemes and factory. */
export const descriptor = {
  schemes: ['pushover'],
  factory: (): PushoverService => new PushoverService(),
};
