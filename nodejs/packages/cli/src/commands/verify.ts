/**
 * `verify` command.
 *
 * Faithful port of `shoutrrr/cmd/verify/verify.go`. Parses the URL into a
 * service config and prints the resolved config tree, without sending.
 */

import { Command } from "commander";

import { colorFormatTree, getConfigFormat, getServiceConfig } from "../core/format.js";
import { ServiceRouter } from "../core/router.js";

/**
 * Core verify logic, decoupled from commander for testability.
 *
 * Returns the rendered config tree string. Throws on an unresolvable URL.
 */
export function runVerify(rawURL: string): string {
  const router = new ServiceRouter();
  const service = router.locate(rawURL);
  const config = getServiceConfig(service);
  const fields = getConfigFormat(config);
  return colorFormatTree(fields);
}

/** Builds the commander `verify` subcommand. */
export function createVerifyCommand(): Command {
  const cmd = new Command("verify");
  cmd
    .description("Verify the validity of a notification service URL")
    .requiredOption("-u, --url <url>", "The notification url")
    .action((opts: { url: string }) => {
      let tree: string;
      try {
        tree = runVerify(opts.url);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        process.stdout.write(`error verifying URL: ${message}\n`);
        process.exitCode = 1;
        return;
      }
      process.stdout.write(tree);
    });
  return cmd;
}
