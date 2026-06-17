// Faithful port of Go pkg/format field handling (set_value.go / format.go).
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

/** FieldSchema describes a single config field (mirrors Go struct tags). */
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

/** A config object is a plain record keyed by FieldSchema.name. */
export type ConfigRecord = Record<string, unknown>;

/**
 * ParseBool returns [true] for "1","true","yes","y" or [false] for "0","false","no","n";
 * otherwise [defaultValue, false]. Matches Go's case-insensitive ParseBool.
 */
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

/** PrintBool returns "Yes" for true and "No" for false. */
export function printBool(value: boolean): string {
  return value ? 'Yes' : 'No';
}

/**
 * parseStrictInt parses an integer in the given base, rejecting trailing garbage
 * (e.g. "5x") to mirror Go's strconv.ParseInt. Returns undefined on invalid input.
 */
export function parseStrictInt(raw: string, base: number): number | undefined {
  const value = raw.trim();
  if (value === '') {
    return undefined;
  }
  const sign = value[0] === '-' || value[0] === '+' ? value[0] : '';
  const digits = sign ? value.slice(1) : value;
  if (digits === '') {
    return undefined;
  }
  let pattern: RegExp;
  switch (base) {
    case 2:
      pattern = /^[01]+$/;
      break;
    case 8:
      pattern = /^[0-7]+$/;
      break;
    case 16:
      pattern = /^[0-9a-fA-F]+$/;
      break;
    case 10:
      pattern = /^[0-9]+$/;
      break;
    default:
      return undefined;
  }
  if (!pattern.test(digits)) {
    return undefined;
  }
  const n = Number.parseInt(digits, base);
  if (Number.isNaN(n)) {
    return undefined;
  }
  return sign === '-' ? -n : n;
}

function fieldType(f: FieldSchema): FieldType {
  return f.type ?? 'string';
}

/**
 * setConfigField sets config[f.name] from the raw string according to the field type.
 * Returns true if the value was valid and set. Throws on unrecoverable parse errors
 * (matching the Go contract where enum/prop failures surface as errors).
 */
export function setConfigField(
  config: ConfigRecord,
  f: FieldSchema,
  raw: string,
  enums: Record<string, EnumFormatter>,
): boolean {
  switch (fieldType(f)) {
    case 'string': {
      config[f.name] = raw;
      return true;
    }
    case 'int': {
      const n = parseStrictInt(raw, f.base ?? 10);
      if (n === undefined) {
        return false;
      }
      config[f.name] = n;
      return true;
    }
    case 'uint': {
      const n = parseStrictInt(raw, f.base ?? 10);
      if (n === undefined || n < 0) {
        return false;
      }
      config[f.name] = n;
      return true;
    }
    case 'float': {
      const n = Number.parseFloat(raw);
      if (Number.isNaN(n)) {
        return false;
      }
      config[f.name] = n;
      return true;
    }
    case 'bool': {
      const [parsed, ok] = parseBool(raw, false);
      if (!ok) {
        return false;
      }
      config[f.name] = parsed;
      return true;
    }
    case 'enum': {
      const formatter = enums[f.enumName ?? f.name];
      if (!formatter) {
        throw new Error(`no enum formatter registered for ${f.name}`);
      }
      const value = formatter.parse(raw);
      if (value < 0) {
        throw new Error(`not a one of ${formatter.names().join(', ')}`);
      }
      config[f.name] = value;
      return true;
    }
    case 'string[]': {
      const sep = f.separator ?? ',';
      config[f.name] = raw.split(sep);
      return true;
    }
    case 'prop': {
      const prop = config[f.name] as ConfigProp | undefined;
      if (!prop || typeof prop.setFromProp !== 'function') {
        throw new Error(`field ${f.name} is not a ConfigProp`);
      }
      prop.setFromProp(raw);
      return true;
    }
    case 'prop[]': {
      const sep = f.separator ?? ',';
      const items = raw.split(sep).map((part) => {
        const factory = (config[`${f.name}__factory`] as (() => ConfigProp) | undefined);
        if (!factory) {
          throw new Error(`field ${f.name} has no prop factory`);
        }
        const prop = factory();
        prop.setFromProp(part);
        return prop;
      });
      config[f.name] = items;
      return true;
    }
    default:
      return false;
  }
}

/** getConfigFieldString returns the string serialization of config[f.name]. */
export function getConfigFieldString(
  config: ConfigRecord,
  f: FieldSchema,
  enums: Record<string, EnumFormatter>,
): string {
  const value = config[f.name];
  switch (fieldType(f)) {
    case 'string':
      return value === undefined || value === null ? '' : String(value);
    case 'int':
    case 'uint':
      return String((value as number) ?? 0);
    case 'float':
      return String((value as number) ?? 0);
    case 'bool':
      return printBool(Boolean(value));
    case 'enum': {
      const formatter = enums[f.enumName ?? f.name];
      if (!formatter) {
        throw new Error(`no enum formatter registered for ${f.name}`);
      }
      return formatter.print((value as number) ?? 0);
    }
    case 'string[]': {
      const sep = f.separator ?? ',';
      return ((value as string[] | undefined) ?? []).join(sep);
    }
    case 'prop': {
      const prop = value as ConfigProp | undefined;
      return prop ? prop.getPropValue() : '';
    }
    case 'prop[]': {
      const sep = f.separator ?? ',';
      return ((value as ConfigProp[] | undefined) ?? [])
        .map((p) => p.getPropValue())
        .join(sep);
    }
    default:
      return '';
  }
}
