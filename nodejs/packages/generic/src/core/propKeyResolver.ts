import {
  type FieldSchema,
  getConfigFieldString,
  setConfigField,
} from './format.js';
import type { ConfigQueryResolver, EnumFormatter, Params } from './types.js';

interface ResolvableConfig {
  enums(): Record<string, EnumFormatter>;
  [key: string]: unknown;
}

interface KeyField {
  field: FieldSchema;
  keys: string[];
  defaultValue: string;
}

/**
 * PropKeyResolver implements the ConfigQueryResolver interface for services that use key tags for
 * query props. Faithful port of Go `format.PropKeyResolver`, adapted to schema-driven config objects.
 */
export class PropKeyResolver implements ConfigQueryResolver {
  private readonly config: ResolvableConfig;
  private readonly schema: FieldSchema[];
  /** Map from lowercased query key -> KeyField. */
  private readonly keyFields = new Map<string, KeyField>();
  /** Ordered list of primary + alias keys (all lowercased). */
  private readonly keys: string[] = [];

  constructor(config: ResolvableConfig, schema: FieldSchema[]) {
    this.config = config;
    this.schema = schema;

    for (const field of schema) {
      const keys = (field.key ?? [field.name.toLowerCase()]).map((k) => k.toLowerCase());
      const defaultValue = field.default ?? '';
      for (const key of keys) {
        this.keyFields.set(key, { field, keys, defaultValue });
        this.keys.push(key);
      }
    }
  }

  /** queryFields returns the primary key for every config field, in schema order. */
  queryFields(): string[] {
    return this.schema.map((field) => (field.key ?? [field.name.toLowerCase()])[0] as string);
  }

  /** keyIsPrimary returns whether the key is the primary (and not an alias). */
  keyIsPrimary(key: string): boolean {
    const kf = this.keyFields.get(key.toLowerCase());
    return kf !== undefined && kf.keys[0] === key.toLowerCase();
  }

  /** isDefault returns whether the specified key value equals the field default. */
  isDefault(key: string, value: string): boolean {
    const kf = this.keyFields.get(key.toLowerCase());
    return kf !== undefined && kf.defaultValue === value;
  }

  /** get returns the string representation of the config field bound to key. */
  get(key: string): string {
    const kf = this.keyFields.get(key.toLowerCase());
    if (!kf) {
      throw new Error(`${key} is not a valid config key`);
    }
    return getConfigFieldString(kf.field, this.config[kf.field.name] as never, this.config.enums());
  }

  /** set updates the bound config field from a string value. */
  set(key: string, value: string): void {
    const kf = this.keyFields.get(key.toLowerCase());
    if (!kf) {
      throw new Error(`${key} is not a valid config key ${this.keys.join(',')}`);
    }
    this.config[kf.field.name] = setConfigField(kf.field, value, this.config.enums());
  }

  /** setDefaultProps populates every field with its declared default value. */
  setDefaultProps(): void {
    for (const field of this.schema) {
      this.config[field.name] = setConfigField(field, field.default ?? '', this.config.enums());
    }
  }

  /**
   * updateConfigFromParams mutates the config from the corresponding params, attempting every key
   * (matching Go `UpdateConfigFromParams`). It never throws: the first error encountered is returned
   * so the caller can log it and continue, exactly like the Go service does.
   */
  updateConfigFromParams(params?: Params): Error | undefined {
    let firstError: Error | undefined;
    if (!params) {
      return firstError;
    }
    for (const [key, value] of Object.entries(params)) {
      try {
        this.set(key, value);
      } catch (err) {
        if (!firstError) {
          firstError = err instanceof Error ? err : new Error(String(err));
        }
      }
    }
    return firstError;
  }

  /** setFromURL reads config props from the URL query. */
  setFromURL(url: URL): void {
    for (const key of this.queryFields()) {
      const value = url.searchParams.get(key);
      if (value !== null) {
        this.set(key, value);
      }
    }
  }

  /** bindToURL writes non-default config props onto the URL query (omitting defaults). */
  bindToURL(url: URL): void {
    for (const key of this.queryFields()) {
      const value = this.get(key);
      if (this.isDefault(key, value)) {
        continue;
      }
      url.searchParams.set(key, value);
    }
  }
}
