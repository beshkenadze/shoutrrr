export { Config, Scheme } from './config.js';
export { LoggerService } from './logger.js';
export type {
  EnumFormatter,
  Logger,
  Params,
  Service,
  ServiceConfig,
} from '@shoutrrr/core';

import { Scheme } from './config.js';
import { LoggerService } from './logger.js';

export const descriptor = {
  schemes: [Scheme] as const,
  factory: (): LoggerService => new LoggerService(),
};
