# Logger + tracer (observability module)

This folder groups **logging** (readable **console** locally, **JSON** lines in production for Datadog) and **Datadog APM** (`dd-trace`, **pinned to `4.55.0`** in `package.json` to align with common internal stacks such as tradeit-backend). Later you can extract this into a shared npm package (see below).

---

## How Problem 6 uses


| Entry                           | When to import                                                                                        |
| ------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `@/logger/tracer`               | **First** in `main.ts` — loads `dotenv`, configures `dd-trace` before Express/`pg`/Redis are patched. |
| `@/logger` or `@/logger/logger` | Anywhere you need `log.info` / `warn` / `error`.                                                      |


### Log output shape


| Environment                                    | Default output                                                   | Why                                                                |
| ---------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------ |
| **Local / test** (`NODE_ENV` not `production`) | Readable `**console.log` / `warn` / `error`**                    | Easier to read while developing.                                   |
| **Production** (`NODE_ENV=production`)         | **JSON** one line per event (`ts`, `level`, `msg`, `service`, …) | Datadog Agent (or Docker log driver) tails stdout and parses JSON. |


Override anytime: `**LOG_FORMAT=json`** (force JSON) or `**LOG_FORMAT=console**` (force readable console).

`DD_TRACE_ENABLED` defaults to `**false**` inside `tracer.ts` when unset, so local dev and CI do not need a Datadog Agent.

---

## Moving to a single shared package (`npm i`)

Typical evolution (monorepo or multi-repo):

1. **Create a package** (e.g. `@your-org/node-observability`) with its own `package.json`, `main` / `exports`, and TypeScript build.
2. **Move** `logger.ts`, `tracer.ts`, and this README into that package (adjust default `service` name via constructor option or `DD_SERVICE`).
3. **Publish** to npm (private registry is fine) or install via **workspace:** `"@your-org/node-observability": "workspace:*"`.
4. **Consumers** depend on it and keep one rule: **import tracer before the framework**.

Example consumer `main.ts`:

```typescript
import '@your-org/node-observability/tracer' // or: require('./node_modules/.../dist/tracer')
import express from 'express'
import { log } from '@your-org/node-observability'
```

Use `**package.json` `exports**` so subpaths resolve cleanly:

```json
{
  "name": "@your-org/node-observability",
  "exports": {
    ".": "./dist/index.js",
    "./tracer": "./dist/tracer.js"
  }
}
```

1. **Remove** the inlined `src/logger/` from this repo and replace imports with the package name.

---

## What belongs in the shared package vs the app


| In shared kit                                       | Stays in the app                        |
| --------------------------------------------------- | --------------------------------------- |
| JSON logger, log levels, optional redaction helpers | Domain log messages and field keys      |
| `dd-trace` init, env mapping, log injection toggle  | Business routes, controllers, DB schema |
| Optional DogStatsD wrapper later                    | Metric names tied to domain events      |


---

## Versioning

Treat the extracted package with **semver**: breaking changes to `log` API or required env vars → major bump; new optional env → minor.

---

## Related docs

- Datadog Agent, logs, APM: `[../../monitoring/datadog.md](../../monitoring/datadog.md)`
- Service-wide architecture: `[../../ARCHITECTURE.md](../../ARCHITECTURE.md)`

