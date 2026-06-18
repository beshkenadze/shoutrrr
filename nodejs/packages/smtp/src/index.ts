// @shoutrrr/smtp public API.
export { AuthType, authTypeFormatter } from './authType.js';
export {
  Encryption,
  encryptionFormatter,
  ImplicitTLSPort,
  useImplicitTLS,
} from './encMethod.js';
export { Config, Scheme, DefaultPort, smtpFieldSchema } from './config.js';
export {
  SmtpService,
  buildTransportOptions,
  buildMessage,
  resolveClientHost,
} from './smtp.js';
export type {
  MailMessage,
  TransportLike,
  TransportOptions,
  TransportFactory,
} from './smtp.js';
export type {
  Params,
  EnumFormatter,
  Logger,
  ServiceConfig,
  Service,
} from '@shoutrrr/core';

import { SmtpService } from './smtp.js';
import type { Service } from '@shoutrrr/core';

/** descriptor registers this service with the scheme registry. */
export const descriptor: { schemes: string[]; factory: () => Service } = {
  schemes: ['smtp'],
  factory: (): Service => new SmtpService(),
};
