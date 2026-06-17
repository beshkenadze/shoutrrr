import type { Params } from './types.js';
import { type FieldSchema, getConfigFieldString, setConfigField } from './format.js';

// PropKeyResolver maps query/prop keys to config fields, faithful port of
// Go pkg/format PropKeyResolver. buildQuery omits values equal to the default.
export class PropKeyResolver {
  private readonly config: Record<string, unknown>;
  private readonly schema: FieldSchema[];
  private readonly byKey: Map<string, FieldSchema>;

  constructor(config: Record<string, unknown>, schema: FieldSchema[]) {
    this.config = config;
    this.schema = schema;
    this.byKey = new Map();
    for (const field of schema) {
      for (const key of field.key ?? [field.name]) {
        this.byKey.set(key.toLowerCase(), field);
      }
    }
  }

  queryFields(): string[] {
    return this.schema.map((field) => (field.key ?? [field.name])[0]!);
  }

  get(key: string): string {
    const field = this.byKey.get(key.toLowerCase());
    if (!field) {
      throw new Error(`no field for key: ${key}`);
    }
    const value = this.config[field.name];
    return getConfigFieldString(field, value as string | number | boolean | string[]);
  }

  set(key: string, value: string): void {
    const field = this.byKey.get(key.toLowerCase());
    if (!field) {
      throw new Error(`no field for key: ${key}`);
    }
    this.config[field.name] = setConfigField(field, value);
  }

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

  setFromURL(url: URL): void {
    for (const field of this.schema) {
      const key = (field.key ?? [field.name])[0]!;
      const value = url.searchParams.get(key);
      if (value !== null) {
        this.set(key, value);
      }
    }
  }

  bindToURL(url: URL): void {
    for (const field of this.schema) {
      const key = (field.key ?? [field.name])[0]!;
      const current = this.get(key);
      if (field.default !== undefined && current === field.default) {
        continue;
      }
      url.searchParams.set(key, current);
    }
  }
}
