"""
Centralized Cricket Scoring, Match Finalization, Contradiction Detection,
and Points Table / Net Run Rate (NRR) Engine for Village Cricket Live.
"""
from __future__ import annotations

import logging
import uuid
from decimal import Decimal, ROUND_HALF_UP
from typing import Any

from django.db import transaction
from django.utils import timezone

from .models import (
    AuditLog,
    BallEvent,
    BattingPerformance,
    BowlingPerformance,
    Match,
    MatchAward,
    MatchInnings,
    MatchResult,
    Player,
    ScoreCorrection,
    StandingAdjustment,
    Team,
    Tournament,
    TournamentRegistration,
    TournamentStanding,
    TournamentWinner,
    User,
)

logger = logging.getLogger("cricket")


class ScoringError(ValueError):
    """Raised when a scoring operation violates cricket or reconciliation rules."""


def parse_overs_string(overs_val: str | int | float | None) -> tuple[int, int]:
    """Parse overs input like '15.2' or 15 into (completed_overs, balls_in_over)."""
    if overs_val is None or str(overs_val).strip() == "":
        return 0, 0
    s = str(overs_val).strip()
    if "." in s:
        parts = s.split(".", 1)
        comp = int(parts[0] or 0)
        balls = int(parts[1][:1] or 0)
        if balls >= 6:
            comp += balls // 6
            balls = balls % 6
        return max(0, comp), max(0, balls)
    return max(0, int(float(s))), 0


def record_audit_log(
    *,
    actor: User | None,
    action: str,
    module: str,
    target_type: str,
    target_id: str | int = "",
    description: str,
    before_state: dict | None = None,
    after_state: dict | None = None,
    ip_address: str = "",
) -> AuditLog:
    actor_name = actor.username if actor and getattr(actor, "is_authenticated", False) else "System"
    actor_role = actor.effective_role if actor and getattr(actor, "is_authenticated", False) else "SUPER_ADMIN"
    return AuditLog.objects.create(
        actor=actor if (actor and getattr(actor, "is_authenticated", False)) else None,
        actor_name=actor_name,
        actor_role=actor_role,
        action=action,
        module=module,
        target_type=target_type,
        target_id=str(target_id),
        description=description,
        before_state=before_state or {},
        after_state=after_state or {},
        ip_address=ip_address,
    )


def ensure_match_innings(match: Match) -> tuple[MatchInnings, MatchInnings]:
    """Ensure Innings 1 and Innings 2 exist for a match based on toss or team order."""
    first_bat = match.team_a
    first_bowl = match.team_b
    if match.toss_winner_id:
        if match.toss_decision == "BAT":
            first_bat = match.toss_winner
            first_bowl = match.team_b if match.toss_winner_id == match.team_a_id else match.team_a
        elif match.toss_decision == "BOWL":
            first_bowl = match.toss_winner
            first_bat = match.team_b if match.toss_winner_id == match.team_a_id else match.team_a

    inn1, _ = MatchInnings.objects.get_or_create(
        match=match,
        innings_number=1,
        defaults={
            "batting_team": first_bat,
            "bowling_team": first_bowl,
            "max_overs": match.overs_per_innings,
            "status": MatchInnings.STATUS_IN_PROGRESS if match.status == Match.STATUS_LIVE else MatchInnings.STATUS_NOT_STARTED,
        },
    )
    inn2, _ = MatchInnings.objects.get_or_create(
        match=match,
        innings_number=2,
        defaults={
            "batting_team": first_bowl,
            "bowling_team": first_bat,
            "max_overs": match.overs_per_innings,
            "target_runs": match.target_score,
            "status": MatchInnings.STATUS_NOT_STARTED,
        },
    )
    return inn1, inn2


