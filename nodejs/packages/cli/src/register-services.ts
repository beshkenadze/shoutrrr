/**
 * Registers all remaining notification services into the CLI's service
 * registry, so `send` (and `verify`) resolve every scheme.
 *
 * The built-in `logger://` service is registered separately (see
 * ./core/services/logger.ts) and remains authoritative for the CLI, so it is
 * intentionally NOT re-registered here.
 *
 * Each `@shoutrrr/<service>` package vendors its own structurally-identical
 * `Service` type (pending the core-fold cleanup), so factories are accepted as
 * opaque thunks and cast to the CLI's `ServiceFactory`.
 */

import { descriptor as bark } from "@shoutrrr/bark";
import { descriptor as discord } from "@shoutrrr/discord";
import { descriptor as generic } from "@shoutrrr/generic";
import { descriptor as googlechat } from "@shoutrrr/googlechat";
import { descriptor as gotify } from "@shoutrrr/gotify";
import { descriptor as ifttt } from "@shoutrrr/ifttt";
import { descriptor as join } from "@shoutrrr/join";
import { descriptor as matrix } from "@shoutrrr/matrix";
import { descriptor as mattermost } from "@shoutrrr/mattermost";
import { descriptor as ntfy } from "@shoutrrr/ntfy";
import { descriptor as opsgenie } from "@shoutrrr/opsgenie";
import { descriptor as pushbullet } from "@shoutrrr/pushbullet";
import { descriptor as pushover } from "@shoutrrr/pushover";
import { descriptor as rocketchat } from "@shoutrrr/rocketchat";
import { descriptor as slack } from "@shoutrrr/slack";
import { descriptor as smtp } from "@shoutrrr/smtp";
import { descriptor as teams } from "@shoutrrr/teams";
import { descriptor as telegram } from "@shoutrrr/telegram";
import { descriptor as zulip } from "@shoutrrr/zulip";
import { registerService, type ServiceFactory } from "./core/router.js";

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

for (const descriptor of descriptors) {
  for (const scheme of descriptor.schemes) {
    registerService(scheme, descriptor.factory as ServiceFactory);
  }
}
