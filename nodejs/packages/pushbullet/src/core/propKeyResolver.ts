// Vendored core kit — faithful port of Go pkg/format PropKeyResolver.

import type { EnumFormatter, Params } from './types.js';
import {
  type FieldSchema,
  getConfigFieldString,
  setConfigField,
} from './format.js';

type ConfigValue = string | number | boolean | string[];
type ConfigRecord = Record<string, ConfigValue>;

/**
 * PropKeyResolver maps query/param keys (the `key` tags in Go) to config fields,
 * mirroring Go format.PropKeyResolver. Only fields that declare `key` participate.
 */
export class PropKeyResolver {
  private readonly config: ConfigRecord;
  private readonly enums: Record<string, EnumFormatter>;
  private readonly keyFields: Map<string, FieldSchema> = new Map();
  private readonly keys: string[] = [];

  constructor(
    config: ConfigRecord,
    schema: FieldSchema[],
    enums: Record<string, EnumFormatter> = {},
  ) {
    this.config = config;
    this.enums = enums;

    for (const field of schema) {
      for (const key of field.key ?? []) {
        const lower = key.toLowerCase();
        if (lower !== '') {
          this.keys.push(lower);
          this.keyFields.set(lower, field);
        }
      }
    }
    this.keys.sort();
  }

  /** Returns the sorted list of tagged keys. */
  queryFields(): string[] {
    return this.keys;
  }

  /** Returns the string value of the config property tagged with `key`. */
  get(key: string): string {
    const field = this.keyFields.get(key.toLowerCase());
    if (!field) {
      throw new Error(`${key} is not a valid config key`);
    }
    return getConfigFieldString(this.config, field, this.enums);
  }

  /** Sets the config property tagged with `key` from its string representation. */
  set(key: string, value: string): void {
    const field = this.keyFields.get(key.toLowerCase());
    if (!field) {
      throw new Error(`${key} is not a valid config key ${this.keys.join(',')}`);
    }
    const valid = setConfigField(this.config, field, value, this.enums);
    if (!valid) {
      throw new Error('invalid value for type');
    }
  }

  /** Applies the provided params to the config, mirroring UpdateConfigFromParams. */
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

  /**
   * Reads query values from the URL into the config, mirroring Go's
   * `for key, vals := range url.Query() { resolver.Set(key, vals[0]) }`:
   * it iterates the URL's actual query keys (first value each) and throws on
   * the first unknown/invalid key.
   */
  setFromURL(url: URL): void {
    const seen = new Set<string>();
    for (const key of url.searchParams.keys()) {
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      const value = url.searchParams.get(key);
      if (value !== null) {
        this.set(key, value);
      }
    }
  }

  /** Returns whether the value equals the field's default value. */
  private isDefault(key: string, value: string): boolean {
    const field = this.keyFields.get(key.toLowerCase());
    return (field?.default ?? '') === value;
  }

  /** Writes non-default tagged values onto the URL query string (BuildQuery). */
  bindToURL(url: URL): void {
    for (const key of this.keys) {
      const value = this.get(key);
      if (this.isDefault(key, value)) {
        continue;
      }
      url.searchParams.set(key, value);
    }
  }
}
