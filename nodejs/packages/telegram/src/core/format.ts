// Faithful port of the relevant parts of Go pkg/format (field schema + set/get).
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
  /** URL query keys this field maps to; first is the canonical key. */
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

/** A config object is a plain record of field values keyed by FieldSchema.name. */
export type ConfigValues = Record<string, unknown>;

const TRUE_VALUES = new Set(['yes', 'true', '1']);
const FALSE_VALUES = new Set(['no', 'false', '0']);

/** Parses a boolean from a config string (yes/true/1 vs no/false/0). */
function parseBool(raw: string): boolean {
  const v = raw.toLowerCase();
  if (TRUE_VALUES.has(v)) {
    return true;
  }
  if (FALSE_VALUES.has(v)) {
    return false;
  }
  throw new Error(`invalid bool value: ${raw}`);
}

/**
 * setConfigField sets a single field on the config from a raw string value,
 * coercing according to the field's type.
 */
export function setConfigField(
  config: ConfigValues,
  field: FieldSchema,
  raw: string,
  enums: Record<string, EnumFormatter> = {},
): void {
  const type = field.type ?? 'string';
  switch (type) {
    case 'string':
    case 'prop':
      config[field.name] = raw;
      return;
    case 'bool':
      config[field.name] = parseBool(raw);
      return;
    case 'int':
    case 'uint':
      config[field.name] = parseInt(raw, field.base ?? 10);
      return;
    case 'float':
      config[field.name] = parseFloat(raw);
      return;
    case 'enum': {
      if (!field.enumName) {
        throw new Error(`field ${field.name} is an enum but has no enumName`);
      }
      const formatter = enums[field.enumName];
      if (!formatter) {
        throw new Error(`no enum formatter for ${field.enumName}`);
      }
      const value = formatter.parse(raw);
      if (value === -1) {
        throw new Error(`invalid ${field.name} value: ${raw}`);
      }
      config[field.name] = value;
      return;
    }
    case 'string[]':
    case 'prop[]': {
      const separator = field.separator ?? ',';
      config[field.name] = raw.split(separator);
      return;
    }
    default:
      throw new Error(`unsupported field type: ${type as string}`);
  }
}

/**
 * getConfigFieldString returns the string representation of a config field,
 * the inverse of setConfigField.
 */
export function getConfigFieldString(
  config: ConfigValues,
  field: FieldSchema,
  enums: Record<string, EnumFormatter> = {},
): string {
  const type = field.type ?? 'string';
  const value = config[field.name];
  switch (type) {
    case 'string':
    case 'prop':
      return value === undefined || value === null ? '' : String(value);
    case 'bool':
      return value ? 'Yes' : 'No';
    case 'int':
    case 'uint':
      return String((value as number).toString(field.base ?? 10));
    case 'float':
      return String(value);
    case 'enum': {
      if (!field.enumName) {
        throw new Error(`field ${field.name} is an enum but has no enumName`);
      }
      const formatter = enums[field.enumName];
      if (!formatter) {
        throw new Error(`no enum formatter for ${field.enumName}`);
      }
      return formatter.print(value as number);
    }
    case 'string[]':
    case 'prop[]': {
      const separator = field.separator ?? ',';
      return (value as string[] | undefined ?? []).join(separator);
    }
    default:
      throw new Error(`unsupported field type: ${type as string}`);
  }
}
