import type { ConfigObject, FieldSchema } from './format.js';
import { getConfigFieldString, setConfigField } from './format.js';
import type { EnumFormatter, Params } from './types.js';

/**
 * PropKeyResolver — port of Go format.PropKeyResolver.
 * Resolves config query props by their `key` tags and handles URL serialization.
 */
export class PropKeyResolver {
  private readonly config: ConfigObject;
  private readonly schema: FieldSchema[];
  private readonly enums: Record<string, EnumFormatter>;
  /** lowercased key -> field schema (includes aliases) */
  private readonly keyFields = new Map<string, FieldSchema>();
  /** sorted list of all (lowercased) keys */
  private readonly keys: string[];

  constructor(
    config: ConfigObject,
    schema: FieldSchema[],
    enums: Record<string, EnumFormatter> = {},
  ) {
    this.config = config;
    this.schema = schema;
    this.enums = enums;

    const keys: string[] = [];
    for (const field of schema) {
      for (const key of field.key ?? []) {
        const lower = key.toLowerCase();
        if (lower !== '') {
          keys.push(lower);
          this.keyFields.set(lower, field);
        }
      }
    }
    keys.sort();
    this.keys = keys;
  }

  queryFields(): string[] {
    return this.keys;
  }

  get(key: string): string {
    const field = this.keyFields.get(key.toLowerCase());
    if (!field) {
      throw new Error(`${key} is not a valid config key`);
    }
    return getConfigFieldString(this.config, field, this.enums);
  }

  set(key: string, value: string): void {
    const field = this.keyFields.get(key.toLowerCase());
    if (!field) {
      throw new Error(`${key} is not a valid config key ${this.keys.join(',')}`);
    }
    const valid = setConfigField(this.config, field, this.enums, value);
    if (!valid) {
      throw new Error('invalid value for type');
    }
  }

  /** KeyIsPrimary returns whether the key is the primary (and not an alias). */
  keyIsPrimary(key: string): boolean {
    const field = this.keyFields.get(key.toLowerCase());
    return field?.key?.[0]?.toLowerCase() === key.toLowerCase();
  }

  /** isDefault returns whether the given key/value matches the field default. */
  isDefault(key: string, value: string): boolean {
    const field = this.keyFields.get(key.toLowerCase());
    return (field?.default ?? '') === value;
  }

  /** updateConfigFromParams mutates the config from the corresponding params. */
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

  /** setFromURL reads query parameters from the URL into the config. */
  setFromURL(url: URL): void {
    for (const [key, value] of url.searchParams.entries()) {
      this.set(key, value);
    }
  }

  /**
   * bindToURL writes config query props onto the URL's search params,
   * omitting values equal to their default (port of format.BuildQuery).
   */
  bindToURL(url: URL): void {
    for (const key of this.keys) {
      const field = this.keyFields.get(key);
      // Only emit the primary key, not aliases.
      if (!field || field.key?.[0]?.toLowerCase() !== key) {
        continue;
      }
      const value = getConfigFieldString(this.config, field, this.enums);
      if (this.isDefault(key, value)) {
        continue;
      }
      url.searchParams.set(key, value);
    }
  }
}
