import {
  type FieldSchema,
  type PropFactory,
  getConfigFieldString,
  setConfigField,
} from "./format.js";
import type { Params } from "./types.js";

/** A config is a mutable bag of field values keyed by the schema field name. */
export type ConfigObject = Record<string, unknown>;

/**
 * PropKeyResolver maps URL query keys to config fields and de-/serializes them,
 * mirroring Go's format.PropKeyResolver. Query keys are matched case-insensitively
 * (lowercased), and values equal to a field's default are omitted from the query.
 *
 * The config is accessed dynamically by field name; class instances are accepted
 * at the boundary and treated as a mutable record internally.
 */
export class PropKeyResolver {
  private readonly config: ConfigObject;
  private readonly schema: FieldSchema[];
  private readonly byKey: Map<string, FieldSchema>;
  private readonly propFactories: Record<string, PropFactory>;

  constructor(
    config: object,
    schema: FieldSchema[],
    propFactories: Record<string, PropFactory> = {},
  ) {
    this.config = config as ConfigObject;
    this.schema = schema;
    this.propFactories = propFactories;
    this.byKey = new Map();
    for (const field of schema) {
      for (const key of field.key ?? []) {
        this.byKey.set(key.toLowerCase(), field);
      }
    }
  }

  /** queryFields returns the primary (first) lowercased query key of each keyed field, sorted. */
  queryFields(): string[] {
    const fields: string[] = [];
    for (const field of this.schema) {
      const primary = field.key?.[0];
      if (primary !== undefined) {
        fields.push(primary.toLowerCase());
      }
    }
    return fields.sort();
  }

  /** get serializes the field bound to the given query key to its string form. */
  get(key: string): string {
    const field = this.field(key);
    return getConfigFieldString(field, this.config[field.name]);
  }

  /** set parses the input string and assigns it to the field bound to the query key. */
  set(key: string, value: string): void {
    const field = this.field(key);
    this.config[field.name] = setConfigField(
      field,
      value,
      this.propFactories[field.name],
    );
  }

  /** updateConfigFromParams applies runtime params onto the (typically cloned) config. */
  updateConfigFromParams(params?: Params): void {
    if (!params) {
      return;
    }
    for (const [key, value] of Object.entries(params)) {
      const field = this.byKey.get(key.toLowerCase());
      if (field) {
        this.set(key, value);
      }
    }
  }

  /** setFromURL reads all query parameters of the URL into the config. */
  setFromURL(url: URL): void {
    for (const [key, value] of url.searchParams.entries()) {
      if (this.byKey.has(key.toLowerCase())) {
        this.set(key, value);
      }
    }
  }

  /**
   * bindToURL builds the query string of the URL, omitting any field whose value
   * equals its declared default, mirroring Go's BuildQuery.
   */
  buildQuery(): Record<string, string> {
    const query: Record<string, string> = {};
    for (const field of this.schema) {
      const key = field.key?.[0];
      if (key === undefined) {
        continue;
      }
      const value = getConfigFieldString(field, this.config[field.name]);
      if (this.isDefault(field, value)) {
        continue;
      }
      query[key.toLowerCase()] = value;
    }
    return query;
  }

  private field(key: string): FieldSchema {
    const field = this.byKey.get(key.toLowerCase());
    if (!field) {
      throw new Error(`no such config field: ${key}`);
    }
    return field;
  }

  private isDefault(field: FieldSchema, serialized: string): boolean {
    const def = field.default;
    if (def === undefined) {
      // Unset string fields default to the empty string.
      return serialized === "";
    }
    return serialized === getConfigFieldString(field, def);
  }
}
