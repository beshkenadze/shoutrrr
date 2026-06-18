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

import "./register.ts";

export type {
  EnumFormatter,
  Logger,
  Params,
  Service,
  ServiceConfig,
  ServiceFactory,
} from "@shoutrrr/core";

export {
  createSender,
  extractScheme,
  getServiceFactory,
  newSender,
  registerService,
  ServiceRouter,
  send,
  setLogger,
} from "@shoutrrr/core";
export { registerAll } from "./register.ts";
