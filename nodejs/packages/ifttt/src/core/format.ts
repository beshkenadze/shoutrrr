import type { EnumFormatter } from "./types.js";

/** URLPart identifies which part of a service URL a field is serialized into. */
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

/** FieldType is the value type of a config field. */
export type FieldType =
  | "string"
  | "int"
  | "uint"
  | "bool"
  | "float"
  | "enum"
  | "string[]"
  | "prop"
  | "prop[]";

/** FieldSchema is the metadata for a single config field. */
export interface FieldSchema {
  name: string;
  type?: FieldType;
  key?: string[];
  urlParts?: URLPart[];
  default?: string;
  required?: boolean;
  base?: number;
  separator?: string;
  enumName?: string;
  title?: boolean;
  desc?: string;
}

/**
 * ParseBool returns the parsed boolean and whether the value was recognized,
 * mirroring Go format.ParseBool. Accepts true/1/yes/y and false/0/no/n
 * (case-insensitive).
 */
export function parseBool(
  value: string,
  defaultValue: boolean,
): [boolean, boolean] {
  switch (value.toLowerCase()) {
    case "true":
    case "1":
    case "yes":
    case "y":
      return [true, true];
    case "false":
    case "0":
    case "no":
    case "n":
      return [false, true];
    default:
      return [defaultValue, false];
  }
}

/** PrintBool returns "Yes" for true, "No" for false (mirrors Go format.PrintBool). */
export function printBool(value: boolean): string {
  return value ? "Yes" : "No";
}

/**
 * parseStrictInt parses a whole integer string in the given base, rejecting
 * anything Go's strconv.ParseInt/ParseUint would reject: trailing garbage,
 * decimals, whitespace, and (for unsigned) negative signs. Returns NaN on
 * failure. Mirrors the strictness of Go numeric field parsing rather than JS
 * parseInt's lenient prefix behavior.
 */
function parseStrictInt(raw: string, base: number, allowNegative: boolean): number {
  const pattern =
    base === 16
      ? allowNegative
        ? /^[+-]?[0-9a-fA-F]+$/
        : /^\+?[0-9a-fA-F]+$/
      : base === 8
        ? allowNegative
          ? /^[+-]?[0-7]+$/
          : /^\+?[0-7]+$/
        : base === 2
          ? allowNegative
            ? /^[+-]?[01]+$/
            : /^\+?[01]+$/
          : allowNegative
            ? /^[+-]?[0-9]+$/
            : /^\+?[0-9]+$/;
  if (!pattern.test(raw)) {
    return Number.NaN;
  }
  const parsed = parseInt(raw, base);
  return Number.isNaN(parsed) ? Number.NaN : parsed;
}

/**
 * setConfigField sets the field on the config object from a raw string,
 * coercing based on the schema type. Returns whether the value was valid.
 * Mirrors Go format.SetConfigField.
 */
export function setConfigField(
  config: Record<string, unknown>,
  schema: FieldSchema,
  raw: string,
  enums: Record<string, EnumFormatter> = {},
): boolean {
  const type = schema.type ?? "string";
  switch (type) {
    case "string":
    case "prop": {
      config[schema.name] = raw;
      return true;
    }
    case "int": {
      const parsed = parseStrictInt(raw, schema.base ?? 10, true);
      if (Number.isNaN(parsed)) {
        return false;
      }
      config[schema.name] = parsed;
      return true;
    }
    case "uint": {
      const parsed = parseStrictInt(raw, schema.base ?? 10, false);
      if (Number.isNaN(parsed)) {
        return false;
      }
      config[schema.name] = parsed;
      return true;
    }
    case "float": {
      if (raw.trim() === "" || !Number.isFinite(Number(raw))) {
        return false;
      }
      config[schema.name] = Number(raw);
      return true;
    }
    case "bool": {
      const [val, ok] = parseBool(raw, false);
      if (!ok) {
        return false;
      }
      config[schema.name] = val;
      return true;
    }
    case "enum": {
      const formatter = schema.enumName ? enums[schema.enumName] : undefined;
      if (!formatter) {
        return false;
      }
      const idx = formatter.parse(raw);
      if (idx < 0) {
        return false;
      }
      config[schema.name] = idx;
      return true;
    }
    case "string[]":
    case "prop[]": {
      const sep = schema.separator ?? ",";
      config[schema.name] = raw === "" ? [] : raw.split(sep);
      return true;
    }
    default:
      return false;
  }
}

/**
 * getConfigFieldString serializes a config field to its string representation,
 * mirroring Go format.GetConfigFieldString.
 */
export function getConfigFieldString(
  config: Record<string, unknown>,
  schema: FieldSchema,
  enums: Record<string, EnumFormatter> = {},
): string {
  const type = schema.type ?? "string";
  const value = config[schema.name];
  switch (type) {
    case "string":
    case "prop":
      return value === undefined || value === null ? "" : String(value);
    case "int":
    case "uint":
    case "float":
      return value === undefined || value === null ? "0" : String(value);
    case "bool":
      return printBool(Boolean(value));
    case "enum": {
      const formatter = schema.enumName ? enums[schema.enumName] : undefined;
      if (!formatter) {
        return "";
      }
      return formatter.print(Number(value ?? 0));
    }
    case "string[]":
    case "prop[]": {
      const sep = schema.separator ?? ",";
      return Array.isArray(value) ? value.join(sep) : "";
    }
    default:
      return "";
  }
}
