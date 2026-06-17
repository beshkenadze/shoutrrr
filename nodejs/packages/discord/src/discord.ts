import type { Dispatcher } from "undici";
import { Config } from "./config.js";
import {
  JsonClient,
  type Logger,
  type MessageItem,
  type MessageLimit,
  messageItemsFromLines,
  type Params,
  partitionMessage,
  type Service as IService,
  Standard,
} from "./core/index.js";
import { createPayloadFromItems, type WebhookPayload } from "./payload.js";

const HOOK_URL = "https://discord.com/api/webhooks";

/** Only search this many runes for a good split position. */
const MAX_SEARCH_RUNES = 100;

/** Discord webhook message limits, mirroring Go discord.limits. */
const LIMITS: MessageLimit = {
  chunkSize: 2000,
  totalChunkSize: 6000,
  chunkCount: 10,
};

/**
 * createItemsFromPlain converts a plain message into batches of MessageItems
 * compatible with the Discord webhook payload. Faithful port of Go
 * CreateItemsFromPlain.
 */
export function createItemsFromPlain(
  plain: string,
  splitLines: boolean,
): MessageItem[][] {
  if (splitLines) {
    return messageItemsFromLines(plain, LIMITS);
  }

  const batches: MessageItem[][] = [];
  let rest = plain;
  // Operate on Unicode code points so slicing matches Go's []rune semantics.
  for (;;) {
    const { items, omitted } = partitionMessage(rest, LIMITS, MAX_SEARCH_RUNES);
    batches.push(items);
    if (omitted === 0) {
      break;
    }
    const runes = [...rest];
    rest = runes.slice(runes.length - omitted).join("");
  }

  return batches;
}

/**
 * createAPIURLFromConfig builds the webhook POST URL, appending the thread_id
 * query parameter when set. Faithful port of Go CreateAPIURLFromConfig.
 */
export function createAPIURLFromConfig(config: Config): string {
  const baseURL = `${HOOK_URL}/${config.webhookID}/${config.token}`;
  if (config.threadID !== "") {
    const params = new URLSearchParams();
    params.set("thread_id", config.threadID);
    return `${baseURL}?${params.toString()}`;
  }
  return baseURL;
}

/** Service providing Discord as a notification service. */
export class DiscordService extends Standard implements IService {
  private config = new Config();
  private readonly client: JsonClient;

  constructor(opts?: { dispatcher?: Dispatcher }) {
    super();
    this.client = new JsonClient({ dispatcher: opts?.dispatcher });
  }

  /** initialize loads config from the URL and applies schema defaults first. */
  initialize(url: URL, logger?: Logger): void {
    if (logger) {
      this.setLogger(logger);
    }
    this.config = new Config();
    // Mirror Go Initialize: defaults are applied before the URL overrides them.
    this.config.newResolver().setDefaultProps();
    this.config.setURL(url);
  }

  /** send delivers a plain message, chunking it unless a raw JSON payload is used. */
  async send(message: string, params?: Params): Promise<void> {
    let firstErr: unknown;

    if (this.config.json) {
      const postURL = createAPIURLFromConfig(this.config);
      try {
        // Raw mode posts the message verbatim as the request body.
        await this.client.postRaw<void>(postURL, message);
      } catch (err) {
        firstErr = err;
      }
    } else {
      const batches = createItemsFromPlain(message, this.config.splitLines);
      for (const items of batches) {
        try {
          await this.sendItems(items, params);
        } catch (err) {
          this.log(err);
          if (firstErr === undefined) {
            firstErr = err;
          }
        }
      }
    }

    if (firstErr !== undefined) {
      throw new Error(
        `failed to send discord notification: ${errorMessage(firstErr)}`,
      );
    }
  }

  /** sendItems sends rich message items as embeds. */
  async sendItems(items: MessageItem[], params?: Params): Promise<void> {
    // Clone so per-call param overrides do not mutate the base config.
    const config = this.config.clone();
    config.newResolver().updateConfigFromParams(params);

    const payload: WebhookPayload = createPayloadFromItems(
      items,
      config.title,
      config.levelColors(),
    );
    payload.username = config.username;
    payload.avatar_url = config.avatar;

    const postURL = createAPIURLFromConfig(config);
    // post() treats any 2xx (including Discord's 204 No Content) as success.
    await this.client.post<void>(postURL, payload);
  }
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
