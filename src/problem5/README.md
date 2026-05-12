# Problem 5 — Production CRUD API

ExpressJS + TypeScript with MySQL, transactions, and optimistic locking.

## Stack


| Layer      | Technology   |
| ---------- | ------------ |
| HTTP       | Express 4    |
| Language   | TypeScript 5 |
| Database   | MySQL 8      |
| Validation | Zod          |


Imports use the `**@/*` → `src/***` and `**@test/*` → `tests/***` aliases (see `tsconfig.json`). Dev loads paths via `tsconfig-paths`; Vitest resolves the same aliases via `vitest.config.ts`. Production `npm run build` uses `**tsconfig.build.json**` (src only) and `**tsc-alias**` so `dist/` uses plain relative `require()` and runs with plain `node`.

## Setup

### 1. Copy env file

```bash
cp .env.example .env
# fill in DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, PORT (optional)
```

### 2. Create MySQL database

```sql
CREATE DATABASE problem5 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Then open `**sql/resources.sql**` in MySQL Workbench (or your SQL client), select the `problem5` database, and run it once to create the `resources` table. The Node app does **not** run this file automatically.

### 3. Install dependencies

```bash
npm install
```

### 4. Run

```bash
# Development (hot reload)
npm run dev

# Production
npm run build && npm start
```

Server listens on the port in `PORT` (see `.env.example`, default **8001**).

### Lint and format

- `**npm run lint`** — ESLint (`typescript-eslint` + `eslint-config-prettier` so rules do not fight Prettier).
- `**npm run lint:fix**` — ESLint with safe auto-fixes.
- `**npm run format**` — Prettier (write).
- `**npm run format:check**` — Prettier (check only, for CI).
- `**npm run check**` — `lint` then `format:check`.

### HTTP tests (black-box, `tests/` only)

Tests call a **running** API over `fetch` — they do **not** import `src/`. With MySQL up and `npm run dev` running:

```bash
npm test
# optional: PROBLEM5_BASE_URL=http://127.0.0.1:8001 npm test
# extra logs: npm run test:verbose
```

---

## Docker (self-contained)

Everything lives under `src/problem5/`: **MySQL 8** plus an optional **API** container. You do not need the repo-root `docker-compose.yml`.

### Full stack (MySQL + API in containers)

From this directory:

```bash
docker compose up --build -d
```

- API: `http://localhost:8001` (same routes as local dev).
- MySQL on the **host** (for tools or `npm run dev` on the host): `localhost:3307` (user `root`, password `password`, database `problem5`).

After MySQL is up, run `**sql/resources.sql`** once against `problem5` (Workbench on `localhost:3307`, or `docker compose exec mysql mysql -uroot -ppassword problem5 -e "$(cat sql/resources.sql)"` from this folder). The API container does not apply DDL automatically.

Stop and remove containers (keeps the named volume with data):

```bash
docker compose down
```

Remove containers **and** the MySQL volume:

```bash
docker compose down -v
```

### MySQL only (run Node on your machine)

```bash
docker compose up -d mysql
```

Use `.env` with `DB_HOST=localhost` and **`DB_PORT=3307`** so the app reaches the published MySQL port.

---

## Folder structure

```
src/
├── config/
│   ├── env.ts              # Typed env vars, fail-fast on missing
│   └── database.ts         # Pool, getDb(), AsyncLocalStorage + withTransaction()
├── sql/
│   └── resources.sql       # DDL — run manually in Workbench (not executed by the app)
├── dto/                    # Zod schemas + DTO types
├── errors/
├── middlewares/
├── models/
├── repository/             # Raw SQL via getDb() (pool or tx from AsyncLocalStorage)
├── routes/
├── service/                # Business logic + transactions
├── controllers/
├── utils/
│   ├── enum.ts             # ERROR — HTTP status enum for API errors
│   ├── asyncHandler.ts
│   └── helpers.ts
└── main.ts
```

---

## API Reference

### Resource schema


| Field         | Type                  | Notes                                                    |
| ------------- | --------------------- | -------------------------------------------------------- |
| `id`          | UUID string           | auto-generated                                           |
| `name`        | string                | required                                                 |
| `description` | string | null         | optional                                                 |
| `status`      | `active` | `inactive` | default `active`                                         |
| `version`     | integer               | increments on every update — used for optimistic locking |
| `created_at`  | datetime              | auto                                                     |
| `updated_at`  | datetime              | auto                                                     |


---

### `GET /api/resources` — List

Query params:


| Param    | Type                | Default | Description              |
| -------- | ------------------- | ------- | ------------------------ |
| `status` | `active`|`inactive` | —       | Filter by status         |
| `name`   | string              | —       | Partial match            |
| `page`   | number              | 1       | Page number              |
| `limit`  | number              | 10      | Items per page (max 100) |


```json
// 200 OK
{
  "data": [...],
  "meta": { "total": 42, "page": 1, "limit": 10, "pages": 5 }
}
```

---

### `GET /api/resources/:id` — Get by ID

```
200 OK  — resource object
404     — { "code": "RESOURCE_NOT_FOUND", "message": "..." }
```

---

### `POST /api/resources` — Create

```json
// Request body
{ "name": "My Resource", "description": "optional", "status": "active" }

// 201 Created
{ "id": "...", "name": "My Resource", "version": 0, ... }
```

Runs inside a MySQL transaction.

---

### `PATCH /api/resources/:id` — Update

`version` is **required** — must match the current version in DB (optimistic lock).

```json
// Request body
{ "name": "New name", "status": "inactive", "version": 0 }

// 200 OK — updated resource with version incremented to 1
// 404    — not found
// 409    — version mismatch (another writer updated first — re-fetch and retry)
```

---

### `DELETE /api/resources/:id` — Delete

`version` is **required** in the request body.

```json
// Request body
{ "version": 1 }

// 204 No Content
// 404 — not found
// 409 — version mismatch
```

---

## Key patterns

### Optimistic locking

Every `UPDATE` and `DELETE` includes `WHERE id = ? AND version = ?`.  
If `affectedRows === 0` the row was modified by another request between read and write → `409 Conflict`.  
The client must re-fetch the resource and retry with the new version.

### Transactions

`create`, `update`, and `delete` all run inside `withTransaction()`:

```
BEGIN
  → check existence
  → write (INSERT / UPDATE with version check / DELETE)
COMMIT  (or ROLLBACK on any throw)
```

Repositories call `**getDb()**` (`config/database.ts`): the **pool** by default, or the **checkout connection** for the current async scope while `withTransaction` runs — same idea as **tradeit-backend**’s `httpContext` + `takeConnection()`, implemented with Node’s `**AsyncLocalStorage`** (no Express coupling, safe under concurrent requests). **DDL** is maintained in `**sql/resources.sql`** for you to run manually.

### Error shape

All errors return:

```json
{ "code": "ERROR_CODE", "message": "Human readable message" }
```

