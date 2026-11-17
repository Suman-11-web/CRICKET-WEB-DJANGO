# Village Cricket Live 🏏

A complete, production-oriented **Village Cricket Tournament Management and Live Score Platform** built with **Next.js (App Router + TypeScript + Tailwind CSS)** and **Django + Django REST Framework + Django Channels (WebSockets)**.

---

## Key Capabilities

- **Premium Public Cricket Website**:
  - Complete 15-section Homepage (Sections A through O: Top Announcement Bar, Sticky Header with English/Kannada toggle & Dark/Light theme switch, Hero Section, Live Cricket Matches, Upcoming Fixtures, Recent Match Results, Active & Past Tournaments, Featured Village Teams, Points Table Preview, Top Players, Tournament Winners Showcase, Photo Gallery, Sponsors & Partners, News Bulletins, and CMS Footer).
  - Dedicated functional pages for `/live-scores`, `/matches`, `/matches/[id]/[slug]`, `/tournaments`, `/tournaments/[id]`, `/teams`, `/teams/[id]`, `/players`, `/players/[id]`, `/points-table`, `/results`, `/winners`, `/gallery`, `/about`, and `/contact`.
- **20-Module Custom Admin Dashboard (`/admin-dashboard`)**:
  - Role-Based Access Control (`Super Admin`, `Tournament Admin`, `Scorer`, `Content Editor`).
  - **Live Match Control**:
    - **Mode A (Simple Manual Scoring)**: Direct entry of runs, wickets, overs, balls, target, active batters/bowler, and match status with instant WebSocket broadcast and reconciliation protection.
    - **Mode B (Advanced Ball-by-Ball Scoring)**: Full cricket rules keypad (`0`, `1`, `2`, `3`, `4`, `5`, `6`, `Wide`, `No Ball + bat runs`, `Bye`, `Leg Bye`, `Wicket` with dismissal types, automatic strike rotation, over completion, and deterministic **Undo Last Ball**).
  - **Match Winner & Finalization Control**: Direct winner selection, victory margin, Player of the Match, automatic score contradiction flagging, tournament champion crowning, and automatic **Points Table & Net Run Rate (NRR)** calculation.
  - **Built-in Website CMS**: Edit branding, Hero content, navigation visibility/ordering, announcements, gallery, sponsors, About/Contact content, and legal policies without touching source code.

---

## Quick Start (Local Development)

### 1. Backend (Django + Channels ASGI + SQLite/PostgreSQL)

```bash
cd /Users/suman/CRICKET-WEB/backend
.venv/bin/python manage.py migrate
.venv/bin/python manage.py seed_village_cricket
.venv/bin/python manage.py runserver 8000
```

- **REST API Base**: `http://localhost:8000/api/v1/`
- **OpenAPI 3.0 Schema**: `http://localhost:8000/api/v1/schema/`
- **WebSocket Endpoints**: `ws://localhost:8000/ws/matches/<match_id>/` and `ws://localhost:8000/ws/live-scores/`

### 2. Run Automated Backend Tests

```bash
cd /Users/suman/CRICKET-WEB/backend
.venv/bin/python manage.py test cricket -v 2
```

### 3. Frontend (Next.js App Router)

```bash
cd /Users/suman/CRICKET-WEB/frontend
npm install
npm run dev
```

- **Public Website**: `http://localhost:3000`
- **Custom Admin Dashboard**: `http://localhost:3000/admin-dashboard`
  - **Super Admin**: `admin` / `Admin@2026`
  - **Match Scorer**: `scorer` / `Scorer@2026`
  - **Content Editor**: `editor` / `Editor@2026`

---

## Documentation

- [`docs/ARCHITECTURE_AND_DATABASE.md`](docs/ARCHITECTURE_AND_DATABASE.md) — Monorepo structure, 28 normalized Django models, and SQLite vs. PostgreSQL concurrency notes.
- [`docs/ADMIN_USER_GUIDE.md`](docs/ADMIN_USER_GUIDE.md) — Step-by-step Administrator Guide and Manual Acceptance Checklist.
- [`docs/DEPLOYMENT_GUIDE.md`](docs/DEPLOYMENT_GUIDE.md) — Docker Compose, Nginx reverse proxy, AWS, and Vercel deployment instructions.
