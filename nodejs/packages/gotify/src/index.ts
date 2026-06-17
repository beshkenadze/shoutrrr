export { GotifyService, buildURL, isTokenValid } from './gotify.js';
export type { GotifyServiceOptions } from './gotify.js';
export { Config, SCHEME } from './config.js';
export type {
  MessageRequest,
  MessageResponse,
  ErrorResponse,
} from './payload.js';

import { GotifyService } from './gotify.js';

/** descriptor registers this service's URL schemes with a factory. */
export const descriptor = {
  schemes: ['gotify'] as const,
  factory: (): GotifyService => new GotifyService(),
};
