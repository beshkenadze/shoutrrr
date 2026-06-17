// Faithful port of Go pkg/format field handling primitives.

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

// setConfigField parses a raw string into a typed value, mirroring Go's behaviour.
export function setConfigField(
  field: FieldSchema,
  raw: string,
): string | number | boolean | string[] {
  const type = field.type ?? 'string';
  switch (type) {
    case 'bool': {
      const lowered = raw.toLowerCase();
      if (TRUE_VALUES.has(lowered)) {
        return true;
      }
      if (FALSE_VALUES.has(lowered)) {
        return false;
      }
      throw new Error(`invalid bool value: ${raw}`);
    }
    case 'int':
    case 'uint':
      return parseInt(raw, field.base ?? 10);
    case 'float':
      return parseFloat(raw);
    case 'string[]':
      return raw.split(field.separator ?? ',');
    default:
      return raw;
  }
}

// getConfigFieldString serializes a typed value back to its URL string form.
export function getConfigFieldString(
  field: FieldSchema,
  value: string | number | boolean | string[],
): string {
  const type = field.type ?? 'string';
  switch (type) {
    case 'bool':
      return value ? 'Yes' : 'No';
    case 'string[]':
      return Array.isArray(value) ? value.join(field.separator ?? ',') : String(value);
    default:
      return String(value);
  }
}
