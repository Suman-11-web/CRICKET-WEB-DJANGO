"""
Versioned REST API Endpoints (/api/v1/) for Village Cricket Live.
Supports:
- Full CRUD (Create, Read, Update, Delete) across Tournaments, Teams (with full player roster), Players, Matches, Winners, Gallery, Announcements, News, Sponsors, Website Settings, Navigation, and Admin Users
- Mode A Manual Scoring (with editable Total Overs, decimal overs e.g. 15.2, active Striker/Non-Striker/Bowler stats, and Undo Last Change)
- Mode B Ball-by-Ball Scoring (with Wides, No-Balls, Byes, Leg-Byes, Wickets, and Undo Last Ball)
- One-click Clear All Test Data endpoint (/api/v1/admin/clear-data/)
"""
from __future__ import annotations

import json
from decimal import Decimal
from typing import Any

from django.contrib.auth import authenticate, login, logout
from django.core.management import call_command
from django.core.paginator import Paginator
from django.db import transaction
from django.db.models import Count, Max, Q, Sum
from django.http import HttpRequest, JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .models import (
    AdminRole,
    Announcement,
    AuditLog,
    BallEvent,
    ContactMessage,
    GalleryImage,
    HomepageSection,
    Match,
    MatchAward,
    MatchInnings,
    MatchResult,
    NavigationItem,
    NewsPost,
    Player,
    Sponsor,
    Team,
    TeamMembership,
    Tournament,
    TournamentRegistration,
    TournamentStanding,
    TournamentWinner,
    User,
    WebsiteSettings,
)
from .permissions import (
    check_login_rate_limit,
    issue_user_session_token,
    record_failed_login,
    require_roles,
    reset_login_attempts,
    resolve_authenticated_user,
    user_can_manage_tournament,
    user_can_score_match,
)
from .services import (
    CricketScoringService,
    ScoringError,
    StandingsCalculationService,
    ensure_match_innings,
    parse_overs_string,
    record_audit_log,
    serialize_match_live_payload,
)


def parse_json_body(request: HttpRequest) -> dict[str, Any]:
    if not request.body:
        return {}
    try:
        return json.loads(request.body.decode("utf-8"))
    except Exception:
        return {}


def get_client_ip(request: HttpRequest) -> str:
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "127.0.0.1")


def serialize_settings(s: WebsiteSettings) -> dict[str, Any]:
    return {
        "site_name": s.site_name,
        "site_name_kn": s.site_name_kn,
        "tagline": s.tagline,
        "logo_url": s.logo_url,
        "favicon_url": s.favicon_url,
        "primary_color": s.primary_color,
        "accent_color": s.accent_color,
        "hero_visible": s.hero_visible,
        "hero_title": s.hero_title,
        "hero_title_kn": s.hero_title_kn,
        "hero_subtitle": s.hero_subtitle,
        "hero_subtitle_kn": s.hero_subtitle_kn,
        "hero_background_image": s.hero_background_image,
        "hero_video_url": s.hero_video_url,
        "hero_primary_cta_text": s.hero_primary_cta_text,
        "hero_primary_cta_link": s.hero_primary_cta_link,
        "hero_secondary_cta_text": s.hero_secondary_cta_text,
        "hero_secondary_cta_link": s.hero_secondary_cta_link,
        "upcoming_tournament_banner": s.upcoming_tournament_banner,
        "about_title": s.about_title,
        "about_content": s.about_content,
        "about_mission": s.about_mission,
        "contact_email": s.contact_email,
        "contact_phone": s.contact_phone,
        "contact_whatsapp": s.contact_whatsapp,
        "contact_address": s.contact_address,
        "footer_description": s.footer_description,
        "copyright_text": s.copyright_text,
        "privacy_policy": s.privacy_policy,
        "terms_conditions": s.terms_conditions,
        "social_facebook": s.social_facebook,
        "social_instagram": s.social_instagram,
        "social_youtube": s.social_youtube,
        "social_x": s.social_x,
        "seo_title": s.seo_title,
        "seo_description": s.seo_description,
        "default_theme": s.default_theme,
        "default_language": s.default_language,
        "updated_at": s.updated_at.isoformat() if s.updated_at else None,
    }


def serialize_player(player: Player) -> dict[str, Any]:
    bat_agg = player.batting_performances.aggregate(
        calc_runs=Sum("runs"),
        calc_balls=Sum("balls_faced"),
        calc_fours=Sum("fours"),
        calc_sixes=Sum("sixes"),
        calc_highest=Max("runs"),
        innings_batted=Count("id"),
    )
    bowl_agg = player.bowling_performances.aggregate(
        calc_wickets=Sum("wickets"),
        calc_runs_conceded=Sum("runs_conceded"),
        innings_bowled=Count("id"),
    )

    calc_runs = bat_agg["calc_runs"] or 0
    calc_wickets = bowl_agg["calc_wickets"] or 0
    calc_matches = max(
        bat_agg["innings_batted"] or 0,
        bowl_agg["innings_bowled"] or 0,
    )

    total_runs = calc_runs + (player.manual_runs if player.manual_stats_approved else 0)
    total_wickets = calc_wickets + (player.manual_wickets if player.manual_stats_approved else 0)
    total_matches = calc_matches + (player.manual_matches if player.manual_stats_approved else 0)
    highest_score = max(
        bat_agg["calc_highest"] or 0,
        player.manual_highest_score if player.manual_stats_approved else 0,
    )

    return {
        "id": player.id,
        "name": player.name,
        "slug": player.slug,
        "photo_url": player.photo_url,
        "village": player.village,
        "team_id": player.team_id,
        "team_name": player.team.name if player.team else "Unassigned",
        "team_short_name": player.team.short_name if player.team else "-",
        "team_logo_url": player.team.logo_url if player.team else "",
        "playing_role": player.playing_role,
        "playing_role_display": player.get_playing_role_display(),
        "batting_style": player.batting_style,
        "bowling_style": player.bowling_style,
        "jersey_number": player.jersey_number,
        "is_captain": player.is_captain,
        "bio": player.bio,
        "calculated_stats": {
            "matches": calc_matches,
            "runs": calc_runs,
            "balls_faced": bat_agg["calc_balls"] or 0,
            "fours": bat_agg["calc_fours"] or 0,
            "sixes": bat_agg["calc_sixes"] or 0,
            "highest_score": bat_agg["calc_highest"] or 0,
            "wickets": calc_wickets,
            "runs_conceded": bowl_agg["calc_runs_conceded"] or 0,
        },
        "manual_stats": {
            "approved": player.manual_stats_approved,
            "matches": player.manual_matches,
            "runs": player.manual_runs,
            "highest_score": player.manual_highest_score,
            "wickets": player.manual_wickets,
            "best_bowling": player.manual_best_bowling,
            "award_title": player.manual_award_title,
        },
        "total_runs": total_runs,
        "total_wickets": total_wickets,
        "total_matches": total_matches,
        "highest_score": highest_score,
        "stats_source": (
            "CALCULATED_AND_MANUAL_VERIFIED"
            if player.manual_stats_approved and (player.manual_runs > 0 or player.manual_wickets > 0)
            else "CALCULATED_FROM_MATCH_RECORDS"
        ),
        "is_featured": player.is_featured,
        "is_active": player.is_active,
    }


def serialize_team(team: Team, include_admin_contacts: bool = False) -> dict[str, Any]:
    completed_matches = Match.objects.filter(
        Q(team_a=team) | Q(team_b=team),
        status__in=[Match.STATUS_COMPLETED, Match.STATUS_ABANDONED],
    ).select_related("result")

    played = completed_matches.count()
    wins = 0
    losses = 0
    ties = 0
    no_results = 0

    for m in completed_matches:
        res = getattr(m, "result", None)
        if not res:
            continue
        if res.victory_type in (MatchResult.RESULT_NO_RESULT, MatchResult.RESULT_ABANDONED):
            no_results += 1
        elif res.victory_type == MatchResult.RESULT_TIE:
            ties += 1
        elif res.winning_team_id == team.id:
            wins += 1
        else:
            losses += 1

    active_players_qs = team.players.filter(is_active=True).order_by("id")
    players_brief = [
        {
            "id": p.id,
            "name": p.name,
            "playing_role": p.playing_role,
            "playing_role_display": p.get_playing_role_display(),
            "jersey_number": p.jersey_number,
            "is_captain": p.is_captain,
            "batting_style": p.batting_style,
            "bowling_style": p.bowling_style,
        }
        for p in active_players_qs
    ]

    data = {
        "id": team.id,
        "name": team.name,
        "short_name": team.short_name,
        "slug": team.slug,
        "logo_url": team.logo_url,
        "primary_color": team.primary_color,
        "village": team.village,
        "captain_name": team.captain_name,
        "vice_captain_name": team.vice_captain_name,
        "home_ground": team.home_ground,
        "description": team.description,
        "achievements": team.achievements,
        "status": team.status,
        "is_featured": team.is_featured,
        "matches_played": played,
        "wins": wins,
        "losses": losses,
        "ties": ties,
        "no_results": no_results,
        "players_count": len(players_brief),
        "players": players_brief,
    }
    if include_admin_contacts:
        data["manager_contact_name"] = team.manager_contact_name
        data["manager_contact_phone"] = team.manager_contact_phone
        data["manager_contact_email"] = team.manager_contact_email
    return data


def sync_team_players(team: Team, players_input: Any) -> None:
    """
    Creates or updates all players belonging to `team` from:
    - a list of dicts: [{"id": ..., "name": "Rohit Kumar", "playing_role": "BATTER", "jersey_number": 18, "is_captain": True}, ...]
    - a list of strings: ["Rohit Kumar", "Santosh P", ...]
    - or a newline/comma-separated string of player names
    """
    if not players_input:
        return

    normalized_items: list[dict[str, Any]] = []
    if isinstance(players_input, str):
        raw_lines = [
            part.strip()
            for line in players_input.splitlines()
            for part in line.split(",")
            if part.strip()
        ]
        for idx, pname in enumerate(raw_lines, start=1):
            normalized_items.append(
                {
                    "name": pname,
                    "playing_role": Player.ROLE_ALL_ROUNDER,
                    "jersey_number": idx,
                    "is_captain": idx == 1,
                }
            )
    elif isinstance(players_input, list):
        for idx, item in enumerate(players_input, start=1):
            if isinstance(item, str) and item.strip():
                normalized_items.append(
                    {
                        "name": item.strip(),
                        "playing_role": Player.ROLE_ALL_ROUNDER,
                        "jersey_number": idx,
                        "is_captain": idx == 1,
                    }
                )
            elif isinstance(item, dict) and (item.get("name") or "").strip():
                normalized_items.append(
                    {
                        "id": item.get("id"),
                        "name": item["name"].strip(),
                        "playing_role": item.get("playing_role") or Player.ROLE_ALL_ROUNDER,
                        "jersey_number": item.get("jersey_number", idx),
                        "is_captain": bool(item.get("is_captain", False)),
                        "batting_style": item.get("batting_style") or "Right-hand bat",
                        "bowling_style": item.get("bowling_style") or "Right-arm medium",
                    }
                )

    if not normalized_items:
        return

    captain_name_detected = ""
    for idx, p_data in enumerate(normalized_items, start=1):
        p_id = p_data.get("id")
        p_name = p_data["name"]
        role = p_data.get("playing_role") or Player.ROLE_ALL_ROUNDER
        raw_jersey = p_data.get("jersey_number")
        jersey = int(raw_jersey) if (raw_jersey is not None and str(raw_jersey).isdigit()) else idx
        is_capt = bool(p_data.get("is_captain", False))

        player_obj = None
        if p_id:
            player_obj = Player.objects.filter(pk=p_id, team=team).first()
        if not player_obj:
            player_obj = Player.objects.filter(team=team, name__iexact=p_name).first()

        if player_obj:
            player_obj.name = p_name
            player_obj.playing_role = role
            player_obj.jersey_number = jersey
            player_obj.is_captain = is_capt
            player_obj.village = team.village
            player_obj.is_active = True
            player_obj.save()
        else:
            # Ensure unique constraint (name, team, jersey_number) does not collide
            while Player.objects.filter(name=p_name, team=team, jersey_number=jersey).exists():
                jersey += 1
            player_obj = Player.objects.create(
                name=p_name,
                team=team,
                village=team.village,
                playing_role=role,
                jersey_number=jersey,
                is_captain=is_capt,
                batting_style=p_data.get("batting_style", "Right-hand bat"),
                bowling_style=p_data.get("bowling_style", "Right-arm medium"),
                is_active=True,
            )

        TeamMembership.objects.get_or_create(
            player=player_obj,
            team=team,
            season_year=timezone.localdate().year,
            defaults={
                "jersey_number": player_obj.jersey_number,
                "role_in_team": player_obj.get_playing_role_display(),
                "is_captain": is_capt,
                "is_active": True,
            },
        )
        if is_capt and not captain_name_detected:
            captain_name_detected = p_name

    if captain_name_detected and not team.captain_name:
        team.captain_name = captain_name_detected
        team.save(update_fields=["captain_name", "updated_at"])


