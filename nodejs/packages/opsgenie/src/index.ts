import { OpsgenieService } from "./opsgenie.js";

export { OpsgenieService } from "./opsgenie.js";
export { Config, Scheme, defaultHost, defaultPort } from "./config.js";
export {
  type AlertPayload,
  Entity,
  isOpsGenieID,
  serializeAlertPayload,
} from "./payload.js";
export type { Service, Params, Logger } from "./core/types.js";

/** Service descriptor for registry-based discovery. */
export const descriptor = {
  schemes: ["opsgenie"] as const,
  factory: (): OpsgenieService => new OpsgenieService(),
};
