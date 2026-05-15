.PHONY: up down restart build logs shell-backend shell-db migrate seed reset-db

up:
	docker compose up -d

down:
	docker compose down

restart:
	docker compose restart

build:
	docker compose build --no-cache

logs:
	docker compose logs -f

logs-backend:
	docker compose logs -f backend

logs-worker:
	docker compose logs -f worker

shell-backend:
	docker compose exec backend sh

shell-db:
	docker compose exec postgres psql -U personalife personalife

migrate:
	docker compose exec backend npx prisma migrate dev

migrate-prod:
	docker compose exec backend npx prisma migrate deploy

generate:
	docker compose exec backend npx prisma generate

studio:
	docker compose exec backend npx prisma studio --hostname 0.0.0.0

seed:
	docker compose exec backend npm run seed

reset-db:
	docker compose exec backend npx prisma migrate reset --force

setup: ## First-time setup: copy env, build, start, migrate
	cp -n .env.example .env || true
	docker compose build
	docker compose up -d
	sleep 5
	docker compose exec backend npx prisma migrate dev --name init
	docker compose exec backend npx prisma generate
	@echo "\n✓ Setup complete. Frontend: http://localhost:5173 | API: http://localhost:4000"
