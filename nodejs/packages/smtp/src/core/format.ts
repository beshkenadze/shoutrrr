// Vendored from Go pkg/format (formatter.go, format_util.go). Faithful port of
// the field-tag driven config (de)serialization used by services.
import type { EnumFormatter } from './types.js';

/** URLPart maps a field to a positional segment of the service URL (Go: format.URLPart). */
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

/** FieldType is the value type of a config field (Go: reflect.Kind groupings). */
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

/** FieldSchema describes a single config field (Go: struct tags + format.FieldInfo). */
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

/** parseBool mirrors Go format.ParseBool (returns [value, ok]). */
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

/** printBool mirrors Go format.PrintBool ("Yes"/"No"). */
export function printBool(value: boolean): string {
  return value ? 'Yes' : 'No';
}

/**
 * setConfigField parses a raw string and assigns it to config[field.name],
 * mirroring Go format.SetConfigField. Throws on invalid input.
 */
export function setConfigField(
  config: Record<string, unknown>,
  enums: Record<string, EnumFormatter>,
  field: FieldSchema,
  raw: string,
): void {
  const type = field.type ?? 'string';

  switch (type) {
    case 'string': {
      config[field.name] = raw;
      return;
    }
    case 'enum': {
      const formatter = field.enumName ? enums[field.enumName] : undefined;
      if (!formatter) {
        throw new Error(`no enum formatter registered for ${field.name}`);
      }
      const value = formatter.parse(raw);
      if (value === -1) {
        throw new Error(`not a one of ${formatter.names().join(', ')}`);
      }
      config[field.name] = value;
      return;
    }
    case 'int':
    case 'uint': {
      const base = field.base ?? 10;
      // Go uses strconv.ParseInt/ParseUint, which reject any trailing garbage
      // (e.g. "25abc") and, for uint, negatives. parseInt() would accept those,
      // so validate the whole string before trusting it.
      const value = parseInt(raw, base);
      if (Number.isNaN(value) || !Number.isInteger(value)) {
        throw new Error('invalid value for type');
      }
      if (base === 10 && !/^[+-]?\d+$/.test(raw.trim())) {
        throw new Error('invalid value for type');
      }
      if (type === 'uint' && value < 0) {
        throw new Error('invalid value for type');
      }
      config[field.name] = value;
      return;
    }
    case 'float': {
      const value = Number.parseFloat(raw);
      if (Number.isNaN(value)) {
        throw new Error('invalid value for type');
      }
      config[field.name] = value;
      return;
    }
    case 'bool': {
      const [value, ok] = parseBool(raw, false);
      if (!ok) {
        throw new Error('accepted values are 1, true, yes or 0, false, no');
      }
      config[field.name] = value;
      return;
    }
    case 'string[]': {
      const separator = field.separator ?? ',';
      config[field.name] = raw.split(separator);
      return;
    }
    default:
      throw new Error(`unsupported field type ${type}`);
  }
}

/**
 * getConfigFieldString serializes config[field.name] to its string form,
 * mirroring Go format.GetConfigFieldString / getValueNodeValue.
 */
export function getConfigFieldString(
  config: Record<string, unknown>,
  enums: Record<string, EnumFormatter>,
  field: FieldSchema,
): string {
  const type = field.type ?? 'string';
  const value = config[field.name];

  switch (type) {
    case 'enum': {
      const formatter = field.enumName ? enums[field.enumName] : undefined;
      if (!formatter) {
        throw new Error(`no enum formatter registered for ${field.name}`);
      }
      return formatter.print(value as number);
    }
    case 'bool':
      return printBool(value as boolean);
    case 'int':
    case 'uint':
    case 'float':
      return String(value as number);
    case 'string[]': {
      const separator = field.separator ?? ',';
      return (value as string[]).join(separator);
    }
    case 'string':
    default:
      return (value as string) ?? '';
  }
}
