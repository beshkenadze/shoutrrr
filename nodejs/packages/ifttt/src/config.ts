import type { FieldSchema } from "./core/format.js";
import { PropKeyResolver } from "./core/propKeyResolver.js";
import { EnumlessConfig } from "./core/standard.js";
import type { EnumFormatter, ServiceConfig } from "./core/types.js";

/** Scheme is the identifying part of this service's configuration URL. */
export const Scheme = "ifttt";

/**
 * Field schema for the IFTTT config, ported from the struct tags in
 * ifttt_config.go. WebHookID is taken from the URL host (not a query key).
 */
const fieldSchema: FieldSchema[] = [
  { name: "events", type: "string[]", key: ["events"], required: true },
  { name: "value1", type: "string", key: ["value1"], default: "" },
  { name: "value2", type: "string", key: ["value2"], default: "" },
  { name: "value3", type: "string", key: ["value3"], default: "" },
  {
    name: "useMessageAsValue",
    type: "uint",
    key: ["messagevalue"],
    default: "2",
    desc: "Sets the corresponding value field to the notification message",
  },
  {
    name: "useTitleAsValue",
    type: "uint",
    key: ["titlevalue"],
    default: "0",
    desc: "Sets the corresponding value field to the notification title",
  },
  {
    name: "title",
    type: "string",
    key: ["title"],
    default: "",
    title: true,
    desc: "Notification title, optionally set by the sender",
  },
];

/**
 * Config is the configuration needed to send IFTTT notifications, ported from
 * ifttt_config.go.
 */
export class Config extends EnumlessConfig implements ServiceConfig {
  webHookID = "";
  events: string[] = [];
  value1 = "";
  value2 = "";
  value3 = "";
  useMessageAsValue = 2;
  useTitleAsValue = 0;
  title = "";

  /** schema exposes the field schema for resolver construction. */
  static get schema(): FieldSchema[] {
    return fieldSchema;
  }

  /** newResolver builds a PropKeyResolver bound to this config. */
  newResolver(): PropKeyResolver {
    return new PropKeyResolver(
      this as unknown as Record<string, unknown>,
      fieldSchema,
      this.enums(),
    );
  }

  /** getURL returns a URL representation of the current field values. */
  getURL(): URL {
    return this.getURLWith(this.newResolver());
  }

  /** setURL updates the config from a URL representation of its field values. */
  setURL(url: URL): void {
    this.setURLWith(this.newResolver(), url);
  }

  private getURLWith(resolver: PropKeyResolver): URL {
    const url = new URL(`${Scheme}://${this.webHookID}/`);
    resolver.bindToURL(url);
    return url;
  }

  private setURLWith(resolver: PropKeyResolver, url: URL): void {
    if (this.useMessageAsValue === 0) {
      this.useMessageAsValue = 2;
    }
    this.webHookID = url.hostname;

    resolver.setFromURL(url);

    if (this.useMessageAsValue > 3 || this.useMessageAsValue < 1) {
      throw new Error(
        "invalid value for messagevalue: only values 1-3 are supported",
      );
    }

    if (this.useTitleAsValue > 3) {
      throw new Error(
        "invalid value for titlevalue: only values 1-3 or 0 (for disabling) are supported",
      );
    }

    if (this.useTitleAsValue === this.useMessageAsValue) {
      throw new Error("titlevalue cannot use the same number as messagevalue");
    }

    if (this.events.length < 1) {
      throw new Error("events missing from config URL");
    }

    if (this.webHookID.length < 1) {
      throw new Error("webhook ID missing from config URL");
    }
  }

  override enums(): Record<string, EnumFormatter> {
    return {};
  }
}
