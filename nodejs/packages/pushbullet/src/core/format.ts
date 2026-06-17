// Vendored core kit — faithful port of Go pkg/format field (de)serialization.

import type { EnumFormatter } from './types.js';

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
  title?: string;
  desc?: string;
}

/** ParseBool mirrors Go format.ParseBool: yes/true/1/y => true, no/false/0/n => false. */
export function parseBool(value: string, defaultValue: boolean): { value: boolean; ok: boolean } {
  switch (value.toLowerCase()) {
    case 'true':
    case '1':
    case 'yes':
    case 'y':
      return { value: true, ok: true };
    case 'false':
    case '0':
    case 'no':
    case 'n':
      return { value: false, ok: true };
    default:
      return { value: defaultValue, ok: false };
  }
}

/** PrintBool mirrors Go format.PrintBool: true => "Yes", false => "No". */
export function printBool(value: boolean): string {
  return value ? 'Yes' : 'No';
}

const INT_DIGITS: Record<number, RegExp> = {
  2: /^[+-]?[01]+$/,
  8: /^[+-]?[0-7]+$/,
  10: /^[+-]?\d+$/,
  16: /^[+-]?[0-9a-fA-F]+$/,
};

/**
 * Strict integer parse mirroring Go strconv.ParseInt: the whole string must be
 * a valid integer in the given base (no trailing garbage). Returns null on
 * failure. `Number.parseInt` alone is rejected because it ignores trailing junk.
 */
function parseStrictInt(raw: string, base: number): number | null {
  const trimmed = raw.trim();
  const pattern = INT_DIGITS[base];
  if (!pattern || !pattern.test(trimmed)) {
    return null;
  }
  const parsed = Number.parseInt(trimmed, base);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Strict float parse mirroring Go strconv.ParseFloat: the whole string must be
 * a valid float (no trailing garbage). Returns null on failure.
 */
function parseStrictFloat(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '' || !/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(trimmed)) {
    return null;
  }
  const parsed = Number.parseFloat(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
}

type ConfigValue = string | number | boolean | string[];
type ConfigRecord = Record<string, ConfigValue>;

/**
 * setConfigField parses the raw string and assigns it to config[field.name],
 * mirroring Go format.SetConfigField. Returns whether the value was valid.
 */
export function setConfigField(
  config: ConfigRecord,
  field: FieldSchema,
  raw: string,
  enums: Record<string, EnumFormatter> = {},
): boolean {
  const type = field.type ?? 'string';
  switch (type) {
    case 'string':
    case 'prop': {
      config[field.name] = raw;
      return true;
    }
    case 'bool': {
      const { value, ok } = parseBool(raw, false);
      if (!ok) {
        return false;
      }
      config[field.name] = value;
      return true;
    }
    case 'int': {
      const parsed = parseStrictInt(raw, field.base ?? 10);
      if (parsed === null) {
        return false;
      }
      config[field.name] = parsed;
      return true;
    }
    case 'uint': {
      const parsed = parseStrictInt(raw, field.base ?? 10);
      // Go's strconv.ParseUint rejects any leading '-' (including "-0").
      if (parsed === null || parsed < 0 || /^\s*-/.test(raw)) {
        return false;
      }
      config[field.name] = parsed;
      return true;
    }
    case 'float': {
      const parsed = parseStrictFloat(raw);
      if (parsed === null) {
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
      const value = formatter.parse(raw);
      if (value < 0) {
        return false;
      }
      config[field.name] = value;
      return true;
    }
    case 'string[]':
    case 'prop[]': {
      const separator = field.separator ?? ',';
      config[field.name] = raw.length > 0 ? raw.split(separator) : [];
      return true;
    }
    default:
      return false;
  }
}

/**
 * getConfigFieldString serializes config[field.name] back to its string form,
 * mirroring Go format.GetConfigFieldString.
 */
export function getConfigFieldString(
  config: ConfigRecord,
  field: FieldSchema,
  enums: Record<string, EnumFormatter> = {},
): string {
  const type = field.type ?? 'string';
  const value = config[field.name];
  switch (type) {
    case 'bool':
      return printBool(Boolean(value));
    case 'enum': {
      const formatter = field.enumName ? enums[field.enumName] : undefined;
      if (!formatter) {
        return '';
      }
      return formatter.print(Number(value));
    }
    case 'string[]':
    case 'prop[]': {
      const separator = field.separator ?? ',';
      return Array.isArray(value) ? value.join(separator) : '';
    }
    case 'int':
    case 'uint':
    case 'float':
      return value === undefined ? '' : String(value);
    default:
      return value === undefined ? '' : String(value);
  }
}
