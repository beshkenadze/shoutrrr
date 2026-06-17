// Vendored from Go pkg/format/prop_key_resolver.go + format_query.go.
import type { EnumFormatter } from './types.js';
import {
  type FieldSchema,
  getConfigFieldString,
  setConfigField,
} from './format.js';

/**
 * PropKeyResolver binds a config's key-tagged fields to query params,
 * mirroring Go format.PropKeyResolver. Keys are stored lowercased; the first
 * key of a field is its "primary" key (others are aliases).
 */
export class PropKeyResolver {
  private readonly config: Record<string, unknown>;
  private readonly enums: Record<string, EnumFormatter>;
  private readonly keyFields = new Map<string, FieldSchema>();
  private readonly keys: string[] = [];

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
        if (key !== '') {
          this.keys.push(key);
          this.keyFields.set(key, field);
        }
      }
    }
    this.keys.sort();
  }

  /** QueryFields returns the sorted list of tagged keys (Go: QueryFields). */
  queryFields(): string[] {
    return this.keys;
  }

  /** get returns the serialized value of the field bound to key (Go: Get). */
  get(key: string): string {
    const field = this.keyFields.get(key.toLowerCase());
    if (!field) {
      throw new Error(`${key} is not a valid config key`);
    }
    return getConfigFieldString(this.config, this.enums, field);
  }

  /** set parses value and assigns it to the field bound to key (Go: Set). */
  set(key: string, value: string): void {
    const field = this.keyFields.get(key.toLowerCase());
    if (!field) {
      throw new Error(`${key} is not a valid config key`);
    }
    setConfigField(this.config, this.enums, field, value);
  }

  /** keyIsPrimary reports whether key is the first (primary) key of its field. */
  private keyIsPrimary(key: string): boolean {
    const field = this.keyFields.get(key);
    return field?.key?.[0]?.toLowerCase() === key;
  }

  /** isDefault reports whether value equals the field's default (Go: IsDefault). */
  private isDefault(key: string, value: string): boolean {
    const field = this.keyFields.get(key);
    return (field?.default ?? '') === value;
  }

  /**
   * updateConfigFromParams mutates the config from params, keeping only the
   * first error encountered (Go: UpdateConfigFromParams).
   */
  updateConfigFromParams(params?: Record<string, string>): Error | undefined {
    let firstError: Error | undefined;
    if (params) {
      for (const [key, val] of Object.entries(params)) {
        try {
          this.set(key, val);
        } catch (err) {
          if (!firstError) {
            firstError = err instanceof Error ? err : new Error(String(err));
          }
        }
      }
    }
    return firstError;
  }

  /**
   * setFromURL applies the query params of url to the config (Go: setURL loop).
   * Go iterates url.Query() (a map) and uses vals[0], so repeated keys are
   * first-wins; getAll(key)[0] reproduces that.
   */
  setFromURL(url: URL): void {
    const seen = new Set<string>();
    for (const key of url.searchParams.keys()) {
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      const first = url.searchParams.getAll(key)[0];
      if (first !== undefined) {
        this.set(key, first);
      }
    }
  }

  /**
   * bindToURL writes the query string onto url, emitting only primary keys
   * whose value differs from the default (Go: BuildQuery). url.Values.Encode()
   * sorts keys alphabetically, which URLSearchParams.sort() reproduces.
   */
  bindToURL(url: URL): void {
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
      url.searchParams.set(key, value);
    }
    url.searchParams.sort();
  }
}
