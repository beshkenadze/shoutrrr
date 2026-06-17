import { describe, expect, it } from "bun:test";
import type { Dispatcher } from "undici";
import { Config } from "../src/config.js";
import {
  createAPIURLFromConfig,
  createItemsFromPlain,
  DiscordService,
} from "../src/discord.js";
import { createPayloadFromItems } from "../src/payload.js";
import { MessageLevel, type MessageItem } from "../src/core/index.js";

const dummyColors = new Array<number>(5).fill(0);

describe("the discord service", () => {
  describe("the service", () => {
    it("should implement the Service interface", () => {
      const service = new DiscordService();
      expect(typeof service.initialize).toBe("function");
      expect(typeof service.send).toBe("function");
      expect(typeof service.setLogger).toBe("function");
    });
  });

  describe("creating a config", () => {
    it("should throw if no arguments were supplied", () => {
      const service = new DiscordService();
      expect(() => service.initialize(new URL("discord://"))).toThrow();
    });

    it("should not throw if exactly two arguments are given", () => {
      const service = new DiscordService();
      expect(() =>
        service.initialize(new URL("discord://dummyToken@dummyChannel")),
      ).not.toThrow();
    });

    it("should not throw when given the raw path parameter", () => {
      const service = new DiscordService();
      expect(() =>
        service.initialize(new URL("discord://dummyToken@dummyChannel/raw")),
      ).not.toThrow();
    });

    it("should set the JSON flag when given the raw path parameter", () => {
      const config = new Config();
      config.setURL(new URL("discord://dummyToken@dummyChannel/raw"));
      expect(config.json).toBe(true);
    });

    it("should not set the JSON flag when not provided raw path parameter", () => {
      const config = new Config();
      config.setURL(new URL("discord://dummyToken@dummyChannel"));
      expect(config.json).toBe(false);
    });

    it("should throw if more than two arguments are given", () => {
      const service = new DiscordService();
      expect(() =>
        service.initialize(
          new URL("discord://dummyToken@dummyChannel/illegal-argument"),
        ),
      ).toThrow();
    });
  });

  describe("URL round-trip", () => {
    it("preserves webhook id and token", () => {
      const config = new Config();
      config.webhookID = "1";
      config.token = "dummyToken";

      const roundTripped = new Config();
      roundTripped.setURL(config.getURL());

      expect(roundTripped.webhookID).toBe("1");
      expect(roundTripped.token).toBe("dummyToken");
      expect(config.getURL().toString()).toBe(
        roundTripped.getURL().toString(),
      );
    });

    it("round-trips the raw (json) path", () => {
      const config = new Config();
      config.setURL(new URL("discord://dummyToken@dummyChannel/raw"));
      expect(config.getURL().pathname).toBe("/raw");

      const again = new Config();
      again.setURL(config.getURL());
      expect(again.json).toBe(true);
    });

    it("serializes uint colors with a 0x hex prefix", () => {
      const config = new Config();
      config.webhookID = "1";
      config.token = "dummyToken";
      config.color = 0x50d9ff;
      expect(config.getURL().searchParams.get("color")).toBe("0x50d9ff");
    });

    it("accepts camelCase query keys case-insensitively (like Go)", () => {
      const config = new Config();
      config.setURL(
        new URL("discord://dummyToken@1?colorError=0xff0000&splitLines=No"),
      );
      expect(config.colorError).toBe(0xff0000);
      expect(config.splitLines).toBe(false);
    });

    it("throws on an unknown query key (like Go)", () => {
      const config = new Config();
      expect(() =>
        config.setURL(new URL("discord://dummyToken@1?bogus=value")),
      ).toThrow();
    });

    it("throws on a malformed (unprefixed) hex color value", () => {
      const config = new Config();
      // "50d9ff" has no 0x/# prefix -> base-10 -> invalid digits -> rejected,
      // matching Go strconv (which would not silently truncate to 50).
      expect(() =>
        config.setURL(new URL("discord://dummyToken@1?color=50d9ff")),
      ).toThrow();
    });
  });

  describe("creating an API URL", () => {
    it("creates a URL without query parameters when no thread ID", () => {
      const config = new Config();
      config.webhookID = "1";
      config.token = "dummyToken";
      expect(createAPIURLFromConfig(config)).toBe(
        "https://discord.com/api/webhooks/1/dummyToken",
      );
    });

    it("creates a URL with thread_id when a thread ID is set", () => {
      const config = new Config();
      config.webhookID = "1";
      config.token = "dummyToken";
      config.threadID = "987654321";
      expect(createAPIURLFromConfig(config)).toBe(
        "https://discord.com/api/webhooks/1/dummyToken?thread_id=987654321",
      );
    });
  });

  describe("creating a json payload", () => {
    it("throws for a blank message when split lines is enabled", () => {
      const items: MessageItem[] = [];
      expect(items.length).toBe(0);
      expect(() => createPayloadFromItems(items, "title", dummyColors)).toThrow();
    });

    it("throws for a blank message when split lines is disabled", () => {
      const batches = createItemsFromPlain("", false);
      const items = batches[0] ?? [];
      expect(items.length).toBe(0);
      expect(() => createPayloadFromItems(items, "title", dummyColors)).toThrow();
    });

    it("chunks a message that exceeds the max length", () => {
      const payload = buildPayloadFromHundreds(42, false, "Title", dummyColors);
      const embeds = payload.embeds;
      expect(embeds.length).toBe(3);
      expect((embeds[0]?.description ?? "").length).toBe(1994);
      expect((embeds[1]?.description ?? "").length).toBe(1999);
      expect((embeds[2]?.description ?? "").length).toBe(205);
    });

    it("omits characters above the total max", () => {
      const payload = buildPayloadFromHundreds(62, false, "", dummyColors);
      const embeds = payload.embeds;
      expect(embeds.length).toBe(4);
      expect((embeds[0]?.description ?? "").length).toBe(1994);
      expect((embeds[1]?.description ?? "").length).toBe(1999);
      expect((embeds[2]?.description ?? "").length).toBe(1999);
      expect((embeds[3]?.description ?? "").length).toBe(5);
    });

    it("omits the meta chunk when no title is supplied and content fits", () => {
      const payload = buildPayloadFromHundreds(42, false, "", dummyColors);
      expect(payload.embeds[0]?.footer).toBeUndefined();
      expect(payload.embeds[0]?.title ?? "").toBe("");
    });

    it("includes a title when supplied and content fits", () => {
      const payload = buildPayloadFromHundreds(42, false, "Title", dummyColors);
      expect(payload.embeds[0]?.title).toBeTruthy();
    });

    it("builds a rich embed with footer, title and color", () => {
      const colors = new Array<number>(5).fill(0);
      colors[MessageLevel.Warning] = 0xffc441;
      const items: MessageItem[] = [
        {
          text: "Message",
          timestamp: new Date("2006-01-02T15:04:05Z"),
          level: MessageLevel.Warning,
        },
      ];
      const payload = createPayloadFromItems(items, "Title", colors);
      const item = payload.embeds[0];
      expect(payload.embeds.length).toBe(1);
      expect(item?.footer?.text).toBe("Warning");
      expect(item?.title).toBe("Title");
      expect(item?.color).toBe(colors[MessageLevel.Warning]);
      expect(item?.timestamp).toBe("2006-01-02T15:04:05Z");
    });
  });

  describe("sending the payload", () => {
    // Bun's bundled undici ships a non-functional MockAgent, so we inject a tiny
    // dispatcher that records requests and returns canned responses. JsonClient
    // calls dispatcher.request() directly when a dispatcher is supplied, so this
    // intercepts exactly the call the real undici MockAgent would.
    interface CapturedRequest {
      origin: string;
      path: string;
      method: string;
      body?: string;
    }

    function mockDispatcher(
      statusCode: number,
      responseBody = "",
    ): { dispatcher: Dispatcher; requests: CapturedRequest[] } {
      const requests: CapturedRequest[] = [];
      const dispatcher = {
        request(opts: {
          origin: string;
          path: string;
          method: string;
          body?: string;
        }) {
          requests.push({
            origin: String(opts.origin),
            path: opts.path,
            method: opts.method,
            body: opts.body,
          });
          return Promise.resolve({
            statusCode,
            body: { text: () => Promise.resolve(responseBody) },
          });
        },
      } as unknown as Dispatcher;
      return { dispatcher, requests };
    }

    function buildService(
      statusCode: number,
      json = false,
    ): {
      service: DiscordService;
      requests: CapturedRequest[];
    } {
      const { dispatcher, requests } = mockDispatcher(statusCode);
      const config = new Config();
      config.webhookID = "1";
      config.token = "dummyToken";
      config.json = json;

      const service = new DiscordService({ dispatcher });
      service.initialize(config.getURL());
      return { service, requests };
    }

    it("resolves when the server accepts the payload (204)", async () => {
      const { service } = buildService(204);
      await expect(service.send("Message")).resolves.toBeUndefined();
    });

    it("posts the expected JSON body to the webhook URL", async () => {
      const { service, requests } = buildService(204);
      await service.send("Message");

      expect(requests.length).toBe(1);
      const req = requests[0];
      expect(req?.origin).toBe("https://discord.com");
      expect(req?.path).toBe("/api/webhooks/1/dummyToken");
      expect(req?.method).toBe("POST");

      const body = JSON.parse(req?.body ?? "{}") as {
        embeds: Array<{ description: string }>;
      };
      expect(body.embeds.length).toBe(1);
      expect(body.embeds[0]?.description).toBe("Message");
    });

    it("rejects when the server response is not OK (400)", async () => {
      const { service } = buildService(400);
      await expect(service.send("Message")).rejects.toThrow();
    });

    it("rejects when the message is empty", async () => {
      const { service, requests } = buildService(204);
      await expect(service.send("")).rejects.toThrow();
      // The empty message must fail before any HTTP call is made.
      expect(requests.length).toBe(0);
    });

    it("posts the raw body verbatim in json mode", async () => {
      const { service, requests } = buildService(204, true);
      await service.send('{"content":"hi"}');
      expect(requests.length).toBe(1);
      expect(requests[0]?.body).toBe('{"content":"hi"}');
    });

    it("rejects in raw json mode when the server response is not OK", async () => {
      const { service } = buildService(400, true);
      await expect(service.send("Message")).rejects.toThrow();
    });
  });
});

const HUNDRED_CHARS =
  "this string is exactly (to the letter) a hundred characters long which will make the send func error";

function buildPayloadFromHundreds(
  hundreds: number,
  split: boolean,
  title: string,
  colors: number[],
) {
  const message = HUNDRED_CHARS.repeat(hundreds);
  const batches = createItemsFromPlain(message, split);
  const items = batches[0] ?? [];
  return createPayloadFromItems(items, title, colors);
}
