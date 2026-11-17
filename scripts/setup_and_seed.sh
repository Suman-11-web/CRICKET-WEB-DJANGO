#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
echo "=== Village Cricket Live — Setup & Seed Script ==="

cd "$ROOT_DIR/backend"
if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi

.venv/bin/pip install -r requirements.txt
.venv/bin/python manage.py makemigrations cricket
.venv/bin/python manage.py migrate
.venv/bin/python manage.py seed_village_cricket

echo "Backend ready. Run '.venv/bin/python manage.py runserver 8000' in backend/ and 'npm install && npm run dev' in frontend/."
