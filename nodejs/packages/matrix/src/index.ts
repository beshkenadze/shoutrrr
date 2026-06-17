import { MatrixService } from './matrix.js';
import type { ServiceDescriptor } from './core/types.js';

export { MatrixService } from './matrix.js';
export { Config, Scheme } from './config.js';
export { MatrixClient } from './client.js';
export type {
  Params,
  Logger,
  Service,
  ServiceConfig,
  ServiceDescriptor,
} from './core/types.js';

export const descriptor: ServiceDescriptor = {
  schemes: ['matrix'],
  factory: () => new MatrixService(),
};
