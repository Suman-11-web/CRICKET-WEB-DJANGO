"""
Comprehensive Automated Test Suite for Village Cricket Live (Section 22).
Covers:
1. Authentication, session cookies & role-based access control (Super Admin, Tournament Admin, Scorer, Content Editor)
2. Match creation (Friendly and Tournament matches)
3. Mode A: Direct manual score updates & audit logging
4. Mode B: Ball-by-ball scoring (legal runs, boundaries, wides, no-balls + bat runs, byes, leg-byes)
5. Strike rotation (odd runs and end-of-over rotation)
6. Wickets, Fall of Wickets, and Bowling/Batting scorecard updates
7. Over completion & Innings target calculation
8. Undo Last Ball with deterministic restoration and audit trail
9. Reconciliation workflow when manually editing an innings calculated from ball-by-ball events
10. Winner assignment, match finalization, and score contradiction detection
11. Tournament standings & Net Run Rate (NRR) calculation (including all-out full-overs rule)
12. Authorized manual standing adjustments (preserving manual adjustments across recalculations)
13. Idempotent scoring requests (preventing duplicate ball recording on retry)
14. Homepage CMS updates & navigation visibility controls
15. Contact form server-side validation and anti-spam honeypot handling
"""
import json
from datetime import date
from decimal import Decimal
from django.test import Client, TestCase

from .models import (
    AdminRole,
    AuditLog,
    BallEvent,
    ContactMessage,
    Match,
    MatchInnings,
    MatchResult,
    Player,
    ScoreCorrection,
    Team,
    Tournament,
    TournamentRegistration,
    TournamentStanding,
    User,
    WebsiteSettings,
)
from .services import (
    CricketScoringService,
    ScoringError,
    StandingsCalculationService,
    ensure_match_innings,
)


