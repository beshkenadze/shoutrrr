import type { ServiceDescriptor } from './core/index.js';
import { TeamsService } from './teams.js';

export { TeamsService } from './teams.js';
export type { TeamsServiceOptions } from './teams.js';
export {
  Config,
  Scheme,
  LegacyHost,
  LegacyPath,
  Path,
  ProviderName,
  buildWebhookURL,
  parseAndVerifyWebhookURL,
  verifyWebhookParts,
  configFromWebhookURL,
} from './config.js';
export type { WebhookParts } from './config.js';
export { buildPayload } from './payload.js';
export type { MessageCard, Section, Fact } from './payload.js';

/** Registry descriptor for the teams service. */
export const descriptor: ServiceDescriptor = {
  schemes: ['teams'],
  factory: () => new TeamsService(),
};
