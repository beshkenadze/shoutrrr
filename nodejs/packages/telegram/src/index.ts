// Public entry point for @shoutrrr/telegram
export { TelegramService } from './telegram.js';
export { Config, Scheme, isTokenValid, fields } from './config.js';
export { ParseMode, parseModeEnum, parseModeString } from './parseMode.js';
export { Client, getResponseError } from './client.js';
export { createSendMessagePayload } from './payload.js';
export type {
  SendMessagePayload,
  Message,
  MessageResponse,
  ErrorResponse,
  User,
  Chat,
} from './payload.js';

import { TelegramService } from './telegram.js';

/** Service descriptor for registration with the core router. */
export const descriptor = {
  schemes: ['telegram'] as const,
  factory: (): TelegramService => new TelegramService(),
};
