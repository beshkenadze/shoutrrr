import type { Params } from './types.js';
import { type FieldSchema, getConfigFieldString, setConfigField } from './format.js';

/**
 * Resolves config struct fields by their query key, mirroring Go's
 * format.PropKeyResolver. Used to read/write query-string params and to
 * round-trip a config through a URL.
 */
export class PropKeyResolver {
  private readonly config: Record<string, unknown>;
  private readonly schema: FieldSchema[];
  private readonly keyMap: Map<string, FieldSchema>;

  constructor(config: Record<string, unknown>, schema: FieldSchema[]) {
    this.config = config;
    this.schema = schema;
    this.keyMap = new Map();
    for (const field of schema) {
      for (const key of field.key ?? []) {
        this.keyMap.set(key.toLowerCase(), field);
      }
    }
  }

  /** Returns the primary query keys (first key of each keyed field). */
  queryFields(): string[] {
    const fields: string[] = [];
    for (const field of this.schema) {
      const primary = field.key?.[0];
      if (primary) {
        fields.push(primary);
      }
    }
    return fields;
  }

  get(key: string): string {
    const field = this.keyMap.get(key.toLowerCase());
    if (!field) {
      throw new Error(`no such config field: ${key}`);
    }
    return getConfigFieldString(this.config, field);
  }

  set(key: string, value: string): void {
    const field = this.keyMap.get(key.toLowerCase());
    if (!field) {
      throw new Error(`no such config field: ${key}`);
    }
    setConfigField(this.config, field, value);
  }

  /** Applies any matching params onto the backing config. */
  updateConfigFromParams(params?: Params): void {
    if (!params) {
      return;
    }
    for (const [key, value] of Object.entries(params)) {
      const field = this.keyMap.get(key.toLowerCase());
      if (field) {
        setConfigField(this.config, field, value);
      }
    }
  }

  /** Reads matching query params from a URL into the backing config. */
  setFromURL(url: URL): void {
    for (const key of this.keyMap.keys()) {
      const value = url.searchParams.get(key);
      if (value !== null) {
        this.set(key, value);
      }
    }
  }

  /**
   * Writes the config's keyed fields onto the URL query string, omitting values
   * equal to their declared default. Preserves the URL's existing host:port.
   */
  bindToURL(url: URL): void {
    for (const field of this.schema) {
      const primary = field.key?.[0];
      if (!primary) {
        continue;
      }
      const value = getConfigFieldString(this.config, field);
      if (value === '' || value === (field.default ?? '')) {
        url.searchParams.delete(primary);
        continue;
      }
      url.searchParams.set(primary, value);
    }
  }
}
