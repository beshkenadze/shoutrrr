import type { Params, ServiceConfig } from './types.js';
import {
  type FieldSchema,
  getConfigFieldString,
  setConfigField,
} from './format.js';

/**
 * PropKeyResolver maps query-key tagged config fields to/from a config object.
 * Faithful port of format.PropKeyResolver. Only fields that declare `key`
 * are query props; the first key is primary, the rest are aliases.
 */
export class PropKeyResolver {
  private readonly config: Record<string, unknown>;
  private readonly serviceConfig: ServiceConfig;
  /** lower-cased key -> field */
  private readonly keyFields = new Map<string, FieldSchema>();
  /** sorted list of all (lower-cased) keys */
  private readonly keys: string[] = [];

  constructor(config: ServiceConfig & Record<string, unknown>, schema: FieldSchema[]) {
    this.config = config;
    this.serviceConfig = config;
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

  /** Returns the sorted list of all tagged query keys (primary + aliases). */
  queryFields(): string[] {
    return this.keys;
  }

  /** Returns whether the key is a primary key (the first key of its field). */
  keyIsPrimary(key: string): boolean {
    const field = this.keyFields.get(key.toLowerCase());
    return !!field && (field.key?.[0]?.toLowerCase() ?? '') === key.toLowerCase();
  }

  /** Returns whether `value` equals the field's default for `key`. */
  isDefault(key: string, value: string): boolean {
    const field = this.keyFields.get(key.toLowerCase());
    return !!field && (field.default ?? '') === value;
  }

  /** Get the string value of the config property tagged with `key`. */
  get(key: string): string {
    const field = this.keyFields.get(key.toLowerCase());
    if (!field) {
      throw new Error(`${key} is not a valid config key`);
    }
    return getConfigFieldString(this.config, field, this.serviceConfig.enums());
  }

  /** Set the config property tagged with `key` from `value`. */
  set(key: string, value: string): void {
    const field = this.keyFields.get(key.toLowerCase());
    if (!field) {
      throw new Error(`${key} is not a valid config key`);
    }
    const valid = setConfigField(this.config, field, value, this.serviceConfig.enums());
    if (!valid) {
      throw new Error('invalid value for type');
    }
  }

  /**
   * updateConfigFromParams mutates the config from runtime params. The first error
   * encountered is thrown after attempting all params (matching Go's firstError semantics).
   */
  updateConfigFromParams(params?: Params): void {
    if (!params) {
      return;
    }
    let firstError: Error | undefined;
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

  /** Sets config props from the URL's query parameters. */
  setFromURL(url: URL): void {
    for (const key of this.keys) {
      const value = url.searchParams.get(key);
      if (value !== null) {
        this.set(key, value);
      }
    }
  }

  /**
   * bindToURL writes the non-default primary query props onto the URL's search params.
   * Values equal to the field default are omitted (port of format.BuildQuery).
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