def serialize_tournament(t: Tournament) -> dict[str, Any]:
    teams_count = t.registrations.filter(status="APPROVED").count() or t.matches.values("team_a").distinct().count()
    return {
        "id": t.id,
        "name": t.name,
        "slug": t.slug,
        "season_year": t.season_year,
        "description": t.description,
        "poster_url": t.poster_url,
        "banner_url": t.banner_url,
        "organizer_name": t.organizer_name,
        "organizer_contact": t.organizer_contact,
        "village": t.village,
        "ground_name": t.ground_name,
        "start_date": str(t.start_date),
        "end_date": str(t.end_date),
        "match_format": t.match_format,
        "match_format_display": t.get_match_format_display(),
        "overs_per_innings": t.overs_per_innings,
        "registration_status": t.registration_status,
        "status": t.status,
        "status_display": t.get_status_display(),
        "max_teams": t.max_teams,
        "registered_teams_count": teams_count,
        "points_rules": {
            "win": t.points_for_win,
            "tie": t.points_for_tie,
            "no_result": t.points_for_no_result,
            "loss": t.points_for_loss,
            "all_out_uses_full_overs_for_nrr": t.all_out_uses_full_overs_for_nrr,
            "ranking_rule_summary": t.ranking_rule_summary,
        },
        "prize_details": t.prize_details,
        "is_featured": t.is_featured,
    }


def serialize_standing(s: TournamentStanding) -> dict[str, Any]:
    return {
        "id": s.id,
        "tournament_id": s.tournament_id,
        "tournament_name": s.tournament.name,
        "group_name": s.group.name if s.group else "League Stage",
        "rank": s.rank,
        "team": {
            "id": s.team.id,
            "name": s.team.name,
            "short_name": s.team.short_name,
            "village": s.team.village,
            "logo_url": s.team.logo_url,
            "primary_color": s.team.primary_color,
        },
        "played": s.played,
        "won": s.won,
        "lost": s.lost,
        "tied": s.tied,
        "no_result": s.no_result,
        "net_run_rate": float(s.net_run_rate),
        "net_run_rate_display": f"{'+' if s.net_run_rate >= 0 else ''}{s.net_run_rate:.3f}",
        "points": s.points,
        "calculated": {
            "played": s.calculated_played,
            "won": s.calculated_won,
            "lost": s.calculated_lost,
            "tied": s.calculated_tied,
            "no_result": s.calculated_no_result,
            "points": s.calculated_points,
            "nrr": float(s.calculated_nrr),
        },
        "has_manual_adjustment": s.has_manual_adjustment,
        "adjustment_note": s.adjustment_note,
    }


# ==============================================================================
# 1. AUTHENTICATION ENDPOINTS
# ==============================================================================


@csrf_exempt
@require_http_methods(["POST"])
def auth_login_view(request: HttpRequest) -> JsonResponse:
    body = parse_json_body(request)
    username = (body.get("username") or "").strip()
    pass_val = body.get("password") or ""
    ip_addr = get_client_ip(request)

    allowed, attempts = check_login_rate_limit(ip_addr, username)
    if not allowed:
        return JsonResponse(
            {
                "error": "Too many failed login attempts. Please wait 10 minutes before retrying.",
                "code": "RATE_LIMITED",
                "attempts": attempts,
            },
            status=429,
        )

    user = authenticate(request, username=username, password=pass_val)
    if not user or not user.is_active:
        failed_count = record_failed_login(ip_addr, username)
        return JsonResponse(
            {
                "error": "Invalid administrator credentials.",
                "code": "INVALID_CREDENTIALS",
                "failed_attempts": failed_count,
            },
            status=401,
        )

    reset_login_attempts(ip_addr, username)
    login(request, user)
    token = issue_user_session_token(user)
    user.last_activity_at = timezone.now()
    user.save(update_fields=["last_activity_at"])

    record_audit_log(
        actor=user,
        action="ADMIN_LOGIN",
        module="AUTH",
        target_type="User",
        target_id=user.id,
        description=f"Administrator '{user.username}' ({user.effective_role}) signed in.",
        ip_address=ip_addr,
    )

    response = JsonResponse(
        {
            "authenticated": True,
            "token": token,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": user.effective_role,
                "village": user.village,
                "phone": user.phone,
            },
        }
    )
    response.set_cookie(
        "vcl_admin_session",
        token,
        max_age=60 * 60 * 12,
        httponly=True,
        samesite="Lax",
    )
    return response


@csrf_exempt
@require_http_methods(["POST"])
def auth_logout_view(request: HttpRequest) -> JsonResponse:
    user = resolve_authenticated_user(request)
    if user:
        record_audit_log(
            actor=user,
            action="ADMIN_LOGOUT",
            module="AUTH",
            target_type="User",
            target_id=user.id,
            description=f"Administrator '{user.username}' signed out.",
            ip_address=get_client_ip(request),
        )
        user.session_token = ""
        user.save(update_fields=["session_token"])
    logout(request)
    response = JsonResponse({"authenticated": False, "message": "Logged out."})
    response.delete_cookie("vcl_admin_session")
    return response


@require_http_methods(["GET"])
def auth_me_view(request: HttpRequest) -> JsonResponse:
    user = resolve_authenticated_user(request)
    if not user:
        return JsonResponse({"authenticated": False, "user": None}, status=401)
    return JsonResponse(
        {
            "authenticated": True,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": user.effective_role,
                "village": user.village,
                "phone": user.phone,
            },
        }
    )


# ==============================================================================
# 2. PUBLIC HOMEPAGE & CMS ENDPOINTS (Sections A through O)
# ==============================================================================


@require_http_methods(["GET"])
def homepage_data_view(request: HttpRequest) -> JsonResponse:
    settings_obj = WebsiteSettings.get_solo()
    now = timezone.now()

    announcements = [
        {
            "id": a.id,
            "text": a.text,
            "text_kn": a.text_kn,
            "badge_label": a.badge_label,
            "link_url": a.link_url,
            "link_text": a.link_text,
            "start_date": a.start_date.isoformat() if a.start_date else None,
            "expiration_date": a.expiration_date.isoformat() if a.expiration_date else None,
        }
        for a in Announcement.objects.filter(is_visible=True)
        if a.is_currently_active
    ]

    navigation = [
        {
            "id": n.id,
            "label": n.label,
            "label_kn": n.label_kn,
            "slug": n.slug,
            "path": n.path,
            "group_name": n.group_name,
            "display_order": n.display_order,
            "is_visible": n.is_visible,
            "is_optional": n.is_optional,
        }
        for n in NavigationItem.objects.filter(is_visible=True).order_by("display_order")
    ]

    sections = [
        {
            "id": sec.id,
            "section_key": sec.section_key,
            "title": sec.title,
            "title_kn": sec.title_kn,
            "subtitle": sec.subtitle,
            "display_order": sec.display_order,
            "is_visible": sec.is_visible,
            "max_items": sec.max_items,
        }
        for sec in HomepageSection.objects.order_by("display_order")
    ]

    live_matches = [
        serialize_match_live_payload(m)
        for m in Match.objects.filter(
            status__in=[Match.STATUS_LIVE, Match.STATUS_INNINGS_BREAK, Match.STATUS_PAUSED]
        ).order_by("-updated_at")[:6]
    ]

    upcoming_matches = [
        serialize_match_live_payload(m)
        for m in Match.objects.filter(status=Match.STATUS_UPCOMING).order_by(
            "match_date", "start_time"
        )[:6]
    ]

    recent_results = [
        serialize_match_live_payload(m)
        for m in Match.objects.filter(status=Match.STATUS_COMPLETED).order_by(
            "-match_date", "-updated_at"
        )[:6]
    ]

    tournaments = [
        serialize_tournament(t)
        for t in Tournament.objects.exclude(status=Tournament.STATUS_ARCHIVED).order_by(
            "-season_year", "-start_date"
        )[:6]
    ]

    featured_teams = [
        serialize_team(team)
        for team in Team.objects.filter(status=Team.STATUS_ACTIVE).order_by(
            "-is_featured", "name"
        )[:8]
    ]

    active_tournament = (
        Tournament.objects.filter(status=Tournament.STATUS_ONGOING).first()
        or Tournament.objects.first()
    )
    standings_preview = []
    if active_tournament:
        standings_preview = [
            serialize_standing(s)
            for s in TournamentStanding.objects.filter(tournament=active_tournament)
            .select_related("team", "group", "tournament")
            .order_by("rank")[:10]
        ]

    all_players = [
        serialize_player(p)
        for p in Player.objects.filter(is_active=True).select_related("team")
    ]
    most_runs = sorted(all_players, key=lambda x: (-x["total_runs"], -x["highest_score"]))[:5]
    most_wickets = sorted(all_players, key=lambda x: (-x["total_wickets"], x["name"]))[:5]

    awards_leaders = [
        {
            "id": aw.id,
            "award_type": aw.award_type,
            "award_title": aw.get_award_type_display(),
            "player_id": aw.player_id,
            "player_name": aw.player_name,
            "team_name": aw.team.name if aw.team else "",
            "performance_summary": aw.performance_summary,
            "is_manual_award": aw.is_manual_award,
        }
        for aw in MatchAward.objects.select_related("team").order_by("-created_at")[:6]
    ]

    winners = [
        {
            "id": w.id,
            "tournament_id": w.tournament_id,
            "tournament_name": w.tournament_name,
            "tournament_year": w.tournament_year,
            "winning_team_id": w.winning_team_id,
            "winning_team_name": w.winning_team_name,
            "winning_team_logo": w.winning_team_logo,
            "runner_up_team_id": w.runner_up_team_id,
            "runner_up_team_name": w.runner_up_team_name,
            "winner_photograph": w.winner_photograph,
            "trophy_graphic": w.trophy_graphic,
            "final_match_summary": w.final_match_summary,
            "player_of_the_tournament": w.player_of_the_tournament,
            "prize_amount": w.prize_amount,
        }
        for w in TournamentWinner.objects.filter(is_visible=True).order_by(
            "-tournament_year", "display_order"
        )[:6]
    ]

    gallery = [
        {
            "id": g.id,
            "title": g.title,
            "caption": g.caption,
            "category": g.category,
            "category_display": g.get_category_display(),
            "image_url": g.image_url,
            "alt_text": g.alt_text or g.title,
            "tournament_id": g.tournament_id,
            "match_id": g.match_id,
        }
        for g in GalleryImage.objects.filter(is_visible=True).order_by(
            "display_order", "-created_at"
        )[:8]
    ]

    sponsors = [
        {
            "id": sp.id,
            "name": sp.name,
            "logo_url": sp.logo_url,
            "website_url": sp.website_url,
            "tier": sp.tier,
            "tier_display": sp.get_tier_display(),
            "tagline": sp.tagline,
        }
        for sp in Sponsor.objects.filter(is_visible=True).order_by("display_order")
    ]

    news = [
        {
            "id": np.id,
            "title": np.title,
            "title_kn": np.title_kn,
            "slug": np.slug,
            "category": np.category,
            "category_display": np.get_category_display(),
            "summary": np.summary,
            "content": np.content,
            "image_url": np.image_url,
            "is_pinned": np.is_pinned,
            "published_at": np.published_at.isoformat(),
        }
        for np in NewsPost.objects.filter(is_published=True).order_by(
            "-is_pinned", "-published_at"
        )[:6]
    ]

    return JsonResponse(
        {
            "settings": serialize_settings(settings_obj),
            "stats_counters": {
                "tournaments": Tournament.objects.exclude(status=Tournament.STATUS_ARCHIVED).count(),
                "teams": Team.objects.filter(status=Team.STATUS_ACTIVE).count(),
                "players": Player.objects.filter(is_active=True).count(),
                "matches": Match.objects.exclude(status=Match.STATUS_ARCHIVED).count(),
            },
            "navigation": navigation,
            "sections": sections,
            "announcements": announcements,
            "live_matches": live_matches,
            "upcoming_matches": upcoming_matches,
            "recent_results": recent_results,
            "tournaments": tournaments,
            "featured_teams": featured_teams,
            "active_tournament_for_standings": (
                serialize_tournament(active_tournament) if active_tournament else None
            ),
            "standings_preview": standings_preview,
            "top_players": {
                "most_runs": most_runs,
                "most_wickets": most_wickets,
                "awards": awards_leaders,
            },
            "winners": winners,
            "gallery": gallery,
            "sponsors": sponsors,
            "news": news,
            "server_time": now.isoformat(),
        }
    )


