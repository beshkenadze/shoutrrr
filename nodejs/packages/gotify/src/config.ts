// Port of Go pkg/services/gotify/gotify_config.go.
import {
  EnumlessConfig,
  PropKeyResolver,
  type ConfigRecord,
  type EnumFormatter,
  type FieldSchema,
  type ServiceConfig,
} from './core/index.js';

/** Scheme is the identifying part of this service's configuration URL. */
export const SCHEME = 'gotify';

const enumless = new EnumlessConfig();

/** Config holds the parsed Gotify service configuration. */
export class Config implements ServiceConfig, ConfigRecord {
  [key: string]: unknown;

  Token = '';
  Host = '';
  Path = '';
  Priority = 0;
  Title = 'Shoutrrr notification';
  DisableTLS = false;

  /** Schema describes the keyed (query) fields used by the PropKeyResolver. */
  static readonly schema: FieldSchema[] = [
    { name: 'Token', type: 'string', urlParts: ['path2'], required: true, desc: 'Application token' },
    { name: 'Host', type: 'string', urlParts: ['host', 'port'], required: true, desc: 'Server hostname (and optionally port)' },
    { name: 'Path', type: 'string', urlParts: ['path1'], desc: 'Server subpath' },
    { name: 'Priority', type: 'int', key: ['priority'], default: '0' },
    { name: 'Title', type: 'string', key: ['title'], default: 'Shoutrrr notification', title: true },
    { name: 'DisableTLS', type: 'bool', key: ['disabletls'], default: 'No' },
  ];

  enums(): Record<string, EnumFormatter> {
    return enumless.enums();
  }

  /** getURL returns a URL representation of the current field values. */
  getURL(): URL {
    const resolver = new PropKeyResolver(this, Config.schema);
    return this.buildConfigURL(resolver);
  }

  /** setURL updates the config from a URL representation of its field values. */
  setURL(url: URL): void {
    const resolver = new PropKeyResolver(this, Config.schema);
    this.parseConfigURL(resolver, url);
  }

  private buildConfigURL(resolver: PropKeyResolver): URL {
    // Mirror Go url.URL{ Host, Scheme, Path: Path+Token, RawQuery }.String().
    const path = this.Path + this.Token;
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(`${SCHEME}://${this.Host}${normalizedPath}`);
    resolver.bindToURL(url);
    return url;
  }

  private parseConfigURL(resolver: PropKeyResolver, url: URL): void {
    // url.pathname is already the (mostly) decoded path; Go's net/url likewise
    // exposes a decoded url.Path. Avoid an extra decodeURIComponent here — it
    // would throw URIError on a stray '%' and would turn an encoded '%2F' into a
    // real '/', corrupting the token/path split on lastIndexOf('/').
    let path = url.pathname;
    if (path.length > 0 && path[path.length - 1] === '/') {
      path = path.slice(0, -1);
    }
    const tokenIndex = path.lastIndexOf('/') + 1;

    this.Path = path.slice(0, tokenIndex);
    if (this.Path === '/') {
      this.Path = this.Path.slice(1);
    }

    this.Host = url.host;
    this.Token = path.slice(tokenIndex);

    resolver.setFromURL(url);
  }
}
