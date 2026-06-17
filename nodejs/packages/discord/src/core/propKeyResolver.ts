import {
  type FieldSchema,
  getConfigFieldString,
  setConfigField,
} from "./format.js";
import type { EnumFormatter, Params } from "./types.js";

/**
 * PropKeyResolver maps query-string keys to typed config fields, faithfully
 * porting Go format.PropKeyResolver. It operates over a FieldSchema array
 * instead of struct reflection.
 */
export class PropKeyResolver {
  private readonly config: Record<string, unknown>;
  private readonly enums: Record<string, EnumFormatter>;
  /** Lowercased key -> field schema (includes aliases). */
  private readonly keyFields = new Map<string, FieldSchema>();
  /** Sorted list of all tagged keys (primary + aliases), lowercased. */
  private readonly keys: string[];

  constructor(
    config: Record<string, unknown>,
    schema: FieldSchema[],
    enums: Record<string, EnumFormatter> = {},
  ) {
    this.config = config;
    this.enums = enums;

    const keys: string[] = [];
    for (const field of schema) {
      for (const key of field.key ?? []) {
        const lower = key.toLowerCase();
        if (lower !== "") {
          keys.push(lower);
          this.keyFields.set(lower, field);
        }
      }
    }
    keys.sort();
    this.keys = keys;
  }

  /** queryFields returns the sorted list of tagged keys. */
  queryFields(): string[] {
    return [...this.keys];
  }

  /**
   * setDefaultProps sets every primary field to its schema default value,
   * mirroring Go PropKeyResolver.SetDefaultProps. Fields without a default are
   * left untouched. The first error is thrown after all defaults are attempted.
   */
  setDefaultProps(): void {
    let firstError: Error | undefined;
    const seen = new Set<string>();
    for (const [, field] of this.keyFields) {
      const primary = field.key?.[0]?.toLowerCase();
      if (!primary || seen.has(primary) || field.default === undefined) {
        continue;
      }
      seen.add(primary);
      try {
        this.set(primary, field.default);
      } catch (err) {
        if (!firstError) {
          firstError = err instanceof Error ? err : new Error(String(err));
        }
      }
    }
    if (firstError) {
      throw firstError;
    }
  }

  /** keyIsPrimary returns whether the key is the field's primary key (not an alias). */
  keyIsPrimary(key: string): boolean {
    const field = this.keyFields.get(key.toLowerCase());
    return field?.key?.[0]?.toLowerCase() === key.toLowerCase();
  }

  /** isDefault returns whether the rendered value equals the field's default. */
  isDefault(key: string, value: string): boolean {
    const field = this.keyFields.get(key.toLowerCase());
    return (field?.default ?? "") === value;
  }

  /** get reads the config property tagged with the corresponding key. */
  get(key: string): string {
    const field = this.keyFields.get(key.toLowerCase());
    if (!field) {
      throw new Error(`${key} is not a valid config key`);
    }
    return getConfigFieldString(this.config, field, this.enums);
  }

  /** set writes the config property tagged with the corresponding key. */
  set(key: string, value: string): void {
    const field = this.keyFields.get(key.toLowerCase());
    if (!field) {
      throw new Error(`${key} is not a valid config key`);
    }
    const valid = setConfigField(this.config, field, value, this.enums);
    if (!valid) {
      throw new Error("invalid value for type");
    }
  }

  /**
   * updateConfigFromParams applies each param onto the config. The first error
   * is thrown after all params are attempted (mirrors Go's first-error semantics).
   */
  updateConfigFromParams(params?: Params): void {
    if (!params) {
      return;
    }
    let firstError: Error | undefined;
    for (const [key, value] of Object.entries(params)) {
      try {
        this.set(key, value);
      } catch (err) {
        if (!firstError) {
          firstError = err instanceof Error ? err : new Error(String(err));
        }
      }
    }
    if (firstError) {
      throw firstError;
    }
  }

  /**
   * setFromURL applies every query parameter present in the URL onto the config.
   * It iterates the URL's actual keys (not the schema keys) and resolves them
   * case-insensitively via set(), mirroring Go setURL which ranges over
   * url.Query() and lets Set() lowercase internally. Unknown keys therefore
   * surface as errors, exactly like Go. The first error is thrown after all
   * keys are attempted.
   */
  setFromURL(url: URL): void {
    let firstError: Error | undefined;
    for (const [key, value] of url.searchParams) {
      try {
        this.set(key, value);
      } catch (err) {
        if (!firstError) {
          firstError = err instanceof Error ? err : new Error(String(err));
        }
      }
    }
    if (firstError) {
      throw firstError;
    }
  }

  /**
   * bindToURL writes the non-default primary config props onto the URL's query
   * string, mirroring Go format.BuildQuery (default values are omitted).
   */
  bindToURL(url: URL): void {
    for (const key of this.keys) {
      if (!this.keyIsPrimary(key)) {
        continue;
      }
      const value = this.get(key);
      if (this.isDefault(key, value)) {
        continue;
      }
      url.searchParams.set(key, value);
    }
  }
}