def serialize_match_live_payload(match: Match) -> dict[str, Any]:
    """Build authoritative real-time payload for WebSockets and REST responses."""
    innings_qs = match.innings.select_related(
        "batting_team", "bowling_team", "striker", "non_striker", "current_bowler"
    ).prefetch_related(
        "batting_performances__player",
        "bowling_performances__player",
    )
    innings_list = []
    for inn in innings_qs:
        batting_cards = [
            {
                "id": bp.id,
                "player_id": bp.player.id,
                "player_name": bp.player.name,
                "runs": bp.runs,
                "balls_faced": bp.balls_faced,
                "fours": bp.fours,
                "sixes": bp.sixes,
                "strike_rate": bp.strike_rate,
                "dismissal_type": bp.dismissal_type,
                "dismissal_text": bp.dismissal_text,
                "is_out": bp.is_out,
            }
            for bp in inn.batting_performances.all()
        ]
        bowling_cards = [
            {
                "id": bw.id,
                "player_id": bw.player.id,
                "player_name": bw.player.name,
                "overs": bw.overs_display,
                "completed_overs": bw.completed_overs,
                "balls_in_over": bw.balls_in_over,
                "maidens": bw.maidens,
                "runs_conceded": bw.runs_conceded,
                "wickets": bw.wickets,
                "wides": bw.wides,
                "no_balls": bw.no_balls,
                "economy": bw.economy_rate,
            }
            for bw in inn.bowling_performances.all()
        ]

        striker_card = next(
            (c for c in batting_cards if inn.striker_id and c["player_id"] == inn.striker_id),
            None,
        )
        non_striker_card = next(
            (
                c
                for c in batting_cards
                if inn.non_striker_id and c["player_id"] == inn.non_striker_id
            ),
            None,
        )
        bowler_card = next(
            (
                c
                for c in bowling_cards
                if inn.current_bowler_id and c["player_id"] == inn.current_bowler_id
            ),
            None,
        )

        innings_list.append(
            {
                "id": inn.id,
                "innings_number": inn.innings_number,
                "batting_team": {
                    "id": inn.batting_team.id,
                    "name": inn.batting_team.name,
                    "short_name": inn.batting_team.short_name,
                    "logo_url": inn.batting_team.logo_url,
                    "primary_color": inn.batting_team.primary_color,
                },
                "bowling_team": {
                    "id": inn.bowling_team.id,
                    "name": inn.bowling_team.name,
                    "short_name": inn.bowling_team.short_name,
                    "logo_url": inn.bowling_team.logo_url,
                    "primary_color": inn.bowling_team.primary_color,
                },
                "runs": inn.runs,
                "wickets": inn.wickets,
                "completed_overs": inn.completed_overs,
                "balls_in_over": inn.balls_in_over,
                "overs_display": inn.overs_display,
                "max_overs": inn.max_overs,
                "target_runs": inn.target_runs,
                "current_run_rate": inn.current_run_rate,
                "required_run_rate": inn.required_run_rate,
                "extras": {
                    "wides": inn.extras_wides,
                    "no_balls": inn.extras_no_balls,
                    "byes": inn.extras_byes,
                    "leg_byes": inn.extras_leg_byes,
                    "penalty": inn.extras_penalty,
                    "total": inn.total_extras,
                },
                "striker": (
                    {
                        "id": inn.striker.id,
                        "name": inn.striker.name,
                        "runs": striker_card["runs"] if striker_card else 0,
                        "balls_faced": striker_card["balls_faced"] if striker_card else 0,
                        "fours": striker_card["fours"] if striker_card else 0,
                        "sixes": striker_card["sixes"] if striker_card else 0,
                        "strike_rate": striker_card["strike_rate"] if striker_card else 0.0,
                    }
                    if inn.striker
                    else None
                ),
                "non_striker": (
                    {
                        "id": inn.non_striker.id,
                        "name": inn.non_striker.name,
                        "runs": non_striker_card["runs"] if non_striker_card else 0,
                        "balls_faced": non_striker_card["balls_faced"] if non_striker_card else 0,
                        "fours": non_striker_card["fours"] if non_striker_card else 0,
                        "sixes": non_striker_card["sixes"] if non_striker_card else 0,
                        "strike_rate": (
                            non_striker_card["strike_rate"] if non_striker_card else 0.0
                        ),
                    }
                    if inn.non_striker
                    else None
                ),
                "current_bowler": (
                    {
                        "id": inn.current_bowler.id,
                        "name": inn.current_bowler.name,
                        "overs": bowler_card["overs"] if bowler_card else "0.0",
                        "maidens": bowler_card["maidens"] if bowler_card else 0,
                        "runs_conceded": bowler_card["runs_conceded"] if bowler_card else 0,
                        "wickets": bowler_card["wickets"] if bowler_card else 0,
                        "economy": bowler_card["economy"] if bowler_card else 0.0,
                    }
                    if inn.current_bowler
                    else None
                ),
                "partnership_runs": inn.partnership_runs,
                "partnership_balls": inn.partnership_balls,
                "fall_of_wickets": inn.fall_of_wickets,
                "status": inn.status,
                "has_ball_events": inn.has_ball_events,
                "is_reconciled_manual_override": inn.is_reconciled_manual_override,
                "batting_card": batting_cards,
                "bowling_card": bowling_cards,
            }
        )

    recent_balls = [
        {
            "id": b.id,
            "sequence_number": b.sequence_number,
            "over_ball": f"{b.over_number}.{b.ball_in_over}",
            "striker_name": b.striker.name if b.striker else "",
            "bowler_name": b.bowler.name if b.bowler else "",
            "runs_off_bat": b.runs_off_bat,
            "extra_type": b.extra_type,
            "extra_runs": b.extra_runs,
            "total_runs": b.total_runs,
            "is_wicket": b.is_wicket,
            "wicket_type": b.wicket_type,
            "commentary": b.commentary,
            "created_at": b.created_at.isoformat(),
        }
        for b in match.ball_events.filter(is_undone=False)
        .select_related("striker", "bowler")
        .order_by("-sequence_number")[:18]
    ]

    result_data = None
    if hasattr(match, "result"):
        res = match.result
        result_data = {
            "winning_team_id": res.winning_team_id,
            "winning_team_name": res.winning_team.name if res.winning_team else None,
            "runner_up_team_id": res.runner_up_team_id,
            "runner_up_team_name": res.runner_up_team.name if res.runner_up_team else None,
            "victory_type": res.victory_type,
            "victory_margin": res.victory_margin,
            "result_summary": res.result_summary,
            "player_of_the_match_id": res.player_of_the_match_id,
            "player_of_the_match_name": (
                res.player_of_the_match.name
                if res.player_of_the_match
                else res.player_of_the_match_name
            ),
            "has_score_contradiction": res.has_score_contradiction,
            "contradiction_warning": res.contradiction_warning,
            "is_finalized": res.is_finalized,
            "result_notes": res.result_notes,
        }

    team_a_players = [
        {
            "id": p.id,
            "name": p.name,
            "playing_role": p.playing_role,
            "playing_role_display": p.get_playing_role_display(),
            "jersey_number": p.jersey_number,
            "is_captain": p.is_captain,
        }
        for p in match.team_a.players.filter(is_active=True).order_by("id")
    ]
    team_b_players = [
        {
            "id": p.id,
            "name": p.name,
            "playing_role": p.playing_role,
            "playing_role_display": p.get_playing_role_display(),
            "jersey_number": p.jersey_number,
            "is_captain": p.is_captain,
        }
        for p in match.team_b.players.filter(is_active=True).order_by("id")
    ]

    return {
        "id": match.id,
        "match_number": match.match_number,
        "slug": match.slug,
        "title": match.title,
        "match_type": match.match_type,
        "tournament": (
            {
                "id": match.tournament.id,
                "name": match.tournament.name,
                "slug": match.tournament.slug,
                "season_year": match.tournament.season_year,
            }
            if match.tournament
            else None
        ),
        "team_a": {
            "id": match.team_a.id,
            "name": match.team_a.name,
            "short_name": match.team_a.short_name,
            "village": match.team_a.village,
            "logo_url": match.team_a.logo_url,
            "primary_color": match.team_a.primary_color,
            "captain_name": match.team_a.captain_name,
            "players": team_a_players,
        },
        "team_b": {
            "id": match.team_b.id,
            "name": match.team_b.name,
            "short_name": match.team_b.short_name,
            "village": match.team_b.village,
            "logo_url": match.team_b.logo_url,
            "primary_color": match.team_b.primary_color,
            "captain_name": match.team_b.captain_name,
            "players": team_b_players,
        },
        "venue": match.venue,
        "match_date": str(match.match_date),
        "start_time": str(match.start_time),
        "overs_per_innings": match.overs_per_innings,
        "match_format": match.match_format,
        "status": match.status,
        "scoring_mode": match.scoring_mode,
        "current_innings_number": match.current_innings_number,
        "toss_winner_id": match.toss_winner_id,
        "toss_winner_name": match.toss_winner.name if match.toss_winner else None,
        "toss_decision": match.toss_decision,
        "target_score": match.target_score,
        "umpire_details": match.umpire_details,
        "match_notes": match.match_notes,
        "is_tournament_final": match.is_tournament_final,
        "version": match.version,
        "innings": innings_list,
        "recent_balls": recent_balls,
        "result": result_data,
        "updated_at": match.updated_at.isoformat(),
    }


def broadcast_match_update(match: Match, event_type: str = "score_update") -> None:
    """Broadcast updated match state to WebSocket spectators via Django Channels and local subscribers."""
    payload = {
        "type": "match_broadcast",
        "event_type": event_type,
        "match": serialize_match_live_payload(match),
        "timestamp": timezone.now().isoformat(),
    }
    try:
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer

        channel_layer = get_channel_layer()
        if channel_layer is not None:
            async_to_sync(channel_layer.group_send)(f"match_{match.id}", payload)
            async_to_sync(channel_layer.group_send)("live_scores_global", payload)
    except Exception as exc:  # pragma: no cover
        logger.debug("Channel broadcast skipped or fallback used: %s", exc)

    try:
        from .consumers import publish_to_native_ws_subscribers

        publish_to_native_ws_subscribers(match.id, payload)
    except Exception:
        pass


