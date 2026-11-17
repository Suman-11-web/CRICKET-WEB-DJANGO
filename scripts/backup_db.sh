#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="$ROOT_DIR/backups"
mkdir -p "$BACKUP_DIR"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"

cd "$ROOT_DIR/backend"
.venv/bin/python manage.py dumpdata cricket --indent 2 > "$BACKUP_DIR/village_cricket_backup_${TIMESTAMP}.json"
echo "Backup saved to $BACKUP_DIR/village_cricket_backup_${TIMESTAMP}.json"
