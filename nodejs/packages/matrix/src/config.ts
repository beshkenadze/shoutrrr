// Matrix service configuration — port of Go matrix_config.go.
import type { ConfigObject, FieldSchema } from './core/format.js';
import { PropKeyResolver } from './core/propKeyResolver.js';
import { EnumlessConfig } from './core/standard.js';

export const Scheme = 'matrix';
export const defaultDeviceID = 'shoutrrr';

// decodeURIComponentSafe tolerates malformed percent-escapes (e.g. a literal
// "%" in a password/token) by returning the raw value instead of throwing.
function decodeURIComponentSafe(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

// Query (key-tagged) fields. Order and aliases mirror the Go struct.
// QueryFields count = 5: disableTLS, deviceID, rooms, room (alias), title.
export const matrixFields: FieldSchema[] = [
  { name: 'disableTLS', type: 'bool', key: ['disableTLS'], default: 'No' },
  {
    name: 'deviceID',
    type: 'string',
    key: ['deviceID'],
    default: defaultDeviceID,
    desc: 'Device ID for password login; keeps Matrix homeservers from creating a new device for each login',
  },
  {
    name: 'rooms',
    type: 'string[]',
    key: ['rooms', 'room'],
    desc: 'Room aliases, or with ! prefix, room IDs',
  },
  { name: 'title', type: 'string', key: ['title'], default: '' },
];

export class Config extends EnumlessConfig {
  user = '';
  password = '';
  disableTLS = false;
  deviceID = defaultDeviceID;
  host = '';
  rooms: string[] = [];
  title = '';

  private asObject(): ConfigObject {
    return this as unknown as ConfigObject;
  }

  newResolver(): PropKeyResolver {
    return new PropKeyResolver(this.asObject(), matrixFields, this.enums());
  }

  // cloneForParams returns a resolver bound to a shallow copy of this config.
  // Applying params through it validates them (surfacing errors) without
  // mutating the live config — mirroring Go's `config := *s.config`.
  cloneForParams(): PropKeyResolver {
    const copy: Config = Object.assign(
      Object.create(Config.prototype) as Config,
      this,
    );
    copy.rooms = [...this.rooms];
    return new PropKeyResolver(
      copy as unknown as ConfigObject,
      matrixFields,
      copy.enums(),
    );
  }

  getURL(): URL {
    return new URL(this.getURLString());
  }

  setURL(url: URL): void {
    this.setURLWith(this.newResolver(), url);
  }

  // getURLString builds the canonical URL string, matching Go's url.URL with
  // ForceQuery=true and an empty path (no trailing slash before "?").
  getURLString(): string {
    const resolver = this.newResolver();
    const query = new URLSearchParams();
    resolver.bindToQuery(query);
    const userInfo =
      this.user !== '' || this.password !== ''
        ? `${encodeURIComponent(this.user)}:${encodeURIComponent(this.password)}@`
        : '';
    return `${Scheme}://${userInfo}${this.host}?${query.toString()}`;
  }

  setURLWith(resolver: PropKeyResolver, url: URL): void {
    this.deviceID = defaultDeviceID;
    this.user = decodeURIComponentSafe(url.username);
    this.password = decodeURIComponentSafe(url.password);
    this.host = url.host;

    resolver.setFromURL(url);

    this.rooms = this.rooms.map((room) => {
      if (room.length === 0) {
        return room;
      }
      const first = room[0];
      if (first !== '#' && first !== '!') {
        return `#${room}`;
      }
      return room;
    });
  }
}
