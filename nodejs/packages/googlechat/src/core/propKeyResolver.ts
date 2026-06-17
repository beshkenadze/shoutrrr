// Faithful port of Go pkg/format PropKeyResolver.
import {
  getConfigFieldString,
  setConfigField,
  type FieldSchema,
} from './format.js';

export class PropKeyResolver {
  private readonly config: Record<string, unknown>;
  private readonly schema: FieldSchema[];
  private readonly keyMap: Record<string, FieldSchema>;

  constructor(config: Record<string, unknown>, schema: FieldSchema[]) {
    this.config = config;
    this.schema = schema;
    this.keyMap = {};
    for (const field of schema) {
      const keys = field.key ?? [field.name.toLowerCase()];
      for (const key of keys) {
        this.keyMap[key.toLowerCase()] = field;
      }
    }
  }

  queryFields(): string[] {
    const fields: string[] = [];
    for (const field of this.schema) {
      const keys = field.key ?? [field.name.toLowerCase()];
      const key = keys[0];
      if (key !== undefined) {
        fields.push(key);
      }
    }
    return fields;
  }

  get(key: string): string {
    const field = this.keyMap[key.toLowerCase()];
    if (field === undefined) {
      return '';
    }
    return getConfigFieldString(this.config, field);
  }

  set(key: string, value: string): boolean {
    const field = this.keyMap[key.toLowerCase()];
    if (field === undefined) {
      return false;
    }
    return setConfigField(this.config, field, value);
  }

  updateConfigFromParams(params?: Record<string, string>): void {
    if (!params) {
      return;
    }
    for (const [key, value] of Object.entries(params)) {
      this.set(key, value);
    }
  }

  setFromURL(url: URL): void {
    for (const [key, value] of url.searchParams.entries()) {
      this.set(key, value);
    }
  }

  /** Binds current config values to the URL query, omitting values equal to default. */
  bindToURL(url: URL): void {
    for (const field of this.schema) {
      const keys = field.key ?? [field.name.toLowerCase()];
      const key = keys[0];
      if (key === undefined) {
        continue;
      }
      const value = getConfigFieldString(this.config, field);
      if (field.default !== undefined && value === field.default) {
        continue;
      }
      url.searchParams.set(key, value);
    }
  }
}
