"""
Versioned URL routes (/api/v1/) for Village Cricket Live.
"""
from django.urls import path
from . import views

urlpatterns = [
    # 1. Authentication
    path("auth/login/", views.auth_login_view, name="api_auth_login"),
    path("auth/logout/", views.auth_logout_view, name="api_auth_logout"),
    path("auth/me/", views.auth_me_view, name="api_auth_me"),

    # 2. Homepage & CMS
    path("homepage/", views.homepage_data_view, name="api_homepage"),
    path("settings/", views.website_settings_view, name="api_settings"),
    path("navigation/", views.navigation_and_sections_view, name="api_navigation"),

    # 3. Live Matches, Matches & Scorecards
    path("matches/live/", views.live_matches_view, name="api_live_matches"),
    path("matches/", views.matches_list_create_view, name="api_matches_list_create"),
    path("matches/<int:match_id>/", views.match_detail_view, name="api_match_detail"),
    path("matches/<int:match_id>/scorecard/", views.match_detail_view, name="api_match_scorecard"),

    # 4. Live Scoring & Winner Control
    path(
        "matches/<int:match_id>/manual-score/",
        views.match_manual_score_view,
        name="api_match_manual_score",
    ),
    path(
        "matches/<int:match_id>/ball-event/",
        views.match_ball_event_view,
        name="api_match_ball_event",
    ),
    path(
        "matches/<int:match_id>/undo-ball/",
        views.match_undo_last_ball_view,
        name="api_match_undo_ball",
    ),
    path(
        "matches/<int:match_id>/finalize-winner/",
        views.match_finalize_winner_view,
        name="api_match_finalize_winner",
    ),

    # 5. Tournaments, Teams, Players, Standings, Results & Winners
    path("tournaments/", views.tournaments_list_create_view, name="api_tournaments"),
    path(
        "tournaments/<int:tournament_id>/",
        views.tournament_detail_view,
        name="api_tournament_detail",
    ),
    path("teams/", views.teams_list_create_view, name="api_teams"),
    path("teams/<int:team_id>/", views.team_detail_view, name="api_team_detail"),
    path("players/", views.players_list_create_view, name="api_players"),
    path("players/<int:player_id>/", views.player_detail_view, name="api_player_detail"),
    path("standings/", views.standings_view, name="api_standings"),
    path("results/", views.results_list_view, name="api_results"),
    path("winners/", views.winners_list_create_view, name="api_winners"),

    # 6. Gallery, Announcements, News, Sponsors & Contact
    path("gallery/", views.gallery_view, name="api_gallery"),
    path("announcements/", views.announcements_and_news_view, name="api_announcements"),
    path("news/", views.announcements_and_news_view, name="api_news"),
    path("sponsors/", views.sponsors_view, name="api_sponsors"),
    path("contact/", views.contact_messages_view, name="api_contact"),

    # 7. Protected Administration, Clear Data & OpenAPI Schema
    path("admin/overview/", views.admin_dashboard_overview_view, name="api_admin_overview"),
    path("admin/users/", views.admin_users_roles_view, name="api_admin_users"),
    path("admin/audit-logs/", views.admin_audit_logs_view, name="api_admin_audit_logs"),
    path("admin/backup/", views.admin_backup_export_view, name="api_admin_backup"),
    path("admin/clear-data/", views.admin_clear_all_data_view, name="api_admin_clear_data"),
    path("schema/", views.openapi_schema_view, name="api_openapi_schema"),
]
