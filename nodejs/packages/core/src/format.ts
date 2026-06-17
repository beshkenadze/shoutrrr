/**
 * Config field (de)serialization — port of Go `pkg/format/formatter.go`
 * + `pkg/format/format.go`, with Go's struct reflection replaced by an
 * explicit field schema.
 *
 * Each service describes its config fields as a `FieldSchema[]`. `setConfigField`
 * parses a raw string into the typed config property; `getConfigFieldString`
 * serializes it back. This mirrors the Go SetConfigField/GetConfigFieldString
 * behaviour (bool => "Yes"/"No", enum via EnumFormatter, comma-split slices).
 */
import type { EnumFormatter } from './types.ts';

/** Which part of a URL a field maps to (besides query params). */
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

/** Schema describing a single config field. */
export interface FieldSchema {
  /** Property name on the config object. */
  name: string;
  /** Value type (defaults to 'string'). */
  type?: FieldType;
  /** Query keys; key[0] is the primary key, the rest are aliases. */
  key?: string[];
  /** URL parts this field maps to. */
  urlParts?: URLPart[];
  /** Default value (as a raw string). */
  default?: string;
  /** Whether the field is required. */
  required?: boolean;
  /** Numeric base for int/uint parsing (defaults to 10). */
  base?: number;
  /** Separator for string[] fields (defaults to ','). */
  separator?: string;
  /** Name of the EnumFormatter (looked up in the enums map) for enum fields. */
  enumName?: string;
  /** Whether the field acts as a notification title. */
  title?: boolean;
  /** Human-readable description. */
  desc?: string;
}

/** Parses "true"/"1"/"yes"/"y" => true, "false"/"0"/"no"/"n" => false. */
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

/** Serializes a bool as "Yes"/"No". */
export function printBool(value: boolean): string {
  return value ? 'Yes' : 'No';
}

function fieldType(f: FieldSchema): FieldType {
  return f.type ?? 'string';
}

function parseIntStrict(raw: string, base: number, signed: boolean): number {
  // Mirror Go's strconv.ParseInt/ParseUint: reject trailing garbage and empty.
  const trimmed = raw.trim();
  if (trimmed === '') {
    throw new Error(`invalid number: ${JSON.stringify(raw)}`);
  }
  const negative = signed && trimmed.startsWith('-');
  const body = negative ? trimmed.slice(1) : trimmed;
  const re =
    base === 16
      ? /^[0-9a-fA-F]+$/
      : base === 8
        ? /^[0-7]+$/
        : base === 2
          ? /^[01]+$/
          : /^[0-9]+$/;
  if (!re.test(body)) {
    throw new Error(`invalid number ${JSON.stringify(raw)} for base ${base}`);
  }
  const n = parseInt(body, base);
  if (Number.isNaN(n)) {
    throw new Error(`invalid number: ${JSON.stringify(raw)}`);
  }
  const value = negative ? -n : n;
  if (!signed && value < 0) {
    throw new Error(`negative value not allowed: ${JSON.stringify(raw)}`);
  }
  return value;
}

/**
 * Deserializes `raw` and assigns it to `config[f.name]` according to the field
 * schema. Throws on invalid values (matching Go's error returns).
 */
export function setConfigField(
  config: Record<string, unknown>,
  f: FieldSchema,
  raw: string,
  enums: Record<string, EnumFormatter>,
): void {
  const type = fieldType(f);

  switch (type) {
    case 'string':
    case 'prop':
      config[f.name] = raw;
      return;
    case 'enum': {
      const enumName = f.enumName ?? f.name;
      const formatter = enums[enumName];
      if (!formatter) {
        throw new Error(`no enum formatter registered for ${enumName}`);
      }
      const value = formatter.parse(raw);
      if (value === -1) {
        throw new Error(`not a one of ${formatter.names().join(', ')}`);
      }
      config[f.name] = value;
      return;
    }
    case 'int':
      config[f.name] = parseIntStrict(raw, f.base ?? 10, true);
      return;
    case 'uint':
      config[f.name] = parseIntStrict(raw, f.base ?? 10, false);
      return;
    case 'float': {
      const n = Number(raw);
      if (Number.isNaN(n) || raw.trim() === '') {
        throw new Error(`invalid float: ${JSON.stringify(raw)}`);
      }
      config[f.name] = n;
      return;
    }
    case 'bool': {
      const { value, ok } = parseBool(raw, false);
      if (!ok) {
        throw new Error('accepted values are 1, true, yes or 0, false, no');
      }
      config[f.name] = value;
      return;
    }
    case 'string[]':
    case 'prop[]':
      config[f.name] = raw.split(f.separator ?? ',');
      return;
    default: {
      const exhaustive: never = type;
      throw new Error(`invalid field type ${String(exhaustive)}`);
    }
  }
}

/**
 * Serializes `config[f.name]` to its string representation according to the
 * field schema. Mirrors Go's GetConfigFieldString.
 */
export function getConfigFieldString(
  config: Record<string, unknown>,
  f: FieldSchema,
  enums: Record<string, EnumFormatter>,
): string {
  const type = fieldType(f);
  const value = config[f.name];

  switch (type) {
    case 'string':
    case 'prop':
      return value === undefined || value === null ? '' : String(value);
    case 'enum': {
      const enumName = f.enumName ?? f.name;
      const formatter = enums[enumName];
      if (!formatter) {
        throw new Error(`no enum formatter registered for ${enumName}`);
      }
      return formatter.print(Number(value ?? 0));
    }
    case 'int':
    case 'uint': {
      const base = f.base ?? 10;
      const n = Number(value ?? 0);
      return n.toString(base);
    }
    case 'float':
      return String(Number(value ?? 0));
    case 'bool':
      return printBool(Boolean(value));
    case 'string[]':
    case 'prop[]': {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      return arr.join(f.separator ?? ',');
    }
    default: {
      const exhaustive: never = type;
      throw new Error(`invalid field type ${String(exhaustive)}`);
    }
  }
}