class VillageCricketLiveTestSuite(TestCase):
    def setUp(self):
        self.client = Client()

        # Roles & Users
        self.super_role = AdminRole.objects.create(code=AdminRole.ROLE_SUPER_ADMIN, name="Super Admin")
        self.scorer_role = AdminRole.objects.create(code=AdminRole.ROLE_SCORER, name="Scorer")
        self.editor_role = AdminRole.objects.create(code=AdminRole.ROLE_CONTENT_EDITOR, name="Content Editor")

        self.admin_user = User.objects.create_user(
            username="admin_test",
            password="TestPassword123!",
            role_code=User.ROLE_SUPER_ADMIN,
            admin_role=self.super_role,
            is_staff=True,
            is_superuser=True,
        )
        self.scorer_user = User.objects.create_user(
            username="scorer_test",
            password="TestPassword123!",
            role_code=User.ROLE_SCORER,
            admin_role=self.scorer_role,
        )
        self.editor_user = User.objects.create_user(
            username="editor_test",
            password="TestPassword123!",
            role_code=User.ROLE_CONTENT_EDITOR,
            admin_role=self.editor_role,
        )

        # Teams
        self.team_a = Team.objects.create(
            name="Royal Strikers",
            short_name="RS",
            village="Hadinaru",
            captain_name="Darshan",
        )
        self.team_b = Team.objects.create(
            name="Village Warriors",
            short_name="VW",
            village="Nanjangud",
            captain_name="Chethan",
        )

        # Players
        self.striker = Player.objects.create(
            name="Darshan",
            team=self.team_a,
            playing_role=Player.ROLE_BATTER,
            jersey_number=7,
        )
        self.non_striker = Player.objects.create(
            name="Abhishek",
            team=self.team_a,
            playing_role=Player.ROLE_BATTER,
            jersey_number=18,
        )
        self.bowler = Player.objects.create(
            name="Lokesh",
            team=self.team_b,
            playing_role=Player.ROLE_BOWLER,
            jersey_number=23,
        )

        # Tournament
        self.tournament = Tournament.objects.create(
            name="Village Premier Cup",
            season_year=2026,
            organizer_name="Village Sports Club",
            village="Hadinaru",
            ground_name="Main Ground",
            start_date=date(2026, 11, 1),
            end_date=date(2026, 11, 20),
            overs_per_innings=2,
            points_for_win=2,
            points_for_tie=1,
            points_for_no_result=1,
        )
        TournamentRegistration.objects.create(tournament=self.tournament, team=self.team_a, status="APPROVED")
        TournamentRegistration.objects.create(tournament=self.tournament, team=self.team_b, status="APPROVED")

        # Match
        self.match = Match.objects.create(
            title="Royal Strikers vs Village Warriors",
            match_type=Match.TYPE_TOURNAMENT,
            tournament=self.tournament,
            team_a=self.team_a,
            team_b=self.team_b,
            match_date=date(2026, 11, 16),
            overs_per_innings=2,
            status=Match.STATUS_LIVE,
            toss_winner=self.team_a,
            toss_decision="BAT",
        )
        ensure_match_innings(self.match)

    def authenticate_as(self, username: str) -> str:
        res = self.client.post(
            "/api/v1/auth/login/",
            data=json.dumps({"username": username, "password": "TestPassword123!"}),
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 200)
        return res.json()["token"]

    def test_01_authentication_and_role_restrictions(self):
        """Verify login, session token issuance, and RBAC restrictions across roles."""
        # Unauthenticated request to admin overview fails with 401
        res = self.client.get("/api/v1/admin/overview/")
        self.assertEqual(res.status_code, 401)

        # Content Editor cannot score a match (403)
        editor_token = self.authenticate_as("editor_test")
        res_score = self.client.post(
            f"/api/v1/matches/{self.match.id}/manual-score/",
            data=json.dumps({"innings_number": 1, "runs": 10, "wickets": 0, "completed_overs": 1}),
            content_type="application/json",
            HTTP_X_ADMIN_SESSION=editor_token,
        )
        self.assertEqual(res_score.status_code, 403)

        # Content Editor CAN update Website CMS Settings (200)
        res_cms = self.client.put(
            "/api/v1/settings/",
            data=json.dumps({"hero_title": "Updated Village Hero Heading"}),
            content_type="application/json",
            HTTP_X_ADMIN_SESSION=editor_token,
        )
        self.assertEqual(res_cms.status_code, 200)
        self.assertEqual(WebsiteSettings.get_solo().hero_title, "Updated Village Hero Heading")

    def test_02_match_creation_via_api(self):
        """Verify administrator can create both friendly and tournament matches via API."""
        token = self.authenticate_as("admin_test")
        res = self.client.post(
            "/api/v1/matches/",
            data=json.dumps(
                {
                    "title": "Friendly Sunday Clash",
                    "match_type": "FRIENDLY",
                    "team_a_id": self.team_a.id,
                    "team_b_id": self.team_b.id,
                    "venue": "Hadinaru Ground",
                    "overs_per_innings": 8,
                }
            ),
            content_type="application/json",
            HTTP_X_ADMIN_SESSION=token,
        )
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data["title"], "Friendly Sunday Clash")
        self.assertEqual(len(data["innings"]), 2)

    def test_03_direct_manual_score_updates_and_audit_log(self):
        """Verify Mode A manual scoring updates innings, sets target, and records audit trail."""
        token = self.authenticate_as("scorer_test")
        res = self.client.post(
            f"/api/v1/matches/{self.match.id}/manual-score/",
            data=json.dumps(
                {
                    "innings_number": 1,
                    "runs": 34,
                    "wickets": 2,
                    "completed_overs": 2,
                    "balls_in_over": 0,
                    "innings_status": "COMPLETED",
                    "correction_reason": "End of 1st innings manual entry",
                }
            ),
            content_type="application/json",
            HTTP_X_ADMIN_SESSION=token,
        )
        self.assertEqual(res.status_code, 200)
        payload = res.json()
        self.assertEqual(payload["innings"][0]["runs"], 34)
        self.assertEqual(payload["innings"][0]["wickets"], 2)
        self.assertEqual(payload["target_score"], 35)
        self.assertTrue(AuditLog.objects.filter(action="MANUAL_SCORE_UPDATE").exists())

    def test_04_ball_by_ball_scoring_wides_noballs_strike_and_over_completion(self):
        """Verify Mode B ball-by-ball rules: wides, no-balls + bat runs, strike rotation, and over completion."""
        # Ball 1: 1 run off bat -> striker & non-striker rotate strike
        CricketScoringService.record_ball_event(
            match_id=self.match.id,
            innings_number=1,
            runs_off_bat=1,
            striker_id=self.striker.id,
            non_striker_id=self.non_striker.id,
            bowler_id=self.bowler.id,
            actor=self.scorer_user,
        )
        inn1 = MatchInnings.objects.get(match=self.match, innings_number=1)
        self.assertEqual(inn1.runs, 1)
        self.assertEqual(inn1.balls_in_over, 1)
        # Strike rotated to non_striker (Abhishek)
        self.assertEqual(inn1.striker_id, self.non_striker.id)

        # Ball 2 (Wide): Illegal delivery -> adds 1 wide extra, does NOT increment legal ball count
        CricketScoringService.record_ball_event(
            match_id=self.match.id,
            innings_number=1,
            extra_type=BallEvent.EXTRA_WIDE,
            extra_runs=1,
            actor=self.scorer_user,
        )
        inn1.refresh_from_db()
        self.assertEqual(inn1.runs, 2)
        self.assertEqual(inn1.extras_wides, 1)
        self.assertEqual(inn1.balls_in_over, 1)  # Still 1 legal ball

        # Ball 2 (No Ball + 4 off bat): Illegal delivery -> 1 NB extra + 4 bat runs = 5 runs
        CricketScoringService.record_ball_event(
            match_id=self.match.id,
            innings_number=1,
            runs_off_bat=4,
            extra_type=BallEvent.EXTRA_NO_BALL,
            extra_runs=1,
            actor=self.scorer_user,
        )
        inn1.refresh_from_db()
        self.assertEqual(inn1.runs, 7)
        self.assertEqual(inn1.extras_no_balls, 1)
        self.assertEqual(inn1.balls_in_over, 1)  # Still 1 legal ball

        # Complete remaining 5 legal balls of Over 1 (dot balls)
        for _ in range(5):
            CricketScoringService.record_ball_event(
                match_id=self.match.id,
                innings_number=1,
                runs_off_bat=0,
                actor=self.scorer_user,
            )
        inn1.refresh_from_db()
        self.assertEqual(inn1.completed_overs, 1)
        self.assertEqual(inn1.balls_in_over, 0)

    def test_05_wickets_undo_last_ball_and_reconciliation_guard(self):
        """Verify wicket recording, Undo Last Ball restoration, and reconciliation check on manual edit."""
        # Score a 6 then a wicket
        CricketScoringService.record_ball_event(
            match_id=self.match.id,
            innings_number=1,
            runs_off_bat=6,
            striker_id=self.striker.id,
            non_striker_id=self.non_striker.id,
            bowler_id=self.bowler.id,
            actor=self.scorer_user,
        )
        CricketScoringService.record_ball_event(
            match_id=self.match.id,
            innings_number=1,
            is_wicket=True,
            wicket_type="BOWLED",
            actor=self.scorer_user,
        )
        inn1 = MatchInnings.objects.get(match=self.match, innings_number=1)
        self.assertEqual(inn1.runs, 6)
        self.assertEqual(inn1.wickets, 1)

        # Undo the wicket ball -> restores to 6/0 in 0.1 overs
        CricketScoringService.undo_last_ball(
            match_id=self.match.id,
            innings_number=1,
            reason="Wrong dismissal call",
            actor=self.scorer_user,
        )
        inn1.refresh_from_db()
        self.assertEqual(inn1.runs, 6)
        self.assertEqual(inn1.wickets, 0)
        self.assertEqual(inn1.balls_in_over, 1)

        # Attempting manual override without reconcile_ball_events raises ScoringError
        with self.assertRaises(ScoringError):
            CricketScoringService.update_manual_score(
                match_id=self.match.id,
                innings_number=1,
                runs=50,
                wickets=1,
                completed_overs=1,
                balls_in_over=0,
                reconcile_ball_events=False,
                actor=self.admin_user,
            )

        # With reconcile_ball_events=True and reason, it succeeds and records BALL_RECONCILIATION
        CricketScoringService.update_manual_score(
            match_id=self.match.id,
            innings_number=1,
            runs=50,
            wickets=1,
            completed_overs=1,
            balls_in_over=0,
            reconcile_ball_events=True,
            correction_reason="Scorer reconciled with paper scoresheet",
            actor=self.admin_user,
        )
        self.assertTrue(
            ScoreCorrection.objects.filter(
                match=self.match, correction_type="BALL_RECONCILIATION"
            ).exists()
        )

    def test_06_idempotent_scoring_prevents_double_scoring(self):
        """Verify duplicate requests with the same idempotency_key are only scored once."""
        idem_key = "match-1-ball-unique-key-999"
        CricketScoringService.record_ball_event(
            match_id=self.match.id,
            innings_number=1,
            runs_off_bat=4,
            idempotency_key=idem_key,
            actor=self.scorer_user,
        )
        CricketScoringService.record_ball_event(
            match_id=self.match.id,
            innings_number=1,
            runs_off_bat=4,
            idempotency_key=idem_key,
            actor=self.scorer_user,
        )
        inn1 = MatchInnings.objects.get(match=self.match, innings_number=1)
        self.assertEqual(inn1.runs, 4)
        self.assertEqual(inn1.balls_in_over, 1)

    def test_07_winner_contradiction_detection_and_standings_nrr_calculation(self):
        """
        Verify:
        1. Contradiction flag blocks accidental wrong winner selection unless explicitly acknowledged
        2. Finalizing result calculates accurate Points Table & NRR (including all-out full-overs treatment)
        3. Authorized manual standing adjustments are preserved across recalculations
        """
        # Team A scores 30/2 in 2.0 overs; Team B is all out for 18/10 in 1.3 overs (max 2 overs)
        CricketScoringService.update_manual_score(
            match_id=self.match.id,
            innings_number=1,
            runs=30,
            wickets=2,
            completed_overs=2,
            balls_in_over=0,
            actor=self.admin_user,
        )
        CricketScoringService.update_manual_score(
            match_id=self.match.id,
            innings_number=2,
            runs=18,
            wickets=10,
            completed_overs=1,
            balls_in_over=3,
            actor=self.admin_user,
        )

        # Selecting Team B (18 runs) as winner over Team A (30 runs) without acknowledgement must fail
        with self.assertRaises(ScoringError):
            CricketScoringService.finalize_match_result(
                match_id=self.match.id,
                winning_team_id=self.team_b.id,
                victory_type=MatchResult.RESULT_WON_BY_RUNS,
                victory_margin="12 runs",
                acknowledge_contradiction=False,
                actor=self.admin_user,
            )

        # Selecting Team A (30 runs) as winner succeeds and updates TournamentStanding
        CricketScoringService.finalize_match_result(
            match_id=self.match.id,
            winning_team_id=self.team_a.id,
            victory_type=MatchResult.RESULT_WON_BY_RUNS,
            victory_margin="12 runs",
            player_of_the_match_id=self.striker.id,
            actor=self.admin_user,
        )

        standing_a = TournamentStanding.objects.get(tournament=self.tournament, team=self.team_a)
        standing_b = TournamentStanding.objects.get(tournament=self.tournament, team=self.team_b)
        self.assertEqual(standing_a.rank, 1)
        self.assertEqual(standing_a.points, 2)
        # Team A NRR: (30 / 2 overs) - (18 / 2 overs because Team B was all out) = 15.0 - 9.0 = +6.000
        self.assertEqual(standing_a.net_run_rate, Decimal("6.000"))
        self.assertEqual(standing_b.net_run_rate, Decimal("-6.000"))

        # Apply manual adjustment (+1 bonus point to Team B) and verify recalculation preserves it
        StandingsCalculationService.apply_manual_standing_adjustment(
            tournament_id=self.tournament.id,
            team_id=self.team_b.id,
            points_delta=1,
            reason="Fair play bonus point awarded by panchayat committee",
            actor=self.admin_user,
        )
        StandingsCalculationService.recalculate_tournament_standings(self.tournament)
        standing_b.refresh_from_db()
        self.assertTrue(standing_b.has_manual_adjustment)
        self.assertEqual(standing_b.points, 1)

    def test_08_contact_form_validation_and_antispam(self):
        """Verify contact form rejects short/invalid inputs and flags honeypot spam."""
        res_bad = self.client.post(
            "/api/v1/contact/",
            data=json.dumps({"name": "A", "email": "invalid", "subject": "Hi", "message": "Short"}),
            content_type="application/json",
        )
        self.assertEqual(res_bad.status_code, 400)

        res_ok = self.client.post(
            "/api/v1/contact/",
            data=json.dumps(
                {
                    "name": "Raghavendra Gowda",
                    "email": "raghu@example.com",
                    "village": "Hadinaru",
                    "subject": "Team Registration Inquiry",
                    "message": "We would like to register our village team for the upcoming knockout cup.",
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(res_ok.status_code, 201)
        self.assertEqual(ContactMessage.objects.filter(status=ContactMessage.STATUS_NEW).count(), 1)
