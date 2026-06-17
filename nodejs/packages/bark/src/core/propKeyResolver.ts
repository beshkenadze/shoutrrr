import { getConfigFieldString, setConfigField, type FieldSchema } from './format.js';
import type { EnumFormatter, Params } from './types.js';

type ConfigRecord = Record<string, unknown>;

interface ResolverConfig extends ConfigRecord {
  enums?: () => Record<string, EnumFormatter>;
}

/**
 * PropKeyResolver maps URL query keys to config fields, mirroring Go's
 * format.PropKeyResolver. Each schema field may expose one or more keys; the
 * first key is the primary one used when serializing back to a query string.
 */
export class PropKeyResolver {
  private readonly config: ResolverConfig;
  private readonly keyFields = new Map<string, FieldSchema>();
  private readonly keys: string[] = [];

  constructor(config: ResolverConfig, schema: FieldSchema[]) {
    this.config = config;
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

  private get enums(): Record<string, EnumFormatter> {
    return this.config.enums ? this.config.enums() : {};
  }

  queryFields(): string[] {
    return this.keys;
  }

  get(k: string): string {
    const field = this.keyFields.get(k.toLowerCase());
    if (!field) {
      throw new Error(`${k} is not a valid config key`);
    }
    return getConfigFieldString(this.config, field, this.enums);
  }

  set(k: string, v: string): void {
    const field = this.keyFields.get(k.toLowerCase());
    if (!field) {
      throw new Error(`${k} is not a valid config key`);
    }
    const valid = setConfigField(this.config, field, v, this.enums);
    if (!valid) {
      throw new Error('invalid value for type');
    }
  }

  private keyIsPrimary(key: string): boolean {
    const field = this.keyFields.get(key);
    return !!field && (field.key?.[0]?.toLowerCase() === key);
  }

  private isDefault(key: string, value: string): boolean {
    const field = this.keyFields.get(key);
    return !!field && (field.default ?? '') === value;
  }

  setDefaultProps(): void {
    for (const [key, field] of this.keyFields) {
      this.set(key, field.default ?? '');
    }
  }

  /**
   * updateConfigFromParams applies every param, mirroring Go's behavior of
   * recording only the first error and discarding the rest (valid params after
   * a failing one are still applied). The first error, if any, is thrown after
   * the full pass.
   */
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

  setFromURL(url: URL): void {
    for (const [key, value] of url.searchParams.entries()) {
      this.set(key, value);
    }
  }

  /**
   * bindToURL writes the non-default primary query fields onto the URL's
   * searchParams, sorted by key to match Go's url.Values.Encode() ordering.
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
    for (const [key, value] of pairs) {
      url.searchParams.set(key, value);
    }
  }
}
