import { GoogleChatService } from './googlechat.ts';
import type { Service } from '@shoutrrr/core';

export { GoogleChatService } from './googlechat.ts';
export { GoogleChatConfig, Scheme } from './config.ts';
export type { Service, Params, Logger } from '@shoutrrr/core';

export interface ServiceDescriptor {
  schemes: string[];
  factory: () => Service;
}

export const descriptor: ServiceDescriptor = {
  schemes: ['googlechat', 'hangouts'],
  factory: (): Service => new GoogleChatService(),
};