# ==============================================================================
# 3. PUBLIC & ADMIN MATCHES, LIVE SCORES & SCORECARDS
# ==============================================================================


@require_http_methods(["GET"])
def live_matches_view(request: HttpRequest) -> JsonResponse:
    tournament_id = request.GET.get("tournament")
    qs = Match.objects.filter(
        status__in=[Match.STATUS_LIVE, Match.STATUS_INNINGS_BREAK, Match.STATUS_PAUSED]
    ).order_by("-updated_at")
    if tournament_id and tournament_id.isdigit():
        qs = qs.filter(tournament_id=int(tournament_id))

    upcoming_fallback = [
        serialize_match_live_payload(m)
        for m in Match.objects.filter(status=Match.STATUS_UPCOMING).order_by(
            "match_date", "start_time"
        )[:4]
    ]
    return JsonResponse(
        {
            "live_matches": [serialize_match_live_payload(m) for m in qs],
            "upcoming_fixtures": upcoming_fallback,
        }
    )


@csrf_exempt
@require_http_methods(["GET", "POST"])
def matches_list_create_view(request: HttpRequest) -> JsonResponse:
    if request.method == "GET":
        qs = Match.objects.exclude(status=Match.STATUS_ARCHIVED).select_related(
            "tournament", "team_a", "team_b", "toss_winner"
        )
        status_filter = request.GET.get("status")
        match_type = request.GET.get("match_type")
        tournament_id = request.GET.get("tournament")
        team_id = request.GET.get("team")
        date_filter = request.GET.get("date")
        include_archived = request.GET.get("include_archived") == "true"

        if include_archived:
            qs = Match.objects.all().select_related("tournament", "team_a", "team_b", "toss_winner")
        if status_filter:
            if status_filter == "LIVE":
                qs = qs.filter(
                    status__in=[Match.STATUS_LIVE, Match.STATUS_INNINGS_BREAK, Match.STATUS_PAUSED]
                )
            else:
                qs = qs.filter(status=status_filter)
        if match_type in (Match.TYPE_FRIENDLY, Match.TYPE_TOURNAMENT):
            qs = qs.filter(match_type=match_type)
        if tournament_id and tournament_id.isdigit():
            qs = qs.filter(tournament_id=int(tournament_id))
        if team_id and team_id.isdigit():
            qs = qs.filter(Q(team_a_id=int(team_id)) | Q(team_b_id=int(team_id)))
        if date_filter:
            qs = qs.filter(match_date=date_filter)

        page_num = int(request.GET.get("page", "1") or 1)
        page_size = min(100, int(request.GET.get("page_size", "50") or 50))
        paginator = Paginator(qs.order_by("-match_date", "-id"), page_size)
        page_obj = paginator.get_page(page_num)

        return JsonResponse(
            {
                "count": paginator.count,
                "num_pages": paginator.num_pages,
                "current_page": page_obj.number,
                "results": [serialize_match_live_payload(m) for m in page_obj.object_list],
            }
        )

    user = resolve_authenticated_user(request)
    if not user or not user.has_role(
        User.ROLE_SUPER_ADMIN, User.ROLE_TOURNAMENT_ADMIN, User.ROLE_SCORER
    ):
        return JsonResponse({"error": "Permission denied to create matches."}, status=403)

    body = parse_json_body(request)
    team_a_id = body.get("team_a_id")
    team_b_id = body.get("team_b_id")
    if not team_a_id or not team_b_id:
        return JsonResponse({"error": "Both Team A and Team B are required."}, status=400)
    if int(team_a_id) == int(team_b_id):
        return JsonResponse({"error": "Team A and Team B must be different teams."}, status=400)

    team_a = Team.objects.filter(pk=team_a_id).first()
    team_b = Team.objects.filter(pk=team_b_id).first()
    if not team_a or not team_b:
        return JsonResponse({"error": "Selected team not found."}, status=404)

    tournament = (
        Tournament.objects.filter(pk=body.get("tournament_id")).first()
        if body.get("tournament_id")
        else None
    )
    match_type = body.get("match_type") or (
        Match.TYPE_TOURNAMENT if tournament else Match.TYPE_FRIENDLY
    )
    overs = max(
        1,
        int(
            body.get("overs_per_innings")
            or (tournament.overs_per_innings if tournament else 10)
        ),
    )
    next_match_num = Match.objects.count() + 1

    match = Match.objects.create(
        match_number=int(body.get("match_number") or next_match_num),
        title=body.get("title") or f"{team_a.name} vs {team_b.name}",
        match_type=match_type,
        tournament=tournament,
        team_a=team_a,
        team_b=team_b,
        venue=body.get("venue") or (tournament.ground_name if tournament else "Village Cricket Ground"),
        match_date=body.get("match_date") or timezone.localdate(),
        start_time=body.get("start_time") or "14:00:00",
        overs_per_innings=overs,
        match_format=body.get("match_format") or f"T{overs} ({overs} Overs)",
        status=body.get("status") or Match.STATUS_UPCOMING,
        scoring_mode=body.get("scoring_mode") or Match.SCORING_MODE_MANUAL,
        toss_winner_id=body.get("toss_winner_id") or None,
        toss_decision=body.get("toss_decision") or "",
        umpire_details=body.get("umpire_details") or "",
        assigned_scorer_id=body.get("assigned_scorer_id") or None,
        match_notes=body.get("match_notes") or "",
        is_tournament_final=bool(body.get("is_tournament_final", False)),
    )
    ensure_match_innings(match)

    # Ensure both teams are registered in the tournament if this is a tournament match
    if tournament:
        TournamentRegistration.objects.get_or_create(
            tournament=tournament, team=team_a, defaults={"status": "APPROVED"}
        )
        TournamentRegistration.objects.get_or_create(
            tournament=tournament, team=team_b, defaults={"status": "APPROVED"}
        )
        StandingsCalculationService.recalculate_tournament_standings(tournament)

    record_audit_log(
        actor=user,
        action="CREATE_MATCH",
        module="MATCHES",
        target_type="Match",
        target_id=match.id,
        description=f"Created match '{match.title}' ({match.match_type}, {overs} overs)",
        ip_address=get_client_ip(request),
    )

    return JsonResponse(serialize_match_live_payload(match), status=201)


@csrf_exempt
@require_http_methods(["GET", "PUT", "PATCH", "DELETE"])
def match_detail_view(request: HttpRequest, match_id: int) -> JsonResponse:
    match = Match.objects.filter(pk=match_id).first()
    if not match:
        return JsonResponse({"error": "Match not found."}, status=404)

    ensure_match_innings(match)

    if request.method == "GET":
        return JsonResponse(serialize_match_live_payload(match))

    user = resolve_authenticated_user(request)
    if not user or not user.has_role(
        User.ROLE_SUPER_ADMIN, User.ROLE_TOURNAMENT_ADMIN, User.ROLE_SCORER
    ):
        return JsonResponse({"error": "Permission denied."}, status=403)

    if request.method == "DELETE":
        if request.GET.get("permanent") == "true":
            match.delete()
            return JsonResponse({"deleted": True, "id": match_id})
        match.status = Match.STATUS_ARCHIVED
        match.save(update_fields=["status", "updated_at"])
        record_audit_log(
            actor=user,
            action="ARCHIVE_MATCH",
            module="MATCHES",
            target_type="Match",
            target_id=match.id,
            description=f"Archived match '{match.title}'",
            ip_address=get_client_ip(request),
        )
        return JsonResponse({"archived": True, "id": match.id})

    body = parse_json_body(request)
    for field in [
        "title",
        "match_type",
        "venue",
        "match_date",
        "start_time",
        "overs_per_innings",
        "match_format",
        "status",
        "scoring_mode",
        "current_innings_number",
        "toss_decision",
        "umpire_details",
        "match_notes",
        "is_tournament_final",
    ]:
        if field in body and body[field] is not None:
            setattr(match, field, body[field])

    if "overs_per_innings" in body and body["overs_per_innings"]:
        new_max = max(1, int(body["overs_per_innings"]))
        match.overs_per_innings = new_max
        match.innings.all().update(max_overs=new_max)

    if "tournament_id" in body:
        match.tournament_id = body["tournament_id"] or None
    if "team_a_id" in body and body["team_a_id"]:
        match.team_a_id = int(body["team_a_id"])
    if "team_b_id" in body and body["team_b_id"]:
        match.team_b_id = int(body["team_b_id"])
    if "toss_winner_id" in body:
        match.toss_winner_id = body["toss_winner_id"] or None

    match.version += 1
    match.save()

    record_audit_log(
        actor=user,
        action="UPDATE_MATCH",
        module="MATCHES",
        target_type="Match",
        target_id=match.id,
        description=f"Updated match '{match.title}' (status: {match.status}, overs: {match.overs_per_innings})",
        ip_address=get_client_ip(request),
    )
    return JsonResponse(serialize_match_live_payload(match))


