// @shoutrrr/pushbullet — public entry point.

import { PushbulletService } from './pushbullet.js';

export { PushbulletService } from './pushbullet.js';
export { Config, SCHEME, DEFAULT_TITLE } from './config.js';
export {
  type PushRequest,
  type PushResponse,
  type ErrorResponse,
  newNotePush,
  setTarget,
} from './payload.js';

export const descriptor = {
  schemes: ['pushbullet'] as const,
  factory: (): PushbulletService => new PushbulletService(),
};
