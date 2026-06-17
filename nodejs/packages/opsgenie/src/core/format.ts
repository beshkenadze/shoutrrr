import type { ConfigProp } from "./types.js";

/** URLPart identifies which part of the service URL a field is bound to. */
export type URLPart =
  | "user"
  | "pass"
  | "host"
  | "port"
  | "path"
  | "path1"
  | "path2"
  | "path3"
  | "path4"
  | "query";

/** FieldType describes how a config field is de-/serialized. */
export type FieldType =
  | "string"
  | "int"
  | "uint"
  | "bool"
  | "float"
  | "enum"
  | "string[]"
  | "map"
  | "prop"
  | "prop[]";

/**
 * FieldSchema describes a single config field: how it maps to URL parts and
 * query keys, its type, default value and metadata.
 */
export interface FieldSchema {
  name: string;
  type?: FieldType;
  key?: string[];
  urlParts?: URLPart[];
  default?: unknown;
  required?: boolean;
  base?: number;
  separator?: string;
  enumName?: string;
  title?: string;
  desc?: string;
}

/** Factory for a ConfigProp instance, used to de-/serialize 'prop'/'prop[]' fields. */
export type PropFactory = () => ConfigProp;

/**
 * goQueryEscape mirrors Go's url.QueryEscape: unreserved characters
 * (alphanumerics plus "-_.~") pass through, space becomes "+", and every
 * other byte becomes "%XX" in uppercase hex.
 */
export function goQueryEscape(s: string): string {
  let out = "";
  for (const byte of Buffer.from(s, "utf8")) {
    const ch = String.fromCharCode(byte);
    if (
      (byte >= 0x41 && byte <= 0x5a) ||
      (byte >= 0x61 && byte <= 0x7a) ||
      (byte >= 0x30 && byte <= 0x39) ||
      ch === "-" ||
      ch === "_" ||
      ch === "." ||
      ch === "~"
    ) {
      out += ch;
    } else if (ch === " ") {
      out += "+";
    } else {
      out += `%${byte.toString(16).toUpperCase().padStart(2, "0")}`;
    }
  }
  return out;
}

/**
 * encodeQuery serializes the given key/value pairs the way Go's url.Values.Encode
 * does: keys are sorted lexicographically and both keys and values are escaped
 * with goQueryEscape.
 */
export function encodeQuery(values: Record<string, string>): string {
  const keys = Object.keys(values).sort();
  return keys
    .map((k) => `${goQueryEscape(k)}=${goQueryEscape(values[k] as string)}`)
    .join("&");
}

/** parseBool mirrors Go's accepted truthy/falsy literals. */
export function parseBool(raw: string): boolean | undefined {
  switch (raw.toLowerCase()) {
    case "1":
    case "true":
    case "yes":
      return true;
    case "0":
    case "false":
    case "no":
      return false;
    default:
      return undefined;
  }
}

/**
 * setConfigField deserializes a string input into the typed value for a field,
 * mirroring Go's format.SetConfigField across the field types Opsgenie uses.
 */
export function setConfigField(
  schema: FieldSchema,
  raw: string,
  propFactory?: PropFactory,
): unknown {
  const type = schema.type ?? "string";
  switch (type) {
    case "string":
      return raw;
    case "int":
    case "uint":
      return Number.parseInt(raw, schema.base ?? 10);
    case "float":
      return Number.parseFloat(raw);
    case "bool": {
      const value = parseBool(raw);
      if (value === undefined) {
        throw new Error("accepted values are 1, true, yes or 0, false, no");
      }
      return value;
    }
    case "string[]":
      return raw.split(schema.separator ?? ",");
    case "map": {
      // Mirrors Go's map[string]string parsing: comma-separated key:value pairs,
      // each split on ":" requiring exactly two elements (a colon in the value errors).
      const result: Record<string, string> = {};
      for (const pair of raw.split(schema.separator ?? ",")) {
        const elems = pair.split(":");
        if (elems.length !== 2) {
          throw new Error("invalid field value format");
        }
        result[elems[0] as string] = elems[1] as string;
      }
      return result;
    }
    case "prop": {
      if (!propFactory) {
        throw new Error(`field ${schema.name} has no prop factory`);
      }
      const prop = propFactory();
      prop.setFromProp(raw);
      return prop;
    }
    case "prop[]": {
      if (!propFactory) {
        throw new Error(`field ${schema.name} has no prop factory`);
      }
      return raw.split(schema.separator ?? ",").map((part) => {
        const prop = propFactory();
        prop.setFromProp(part);
        return prop;
      });
    }
    default:
      throw new Error(`unsupported field type: ${type}`);
  }
}

/**
 * getConfigFieldString serializes a typed field value back into its string
 * representation, mirroring Go's format.GetConfigFieldString. Booleans serialize
 * as "Yes"/"No".
 */
export function getConfigFieldString(schema: FieldSchema, value: unknown): string {
  const type = schema.type ?? "string";
  switch (type) {
    case "string":
      return value === undefined || value === null ? "" : String(value);
    case "int":
    case "uint":
    case "float":
      return value === undefined || value === null ? "" : String(value);
    case "bool":
      return value ? "Yes" : "No";
    case "string[]":
      return Array.isArray(value) ? value.join(schema.separator ?? ",") : "";
    case "map": {
      if (typeof value !== "object" || value === null) {
        return "";
      }
      return Object.entries(value as Record<string, string>)
        .map(([k, v]) => `${k}:${v}`)
        .join(schema.separator ?? ",");
    }
    case "prop":
      return value ? (value as ConfigProp).getPropValue() : "";
    case "prop[]":
      return Array.isArray(value)
        ? (value as ConfigProp[])
            .map((p) => p.getPropValue())
            .join(schema.separator ?? ",")
        : "";
    default:
      throw new Error(`unsupported field type: ${type}`);
  }
}