# ==============================================================================
# 4. ADMIN LIVE SCORE CONTROL (Mode A Manual & Mode B Ball-by-Ball & Winner)
# ==============================================================================


@csrf_exempt
@require_http_methods(["POST"])
def match_manual_score_view(request: HttpRequest, match_id: int) -> JsonResponse:
    user = resolve_authenticated_user(request)
    if not user:
        return JsonResponse({"error": "Authentication required."}, status=401)

    match = Match.objects.filter(pk=match_id).first()
    if not match:
        return JsonResponse({"error": "Match not found."}, status=404)

    if not user_can_score_match(user, match):
        return JsonResponse({"error": "You are not authorized to score this match."}, status=403)

    body = parse_json_body(request)

    if body.get("action") == "undo_last_change":
        try:
            updated_match = CricketScoringService.undo_last_manual_change(
                match_id=match.id,
                innings_number=int(body.get("innings_number") or match.current_innings_number or 1),
                actor=user,
            )
            return JsonResponse(serialize_match_live_payload(updated_match))
        except ScoringError as exc:
            return JsonResponse({"error": str(exc)}, status=400)

    # Support decimal overs string like "15.2" OR completed_overs + balls_in_over
    if "overs" in body and body.get("overs") not in (None, ""):
        comp_overs, balls_in_over = parse_overs_string(body["overs"])
    else:
        comp_overs = int(body.get("completed_overs", 0))
        balls_in_over = int(body.get("balls_in_over", 0))

    max_overs_val = body.get("max_overs") or body.get("overs_per_innings")

    try:
        updated_match = CricketScoringService.update_manual_score(
            match_id=match.id,
            innings_number=int(body.get("innings_number") or match.current_innings_number or 1),
            runs=int(body.get("runs", 0)),
            wickets=int(body.get("wickets", 0)),
            completed_overs=comp_overs,
            balls_in_over=balls_in_over,
            max_overs=int(max_overs_val) if max_overs_val not in (None, "") else None,
            target_runs=(
                int(body["target_runs"])
                if body.get("target_runs") not in (None, "")
                else None
            ),
            striker_id=body.get("striker_id") or None,
            non_striker_id=body.get("non_striker_id") or None,
            bowler_id=body.get("bowler_id") or None,
            striker_runs=body.get("striker_runs"),
            striker_balls=body.get("striker_balls"),
            non_striker_runs=body.get("non_striker_runs"),
            non_striker_balls=body.get("non_striker_balls"),
            bowler_overs=body.get("bowler_overs"),
            bowler_maidens=body.get("bowler_maidens"),
            bowler_runs=body.get("bowler_runs"),
            bowler_wickets=body.get("bowler_wickets"),
            innings_status=body.get("innings_status"),
            match_status=body.get("match_status"),
            match_notes=body.get("match_notes"),
            reconcile_ball_events=bool(body.get("reconcile_ball_events", False)),
            correction_reason=body.get("correction_reason") or "Manual score update",
            actor=user,
        )
        return JsonResponse(serialize_match_live_payload(updated_match))
    except ScoringError as exc:
        return JsonResponse(
            {"error": str(exc), "code": "SCORING_VALIDATION_ERROR"}, status=400
        )


@csrf_exempt
@require_http_methods(["POST"])
def match_ball_event_view(request: HttpRequest, match_id: int) -> JsonResponse:
    user = resolve_authenticated_user(request)
    if not user:
        return JsonResponse({"error": "Authentication required."}, status=401)

    match = Match.objects.filter(pk=match_id).first()
    if not match:
        return JsonResponse({"error": "Match not found."}, status=404)

    if not user_can_score_match(user, match):
        return JsonResponse({"error": "You are not authorized to score this match."}, status=403)

    body = parse_json_body(request)
    idempotency_key = (
        body.get("idempotency_key")
        or request.headers.get("X-Idempotency-Key")
        or None
    )
    try:
        updated_match, ball = CricketScoringService.record_ball_event(
            match_id=match.id,
            innings_number=int(body.get("innings_number") or match.current_innings_number or 1),
            runs_off_bat=int(body.get("runs_off_bat", 0)),
            extra_type=body.get("extra_type") or BallEvent.EXTRA_NONE,
            extra_runs=int(body.get("extra_runs", 0)),
            is_wicket=bool(body.get("is_wicket", False)),
            wicket_type=body.get("wicket_type") or "",
            dismissed_player_id=body.get("dismissed_player_id") or None,
            fielder_name=body.get("fielder_name") or "",
            striker_id=body.get("striker_id") or None,
            non_striker_id=body.get("non_striker_id") or None,
            bowler_id=body.get("bowler_id") or None,
            commentary=body.get("commentary") or "",
            idempotency_key=idempotency_key,
            actor=user,
        )
        payload = serialize_match_live_payload(updated_match)
        payload["last_ball_id"] = ball.id
        return JsonResponse(payload)
    except ScoringError as exc:
        return JsonResponse(
            {"error": str(exc), "code": "SCORING_VALIDATION_ERROR"}, status=400
        )


@csrf_exempt
@require_http_methods(["POST"])
def match_undo_last_ball_view(request: HttpRequest, match_id: int) -> JsonResponse:
    user = resolve_authenticated_user(request)
    if not user:
        return JsonResponse({"error": "Authentication required."}, status=401)

    match = Match.objects.filter(pk=match_id).first()
    if not match:
        return JsonResponse({"error": "Match not found."}, status=404)

    if not user_can_score_match(user, match):
        return JsonResponse({"error": "You are not authorized to undo balls on this match."}, status=403)

    body = parse_json_body(request)
    try:
        updated_match = CricketScoringService.undo_last_ball(
            match_id=match.id,
            innings_number=body.get("innings_number"),
            reason=body.get("reason") or "Undo last ball delivery",
            actor=user,
        )
        return JsonResponse(serialize_match_live_payload(updated_match))
    except ScoringError as exc:
        return JsonResponse({"error": str(exc), "code": "UNDO_ERROR"}, status=400)


@csrf_exempt
@require_http_methods(["POST"])
def match_finalize_winner_view(request: HttpRequest, match_id: int) -> JsonResponse:
    user = resolve_authenticated_user(request)
    if not user or not user.has_role(
        User.ROLE_SUPER_ADMIN, User.ROLE_TOURNAMENT_ADMIN, User.ROLE_SCORER
    ):
        return JsonResponse({"error": "Permission denied to finalize match results."}, status=403)

    body = parse_json_body(request)
    try:
        CricketScoringService.finalize_match_result(
            match_id=match_id,
            winning_team_id=body.get("winning_team_id") or None,
            victory_type=body.get("victory_type") or MatchResult.RESULT_WON_BY_RUNS,
            victory_margin=str(body.get("victory_margin") or ""),
            player_of_the_match_id=body.get("player_of_the_match_id") or None,
            player_of_the_match_name=body.get("player_of_the_match_name") or "",
            result_notes=body.get("result_notes") or "",
            confirm_tournament_champion=bool(body.get("confirm_tournament_champion", False)),
            acknowledge_contradiction=bool(body.get("acknowledge_contradiction", False)),
            actor=user,
        )
        match = Match.objects.get(pk=match_id)
        return JsonResponse(serialize_match_live_payload(match))
    except ScoringError as exc:
        return JsonResponse(
            {"error": str(exc), "code": "CONTRADICTION_OR_VALIDATION_ERROR"}, status=400
        )


# ==============================================================================
# 5. TOURNAMENTS, TEAMS, PLAYERS, STANDINGS, RESULTS, WINNERS
# ==============================================================================


@csrf_exempt
@require_http_methods(["GET", "POST"])
def tournaments_list_create_view(request: HttpRequest) -> JsonResponse:
    if request.method == "GET":
        qs = Tournament.objects.all().order_by("-season_year", "-start_date")
        status_param = request.GET.get("status")
        if status_param:
            qs = qs.filter(status=status_param)
        return JsonResponse({"results": [serialize_tournament(t) for t in qs]})

    user = resolve_authenticated_user(request)
    if not user or not user.has_role(User.ROLE_SUPER_ADMIN, User.ROLE_TOURNAMENT_ADMIN):
        return JsonResponse({"error": "Permission denied."}, status=403)

    body = parse_json_body(request)
    if not body.get("name"):
        return JsonResponse({"error": "Tournament name is required."}, status=400)

    t = Tournament.objects.create(
        name=body["name"],
        season_year=int(body.get("season_year") or 2026),
        description=body.get("description") or "",
        poster_url=body.get("poster_url") or "",
        banner_url=body.get("banner_url") or "",
        organizer_name=body.get("organizer_name") or "Village Sports Committee",
        organizer_contact=body.get("organizer_contact") or "",
        village=body.get("village") or "Hadinaru",
        ground_name=body.get("ground_name") or "Village Cricket Ground",
        start_date=body.get("start_date") or timezone.localdate(),
        end_date=body.get("end_date") or timezone.localdate(),
        match_format=body.get("match_format") or Tournament.FORMAT_T10,
        overs_per_innings=int(body.get("overs_per_innings") or 10),
        registration_status=body.get("registration_status") or "OPEN",
        status=body.get("status") or Tournament.STATUS_ONGOING,
        max_teams=int(body.get("max_teams") or 8),
        points_for_win=int(body.get("points_for_win", 2)),
        points_for_tie=int(body.get("points_for_tie", 1)),
        points_for_no_result=int(body.get("points_for_no_result", 1)),
        points_for_loss=int(body.get("points_for_loss", 0)),
        prize_details=body.get("prize_details") or "",
        is_featured=bool(body.get("is_featured", True)),
    )

    team_ids = body.get("team_ids") or []
    for idx, tid in enumerate(team_ids, start=1):
        team_obj = Team.objects.filter(pk=tid).first()
        if team_obj:
            TournamentRegistration.objects.get_or_create(
                tournament=t,
                team=team_obj,
                defaults={"seed_number": idx, "status": "APPROVED"},
            )
    if team_ids:
        StandingsCalculationService.recalculate_tournament_standings(t)

    record_audit_log(
        actor=user,
        action="CREATE_TOURNAMENT",
        module="TOURNAMENTS",
        target_type="Tournament",
        target_id=t.id,
        description=f"Created tournament '{t.name} ({t.season_year})'",
        ip_address=get_client_ip(request),
    )
    return JsonResponse(serialize_tournament(t), status=201)


