# Homework — problems 4, 5, and 6

This folder groups three small assignments under `src/`. Problem 4 is a standalone TypeScript exercise. Problems 5 and 6 are Node APIs that expect databases; you can run **MySQL**, **PostgreSQL**, and **Redis** together with the compose file at the repository root.

---

## Problem 4 — sum to *n*

**Path:** `src/problem4/index.ts`

Three implementations of summing `1 + 2 + … + n` (closed form, loop, array + reduce) plus a small console smoke test. **No Docker or database.**

Run from this directory (requires [Node.js](https://nodejs.org/) 20+):

```bash
npx --yes tsx src/problem4/index.ts
```

---

## Problem 5 — CRUD API (MySQL)

**Path:** `src/problem5/`

Express + MySQL with transactions and optimistic locking. Default API port in code: **8001**. MySQL is expected on **3306** inside Docker networks; when the API runs on your machine against the shared compose stack below, use host port **3307**.

See `src/problem5/docker-compose.yml` for an alternative that builds and runs the API in Docker with MySQL only.

### Environment (API on host, DB in Docker)

After starting [Databases (Docker)](#databases-docker), create a `.env` in `src/problem5/`:

```env
PORT=8001
DB_HOST=127.0.0.1
DB_PORT=3307
DB_USER=root
DB_PASSWORD=password
DB_NAME=problem5
```

Then:

```bash
cd src/problem5
npm install
npm run dev
```

---

## Problem 6 — scoreboard (PostgreSQL + Redis)

**Path:** `src/problem6/`

Express + PostgreSQL + Redis + Socket.IO. Default API port: **8002**. Postgres in the shared stack is exposed on **5433**; Redis on **6379**.

See `src/problem6/README.md` for API behaviour, auth, and WebSocket details. `src/problem6/docker-compose.yml` is an alternative full stack (API + Postgres + Redis). **CI:** `src/problem6/workflows/problem6-ci.yml` (copy to `.github/workflows/` for GitHub Actions — see `src/problem6/workflows/README.md`).

### Environment (API on host, DB in Docker)

After starting [Databases (Docker)](#databases-docker), create a `.env` in `src/problem6/`:

```env
PORT=8002
DB_HOST=127.0.0.1
DB_PORT=5433
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=scoreboard
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
JWT_SECRET=change-me-in-development
SOCKET_CORS_ORIGIN=*
RATE_LIMIT_ENABLED=true
SOCKET_IO_REDIS_ADAPTER=true
```

Then:

```bash
cd src/problem6
npm install
npm run dev
```

---

## Databases (Docker)

One file starts **MySQL** (problem 5), **PostgreSQL** (problem 6), and **Redis** (problem 6):

```bash
docker compose -f docker-compose.yml up -d
```

Stop and remove containers (data volumes are kept unless you add `-v`):

```bash
docker compose -f docker-compose.yml down
```


| Service       | Host port | Credentials / DB                         | Init script                          |
| ------------- | --------- | ---------------------------------------- | ------------------------------------ |
| MySQL 8       | 3307      | `root` / `password`, DB `problem5`       | `src/problem5/src/sql/resources.sql` |
| PostgreSQL 16 | 5433      | `postgres` / `password`, DB `scoreboard` | `src/problem6/src/sql/resources.sql` |
| Redis 7       | 6379      | no password (dev)                        | —                                    |


**Ports:** 3307 and 5433 avoid clashes with a local MySQL on 3306 or Postgres on 5432.

**Do not run** this compose **and** `src/problem5/docker-compose.yml` / `src/problem6/docker-compose.yml` at the same time if they would bind the same host ports (for example two stacks both using 6379 or 3307). Use either the shared infra file above or each problem’s own compose.

---

## Layout


| Directory                         | Role                                    |
| --------------------------------- | --------------------------------------- |
| `src/problem4/`                   | Algorithms + console checks             |
| `src/problem5/`                   | MySQL-backed REST API                   |
| `src/problem6/`                   | Postgres + Redis + Socket.IO scoreboard |
| `docker-compose.yml` (repo root) | MySQL + Postgres + Redis for local APIs |

---

## Sample `npm test` output (Vitest)

Below is **example** console output from successful runs (API and databases must be up; run `npm test` from `src/problem5/` or `src/problem6/`). Paths match this repo on disk.

### Problem 5 (`src/problem5`)

```text
> problem5-crud-api@1.0.0 test
> NODE_ENV=test vitest run


 RUN  v3.2.4 /Users/chinhtruongba/Documents/local_3/homework/src/problem5

stdout | tests/api.http.test.ts > concurrency & races > parallel POST creates distinct resources
[RACE] parallel POST { '201': 15 } n=15

stdout | tests/api.http.test.ts > concurrency & races > parallel PATCH same version: one 200, rest 409
[RACE] parallel PATCH same version { '200': 1, '409': 11 } n=12

stdout | tests/api.http.test.ts > concurrency & races > parallel DELETE same version: one 204, rest 409 or 404
[RACE] parallel DELETE same version { '204': 1, '409': 9 } n=10

stdout | tests/api.http.test.ts > concurrency & races > interleaved GET while PATCH
[RACE] GET+PATCH mix { '200': 9 } n=9

 ✓ tests/api.http.test.ts (100 tests) 385ms
   ✓ health (2)
     ✓ GET /health returns 200 3ms
     ✓ GET /health JSON shape 2ms
   ✓ invalid :id param (uuid) (15)
     ✓ invalid id 0 6ms
     ✓ invalid id 1 11ms
     ✓ invalid id 2 4ms
     ✓ invalid id 3 1ms
     ✓ invalid id 4 2ms
     ✓ invalid id 5 2ms
     ✓ invalid id 6 1ms
     ✓ invalid id 7 2ms
     ✓ invalid id 8 2ms
     ✓ invalid id 9 1ms
     ✓ invalid id 10 2ms
     ✓ invalid id 11 2ms
     ✓ invalid id 12 1ms
     ✓ invalid id 13 2ms
     ✓ invalid id 14 1ms
   ✓ GET /api/resources list — invalid query (15)
     ✓ page=0 2ms
     ✓ page=-1 1ms
     ✓ limit=0 1ms
     ✓ limit=101 1ms
     ✓ status=unknown 1ms
     ✓ page=abc 1ms
     ✓ limit=xyz 1ms
     ✓ name too long 1ms
     ✓ page float invalid 1ms
     ✓ limit float 1ms
     ✓ combined bad status 1ms
     ✓ empty status wrong 1ms
     ✓ extra bad status 1ms
     ✓ limit negative 1ms
     ✓ page negative large 1ms
   ✓ POST /api/resources — invalid body (15)
     ✓ missing name 1ms
     ✓ empty name 1ms
     ✓ whitespace name 1ms
     ✓ name too long 1ms
     ✓ description too long 1ms
     ✓ bad status 1ms
     ✓ null name 1ms
     ✓ number name 1ms
     ✓ array name 1ms
     ✓ object name 1ms
     ✓ extra version field only 1ms
     ✓ name boolean 1ms
     ✓ nested body 1ms
     ✓ description number 1ms
     ✓ status number 1ms
   ✓ PATCH /api/resources/:id — invalid body (10)
     ✓ missing version 1ms
     ✓ version string 1ms
     ✓ version float 1ms
     ✓ version negative 1ms
     ✓ bad status 1ms
     ✓ name empty 1ms
     ✓ description too long 1ms
     ✓ empty body 1ms
     ✓ null version 1ms
     ✓ version array 1ms
   ✓ DELETE /api/resources/:id — invalid body (6)
     ✓ missing version 1ms
     ✓ version string 1ms
     ✓ version negative 1ms
     ✓ null version 1ms
     ✓ version float 1ms
     ✓ extra junk 1ms
   ✓ CRUD + domain errors (isolated names) (11)
     ✓ POST 201 creates resource 59ms
     ✓ GET by id returns 200 6ms
     ✓ GET unknown id 404 2ms
     ✓ list filter finds created row 11ms
     ✓ list filter by status=active 7ms
     ✓ list filter name partial 6ms
     ✓ PATCH 200 bumps version 9ms
     ✓ PATCH 409 stale version 13ms
     ✓ DELETE 204 11ms
     ✓ DELETE 404 missing 2ms
     ✓ pagination page 2 37ms
   ✓ concurrency & races (6)
     ✓ parallel POST creates distinct resources 26ms
     ✓ parallel PATCH same version: one 200, rest 409 17ms
     ✓ parallel DELETE same version: one 204, rest 409 or 404 15ms
     ✓ interleaved GET while PATCH 11ms
     ✓ two sequential PATCH with correct versions both succeed 12ms
     ✓ many creates then list meta.pages consistent 19ms
   ✓ health matrix (padding to 100 total) (20)
     ✓ health stable #0 0ms
     ✓ health stable #1 0ms
     ✓ health stable #2 0ms
     ✓ health stable #3 0ms
     ✓ health stable #4 0ms
     ✓ health stable #5 0ms
     ✓ health stable #6 0ms
     ✓ health stable #7 0ms
     ✓ health stable #8 0ms
     ✓ health stable #9 0ms
     ✓ health stable #10 0ms
     ✓ health stable #11 0ms
     ✓ health stable #12 0ms
     ✓ health stable #13 0ms
     ✓ health stable #14 0ms
     ✓ health stable #15 0ms
     ✓ health stable #16 0ms
     ✓ health stable #17 0ms
     ✓ health stable #18 0ms
     ✓ health stable #19 0ms

 Test Files  1 passed (1)
      Tests  100 passed (100)
   Start at  12:43:33
   Duration  580ms (transform 48ms, setup 27ms, collect 30ms, tests 385ms, environment 0ms, prepare 41ms)
```

### Problem 6 (`src/problem6`)

```text
> problem6-scoreboard-service@1.0.0 test
> NODE_ENV=test vitest run


 RUN  v3.2.4 /Users/chinhtruongba/Documents/local_3/homework/src/problem6

 ✓ tests/ws.test.ts (8 tests) 650ms
   ✓ Socket.IO /scoreboard (8)
     ✓ connects to the scoreboard namespace 10ms
     ✓ connects with websocket-only transport 3ms
     ✓ disconnect leaves socket inactive 2ms
     ✓ emits top_scores after POST /api/scoreboard/update 52ms
     ✓ top_scores payload rows are shaped as leaderboard entries; POST returns the caller row 16ms
     ✓ broadcast reaches two subscribers with equivalent payloads 17ms
     ✓ two sequential score updates emit two top_scores events  523ms
     ✓ default / namespace is not the scoreboard namespace 4ms
 ✓ tests/api.http.test.ts (99 tests) 292ms
   ✓ health (2)
     ✓ GET /health returns 200 3ms
     ✓ GET /health JSON is object 2ms
   ✓ GET /api/scoreboard (7)
     ✓ returns 200 without auth (public leaderboard) 4ms
     ✓ response data entries include expected fields when non-empty 3ms
     ✓ returns at most 10 rows (top limit contract) 2ms
     ✓ scores are in non-increasing order (leaderboard) 3ms
     ✓ ignores unknown query params without error 3ms
     ✓ two consecutive GETs both succeed 5ms
     ✓ GET after a score update still returns 200 12ms
   ✓ routing — not implemented (3)
     ✓ GET unknown path under /api is not 200 JSON success 2ms
     ✓ GET /api/scoreboard/update is not registered as GET 1ms
     ✓ PATCH /api/scoreboard/update is not allowed 2ms
   ✓ POST /api/scoreboard/update — invalid body (11)
     ✓ empty object 4ms
     ✓ missing actionToken 3ms
     ✓ null actionToken 3ms
     ✓ number actionToken 3ms
     ✓ boolean actionToken 3ms
     ✓ array actionToken 2ms
     ✓ object actionToken 3ms
     ✓ empty string actionToken 3ms
     ✓ too short (min-1) 3ms
     ✓ strict rejects unknown keys 3ms
     ✓ rejects invalid JSON body when Content-Type is application/json 2ms
   ✓ POST /api/scoreboard/update — auth (6)
     ✓ 401 without Authorization 1ms
     ✓ 401 with malformed bearer prefix 1ms
     ✓ 401 Bearer with empty token 2ms
     ✓ 401 invalid JWT signature 3ms
     ✓ 401 expired JWT 3ms
     ✓ 404 when JWT has no sub (user not identified downstream) 3ms
   ✓ POST /api/scoreboard/update — happy path (3)
     ✓ 200 with valid JWT and minimum-length actionToken 11ms
     ✓ sequential updates for same user increase score 17ms
     ✓ two different users both get 200 13ms
   ✓ POST /api/scoreboard/update — Idempotency-Key (10)
     ✓ 400 invalid characters (space) 4ms
     ✓ 400 invalid characters: slash 4ms
     ✓ 400 invalid characters: hash 3ms
     ✓ 400 invalid characters: at 4ms
     ✓ 400 invalid characters: comma 3ms
     ✓ 400 when key exceeds max length 4ms
     ✓ 200 with key exactly at max length 7ms
     ✓ 200 with allowed charset: letters digits underscore hyphen dot 8ms
     ✓ replay: same Idempotency-Key returns same score (no double increment) 11ms
     ✓ different keys for same user allow separate increments 17ms
   ✓ concurrency (1)
     ✓ parallel POST score updates for distinct users all return 200 35ms
   ✓ health stability matrix (padding toward 100 total) (56)
     ✓ GET /health stable #0 1ms
     ✓ GET /health stable #1 1ms
     ✓ GET /health stable #2 1ms
     ✓ GET /health stable #3 1ms
     ✓ GET /health stable #4 1ms
     ✓ GET /health stable #5 1ms
     ✓ GET /health stable #6 1ms
     ✓ GET /health stable #7 2ms
     ✓ GET /health stable #8 1ms
     ✓ GET /health stable #9 1ms
     ✓ GET /health stable #10 1ms
     ✓ GET /health stable #11 1ms
     ✓ GET /health stable #12 1ms
     ✓ GET /health stable #13 1ms
     ✓ GET /health stable #14 1ms
     ✓ GET /health stable #15 1ms
     ✓ GET /health stable #16 1ms
     ✓ GET /health stable #17 1ms
     ✓ GET /health stable #18 1ms
     ✓ GET /health stable #19 1ms
     ✓ GET /health stable #20 1ms
     ✓ GET /health stable #21 1ms
     ✓ GET /health stable #22 1ms
     ✓ GET /health stable #23 1ms
     ✓ GET /health stable #24 1ms
     ✓ GET /health stable #25 1ms
     ✓ GET /health stable #26 1ms
     ✓ GET /health stable #27 1ms
     ✓ GET /health stable #28 1ms
     ✓ GET /health stable #29 1ms
     ✓ GET /health stable #30 1ms
     ✓ GET /health stable #31 1ms
     ✓ GET /health stable #32 1ms
     ✓ GET /health stable #33 1ms
     ✓ GET /health stable #34 1ms
     ✓ GET /health stable #35 1ms
     ✓ GET /health stable #36 1ms
     ✓ GET /health stable #37 1ms
     ✓ GET /health stable #38 1ms
     ✓ GET /health stable #39 1ms
     ✓ GET /health stable #40 1ms
     ✓ GET /health stable #41 1ms
     ✓ GET /health stable #42 1ms
     ✓ GET /health stable #43 1ms
     ✓ GET /health stable #44 1ms
     ✓ GET /health stable #45 1ms
     ✓ GET /health stable #46 1ms
     ✓ GET /health stable #47 1ms
     ✓ GET /health stable #48 1ms
     ✓ GET /health stable #49 1ms
     ✓ GET /health stable #50 1ms
     ✓ GET /health stable #51 1ms
     ✓ GET /health stable #52 1ms
     ✓ GET /health stable #53 1ms
     ✓ GET /health stable #54 1ms
     ✓ GET /health stable #55 1ms

 Test Files  2 passed (2)
      Tests  107 passed (107)
   Start at  12:35:21
   Duration  1.37s (transform 51ms, setup 36ms, collect 126ms, tests 942ms, environment 0ms, prepare 76ms)
```


