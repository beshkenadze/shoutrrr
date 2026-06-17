# shoutrrr (Node.js / TypeScript)

A pure Node.js/TypeScript port of [shoutrrr](https://github.com/containrrr/shoutrrr),
the URL-driven notification library. Runs on [Bun](https://bun.sh) — no Go at
runtime.

This is a Bun workspace; each notification service is built as its own package
under `packages/`, all sharing the canonical `@shoutrrr/core` package.

## Install

```bash
bun install
```

## Test

Run the whole workspace, or a single package:

```bash
bun test                       # all packages
cd packages/core && bun test   # one package
```

## Type-check / build

```bash
cd packages/core && bun run build   # tsc --noEmit
```

## Packages

| Package          | Description                                              |
| ---------------- | -------------------------------------------------------- |
| `@shoutrrr/core` | Shared core: types, enum/field formatting, prop-key resolver, JSON client, service router, top-level API. |

## Port status

- `@shoutrrr/core` — complete (faithful port of Go `pkg/types`, `pkg/format`,
  `pkg/util/jsonclient`, `pkg/services/standard`, `pkg/router`, `shoutrrr.go`).
- Service packages — added in parallel; they self-register with the core
  router via `registerService`. The core service registry starts empty.