@csrf_exempt
@require_http_methods(["GET", "PUT", "PATCH", "DELETE"])
def tournament_detail_view(request: HttpRequest, tournament_id: int) -> JsonResponse:
    t = Tournament.objects.filter(pk=tournament_id).first()
    if not t:
        return JsonResponse({"error": "Tournament not found."}, status=404)

    if request.method == "GET":
        registered_teams = [
            serialize_team(reg.team)
            for reg in t.registrations.filter(status="APPROVED").select_related("team")
        ]
        matches = [
            serialize_match_live_payload(m)
            for m in t.matches.order_by("match_date", "start_time")
        ]
        standings = [
            serialize_standing(s)
            for s in t.standings.select_related("team", "group", "tournament").order_by("rank")
        ]
        winners = [
            {
                "id": w.id,
                "winning_team_name": w.winning_team_name,
                "runner_up_team_name": w.runner_up_team_name,
                "final_match_summary": w.final_match_summary,
                "player_of_the_tournament": w.player_of_the_tournament,
                "tournament_year": w.tournament_year,
            }
            for w in t.winner_records.all()
        ]
        gallery = [
            {
                "id": g.id,
                "title": g.title,
                "caption": g.caption,
                "category": g.category,
                "image_url": g.image_url,
            }
            for g in t.gallery_images.filter(is_visible=True)
        ]
        data = serialize_tournament(t)
        data["teams"] = registered_teams
        data["matches"] = matches
        data["standings"] = standings
        data["winners"] = winners
        data["gallery"] = gallery
        return JsonResponse(data)

    user = resolve_authenticated_user(request)
    if not user or not user_can_manage_tournament(user, t):
        return JsonResponse({"error": "Permission denied."}, status=403)

    if request.method == "DELETE":
        t.delete()
        return JsonResponse({"deleted": True, "id": tournament_id})

    body = parse_json_body(request)
    for field in [
        "name",
        "season_year",
        "description",
        "poster_url",
        "banner_url",
        "organizer_name",
        "organizer_contact",
        "village",
        "ground_name",
        "start_date",
        "end_date",
        "match_format",
        "overs_per_innings",
        "registration_status",
        "status",
        "max_teams",
        "points_for_win",
        "points_for_tie",
        "points_for_no_result",
        "points_for_loss",
        "all_out_uses_full_overs_for_nrr",
        "prize_details",
        "is_featured",
    ]:
        if field in body and body[field] is not None:
            setattr(t, field, body[field])
    t.save()

    if "team_ids" in body and isinstance(body["team_ids"], list):
        for idx, tid in enumerate(body["team_ids"], start=1):
            team_obj = Team.objects.filter(pk=tid).first()
            if team_obj:
                TournamentRegistration.objects.get_or_create(
                    tournament=t,
                    team=team_obj,
                    defaults={"seed_number": idx, "status": "APPROVED"},
                )

    StandingsCalculationService.recalculate_tournament_standings(t)
    return JsonResponse(serialize_tournament(t))


@csrf_exempt
@require_http_methods(["GET", "POST"])
def teams_list_create_view(request: HttpRequest) -> JsonResponse:
    user = resolve_authenticated_user(request)
    is_admin = bool(user)

    if request.method == "GET":
        qs = Team.objects.all().order_by("name")
        village = request.GET.get("village")
        if village:
            qs = qs.filter(village__icontains=village)
        return JsonResponse(
            {"results": [serialize_team(team, include_admin_contacts=is_admin) for team in qs]}
        )

    if not user or not user.has_role(User.ROLE_SUPER_ADMIN, User.ROLE_TOURNAMENT_ADMIN):
        return JsonResponse({"error": "Permission denied."}, status=403)

    body = parse_json_body(request)
    name = (body.get("name") or "").strip()
    if not name:
        return JsonResponse({"error": "Team name is required."}, status=400)
    if Team.objects.filter(name__iexact=name).exists():
        return JsonResponse({"error": f"A team named '{name}' already exists."}, status=400)

    short_name = (body.get("short_name") or name[:3].upper()).strip()
    team = Team.objects.create(
        name=name,
        short_name=short_name,
        logo_url=body.get("logo_url") or "",
        primary_color=body.get("primary_color") or "#10B981",
        village=body.get("village") or "Hadinaru",
        captain_name=body.get("captain_name") or "",
        vice_captain_name=body.get("vice_captain_name") or "",
        home_ground=body.get("home_ground") or "",
        description=body.get("description") or "",
        achievements=body.get("achievements") or "",
        manager_contact_name=body.get("manager_contact_name") or "",
        manager_contact_phone=body.get("manager_contact_phone") or "",
        manager_contact_email=body.get("manager_contact_email") or "",
        status=body.get("status") or Team.STATUS_ACTIVE,
        is_featured=bool(body.get("is_featured", True)),
    )

    # Create all players provided in players_input / players_list
    players_input = body.get("players_input") or body.get("players") or []
    sync_team_players(team, players_input)

    if body.get("tournament_id"):
        t_obj = Tournament.objects.filter(pk=body["tournament_id"]).first()
        if t_obj:
            TournamentRegistration.objects.get_or_create(
                tournament=t_obj, team=team, defaults={"status": "APPROVED"}
            )
            StandingsCalculationService.recalculate_tournament_standings(t_obj)

    record_audit_log(
        actor=user,
        action="CREATE_TEAM",
        module="TEAMS",
        target_type="Team",
        target_id=team.id,
        description=f"Created village team '{team.name}' ({team.village}) with {team.players.count()} players",
        ip_address=get_client_ip(request),
    )
    return JsonResponse(serialize_team(team, include_admin_contacts=True), status=201)


@csrf_exempt
@require_http_methods(["GET", "PUT", "PATCH", "DELETE"])
def team_detail_view(request: HttpRequest, team_id: int) -> JsonResponse:
    team = Team.objects.filter(pk=team_id).first()
    if not team:
        return JsonResponse({"error": "Team not found."}, status=404)

    user = resolve_authenticated_user(request)
    is_admin = bool(user)

    if request.method == "GET":
        data = serialize_team(team, include_admin_contacts=is_admin)
        data["players"] = [serialize_player(p) for p in team.players.filter(is_active=True).order_by("id")]
        data["recent_matches"] = [
            serialize_match_live_payload(m)
            for m in Match.objects.filter(Q(team_a=team) | Q(team_b=team)).order_by("-match_date")[:10]
        ]
        data["tournaments"] = [
            serialize_tournament(reg.tournament)
            for reg in team.tournament_registrations.select_related("tournament")
        ]
        return JsonResponse(data)

    if not user or not user.has_role(User.ROLE_SUPER_ADMIN, User.ROLE_TOURNAMENT_ADMIN):
        return JsonResponse({"error": "Permission denied."}, status=403)

    if request.method == "DELETE":
        if request.GET.get("permanent") == "true":
            team.delete()
            return JsonResponse({"deleted": True, "id": team_id})
        team.status = Team.STATUS_INACTIVE
        team.save(update_fields=["status", "updated_at"])
        return JsonResponse({"deactivated": True, "id": team.id})

    body = parse_json_body(request)
    for field in [
        "name",
        "short_name",
        "logo_url",
        "primary_color",
        "village",
        "captain_name",
        "vice_captain_name",
        "home_ground",
        "description",
        "achievements",
        "manager_contact_name",
        "manager_contact_phone",
        "manager_contact_email",
        "status",
        "is_featured",
    ]:
        if field in body and body[field] is not None:
            setattr(team, field, body[field])
    team.save()

    if "players_input" in body or "players" in body:
        sync_team_players(team, body.get("players_input") or body.get("players"))

    if body.get("tournament_id"):
        t_obj = Tournament.objects.filter(pk=body["tournament_id"]).first()
        if t_obj:
            TournamentRegistration.objects.get_or_create(
                tournament=t_obj, team=team, defaults={"status": "APPROVED"}
            )
            StandingsCalculationService.recalculate_tournament_standings(t_obj)

    return JsonResponse(serialize_team(team, include_admin_contacts=True))


@csrf_exempt
@require_http_methods(["GET", "POST"])
def players_list_create_view(request: HttpRequest) -> JsonResponse:
    if request.method == "GET":
        qs = Player.objects.filter(is_active=True).select_related("team").order_by("name")
        team_id = request.GET.get("team")
        role = request.GET.get("role")
        if team_id and team_id.isdigit():
            qs = qs.filter(team_id=int(team_id))
        if role:
            qs = qs.filter(playing_role=role)
        return JsonResponse({"results": [serialize_player(p) for p in qs]})

    user = resolve_authenticated_user(request)
    if not user or not user.has_role(User.ROLE_SUPER_ADMIN, User.ROLE_TOURNAMENT_ADMIN):
        return JsonResponse({"error": "Permission denied."}, status=403)

    body = parse_json_body(request)
    name = (body.get("name") or "").strip()
    if not name:
        return JsonResponse({"error": "Player name is required."}, status=400)

    team_id = body.get("team_id") or None
    jersey = body.get("jersey_number")
    jersey_int = int(jersey) if (jersey is not None and str(jersey).isdigit()) else None

    if team_id and jersey_int is not None:
        if Player.objects.filter(
            name__iexact=name, team_id=team_id, jersey_number=jersey_int
        ).exists():
            return JsonResponse(
                {"error": "Duplicate player with the same name, team, and jersey number."},
                status=400,
            )

    player = Player.objects.create(
        name=name,
        photo_url=body.get("photo_url") or "",
        village=body.get("village") or "",
        team_id=team_id,
        playing_role=body.get("playing_role") or Player.ROLE_ALL_ROUNDER,
        batting_style=body.get("batting_style") or "Right-hand bat",
        bowling_style=body.get("bowling_style") or "Right-arm medium",
        jersey_number=jersey_int,
        is_captain=bool(body.get("is_captain", False)),
        bio=body.get("bio") or "",
        manual_matches=int(body.get("manual_matches", 0)),
        manual_runs=int(body.get("manual_runs", 0)),
        manual_highest_score=int(body.get("manual_highest_score", 0)),
        manual_wickets=int(body.get("manual_wickets", 0)),
        manual_best_bowling=body.get("manual_best_bowling") or "0/0",
        manual_stats_approved=bool(body.get("manual_stats_approved", False)),
        manual_award_title=body.get("manual_award_title") or "",
        is_featured=bool(body.get("is_featured", False)),
    )

    if player.team_id:
        TeamMembership.objects.get_or_create(
            player=player,
            team_id=player.team_id,
            season_year=timezone.localdate().year,
            defaults={
                "jersey_number": player.jersey_number,
                "role_in_team": player.get_playing_role_display(),
                "is_captain": player.is_captain,
            },
        )

    record_audit_log(
        actor=user,
        action="CREATE_PLAYER",
        module="PLAYERS",
        target_type="Player",
        target_id=player.id,
        description=f"Registered player '{player.name}'",
        ip_address=get_client_ip(request),
    )
    return JsonResponse(serialize_player(player), status=201)


