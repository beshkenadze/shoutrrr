import { BarkService } from './bark.js';

export { BarkService } from './bark.js';
export { Config, Scheme } from './config.js';
export type { PushPayload, ApiResponse } from './payload.js';

export const descriptor = {
  schemes: ['bark'],
  factory: (): BarkService => new BarkService(),
};