class CricketScoringService:
    """
    Centralized transactional service for:
    - Mode A: Simple Manual Scoring (direct runs, wickets, overs, max_overs, target, players & player stats, notes, reconciliation)
    - Mode B: Advanced Ball-by-Ball Scoring (legal/illegal deliveries, extras, wickets, strike rotation, overs, undo)
    - Match Winner & Finalization Control (with contradiction detection & automatic points table recalculation)
    """

    @staticmethod
    @transaction.atomic
    def update_manual_score(
        *,
        match_id: int,
        innings_number: int,
        runs: int,
        wickets: int,
        completed_overs: int,
        balls_in_over: int = 0,
        max_overs: int | None = None,
        target_runs: int | None = None,
        striker_id: int | None = None,
        non_striker_id: int | None = None,
        bowler_id: int | None = None,
        striker_runs: int | None = None,
        striker_balls: int | None = None,
        non_striker_runs: int | None = None,
        non_striker_balls: int | None = None,
        bowler_overs: str | int | None = None,
        bowler_maidens: int | None = None,
        bowler_runs: int | None = None,
        bowler_wickets: int | None = None,
        innings_status: str | None = None,
        match_status: str | None = None,
        match_notes: str | None = None,
        reconcile_ball_events: bool = False,
        correction_reason: str = "Manual score update by scorer",
        actor: User | None = None,
    ) -> Match:
        match = Match.objects.select_for_update().get(pk=match_id)
        ensure_match_innings(match)
        innings = MatchInnings.objects.select_for_update().get(
            match=match, innings_number=innings_number
        )

        # Allow updating Total Overs (max_overs / overs_per_innings) anytime
        if max_overs is not None and str(max_overs).strip() != "":
            new_max = max(1, int(max_overs))
            match.overs_per_innings = new_max
            innings.max_overs = new_max
            match.innings.all().update(max_overs=new_max)

        # Normalize balls >= 6 into completed_overs
        if balls_in_over >= 6:
            completed_overs += balls_in_over // 6
            balls_in_over = balls_in_over % 6

        if runs < 0:
            raise ScoringError("Runs cannot be negative.")
        if wickets < 0 or wickets > 10:
            raise ScoringError("Wickets must be between 0 and 10.")
        if balls_in_over < 0 or balls_in_over > 5:
            raise ScoringError("Balls in current over must be between 0 and 5.")
        if completed_overs < 0 or completed_overs > innings.max_overs:
            raise ScoringError(f"Completed overs cannot exceed total overs ({innings.max_overs}).")
        if completed_overs == innings.max_overs and balls_in_over > 0:
            raise ScoringError(
                f"Cannot have {completed_overs}.{balls_in_over} overs when total overs is {innings.max_overs}."
            )

        active_ball_events_exist = innings.ball_events.filter(is_undone=False).exists()
        score_differs_from_balls = (
            runs != innings.runs
            or wickets != innings.wickets
            or completed_overs != innings.completed_overs
            or balls_in_over != innings.balls_in_over
        )
        if active_ball_events_exist and score_differs_from_balls and not reconcile_ball_events:
            raise ScoringError(
                "This innings has active ball-by-ball events. To manually override the calculated score, "
                "enable 'reconcile_ball_events' and provide a reconciliation reason."
            )

        prev_state = {
            "runs": innings.runs,
            "wickets": innings.wickets,
            "completed_overs": innings.completed_overs,
            "balls_in_over": innings.balls_in_over,
            "max_overs": innings.max_overs,
            "target_runs": innings.target_runs,
            "match_status": match.status,
            "striker_id": innings.striker_id,
            "non_striker_id": innings.non_striker_id,
            "current_bowler_id": innings.current_bowler_id,
        }

        innings.runs = runs
        innings.wickets = wickets
        innings.completed_overs = completed_overs
        innings.balls_in_over = balls_in_over

        if target_runs is not None:
            innings.target_runs = target_runs if target_runs > 0 else None
            match.target_score = innings.target_runs
        elif innings_number == 1:
            inn2 = match.innings.filter(innings_number=2).first()
            if inn2 and (
                innings_status in (MatchInnings.STATUS_COMPLETED, MatchInnings.STATUS_ALL_OUT)
                or completed_overs == innings.max_overs
                or wickets == 10
            ):
                match.target_score = runs + 1
                inn2.target_runs = runs + 1
                inn2.save(update_fields=["target_runs", "updated_at"])

        if striker_id is not None:
            innings.striker = Player.objects.filter(pk=striker_id).first() if striker_id else None
        if non_striker_id is not None:
            innings.non_striker = (
                Player.objects.filter(pk=non_striker_id).first() if non_striker_id else None
            )
        if bowler_id is not None:
            innings.current_bowler = (
                Player.objects.filter(pk=bowler_id).first() if bowler_id else None
            )

        # Update active striker, non-striker, and bowler performance cards for live display
        if innings.striker:
            bp, _ = BattingPerformance.objects.get_or_create(
                innings=innings,
                player=innings.striker,
                defaults={"batting_order": innings.batting_performances.count() + 1},
            )
            if striker_runs is not None and str(striker_runs) != "":
                bp.runs = max(0, int(striker_runs))
            if striker_balls is not None and str(striker_balls) != "":
                bp.balls_faced = max(0, int(striker_balls))
            bp.save()

        if innings.non_striker:
            bp2, _ = BattingPerformance.objects.get_or_create(
                innings=innings,
                player=innings.non_striker,
                defaults={"batting_order": innings.batting_performances.count() + 1},
            )
            if non_striker_runs is not None and str(non_striker_runs) != "":
                bp2.runs = max(0, int(non_striker_runs))
            if non_striker_balls is not None and str(non_striker_balls) != "":
                bp2.balls_faced = max(0, int(non_striker_balls))
            bp2.save()

        if innings.current_bowler:
            bw, _ = BowlingPerformance.objects.get_or_create(
                innings=innings,
                player=innings.current_bowler,
                defaults={"bowling_order": innings.bowling_performances.count() + 1},
            )
            if bowler_overs is not None and str(bowler_overs) != "":
                b_comp, b_balls = parse_overs_string(bowler_overs)
                bw.completed_overs = b_comp
                bw.balls_in_over = b_balls
            if bowler_maidens is not None and str(bowler_maidens) != "":
                bw.maidens = max(0, int(bowler_maidens))
            if bowler_runs is not None and str(bowler_runs) != "":
                bw.runs_conceded = max(0, int(bowler_runs))
            if bowler_wickets is not None and str(bowler_wickets) != "":
                bw.wickets = max(0, int(bowler_wickets))
            bw.save()

        if wickets == 10:
            innings.status = MatchInnings.STATUS_ALL_OUT
        elif completed_overs == innings.max_overs:
            innings.status = MatchInnings.STATUS_COMPLETED
        elif innings_status:
            innings.status = innings_status
        else:
            innings.status = MatchInnings.STATUS_IN_PROGRESS

        if active_ball_events_exist and reconcile_ball_events:
            innings.is_reconciled_manual_override = True
            innings.last_reconciliation_reason = correction_reason

        innings.save()

        match.current_innings_number = innings_number
        if match_status:
            match.status = match_status
        elif match.status == Match.STATUS_UPCOMING:
            match.status = Match.STATUS_LIVE

        if match_notes is not None:
            match.match_notes = match_notes

        match.version += 1
        match.save()

        new_state = {
            "runs": innings.runs,
            "wickets": innings.wickets,
            "completed_overs": innings.completed_overs,
            "balls_in_over": innings.balls_in_over,
            "max_overs": innings.max_overs,
            "target_runs": innings.target_runs,
            "match_status": match.status,
            "striker_id": innings.striker_id,
            "non_striker_id": innings.non_striker_id,
            "current_bowler_id": innings.current_bowler_id,
        }

        ScoreCorrection.objects.create(
            match=match,
            innings=innings,
            correction_type=(
                "BALL_RECONCILIATION"
                if (active_ball_events_exist and reconcile_ball_events)
                else "MANUAL_EDIT"
            ),
            previous_state=prev_state,
            new_state=new_state,
            reason=correction_reason or "Manual score update",
            reconciled_from_ball_events=bool(active_ball_events_exist and reconcile_ball_events),
            performed_by=actor if (actor and getattr(actor, "is_authenticated", False)) else None,
        )

        record_audit_log(
            actor=actor,
            action="MANUAL_SCORE_UPDATE",
            module="LIVE_SCORING",
            target_type="Match",
            target_id=match.id,
            description=(
                f"Updated {match.title} Innings {innings_number} to "
                f"{runs}/{wickets} ({completed_overs}.{balls_in_over}/{innings.max_overs} ov)"
            ),
            before_state=prev_state,
            after_state=new_state,
        )

        transaction.on_commit(lambda: broadcast_match_update(match, "manual_score_update"))
        return match

    @staticmethod
    @transaction.atomic
    def undo_last_manual_change(
        *,
        match_id: int,
        innings_number: int | None = None,
        actor: User | None = None,
    ) -> Match:
        """Restores the previous manual score snapshot from ScoreCorrection."""
        match = Match.objects.select_for_update().get(pk=match_id)
        target_inn_num = innings_number or match.current_innings_number
        innings = MatchInnings.objects.select_for_update().get(
            match=match, innings_number=target_inn_num
        )
        last_corr = (
            ScoreCorrection.objects.filter(
                match=match,
                innings=innings,
                correction_type__in=["MANUAL_EDIT", "BALL_RECONCILIATION"],
            )
            .order_by("-created_at")
            .first()
        )
        if not last_corr or not last_corr.previous_state:
            raise ScoringError("No previous manual score change found to undo.")

        prev = last_corr.previous_state
        innings.runs = prev.get("runs", innings.runs)
        innings.wickets = prev.get("wickets", innings.wickets)
        innings.completed_overs = prev.get("completed_overs", innings.completed_overs)
        innings.balls_in_over = prev.get("balls_in_over", innings.balls_in_over)
        if "max_overs" in prev and prev["max_overs"]:
            innings.max_overs = prev["max_overs"]
            match.overs_per_innings = prev["max_overs"]
        innings.target_runs = prev.get("target_runs", innings.target_runs)
        innings.save()

        if "match_status" in prev and prev["match_status"]:
            match.status = prev["match_status"]
        match.version += 1
        match.save()

        last_corr.delete()
        record_audit_log(
            actor=actor,
            action="UNDO_MANUAL_SCORE",
            module="LIVE_SCORING",
            target_type="Match",
            target_id=match.id,
            description=f"Reverted manual score on {match.title} Innings {target_inn_num} to {innings.runs}/{innings.wickets}",
        )
        transaction.on_commit(lambda: broadcast_match_update(match, "undo_manual_score"))
        return match

    @staticmethod
    @transaction.atomic
    def record_ball_event(
        *,
        match_id: int,
        innings_number: int = 1,
        runs_off_bat: int = 0,
        extra_type: str = BallEvent.EXTRA_NONE,
        extra_runs: int = 0,
        is_wicket: bool = False,
        wicket_type: str = "",
        dismissed_player_id: int | None = None,
        fielder_name: str = "",
        striker_id: int | None = None,
        non_striker_id: int | None = None,
        bowler_id: int | None = None,
        commentary: str = "",
        idempotency_key: str | None = None,
        actor: User | None = None,
    ) -> tuple[Match, BallEvent]:
        if idempotency_key:
            existing = BallEvent.objects.filter(idempotency_key=idempotency_key).select_related("match").first()
            if existing:
                return existing.match, existing
        else:
            idempotency_key = str(uuid.uuid4())

        match = Match.objects.select_for_update().get(pk=match_id)
        ensure_match_innings(match)
        innings = MatchInnings.objects.select_for_update().get(
            match=match, innings_number=innings_number
        )

        if innings.status in (MatchInnings.STATUS_COMPLETED, MatchInnings.STATUS_ALL_OUT):
            raise ScoringError("This innings is already completed.")
        if innings.wickets >= 10:
            raise ScoringError("Batting team is already all out (10 wickets).")
        if innings.completed_overs >= innings.max_overs:
            raise ScoringError(f"Maximum overs ({innings.max_overs}) already completed.")

        if runs_off_bat < 0 or runs_off_bat > 6:
            raise ScoringError("Runs off bat must be between 0 and 6.")

        if striker_id:
            innings.striker = Player.objects.filter(pk=striker_id).first()
        if non_striker_id:
            innings.non_striker = Player.objects.filter(pk=non_striker_id).first()
        if bowler_id:
            innings.current_bowler = Player.objects.filter(pk=bowler_id).first()

        striker = innings.striker
        non_striker = innings.non_striker
        bowler = innings.current_bowler

        pre_ball_snapshot = {
            "runs": innings.runs,
            "wickets": innings.wickets,
            "completed_overs": innings.completed_overs,
            "balls_in_over": innings.balls_in_over,
            "extras_wides": innings.extras_wides,
            "extras_no_balls": innings.extras_no_balls,
            "extras_byes": innings.extras_byes,
            "extras_leg_byes": innings.extras_leg_byes,
            "extras_penalty": innings.extras_penalty,
            "striker_id": innings.striker_id,
            "non_striker_id": innings.non_striker_id,
            "current_bowler_id": innings.current_bowler_id,
            "partnership_runs": innings.partnership_runs,
            "partnership_balls": innings.partnership_balls,
            "fall_of_wickets": list(innings.fall_of_wickets or []),
            "status": innings.status,
        }

        extra_type = extra_type or BallEvent.EXTRA_NONE
        is_legal = extra_type not in (BallEvent.EXTRA_WIDE, BallEvent.EXTRA_NO_BALL, BallEvent.EXTRA_PENALTY)

        if extra_type == BallEvent.EXTRA_WIDE:
            runs_off_bat = 0
            if extra_runs < 1:
                extra_runs = 1
        elif extra_type == BallEvent.EXTRA_NO_BALL:
            if extra_runs < 1:
                extra_runs = 1
        elif extra_type in (BallEvent.EXTRA_BYE, BallEvent.EXTRA_LEG_BYE):
            runs_off_bat = 0
            if extra_runs < 1:
                extra_runs = 1
        elif extra_type == BallEvent.EXTRA_NONE:
            extra_runs = 0

        total_ball_runs = runs_off_bat + extra_runs
        over_num_before = innings.completed_overs
        ball_num_in_over = innings.balls_in_over + (1 if is_legal else 0)

        innings.runs += total_ball_runs
        innings.partnership_runs += total_ball_runs
        if is_legal:
            innings.partnership_balls += 1

        if extra_type == BallEvent.EXTRA_WIDE:
            innings.extras_wides += extra_runs
        elif extra_type == BallEvent.EXTRA_NO_BALL:
            innings.extras_no_balls += extra_runs
        elif extra_type == BallEvent.EXTRA_BYE:
            innings.extras_byes += extra_runs
        elif extra_type == BallEvent.EXTRA_LEG_BYE:
            innings.extras_leg_byes += extra_runs
        elif extra_type == BallEvent.EXTRA_PENALTY:
            innings.extras_penalty += extra_runs

        if striker:
            bat_perf, _ = BattingPerformance.objects.get_or_create(
                innings=innings,
                player=striker,
                defaults={"batting_order": innings.batting_performances.count() + 1},
            )
            if extra_type != BallEvent.EXTRA_WIDE:
                bat_perf.balls_faced += 1
                bat_perf.runs += runs_off_bat
                if runs_off_bat == 4:
                    bat_perf.fours += 1
                elif runs_off_bat == 6:
                    bat_perf.sixes += 1
            bat_perf.save()

        bowler_credited_wicket_types = {
            BattingPerformance.DISMISSAL_BOWLED,
            BattingPerformance.DISMISSAL_CAUGHT,
            BattingPerformance.DISMISSAL_LBW,
            BattingPerformance.DISMISSAL_STUMPED,
            BattingPerformance.DISMISSAL_HIT_WICKET,
        }
        if bowler:
            bowl_perf, _ = BowlingPerformance.objects.get_or_create(
                innings=innings,
                player=bowler,
                defaults={"bowling_order": innings.bowling_performances.count() + 1},
            )
            bowler_runs = runs_off_bat
            if extra_type in (BallEvent.EXTRA_WIDE, BallEvent.EXTRA_NO_BALL):
                bowler_runs += extra_runs
            bowl_perf.runs_conceded += bowler_runs

            if extra_type == BallEvent.EXTRA_WIDE:
                bowl_perf.wides += extra_runs
            elif extra_type == BallEvent.EXTRA_NO_BALL:
                bowl_perf.no_balls += 1

            if is_legal:
                if total_ball_runs == 0 and not is_wicket:
                    bowl_perf.dot_balls += 1
                bowl_perf.balls_in_over += 1
                if bowl_perf.balls_in_over >= 6:
                    bowl_perf.completed_overs += 1
                    bowl_perf.balls_in_over = 0

            if is_wicket and (wicket_type or BattingPerformance.DISMISSAL_BOWLED) in bowler_credited_types_for(extra_type, bowler_credited_wicket_types):
                bowl_perf.wickets += 1

            bowl_perf.save()

        dismissed_player = None
        if is_wicket:
            wicket_type = wicket_type or BattingPerformance.DISMISSAL_BOWLED
            innings.wickets += 1
            dismissed_player = (
                Player.objects.filter(pk=dismissed_player_id).first()
                if dismissed_player_id
                else striker
            )
            if dismissed_player:
                dismissed_perf, _ = BattingPerformance.objects.get_or_create(
                    innings=innings,
                    player=dismissed_player,
                    defaults={"batting_order": innings.batting_performances.count() + 1},
                )
                dismissed_perf.is_out = True
                dismissed_perf.dismissal_type = wicket_type
                dismissed_perf.dismissed_by_bowler = bowler
                dismissed_perf.fielder_name = fielder_name
                dismissed_perf.dismissal_text = format_dismissal_text(
                    wicket_type=wicket_type,
                    bowler_name=bowler.name if bowler else "",
                    fielder_name=fielder_name,
                )
                dismissed_perf.save()

            fow_list = list(innings.fall_of_wickets or [])
            fow_list.append(
                {
                    "wicket_number": innings.wickets,
                    "runs": innings.runs,
                    "overs": f"{over_num_before}.{ball_num_in_over}",
                    "player_name": dismissed_player.name if dismissed_player else "Batter",
                }
            )
            innings.fall_of_wickets = fow_list
            innings.partnership_runs = 0
            innings.partnership_balls = 0

        over_completed = False
        if is_legal:
            innings.balls_in_over += 1
            if innings.balls_in_over >= 6:
                innings.completed_overs += 1
                innings.balls_in_over = 0
                over_completed = True

        physical_runs_crossed = runs_off_bat
        if extra_type in (BallEvent.EXTRA_BYE, BallEvent.EXTRA_LEG_BYE):
            physical_runs_crossed = extra_runs
        elif extra_type == BallEvent.EXTRA_WIDE:
            physical_runs_crossed = max(0, extra_runs - 1)

        strike_rotated = False
        if physical_runs_crossed % 2 == 1:
            innings.striker, innings.non_striker = innings.non_striker, innings.striker
            strike_rotated = not strike_rotated

        if over_completed:
            innings.striker, innings.non_striker = innings.non_striker, innings.striker
            strike_rotated = not strike_rotated

        if innings.wickets >= 10:
            innings.status = MatchInnings.STATUS_ALL_OUT
        elif innings.target_runs and innings.runs >= innings.target_runs:
            innings.status = MatchInnings.STATUS_COMPLETED
        elif innings.completed_overs >= innings.max_overs:
            innings.status = MatchInnings.STATUS_COMPLETED
        else:
            innings.status = MatchInnings.STATUS_IN_PROGRESS

        if innings.innings_number == 1 and innings.status in (
            MatchInnings.STATUS_COMPLETED,
            MatchInnings.STATUS_ALL_OUT,
        ):
            match.target_score = innings.runs + 1
            inn2 = match.innings.filter(innings_number=2).first()
            if inn2:
                inn2.target_runs = innings.runs + 1
                inn2.save(update_fields=["target_runs", "updated_at"])

        innings.has_ball_events = True
        innings.is_reconciled_manual_override = False
        innings.save()

        seq_num = (
            innings.ball_events.order_by("-sequence_number")
            .values_list("sequence_number", flat=True)
            .first()
            or 0
        ) + 1

        if not commentary:
            commentary = build_auto_commentary(
                over_number=over_num_before,
                ball_in_over=ball_num_in_over,
                striker_name=striker.name if striker else "Batter",
                bowler_name=bowler.name if bowler else "Bowler",
                runs_off_bat=runs_off_bat,
                extra_type=extra_type,
                extra_runs=extra_runs,
                is_wicket=is_wicket,
                wicket_type=wicket_type,
            )

        ball_event = BallEvent.objects.create(
            match=match,
            innings=innings,
            sequence_number=seq_num,
            idempotency_key=idempotency_key,
            over_number=over_num_before,
            ball_in_over=ball_num_in_over,
            is_legal_delivery=is_legal,
            striker=striker,
            non_striker=non_striker,
            bowler=bowler,
            runs_off_bat=runs_off_bat,
            extra_type=extra_type,
            extra_runs=extra_runs,
            total_runs=total_ball_runs,
            is_wicket=is_wicket,
            wicket_type=wicket_type if is_wicket else "",
            dismissed_player=dismissed_player,
            fielder_name=fielder_name if is_wicket else "",
            strike_rotated=strike_rotated,
            over_completed=over_completed,
            commentary=commentary,
            pre_ball_snapshot=pre_ball_snapshot,
            created_by=actor if (actor and getattr(actor, "is_authenticated", False)) else None,
        )

        match.scoring_mode = Match.SCORING_MODE_BALL_BY_BALL
        match.current_innings_number = innings_number
        if match.status == Match.STATUS_UPCOMING:
            match.status = Match.STATUS_LIVE
        match.version += 1
        match.save()

        record_audit_log(
            actor=actor,
            action="BALL_SCORED",
            module="LIVE_SCORING",
            target_type="BallEvent",
            target_id=ball_event.id,
            description=f"{match.title}: {commentary} -> {innings.runs}/{innings.wickets} ({innings.overs_display})",
        )

        transaction.on_commit(lambda: broadcast_match_update(match, "ball_scored"))
        return match, ball_event

    @staticmethod
    @transaction.atomic
    def undo_last_ball(
        *,
        match_id: int,
        innings_number: int | None = None,
        reason: str = "Undo last ball delivery",
        actor: User | None = None,
    ) -> Match:
        match = Match.objects.select_for_update().get(pk=match_id)
        target_inn_num = innings_number or match.current_innings_number
        innings = MatchInnings.objects.select_for_update().get(
            match=match, innings_number=target_inn_num
        )

        last_ball = (
            innings.ball_events.select_for_update()
            .filter(is_undone=False)
            .order_by("-sequence_number")
            .first()
        )
        if not last_ball:
            raise ScoringError("No active ball delivery found to undo in this innings.")

        snap = last_ball.pre_ball_snapshot or {}
        prev_state = {
            "runs": innings.runs,
            "wickets": innings.wickets,
            "overs": innings.overs_display,
            "undone_ball_seq": last_ball.sequence_number,
        }

        if last_ball.striker_id:
            bp = BattingPerformance.objects.filter(
                innings=innings, player_id=last_ball.striker_id
            ).first()
            if bp:
                if last_ball.extra_type != BallEvent.EXTRA_WIDE and bp.balls_faced > 0:
                    bp.balls_faced = max(0, bp.balls_faced - 1)
                    bp.runs = max(0, bp.runs - last_ball.runs_off_bat)
                    if last_ball.runs_off_bat == 4:
                        bp.fours = max(0, bp.fours - 1)
                    elif last_ball.runs_off_bat == 6:
                        bp.sixes = max(0, bp.sixes - 1)
                bp.save()

        if last_ball.is_wicket and last_ball.dismissed_player_id:
            dp = BattingPerformance.objects.filter(
                innings=innings, player_id=last_ball.dismissed_player_id
            ).first()
            if dp:
                dp.is_out = False
                dp.dismissal_type = BattingPerformance.DISMISSAL_NOT_OUT
                dp.dismissal_text = "not out"
                dp.dismissed_by_bowler = None
                dp.fielder_name = ""
                dp.save()

        if last_ball.bowler_id:
            bw = BowlingPerformance.objects.filter(
                innings=innings, player_id=last_ball.bowler_id
            ).first()
            if bw:
                bowler_runs = last_ball.runs_off_bat
                if last_ball.extra_type in (BallEvent.EXTRA_WIDE, BallEvent.EXTRA_NO_BALL):
                    bowler_runs += last_ball.extra_runs
                bw.runs_conceded = max(0, bw.runs_conceded - bowler_runs)
                if last_ball.extra_type == BallEvent.EXTRA_WIDE:
                    bw.wides = max(0, bw.wides - last_ball.extra_runs)
                elif last_ball.extra_type == BallEvent.EXTRA_NO_BALL:
                    bw.no_balls = max(0, bw.no_balls - 1)
                if last_ball.is_legal_delivery:
                    if bw.balls_in_over == 0 and bw.completed_overs > 0:
                        bw.completed_overs -= 1
                        bw.balls_in_over = 5
                    else:
                        bw.balls_in_over = max(0, bw.balls_in_over - 1)
                if last_ball.is_wicket and bw.wickets > 0:
                    bw.wickets = max(0, bw.wickets - 1)
                bw.save()

        innings.runs = snap.get("runs", max(0, innings.runs - last_ball.total_runs))
        innings.wickets = snap.get("wickets", max(0, innings.wickets - (1 if last_ball.is_wicket else 0)))
        innings.completed_overs = snap.get("completed_overs", innings.completed_overs)
        innings.balls_in_over = snap.get("balls_in_over", innings.balls_in_over)
        innings.extras_wides = snap.get("extras_wides", innings.extras_wides)
        innings.extras_no_balls = snap.get("extras_no_balls", innings.extras_no_balls)
        innings.extras_byes = snap.get("extras_byes", innings.extras_byes)
        innings.extras_leg_byes = snap.get("extras_leg_byes", innings.extras_leg_byes)
        innings.extras_penalty = snap.get("extras_penalty", innings.extras_penalty)
        innings.striker_id = snap.get("striker_id", innings.striker_id)
        innings.non_striker_id = snap.get("non_striker_id", innings.non_striker_id)
        innings.current_bowler_id = snap.get("current_bowler_id", innings.current_bowler_id)
        innings.partnership_runs = snap.get("partnership_runs", 0)
        innings.partnership_balls = snap.get("partnership_balls", 0)
        innings.fall_of_wickets = snap.get("fall_of_wickets", [])
        innings.status = snap.get("status", MatchInnings.STATUS_IN_PROGRESS)
        innings.has_ball_events = innings.ball_events.exclude(pk=last_ball.pk).filter(is_undone=False).exists()
        innings.save()

        last_ball.is_undone = True
        last_ball.undone_at = timezone.now()
        last_ball.undone_by = actor if (actor and getattr(actor, "is_authenticated", False)) else None
        last_ball.save()

        match.version += 1
        match.save()

        new_state = {
            "runs": innings.runs,
            "wickets": innings.wickets,
            "overs": innings.overs_display,
        }

        ScoreCorrection.objects.create(
            match=match,
            innings=innings,
            correction_type="UNDO_BALL",
            previous_state=prev_state,
            new_state=new_state,
            reason=reason,
            reconciled_from_ball_events=True,
            performed_by=actor if (actor and getattr(actor, "is_authenticated", False)) else None,
        )

        record_audit_log(
            actor=actor,
            action="UNDO_LAST_BALL",
            module="LIVE_SCORING",
            target_type="BallEvent",
            target_id=last_ball.id,
            description=f"Undid ball #{last_ball.sequence_number} on {match.title} ({reason})",
            before_state=prev_state,
            after_state=new_state,
        )

        transaction.on_commit(lambda: broadcast_match_update(match, "undo_ball"))
        return match

    @staticmethod
    def detect_winner_contradiction(
        *,
        match: Match,
        winning_team_id: int | None,
        victory_type: str,
    ) -> tuple[bool, str]:
        inn1 = match.innings.filter(innings_number=1).first()
        inn2 = match.innings.filter(innings_number=2).first()
        if not inn1 or not inn2:
            return False, ""

        if inn1.runs == 0 and inn2.runs == 0 and inn1.completed_overs == 0 and inn2.completed_overs == 0:
            return False, ""

        if victory_type in (MatchResult.RESULT_NO_RESULT, MatchResult.RESULT_ABANDONED, MatchResult.RESULT_CUSTOM):
            return False, ""

        if victory_type == MatchResult.RESULT_TIE:
            if inn1.runs != inn2.runs:
                return (
                    True,
                    f"Result selected is Tie, but recorded scores are {inn1.batting_team.short_name} {inn1.runs} vs {inn2.batting_team.short_name} {inn2.runs}.",
                )
            return False, ""

        if winning_team_id:
            if inn1.runs > inn2.runs and winning_team_id != inn1.batting_team_id:
                return (
                    True,
                    f"{inn1.batting_team.name} scored {inn1.runs} which is higher than {inn2.batting_team.name}'s {inn2.runs}, but {inn2.batting_team.name} was selected as winner.",
                )
            if inn2.runs > inn1.runs and winning_team_id != inn2.batting_team_id:
                return (
                    True,
                    f"{inn2.batting_team.name} scored {inn2.runs} which is higher than {inn1.batting_team.name}'s {inn1.runs}, but {inn1.batting_team.name} was selected as winner.",
                )
            if inn1.runs == inn2.runs and (inn1.runs > 0 or inn2.runs > 0):
                return (
                    True,
                    f"Both teams scored {inn1.runs} runs, but a winner was selected without Super Over / Custom Result.",
                )

        return False, ""

    @staticmethod
    @transaction.atomic
    def finalize_match_result(
        *,
        match_id: int,
        winning_team_id: int | None,
        victory_type: str,
        victory_margin: str = "",
        player_of_the_match_id: int | None = None,
        player_of_the_match_name: str = "",
        result_notes: str = "",
        confirm_tournament_champion: bool = False,
        acknowledge_contradiction: bool = False,
        actor: User | None = None,
    ) -> MatchResult:
        match = Match.objects.select_for_update().get(pk=match_id)
        ensure_match_innings(match)

        winning_team = Team.objects.filter(pk=winning_team_id).first() if winning_team_id else None
        runner_up_team = None
        if winning_team:
            runner_up_team = (
                match.team_b if winning_team.id == match.team_a_id else match.team_a
            )

        has_contradiction, contradiction_warning = CricketScoringService.detect_winner_contradiction(
            match=match,
            winning_team_id=winning_team.id if winning_team else None,
            victory_type=victory_type,
        )
        if has_contradiction and not acknowledge_contradiction:
            raise ScoringError(
                f"Score contradiction detected: {contradiction_warning} "
                "Please review the scores or explicitly set 'acknowledge_contradiction=True' to publish."
            )

        if victory_type == MatchResult.RESULT_WON_BY_RUNS and winning_team:
            margin_str = victory_margin or "runs"
            if margin_str.isdigit():
                margin_str = f"{margin_str} runs"
            result_summary = f"{winning_team.name} won by {margin_str}."
        elif victory_type == MatchResult.RESULT_WON_BY_WICKETS and winning_team:
            margin_str = victory_margin or "wickets"
            if margin_str.isdigit():
                margin_str = f"{margin_str} wickets"
            result_summary = f"{winning_team.name} won by {margin_str}."
        elif victory_type == MatchResult.RESULT_TIE:
            result_summary = f"Match tied ({victory_margin})." if victory_margin else "Match tied."
        elif victory_type == MatchResult.RESULT_NO_RESULT:
            result_summary = "Match ended in No Result."
        elif victory_type == MatchResult.RESULT_ABANDONED:
            result_summary = "Match abandoned."
        else:
            if winning_team:
                result_summary = f"{winning_team.name} won ({victory_margin or 'Custom Result'})."
            else:
                result_summary = victory_margin or "Match completed."

        potm_player = (
            Player.objects.filter(pk=player_of_the_match_id).first()
            if player_of_the_match_id
            else None
        )
        potm_display_name = potm_player.name if potm_player else player_of_the_match_name

        existing_result = MatchResult.objects.filter(match=match).first()
        prev_result_snapshot = (
            {
                "winning_team_id": existing_result.winning_team_id,
                "victory_type": existing_result.victory_type,
                "victory_margin": existing_result.victory_margin,
                "result_summary": existing_result.result_summary,
            }
            if existing_result
            else {}
        )

        match_result, created = MatchResult.objects.update_or_create(
            match=match,
            defaults={
                "winning_team": winning_team,
                "runner_up_team": runner_up_team,
                "victory_type": victory_type,
                "victory_margin": victory_margin,
                "result_summary": result_summary,
                "player_of_the_match": potm_player,
                "player_of_the_match_name": potm_display_name,
                "result_notes": result_notes,
                "has_score_contradiction": has_contradiction,
                "contradiction_warning": contradiction_warning,
                "contradiction_acknowledged": acknowledge_contradiction,
                "is_finalized": True,
                "finalized_by": actor if (actor and getattr(actor, "is_authenticated", False)) else None,
                "finalized_at": timezone.now(),
            },
        )

        if not created and prev_result_snapshot:
            ScoreCorrection.objects.create(
                match=match,
                correction_type="RESULT_CORRECTION",
                previous_state=prev_result_snapshot,
                new_state={
                    "winning_team_id": winning_team.id if winning_team else None,
                    "victory_type": victory_type,
                    "victory_margin": victory_margin,
                    "result_summary": result_summary,
                },
                reason=result_notes or "Authorized correction to finalized match result",
                performed_by=actor if (actor and getattr(actor, "is_authenticated", False)) else None,
            )

        match.status = (
            Match.STATUS_ABANDONED
            if victory_type == MatchResult.RESULT_ABANDONED
            else Match.STATUS_COMPLETED
        )
        match.version += 1
        match.save()

        match.innings.filter(status=MatchInnings.STATUS_IN_PROGRESS).update(
            status=MatchInnings.STATUS_COMPLETED
        )

        if potm_display_name:
            MatchAward.objects.update_or_create(
                match=match,
                award_type=MatchAward.AWARD_POTM,
                defaults={
                    "tournament": match.tournament,
                    "player": potm_player,
                    "player_name": potm_display_name,
                    "team": potm_player.team if potm_player else winning_team,
                    "performance_summary": result_notes or result_summary,
                    "is_manual_award": True,
                },
            )

        if match.tournament_id:
            StandingsCalculationService.recalculate_tournament_standings(match.tournament)

        if (match.is_tournament_final or confirm_tournament_champion) and winning_team and runner_up_team:
            tournament_name = match.tournament.name if match.tournament else match.title
            tournament_year = (
                match.tournament.season_year if match.tournament else match.match_date.year
            )
            TournamentWinner.objects.update_or_create(
                tournament=match.tournament,
                tournament_name=tournament_name,
                tournament_year=tournament_year,
                defaults={
                    "winning_team": winning_team,
                    "winning_team_name": winning_team.name,
                    "winning_team_logo": winning_team.logo_url,
                    "runner_up_team": runner_up_team,
                    "runner_up_team_name": runner_up_team.name,
                    "final_match": match,
                    "final_match_summary": result_summary,
                    "player_of_the_tournament": potm_display_name,
                    "prize_amount": match.tournament.prize_details if match.tournament else "",
                    "is_visible": True,
                },
            )
            if match.tournament:
                match.tournament.status = Tournament.STATUS_COMPLETED
                match.tournament.save(update_fields=["status", "updated_at"])

        record_audit_log(
            actor=actor,
            action="MATCH_RESULT_FINALIZED",
            module="WINNER_CONTROL",
            target_type="Match",
            target_id=match.id,
            description=f"Finalized {match.title}: {result_summary}",
            before_state=prev_result_snapshot,
            after_state={"result_summary": result_summary, "winning_team_id": winning_team_id},
        )

        transaction.on_commit(lambda: broadcast_match_update(match, "match_finalized"))
        return match_result


