// Faithful port of Go pkg/format/prop_key_resolver.go (subset used by services).
import {
  type ConfigValues,
  type FieldSchema,
  getConfigFieldString,
  setConfigField,
} from './format.js';
import type { EnumFormatter, Params } from './types.js';

/**
 * PropKeyResolver maps URL query keys to config fields and back. Each field may
 * expose several keys (e.g. `chats,channels`); the first key is canonical.
 */
export class PropKeyResolver {
  private readonly config: ConfigValues;
  private readonly schema: FieldSchema[];
  private readonly enums: Record<string, EnumFormatter>;
  /** key (lowercased) -> field */
  private readonly keyToField = new Map<string, FieldSchema>();

  constructor(
    config: ConfigValues,
    schema: FieldSchema[],
    enums: Record<string, EnumFormatter> = {},
  ) {
    this.config = config;
    this.schema = schema;
    this.enums = enums;
    for (const field of schema) {
      for (const key of field.key ?? []) {
        this.keyToField.set(key.toLowerCase(), field);
      }
    }
  }

  /** queryFields returns the canonical (first) key of every keyed field. */
  queryFields(): string[] {
    const fields: string[] = [];
    for (const field of this.schema) {
      const first = field.key?.[0];
      if (first) {
        fields.push(first);
      }
    }
    return fields;
  }

  private fieldFor(key: string): FieldSchema {
    const field = this.keyToField.get(key.toLowerCase());
    if (!field) {
      throw new Error(`invalid query key "${key}"`);
    }
    return field;
  }

  /** get returns the string value bound to a query key. */
  get(key: string): string {
    return getConfigFieldString(this.config, this.fieldFor(key), this.enums);
  }

  /** set assigns a query key from a raw string value. */
  set(key: string, value: string): void {
    setConfigField(this.config, this.fieldFor(key), value, this.enums);
  }

  /**
   * updateConfigFromParams overrides config fields from runtime params.
   *
   * Mirrors Go: every key is applied via set(), and an unknown key (or invalid
   * value) raises an error. Like Go, the FIRST error is retained while the
   * remaining params are still applied, then that first error is thrown.
   */
  updateConfigFromParams(params?: Params): void {
    if (!params) {
      return;
    }
    let firstError: unknown;
    for (const [key, value] of Object.entries(params)) {
      try {
        this.set(key, value);
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

  /** setFromURL applies all query parameters of the URL to the config. */
  setFromURL(url: URL): void {
    for (const [key, value] of url.searchParams.entries()) {
      this.set(key, value);
    }
  }

  /** bindToURL writes the resolver's non-default values onto the URL query. */
  bindToURL(url: URL): void {
    url.search = this.buildQuery();
  }

  /** buildQuery serializes keyed fields, omitting any equal to their default. */
  buildQuery(): string {
    const params = new URLSearchParams();
    for (const field of this.schema) {
      const key = field.key?.[0];
      if (!key) {
        continue;
      }
      const value = getConfigFieldString(this.config, field, this.enums);
      const def = field.default ?? '';
      if (value === def) {
        continue;
      }
      params.set(key, value);
    }
    // Sort keys for deterministic output (Go uses sorted map iteration too).
    params.sort();
    return params.toString();
  }
}
