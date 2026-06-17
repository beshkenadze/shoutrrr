import type { ConfigProp, EnumFormatter } from './types.js';

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
  /** Property name on the config object. */
  name: string;
  type?: FieldType;
  /** Query keys (first is primary, rest are aliases). */
  key?: string[];
  /** URL parts this field maps to (e.g. ['user','pass'] for a prop spanning userinfo). */
  urlParts?: URLPart[];
  default?: string;
  required?: boolean;
  /** Numeric base for int/uint parsing. */
  base?: number;
  /** Separator for string[] fields. */
  separator?: string;
  /** Enum name used to look up the EnumFormatter. */
  enumName?: string;
  title?: string;
  desc?: string;
}

/** A config object indexed by field name. ConfigProp fields hold ConfigProp instances. */
export type ConfigObject = Record<string, unknown>;

function isConfigProp(value: unknown): value is ConfigProp {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ConfigProp).setFromProp === 'function' &&
    typeof (value as ConfigProp).getPropValue === 'function'
  );
}

/** ParseBool — port of Go format.ParseBool. */
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

/** PrintBool — port of Go format.PrintBool. */
export function printBool(value: boolean): string {
  return value ? 'Yes' : 'No';
}

/**
 * setConfigField sets a single field on the config from its string representation.
 * Returns true if the value was valid. Throws on parse errors.
 */
export function setConfigField(
  config: ConfigObject,
  schema: FieldSchema,
  enums: Record<string, EnumFormatter>,
  value: string,
): boolean {
  const type = schema.type ?? 'string';

  switch (type) {
    case 'string': {
      config[schema.name] = value;
      return true;
    }
    case 'int': {
      const parsed = parseInt(value, schema.base ?? 10);
      if (Number.isNaN(parsed)) {
        return false;
      }
      config[schema.name] = parsed;
      return true;
    }
    case 'uint': {
      const parsed = parseInt(value, schema.base ?? 10);
      if (Number.isNaN(parsed) || parsed < 0) {
        return false;
      }
      config[schema.name] = parsed;
      return true;
    }
    case 'float': {
      const parsed = Number.parseFloat(value);
      if (Number.isNaN(parsed)) {
        return false;
      }
      config[schema.name] = parsed;
      return true;
    }
    case 'bool': {
      const [parsed, ok] = parseBool(value, false);
      if (!ok) {
        return false;
      }
      config[schema.name] = parsed;
      return true;
    }
    case 'enum': {
      const formatter = schema.enumName ? enums[schema.enumName] : undefined;
      if (!formatter) {
        return false;
      }
      const parsed = formatter.parse(value);
      if (parsed < 0) {
        return false;
      }
      config[schema.name] = parsed;
      return true;
    }
    case 'string[]': {
      const sep = schema.separator ?? ',';
      config[schema.name] = value === '' ? [] : value.split(sep);
      return true;
    }
    case 'prop':
    case 'prop[]': {
      const current = config[schema.name];
      if (!isConfigProp(current)) {
        return false;
      }
      current.setFromProp(value);
      return true;
    }
    default:
      return false;
  }
}

/** getConfigFieldString returns the string representation of a config field. */
export function getConfigFieldString(
  config: ConfigObject,
  schema: FieldSchema,
  enums: Record<string, EnumFormatter>,
): string {
  const type = schema.type ?? 'string';
  const value = config[schema.name];

  switch (type) {
    case 'string':
      return value === undefined || value === null ? '' : String(value);
    case 'int':
    case 'uint': {
      const num = typeof value === 'number' ? value : 0;
      return num.toString(schema.base ?? 10);
    }
    case 'float': {
      const num = typeof value === 'number' ? value : 0;
      return String(num);
    }
    case 'bool':
      return printBool(value === true);
    case 'enum': {
      const formatter = schema.enumName ? enums[schema.enumName] : undefined;
      if (!formatter) {
        return '';
      }
      return formatter.print(typeof value === 'number' ? value : 0);
    }
    case 'string[]': {
      const sep = schema.separator ?? ',';
      return Array.isArray(value) ? value.join(sep) : '';
    }
    case 'prop':
    case 'prop[]': {
      if (isConfigProp(value)) {
        return value.getPropValue();
      }
      return '';
    }
    default:
      return '';
  }
}
