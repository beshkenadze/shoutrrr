// Ported from Go pkg/services/ntfy/ntfy_config.go.
import { encodeUserinfoComponent, type FieldSchema } from './core/format.js';
import { PropKeyResolver } from './core/propKeyResolver.js';
import type { EnumFormatter, ServiceConfig } from './core/types.js';
import { Priority, priorityEnum } from './priority.js';

/** Scheme is the identifying part of this service's configuration URL. */
export const Scheme = 'ntfy';

/**
 * fieldSchema describes the query-serializable config fields. URL-part fields
 * (host/topic/username/password) are handled directly in get/setURL and are not
 * listed here, matching the Go split between url tags and key tags.
 */
export const fieldSchema: FieldSchema[] = [
  { name: 'title', key: ['title'], type: 'string', default: '', desc: 'Message title' },
  { name: 'scheme', key: ['scheme'], type: 'string', default: 'https', desc: 'Server protocol, http or https' },
  { name: 'tags', key: ['tags'], type: 'string[]', default: '', desc: 'List of tags that may or not map to emojis' },
  { name: 'priority', key: ['priority'], type: 'enum', enumName: 'priority', default: 'default', desc: 'Message priority with 1=min, 3=default and 5=max' },
  { name: 'actions', key: ['actions'], type: 'string[]', separator: ';', default: '', desc: 'Custom user action buttons for notifications' },
  { name: 'click', key: ['click'], type: 'string', default: '', desc: 'Website opened when notification is clicked' },
  { name: 'attach', key: ['attach'], type: 'string', default: '', desc: 'URL of an attachment' },
  { name: 'filename', key: ['filename'], type: 'string', default: '', desc: 'File name of the attachment' },
  { name: 'delay', key: ['delay', 'at', 'in'], type: 'string', default: '', desc: 'Timestamp or duration for delayed delivery' },
  { name: 'email', key: ['email'], type: 'string', default: '', desc: 'E-mail address for e-mail notifications' },
  { name: 'icon', key: ['icon'], type: 'string', default: '', desc: 'URL to use as notification icon' },
  { name: 'cache', key: ['cache'], type: 'bool', default: 'yes', desc: 'Cache messages' },
  { name: 'firebase', key: ['firebase'], type: 'bool', default: 'yes', desc: 'Send to firebase' },
  { name: 'markdown', key: ['markdown'], type: 'bool', default: 'no', desc: 'Enable markdown formatting' },
];

/** Config holds the ntfy service configuration. */
export class Config implements ServiceConfig {
  // URL-part fields.
  host = 'ntfy.sh';
  topic = '';
  username = '';
  password = '';

  // Query fields (defaults set explicitly to match Go SetDefaultProps).
  title = '';
  scheme = 'https';
  tags: string[] = [''];
  priority: number = Priority.Default;
  actions: string[] = [''];
  click = '';
  attach = '';
  filename = '';
  delay = '';
  email = '';
  icon = '';
  cache = true;
  firebase = true;
  markdown = false;

  enums(): Record<string, EnumFormatter> {
    return { priority: priorityEnum };
  }

  private resolver(): PropKeyResolver {
    return new PropKeyResolver(
      this as unknown as Record<string, unknown>,
      fieldSchema,
      this.enums(),
    );
  }

  /**
   * getURL returns a URL representation of the current field values, built to be
   * byte-identical to the Go reference (url.URL with ForceQuery + UserPassword):
   * credentials are always emitted as "user:pass@" (even when empty -> ":@"),
   * the query is always present (trailing "?" when empty), and query/userinfo
   * components use Go-compatible escaping.
   */
  getURL(): URL {
    const user = encodeUserinfoComponent(this.username);
    const pass = encodeUserinfoComponent(this.password);
    const path = this.topic.startsWith('/') ? this.topic : `/${this.topic}`;
    const query = this.resolver().buildQuery();
    return new URL(`${Scheme}://${user}:${pass}@${this.host}${path}?${query}`);
  }

  /** setURL updates the config from a URL representation of its field values. */
  setURL(url: URL): void {
    this.password = decodeURIComponent(url.password);
    this.username = decodeURIComponent(url.username);
    this.host = url.host;
    this.topic = url.pathname.replace(/^\//, '');

    this.resolver().setFromURL(url);
  }

  /**
   * getAPIURL returns the target endpoint for sending. Mirrors Go GetAPIURL:
   * scheme/host from config, path = "/<topic>", credentials only if a password
   * is set.
   */
  getAPIURL(): string {
    const path = this.topic.startsWith('/') ? this.topic : `/${this.topic}`;
    const url = new URL(`${this.scheme}://placeholder`);
    url.host = this.host;
    url.pathname = path;
    if (this.password !== '') {
      url.username = encodeURIComponent(this.username);
      url.password = encodeURIComponent(this.password);
    }
    return url.toString();
  }
}
