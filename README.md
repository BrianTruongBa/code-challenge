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
| `docker-compose.problems-456.yml` | MySQL + Postgres + Redis only           |


