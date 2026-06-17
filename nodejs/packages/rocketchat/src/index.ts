import { RocketchatService } from './rocketchat.js';

export { RocketchatService, buildURL } from './rocketchat.js';
export { Config, createConfigFromURL, Scheme, NotEnoughArguments } from './config.js';
export { createJSONPayload } from './payload.js';
export type { RocketchatPayload } from './payload.js';

export const descriptor = {
  schemes: ['rocketchat'] as const,
  factory: (): RocketchatService => new RocketchatService(),
};
