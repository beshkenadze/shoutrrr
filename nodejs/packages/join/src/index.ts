// Public entrypoint for @shoutrrr/join.

import { JoinService } from './join.js';

export { JoinService } from './join.js';
export { Config, Scheme, APIKeyMissing, DevicesMissing } from './config.js';
export type { JoinServiceOptions } from './join.js';

/** descriptor registers the join scheme with a factory for the service. */
export const descriptor = {
  schemes: ['join'],
  factory: (): JoinService => new JoinService(),
};
