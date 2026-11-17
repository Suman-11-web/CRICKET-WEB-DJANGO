"""Django Admin registrations for internal database inspection."""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import (
    AdminRole,
    Announcement,
    AuditLog,
    BallEvent,
    BattingPerformance,
    BowlingPerformance,
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
    ScoreCorrection,
    Sponsor,
    StandingAdjustment,
    Team,
    TeamMembership,
    Tournament,
    TournamentGroup,
    TournamentRegistration,
    TournamentStage,
    TournamentStanding,
    TournamentWinner,
    User,
    WebsiteSettings,
)

admin.site.register(User, UserAdmin)
admin.site.register(AdminRole)
admin.site.register(WebsiteSettings)
admin.site.register(NavigationItem)
admin.site.register(HomepageSection)
admin.site.register(Announcement)
admin.site.register(Tournament)
admin.site.register(TournamentStage)
admin.site.register(TournamentGroup)
admin.site.register(Team)
admin.site.register(Player)
admin.site.register(TeamMembership)
admin.site.register(TournamentRegistration)
admin.site.register(Match)
admin.site.register(MatchInnings)
admin.site.register(BattingPerformance)
admin.site.register(BowlingPerformance)
admin.site.register(BallEvent)
admin.site.register(ScoreCorrection)
admin.site.register(MatchResult)
admin.site.register(MatchAward)
admin.site.register(TournamentStanding)
admin.site.register(StandingAdjustment)
admin.site.register(TournamentWinner)
admin.site.register(NewsPost)
admin.site.register(GalleryImage)
admin.site.register(Sponsor)
admin.site.register(ContactMessage)
admin.site.register(AuditLog)
