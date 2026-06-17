import type { EnumFormatter } from "./types.js";

/** Which part of a URL a config field is sourced from. */
export type URLPart =
  | "user"
  | "pass"
  | "host"
  | "port"
  | "path"
  | "path1"
  | "path2"
  | "path3"
  | "path4"
  | "query";

/** Supported config field value types. */
export type FieldType =
  | "string"
  | "int"
  | "uint"
  | "bool"
  | "float"
  | "enum"
  | "string[]"
  | "prop"
  | "prop[]";

/** FieldSchema describes a single config property and how it maps to a URL. */
export interface FieldSchema {
  name: string;
  type?: FieldType;
  /** Query keys (first is primary, rest are aliases). */
  key?: string[];
  urlParts?: URLPart[];
  default?: string;
  required?: boolean;
  /** Numeric base for int/uint parsing & formatting (e.g. 16 for hex). */
  base?: number;
  /** Separator for string[] fields (defaults to ","). */
  separator?: string;
  enumName?: string;
  title?: string;
  desc?: string;
}

/** ParseBool mirrors Go format.ParseBool: yes/true/1/y -> true, no/false/0/n -> false. */
export function parseBool(value: string, defaultValue: boolean): { value: boolean; ok: boolean } {
  switch (value.toLowerCase()) {
    case "true":
    case "1":
    case "yes":
    case "y":
      return { value: true, ok: true };
    case "false":
    case "0":
    case "no":
    case "n":
      return { value: false, ok: true };
    default:
      return { value: defaultValue, ok: false };
  }
}

/** PrintBool mirrors Go format.PrintBool: true -> "Yes", false -> "No". */
export function printBool(value: boolean): string {
  return value ? "Yes" : "No";
}

/**
 * stripNumberPrefix mirrors Go util.StripNumberPrefix: a leading "#" denotes
 * hex (base 16); otherwise base 0 means "auto-detect from prefix" the same way
 * Go's strconv does (0x->16, 0o->8, 0b->2, leading 0->8, else 10).
 */
function stripNumberPrefix(input: string): { number: string; base: number } {
  if (input.startsWith("#")) {
    return { number: input.slice(1), base: 16 };
  }
  return { number: input, base: 0 };
}

const DIGIT_PATTERN: Record<number, RegExp> = {
  2: /^[01]+$/,
  8: /^[0-7]+$/,
  10: /^[0-9]+$/,
  16: /^[0-9a-f]+$/,
};

/**
 * strictParse parses an all-digit string in the given base, returning NaN if
 * any character is not a valid digit for that base. Unlike Number.parseInt,
 * which stops at the first invalid character, this rejects the whole string —
 * matching Go's strconv.Parse{Int,Uint} behaviour.
 */
function strictParse(digits: string, base: number): number {
  if (digits === "") {
    return Number.NaN;
  }
  const pattern = DIGIT_PATTERN[base];
  if (pattern && !pattern.test(digits.toLowerCase())) {
    return Number.NaN;
  }
  return Number.parseInt(digits, base);
}

/**
 * parseNumber replicates Go strconv.Parse{Int,Uint} with base 0 (auto-detect):
 * 0x->16, 0o->8, 0b->2, leading 0->8, else 10; a leading "#" forces hex. The
 * whole string must be valid digits or NaN is returned.
 */
function parseNumber(input: string): number {
  const { number, base } = stripNumberPrefix(input);
  const negative = number.startsWith("-");
  const body = negative ? number.slice(1) : number;
  const lower = body.toLowerCase();

  let parsed: number;
  if (base === 16) {
    parsed = strictParse(lower, 16);
  } else if (lower.startsWith("0x")) {
    parsed = strictParse(lower.slice(2), 16);
  } else if (lower.startsWith("0o")) {
    parsed = strictParse(lower.slice(2), 8);
  } else if (lower.startsWith("0b")) {
    parsed = strictParse(lower.slice(2), 2);
  } else if (lower.length > 1 && lower.startsWith("0")) {
    parsed = strictParse(lower.slice(1), 8);
  } else {
    parsed = strictParse(lower, 10);
  }

  return negative ? -parsed : parsed;
}

/**
 * setConfigField parses a raw string value according to the field schema and
 * writes the typed result onto the target config object (keyed by field.name).
 * Returns whether the value was valid.
 */
export function setConfigField(
  config: Record<string, unknown>,
  field: FieldSchema,
  raw: string,
  enums: Record<string, EnumFormatter>,
): boolean {
  const type = field.type ?? "string";
  switch (type) {
    case "string":
    case "prop": {
      config[field.name] = raw;
      return true;
    }
    case "bool": {
      const { value, ok } = parseBool(raw, false);
      if (!ok) {
        return false;
      }
      config[field.name] = value;
      return true;
    }
    case "int":
    case "uint": {
      const parsed = parseNumber(raw);
      if (Number.isNaN(parsed)) {
        return false;
      }
      config[field.name] = parsed;
      return true;
    }
    case "float": {
      const parsed = Number.parseFloat(raw);
      if (Number.isNaN(parsed)) {
        return false;
      }
      config[field.name] = parsed;
      return true;
    }
    case "enum": {
      const formatter = field.enumName ? enums[field.enumName] : undefined;
      if (!formatter) {
        return false;
      }
      config[field.name] = formatter.parse(raw);
      return true;
    }
    case "string[]":
    case "prop[]": {
      const separator = field.separator ?? ",";
      config[field.name] = raw.length > 0 ? raw.split(separator) : [];
      return true;
    }
    default:
      return false;
  }
}

/**
 * getConfigFieldString reads a typed config field and renders it back into the
 * canonical string representation used in URLs.
 */
export function getConfigFieldString(
  config: Record<string, unknown>,
  field: FieldSchema,
  enums: Record<string, EnumFormatter>,
): string {
  const type = field.type ?? "string";
  const value = config[field.name];
  switch (type) {
    case "bool":
      return printBool(Boolean(value));
    case "uint": {
      const num = typeof value === "number" ? value : 0;
      const base = field.base ?? 10;
      const rendered = num.toString(base);
      // Go renders unsigned base-16 values with a "0x" prefix (see node.go).
      return base === 16 ? `0x${rendered}` : rendered;
    }
    case "int": {
      const num = typeof value === "number" ? value : 0;
      return num.toString(field.base ?? 10);
    }
    case "float": {
      const num = typeof value === "number" ? value : 0;
      return num.toString();
    }
    case "enum": {
      const formatter = field.enumName ? enums[field.enumName] : undefined;
      const num = typeof value === "number" ? value : 0;
      return formatter ? formatter.print(num) : String(num);
    }
    case "string[]":
    case "prop[]": {
      const separator = field.separator ?? ",";
      return Array.isArray(value) ? value.join(separator) : "";
    }
    default:
      return value == null ? "" : String(value);
  }
}
