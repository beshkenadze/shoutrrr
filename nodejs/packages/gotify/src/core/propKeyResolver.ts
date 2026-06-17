// Faithful port of Go pkg/format/prop_key_resolver.go + format_query.go (query parts).
import {
  getConfigFieldString,
  setConfigField,
  type ConfigRecord,
  type FieldSchema,
} from './format.js';
import type { Params, ServiceConfig } from './types.js';

/** PropKeyResolver maps URL/param query keys to config struct fields. */
export class PropKeyResolver {
  private readonly config: ServiceConfig & ConfigRecord;
  private readonly keyFields: Map<string, FieldSchema> = new Map();
  private readonly keys: string[] = [];

  constructor(config: ServiceConfig, schema: FieldSchema[]) {
    this.config = config as ServiceConfig & ConfigRecord;
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

  /** queryFields returns the sorted list of tagged keys. */
  queryFields(): string[] {
    return this.keys;
  }

  /** get returns the string value of the config property tagged with the key. */
  get(k: string): string {
    const field = this.keyFields.get(k.toLowerCase());
    if (!field) {
      throw new Error(`${k} is not a valid config key`);
    }
    return getConfigFieldString(this.config, field, this.config.enums());
  }

  /** set assigns the config property tagged with the key from the string value. */
  set(k: string, v: string): void {
    const field = this.keyFields.get(k.toLowerCase());
    if (!field) {
      throw new Error(`${k} is not a valid config key`);
    }
    const valid = setConfigField(this.config, field, v, this.config.enums());
    if (!valid) {
      throw new Error('invalid value for type');
    }
  }

  /** keyIsPrimary returns whether the key is the field's primary (not an alias) key. */
  keyIsPrimary(key: string): boolean {
    const field = this.keyFields.get(key);
    return field?.key?.[0] === key;
  }

  /** isDefault returns whether the value equals the field's default value. */
  isDefault(key: string, value: string): boolean {
    return (this.keyFields.get(key)?.default ?? '') === value;
  }

  /** updateConfigFromParams mutates the config using the provided params (first error wins). */
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

  /** setFromURL applies every query parameter from the URL to the config. */
  setFromURL(url: URL): void {
    for (const [key, value] of url.searchParams.entries()) {
      this.set(key, value);
    }
  }

  /**
   * bindToURL writes the resolved query params into the URL's search string.
   * Mirrors Go BuildQuery: only primary keys, omitting values equal to default,
   * encoded with sorted keys (url.Values.Encode semantics).
   */
  bindToURL(url: URL): void {
    const pairs: Array<[string, string]> = [];
    for (const key of this.keys) {
      if (!this.keyIsPrimary(key)) {
        continue;
      }
      const value = this.get(key);
      if (this.isDefault(key, value)) {
        continue;
      }
      pairs.push([key, value]);
    }
    pairs.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    url.search = '';
    for (const [key, value] of pairs) {
      url.searchParams.append(key, value);
    }
  }

  /** buildQuery returns the encoded query string (Go BuildQuery equivalent). */
  buildQuery(): string {
    const tmp = new URL('https://placeholder.invalid');
    this.bindToURL(tmp);
    return tmp.searchParams.toString();
  }
}
