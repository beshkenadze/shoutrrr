import type { EnumFormatter } from './types.js';

/** Which part of a URL a config field is sourced from / written to. */
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

/** Supported field value types (port of Go format field kinds). */
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

/** Describes a single config field for URL (de)serialization. */
export interface FieldSchema {
  name: string;
  type?: FieldType;
  /** Query keys; the first is the primary, the rest are aliases. */
  key?: string[];
  /** URL parts this field maps to (in order). */
  urlParts?: URLPart[];
  default?: string;
  required?: boolean;
  base?: number;
  separator?: string;
  enumName?: string;
  title?: string;
  desc?: string;
}

// Mirrors Go format.ParseBool: true for 1/true/yes/y, false for 0/false/no/n.
const TRUE_VALUES = new Set(['true', '1', 'yes', 'y']);
const FALSE_VALUES = new Set(['false', '0', 'no', 'n']);

const INT_PATTERNS: Record<number, RegExp> = {
  2: /^[+-]?[01]+$/,
  8: /^[+-]?[0-7]+$/,
  10: /^[+-]?\d+$/,
  16: /^[+-]?[0-9a-fA-F]+$/,
};

/**
 * parseStrictInt parses an integer for the given base, rejecting trailing
 * garbage and surrounding whitespace the way Go's strconv.ParseInt does
 * (JS parseInt is lenient: parseInt("12abc") === 12). Returns NaN on reject.
 */
function parseStrictInt(raw: string, base: number): number {
  const pattern = INT_PATTERNS[base];
  if (pattern ? !pattern.test(raw) : !/^[+-]?[0-9a-zA-Z]+$/.test(raw)) {
    return Number.NaN;
  }
  return parseInt(raw, base);
}

// Strict decimal float, mirroring strconv.ParseFloat: rejects "12abc", but
// allows exponent / leading sign / fractional forms.
const FLOAT_PATTERN = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;

/**
 * setConfigField parses `raw` according to the field schema and writes it onto `config`.
 * Returns true when the value was valid and applied. Faithful port of format.SetConfigField.
 */
export function setConfigField(
  config: Record<string, unknown>,
  field: FieldSchema,
  raw: string,
  enums: Record<string, EnumFormatter> = {},
): boolean {
  const type = field.type ?? 'string';
  switch (type) {
    case 'string':
    case 'prop':
      config[field.name] = raw;
      return true;
    case 'bool': {
      const lower = raw.toLowerCase();
      if (TRUE_VALUES.has(lower)) {
        config[field.name] = true;
        return true;
      }
      if (FALSE_VALUES.has(lower)) {
        config[field.name] = false;
        return true;
      }
      return false;
    }
    case 'int': {
      const value = parseStrictInt(raw, field.base ?? 10);
      if (Number.isNaN(value)) {
        return false;
      }
      config[field.name] = value;
      return true;
    }
    case 'uint': {
      const value = parseStrictInt(raw, field.base ?? 10);
      if (Number.isNaN(value) || value < 0) {
        return false;
      }
      config[field.name] = value;
      return true;
    }
    case 'float': {
      if (!FLOAT_PATTERN.test(raw)) {
        return false;
      }
      const value = Number.parseFloat(raw);
      if (Number.isNaN(value)) {
        return false;
      }
      config[field.name] = value;
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
      config[field.name] = raw === '' ? [] : raw.split(separator);
      return true;
    }
    default:
      return false;
  }
}

/**
 * getConfigFieldString reads the field from `config` and renders it as a string.
 * Faithful port of format.GetConfigFieldString.
 */
export function getConfigFieldString(
  config: Record<string, unknown>,
  field: FieldSchema,
  enums: Record<string, EnumFormatter> = {},
): string {
  const value = config[field.name];
  const type = field.type ?? 'string';
  switch (type) {
    case 'bool':
      return value ? 'Yes' : 'No';
    case 'enum': {
      const formatter = field.enumName ? enums[field.enumName] : undefined;
      if (formatter && typeof value === 'number') {
        return formatter.print(value);
      }
      return String(value ?? '');
    }
    case 'string[]':
    case 'prop[]': {
      const separator = field.separator ?? ',';
      if (Array.isArray(value)) {
        return value.join(separator);
      }
      return '';
    }
    default:
      return value === undefined || value === null ? '' : String(value);
  }
}
