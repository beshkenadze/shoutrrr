// Faithful port of Go pkg/format field handling.

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

const TRUE_VALUES = new Set(['yes', 'true', '1']);
const FALSE_VALUES = new Set(['no', 'false', '0']);

function parseBool(raw: string): boolean | undefined {
  const lower = raw.toLowerCase();
  if (TRUE_VALUES.has(lower)) {
    return true;
  }
  if (FALSE_VALUES.has(lower)) {
    return false;
  }
  return undefined;
}

/**
 * Sets a config field from its raw string representation, mirroring Go's
 * SetConfigField type coercion behavior.
 */
export function setConfigField(
  config: Record<string, unknown>,
  field: FieldSchema,
  raw: string,
): boolean {
  const type = field.type ?? 'string';
  switch (type) {
    case 'string':
    case 'prop': {
      config[field.name] = raw;
      return true;
    }
    case 'int': {
      const value = Number.parseInt(raw, field.base ?? 10);
      if (Number.isNaN(value)) {
        return false;
      }
      config[field.name] = value;
      return true;
    }
    case 'uint': {
      const value = Number.parseInt(raw, field.base ?? 10);
      if (Number.isNaN(value) || value < 0) {
        return false;
      }
      config[field.name] = value;
      return true;
    }
    case 'float': {
      const value = Number.parseFloat(raw);
      if (Number.isNaN(value)) {
        return false;
      }
      config[field.name] = value;
      return true;
    }
    case 'bool': {
      const value = parseBool(raw);
      if (value === undefined) {
        return false;
      }
      config[field.name] = value;
      return true;
    }
    case 'string[]':
    case 'prop[]': {
      config[field.name] = raw.split(field.separator ?? ',');
      return true;
    }
    case 'enum': {
      config[field.name] = raw;
      return true;
    }
    default:
      return false;
  }
}

/**
 * Returns the string representation of a config field, mirroring Go's
 * GetConfigFieldString serialization (bool -> "Yes"/"No").
 */
export function getConfigFieldString(
  config: Record<string, unknown>,
  field: FieldSchema,
): string {
  const value = config[field.name];
  const type = field.type ?? 'string';
  switch (type) {
    case 'bool':
      return value ? 'Yes' : 'No';
    case 'string[]':
    case 'prop[]':
      return Array.isArray(value) ? value.join(field.separator ?? ',') : '';
    default:
      return value === undefined || value === null ? '' : String(value);
  }
}
