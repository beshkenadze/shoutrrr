import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
// Resolve the real undici entry (not Bun's incomplete bare-specifier shim) so
// MockAgent has disableNetConnect/close and interops with the client's request.
import { MockAgent, setGlobalDispatcher } from 'undici/index.js';
import {
  buildWebhookURL,
  Config,
  LegacyHost,
  parseAndVerifyWebhookURL,
  type WebhookParts,
} from '../src/config.js';
import { buildPayload } from '../src/payload.js';
import { TeamsService } from '../src/teams.js';

// Mirrors the constants in Go's teams_test.go.
const legacyWebhookURL =
  'https://outlook.office.com/webhook/11111111-4444-4444-8444-cccccccccccc@22222222-4444-4444-8444-cccccccccccc/IncomingWebhook/33333333012222222222333333333344/44444444-4444-4444-8444-cccccccccccc';
const scopedWebhookURL =
  'https://test.webhook.office.com/webhookb2/11111111-4444-4444-8444-cccccccccccc@22222222-4444-4444-8444-cccccccccccc/IncomingWebhook/33333333012222222222333333333344/44444444-4444-4444-8444-cccccccccccc';
const scopedDomainHost = 'test.webhook.office.com';
const testURLBase =
  'teams://11111111-4444-4444-8444-cccccccccccc@22222222-4444-4444-8444-cccccccccccc/33333333012222222222333333333344/44444444-4444-4444-8444-cccccccccccc';
const scopedURLBase = `${testURLBase}?host=${scopedDomainHost}`;

const sampleParts: WebhookParts = [
  '11111111-4444-4444-8444-cccccccccccc',
  '22222222-4444-4444-8444-cccccccccccc',
  '33333333012222222222333333333344',
  '44444444-4444-4444-8444-cccccccccccc',
];

describe('the teams service', () => {
  describe('creating the webhook URL', () => {
    it('should match the expected output for legacy URLs', () => {
      const config = new Config();
      config.setFromWebhookParts(sampleParts);
      const apiURL = buildWebhookURL(
        LegacyHost,
        config.group,
        config.tenant,
        config.altID,
        config.groupOwner,
      );
      expect(apiURL).toBe(legacyWebhookURL);

      const parts = parseAndVerifyWebhookURL(apiURL);
      expect(parts).toEqual(config.webhookParts());
    });

    it('should match the expected output for custom URLs', () => {
      const config = new Config();
      config.setFromWebhookParts(sampleParts);
      const apiURL = buildWebhookURL(
        scopedDomainHost,
        config.group,
        config.tenant,
        config.altID,
        config.groupOwner,
      );
      expect(apiURL).toBe(scopedWebhookURL);

      const parts = parseAndVerifyWebhookURL(apiURL);
      expect(parts).toEqual(config.webhookParts());
    });
  });

  describe('creating a config', () => {
    describe('parsing the configuration URL', () => {
      it('should be identical after de-/serialization', () => {
        const testURL = `${testURLBase}?color=aabbcc&host=test.outlook.office.com&title=Test+title`;

        const config = new Config();
        config.host = LegacyHost;
        config.setURL(new URL(testURL));

        const outputURL = config.getURL();
        expect(outputURL.toString()).toBe(testURL);
      });
    });
  });

  describe('converting custom URL to service URL', () => {
    describe('an invalid custom URL is provided', () => {
      it('should return an error', () => {
        const service = new TeamsService();
        const customURL = new URL('teams+https://google.com/search?q=what+is+love');
        expect(() => service.getConfigURLFromCustom(customURL)).toThrow();
      });
    });

    describe('a valid custom URL is provided', () => {
      it('should set the host field from the custom URL', () => {
        const service = new TeamsService();
        const customURL = new URL(`teams+${scopedWebhookURL}`);
        const serviceURL = service.getConfigURLFromCustom(customURL);
        expect(serviceURL.toString()).toBe(scopedURLBase);
      });

      it('should preserve the query params in the generated service URL', () => {
        const service = new TeamsService();
        const customURL = new URL(`teams+${legacyWebhookURL}?color=f008c1&title=TheTitle`);
        const serviceURL = service.getConfigURLFromCustom(customURL);
        expect(serviceURL.toString()).toBe(`${testURLBase}?color=f008c1&title=TheTitle`);
      });
    });
  });

  describe('building the MessageCard payload', () => {
    it('should produce one section per message line and derive a summary', () => {
      const card = buildPayload('Hello\nWorld', '', 'aabbcc');
      expect(card['@type']).toBe('MessageCard');
      expect(card['@context']).toBe('http://schema.org/extensions');
      expect(card.markdown).toBe(true);
      expect(card.themeColor).toBe('aabbcc');
      expect(card.title).toBeUndefined();
      expect(card.sections).toEqual([
        { text: 'Hello', startGroup: false },
        { text: 'World', startGroup: false },
      ]);
      // No title -> summary is the first line.
      expect(card.summary).toBe('Hello');
    });

    it('should use the title as the summary when present', () => {
      const card = buildPayload('Body', 'A Title', '');
      expect(card.title).toBe('A Title');
      expect(card.summary).toBe('A Title');
      expect(card.themeColor).toBeUndefined();
    });

    it('should truncate a long first-line summary to 21 chars', () => {
      const longLine = 'x'.repeat(40);
      const card = buildPayload(longLine, '', '');
      expect(card.summary).toBe('x'.repeat(21));
    });
  });

  describe('sending the payload', () => {
    let mockAgent: MockAgent;

    beforeEach(() => {
      mockAgent = new MockAgent();
      mockAgent.disableNetConnect();
      setGlobalDispatcher(mockAgent);
    });

    afterEach(async () => {
      await mockAgent.close();
    });

    it('should not report an error if the server accepts the payload', async () => {
      const service = new TeamsService({ dispatcher: mockAgent });
      service.initialize(new URL(scopedURLBase));

      let receivedBody = '';
      mockAgent
        .get(`https://${scopedDomainHost}`)
        .intercept({
          path: '/webhookb2/11111111-4444-4444-8444-cccccccccccc@22222222-4444-4444-8444-cccccccccccc/IncomingWebhook/33333333012222222222333333333344/44444444-4444-4444-8444-cccccccccccc',
          method: 'POST',
        })
        .reply(200, (opts) => {
          receivedBody = String(opts.body);
          return '';
        });

      await service.send('Message');

      const parsed = JSON.parse(receivedBody) as Record<string, unknown>;
      expect(parsed['@type']).toBe('MessageCard');
      expect(parsed.summary).toBe('Message');
    });

    it('should reject if the server rejects the payload', async () => {
      const service = new TeamsService({ dispatcher: mockAgent });
      service.initialize(new URL(testURLBase));

      mockAgent
        .get(`https://${LegacyHost}`)
        .intercept({
          path: '/webhook/11111111-4444-4444-8444-cccccccccccc@22222222-4444-4444-8444-cccccccccccc/IncomingWebhook/33333333012222222222333333333344/44444444-4444-4444-8444-cccccccccccc',
          method: 'POST',
        })
        .reply(500, 'server error');

      await expect(service.send('Message')).rejects.toThrow();
    });
  });
});
