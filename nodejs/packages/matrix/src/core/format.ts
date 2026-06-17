import type { EnumFormatter } from './types.js';

// URLPart / FieldType — faithful port of Go pkg/format.
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
  // query keys for this field; first is primary, rest are aliases
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

// A config object is a plain record keyed by field name.
export type ConfigObject = Record<string, unknown>;

function parseBool(raw: string): boolean | undefined {
  switch (raw.toLowerCase()) {
    case 'true':
    case 'yes':
    case '1':
      return true;
    case 'false':
    case 'no':
    case '0':
      return false;
    default:
      return undefined;
  }
}

// setConfigField sets the value of a config field from a raw string.
// Returns true when the value was valid/applied.
export function setConfigField(
  config: ConfigObject,
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
      const b = parseBool(raw);
      if (b === undefined) {
        return false;
      }
      config[field.name] = b;
      return true;
    }
    case 'int':
    case 'uint': {
      const n = parseInt(raw, field.base ?? 10);
      if (Number.isNaN(n)) {
        return false;
      }
      config[field.name] = n;
      return true;
    }
    case 'float': {
      const n = Number.parseFloat(raw);
      if (Number.isNaN(n)) {
        return false;
      }
      config[field.name] = n;
      return true;
    }
    case 'enum': {
      const formatter = field.enumName ? enums[field.enumName] : undefined;
      if (!formatter) {
        return false;
      }
      const v = formatter.parse(raw);
      if (v < 0) {
        return false;
      }
      config[field.name] = v;
      return true;
    }
    case 'string[]':
    case 'prop[]': {
      const sep = field.separator ?? ',';
      config[field.name] = raw === '' ? [] : raw.split(sep);
      return true;
    }
    default:
      return false;
  }
}

// getConfigFieldString returns the string representation of a config field.
export function getConfigFieldString(
  config: ConfigObject,
  field: FieldSchema,
  enums: Record<string, EnumFormatter> = {},
): string {
  const type = field.type ?? 'string';
  const value = config[field.name];
  switch (type) {
    case 'bool':
      return value ? 'Yes' : 'No';
    case 'string[]':
    case 'prop[]': {
      const sep = field.separator ?? ',';
      return Array.isArray(value) ? value.join(sep) : '';
    }
    case 'enum': {
      const formatter = field.enumName ? enums[field.enumName] : undefined;
      if (formatter && typeof value === 'number') {
        return formatter.print(value);
      }
      return '';
    }
    case 'int':
    case 'uint':
    case 'float':
      return value === undefined || value === null ? '' : String(value);
    default:
      return value === undefined || value === null ? '' : String(value);
  }
}
