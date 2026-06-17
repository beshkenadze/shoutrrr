import type { Service } from './core/types.js';
import { SlackService } from './slack.js';

export { SlackService } from './slack.js';
export { Config, createConfigFromURL, Scheme, configSchema } from './config.js';
export { Token, parseToken } from './token.js';
export {
  MessagePayload,
  createJSONPayload,
  type Attachment,
  type Block,
  type BlockText,
  type LegacyField,
  type APIResponse,
} from './payload.js';
export { ErrorInvalidToken, ErrorMismatchedTokenSeparators } from './errors.js';
export type { Params, Logger, Service } from './core/types.js';

export interface ServiceDescriptor {
  schemes: string[];
  factory: () => Service;
}

export const descriptor: ServiceDescriptor = {
  schemes: ['slack'],
  factory: (): Service => new SlackService(),
};
