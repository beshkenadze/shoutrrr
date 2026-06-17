import {
  type FieldSchema,
  type PropFactory,
  encodeQuery,
} from "./core/format.js";
import { PropKeyResolver } from "./core/propKeyResolver.js";
import type { EnumFormatter, ServiceConfig } from "./core/types.js";
import { Entity } from "./payload.js";

export const Scheme = "opsgenie";
export const defaultPort = 443;
export const defaultHost = "api.opsgenie.com";

/**
 * Field schema for the OpsGenie config query parameters, ported from the Go
 * struct tags in opsgenie_config.go. Host/Port/APIKey are URL parts handled
 * directly in setURL/getURL and are intentionally excluded here.
 */
const FIELDS: FieldSchema[] = [
  { name: "alias", type: "string", key: ["alias"], desc: "Client-defined identifier of the alert" },
  { name: "description", type: "string", key: ["description"], desc: "Description field of the alert" },
  { name: "responders", type: "prop[]", key: ["responders"], desc: "Teams, users, escalations and schedules that the alert will be routed to send notifications" },
  { name: "visibleTo", type: "prop[]", key: ["visibleTo"], desc: "Teams and users that the alert will become visible to without sending any notification" },
  { name: "actions", type: "string[]", key: ["actions"], desc: "Custom actions that will be available for the alert" },
  { name: "tags", type: "string[]", key: ["tags"], desc: "Tags of the alert" },
  { name: "details", type: "map", key: ["details"], desc: "Map of key-value pairs to use as custom properties of the alert" },
  { name: "entity", type: "string", key: ["entity"], desc: "Entity field of the alert" },
  { name: "source", type: "string", key: ["source"], desc: "Source field of the alert" },
  { name: "priority", type: "string", key: ["priority"], desc: "Priority level of the alert. Possible values are P1, P2, P3, P4 and P5" },
  { name: "note", type: "string", key: ["note"], desc: "Additional note that will be added while creating the alert" },
  { name: "user", type: "string", key: ["user"], desc: "Display name of the request owner" },
  { name: "title", type: "string", key: ["title"], default: "", desc: "notification title, optionally set by the sender" },
];

const PROP_FACTORIES: Record<string, PropFactory> = {
  responders: () => new Entity(),
  visibleTo: () => new Entity(),
};

/** Config for the OpsGenie service. Port of opsgenie_config.go Config. */
export class Config implements ServiceConfig {
  // URL parts
  apiKey = "";
  host = defaultHost;
  port = 0;

  // Query-backed fields
  alias = "";
  description = "";
  responders: Entity[] = [];
  visibleTo: Entity[] = [];
  actions: string[] = [];
  tags: string[] = [];
  details: Record<string, string> = {};
  entity = "";
  source = "";
  priority = "";
  note = "";
  user = "";
  title = "";

  enums(): Record<string, EnumFormatter> {
    return {};
  }

  /** Creates a fresh PropKeyResolver bound to this config and the field schema. */
  newResolver(): PropKeyResolver {
    return new PropKeyResolver(this, FIELDS, PROP_FACTORIES);
  }

  /** getURL builds the configuration URL representation. */
  getURL(): URL {
    const host = this.port > 0 ? `${this.host}:${this.port}` : this.host;
    const query = this.newResolver().buildQuery();
    const encoded = encodeQuery(query);
    const url = new URL(`${Scheme}://${host}/${this.apiKey}`);
    // Assign the raw, Go-compatible query string directly (URLSearchParams would
    // re-encode using %20 instead of '+').
    url.search = encoded ? `?${encoded}` : "";
    return url;
  }

  /** setURL populates the config from a URL representation. */
  setURL(url: URL): void {
    this.host = url.hostname;
    this.apiKey = decodeURIComponent(url.pathname.slice(1));

    if (url.port !== "") {
      const port = Number.parseInt(url.port, 10);
      if (Number.isNaN(port)) {
        throw new Error(`invalid port: ${url.port}`);
      }
      this.port = port;
    } else {
      this.port = defaultPort;
    }

    const resolver = this.newResolver();
    for (const [key, value] of url.searchParams.entries()) {
      resolver.set(key, value);
    }
  }
}
