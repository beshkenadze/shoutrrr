/**
 * Core type definitions, faithfully ported from Go `pkg/types`.
 */

/** Params is a map of runtime parameter overrides (Go: types.Params). */
export type Params = Record<string, string>;

/** EnumFormatter mirrors Go's types.EnumFormatter. */
export interface EnumFormatter {
  print(e: number): string;
  parse(s: string): number;
  names(): string[];
}

/** ConfigProp mirrors a single configurable property able to (de)serialize itself. */
export interface ConfigProp {
  setFromProp(v: string): void;
  getPropValue(): string;
}

/** Logger mirrors the subset of Go's StdLogger used by services. */
export interface Logger {
  logf(format: string, ...args: unknown[]): void;
}

/** ServiceConfig mirrors Go's types.ServiceConfig. */
export interface ServiceConfig {
  getURL(): URL;
  setURL(u: URL): void;
  enums(): Record<string, EnumFormatter>;
}

/** Service mirrors Go's types.Service (the parts relevant to a port). */
export interface Service {
  initialize(u: URL, logger?: Logger): void;
  setLogger(l: Logger): void;
  send(message: string, params?: Params): Promise<void>;
}

/** Descriptor used by the registry to construct a service for its schemes. */
export interface ServiceDescriptor {
  schemes: string[];
  factory: () => Service;
}
