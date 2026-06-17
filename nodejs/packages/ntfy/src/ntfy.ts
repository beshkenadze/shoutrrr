// Ported from Go pkg/services/ntfy/ntfy.go.
import type { Dispatcher } from 'undici';
import { Config, fieldSchema } from './config.js';
import { ApiError, JsonClient } from './core/jsonclient.js';
import { PropKeyResolver } from './core/propKeyResolver.js';
import { Standard } from './core/standard.js';
import type { Logger, Params, Service } from './core/types.js';
import { type ApiResponse, formatApiError } from './payload.js';
import { priorityEnum } from './priority.js';

const VERSION = '0.0.0-nodejs';

export interface NtfyServiceOptions {
  /** dispatcher is forwarded to the JSON client (enables undici MockAgent in tests). */
  dispatcher?: Dispatcher;
}

/** NtfyService sends notifications via ntfy. */
export class NtfyService implements Service {
  private readonly standard = new Standard();
  private config = new Config();
  private readonly dispatcher?: Dispatcher;

  constructor(opts: NtfyServiceOptions = {}) {
    this.dispatcher = opts.dispatcher;
  }

  setLogger(logger: Logger): void {
    this.standard.setLogger(logger);
  }

  /** initialize loads config from configURL and sets the logger. */
  initialize(url: URL, logger?: Logger): void {
    this.standard.setLogger(logger);
    this.config = new Config();
    this.config.setURL(url);
  }

  /** send delivers message to ntfy, applying any per-send params first. */
  async send(message: string, params?: Params): Promise<void> {
    const config = this.config;

    if (params) {
      const pkr = new PropKeyResolver(
        config as unknown as Record<string, unknown>,
        fieldSchema,
        config.enums(),
      );
      pkr.updateConfigFromParams(params);
    }

    await this.sendAPI(config, message);
  }

  private async sendAPI(config: Config, message: string): Promise<void> {
    const client = new JsonClient(
      this.dispatcher ? { dispatcher: this.dispatcher } : {},
    );

    // ntfy expects a raw text body and custom headers, not a JSON Content-Type.
    delete client.headers['Content-Type'];
    client.headers['User-Agent'] = `shoutrrr/${VERSION}`;
    addHeaderIfNotEmpty(client.headers, 'Title', config.title);
    addHeaderIfNotEmpty(
      client.headers,
      'Priority',
      priorityEnum.print(config.priority),
    );
    addHeaderIfNotEmpty(client.headers, 'Tags', config.tags.join(','));
    addHeaderIfNotEmpty(client.headers, 'Delay', config.delay);
    addHeaderIfNotEmpty(client.headers, 'Actions', config.actions.join(';'));
    addHeaderIfNotEmpty(client.headers, 'Click', config.click);
    addHeaderIfNotEmpty(client.headers, 'Attach', config.attach);
    addHeaderIfNotEmpty(client.headers, 'X-Icon', config.icon);
    addHeaderIfNotEmpty(client.headers, 'Filename', config.filename);
    addHeaderIfNotEmpty(client.headers, 'Email', config.email);

    if (!config.cache) {
      client.headers['Cache'] = 'no';
    }
    if (!config.firebase) {
      client.headers['Firebase'] = 'no';
    }
    if (config.markdown) {
      client.headers['Markdown'] = 'yes';
    }

    try {
      await client.post<ApiResponse>(config.getAPIURL(), message);
    } catch (err) {
      if (err instanceof ApiError) {
        const body = (err.body ?? {}) as ApiResponse;
        throw new Error(
          `failed to send ntfy notification: ${formatApiError(body)}`,
        );
      }
      throw new Error(
        `failed to send ntfy notification: ${(err as Error).message}`,
      );
    }
  }
}

function addHeaderIfNotEmpty(
  headers: Record<string, string>,
  key: string,
  value: string,
): void {
  if (value !== '') {
    headers[key] = value;
  }
}
