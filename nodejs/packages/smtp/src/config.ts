// Port of Go pkg/services/smtp/smtp_config.go.
import { AuthType, authTypeFormatter } from './authType.js';
import { Encryption, encryptionFormatter } from './encMethod.js';
import type { FieldSchema } from './core/format.js';
import { PropKeyResolver } from './core/propKeyResolver.js';
import type { EnumFormatter, ServiceConfig } from './core/types.js';

/** Scheme is the identifying part of this service's configuration URL. */
export const Scheme = 'smtp';

/** Default port when none is given in the URL (Go: Config.Port default). */
export const DefaultPort = 25;

/**
 * smtpFieldSchema mirrors the Go Config struct tags. Order matches the Go
 * struct; `key` holds the query keys (first entry is the primary/canonical key).
 * username/password/host/port live in URL parts, not the query string.
 */
export const smtpFieldSchema: FieldSchema[] = [
  { name: 'host', type: 'string', urlParts: ['host'], desc: 'SMTP server hostname or IP address' },
  { name: 'username', type: 'string', urlParts: ['user'], default: '', desc: 'SMTP server username' },
  { name: 'password', type: 'string', urlParts: ['pass'], default: '', desc: 'SMTP server password or hash (for OAuth2)' },
  { name: 'port', type: 'uint', urlParts: ['port'], default: '25', desc: 'SMTP server port, common ones are 25, 465, 587 or 2525' },
  { name: 'fromAddress', type: 'string', key: ['fromaddress', 'from'], desc: 'E-mail address that the mail are sent from' },
  { name: 'fromName', type: 'string', key: ['fromname'], desc: 'Name of the sender' },
  { name: 'toAddresses', type: 'string[]', key: ['toaddresses', 'to'], desc: 'List of recipient e-mails separated by "," (comma)' },
  { name: 'subject', type: 'string', key: ['subject', 'title'], default: 'Shoutrrr Notification', desc: 'The subject of the sent mail' },
  { name: 'auth', type: 'enum', key: ['auth'], default: 'Unknown', enumName: 'auth', desc: 'SMTP authentication method' },
  { name: 'encryption', type: 'enum', key: ['encryption'], default: 'Auto', enumName: 'encryption', desc: 'Encryption method' },
  { name: 'useStartTLS', type: 'bool', key: ['usestarttls', 'starttls'], default: 'Yes', desc: 'Whether to use StartTLS encryption' },
  { name: 'useHTML', type: 'bool', key: ['usehtml'], default: 'No', desc: 'Whether the message being sent is in HTML' },
  { name: 'clientHost', type: 'string', key: ['clienthost'], default: 'localhost', desc: 'The client host name sent to the SMTP server during HELLO phase. If set to "auto" it will use the OS hostname' },
];

/** Config is the configuration needed to send e-mail notifications over SMTP. */
export class Config implements ServiceConfig {
  host = '';
  username = '';
  password = '';
  port: number = DefaultPort;
  fromAddress = '';
  fromName = '';
  toAddresses: string[] = [];
  subject = '';
  auth: AuthType = AuthType.Unknown;
  encryption: Encryption = Encryption.Auto;
  useStartTLS = true;
  useHTML = false;
  clientHost = 'localhost';

  /** enums returns the EnumFormatters keyed by enumName (Go: Config.Enums). */
  enums(): Record<string, EnumFormatter> {
    return {
      auth: authTypeFormatter,
      encryption: encryptionFormatter,
    };
  }

  private pkr: PropKeyResolver | undefined;

  /**
   * resolver returns this instance's PropKeyResolver, built once. The resolver
   * holds a live reference to this config, so reads/writes always see current
   * field values; the schema and enums are immutable, so it never needs rebuilding.
   */
  private resolver(): PropKeyResolver {
    if (!this.pkr) {
      this.pkr = new PropKeyResolver(
        this as unknown as Record<string, unknown>,
        smtpFieldSchema,
        this.enums(),
      );
    }
    return this.pkr;
  }

  /** getURL returns a URL representation of the current field values (Go: GetURL). */
  getURL(): URL {
    const url = new URL(`${Scheme}://`);

    // Host must be set before userinfo: the WHATWG URL parser silently drops
    // username/password while the host is empty.
    url.hostname = this.host;
    url.port = String(this.port);
    url.pathname = '/';

    // Userinfo: only emit when set (Go: util.URLUserPassword).
    if (this.password.length > 0) {
      url.username = encodeURIComponent(this.username);
      url.password = encodeURIComponent(this.password);
    } else if (this.username.length > 0) {
      url.username = encodeURIComponent(this.username);
    }

    this.resolver().bindToURL(url);
    return url;
  }

  /** setURL updates the config from a URL representation (Go: SetURL). */
  setURL(url: URL): void {
    this.username = decodeURIComponent(url.username);
    this.password = decodeURIComponent(url.password);
    this.host = url.hostname;

    if (url.port !== '') {
      const port = Number.parseInt(url.port, 10);
      if (!Number.isNaN(port)) {
        this.port = port;
      }
    }

    this.resolver().setFromURL(url);

    if (this.fromAddress.length < 1) {
      throw new Error('fromAddress missing from config URL');
    }
    if (this.toAddresses.length < 1) {
      throw new Error('toAddress missing from config URL');
    }
  }

  /** clone returns a deep-enough copy of the config (Go: Config.Clone). */
  clone(): Config {
    const clone = new Config();
    clone.host = this.host;
    clone.username = this.username;
    clone.password = this.password;
    clone.port = this.port;
    clone.fromAddress = this.fromAddress;
    clone.fromName = this.fromName;
    clone.toAddresses = [...this.toAddresses];
    clone.subject = this.subject;
    clone.auth = this.auth;
    clone.encryption = this.encryption;
    clone.useStartTLS = this.useStartTLS;
    clone.useHTML = this.useHTML;
    clone.clientHost = this.clientHost;
    return clone;
  }

  /** fixEmailTags restores '+' chars parsed as spaces in e-mail addresses (Go: FixEmailTags). */
  fixEmailTags(): void {
    this.fromAddress = this.fromAddress.replaceAll(' ', '+');
    this.toAddresses = this.toAddresses.map((adr) => adr.replaceAll(' ', '+'));
  }

  /** updateFromParams applies send-time param overrides (Go: PropKeyResolver.UpdateConfigFromParams). */
  updateFromParams(params?: Record<string, string>): Error | undefined {
    return this.resolver().updateConfigFromParams(params);
  }
}
