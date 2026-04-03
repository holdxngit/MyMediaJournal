BACKEND_DIR = backend
VENV = $(BACKEND_DIR)/venv
PYTHON = $(VENV)/bin/python
PIP = $(VENV)/bin/pip
ALEMBIC = $(VENV)/bin/alembic
FRONTEND_DIR = frontend

.PHONY: help setup up down migrate migration dev-backend dev-frontend install-backend seed seed-py

help:
	@echo "Usage: make <target>"
	@echo ""
	@echo "  setup           First-time setup: start DB, install deps, run migrations"
	@echo "  up              Start Docker services"
	@echo "  down            Stop Docker services"
	@echo "  install-backend Install Python dependencies into venv"
	@echo "  migrate         Apply all pending migrations"
	@echo "  migration       Create a new migration (usage: make migration name=my_migration)"
	@echo "  dev-backend     Run the FastAPI dev server"
	@echo "  dev-frontend    Run the Next.js dev server"
	@echo "  seed            Populate the database with sample data (requires Go)"
	@echo "  seed-py         Populate the database with sample data (Python fallback, no Go needed)"

setup: up install-backend migrate

up:
	docker compose up -d

down:
	docker compose down

install-backend:
	python3 -m venv $(VENV) && $(PIP) install -r $(BACKEND_DIR)/requirements.txt

migrate:
	cd $(BACKEND_DIR) && venv/bin/alembic upgrade head

migration:
	@if [ -z "$(name)" ]; then echo "Usage: make migration name=<migration_name>"; exit 1; fi
	cd $(BACKEND_DIR) && venv/bin/alembic revision --autogenerate -m "$(name)"

dev-backend:
	cd $(BACKEND_DIR) && venv/bin/uvicorn app.main:app --reload

dev-frontend:
	cd $(FRONTEND_DIR) && npm run dev

seed:
	cd scripts/seed && go mod tidy && go run .

seed-py:
	$(PYTHON) scripts/seed/seed.py
