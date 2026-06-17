/**
 * Core types ported from Go pkg/types.
 *
 * Vendored into this package's src/core. A later dedupe step folds this into
 * @shoutrrr/core.
 */

/** Params is the string map used to provide additional variables to services. */
export type Params = Record<string, string>;

/** EnumFormatter translates enums between strings and numbers. */
export interface EnumFormatter {
  print(e: number): string;
  parse(s: string): number;
  names(): string[];
}

/** ConfigProp is used to de-/serialize structs from/to a string representation. */
export interface ConfigProp {
  setFromProp(propValue: string): void;
  getPropValue(): string;
}

/** Logger provides the utility method logf for service logging. */
export interface Logger {
  logf(format: string, ...args: unknown[]): void;
}

/** ServiceConfig is the common interface for all service configurations. */
export interface ServiceConfig {
  getURL(): URL;
  setURL(u: URL): void;
  enums(): Record<string, EnumFormatter>;
}

/** Service is the interface implemented by all notification services. */
export interface Service {
  initialize(u: URL, logger?: Logger): void;
  setLogger(l: Logger): void;
  send(message: string, params?: Params): Promise<void>;
}
