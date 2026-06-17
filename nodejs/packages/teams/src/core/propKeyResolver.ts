import type { EnumFormatter, Params, ServiceConfig } from './types.js';
import {
  type ConfigRecord,
  type FieldSchema,
  getConfigFieldString,
  setConfigField,
} from './format.js';

/**
 * PropKeyResolver maps query/param keys to config fields and (de)serializes
 * them. Faithful port of Go's format.PropKeyResolver for key-tagged configs.
 */
export class PropKeyResolver {
  private readonly config: ConfigRecord;
  private readonly schema: FieldSchema[];
  private readonly enums: Record<string, EnumFormatter>;
  /** key (lowercased) -> field */
  private readonly keyFields = new Map<string, FieldSchema>();
  /** sorted list of all tagged keys */
  private readonly keys: string[] = [];

  constructor(config: ServiceConfig & ConfigRecord, schema: FieldSchema[]) {
    this.config = config;
    this.schema = schema;
    this.enums = config.enums();

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

  /** Returns whether the key is the primary (first) key of its field. */
  keyIsPrimary(key: string): boolean {
    const field = this.keyFields.get(key.toLowerCase());
    return field?.key?.[0]?.toLowerCase() === key.toLowerCase();
  }

  /** Returns whether the given value equals the field's default value. */
  isDefault(key: string, value: string): boolean {
    const field = this.keyFields.get(key.toLowerCase());
    return (field?.default ?? '') === value;
  }

  /** Gets the string value of the config field tagged with the key. */
  get(key: string): string {
    const field = this.keyFields.get(key.toLowerCase());
    if (!field) {
      throw new Error(`${key} is not a valid config key`);
    }
    return getConfigFieldString(this.config, field, this.enums);
  }

  /** Sets the config field tagged with the key from the raw string value. */
  set(key: string, value: string): void {
    const field = this.keyFields.get(key.toLowerCase());
    if (!field) {
      throw new Error(`${key} is not a valid config key`);
    }
    setConfigField(this.config, field, value, this.enums);
  }

  /** Applies runtime param overrides to the config (first error wins, rest swallowed). */
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

  /** Reads all tagged keys present in the URL's query into the config. */
  setFromURL(url: URL): void {
    for (const key of this.keys) {
      const value = url.searchParams.get(key);
      if (value !== null) {
        this.set(key, value);
      }
    }
  }

  /**
   * Writes the config's non-default, primary-key fields onto the URL's query.
   * Mirrors Go's format.BuildQuery: values equal to the default are omitted.
   * Keys are emitted in sorted order so serialization is deterministic.
   */
  bindToURL(url: URL): void {
    for (const key of this.keys) {
      if (!this.keyIsPrimary(key)) {
        continue;
      }
      const value = this.get(key);
      if (this.isDefault(key, value)) {
        continue;
      }
      url.searchParams.set(key, value);
    }
  }
}
