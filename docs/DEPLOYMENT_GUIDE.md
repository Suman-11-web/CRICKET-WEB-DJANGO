# Village Cricket Live — Production & Cloud Deployment Guide

## 1. Docker & Nginx Deployment (AWS EC2 / DigitalOcean / Linux VPS)

The `infrastructure/` directory includes production Dockerfiles (`Dockerfile.backend`, `Dockerfile.frontend`), `docker-compose.yml`, and `nginx/nginx.conf` configured for HTTP and WebSocket (`ws://` / `wss://`) reverse proxying.

```bash
cd /Users/suman/CRICKET-WEB/infrastructure
docker compose up --build -d
```

Services launched:
- **`postgres`** (`postgres:16-alpine`): Primary transactional relational database.
- **`redis`** (`redis:7-alpine`): Backing store for Django Channels real-time WebSocket groups and Celery tasks.
- **`backend`** (Django + Daphne ASGI server on port `8000`): Runs migrations, seeds initial data if empty, and serves `/api/v1/` and `/ws/`.
- **`celery`**: Asynchronous task worker.
- **`frontend`** (Next.js production server on port `3000`).
- **`nginx`** (Port `80`): Routes `/api/` and `/ws/` (with WebSocket `Upgrade` headers) to `backend:8000` and `/` to `frontend:3000`.

---

## 2. Environment Variables Configuration

### Backend (`backend/config/settings.py`)
- `DEBUG`: Set to `False` in production.
- `DB_ENGINE`: Set to `postgres` in production (or `sqlite` for local development).
- `PG_NAME`, `PG_USER`, `PG_HOST`, `PG_PORT`, `PG_AUTH_TOKEN`: PostgreSQL connection parameters.
- `USE_REDIS`: Set to `True` in production to enable `RedisChannelLayer` and Redis caching.
- `REDIS_URL`: Redis connection string (`redis://redis:6379/0`).
- `SECURE_COOKIES`: Set to `True` when serving over HTTPS.

### Frontend (`frontend/`)
- `NEXT_PUBLIC_API_BASE_URL`: Points to the backend server origin (defaults to port `8000` on the active hostname in local development).
