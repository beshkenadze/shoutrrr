/**
 * Core type definitions, faithfully ported from Go `pkg/types`.
 */

/** Params is the string map used to provide additional variables to the service templates. */
export type Params = Record<string, string>;

/** TitleKey is the common key for the title prop. */
export const TitleKey = 'title';
/** MessageKey is the common key for the message prop. */
export const MessageKey = 'message';

/** EnumFormatter converts between enum values and their string representations. */
export interface EnumFormatter {
  print(e: number): string;
  parse(s: string): number;
  names(): string[];
}

/** ConfigProp is implemented by config props that serialize from/to a single string value. */
export interface ConfigProp {
  setFromProp(propValue: string): void;
  getPropValue(): string;
}

/** Logger is the subset of the stdlib logger used by services. */
export interface Logger {
  logf(format: string, ...args: unknown[]): void;
}

/** ServiceConfig is the configuration backing a service. */
export interface ServiceConfig {
  getURL(): URL;
  setURL(url: URL): void;
  enums(): Record<string, EnumFormatter>;
}

/** Service is the interface implemented by all notification services. */
export interface Service {
  initialize(url: URL, logger?: Logger): void;
  setLogger(logger: Logger): void;
  send(message: string, params?: Params): Promise<void>;
}

/** ConfigQueryResolver resolves config props to/from query keys. */
export interface ConfigQueryResolver {
  queryFields(): string[];
  get(key: string): string;
  set(key: string, value: string): void;
}
