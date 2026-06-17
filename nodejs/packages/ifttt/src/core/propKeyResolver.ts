import {
  type FieldSchema,
  getConfigFieldString,
  setConfigField,
} from "./format.js";
import type { EnumFormatter } from "./types.js";

/**
 * PropKeyResolver maps query keys to config fields, ported from Go
 * pkg/format.PropKeyResolver. It supports get/set by key, updating a config
 * from params, and building/parsing the query portion of a service URL.
 *
 * Keys are case-insensitive (lowercased). The first key of a field is its
 * "primary" key; only the primary key is emitted by buildQuery.
 */
export class PropKeyResolver {
  private readonly config: Record<string, unknown>;
  private readonly keyFields = new Map<string, FieldSchema>();
  private readonly keys: string[] = [];
  private readonly enums: Record<string, EnumFormatter>;

  constructor(
    config: Record<string, unknown>,
    schema: FieldSchema[],
    enums: Record<string, EnumFormatter> = {},
  ) {
    this.config = config;
    this.enums = enums;
    for (const field of schema) {
      for (const rawKey of field.key ?? []) {
        const key = rawKey.toLowerCase();
        if (key !== "") {
          this.keys.push(key);
          this.keyFields.set(key, field);
        }
      }
    }
    this.keys.sort();
  }

  /** queryFields returns the sorted list of tagged keys. */
  queryFields(): string[] {
    return [...this.keys];
  }

  /** keyIsPrimary returns whether the key is the field's first (primary) key. */
  keyIsPrimary(key: string): boolean {
    const field = this.keyFields.get(key);
    return field?.key?.[0] === key;
  }

  /** isDefault returns whether the value equals the field's default value. */
  isDefault(key: string, value: string): boolean {
    const field = this.keyFields.get(key);
    return (field?.default ?? "") === value;
  }

  /** get returns the serialized value of the config property bound to key. */
  get(key: string): string {
    const field = this.keyFields.get(key.toLowerCase());
    if (!field) {
      throw new Error(`${key} is not a valid config key`);
    }
    return getConfigFieldString(this.config, field, this.enums);
  }

  /** set sets the config property bound to key from a raw string value. */
  set(key: string, value: string): void {
    const field = this.keyFields.get(key.toLowerCase());
    if (!field) {
      throw new Error(`${key} is not a valid config key ${this.keys}`);
    }
    const valid = setConfigField(this.config, field, value, this.enums);
    if (!valid) {
      throw new Error("invalid value for type");
    }
  }

  /**
   * updateConfigFromParams mutates the config from params, applying each
   * key/value. The first error is thrown, mirroring Go's first-error behavior.
   */
  updateConfigFromParams(params?: Record<string, string>): void {
    if (!params) {
      return;
    }
    let firstError: Error | undefined;
    for (const [key, value] of Object.entries(params)) {
      try {
        this.set(key, value);
      } catch (err) {
        if (!firstError) {
          firstError = err as Error;
        }
      }
    }
    if (firstError) {
      throw firstError;
    }
  }

  /**
   * setFromURL applies query parameters from the URL to the config, using the
   * first value for each distinct key (matching Go's setURL loop which passes
   * vals[0]) and throwing on the first invalid key.
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

  /**
   * bindToURL builds the query string for the URL, emitting only primary keys
   * whose value differs from the field default. Keys are emitted in sorted
   * order to match Go url.Values.Encode().
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
