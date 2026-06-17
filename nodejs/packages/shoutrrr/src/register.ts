/**
 * Registers every notification service into the shared `@shoutrrr/core`
 * registry. Importing this module (or the package barrel) populates the router
 * so `send`/`createSender`/`newSender` resolve all 20 services.
 *
 * This is the integration-pass equivalent of Go's `pkg/router/servicemap.go`,
 * which statically maps every scheme to its service at package init.
 */

import { registerService, type ServiceFactory } from '@shoutrrr/core';

import { descriptor as bark } from '@shoutrrr/bark';
import { descriptor as discord } from '@shoutrrr/discord';
import { descriptor as generic } from '@shoutrrr/generic';
import { descriptor as googlechat } from '@shoutrrr/googlechat';
import { descriptor as gotify } from '@shoutrrr/gotify';
import { descriptor as ifttt } from '@shoutrrr/ifttt';
import { descriptor as join } from '@shoutrrr/join';
import { descriptor as logger } from '@shoutrrr/logger';
import { descriptor as matrix } from '@shoutrrr/matrix';
import { descriptor as mattermost } from '@shoutrrr/mattermost';
import { descriptor as ntfy } from '@shoutrrr/ntfy';
import { descriptor as opsgenie } from '@shoutrrr/opsgenie';
import { descriptor as pushbullet } from '@shoutrrr/pushbullet';
import { descriptor as pushover } from '@shoutrrr/pushover';
import { descriptor as rocketchat } from '@shoutrrr/rocketchat';
import { descriptor as slack } from '@shoutrrr/slack';
import { descriptor as smtp } from '@shoutrrr/smtp';
import { descriptor as teams } from '@shoutrrr/teams';
import { descriptor as telegram } from '@shoutrrr/telegram';
import { descriptor as zulip } from '@shoutrrr/zulip';

/**
 * A service descriptor as exported by each `@shoutrrr/<service>` package.
 *
 * Each package vendors its own structurally-identical `Service` type (pending
 * the core-fold cleanup), so the factory is accepted as an opaque thunk and
 * cast to the core `ServiceFactory` — they are structurally compatible
 * (`initialize` / `setLogger` / `send`).
 */
interface ServiceDescriptor {
  schemes: readonly string[];
  factory: () => unknown;
}

const descriptors: ServiceDescriptor[] = [
  bark,
  discord,
  generic,
  googlechat,
  gotify,
  ifttt,
  join,
  logger,
  matrix,
  mattermost,
  ntfy,
  opsgenie,
  pushbullet,
  pushover,
  rocketchat,
  slack,
  smtp,
  teams,
  telegram,
  zulip,
];

let registered = false;

/** Registers all services into the core registry. Idempotent. */
export function registerAll(): void {
  if (registered) {
    return;
  }
  for (const descriptor of descriptors) {
    for (const scheme of descriptor.schemes) {
      registerService(scheme, descriptor.factory as ServiceFactory);
    }
  }
  registered = true;
}

registerAll();
