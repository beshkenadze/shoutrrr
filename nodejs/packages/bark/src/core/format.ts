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

const TRUE_VALUES = new Set(['yes', 'true', '1']);
const FALSE_VALUES = new Set(['no', 'false', '0']);

type ConfigRecord = Record<string, unknown>;

/**
 * parseStrictInt parses an integer that must consume the entire string in the
 * given base, mirroring Go's strconv.ParseInt (which errors on trailing
 * garbage). Returns undefined when the string is not a valid integer.
 */
function parseStrictInt(raw: string, base: number): number | undefined {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return undefined;
  }
  let body = trimmed;
  let sign = 1;
  if (body.startsWith('+')) {
    body = body.slice(1);
  } else if (body.startsWith('-')) {
    sign = -1;
    body = body.slice(1);
  }
  if (body === '') {
    return undefined;
  }
  const validChars = '0123456789abcdefghijklmnopqrstuvwxyz'.slice(0, base);
  for (const ch of body.toLowerCase()) {
    if (!validChars.includes(ch)) {
      return undefined;
    }
  }
  const value = parseInt(body, base);
  if (Number.isNaN(value)) {
    return undefined;
  }
  return sign * value;
}

/**
 * setConfigField parses the raw string and assigns it to the config field
 * described by the schema, mirroring Go's format.SetConfigField.
 * Returns true if the value was valid and applied.
 */
export function setConfigField(
  config: ConfigRecord,
  field: FieldSchema,
  raw: string,
  enums: Record<string, EnumFormatter> = {},
): boolean {
  const type = field.type ?? 'string';
  switch (type) {
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
    case 'int':
    case 'uint': {
      // Mirror Go's strconv.ParseInt: the whole string must be a valid integer
      // in the given base. parseInt() alone would accept trailing garbage
      // ("5abc" -> 5), which Go rejects.
      const value = parseStrictInt(raw, field.base ?? 10);
      if (value === undefined) {
        return false;
      }
      if (type === 'uint' && value < 0) {
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
      config[field.name] = raw.split(field.separator ?? ',');
      return true;
    }
    case 'string':
    case 'prop':
    default:
      config[field.name] = raw;
      return true;
  }
}

/**
 * getConfigFieldString serializes a config field to its string representation,
 * mirroring Go's format.GetConfigFieldString. bool serializes to "Yes"/"No".
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
      return value ? 'Yes' : 'No';
    case 'int':
    case 'uint':
    case 'float':
      return value === undefined || value === null ? '' : String(value);
    case 'enum': {
      const formatter = field.enumName ? enums[field.enumName] : undefined;
      if (!formatter) {
        return '';
      }
      return formatter.print(typeof value === 'number' ? value : 0);
    }
    case 'string[]':
    case 'prop[]':
      return Array.isArray(value) ? value.join(field.separator ?? ',') : '';
    case 'string':
    case 'prop':
    default:
      return value === undefined || value === null ? '' : String(value);
  }
}
