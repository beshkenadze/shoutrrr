/**
 * @shoutrrr/core — canonical shared core for the shoutrrr Node.js port.
 *
 * The service registry starts EMPTY; services self-register via
 * `registerService` during the integration pass.
 */
export type {
  Params,
  EnumFormatter,
  ConfigProp,
  Logger,
  ServiceConfig,
  Service,
} from './types.ts';
export { MessageLevel } from './types.ts';

export { createEnumFormatter, EnumInvalid } from './enumFormatter.ts';

export type { URLPart, FieldType, FieldSchema } from './format.ts';
export {
  setConfigField,
  getConfigFieldString,
  parseBool,
  printBool,
} from './format.ts';

export { PropKeyResolver, KEY_PREFIX } from './propKeyResolver.ts';

export { JsonClient, ApiError } from './jsonclient.ts';

export { Standard, EnumlessConfig } from './standard.ts';

export type { ServiceFactory } from './router.ts';
export {
  ServiceRouter,
  registerService,
  getServiceFactory,
  extractScheme,
} from './router.ts';

export { send, createSender, newSender, setLogger } from './shoutrrr.ts';
