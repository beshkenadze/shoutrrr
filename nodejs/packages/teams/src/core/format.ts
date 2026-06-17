import type { EnumFormatter } from './types.js';
import { EnumInvalid } from './enumFormatter.js';

/** Parts of a URL that a config field can be bound to. */
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

/** Supported config field value types. */
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

/** Declarative description of a single config field, ported from Go struct tags. */
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

/** A config object is a plain bag of string-or-typed properties keyed by field name. */
export type ConfigRecord = Record<string, unknown>;

/**
 * ParseBool returns true for 1/true/yes/y, false for 0/false/no/n, otherwise
 * the provided default and ok=false. Faithful port of Go's format.ParseBool.
 */
export function parseBool(
  value: string,
  defaultValue: boolean,
): { value: boolean; ok: boolean } {
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

/** PrintBool returns "Yes" for true and "No" for false (Go: format.PrintBool). */
export function printBool(value: boolean): string {
  return value ? 'Yes' : 'No';
}

/**
 * setConfigField applies a raw string value to a config field according to its
 * schema. Mirrors Go's format.SetConfigField (the subset used by ported services).
 */
export function setConfigField(
  config: ConfigRecord,
  field: FieldSchema,
  inputValue: string,
  enums: Record<string, EnumFormatter> = {},
): void {
  const type = field.type ?? 'string';

  switch (type) {
    case 'string':
      config[field.name] = inputValue;
      return;
    case 'enum': {
      const formatter = field.enumName ? enums[field.enumName] : undefined;
      if (!formatter) {
        throw new Error(`no enum formatter for field ${field.name}`);
      }
      const value = formatter.parse(inputValue);
      if (value === EnumInvalid) {
        throw new Error(`not a one of ${formatter.names().join(', ')}`);
      }
      config[field.name] = value;
      return;
    }
    case 'int':
    case 'uint': {
      const parsed = parseInt(inputValue, field.base ?? 10);
      if (Number.isNaN(parsed)) {
        throw new Error('not a valid number');
      }
      config[field.name] = parsed;
      return;
    }
    case 'float': {
      const parsed = Number.parseFloat(inputValue);
      if (Number.isNaN(parsed)) {
        throw new Error('not a valid number');
      }
      config[field.name] = parsed;
      return;
    }
    case 'bool': {
      const { value, ok } = parseBool(inputValue, false);
      if (!ok) {
        throw new Error('accepted values are 1, true, yes or 0, false, no');
      }
      config[field.name] = value;
      return;
    }
    case 'string[]':
      config[field.name] = inputValue.split(field.separator ?? ',');
      return;
    default:
      throw new Error(`invalid field type ${type}`);
  }
}

/**
 * getConfigFieldString serializes a config field value back to its string form.
 * Mirrors Go's format.GetConfigFieldString.
 */
export function getConfigFieldString(
  config: ConfigRecord,
  field: FieldSchema,
  enums: Record<string, EnumFormatter> = {},
): string {
  const type = field.type ?? 'string';
  const raw = config[field.name];

  switch (type) {
    case 'string':
      return raw === undefined || raw === null ? '' : String(raw);
    case 'enum': {
      const formatter = field.enumName ? enums[field.enumName] : undefined;
      if (!formatter) {
        throw new Error(`no enum formatter for field ${field.name}`);
      }
      return formatter.print(typeof raw === 'number' ? raw : 0);
    }
    case 'int':
    case 'uint':
    case 'float':
      return raw === undefined || raw === null ? '0' : String(raw);
    case 'bool':
      return printBool(Boolean(raw));
    case 'string[]':
      return Array.isArray(raw) ? raw.join(field.separator ?? ',') : '';
    default:
      throw new Error(`invalid field type ${type}`);
  }
}
