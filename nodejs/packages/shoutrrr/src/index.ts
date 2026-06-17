/**
 * @shoutrrr/shoutrrr — the umbrella package.
 *
 * Importing this module registers all 20 notification services into the shared
 * `@shoutrrr/core` router (side effect of `./register.ts`) and re-exports the
 * public API. This is the package end users install.
 *
 *   import { send } from '@shoutrrr/shoutrrr';
 *   await send('slack://token-a/token-b/token-c@channel', 'Hello');
 */

import './register.ts';

export { registerAll } from './register.ts';

export {
  send,
  createSender,
  newSender,
  setLogger,
  ServiceRouter,
  registerService,
  getServiceFactory,
  extractScheme,
} from '@shoutrrr/core';

export type {
  Params,
  Logger,
  Service,
  ServiceConfig,
  ServiceFactory,
  EnumFormatter,
} from '@shoutrrr/core';
