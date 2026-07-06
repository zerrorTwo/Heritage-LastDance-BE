.PHONY: dev build start stop logs db-backup db-backups db-restore db-postgis lint test test-e2e

# ─── Development ──────────────────────────────────────────────────────────────
dev:
	npm run start:dev

# ─── Docker ───────────────────────────────────────────────────────────────────
build:
	docker compose build

start:
	docker compose up -d

stop:
	docker compose down

logs:
	docker compose logs -f app

db-backup:
	docker compose exec -T postgres sh -c 'pg_dump -U "$${POSTGRES_USER:-postgres}" -d "$${POSTGRES_DB:-heritage}" -Fc > /backups/heritage_$$(date +%Y%m%d_%H%M%S).dump'

db-backups:
	docker compose exec -T postgres sh -c 'ls -lh /backups'

db-restore:
	test -n "$(file)" || (printf 'Usage: make db-restore file=<backup-file-in-docker-volume>.dump\n' && exit 1)
	docker compose exec -T postgres sh -c 'pg_restore -U "$${POSTGRES_USER:-postgres}" -d "$${POSTGRES_DB:-heritage}" --clean --if-exists /backups/$(file)'

db-postgis:
	docker compose exec -T postgres sh -c 'psql -U "$${POSTGRES_USER:-postgres}" -d "$${POSTGRES_DB:-heritage}" -c "CREATE EXTENSION IF NOT EXISTS postgis; SELECT postgis_version();"'

# ─── Code Quality ─────────────────────────────────────────────────────────────
lint:
	npm run lint

# ─── Testing ──────────────────────────────────────────────────────────────────
test:
	npm run test

test-e2e:
	npm run test:e2e
