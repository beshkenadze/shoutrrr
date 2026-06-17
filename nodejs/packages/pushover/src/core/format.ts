import type { EnumFormatter } from './types.js';

/** URLPart identifies which part of a config URL a field is sourced from. */
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

/** FieldType is the value kind of a config field. */
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

/** FieldSchema describes a single config field for (de)serialization. */
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
  /** Bit width for int/uint fields (mirrors Go's field.Type.Bits(), e.g. 8 for int8). */
  bits?: number;
}

/** A config record is a plain object whose fields are set by name. */
export type ConfigRecord = Record<string, unknown>;

/**
 * parseBool mirrors Go's format.ParseBool: accepts 1/true/yes and 0/false/no
 * (case-insensitive). Returns [value, ok]; ok is false for unrecognized input.
 */
export function parseBool(value: string): [boolean, boolean] {
  switch (value.toLowerCase()) {
    case '1':
    case 'true':
    case 'yes':
      return [true, true];
    case '0':
    case 'false':
    case 'no':
      return [false, true];
    default:
      return [false, false];
  }
}

/**
 * stripNumberPrefix mirrors Go's util.StripNumberPrefix: detects a base from a
 * 0x/0o/0b prefix and returns the remaining digits plus the base.
 */
function stripNumberPrefix(raw: string): [string, number] {
  if (raw.length > 1) {
    const sign = raw[0] === '-' || raw[0] === '+' ? raw[0] : '';
    const body = sign ? raw.slice(1) : raw;
    if (body.length > 2 && body[0] === '0') {
      switch (body[1]!.toLowerCase()) {
        case 'x':
          return [sign + body.slice(2), 16];
        case 'o':
          return [sign + body.slice(2), 8];
        case 'b':
          return [sign + body.slice(2), 2];
        default:
          break;
      }
    }
  }
  return [raw, 10];
}

/**
 * setConfigField deserializes a raw string into the typed field on the config.
 * Returns [valid, error]; error is non-null on parse failure, valid is false
 * when the value is rejected. Mirrors Go format.SetConfigField for the field
 * types used by services.
 */
export function setConfigField(
  config: ConfigRecord,
  field: FieldSchema,
  raw: string,
  enums: Record<string, EnumFormatter> = {},
): [boolean, Error | null] {
  const type = field.type ?? 'string';

  switch (type) {
    case 'string':
      config[field.name] = raw;
      return [true, null];

    case 'enum': {
      const formatter = field.enumName ? enums[field.enumName] : undefined;
      if (!formatter) {
        return [false, new Error('no enum formatter for field')];
      }
      const value = formatter.parse(raw);
      if (value < 0) {
        return [false, new Error(`not a one of ${formatter.names().join(', ')}`)];
      }
      config[field.name] = value;
      return [true, null];
    }

    case 'int': {
      const [number, detectedBase] = stripNumberPrefix(raw);
      const base = field.base ?? detectedBase;
      const parsed = parseIntStrict(number, base);
      if (parsed === null) {
        return [false, new Error('invalid integer value')];
      }
      // Mirror Go strconv.ParseInt(.., field.Type.Bits()): reject out-of-range.
      if (field.bits !== undefined && !inSignedRange(parsed, field.bits)) {
        return [false, new Error('value out of range')];
      }
      config[field.name] = parsed;
      return [true, null];
    }

    case 'uint': {
      const [number, detectedBase] = stripNumberPrefix(raw);
      const base = field.base ?? detectedBase;
      const parsed = parseIntStrict(number, base);
      if (parsed === null || parsed < 0 || Object.is(parsed, -0)) {
        return [false, new Error('invalid unsigned integer value')];
      }
      if (field.bits !== undefined && parsed > 2 ** field.bits - 1) {
        return [false, new Error('value out of range')];
      }
      config[field.name] = parsed;
      return [true, null];
    }

    case 'float': {
      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) {
        return [false, new Error('invalid float value')];
      }
      config[field.name] = parsed;
      return [true, null];
    }

    case 'bool': {
      const [value, ok] = parseBool(raw);
      if (!ok) {
        return [false, new Error('accepted values are 1, true, yes or 0, false, no')];
      }
      config[field.name] = value;
      return [true, null];
    }

    case 'string[]': {
      const separator = field.separator ?? ',';
      config[field.name] = raw.split(separator);
      return [true, null];
    }

    default:
      return [false, new Error(`invalid field kind ${type}`)];
  }
}

/** inSignedRange reports whether value fits in a signed integer of `bits` width. */
function inSignedRange(value: number, bits: number): boolean {
  const max = 2 ** (bits - 1) - 1;
  const min = -(2 ** (bits - 1));
  return value >= min && value <= max;
}

/** parseIntStrict parses an integer in the given base, returning null on failure. */
function parseIntStrict(raw: string, base: number): number | null {
  if (raw === '' || raw === '+' || raw === '-') {
    return null;
  }
  let body = raw;
  let sign = 1;
  if (body[0] === '+') {
    body = body.slice(1);
  } else if (body[0] === '-') {
    sign = -1;
    body = body.slice(1);
  }
  const valid =
    base === 16
      ? /^[0-9a-fA-F]+$/.test(body)
      : base === 8
        ? /^[0-7]+$/.test(body)
        : base === 2
          ? /^[01]+$/.test(body)
          : /^[0-9]+$/.test(body);
  if (!valid) {
    return null;
  }
  const parsed = parseInt(body, base);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return sign * parsed;
}

/**
 * getConfigFieldString serializes a config field to its string representation.
 * Mirrors Go format.GetConfigFieldString: bool -> "Yes"/"No", string[] joined
 * by the separator, enum via the formatter, numbers via String().
 */
export function getConfigFieldString(
  config: ConfigRecord,
  field: FieldSchema,
  enums: Record<string, EnumFormatter> = {},
): string {
  const type = field.type ?? 'string';
  const value = config[field.name];

  switch (type) {
    case 'string':
      return value === undefined || value === null ? '' : String(value);

    case 'enum': {
      const formatter = field.enumName ? enums[field.enumName] : undefined;
      if (formatter && typeof value === 'number') {
        return formatter.print(value);
      }
      return '';
    }

    case 'bool':
      return value ? 'Yes' : 'No';

    case 'string[]': {
      const separator = field.separator ?? ',';
      return Array.isArray(value) ? value.join(separator) : '';
    }

    case 'int':
    case 'uint':
    case 'float':
      return value === undefined || value === null ? '' : String(value);

    default:
      return value === undefined || value === null ? '' : String(value);
  }
}
