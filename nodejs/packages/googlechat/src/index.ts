import { GoogleChatService } from './googlechat.js';
import type { Service } from './core/types.js';

export { GoogleChatService } from './googlechat.js';
export { GoogleChatConfig, Scheme } from './config.js';
export type { Service, Params, Logger } from './core/types.js';

export interface ServiceDescriptor {
  schemes: string[];
  factory: () => Service;
}

export const descriptor: ServiceDescriptor = {
  schemes: ['googlechat', 'hangouts'],
  factory: (): Service => new GoogleChatService(),
};
