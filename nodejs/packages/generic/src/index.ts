import { GenericService } from './generic.js';

export { GenericService, createSendParams } from './generic.js';
export {
  Config,
  configFromWebhookURL,
  configSchema,
  defaultConfig,
  DefaultWebhookScheme,
  Scheme,
} from './config.js';
export {
  appendCustomQueryValues,
  normalizedHeaderKey,
  stripCustomQueryValues,
} from './customQuery.js';
export { jsonPayload } from './payload.js';
export { Templater } from './templater.js';
export type { Logger, Params, Service } from './core/index.js';

/** Descriptor used by the service registry to construct a GenericService for the `generic` scheme. */
export const descriptor = {
  schemes: ['generic'] as const,
  factory: (): GenericService => new GenericService(),
};
