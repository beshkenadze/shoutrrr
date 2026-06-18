import { OpsgenieService } from "./opsgenie.ts";

export { OpsgenieService } from "./opsgenie.ts";
export { Config, Scheme, defaultHost, defaultPort } from "./config.ts";
export {
  type AlertPayload,
  Entity,
  isOpsGenieID,
  serializeAlertPayload,
} from "./payload.ts";
export type { Service, Params, Logger } from "@shoutrrr/core";

/** Service descriptor for registry-based discovery. */
export const descriptor = {
  schemes: ["opsgenie"] as const,
  factory: (): OpsgenieService => new OpsgenieService(),
};
