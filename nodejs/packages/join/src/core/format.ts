// Faithful port of Go pkg/format field (un)marshalling.
// Maps struct tags (key/url/default) to a declarative FieldSchema and provides
// setConfigField / getConfigFieldString mirroring SetConfigField / GetConfigFieldString.

import type { EnumFormatter } from './types.js';

/** Which part of a URL a field is sourced from / serialized to. */
export type URLPart =
  | 'user'
  | 'pass'
  | 'host'
  | 'port'
  | 'path'
  | 'path1'
  | 'path2'
  | 'path3'
  | 'path4'
  | 'query';

/** Supported config field types. */
export type FieldType =
  | 'string'
  | 'int'
  | 'uint'
  | 'bool'
  | 'float'
  | 'enum'
  | 'string[]'
  | 'prop'
  | 'prop[]';

/** Declarative description of one config field. */
export interface FieldSchema {
  /** Property name on the config object. */
  name: string;
  /** Value type (defaults to 'string'). */
  type?: FieldType;
  /** Query keys (and aliases) this field is addressable by; first is primary. */
  key?: string[];
  /** URL parts this field maps to. */
  urlParts?: URLPart[];
  /** Default value as a serialized string. */
  default?: string;
  /** Whether the field is required. */
  required?: boolean;
  /** Numeric base for int/uint parsing (defaults to 10). */
  base?: number;
  /** Separator for string[] (defaults to ','). */
  separator?: string;
  /** Name of the enum formatter in ServiceConfig.enums(). */
  enumName?: string;
  /** Human-readable title. */
  title?: string;
  /** Human-readable description. */
  desc?: string;
}

/** parseBool mirrors format.ParseBool. */
export function parseBool(value: string, defaultValue: boolean): [boolean, boolean] {
  switch (value.toLowerCase()) {
    case 'true':
    case '1':
    case 'yes':
    case 'y':
      return [true, true];
    case 'false':
    case '0':
    case 'no':
    case 'n':
      return [false, true];
    default:
      return [defaultValue, false];
  }
}

/** printBool mirrors format.PrintBool ("Yes"/"No"). */
export function printBool(value: boolean): string {
  return value ? 'Yes' : 'No';
}

const intPattern = /^([+-]?)([0-9a-zA-Z]+)$/;

/**
 * parseIntStrict mirrors Go's strconv.ParseInt: the entire string must be a
 * valid integer in the given base. Unlike JS parseInt, trailing garbage
 * ("12abc"), empty input and out-of-base digits are rejected (undefined).
 * Leading zeros ("007" -> 7) are accepted, matching Go.
 */
function parseIntStrict(value: string, base: number): number | undefined {
  const match = value.trim().match(intPattern);
  if (!match) {
    return undefined;
  }
  const sign = match[1] === '-' ? -1 : 1;
  const digits = match[2]!.toLowerCase();
  for (const ch of digits) {
    const d = ch >= '0' && ch <= '9' ? ch.charCodeAt(0) - 48 : ch.charCodeAt(0) - 97 + 10;
    if (d < 0 || d >= base) {
      return undefined;
    }
  }
  const parsed = parseInt(digits, base);
  if (Number.isNaN(parsed)) {
    return undefined;
  }
  return sign * parsed;
}

type ConfigObject = Record<string, unknown>;

/**
 * setConfigField parses inputValue per the field schema and assigns it on config.
 * Returns whether the value was valid; throws on parse errors (mirrors the
 * (valid, err) return of Go's SetConfigField).
 */
export function setConfigField(
  config: ConfigObject,
  field: FieldSchema,
  inputValue: string,
  enums: Record<string, EnumFormatter> = {},
): boolean {
  const type = field.type ?? 'string';
  switch (type) {
    case 'string':
    case 'prop': {
      config[field.name] = inputValue;
      return true;
    }
    case 'string[]':
    case 'prop[]': {
      const separator = field.separator ?? ',';
      // Mirror Go's strings.Split: "".split(",") === [""] (length 1), not [].
      config[field.name] = inputValue.split(separator);
      return true;
    }
    case 'bool': {
      const [parsed, ok] = parseBool(inputValue, false);
      if (!ok) {
        return false;
      }
      config[field.name] = parsed;
      return true;
    }
    case 'int': {
      const parsed = parseIntStrict(inputValue, field.base ?? 10);
      if (parsed === undefined) {
        return false;
      }
      config[field.name] = parsed;
      return true;
    }
    case 'uint': {
      const parsed = parseIntStrict(inputValue, field.base ?? 10);
      if (parsed === undefined || parsed < 0) {
        return false;
      }
      config[field.name] = parsed;
      return true;
    }
    case 'float': {
      const parsed = Number.parseFloat(inputValue);
      if (Number.isNaN(parsed)) {
        return false;
      }
      config[field.name] = parsed;
      return true;
    }
    case 'enum': {
      const formatter = field.enumName ? enums[field.enumName] : undefined;
      if (!formatter) {
        return false;
      }
      const value = formatter.parse(inputValue);
      if (value < 0) {
        return false;
      }
      config[field.name] = value;
      return true;
    }
    default: {
      const exhaustive: never = type;
      throw new Error(`unsupported field type: ${String(exhaustive)}`);
    }
  }
}

/**
 * getConfigFieldString serializes the field's current value to its string form,
 * mirroring Go's GetConfigFieldString.
 */
export function getConfigFieldString(
  config: ConfigObject,
  field: FieldSchema,
  enums: Record<string, EnumFormatter> = {},
): string {
  const type = field.type ?? 'string';
  const raw = config[field.name];
  switch (type) {
    case 'string':
    case 'prop':
      return raw === undefined || raw === null ? '' : String(raw);
    case 'string[]':
    case 'prop[]': {
      const separator = field.separator ?? ',';
      return Array.isArray(raw) ? (raw as string[]).join(separator) : '';
    }
    case 'bool':
      return printBool(Boolean(raw));
    case 'int':
    case 'uint':
      return raw === undefined || raw === null ? '0' : String(raw);
    case 'float':
      return raw === undefined || raw === null ? '0' : String(raw);
    case 'enum': {
      const formatter = field.enumName ? enums[field.enumName] : undefined;
      if (!formatter) {
        return '';
      }
      return formatter.print(typeof raw === 'number' ? raw : 0);
    }
    default: {
      const exhaustive: never = type;
      throw new Error(`unsupported field type: ${String(exhaustive)}`);
    }
  }
}
