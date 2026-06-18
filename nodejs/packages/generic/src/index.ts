import { GenericService } from './generic.ts';

export { GenericService, createSendParams } from './generic.ts';
export {
  Config,
  configFromWebhookURL,
  configSchema,
  defaultConfig,
  DefaultWebhookScheme,
  Scheme,
} from './config.ts';
export {
  appendCustomQueryValues,
  normalizedHeaderKey,
  stripCustomQueryValues,
} from './customQuery.ts';
export { jsonPayload } from './payload.ts';
export { Templater } from './templater.ts';
export type { Logger, Params, Service } from '@shoutrrr/core';

/** Descriptor used by the service registry to construct a GenericService for the `generic` scheme. */
export const descriptor = {
  schemes: ['generic'] as const,
  factory: (): GenericService => new GenericService(),
};
