// Faithful port of Go pkg/format.PropKeyResolver.
// A later dedupe pass folds these into @shoutrrr/core.

import {
  type FieldSchema,
  type FieldStore,
  getConfigFieldString,
  setConfigField,
} from './format.js';
import type { Params, ServiceConfig } from './types.js';

/**
 * PropKeyResolver maps between query/param keys and config fields, using the
 * provided FieldSchema list. Query (de)serialization omits values that equal
 * the field's default.
 */
export class PropKeyResolver {
  private readonly config: ServiceConfig;
  private readonly schema: FieldSchema[];
  private readonly byKey = new Map<string, FieldSchema>();
  private readonly store: FieldStore;

  constructor(config: ServiceConfig, schema: FieldSchema[]) {
    this.config = config;
    this.schema = schema;
    this.store = config as unknown as FieldStore;
    for (const field of schema) {
      for (const key of field.key ?? [field.name]) {
        this.byKey.set(key.toLowerCase(), field);
      }
    }
  }

  /** Returns the set of query keys (primary key per field). */
  queryFields(): string[] {
    return this.schema.map((f) => (f.key && f.key.length > 0 ? f.key[0] : f.name));
  }

  private fieldFor(key: string): FieldSchema {
    const field = this.byKey.get(key.toLowerCase());
    if (!field) {
      throw new Error(`no field with key "${key}"`);
    }
    return field;
  }

  get(key: string): string {
    return getConfigFieldString(this.store, this.fieldFor(key), this.config.enums());
  }

  set(key: string, value: string): void {
    setConfigField(this.store, this.fieldFor(key), value, this.config.enums());
  }

  /** Applies any provided params onto the config. */
  updateConfigFromParams(params?: Params): void {
    if (!params) {
      return;
    }
    for (const [key, value] of Object.entries(params)) {
      if (this.byKey.has(key.toLowerCase())) {
        this.set(key, value);
      }
    }
  }

  /** Reads query parameters from the URL into the config. */
  setFromURL(url: URL): void {
    for (const field of this.schema) {
      const key = field.key && field.key.length > 0 ? field.key[0] : field.name;
      const raw = url.searchParams.get(key);
      if (raw !== null) {
        this.set(key, raw);
      }
    }
  }

  /** Writes config values onto the URL query, omitting values equal to default. */
  bindToURL(url: URL): void {
    for (const field of this.schema) {
      const key = field.key && field.key.length > 0 ? field.key[0] : field.name;
      const value = this.get(key);
      if (value === (field.default ?? '')) {
        url.searchParams.delete(key);
        continue;
      }
      url.searchParams.set(key, value);
    }
  }
}
