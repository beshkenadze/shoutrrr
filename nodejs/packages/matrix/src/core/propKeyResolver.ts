import type { EnumFormatter, Params } from './types.js';
import {
  type ConfigObject,
  type FieldSchema,
  getConfigFieldString,
  setConfigField,
} from './format.js';

interface KeyField {
  field: FieldSchema;
  primary: boolean;
}

// PropKeyResolver — faithful port of Go pkg/format PropKeyResolver.
// Handles only the `key:`-tagged (query) fields of a config.
export class PropKeyResolver {
  private readonly config: ConfigObject;
  private readonly keyFields = new Map<string, KeyField>();
  private readonly keys: string[] = [];
  private readonly enums: Record<string, EnumFormatter>;

  constructor(
    config: ConfigObject,
    schema: FieldSchema[],
    enums: Record<string, EnumFormatter> = {},
  ) {
    this.config = config;
    this.enums = enums;
    for (const field of schema) {
      const fieldKeys = field.key;
      if (!fieldKeys || fieldKeys.length === 0) {
        continue;
      }
      fieldKeys.forEach((rawKey, idx) => {
        const key = rawKey.toLowerCase();
        this.keyFields.set(key, { field, primary: idx === 0 });
        this.keys.push(key);
      });
    }
  }

  queryFields(): string[] {
    return this.keys;
  }

  private isPrimary(key: string): boolean {
    return this.keyFields.get(key.toLowerCase())?.primary ?? false;
  }

  private isDefault(key: string, value: string): boolean {
    const field = this.keyFields.get(key.toLowerCase())?.field;
    return (field?.default ?? '') === value;
  }

  get(key: string): string {
    const entry = this.keyFields.get(key.toLowerCase());
    if (!entry) {
      throw new Error(`${key} is not a valid config key`);
    }
    return getConfigFieldString(this.config, entry.field, this.enums);
  }

  set(key: string, value: string): void {
    const entry = this.keyFields.get(key.toLowerCase());
    if (!entry) {
      throw new Error(`${key} is not a valid config key ${this.keys.join(',')}`);
    }
    if (!setConfigField(this.config, entry.field, value, this.enums)) {
      throw new Error('invalid value for type');
    }
  }

  updateConfigFromParams(params?: Params): void {
    if (!params) {
      return;
    }
    let firstError: Error | undefined;
    for (const [key, val] of Object.entries(params)) {
      try {
        this.set(key, val);
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

  // setFromURL reads each distinct query key from the URL and applies its
  // FIRST value (matching Go's `resolver.Set(key, vals[0])`), throwing on the
  // first invalid query value.
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

  // bindToURL writes the non-default, primary-keyed query values into the URL.
  bindToURL(url: URL): void {
    this.bindToQuery(url.searchParams);
  }

  // bindToQuery writes the non-default, primary-keyed query values into the params.
  // Mirrors Go's BuildQuery: skips non-primary keys and values equal to default,
  // then emits keys in sorted order (Go's url.Values.Encode sorts alphabetically).
  bindToQuery(query: URLSearchParams): void {
    const collected: Array<[string, string]> = [];
    for (const key of this.keys) {
      if (!this.isPrimary(key)) {
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
      collected.push([key, value]);
    }
    collected.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    for (const [key, value] of collected) {
      query.set(key, value);
    }
  }
}
