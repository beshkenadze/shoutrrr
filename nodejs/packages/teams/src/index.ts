import type { Service } from '@shoutrrr/core';
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

/** Describes a service's URL schemes and how to construct it (Go: registry entry). */
export interface ServiceDescriptor {
  schemes: string[];
  factory: () => Service;
}

/** Registry descriptor for the teams service. */
export const descriptor: ServiceDescriptor = {
  schemes: ['teams'],
  factory: () => new TeamsService(),
};