class StandingsCalculationService:
    @staticmethod
    @transaction.atomic
    def recalculate_tournament_standings(tournament: Tournament) -> list[TournamentStanding]:
        team_ids = set(
            TournamentRegistration.objects.filter(
                tournament=tournament, status="APPROVED"
            ).values_list("team_id", flat=True)
        )
        for m in tournament.matches.all():
            team_ids.add(m.team_a_id)
            team_ids.add(m.team_b_id)

        teams = Team.objects.filter(id__in=team_ids)
        reg_group_map = {
            reg.team_id: reg.group
            for reg in TournamentRegistration.objects.filter(tournament=tournament).select_related("group")
        }

        stats: dict[int, dict[str, Any]] = {}
        for team in teams:
            stats[team.id] = {
                "team": team,
                "group": reg_group_map.get(team.id),
                "played": 0,
                "won": 0,
                "lost": 0,
                "tied": 0,
                "no_result": 0,
                "points": 0,
                "runs_scored": 0,
                "balls_faced": 0,
                "runs_conceded": 0,
                "balls_bowled": 0,
            }

        completed_matches = (
            tournament.matches.filter(
                status__in=[Match.STATUS_COMPLETED, Match.STATUS_ABANDONED],
                result__is_finalized=True,
            )
            .select_related("result")
            .prefetch_related("innings")
        )

        for match in completed_matches:
            res = match.result
            t_a = match.team_a_id
            t_b = match.team_b_id
            if t_a not in stats or t_b not in stats:
                continue

            stats[t_a]["played"] += 1
            stats[t_b]["played"] += 1

            if res.victory_type in (MatchResult.RESULT_NO_RESULT, MatchResult.RESULT_ABANDONED):
                stats[t_a]["no_result"] += 1
                stats[t_b]["no_result"] += 1
                stats[t_a]["points"] += tournament.points_for_no_result
                stats[t_b]["points"] += tournament.points_for_no_result
                continue

            if res.victory_type == MatchResult.RESULT_TIE:
                stats[t_a]["tied"] += 1
                stats[t_b]["tied"] += 1
                stats[t_a]["points"] += tournament.points_for_tie
                stats[t_b]["points"] += tournament.points_for_tie
            elif res.winning_team_id == t_a:
                stats[t_a]["won"] += 1
                stats[t_a]["points"] += tournament.points_for_win
                stats[t_b]["lost"] += 1
                stats[t_b]["points"] += tournament.points_for_loss
            elif res.winning_team_id == t_b:
                stats[t_b]["won"] += 1
                stats[t_b]["points"] += tournament.points_for_win
                stats[t_a]["lost"] += 1
                stats[t_a]["points"] += tournament.points_for_loss

            for inn in match.innings.all():
                if inn.runs == 0 and inn.completed_overs == 0 and inn.balls_in_over == 0:
                    continue
                max_balls = (inn.max_overs or match.overs_per_innings) * 6
                if tournament.all_out_uses_full_overs_for_nrr and (
                    inn.wickets >= 10 or inn.status == MatchInnings.STATUS_ALL_OUT
                ):
                    effective_balls = max_balls
                else:
                    effective_balls = inn.total_legal_balls

                if effective_balls <= 0:
                    continue

                bat_id = inn.batting_team_id
                bowl_id = inn.bowling_team_id
                if bat_id in stats:
                    stats[bat_id]["runs_scored"] += inn.runs
                    stats[bat_id]["balls_faced"] += effective_balls
                if bowl_id in stats:
                    stats[bowl_id]["runs_conceded"] += inn.runs
                    stats[bowl_id]["balls_bowled"] += effective_balls

        standings_objects: list[TournamentStanding] = []
        for team_id, row in stats.items():
            for_rate = (
                Decimal(row["runs_scored"] * 6) / Decimal(row["balls_faced"])
                if row["balls_faced"] > 0
                else Decimal("0.000")
            )
            against_rate = (
                Decimal(row["runs_conceded"] * 6) / Decimal(row["balls_bowled"])
                if row["balls_bowled"] > 0
                else Decimal("0.000")
            )
            calc_nrr = (for_rate - against_rate).quantize(
                Decimal("0.001"), rounding=ROUND_HALF_UP
            )

            standing, _ = TournamentStanding.objects.get_or_create(
                tournament=tournament,
                team=row["team"],
                defaults={"group": row["group"]},
            )
            if row["group"] and standing.group_id != row["group"].id:
                standing.group = row["group"]

            standing.calculated_played = row["played"]
            standing.calculated_won = row["won"]
            standing.calculated_lost = row["lost"]
            standing.calculated_tied = row["tied"]
            standing.calculated_no_result = row["no_result"]
            standing.calculated_points = row["points"]
            standing.calculated_nrr = calc_nrr
            standing.runs_scored = row["runs_scored"]
            standing.balls_faced_for_nrr = row["balls_faced"]
            standing.runs_conceded = row["runs_conceded"]
            standing.balls_bowled_for_nrr = row["balls_bowled"]

            active_adj = (
                standing.adjustments.filter(is_active=True).order_by("-created_at").first()
            )
            if active_adj:
                standing.has_manual_adjustment = True
                standing.adjustment_note = active_adj.reason
                standing.played = (
                    active_adj.override_played
                    if active_adj.override_played is not None
                    else standing.calculated_played
                )
                standing.won = (
                    active_adj.override_won
                    if active_adj.override_won is not None
                    else standing.calculated_won
                )
                standing.lost = (
                    active_adj.override_lost
                    if active_adj.override_lost is not None
                    else standing.calculated_lost
                )
                standing.tied = (
                    active_adj.override_tied
                    if active_adj.override_tied is not None
                    else standing.calculated_tied
                )
                standing.no_result = (
                    active_adj.override_no_result
                    if active_adj.override_no_result is not None
                    else standing.calculated_no_result
                )
                base_pts = (
                    active_adj.override_points
                    if active_adj.override_points is not None
                    else standing.calculated_points
                )
                standing.points = base_pts + active_adj.points_delta
                base_nrr = (
                    active_adj.override_nrr
                    if active_adj.override_nrr is not None
                    else standing.calculated_nrr
                )
                standing.net_run_rate = (base_nrr + active_adj.nrr_delta).quantize(
                    Decimal("0.001"), rounding=ROUND_HALF_UP
                )
            else:
                standing.has_manual_adjustment = False
                standing.adjustment_note = ""
                standing.played = standing.calculated_played
                standing.won = standing.calculated_won
                standing.lost = standing.calculated_lost
                standing.tied = standing.calculated_tied
                standing.no_result = standing.calculated_no_result
                standing.points = standing.calculated_points
                standing.net_run_rate = standing.calculated_nrr

            standing.save()
            standings_objects.append(standing)

        standings_objects.sort(
            key=lambda s: (-s.points, -s.net_run_rate, -s.won, s.team.name)
        )
        for idx, standing in enumerate(standings_objects, start=1):
            if standing.rank != idx:
                standing.rank = idx
                standing.save(update_fields=["rank", "updated_at"])

        return standings_objects

    @staticmethod
    @transaction.atomic
    def apply_manual_standing_adjustment(
        *,
        tournament_id: int,
        team_id: int,
        reason: str,
        points_delta: int = 0,
        nrr_delta: Decimal = Decimal("0.000"),
        override_played: int | None = None,
        override_won: int | None = None,
        override_lost: int | None = None,
        override_tied: int | None = None,
        override_no_result: int | None = None,
        override_points: int | None = None,
        override_nrr: Decimal | None = None,
        actor: User | None = None,
    ) -> TournamentStanding:
        if not reason or not reason.strip():
            raise ScoringError("A reason is required for manual points table adjustments.")

        tournament = Tournament.objects.get(pk=tournament_id)
        team = Team.objects.get(pk=team_id)
        standing, _ = TournamentStanding.objects.get_or_create(
            tournament=tournament, team=team
        )

        standing.adjustments.filter(is_active=True).update(is_active=False)
        StandingAdjustment.objects.create(
            standing=standing,
            tournament=tournament,
            team=team,
            points_delta=points_delta,
            nrr_delta=nrr_delta,
            override_played=override_played,
            override_won=override_won,
            override_lost=override_lost,
            override_tied=override_tied,
            override_no_result=override_no_result,
            override_points=override_points,
            override_nrr=override_nrr,
            reason=reason.strip(),
            is_active=True,
            created_by=actor if (actor and getattr(actor, "is_authenticated", False)) else None,
        )

        record_audit_log(
            actor=actor,
            action="STANDING_MANUAL_ADJUSTMENT",
            module="POINTS_TABLE",
            target_type="TournamentStanding",
            target_id=standing.id,
            description=f"Adjusted standing for {team.name} in {tournament.name}: {reason}",
        )

        StandingsCalculationService.recalculate_tournament_standings(tournament)
        standing.refresh_from_db()
        return standing


