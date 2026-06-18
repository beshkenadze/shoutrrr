import { MattermostService } from './mattermost.js';
import type { Service } from '@shoutrrr/core';

export { MattermostService, buildURL } from './mattermost.js';
export type { MattermostServiceOptions, Transport } from './mattermost.js';
export {
  MattermostConfig,
  createConfigFromURL,
  SCHEME,
  NOT_ENOUGH_ARGUMENTS,
} from './config.js';
export {
  createJSONPayload,
  serializePayload,
  setIcon,
  type MattermostJSON,
} from './payload.js';
export type { Service, Params, Logger } from '@shoutrrr/core';

/** Service descriptor for scheme-based registration. */
export const descriptor: {
  schemes: string[];
  factory: () => Service;
} = {
  schemes: ['mattermost'],
  factory: (): Service => new MattermostService(),
};
