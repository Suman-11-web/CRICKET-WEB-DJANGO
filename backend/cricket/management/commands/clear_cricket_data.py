"""
Management command: `python manage.py clear_cricket_data`
Deletes all test/demo cricket data (matches, innings, ball events, scorecards, results, awards,
tournaments, standings, teams, players, winners, gallery, sponsors, news, announcements, contact messages)
while preserving admin user accounts and base WebsiteSettings / NavigationItem / HomepageSection configuration.
"""
from django.core.management.base import BaseCommand
from django.db import transaction

from cricket.models import (
    Announcement,
    AuditLog,
    BallEvent,
    BattingPerformance,
    BowlingPerformance,
    ContactMessage,
    GalleryImage,
    Match,
    MatchAward,
    MatchInnings,
    MatchResult,
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
    WebsiteSettings,
)


class Command(BaseCommand):
    help = "Delete all test/sample cricket data so the administrator can start with a clean slate."

    @transaction.atomic
    def handle(self, *args, **options):
        BallEvent.objects.all().delete()
        BattingPerformance.objects.all().delete()
        BowlingPerformance.objects.all().delete()
        ScoreCorrection.objects.all().delete()
        MatchAward.objects.all().delete()
        MatchResult.objects.all().delete()
        MatchInnings.objects.all().delete()
        Match.objects.all().delete()

        StandingAdjustment.objects.all().delete()
        TournamentStanding.objects.all().delete()
        TournamentRegistration.objects.all().delete()
        TournamentGroup.objects.all().delete()
        TournamentStage.objects.all().delete()
        TournamentWinner.objects.all().delete()
        TeamMembership.objects.all().delete()
        Player.objects.all().delete()
        Team.objects.all().delete()
        Tournament.objects.all().delete()

        GalleryImage.objects.all().delete()
        Sponsor.objects.all().delete()
        NewsPost.objects.all().delete()
        Announcement.objects.all().delete()
        ContactMessage.objects.all().delete()
        AuditLog.objects.all().delete()

        settings_obj = WebsiteSettings.get_solo()
        settings_obj.contact_email = "sumanofficial@gmail.com"
        settings_obj.save(update_fields=["contact_email", "updated_at"])

        self.stdout.write(
            self.style.SUCCESS(
                "All test data deleted! Admin accounts and base website settings (sumanofficial@gmail.com) are preserved."
            )
        )