@csrf_exempt
@require_http_methods(["GET", "PUT", "PATCH", "DELETE"])
def player_detail_view(request: HttpRequest, player_id: int) -> JsonResponse:
    player = Player.objects.select_related("team").filter(pk=player_id).first()
    if not player:
        return JsonResponse({"error": "Player not found."}, status=404)

    if request.method == "GET":
        data = serialize_player(player)
        data["membership_history"] = [
            {
                "id": tm.id,
                "team_id": tm.team_id,
                "team_name": tm.team.name,
                "tournament_name": tm.tournament.name if tm.tournament else "Village Season",
                "season_year": tm.season_year,
                "role_in_team": tm.role_in_team,
                "is_active": tm.is_active,
            }
            for tm in player.memberships.select_related("team", "tournament")
        ]
        data["recent_performances"] = [
            {
                "match_id": bp.innings.match_id,
                "match_title": bp.innings.match.title,
                "match_date": str(bp.innings.match.match_date),
                "runs": bp.runs,
                "balls_faced": bp.balls_faced,
                "fours": bp.fours,
                "sixes": bp.sixes,
                "dismissal_text": bp.dismissal_text,
            }
            for bp in player.batting_performances.select_related("innings__match").order_by(
                "-innings__match__match_date"
            )[:10]
        ]
        data["awards"] = [
            {
                "id": aw.id,
                "award_type": aw.get_award_type_display(),
                "performance_summary": aw.performance_summary,
                "match_title": aw.match.title if aw.match else "",
            }
            for aw in player.awards.select_related("match")
        ]
        return JsonResponse(data)

    user = resolve_authenticated_user(request)
    if not user or not user.has_role(User.ROLE_SUPER_ADMIN, User.ROLE_TOURNAMENT_ADMIN):
        return JsonResponse({"error": "Permission denied."}, status=403)

    if request.method == "DELETE":
        player.delete()
        return JsonResponse({"deleted": True, "id": player_id})

    body = parse_json_body(request)
    old_team_id = player.team_id
    for field in [
        "name",
        "photo_url",
        "village",
        "playing_role",
        "batting_style",
        "bowling_style",
        "jersey_number",
        "is_captain",
        "bio",
        "manual_matches",
        "manual_runs",
        "manual_highest_score",
        "manual_wickets",
        "manual_best_bowling",
        "manual_stats_approved",
        "manual_award_title",
        "is_featured",
        "is_active",
    ]:
        if field in body and body[field] is not None:
            setattr(player, field, body[field])
    if "team_id" in body:
        player.team_id = body["team_id"] or None
    player.save()

    if player.team_id and player.team_id != old_team_id:
        TeamMembership.objects.filter(player=player, is_active=True).exclude(
            team_id=player.team_id
        ).update(is_active=False, left_at=timezone.localdate())
        TeamMembership.objects.get_or_create(
            player=player,
            team_id=player.team_id,
            season_year=timezone.localdate().year,
            defaults={
                "jersey_number": player.jersey_number,
                "role_in_team": player.get_playing_role_display(),
                "is_captain": player.is_captain,
                "is_active": True,
            },
        )
    return JsonResponse(serialize_player(player))


@csrf_exempt
@require_http_methods(["GET", "POST"])
def standings_view(request: HttpRequest) -> JsonResponse:
    if request.method == "GET":
        tournament_id = request.GET.get("tournament")
        if tournament_id and tournament_id.isdigit():
            tournament = Tournament.objects.filter(pk=int(tournament_id)).first()
        else:
            tournament = (
                Tournament.objects.filter(status=Tournament.STATUS_ONGOING).first()
                or Tournament.objects.first()
            )
        if not tournament:
            return JsonResponse({"tournament": None, "standings": []})

        standings = TournamentStanding.objects.filter(tournament=tournament).select_related(
            "team", "group", "tournament"
        ).order_by("rank")
        return JsonResponse(
            {
                "tournament": serialize_tournament(tournament),
                "standings": [serialize_standing(s) for s in standings],
            }
        )

    user = resolve_authenticated_user(request)
    if not user or not user.has_role(User.ROLE_SUPER_ADMIN, User.ROLE_TOURNAMENT_ADMIN):
        return JsonResponse({"error": "Permission denied."}, status=403)

    body = parse_json_body(request)
    action = body.get("action", "adjust")
    tournament_id = int(body.get("tournament_id") or 0)
    tournament = Tournament.objects.filter(pk=tournament_id).first()
    if not tournament:
        return JsonResponse({"error": "Tournament not found."}, status=404)

    if action == "recalculate":
        rows = StandingsCalculationService.recalculate_tournament_standings(tournament)
        return JsonResponse(
            {
                "tournament": serialize_tournament(tournament),
                "standings": [serialize_standing(s) for s in rows],
            }
        )

    try:
        standing = StandingsCalculationService.apply_manual_standing_adjustment(
            tournament_id=tournament.id,
            team_id=int(body["team_id"]),
            reason=body.get("reason") or "",
            points_delta=int(body.get("points_delta", 0)),
            nrr_delta=Decimal(str(body.get("nrr_delta", "0.000"))),
            override_played=body.get("override_played"),
            override_won=body.get("override_won"),
            override_lost=body.get("override_lost"),
            override_tied=body.get("override_tied"),
            override_no_result=body.get("override_no_result"),
            override_points=body.get("override_points"),
            override_nrr=(
                Decimal(str(body["override_nrr"]))
                if body.get("override_nrr") not in (None, "")
                else None
            ),
            actor=user,
        )
        return JsonResponse(serialize_standing(standing))
    except ScoringError as exc:
        return JsonResponse({"error": str(exc)}, status=400)


@require_http_methods(["GET"])
def results_list_view(request: HttpRequest) -> JsonResponse:
    qs = Match.objects.filter(
        status__in=[Match.STATUS_COMPLETED, Match.STATUS_ABANDONED]
    ).order_by("-match_date", "-updated_at")
    tournament_id = request.GET.get("tournament")
    if tournament_id and tournament_id.isdigit():
        qs = qs.filter(tournament_id=int(tournament_id))
    return JsonResponse({"results": [serialize_match_live_payload(m) for m in qs]})


@csrf_exempt
@require_http_methods(["GET", "POST", "PUT", "DELETE"])
def winners_list_create_view(request: HttpRequest) -> JsonResponse:
    if request.method == "GET":
        year = request.GET.get("year")
        q = request.GET.get("q", "").strip()
        qs = TournamentWinner.objects.filter(is_visible=True).order_by(
            "-tournament_year", "display_order"
        )
        if year and year.isdigit():
            qs = qs.filter(tournament_year=int(year))
        if q:
            qs = qs.filter(
                Q(tournament_name__icontains=q)
                | Q(winning_team_name__icontains=q)
                | Q(runner_up_team_name__icontains=q)
            )
        return JsonResponse(
            {
                "results": [
                    {
                        "id": w.id,
                        "tournament_id": w.tournament_id,
                        "tournament_name": w.tournament_name,
                        "tournament_year": w.tournament_year,
                        "winning_team_id": w.winning_team_id,
                        "winning_team_name": w.winning_team_name,
                        "winning_team_logo": w.winning_team_logo,
                        "runner_up_team_id": w.runner_up_team_id,
                        "runner_up_team_name": w.runner_up_team_name,
                        "winner_photograph": w.winner_photograph,
                        "trophy_graphic": w.trophy_graphic,
                        "final_match_summary": w.final_match_summary,
                        "player_of_the_tournament": w.player_of_the_tournament,
                        "prize_amount": w.prize_amount,
                    }
                    for w in qs
                ]
            }
        )

    user = resolve_authenticated_user(request)
    if not user or not user.has_role(User.ROLE_SUPER_ADMIN, User.ROLE_TOURNAMENT_ADMIN):
        return JsonResponse({"error": "Permission denied."}, status=403)

    body = parse_json_body(request)
    if request.method == "DELETE":
        TournamentWinner.objects.filter(pk=body.get("id") or request.GET.get("id")).delete()
        return JsonResponse({"deleted": True})

    win_team = Team.objects.filter(pk=body.get("winning_team_id")).first() if body.get("winning_team_id") else None
    run_team = Team.objects.filter(pk=body.get("runner_up_team_id")).first() if body.get("runner_up_team_id") else None

    if request.method == "PUT" and body.get("id"):
        w = TournamentWinner.objects.get(pk=body["id"])
        w.tournament_name = body.get("tournament_name", w.tournament_name)
        w.tournament_year = int(body.get("tournament_year", w.tournament_year))
        if win_team:
            w.winning_team = win_team
            w.winning_team_name = win_team.name
        if run_team:
            w.runner_up_team = run_team
            w.runner_up_team_name = run_team.name
        w.final_match_summary = body.get("final_match_summary", w.final_match_summary)
        w.player_of_the_tournament = body.get("player_of_the_tournament", w.player_of_the_tournament)
        w.winner_photograph = body.get("winner_photograph", w.winner_photograph)
        w.prize_amount = body.get("prize_amount", w.prize_amount)
        w.save()
        return JsonResponse({"id": w.id, "tournament_name": w.tournament_name})

    w = TournamentWinner.objects.create(
        tournament_id=body.get("tournament_id") or None,
        tournament_name=body.get("tournament_name") or "Village Cricket Cup",
        tournament_year=int(body.get("tournament_year") or 2026),
        winning_team=win_team,
        winning_team_name=win_team.name if win_team else (body.get("winning_team_name") or "Champions"),
        winning_team_logo=win_team.logo_url if win_team else (body.get("winning_team_logo") or ""),
        runner_up_team=run_team,
        runner_up_team_name=run_team.name if run_team else (body.get("runner_up_team_name") or "Runners-Up"),
        winner_photograph=body.get("winner_photograph") or "",
        trophy_graphic=body.get("trophy_graphic") or "golden-cup",
        final_match_summary=body.get("final_match_summary") or "",
        player_of_the_tournament=body.get("player_of_the_tournament") or "",
        prize_amount=body.get("prize_amount") or "",
    )
    return JsonResponse({"id": w.id, "tournament_name": w.tournament_name}, status=201)


# ==============================================================================
# 6. GALLERY, NEWS, ANNOUNCEMENTS, SPONSORS, SETTINGS, NAVIGATION & CONTACT
# ==============================================================================


@csrf_exempt
@require_http_methods(["GET", "POST", "PUT", "DELETE"])
def gallery_view(request: HttpRequest) -> JsonResponse:
    if request.method == "GET":
        qs = GalleryImage.objects.filter(is_visible=True).order_by("display_order", "-created_at")
        category = request.GET.get("category")
        tournament_id = request.GET.get("tournament")
        if category:
            qs = qs.filter(category=category)
        if tournament_id and tournament_id.isdigit():
            qs = qs.filter(tournament_id=int(tournament_id))
        return JsonResponse(
            {
                "results": [
                    {
                        "id": g.id,
                        "title": g.title,
                        "caption": g.caption,
                        "category": g.category,
                        "category_display": g.get_category_display(),
                        "image_url": g.image_url,
                        "alt_text": g.alt_text or g.title,
                        "tournament_id": g.tournament_id,
                        "match_id": g.match_id,
                        "display_order": g.display_order,
                    }
                    for g in qs
                ]
            }
        )

    user = resolve_authenticated_user(request)
    if not user or not user.has_role(
        User.ROLE_SUPER_ADMIN, User.ROLE_TOURNAMENT_ADMIN, User.ROLE_CONTENT_EDITOR
    ):
        return JsonResponse({"error": "Permission denied."}, status=403)

    body = parse_json_body(request)
    if request.method == "DELETE":
        img_id = body.get("id") or request.GET.get("id")
        GalleryImage.objects.filter(pk=img_id).delete()
        return JsonResponse({"deleted": True})

    if request.method == "PUT" and body.get("id"):
        g = GalleryImage.objects.get(pk=body["id"])
        for f in ["title", "caption", "category", "image_url", "display_order", "is_visible"]:
            if f in body:
                setattr(g, f, body[f])
        g.save()
        return JsonResponse({"id": g.id, "title": g.title})

    g = GalleryImage.objects.create(
        title=body.get("title") or "Match Moment",
        caption=body.get("caption") or "",
        category=body.get("category") or GalleryImage.CATEGORY_MATCH,
        image_url=body.get("image_url") or "",
        alt_text=body.get("alt_text") or body.get("title") or "Village Cricket Photo",
        tournament_id=body.get("tournament_id") or None,
        match_id=body.get("match_id") or None,
        display_order=int(body.get("display_order") or 1),
        is_visible=bool(body.get("is_visible", True)),
    )
    return JsonResponse({"id": g.id, "title": g.title}, status=201)


