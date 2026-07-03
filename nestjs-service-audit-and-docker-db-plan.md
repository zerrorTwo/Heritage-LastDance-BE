# NestJS Service Audit & Enhancement Plan

> **Purpose:** This document is a structured instruction set for an LLM (or a developer) to systematically audit and enhance NestJS services, and to set up Dockerized Postgres (with PostGIS) + Neo4j with persistent storage.
>
> **How to use this doc (for LLM):** Treat each `### Task` as an independent unit of work. Read `Goal`, `Steps`, and `Definition of Done` before acting. Do not skip steps. Report findings in `audit-report.md` using the format specified in Task 1.4.

---

## Part A — Service Audit & Enhancement

### Task A.1 — Inventory

**Goal:** Build a complete map of all services before touching any code.

**Steps:**
1. Find all files matching `src/**/*.service.ts`.
2. For each file, extract: class name, module it belongs to, public methods, injected dependencies.
3. Classify each service as `critical` (auth, payment, order, user data) or `standard`.
4. Output the inventory as a markdown table: `| Service | Module | Dependencies | Priority |`.

**Definition of Done:** A full table exists covering every service file in `src/`.

---

### Task A.2 — Architecture Review

**Goal:** Detect structural problems that make services hard to maintain or scale.

**Check each service against these rules. For every violation, record: file path, line number, rule violated, suggested fix.**

| Rule ID | Rule | How to detect |
|---|---|---|
| ARCH-1 | Service must not contain request/response formatting logic (belongs in Controller) | Look for `@Req()`, `@Res()`, direct HTTP status manipulation inside service |
| ARCH-2 | No manual `new SomeService()` — must use constructor DI | Search for `new .*Service(` |
| ARCH-3 | No circular module imports | Run `madge --circular src` |
| ARCH-4 | DB queries isolated in repository/provider, not inline in business logic | Look for raw `.query(`, `.find(` mixed with business rules in the same method |
| ARCH-5 | No `any` type in method signatures | `grep ": any"` in service files |
| ARCH-6 | Methods should not exceed ~50 lines | Static analysis or manual scan |

**Definition of Done:** All violations logged in `audit-report.md` under section `## Architecture`.

---

### Task A.3 — Code Quality Review

**Goal:** Ensure error handling, validation, and async code follow NestJS conventions.

**Checklist (apply per service):**
- [ ] Errors thrown are NestJS exceptions (`NotFoundException`, `BadRequestException`, etc.), never bare `throw new Error(...)`.
- [ ] A global `ExceptionFilter` exists and catches unhandled errors.
- [ ] All incoming DTOs use `class-validator` decorators; global `ValidationPipe` has `whitelist: true` and `forbidNonWhitelisted: true`.
- [ ] No un-awaited promises (verify with `eslint-plugin-promise`).
- [ ] Independent async calls use `Promise.all`, not sequential `await` in a loop.
- [ ] `tsconfig.json` has `"strictNullChecks": true`.
- [ ] No duplicated logic across services (`jscpd` scan).

**Definition of Done:** Checklist result recorded per service in `audit-report.md` under `## Code Quality`.

---

### Task A.4 — Database & Transactions

**Goal:** Catch performance and data-integrity risks at the persistence layer.

**Checklist:**
- [ ] No N+1 query patterns (check relation loading in TypeORM/Prisma calls).
- [ ] Indexes exist on frequently filtered/sorted columns.
- [ ] Multi-table writes wrapped in a transaction (`QueryRunner` / `$transaction`).
- [ ] Audit fields (`createdAt`, `updatedAt`, `deletedAt`) present and consistent.
- [ ] List endpoints implement pagination (no unbounded `findAll`).
- [ ] Connection pool size and timeout are explicitly configured, not left as defaults.

**Definition of Done:** Findings logged under `## Database`.

---

### Task A.5 — Security

**Goal:** Identify exploitable weaknesses.

**Checklist:**
- [ ] No sensitive data (passwords, tokens, PII) in logs.
- [ ] All user input is validated/sanitized before reaching a query.
- [ ] Rate limiting applied to sensitive or external-facing endpoints (`@nestjs/throttler`).
- [ ] Secrets loaded via `ConfigService`/`.env`, never hardcoded.
- [ ] Authorization (RBAC/ABAC) enforced at the service layer, not just at the Guard.
- [ ] `npm audit` / Snyk shows no high/critical vulnerabilities.

**Definition of Done:** Findings logged under `## Security`.

---

### Task A.6 — Performance

**Goal:** Reduce latency and resource waste.

**Checklist:**
- [ ] Cacheable, low-change data uses `@nestjs/cache-manager` + Redis.
- [ ] Heavy/blocking computation moved to a queue (`BullMQ`) instead of running inline.
- [ ] Non-real-time tasks (email, notifications) are event-driven or queued.
- [ ] No obvious memory leaks (unremoved listeners/subscriptions).
- [ ] Response time of critical services is measured (APM or custom interceptor).

**Definition of Done:** Findings logged under `## Performance`.

---

### Task A.7 — Logging & Monitoring

**Goal:** Make production issues traceable.

