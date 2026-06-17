// Ported from Go pkg/format (formatter.go, format.go, node.go, field_info.go).
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

/** FieldSchema is the static meta-data describing a single config field. */
export interface FieldSchema {
  /** name is the property name on the config object. */
  name: string;
  type?: FieldType;
  /** key holds the query keys; key[0] is the primary key, the rest are aliases. */
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

/**
 * encodeQueryComponent mirrors Go net/url QueryEscape: unreserved chars
 * (A-Za-z0-9-._~) pass through, space becomes '+', everything else is
 * percent-encoded uppercase. This matches url.Values.Encode() so serialized
 * query strings are byte-identical to the Go reference.
 */
export function encodeQueryComponent(s: string): string {
  let out = '';
  for (const ch of s) {
    if (/[A-Za-z0-9\-._~]/.test(ch)) {
      out += ch;
    } else if (ch === ' ') {
      out += '+';
    } else {
      for (const byte of new TextEncoder().encode(ch)) {
        out += `%${byte.toString(16).toUpperCase().padStart(2, '0')}`;
      }
    }
  }
  return out;
}

/**
 * encodeUserinfoComponent mirrors Go net/url userinfo escaping (the mode used
 * by url.UserPassword). The literal set, verified against Go's url.UserPassword
 * output, is the unreserved chars plus the sub-delims $ & + , ; = (space and
 * everything else are percent-encoded; note ! and ' are escaped).
 */
export function encodeUserinfoComponent(s: string): string {
  const keep = /[A-Za-z0-9\-._~$&+,;=]/;
  let out = '';
  for (const ch of s) {
    if (keep.test(ch)) {
      out += ch;
    } else {
      for (const byte of new TextEncoder().encode(ch)) {
        out += `%${byte.toString(16).toUpperCase().padStart(2, '0')}`;
      }
    }
  }
  return out;
}

/** ParseBool returns true for 1/true/yes/y, false for 0/false/no/n. ok=false otherwise. */
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

/** PrintBool returns "Yes" for true, "No" for false. */
export function printBool(value: boolean): string {
  return value ? 'Yes' : 'No';
}

/** stripNumberPrefix mirrors Go util.StripNumberPrefix: leading "#" denotes hex. */
function stripNumberPrefix(input: string): { number: string; base: number } {
  if (input.startsWith('#')) {
    return { number: input.slice(1), base: 16 };
  }
  return { number: input, base: 0 };
}

type ConfigRecord = Record<string, unknown>;

/**
 * setConfigField deserializes inputValue and assigns it to config[field.name].
 * Throws on invalid values, mirroring the Go (valid,err) contract.
 */
export function setConfigField(
  config: ConfigRecord,
  field: FieldSchema,
  inputValue: string,
  enums: Record<string, EnumFormatter>,
): void {
  const type = field.type ?? 'string';

  if (field.enumName) {
    const formatter = enums[field.enumName];
    if (!formatter) {
      throw new Error(`no enum formatter for ${field.enumName}`);
    }
    const value = formatter.parse(inputValue);
    if (value === -1) {
      throw new Error(`not a one of ${formatter.names().join(', ')}`);
    }
    config[field.name] = value;
    return;
  }

  switch (type) {
    case 'string':
      config[field.name] = inputValue;
      return;
    case 'int':
    case 'uint': {
      const { number, base } = stripNumberPrefix(inputValue);
      const parsed = parseInt(number, base || (field.base ?? 10));
      if (Number.isNaN(parsed)) {
        throw new Error(`invalid number value: ${inputValue}`);
      }
      config[field.name] = parsed;
      return;
    }
    case 'float': {
      const parsed = Number.parseFloat(inputValue);
      if (Number.isNaN(parsed)) {
        throw new Error(`invalid number value: ${inputValue}`);
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
    case 'string[]': {
      const sep = field.separator ?? ',';
      config[field.name] = inputValue.split(sep);
      return;
    }
    default:
      throw new Error(`invalid field type ${type}`);
  }
}

/** getConfigFieldString serializes config[field.name] to its string representation. */
export function getConfigFieldString(
  config: ConfigRecord,
  field: FieldSchema,
  enums: Record<string, EnumFormatter>,
): string {
  const type = field.type ?? 'string';
  const raw = config[field.name];

  if (field.enumName) {
    const formatter = enums[field.enumName];
    if (!formatter) {
      throw new Error(`no enum formatter for ${field.enumName}`);
    }
    return formatter.print(raw as number);
  }

  switch (type) {
    case 'string':
      return raw as string;
    case 'int':
    case 'uint':
    case 'float': {
      const base = field.base && field.base !== 0 ? field.base : 10;
      const num = raw as number;
      if (base === 16) {
        return `0x${num.toString(16)}`;
      }
      return num.toString(base);
    }
    case 'bool':
      return printBool(raw as boolean);
    case 'string[]': {
      const sep = field.separator ?? ',';
      return (raw as string[]).join(sep);
    }
    default:
      throw new Error(`invalid field type ${type}`);
  }
}
