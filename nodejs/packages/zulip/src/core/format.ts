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

/**
 * Sets a config field from its raw URL/query string representation, coercing to
 * the field's declared type. Mirrors Go's format.SetConfigField.
 */
export function setConfigField(
  config: Record<string, unknown>,
  field: FieldSchema,
  raw: string,
  enums: Record<string, EnumFormatter> = {},
): void {
  const type = field.type ?? 'string';

  switch (type) {
    case 'bool': {
      const lower = raw.toLowerCase();
      if (TRUE_VALUES.has(lower)) {
        config[field.name] = true;
      } else if (FALSE_VALUES.has(lower)) {
        config[field.name] = false;
      } else {
        throw new Error(`invalid bool value: ${raw}`);
      }
      break;
    }
    case 'int':
    case 'uint': {
      config[field.name] = parseInt(raw, field.base ?? 10);
      break;
    }
    case 'float': {
      config[field.name] = parseFloat(raw);
      break;
    }
    case 'enum': {
      const formatter = field.enumName ? enums[field.enumName] : undefined;
      config[field.name] = formatter ? formatter.parse(raw) : 0;
      break;
    }
    case 'string[]':
    case 'prop[]': {
      config[field.name] = raw.split(field.separator ?? ',');
      break;
    }
    default: {
      config[field.name] = raw;
      break;
    }
  }
}

/**
 * Serializes a config field back to its string representation. Mirrors Go's
 * format.GetConfigFieldString — booleans render as "Yes"/"No".
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
      return formatter ? formatter.print(Number(value)) : String(value);
    }
    case 'string[]':
    case 'prop[]':
      return Array.isArray(value) ? value.join(field.separator ?? ',') : '';
    default:
      return value === undefined || value === null ? '' : String(value);
  }
}
