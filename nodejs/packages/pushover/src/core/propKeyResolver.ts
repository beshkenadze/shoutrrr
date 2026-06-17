import type { EnumFormatter, Params } from './types.js';
import {
  type ConfigRecord,
  type FieldSchema,
  getConfigFieldString,
  setConfigField,
} from './format.js';

/**
 * PropKeyResolver implements query-prop (de)serialization for a config object
 * driven by per-field `key` tags. Faithful port of Go format.PropKeyResolver
 * for the field types services use.
 */
export class PropKeyResolver {
  private readonly config: ConfigRecord;
  private readonly enums: Record<string, EnumFormatter>;
  private readonly keyFields = new Map<string, FieldSchema>();
  private readonly defaults = new Map<string, string>();
  private readonly keys: string[];

  constructor(config: ConfigRecord, schema: FieldSchema[], enums: Record<string, EnumFormatter> = {}) {
    this.config = config;
    this.enums = enums;

    const keys: string[] = [];
    for (const field of schema) {
      for (const rawKey of field.key ?? []) {
        const key = rawKey.toLowerCase();
        if (key !== '') {
          keys.push(key);
          this.keyFields.set(key, field);
          this.defaults.set(key, field.default ?? '');
        }
      }
    }
    keys.sort();
    this.keys = keys;

    // Apply default values to the bound config for any unset field.
    for (const field of schema) {
      if (field.default !== undefined && config[field.name] === undefined) {
        setConfigField(config, field, field.default, this.enums);
      }
    }
  }

  /** queryFields returns the sorted list of tagged keys. */
  queryFields(): string[] {
    return this.keys;
  }

  /** get returns the serialized value of the field bound to the key. */
  get(key: string): string {
    const field = this.keyFields.get(key.toLowerCase());
    if (!field) {
      throw new Error(`${key} is not a valid config key`);
    }
    return getConfigFieldString(this.config, field, this.enums);
  }

  /** set deserializes the value into the field bound to the key. */
  set(key: string, value: string): void {
    const field = this.keyFields.get(key.toLowerCase());
    if (!field) {
      throw new Error(`${key} is not a valid config key ${this.keys.join(',')}`);
    }
    const [valid, err] = setConfigField(this.config, field, value, this.enums);
    if (err) {
      throw err;
    }
    if (!valid) {
      throw new Error('invalid value for type');
    }
  }

  /** isDefault reports whether the serialized value equals the field default. */
  isDefault(key: string, value: string): boolean {
    return this.defaults.get(key.toLowerCase()) === value;
  }

  /**
   * updateConfigFromParams applies runtime params to the bound config.
   * The first error encountered is thrown after attempting all params.
   */
  updateConfigFromParams(params?: Params): void {
    if (!params) {
      return;
    }
    let firstError: Error | null = null;
    for (const [key, value] of Object.entries(params)) {
      try {
        this.set(key, value);
      } catch (err) {
        if (!firstError) {
          firstError = err instanceof Error ? err : new Error(String(err));
        }
      }
    }
    if (firstError) {
      throw firstError;
    }
  }

  /** setFromURL sets all tagged config props from the URL query string. */
  setFromURL(url: URL): void {
    for (const [key, value] of url.searchParams.entries()) {
      this.set(key, value);
    }
  }

  /**
   * bindToURL writes the non-default tagged props as query params on the URL,
   * mirroring Go format.BuildQuery (values equal to default are omitted).
   */
  bindToURL(url: URL): void {
    for (const key of this.keys) {
      const value = this.get(key);
      if (this.isDefault(key, value)) {
        continue;
      }
      url.searchParams.set(key, value);
    }
  }

  /** buildQuery returns the encoded non-default query string for the config. */
  buildQuery(): string {
    const params = new URLSearchParams();
    for (const key of this.keys) {
      const value = this.get(key);
      if (this.isDefault(key, value)) {
        continue;
      }
      params.set(key, value);
    }
    return params.toString();
  }
}
