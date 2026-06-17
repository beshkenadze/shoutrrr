/**
 * Vendored core barrel.
 *
 * Importing this module registers the built-in `logger://` service. The full
 * service registry (all 20 services) is wired in the integration pass, where
 * each service self-registers via its descriptor.
 */

import { registerService } from "./router.js";
import { LoggerService, SCHEME as LOGGER_SCHEME } from "./services/logger.js";

// Self-register the built-in logger service.
registerService(LOGGER_SCHEME, () => new LoggerService());

export * from "./types.js";
export * from "./router.js";
export * from "./format.js";
export * as shoutrrr from "./shoutrrr.js";
export { LoggerService, SCHEME as LoggerScheme } from "./services/logger.js";
