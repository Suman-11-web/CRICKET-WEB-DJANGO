# Village Cricket Live — Architecture, Database & API Documentation

## 1. System Architecture Overview

**Village Cricket Live** is a full-stack monorepo combining a **Next.js (App Router + TypeScript + Tailwind CSS)** public sports portal and custom 20-module administration studio with a **Django + Django REST Framework + Django Channels (ASGI)** backend.

```text
/Users/suman/CRICKET-WEB
├── backend/                  # Django, DRF, Channels ASGI, Scoring Engine & Pytest
│   ├── config/               # ASGI, WSGI, Celery, Settings & Root URLs
│   ├── cricket/              # Core application: 28 models, scoring services, API & WS
│   └── manage.py
├── frontend/                 # Next.js App Router (TypeScript + Tailwind CSS + PWA)
│   ├── public/               # Crest SVG logo, PWA manifest.json
│   └── src/
│       ├── app/              # Public pages & /admin-dashboard (20 modules)
│       ├── components/       # Navbar, Footer, MatchCard & Admin Scoring Consoles
│       ├── context/          # SiteContext (CMS, Theme, EN/KN Language, Auth)
│       ├── lib/              # Typed REST client & WebSocket auto-reconnect hook
│       └── types/            # Full TypeScript domain interfaces
├── infrastructure/           # Dockerfiles, docker-compose.yml & Nginx reverse proxy
├── scripts/                  # Setup, seed, and database backup scripts
├── docs/                     # Architecture, Admin Guide & Deployment Guides
└── tests/                    # End-to-End Playwright test specifications
```

---

## 2. Normalized Database Models (28 Models)

All models are defined in `backend/cricket/models.py` and migrated via `cricket/migrations/0001_initial.py`:

1. **`AdminRole`**: Defines role-based access control permissions (`SUPER_ADMIN`, `TOURNAMENT_ADMIN`, `SCORER`, `CONTENT_EDITOR`).
2. **`User`**: Custom user extending `AbstractUser` with `admin_role`, `role_code`, `village`, `phone`, `two_factor_enabled`, and `session_token`.
3. **`WebsiteSettings`**: Singleton CMS model storing site branding, Hero configuration, About content, Contact info, Footer, Legal policies, and SEO metadata.
4. **`NavigationItem`**: Configurable public navigation links (`Home`, `Live Scores`, `Matches`, `Tournaments`, `Teams`, `Players`, `Points Table`, `Results`, `Winners`, `Gallery`, `About Us`, `Contact Us`) with English and Kannada (`label_kn`) labels and visibility toggles.
5. **`HomepageSection`**: Controls visibility and ordering of Homepage Sections A through O.
6. **`Announcement`**: Top announcement bar items with start/expiration dates and priority.
7. **`Tournament`**: Multi-team tournaments with format, overs, registration status, points system (`points_for_win`, `points_for_tie`, `points_for_no_result`), and `all_out_uses_full_overs_for_nrr`.
8. **`TournamentStage`**: League, Groups, Quarter-Finals, Semi-Finals, and Final stages.
9. **`TournamentGroup`**: Pool/Group divisions within a tournament.
10. **`Team`**: Village cricket teams with short code, crest logo, primary color, village, captain, achievements, and private admin-only manager contact details.
11. **`Player`**: Registered players with role, batting/bowling style, jersey number, calculated match stats, and clearly distinguished organizer-approved manual statistics.
12. **`TeamMembership`**: Historical record of player team memberships across tournaments and seasons.
13. **`TournamentRegistration`**: Links teams to tournaments and groups.
14. **`Match`**: Supports both `FRIENDLY` (independent of tournaments) and `TOURNAMENT` fixtures, with optimistic concurrency `version` counter.
15. **`MatchInnings`**: Stores innings runs, wickets, completed overs, balls in current over, extras breakdown, active striker/non-striker/bowler, partnership, and fall of wickets.
16. **`BattingPerformance`**: Individual batter scorecard line (`runs`, `balls_faced`, `fours`, `sixes`, `dismissal_type`, `dismissal_text`, `strike_rate`).
17. **`BowlingPerformance`**: Individual bowler scorecard line (`completed_overs`, `balls_in_over`, `maidens`, `runs_conceded`, `wickets`, `wides`, `no_balls`, `economy_rate`).
18. **`BallEvent`**: Immutable ball-by-ball delivery record with `idempotency_key`, legal/illegal delivery flag, extras, wicket details, strike rotation flag, and `pre_ball_snapshot` for deterministic Undo Last Ball.
19. **`ScoreCorrection`**: Audit record of manual score edits, ball-by-ball reconciliations, undos, and result corrections.
20. **`MatchResult`**: Finalized match outcome with winning team, victory type, margin, Player of the Match, and contradiction detection flags.
21. **`MatchAward`**: Match and tournament awards (`PLAYER_OF_THE_MATCH`, `BEST_BATTER`, `BEST_BOWLER`, `PLAYER_OF_THE_TOURNAMENT`).
22. **`TournamentStanding`**: Calculated and effective tournament standings with Net Run Rate (`Decimal(7,3)`).
23. **`StandingAdjustment`**: Authorized manual adjustments with mandatory reason, preserved across automatic recalculations.
24. **`TournamentWinner`**: Hall of Champions showcase for current and past tournament winners and runners-up.
25. **`NewsPost`**: Organizer news bulletins, registration updates, and schedule announcements.
26. **`GalleryImage`**: Categorized tournament, ceremony, team, trophy, player, and ground photographs.
27. **`Sponsor`**: Title, Gold, Silver, and Community tournament sponsors.
28. **`ContactMessage`**: Public contact form submissions with honeypot anti-spam filtering and admin status workflow.
29. **`AuditLog`**: Immutable system-wide audit trail.

### SQLite vs. PostgreSQL Concurrency Note
- **PostgreSQL (Production)**: Supports row-level locking (`select_for_update()`) across concurrent scorers and high-throughput WebSocket workers.
- **SQLite3 (Local Development)**: Uses file-level write locks (`timeout: 20s`). Suitable for single-scorer local development and automated testing, but production tournaments with multiple simultaneous scorers should use PostgreSQL.
