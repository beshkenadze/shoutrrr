import type { ConfigQueryResolver, EnumFormatter } from './types.js';

/** Parts of a URL that a config field may be bound to. */
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

/** Supported config field types. */
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

/** Schema describing a single config field, ported from the Go struct tags. */
export interface FieldSchema {
  name: string;
  type?: FieldType;
  /** Query keys, first is primary, rest are aliases. Defaults to [name lowercased]. */
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

/** KeyPrefix is prepended to custom URL query keys that conflict with service config prop keys. */
export const KeyPrefix = '__';

/** EscapeKey adds the KeyPrefix to custom URL query keys that conflict with config prop keys. */
export function escapeKey(key: string): string {
  return KeyPrefix + key;
}

/** UnescapeKey removes the KeyPrefix from custom URL query keys. */
export function unescapeKey(key: string): string {
  return key.startsWith(KeyPrefix) ? key.slice(KeyPrefix.length) : key;
}

/**
 * ParseBool returns [true, true] for "1"/"true"/"yes", [false, true] for "0"/"false"/"no",
 * and [defaultValue, false] otherwise. Faithful port of Go `format.ParseBool`.
 */
export function parseBool(value: string, defaultValue: boolean): [boolean, boolean] {
  switch (value.toLowerCase()) {
    case 'true':
    case 'yes':
    case '1':
      return [true, true];
    case 'false':
    case 'no':
    case '0':
      return [false, true];
    default:
      return [defaultValue, false];
  }
}

/** PrintBool returns "Yes" if value is true, otherwise "No". */
export function printBool(value: boolean): string {
  return value ? 'Yes' : 'No';
}

type FieldValue = string | number | boolean | string[];

/**
 * Sets a config field from a raw string value, mirroring Go `format.SetConfigField`.
 * Returns the coerced value, or throws if the value is invalid for the field type.
 */
export function setConfigField(field: FieldSchema, raw: string, enums?: Record<string, EnumFormatter>): FieldValue {
  switch (field.type ?? 'string') {
    case 'bool': {
      const [value, ok] = parseBool(raw, false);
      if (!ok) {
        throw new Error('accepted values are 1, true, yes or 0, false, no');
      }
      return value;
    }
    case 'int':
    case 'uint': {
      const parsed = Number.parseInt(raw, field.base ?? 10);
      if (Number.isNaN(parsed)) {
        throw new Error(`invalid integer value for ${field.name}`);
      }
      // Go's strconv.ParseUint rejects negative values; ParseInt allows them.
      if (field.type === 'uint' && parsed < 0) {
        throw new Error(`invalid unsigned integer value for ${field.name}`);
      }
      return parsed;
    }
    case 'float': {
      const parsed = Number.parseFloat(raw);
      if (Number.isNaN(parsed)) {
        throw new Error(`invalid float value for ${field.name}`);
      }
      return parsed;
    }
    case 'enum': {
      const formatter = field.enumName ? enums?.[field.enumName] : undefined;
      if (!formatter) {
        throw new Error(`no enum formatter for ${field.name}`);
      }
      const value = formatter.parse(raw);
      if (value < 0) {
        throw new Error('not a valid enum value');
      }
      return value;
    }
    case 'string[]':
    case 'prop[]':
      return raw.split(field.separator ?? ',');
    default:
      return raw;
  }
}

/** Serializes a config field value to its query string representation, mirroring Go `format.GetConfigFieldString`. */
export function getConfigFieldString(field: FieldSchema, value: FieldValue, enums?: Record<string, EnumFormatter>): string {
  switch (field.type ?? 'string') {
    case 'bool':
      return printBool(Boolean(value));
    case 'enum': {
      const formatter = field.enumName ? enums?.[field.enumName] : undefined;
      if (!formatter) {
        return String(value);
      }
      return formatter.print(Number(value));
    }
    case 'string[]':
    case 'prop[]':
      return (value as string[]).join(field.separator ?? ',');
    default:
      return String(value);
  }
}

/**
 * BuildQueryWithCustomFields converts the fields of a config object to a query, escaping any custom
 * fields that share the same key as a config prop using the "__" prefix. Faithful port of the Go function.
 */
export function buildQueryWithCustomFields(cqr: ConfigQueryResolver, query: URLSearchParams): URLSearchParams {
  const fields = cqr.queryFields();
  const skipEscape = [...query.keys()].length < 1;
  const pkr = cqr as Partial<{ keyIsPrimary(key: string): boolean; isDefault(key: string, value: string): boolean }>;
  const isPkr = typeof pkr.keyIsPrimary === 'function' && typeof pkr.isDefault === 'function';

  for (const key of fields) {
    if (!skipEscape) {
      // Escape any webhook query keys using the same name as service props.
      const escValues = query.getAll(key);
      if (escValues.length > 0) {
        query.delete(key);
        for (const v of escValues) {
          query.append(escapeKey(key), v);
        }
      }
    }

    if (isPkr && !pkr.keyIsPrimary!(key)) {
      continue;
    }

    let value: string;
    try {
      value = cqr.get(key);
    } catch {
      continue;
    }

    if (isPkr && pkr.isDefault!(key, value)) {
      continue;
    }

    query.set(key, value);
  }

  return query;
}

/**
 * SetConfigPropsFromQuery sets config props from query values and returns a query with all config
 * prop keys removed and escaped keys unescaped. Faithful port of the Go function.
 */
export function setConfigPropsFromQuery(cqr: ConfigQueryResolver, query: URLSearchParams): URLSearchParams {
  let firstError: Error | undefined;
  for (const key of cqr.queryFields()) {
    const values = query.getAll(key);
    if (values.length > 0) {
      try {
        cqr.set(key, values[0] as string);
      } catch (err) {
        if (!firstError) {
          firstError = err instanceof Error ? err : new Error(String(err));
        }
      }
    }
    query.delete(key);

    const escKey = escapeKey(key);
    const escValues = query.getAll(escKey);
    if (escValues.length > 0) {
      query.delete(escKey);
      for (const v of escValues) {
        query.append(key, v);
      }
    }
  }
  if (firstError) {
    throw firstError;
  }
  return query;
}
