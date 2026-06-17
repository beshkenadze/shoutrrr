// Faithful port of Go pkg/format/prop_key_resolver.go + format_query.go BuildQuery.

import type { EnumFormatter, Params, ServiceConfig } from './types.js';
import {
  getConfigFieldString,
  setConfigField,
  type FieldSchema,
} from './format.js';

const queryEncoder = new TextEncoder();

/**
 * goQueryEscape mirrors Go's url.QueryEscape: space encodes to '+', and the
 * RFC 3986 unreserved set plus a few sub-delims that Go leaves unescaped stay
 * literal. Everything else is percent-encoded with uppercase hex.
 */
function goQueryEscape(value: string): string {
  let out = '';
  for (const ch of value) {
    if (
      (ch >= 'A' && ch <= 'Z') ||
      (ch >= 'a' && ch <= 'z') ||
      (ch >= '0' && ch <= '9') ||
      ch === '-' ||
      ch === '_' ||
      ch === '.' ||
      ch === '~'
    ) {
      out += ch;
    } else if (ch === ' ') {
      out += '+';
    } else {
      const bytes = queryEncoder.encode(ch);
      for (const b of bytes) {
        out += '%' + b.toString(16).toUpperCase().padStart(2, '0');
      }
    }
  }
  return out;
}

/** encodeQuery mirrors Go's url.Values.Encode (keys sorted, '&'-joined). */
function encodeQuery(values: Record<string, string>): string {
  const keys = Object.keys(values).sort();
  return keys
    .map((k) => `${goQueryEscape(k)}=${goQueryEscape(values[k]!)}`)
    .join('&');
}

/**
 * PropKeyResolver implements ConfigQueryResolver for configs that use key tags
 * for their query props.
 */
export class PropKeyResolver {
  private readonly config: ServiceConfig & Record<string, unknown>;
  private readonly keyFields: Record<string, FieldSchema>;
  private readonly keys: string[];
  private readonly schema: FieldSchema[];

  constructor(config: ServiceConfig, schema: FieldSchema[]) {
    this.config = config as ServiceConfig & Record<string, unknown>;
    this.schema = schema;
    this.keyFields = {};
    const keys: string[] = [];
    for (const field of schema) {
      for (const rawKey of field.key ?? []) {
        const key = rawKey.toLowerCase();
        if (key !== '') {
          keys.push(key);
          this.keyFields[key] = field;
        }
      }
    }
    keys.sort();
    this.keys = keys;
  }

  private get enums(): Record<string, EnumFormatter> {
    return this.config.enums();
  }

  /** queryFields returns the tagged keys in alphabetical order. */
  queryFields(): string[] {
    return [...this.keys];
  }

  /** get returns the string value of the prop tagged with key. */
  get(key: string): string {
    const field = this.keyFields[key.toLowerCase()];
    if (!field) {
      throw new Error(`${key} is not a valid config key`);
    }
    return getConfigFieldString(this.config, field, this.enums);
  }

  /** set assigns value to the prop tagged with key. */
  set(key: string, value: string): void {
    const field = this.keyFields[key.toLowerCase()];
    if (!field) {
      throw new Error(`${key} is not a valid config key ${JSON.stringify(this.keys)}`);
    }
    const valid = setConfigField(this.config, field, value, this.enums);
    if (!valid) {
      throw new Error('invalid value for type');
    }
  }

  /** keyIsPrimary reports whether key is the field's primary (non-alias) key. */
  keyIsPrimary(key: string): boolean {
    const normalized = key.toLowerCase();
    const field = this.keyFields[normalized];
    return field?.key?.[0]?.toLowerCase() === normalized;
  }

  /** isDefault reports whether value equals the field's default value. */
  isDefault(key: string, value: string): boolean {
    return (this.keyFields[key]?.default ?? '') === value;
  }

  /** updateConfigFromParams sets config props from the supplied params. */
  updateConfigFromParams(params?: Params): void {
    if (!params) {
      return;
    }
    let firstError: unknown;
    for (const [key, val] of Object.entries(params)) {
      try {
        this.set(key, val);
      } catch (err) {
        if (firstError === undefined) {
          firstError = err;
        }
      }
    }
    if (firstError !== undefined) {
      throw firstError;
    }
  }

  /** setFromURL populates config props from a URL's query string. */
  setFromURL(url: URL): void {
    for (const [key, value] of url.searchParams.entries()) {
      this.set(key, value);
    }
  }

  /** buildQuery serializes the non-default props into a Go-compatible query string. */
  buildQuery(): string {
    const query: Record<string, string> = {};
    for (const key of this.keys) {
      if (!this.keyIsPrimary(key)) {
        continue;
      }
      const value = this.get(key);
      if (this.isDefault(key, value)) {
        continue;
      }
      query[key] = value;
    }
    return encodeQuery(query);
  }

  /** bindToURL writes the serialized query onto the given URL. */
  bindToURL(url: URL): void {
    url.search = this.buildQuery();
  }
}
