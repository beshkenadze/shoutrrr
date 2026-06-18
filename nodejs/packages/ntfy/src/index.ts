// Public entry point for @shoutrrr/ntfy.
export { Config, Scheme, fieldSchema } from './config.js';
export { NtfyService, type NtfyServiceOptions } from './ntfy.js';
export { Priority, priorityEnum, type PriorityValue } from './priority.js';
export { type ApiResponse, formatApiError } from './payload.js';
export type { Service, ServiceConfig, Params, Logger } from '@shoutrrr/core';

import { NtfyService } from './ntfy.js';

/** descriptor registers this service's schemes and factory. */
export const descriptor = {
  schemes: ['ntfy'] as const,
  factory: (): NtfyService => new NtfyService(),
};