def bowler_credited_types_for(extra_type: str, default_set: set[str]) -> set[str]:
    if extra_type == BallEvent.EXTRA_WIDE:
        return {BattingPerformance.DISMISSAL_STUMPED, BattingPerformance.DISMISSAL_HIT_WICKET}
    if extra_type == BallEvent.EXTRA_NO_BALL:
        return set()
    return default_set


def format_dismissal_text(*, wicket_type: str, bowler_name: str, fielder_name: str) -> str:
    if wicket_type == BattingPerformance.DISMISSAL_BOWLED:
        return f"b {bowler_name}" if bowler_name else "bowled"
    if wicket_type == BattingPerformance.DISMISSAL_CAUGHT:
        if fielder_name and bowler_name:
            return f"c {fielder_name} b {bowler_name}"
        return f"c & b {bowler_name}" if bowler_name else "caught"
    if wicket_type == BattingPerformance.DISMISSAL_LBW:
        return f"lbw b {bowler_name}" if bowler_name else "lbw"
    if wicket_type == BattingPerformance.DISMISSAL_RUN_OUT:
        return f"run out ({fielder_name})" if fielder_name else "run out"
    if wicket_type == BattingPerformance.DISMISSAL_STUMPED:
        if fielder_name and bowler_name:
            return f"st {fielder_name} b {bowler_name}"
        return "stumped"
    if wicket_type == BattingPerformance.DISMISSAL_HIT_WICKET:
        return f"hit wicket b {bowler_name}" if bowler_name else "hit wicket"
    return "out"