@csrf_exempt
@require_http_methods(["GET", "POST", "PUT", "DELETE"])
def announcements_and_news_view(request: HttpRequest) -> JsonResponse:
    if request.method == "GET":
        announcements = [
            {
                "id": a.id,
                "text": a.text,
                "text_kn": a.text_kn,
                "badge_label": a.badge_label,
                "link_url": a.link_url,
                "link_text": a.link_text,
                "is_visible": a.is_visible,
                "start_date": a.start_date.isoformat() if a.start_date else None,
                "expiration_date": a.expiration_date.isoformat() if a.expiration_date else None,
            }
            for a in Announcement.objects.all()
        ]
        news = [
            {
                "id": np.id,
                "title": np.title,
                "title_kn": np.title_kn,
                "slug": np.slug,
                "category": np.category,
                "category_display": np.get_category_display(),
                "summary": np.summary,
                "content": np.content,
                "image_url": np.image_url,
                "is_pinned": np.is_pinned,
                "is_published": np.is_published,
                "published_at": np.published_at.isoformat(),
            }
            for np in NewsPost.objects.all()
        ]
        return JsonResponse({"announcements": announcements, "news": news})

    user = resolve_authenticated_user(request)
    if not user or not user.has_role(
        User.ROLE_SUPER_ADMIN, User.ROLE_TOURNAMENT_ADMIN, User.ROLE_CONTENT_EDITOR
    ):
        return JsonResponse({"error": "Permission denied."}, status=403)

    body = parse_json_body(request)
    item_type = body.get("item_type") or request.GET.get("item_type") or "news"

    if request.method == "DELETE":
        target_id = body.get("id") or request.GET.get("id")
        if item_type == "announcement":
            Announcement.objects.filter(pk=target_id).delete()
        else:
            NewsPost.objects.filter(pk=target_id).delete()
        return JsonResponse({"deleted": True})

    if item_type == "announcement":
        if body.get("id"):
            ann = Announcement.objects.get(pk=body["id"])
            ann.text = body.get("text", ann.text)
            ann.text_kn = body.get("text_kn", ann.text_kn)
            ann.badge_label = body.get("badge_label", ann.badge_label)
            ann.link_url = body.get("link_url", ann.link_url)
            ann.link_text = body.get("link_text", ann.link_text)
            ann.is_visible = bool(body.get("is_visible", ann.is_visible))
            ann.save()
        else:
            ann = Announcement.objects.create(
                text=body.get("text") or "Tournament Announcement",
                text_kn=body.get("text_kn") or "",
                badge_label=body.get("badge_label") or "REGISTER NOW",
                link_url=body.get("link_url") or "/tournaments",
                link_text=body.get("link_text") or "Register Now",
                is_visible=bool(body.get("is_visible", True)),
            )
        return JsonResponse({"id": ann.id, "text": ann.text}, status=201)

    if body.get("id"):
        np = NewsPost.objects.get(pk=body["id"])
        for f in ["title", "title_kn", "category", "summary", "content", "image_url", "is_pinned", "is_published"]:
            if f in body:
                setattr(np, f, body[f])
        np.save()
        return JsonResponse({"id": np.id, "title": np.title})

    np = NewsPost.objects.create(
        title=body.get("title") or "Organizer Update",
        title_kn=body.get("title_kn") or "",
        category=body.get("category") or NewsPost.CATEGORY_ANNOUNCEMENT,
        summary=body.get("summary") or (body.get("content", "")[:160]),
        content=body.get("content") or "",
        image_url=body.get("image_url") or "",
        tournament_id=body.get("tournament_id") or None,
        is_pinned=bool(body.get("is_pinned", False)),
        is_published=bool(body.get("is_published", True)),
        created_by=user,
    )
    return JsonResponse({"id": np.id, "title": np.title}, status=201)


@csrf_exempt
@require_http_methods(["GET", "POST", "PUT", "DELETE"])
def sponsors_view(request: HttpRequest) -> JsonResponse:
    if request.method == "GET":
        return JsonResponse(
            {
                "results": [
                    {
                        "id": sp.id,
                        "name": sp.name,
                        "logo_url": sp.logo_url,
                        "website_url": sp.website_url,
                        "tier": sp.tier,
                        "tier_display": sp.get_tier_display(),
                        "tagline": sp.tagline,
                        "display_order": sp.display_order,
                        "is_visible": sp.is_visible,
                    }
                    for sp in Sponsor.objects.all().order_by("display_order")
                ]
            }
        )

    user = resolve_authenticated_user(request)
    if not user or not user.has_role(
        User.ROLE_SUPER_ADMIN, User.ROLE_TOURNAMENT_ADMIN, User.ROLE_CONTENT_EDITOR
    ):
        return JsonResponse({"error": "Permission denied."}, status=403)

    body = parse_json_body(request)
    if request.method == "DELETE":
        Sponsor.objects.filter(pk=body.get("id") or request.GET.get("id")).delete()
        return JsonResponse({"deleted": True})

    if request.method == "PUT" and body.get("id"):
        sp = Sponsor.objects.get(pk=body["id"])
        for f in ["name", "logo_url", "website_url", "tier", "tagline", "display_order", "is_visible"]:
            if f in body:
                setattr(sp, f, body[f])
        sp.save()
        return JsonResponse({"id": sp.id, "name": sp.name})

    sp = Sponsor.objects.create(
        name=body.get("name") or "Sponsor",
        logo_url=body.get("logo_url") or "",
        website_url=body.get("website_url") or "",
        tier=body.get("tier") or Sponsor.TIER_GOLD,
        tagline=body.get("tagline") or "",
        display_order=int(body.get("display_order") or 1),
        is_visible=bool(body.get("is_visible", True)),
    )
    return JsonResponse({"id": sp.id, "name": sp.name}, status=201)


@csrf_exempt
@require_http_methods(["GET", "PUT", "PATCH", "POST"])
def website_settings_view(request: HttpRequest) -> JsonResponse:
    settings_obj = WebsiteSettings.get_solo()
    if request.method == "GET":
        return JsonResponse(serialize_settings(settings_obj))

    user = resolve_authenticated_user(request)
    if not user or not user.has_role(User.ROLE_SUPER_ADMIN, User.ROLE_CONTENT_EDITOR):
        return JsonResponse({"error": "Permission denied to modify website settings."}, status=403)

    body = parse_json_body(request)
    editable_fields = [
        "site_name",
        "site_name_kn",
        "tagline",
        "logo_url",
        "favicon_url",
        "primary_color",
        "accent_color",
        "hero_visible",
        "hero_title",
        "hero_title_kn",
        "hero_subtitle",
        "hero_subtitle_kn",
        "hero_background_image",
        "hero_video_url",
        "hero_primary_cta_text",
        "hero_primary_cta_link",
        "hero_secondary_cta_text",
        "hero_secondary_cta_link",
        "upcoming_tournament_banner",
        "about_title",
        "about_content",
        "about_mission",
        "contact_email",
        "contact_phone",
        "contact_whatsapp",
        "contact_address",
        "footer_description",
        "copyright_text",
        "privacy_policy",
        "terms_conditions",
        "social_facebook",
        "social_instagram",
        "social_youtube",
        "social_x",
        "seo_title",
        "seo_description",
        "default_theme",
        "default_language",
    ]
    for field in editable_fields:
        if field in body and body[field] is not None:
            setattr(settings_obj, field, body[field])
    settings_obj.save()

    record_audit_log(
        actor=user,
        action="UPDATE_WEBSITE_SETTINGS",
        module="CMS_SETTINGS",
        target_type="WebsiteSettings",
        target_id=1,
        description=f"Updated website CMS settings (site_name: {settings_obj.site_name})",
        ip_address=get_client_ip(request),
    )
    return JsonResponse(serialize_settings(settings_obj))


@csrf_exempt
@require_http_methods(["GET", "PUT", "POST"])
def navigation_and_sections_view(request: HttpRequest) -> JsonResponse:
    if request.method == "GET":
        return JsonResponse(
            {
                "navigation": [
                    {
                        "id": n.id,
                        "label": n.label,
                        "label_kn": n.label_kn,
                        "slug": n.slug,
                        "path": n.path,
                        "group_name": n.group_name,
                        "display_order": n.display_order,
                        "is_visible": n.is_visible,
                        "is_optional": n.is_optional,
                    }
                    for n in NavigationItem.objects.order_by("display_order")
                ],
                "sections": [
                    {
                        "id": s.id,
                        "section_key": s.section_key,
                        "title": s.title,
                        "title_kn": s.title_kn,
                        "subtitle": s.subtitle,
                        "display_order": s.display_order,
                        "is_visible": s.is_visible,
                        "max_items": s.max_items,
                    }
                    for s in HomepageSection.objects.order_by("display_order")
                ],
            }
        )

    user = resolve_authenticated_user(request)
    if not user or not user.has_role(User.ROLE_SUPER_ADMIN, User.ROLE_CONTENT_EDITOR):
        return JsonResponse({"error": "Permission denied."}, status=403)

    body = parse_json_body(request)
    for nav_item in body.get("navigation", []):
        NavigationItem.objects.filter(pk=nav_item.get("id")).update(
            label=nav_item.get("label"),
            label_kn=nav_item.get("label_kn", ""),
            display_order=int(nav_item.get("display_order", 1)),
            is_visible=bool(nav_item.get("is_visible", True)),
        )
    for sec_item in body.get("sections", []):
        HomepageSection.objects.filter(pk=sec_item.get("id")).update(
            title=sec_item.get("title"),
            subtitle=sec_item.get("subtitle", ""),
            display_order=int(sec_item.get("display_order", 1)),
            is_visible=bool(sec_item.get("is_visible", True)),
        )

    record_audit_log(
        actor=user,
        action="UPDATE_NAV_OR_SECTIONS",
        module="CMS_NAVIGATION",
        target_type="NavigationAndSections",
        target_id="all",
        description="Updated navigation visibility/labels or homepage section ordering",
        ip_address=get_client_ip(request),
    )
    return navigation_and_sections_view(request)


