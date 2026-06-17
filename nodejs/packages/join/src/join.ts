// Port of Go pkg/services/join/join.go (Service).

import { request, type Dispatcher } from 'undici';
import { Config } from './config.js';
import { Standard, type Logger, type Params } from './core/index.js';

/** Default Join push endpoint (mirrors the Go hookURL constant). */
export const hookURL =
  'https://joinjoaomgcd.appspot.com/_ah/api/messaging/v1/sendPush';
const contentType = 'text/plain';

export interface JoinServiceOptions {
  /** Injectable undici dispatcher (e.g. for connection pooling/testing). */
  dispatcher?: Dispatcher;
  /** Override the push endpoint base URL (used by tests). */
  baseURL?: string;
}

/** Service provides the Join notification service. */
export class JoinService extends Standard {
  private config: Config | undefined;
  private readonly dispatcher?: Dispatcher;
  private readonly baseURL: string;

  constructor(opts: JoinServiceOptions = {}) {
    super();
    this.dispatcher = opts.dispatcher;
    this.baseURL = opts.baseURL ?? hookURL;
  }

  /** initialize loads the config from configURL and sets the logger. */
  initialize(configURL: URL, logger?: Logger): void {
    this.setLogger(logger);
    const config = new Config();
    config.setURL(configURL);
    this.config = config;
  }

  /** send delivers message to the configured Join devices. */
  async send(message: string, params?: Params): Promise<void> {
    const config = this.config;
    if (!config) {
      throw new Error('service not initialized');
    }

    const title = params?.['title'] ?? config.title;
    const icon = params?.['icon'] ?? config.icon;
    const devices = config.devices.join(',');

    await this.sendToDevices(config.apiKey, devices, message, title, icon);
  }

  private async sendToDevices(
    apiKey: string,
    devices: string,
    message: string,
    title: string,
    icon: string,
  ): Promise<void> {
    const data = new URLSearchParams();
    data.set('deviceIds', devices);
    data.set('apikey', apiKey);
    data.set('text', message);

    if (title.length > 0) {
      data.set('title', title);
    }

    if (icon.length > 0) {
      data.set('icon', icon);
    }

    const apiURL = `${this.baseURL}?${data.toString()}`;

    const res = await request(apiURL, {
      method: 'POST',
      headers: { 'content-type': contentType },
      ...(this.dispatcher ? { dispatcher: this.dispatcher } : {}),
    });

    // Drain the body to release the connection.
    await res.body.text();

    if (res.statusCode !== 200) {
      throw new Error(
        `failed to send notification to join devices "${devices}", response status "${res.statusCode}"`,
      );
    }
  }
}
