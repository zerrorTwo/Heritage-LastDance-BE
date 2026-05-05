.PHONY: dev build start stop logs lint test test-e2e

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

# ─── Code Quality ─────────────────────────────────────────────────────────────
lint:
	npm run lint

# ─── Testing ──────────────────────────────────────────────────────────────────
test:
	npm run test

test-e2e:
	npm run test:e2e