@csrf_exempt
@require_http_methods(["GET", "POST", "PATCH", "DELETE"])
def contact_messages_view(request: HttpRequest) -> JsonResponse:
    if request.method == "POST":
        body = parse_json_body(request)
        name = (body.get("name") or "").strip()
        email = (body.get("email") or "").strip()
        subject = (body.get("subject") or "").strip()
        message = (body.get("message") or "").strip()
        honeypot = (body.get("honeypot") or body.get("website") or "").strip()

        if not name or len(name) < 2:
            return JsonResponse({"error": "Please enter your full name."}, status=400)
        if not email or "@" not in email or "." not in email.split("@")[-1]:
            return JsonResponse({"error": "Please provide a valid email address."}, status=400)
        if not subject or len(subject) < 3:
            return JsonResponse({"error": "Please enter a clear subject."}, status=400)
        if not message or len(message) < 10:
            return JsonResponse(
                {"error": "Message must be at least 10 characters long."}, status=400
            )

        status_val = ContactMessage.STATUS_SPAM if honeypot else ContactMessage.STATUS_NEW
        msg = ContactMessage.objects.create(
            name=name,
            email=email,
            phone=(body.get("phone") or "").strip(),
            village=(body.get("village") or "").strip(),
            subject=subject,
            message=message,
            honeypot=honeypot,
            ip_address=get_client_ip(request),
            status=status_val,
        )
        return JsonResponse(
            {
                "submitted": True,
                "id": msg.id,
                "message": "Thank you! Your message has been sent to the tournament organizing committee.",
            },
            status=201,
        )

    user = resolve_authenticated_user(request)
    if not user:
        return JsonResponse({"error": "Authentication required."}, status=401)

    if request.method == "DELETE":
        body = parse_json_body(request)
        ContactMessage.objects.filter(pk=body.get("id") or request.GET.get("id")).delete()
        return JsonResponse({"deleted": True})

    if request.method == "PATCH":
        body = parse_json_body(request)
        msg = ContactMessage.objects.filter(pk=body.get("id")).first()
        if not msg:
            return JsonResponse({"error": "Message not found."}, status=404)
        if "status" in body:
            msg.status = body["status"]
        if "admin_reply_notes" in body:
            msg.admin_reply_notes = body["admin_reply_notes"]
        msg.handled_by = user
        msg.save()
        return JsonResponse({"updated": True, "id": msg.id, "status": msg.status})

    messages_qs = ContactMessage.objects.exclude(status=ContactMessage.STATUS_SPAM).order_by(
        "-created_at"
    )[:100]
    return JsonResponse(
        {
            "results": [
                {
                    "id": m.id,
                    "name": m.name,
                    "email": m.email,
                    "phone": m.phone,
                    "village": m.village,
                    "subject": m.subject,
                    "message": m.message,
                    "status": m.status,
                    "admin_reply_notes": m.admin_reply_notes,
                    "created_at": m.created_at.isoformat(),
                }
                for m in messages_qs
            ]
        }
    )


# ==============================================================================
# 7. PROTECTED ADMIN DASHBOARD OVERVIEW, USERS/ROLES, AUDIT LOGS, CLEAR & BACKUP
# ==============================================================================


@require_roles(
    User.ROLE_SUPER_ADMIN,
    User.ROLE_TOURNAMENT_ADMIN,
    User.ROLE_SCORER,
    User.ROLE_CONTENT_EDITOR,
)
@require_http_methods(["GET"])
def admin_dashboard_overview_view(request: HttpRequest) -> JsonResponse:
    total_tournaments = Tournament.objects.exclude(status=Tournament.STATUS_ARCHIVED).count()
    active_tournaments = Tournament.objects.filter(status=Tournament.STATUS_ONGOING).count()
    total_teams = Team.objects.filter(status=Team.STATUS_ACTIVE).count()
    total_players = Player.objects.filter(is_active=True).count()
    total_matches = Match.objects.exclude(status=Match.STATUS_ARCHIVED).count()
    live_matches_count = Match.objects.filter(
        status__in=[Match.STATUS_LIVE, Match.STATUS_INNINGS_BREAK, Match.STATUS_PAUSED]
    ).count()
    upcoming_matches_count = Match.objects.filter(status=Match.STATUS_UPCOMING).count()
    completed_matches_count = Match.objects.filter(status=Match.STATUS_COMPLETED).count()
    cancelled_matches_count = Match.objects.filter(
        status__in=[Match.STATUS_CANCELLED, Match.STATUS_ABANDONED]
    ).count()
    unread_messages_count = ContactMessage.objects.filter(status=ContactMessage.STATUS_NEW).count()

    recent_results = [
        serialize_match_live_payload(m)
        for m in Match.objects.filter(status=Match.STATUS_COMPLETED).order_by("-updated_at")[:5]
    ]
    latest_activities = [
        {
            "id": log.id,
            "actor_name": log.actor_name,
            "actor_role": log.actor_role,
            "action": log.action,
            "module": log.module,
            "description": log.description,
            "created_at": log.created_at.isoformat(),
        }
        for log in AuditLog.objects.all()[:15]
    ]

    top_run_teams = []
    for team in Team.objects.filter(status=Team.STATUS_ACTIVE)[:8]:
        runs_sum = (
            MatchInnings.objects.filter(batting_team=team).aggregate(total=Sum("runs"))["total"]
            or 0
        )
        top_run_teams.append(
            {"team": team.short_name, "name": team.name, "runs": runs_sum}
        )

    return JsonResponse(
        {
            "metrics": {
                "total_tournaments": total_tournaments,
                "active_tournaments": active_tournaments,
                "total_teams": total_teams,
                "total_players": total_players,
                "total_matches": total_matches,
                "live_matches": live_matches_count,
                "upcoming_matches": upcoming_matches_count,
                "completed_matches": completed_matches_count,
                "cancelled_matches": cancelled_matches_count,
                "unread_messages": unread_messages_count,
            },
            "recent_results": recent_results,
            "latest_activities": latest_activities,
            "analytics": {
                "team_runs_chart": top_run_teams,
            },
        }
    )


@csrf_exempt
@require_roles(User.ROLE_SUPER_ADMIN)
@require_http_methods(["POST"])
def admin_clear_all_data_view(request: HttpRequest) -> JsonResponse:
    """Wipes all test/match/team/tournament data while preserving admin accounts & settings."""
    call_command("clear_cricket_data")
    record_audit_log(
        actor=request.user,
        action="CLEAR_ALL_DATA",
        module="BACKUP_MAINTENANCE",
        target_type="System",
        target_id="all",
        description="Cleared all cricket matches, teams, players, tournaments, and test data",
        ip_address=get_client_ip(request),
    )
    return JsonResponse(
        {
            "cleared": True,
            "message": "All test data deleted. Ready to create your own teams, tournaments, and matches!",
        }
    )


@csrf_exempt
@require_roles(User.ROLE_SUPER_ADMIN)
@require_http_methods(["GET", "POST", "PATCH", "DELETE"])
def admin_users_roles_view(request: HttpRequest) -> JsonResponse:
    if request.method == "GET":
        users = User.objects.all().order_by("username")
        roles = AdminRole.objects.all()
        return JsonResponse(
            {
                "users": [
                    {
                        "id": u.id,
                        "username": u.username,
                        "email": u.email,
                        "first_name": u.first_name,
                        "last_name": u.last_name,
                        "role": u.effective_role,
                        "village": u.village,
                        "phone": u.phone,
                        "is_active": u.is_active,
                        "last_activity_at": (
                            u.last_activity_at.isoformat() if u.last_activity_at else None
                        ),
                    }
                    for u in users
                ],
                "roles": [
                    {
                        "id": r.id,
                        "code": r.code,
                        "name": r.name,
                        "description": r.description,
                    }
                    for r in roles
                ],
            }
        )

    body = parse_json_body(request)
    if request.method == "DELETE":
        target_id = body.get("id") or request.GET.get("id")
        User.objects.filter(pk=target_id).exclude(pk=request.user.id).delete()
        return JsonResponse({"deleted": True})

    if request.method == "POST":
        username = (body.get("username") or "").strip()
        pass_val = body.get("password") or "Cricket@2026"
        role_code = body.get("role_code") or User.ROLE_SCORER
        if not username:
            return JsonResponse({"error": "Username is required."}, status=400)
        if User.objects.filter(username__iexact=username).exists():
            return JsonResponse({"error": "Username already exists."}, status=400)

        role_obj = AdminRole.objects.filter(code=role_code).first()
        u = User.objects.create_user(
            username=username,
            email=body.get("email") or f"{username}@villagecricketlive.in",
            password=pass_val,
            first_name=body.get("first_name") or "",
            last_name=body.get("last_name") or "",
            role_code=role_code,
            admin_role=role_obj,
            village=body.get("village") or "",
            phone=body.get("phone") or "",
            is_staff=True,
        )
        record_audit_log(
            actor=request.user,
            action="CREATE_ADMIN_USER",
            module="USERS_ROLES",
            target_type="User",
            target_id=u.id,
            description=f"Created admin user '{u.username}' with role {u.effective_role}",
            ip_address=get_client_ip(request),
        )
        return JsonResponse({"id": u.id, "username": u.username, "role": u.effective_role}, status=201)

    target_user = User.objects.filter(pk=body.get("id")).first()
    if not target_user:
        return JsonResponse({"error": "User not found."}, status=404)
    if "role_code" in body:
        target_user.role_code = body["role_code"]
        target_user.admin_role = AdminRole.objects.filter(code=body["role_code"]).first()
    if "is_active" in body:
        target_user.is_active = bool(body["is_active"])
    target_user.save()
    return JsonResponse({"id": target_user.id, "role": target_user.effective_role})


@require_roles(
    User.ROLE_SUPER_ADMIN,
    User.ROLE_TOURNAMENT_ADMIN,
    User.ROLE_SCORER,
    User.ROLE_CONTENT_EDITOR,
)
@require_http_methods(["GET"])
def admin_audit_logs_view(request: HttpRequest) -> JsonResponse:
    module_filter = request.GET.get("module")
    qs = AuditLog.objects.all()
    if module_filter:
        qs = qs.filter(module=module_filter)
    return JsonResponse(
        {
            "results": [
                {
                    "id": log.id,
                    "actor_name": log.actor_name,
                    "actor_role": log.actor_role,
                    "action": log.action,
                    "module": log.module,
                    "target_type": log.target_type,
                    "target_id": log.target_id,
                    "description": log.description,
                    "before_state": log.before_state,
                    "after_state": log.after_state,
                    "ip_address": log.ip_address,
                    "created_at": log.created_at.isoformat(),
                }
                for log in qs[:100]
            ]
        }
    )


@require_roles(User.ROLE_SUPER_ADMIN)
@require_http_methods(["GET"])
def admin_backup_export_view(request: HttpRequest) -> JsonResponse:
    record_audit_log(
        actor=request.user,
        action="DATABASE_BACKUP_EXPORT",
        module="BACKUP_MAINTENANCE",
        target_type="System",
        target_id="snapshot",
        description="Generated full JSON backup snapshot from Admin Dashboard",
        ip_address=get_client_ip(request),
    )
    return JsonResponse(
        {
            "backup_generated_at": timezone.now().isoformat(),
            "platform": "Village Cricket Live",
            "version": "1.0.0",
            "counts": {
                "tournaments": Tournament.objects.count(),
                "teams": Team.objects.count(),
                "players": Player.objects.count(),
                "matches": Match.objects.count(),
                "ball_events": BallEvent.objects.count(),
                "audit_logs": AuditLog.objects.count(),
            },
            "settings": serialize_settings(WebsiteSettings.get_solo()),
            "tournaments": [serialize_tournament(t) for t in Tournament.objects.all()],
            "teams": [serialize_team(team, include_admin_contacts=True) for team in Team.objects.all()],
            "matches": [serialize_match_live_payload(m) for m in Match.objects.all()],
        }
    )


@require_http_methods(["GET"])
def openapi_schema_view(request: HttpRequest) -> JsonResponse:
    schema = {
        "openapi": "3.0.3",
        "info": {
            "title": "Village Cricket Live REST & WebSocket API",
            "version": "1.0.0",
            "description": "Official API for Village Cricket Live.",
        },
        "servers": [{"url": "/api/v1"}],
        "paths": {
            "/auth/login/": {"post": {"summary": "Authenticate admin/scorer user"}},
            "/homepage/": {"get": {"summary": "Retrieve complete homepage data"}},
            "/matches/": {"get": {"summary": "List matches"}, "post": {"summary": "Create match"}},
            "/teams/": {"get": {"summary": "List teams"}, "post": {"summary": "Create team with players"}},
        },
    }
    return JsonResponse(schema)
