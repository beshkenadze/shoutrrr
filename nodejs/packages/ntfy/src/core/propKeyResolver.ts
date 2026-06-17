// Ported from Go pkg/format/prop_key_resolver.go and format_query.go.
import type { EnumFormatter, Params } from './types.js';
import {
  encodeQueryComponent,
  type FieldSchema,
  getConfigFieldString,
  setConfigField,
} from './format.js';

type ConfigRecord = Record<string, unknown>;

/**
 * PropKeyResolver maps URL query keys to config fields, mirroring the Go
 * reflection-based resolver using an explicit FieldSchema[].
 */
export class PropKeyResolver {
  private readonly config: ConfigRecord;
  private readonly enums: Record<string, EnumFormatter>;
  private readonly keyFields: Map<string, FieldSchema>;
  private readonly keys: string[];

  constructor(
    config: ConfigRecord,
    schema: FieldSchema[],
    enums: Record<string, EnumFormatter> = {},
  ) {
    this.config = config;
    this.enums = enums;
    this.keyFields = new Map();
    const keys: string[] = [];

    for (const field of schema) {
      for (const rawKey of field.key ?? []) {
        const key = rawKey.toLowerCase();
        if (key !== '') {
          keys.push(key);
          this.keyFields.set(key, field);
        }
      }
    }

    keys.sort();
    this.keys = keys;
  }

  /** queryFields returns the sorted list of tagged keys. */
  queryFields(): string[] {
    return this.keys;
  }

  /** keyIsPrimary returns whether the key is the field's primary key (not an alias). */
  private keyIsPrimary(key: string): boolean {
    const field = this.keyFields.get(key);
    return field?.key?.[0] === key;
  }

  /** isDefault returns whether the serialized value equals the field's default. */
  private isDefault(key: string, value: string): boolean {
    const field = this.keyFields.get(key);
    return (field?.default ?? '') === value;
  }

  /** get returns the serialized value of the config property tagged with key. */
  get(key: string): string {
    const field = this.keyFields.get(key.toLowerCase());
    if (!field) {
      throw new Error(`${key} is not a valid config key`);
    }
    return getConfigFieldString(this.config, field, this.enums);
  }

  /** set assigns the config property tagged with key to value. */
  set(key: string, value: string): void {
    const field = this.keyFields.get(key.toLowerCase());
    if (!field) {
      throw new Error(`${key} is not a valid config key ${this.keys.join(',')}`);
    }
    setConfigField(this.config, field, value, this.enums);
  }

  /**
   * updateConfigFromParams applies params onto the bound config. The first error
   * encountered is thrown after attempting all params, mirroring the Go contract
   * of returning the first error.
   */
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

  /** setFromURL applies the URL's query parameters onto the bound config. */
  setFromURL(url: URL): void {
    for (const [key, val] of url.searchParams.entries()) {
      this.set(key, val);
    }
  }

  /**
   * buildQuery returns the non-default config values as a Go-compatible
   * url.Values.Encode() string: primary keys only, defaults omitted, keys
   * sorted, values escaped like Go QueryEscape. Mirrors Go format.BuildQuery.
   */
  buildQuery(): string {
    const parts: string[] = [];
    for (const key of this.keys) {
      if (!this.keyIsPrimary(key)) {
        continue;
      }
      let value: string;
      try {
        value = this.get(key);
      } catch {
        continue;
      }
      if (this.isDefault(key, value)) {
        continue;
      }
      parts.push(`${encodeQueryComponent(key)}=${encodeQueryComponent(value)}`);
    }
    return parts.join('&');
  }
}
