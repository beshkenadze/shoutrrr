import { MatrixService } from './matrix.js';
import type { Service } from '@shoutrrr/core';

export { MatrixService } from './matrix.js';
export { Config, Scheme } from './config.js';
export { MatrixClient } from './client.js';
export type { Params, Logger, Service, ServiceConfig } from '@shoutrrr/core';

// ServiceDescriptor is matrix-local (core has no equivalent): a scheme list
// plus a factory that produces the service.
export interface ServiceDescriptor {
  schemes: string[];
  factory: () => Service;
}

export const descriptor: ServiceDescriptor = {
  schemes: ['matrix'],
  factory: () => new MatrixService(),
};
