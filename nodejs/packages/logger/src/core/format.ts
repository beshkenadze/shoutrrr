// Faithful port of Go pkg/format field handling.
// A later dedupe pass folds these into @shoutrrr/core.

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

export type FieldType = 'string' | 'int' | 'uint' | 'bool' | 'float' | 'enum' | 'string[]';

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
  title?: boolean;
  desc?: string;
}

/** Records the underlying field value for a config, keyed by FieldSchema.name. */
export type FieldStore = Record<string, unknown>;

/**
 * Strictly parses an integer the way Go's strconv.ParseInt/ParseUint does:
 * the whole string must be a valid number in the given base (optional sign for
 * signed; no trailing garbage), and unsigned values reject a negative sign.
 */
function parseStrictInt(raw: string, base: number, unsigned: boolean): number | undefined {
  const signPattern = unsigned ? '[+]?' : '[+-]?';
  let digits: string;
  switch (base) {
    case 2:
      digits = '[01]+';
      break;
    case 8:
      digits = '[0-7]+';
      break;
    case 16:
      digits = '[0-9a-fA-F]+';
      break;
    case 10:
      digits = '[0-9]+';
      break;
    default:
      digits = '[0-9a-zA-Z]+';
  }
  if (!new RegExp(`^${signPattern}${digits}$`).test(raw)) {
    return undefined;
  }
  const value = parseInt(raw, base);
  return Number.isNaN(value) ? undefined : value;
}

function parseBool(raw: string): boolean | undefined {
  switch (raw.toLowerCase()) {
    case 'yes':
    case 'true':
    case '1':
      return true;
    case 'no':
    case 'false':
    case '0':
      return false;
    default:
      return undefined;
  }
}

/**
 * Parses a raw string into the typed value described by the field schema and
 * assigns it onto the config's field store. Mirrors Go format.SetConfigField.
 */
export function setConfigField(
  store: FieldStore,
  f: FieldSchema,
  raw: string,
  enums: Record<string, EnumFormatter>,
): void {
  const type = f.type ?? 'string';
  switch (type) {
    case 'int':
    case 'uint': {
      const value = parseStrictInt(raw, f.base ?? 10, type === 'uint');
      if (value === undefined) {
        throw new Error(`invalid ${type} value "${raw}" for field ${f.name}`);
      }
      store[f.name] = value;
      return;
    }
    case 'float': {
      const value = Number.parseFloat(raw);
      if (Number.isNaN(value)) {
        throw new Error(`invalid float value "${raw}" for field ${f.name}`);
      }
      store[f.name] = value;
      return;
    }
    case 'bool': {
      const value = parseBool(raw);
      if (value === undefined) {
        throw new Error(`invalid bool value "${raw}" for field ${f.name}`);
      }
      store[f.name] = value;
      return;
    }
    case 'enum': {
      const formatter = f.enumName ? enums[f.enumName] : undefined;
      if (!formatter) {
        throw new Error(`no enum formatter registered for field ${f.name}`);
      }
      store[f.name] = formatter.parse(raw);
      return;
    }
    case 'string[]': {
      const separator = f.separator ?? ',';
      store[f.name] = raw === '' ? [] : raw.split(separator);
      return;
    }
    case 'string':
    default:
      store[f.name] = raw;
  }
}

/**
 * Serializes a config field value to its string representation. Mirrors Go
 * format.GetConfigFieldString.
 */
export function getConfigFieldString(
  store: FieldStore,
  f: FieldSchema,
  enums: Record<string, EnumFormatter>,
): string {
  const value = store[f.name];
  const type = f.type ?? 'string';
  switch (type) {
    case 'bool':
      return value ? 'Yes' : 'No';
    case 'enum': {
      const formatter = f.enumName ? enums[f.enumName] : undefined;
      if (!formatter) {
        throw new Error(`no enum formatter registered for field ${f.name}`);
      }
      return formatter.print(typeof value === 'number' ? value : 0);
    }
    case 'string[]': {
      const separator = f.separator ?? ',';
      return Array.isArray(value) ? value.join(separator) : '';
    }
    case 'int':
    case 'uint':
    case 'float':
      return value === undefined || value === null ? '' : String(value);
    case 'string':
    default:
      return value === undefined || value === null ? '' : String(value);
  }
}