**Checklist:**
- [ ] Structured logger in use (`nestjs-pino` or `winston`), not `console.log`.
- [ ] Logs include context: service name, request id, user id.
- [ ] Logs are JSON-structured for ELK/Loki ingestion.
- [ ] Health check endpoints exist for DB, cache, and external dependencies (`@nestjs/terminus`).
- [ ] Basic metrics (request count, error rate, latency) exported (Prometheus).

**Definition of Done:** Findings logged under `## Logging & Monitoring`.

---

### Task A.8 — Testing

**Goal:** Guarantee regressions are caught automatically.

**Checklist:**
- [ ] Unit test coverage ≥ 70–80% for `critical` services.
- [ ] Dependencies properly mocked (`Test.createTestingModule`).
- [ ] Integration tests exist for flows touching a real/in-memory DB.
- [ ] Edge cases and failure paths tested, not just happy path.
- [ ] CI runs the full test suite on every PR.

**Definition of Done:** Coverage report attached; gaps listed under `## Testing`.

---

### Task A.9 — Prioritization & Execution Order

**Goal:** Turn findings into an actionable, low-risk rollout.

**Steps:**
1. Merge all findings from Tasks A.2–A.8 into one list.
2. Assign each item a priority:
   - 🔴 High: error handling, validation, security
   - 🟠 Medium: performance, logging/monitoring
   - 🟡 Low: test coverage depth, documentation
3. Group fixes into small batches — **one service per PR**, never a mass rewrite.
4. For each PR: fix → test → review → merge → observe metrics before moving to the next.

**Definition of Done:** A prioritized backlog exists, ready to execute incrementally.

---

## Part B — Dockerized Database Setup (Postgres + PostGIS, Neo4j) with Persistent Data

### Task B.1 — Goal

Run Postgres (with PostGIS extension) and Neo4j in Docker so that:
- Data survives `docker compose down` / container restarts / host reboots.
- Both databases are easy to reach from the NestJS app (`localhost` or Docker network name).

**Key principle:** persistence in Docker = **named volumes** mounted to each database's data directory. Never rely on the container's writable layer — it is destroyed with `docker rm`.

### Task B.2 — `docker-compose.yml`

Create this file at the project root:

```yaml
version: "3.9"

services:
  postgres:
    image: postgis/postgis:16-3.4        # Postgres 16 + PostGIS 3.4 preinstalled
    container_name: app_postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: app_user
      POSTGRES_PASSWORD: app_password
      POSTGRES_DB: app_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data   # <-- persists DB files across restarts
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app_user -d app_db"]
      interval: 10s
      timeout: 5s
      retries: 5

  neo4j:
    image: neo4j:5-community
    container_name: app_neo4j
    restart: unless-stopped
    environment:
      NEO4J_AUTH: neo4j/neo4j_password        # format: user/password
      NEO4J_PLUGINS: '["apoc"]'               # optional but commonly needed
    ports:
      - "7474:7474"   # HTTP browser UI
      - "7687:7687"   # Bolt protocol (used by NestJS driver)
    volumes:
      - neo4j_data:/data           # <-- persists graph data
      - neo4j_logs:/logs
      - neo4j_import:/var/lib/neo4j/import
      - neo4j_plugins:/plugins
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:7474 || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  neo4j_data:
  neo4j_logs:
  neo4j_import:
  neo4j_plugins:
```

**Why this persists data:**
- `postgres_data`, `neo4j_data`, etc. are **named volumes** managed by Docker (stored under `/var/lib/docker/volumes/...` on the host).
- They are **not** deleted by `docker compose down`, `docker compose stop`, or a container restart.
- They are only deleted if you explicitly run `docker compose down -v` (the `-v` flag removes volumes) or `docker volume rm <name>`.

### Task B.3 — Commands

```bash
# Start both databases in the background
docker compose up -d

# Check status / health
docker compose ps

# Stop containers WITHOUT losing data
docker compose stop

# Restart — data is intact
docker compose start
# or
docker compose restart

# Stop AND remove containers, volumes stay intact
docker compose down

# ⚠️ Only use this if you WANT to wipe all data:
docker compose down -v
```

### Task B.4 — Verify PostGIS is active

```bash
docker exec -it app_postgres psql -U app_user -d app_db -c "CREATE EXTENSION IF NOT EXISTS postgis; SELECT postgis_version();"
```

### Task B.5 — Connection settings for NestJS

**Postgres (`.env`):**
```
DB_HOST=localhost
DB_PORT=5432
DB_USER=app_user
DB_PASSWORD=app_password
DB_NAME=app_db
```

**Neo4j (`.env`):**
```
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=neo4j_password
```

> If the NestJS app itself runs inside the same Docker Compose network (not on the host), use the service names `postgres` and `neo4j` instead of `localhost` as the host.

### Task B.6 — Backup recommendation (beyond restart persistence)

Named volumes protect against restarts, but not against accidental `down -v` or disk failure. Add periodic backups:

```bash
# Postgres dump
docker exec app_postgres pg_dump -U app_user app_db > backup_$(date +%F).sql

# Neo4j dump (requires stopping the DB or using neo4j-admin in a maintenance window)
docker exec app_neo4j neo4j-admin database dump neo4j --to-path=/backups
```

**Definition of Done for Part B:** `docker compose up -d` starts both DBs; data written before a `docker compose restart` is still present after; PostGIS extension query returns a version string; NestJS successfully connects to both.