def build_auto_commentary(
    *,
    over_number: int,
    ball_in_over: int,
    striker_name: str,
    bowler_name: str,
    runs_off_bat: int,
    extra_type: str,
    extra_runs: int,
    is_wicket: bool,
    wicket_type: str,
) -> str:
    prefix = f"{over_number}.{ball_in_over} {bowler_name} to {striker_name}:"
    if is_wicket:
        return f"{prefix} WICKET! ({wicket_type or 'OUT'})"
    if extra_type == BallEvent.EXTRA_WIDE:
        return f"{prefix} WIDE ball (+{extra_runs} extras)"
    if extra_type == BallEvent.EXTRA_NO_BALL:
        return f"{prefix} NO BALL! +{extra_runs} extra and {runs_off_bat} off the bat"
    if extra_type in (BallEvent.EXTRA_BYE, BallEvent.EXTRA_LEG_BYE):
        return f"{prefix} {extra_runs} {extra_type.replace('_', ' ').title()}"
    if runs_off_bat == 6:
        return f"{prefix} SIX! Maximum over the boundary rope!"
    if runs_off_bat == 4:
        return f"{prefix} FOUR! Crisp boundary through the infield!"
    if runs_off_bat == 0:
        return f"{prefix} Dot ball, solid line and length."
    return f"{prefix} {runs_off_bat} run{'s' if runs_off_bat > 1 else ''} taken quickly."
