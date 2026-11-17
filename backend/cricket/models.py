"""
Normalized Database Models for Village Cricket Live.
Covers all 28 domain models specified in Section 17:
- User & AdminRole (RBAC: Super Admin, Tournament Admin, Scorer, Content Editor)
- WebsiteSettings, NavigationItem, HomepageSection, Announcement (Built-in CMS)
- Tournament, TournamentStage, TournamentGroup
- Team, Player, TeamMembership, TournamentRegistration
- Match, MatchInnings, BattingPerformance, BowlingPerformance, BallEvent, ScoreCorrection
- MatchResult, MatchAward
- TournamentStanding, StandingAdjustment, TournamentWinner
- NewsPost, GalleryImage, Sponsor, ContactMessage, AuditLog
"""
from decimal import Decimal
from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone
from django.utils.text import slugify


class AdminRole(models.Model):
    ROLE_SUPER_ADMIN = "SUPER_ADMIN"
    ROLE_TOURNAMENT_ADMIN = "TOURNAMENT_ADMIN"
    ROLE_SCORER = "SCORER"
    ROLE_CONTENT_EDITOR = "CONTENT_EDITOR"

    ROLE_CHOICES = [
        (ROLE_SUPER_ADMIN, "Super Admin"),
        (ROLE_TOURNAMENT_ADMIN, "Tournament Admin"),
        (ROLE_SCORER, "Scorer"),
        (ROLE_CONTENT_EDITOR, "Content Editor"),
    ]

    code = models.CharField(max_length=32, choices=ROLE_CHOICES, unique=True)
    name = models.CharField(max_length=80)
    description = models.TextField(blank=True)
    can_manage_users = models.BooleanField(default=False)
    can_manage_settings = models.BooleanField(default=False)
    can_manage_tournaments = models.BooleanField(default=False)
    can_manage_teams_players = models.BooleanField(default=False)
    can_manage_matches = models.BooleanField(default=False)
    can_score_matches = models.BooleanField(default=False)
    can_finalize_results = models.BooleanField(default=False)
    can_manage_cms = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["code"]

    def __str__(self) -> str:
        return f"{self.name} ({self.code})"


class User(AbstractUser):
    ROLE_SUPER_ADMIN = "SUPER_ADMIN"
    ROLE_TOURNAMENT_ADMIN = "TOURNAMENT_ADMIN"
    ROLE_SCORER = "SCORER"
    ROLE_CONTENT_EDITOR = "CONTENT_EDITOR"

    ROLE_CHOICES = AdminRole.ROLE_CHOICES

    admin_role = models.ForeignKey(
        AdminRole,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="users",
    )
    role_code = models.CharField(
        max_length=32,
        choices=ROLE_CHOICES,
        default=ROLE_SUPER_ADMIN,
        db_index=True,
    )
    phone = models.CharField(max_length=24, blank=True)
    village = models.CharField(max_length=120, blank=True)
    avatar_url = models.CharField(max_length=500, blank=True)
    two_factor_enabled = models.BooleanField(default=False)
    session_token = models.CharField(max_length=128, blank=True, db_index=True)
    last_activity_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["username"]

    @property
    def effective_role(self) -> str:
        if self.is_superuser:
            return self.ROLE_SUPER_ADMIN
        if self.admin_role:
            return self.admin_role.code
        return self.role_code or self.ROLE_SCORER

    def has_role(self, *roles: str) -> bool:
        if self.is_superuser or self.effective_role == self.ROLE_SUPER_ADMIN:
            return True
        return self.effective_role in roles


class WebsiteSettings(models.Model):
    site_name = models.CharField(max_length=120, default="Village Cricket Live")
    site_name_kn = models.CharField(max_length=120, default="ಹಳ್ಳಿ ಕ್ರಿಕೆಟ್ ಲೈವ್", blank=True)
    tagline = models.CharField(
        max_length=240,
        default="Official Village Cricket Tournament & Live Match Scoring Portal",
    )
    logo_url = models.CharField(max_length=500, default="/images/logo-crest.svg", blank=True)
    favicon_url = models.CharField(max_length=500, default="/favicon.ico", blank=True)
    primary_color = models.CharField(max_length=24, default="#0B3B24")
    accent_color = models.CharField(max_length=24, default="#D4AF37")

    # Section C: Hero Configuration
    hero_visible = models.BooleanField(default=True)
    hero_title = models.CharField(
        max_length=200,
        default="Where Village Cricket Comes Alive",
    )
    hero_title_kn = models.CharField(
        max_length=200,
        default="ಹಳ್ಳಿ ಕ್ರಿಕೆಟ್‌ನ ನೈಜ ಸಂಭ್ರಮ",
        blank=True,
    )
    hero_subtitle = models.TextField(
        default="Follow ball-by-ball live scores, discover village teams, celebrate tournament champions and stay connected with every local cricket fixture."
    )
    hero_subtitle_kn = models.TextField(
        default="ಪ್ರತಿ ಚೆಂಡಿನ ನೇರ ಸ್ಕೋರ್, ಗ್ರಾಮೀಣ ತಂಡಗಳು, ಪಂದ್ಯಾವಳಿ ವಿಜೇತರು ಮತ್ತು ಅಂಕಪಟ್ಟಿಯನ್ನು ಕ್ಷಣಕ್ಷಣಕ್ಕೂ ವೀಕ್ಷಿಸಿ.",
        blank=True,
    )
    hero_background_image = models.CharField(
        max_length=500,
        default="https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=1800&q=80",
        blank=True,
    )
    hero_video_url = models.CharField(max_length=500, blank=True)
    hero_primary_cta_text = models.CharField(max_length=80, default="View Live Matches")
    hero_primary_cta_link = models.CharField(max_length=200, default="/live-scores")
    hero_secondary_cta_text = models.CharField(max_length=80, default="Explore Tournaments")
    hero_secondary_cta_link = models.CharField(max_length=200, default="/tournaments")
    upcoming_tournament_banner = models.CharField(
        max_length=255,
        default="Gramina Premier Cup 2026 • Hadinaru & Mysuru District Grounds • 16 Village Teams Competing",
        blank=True,
    )

    # About & Contact CMS
    about_title = models.CharField(
        max_length=200,
        default="Preserving the Spirit & Pride of Village Cricket",
    )
    about_content = models.TextField(
        default=(
            "Village Cricket Live brings international-grade digital scoring, transparent tournament standings, "
            "and historical player records to grassroots and panchayat-level cricket competitions across Karnataka and India."
        )
    )
    about_mission = models.TextField(
        default=(
            "To empower local tournament committees, village sports clubs, and youth associations with accurate real-time "
            "scoring, verified team rosters, and permanent championship archives."
        )
    )
    contact_email = models.EmailField(default="organizer@villagecricketlive.in")
    contact_phone = models.CharField(max_length=40, default="+91 98450 11223")
    contact_whatsapp = models.CharField(max_length=40, default="+91 98450 11223", blank=True)
    contact_address = models.CharField(
        max_length=300,
        default="Panchayat Sports Ground Pavilion, Hadinaru, Nanjangud Taluk, Mysuru District, Karnataka 571129",
    )

    # Footer & Legal CMS
    footer_description = models.TextField(
        default="The complete village cricket tournament management & live scoring platform. Built for local organizers, scorers, players, and passionate cricket spectators."
    )
    copyright_text = models.CharField(
        max_length=240,
        default="© 2026 Village Cricket Live. All rights reserved.",
    )
    privacy_policy = models.TextField(
        default="We respect spectator and player privacy. Public profiles display only cricket participation and match statistics approved by tournament organizers."
    )
    terms_conditions = models.TextField(
        default="All match scores, net run rate standings, and tournament results published on Village Cricket Live are subject to official verification by the tournament umpire and organizing committee."
    )
    social_facebook = models.CharField(max_length=300, default="https://facebook.com", blank=True)
    social_instagram = models.CharField(max_length=300, default="https://instagram.com", blank=True)
    social_youtube = models.CharField(max_length=300, default="https://youtube.com", blank=True)
    social_x = models.CharField(max_length=300, default="https://x.com", blank=True)

    # SEO & Theme Settings
    seo_title = models.CharField(
        max_length=160,
        default="Village Cricket Live — Live Scores, Tournaments, Points Table & Champions",
    )
    seo_description = models.TextField(
        default="Watch real-time village cricket scores, ball-by-ball updates, tournament fixtures, points tables, team rosters, and championship history."
    )
    default_theme = models.CharField(
        max_length=16,
        choices=[("dark", "Dark"), ("light", "Light")],
        default="dark",
    )
    default_language = models.CharField(
        max_length=8,
        choices=[("en", "English"), ("kn", "Kannada")],
        default="en",
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Website Settings"
        verbose_name_plural = "Website Settings"

    def __str__(self) -> str:
        return self.site_name

    @classmethod
    def get_solo(cls) -> "WebsiteSettings":
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class NavigationItem(models.Model):
    label = models.CharField(max_length=80)
    label_kn = models.CharField(max_length=80, blank=True)
    slug = models.SlugField(max_length=80, unique=True)
    path = models.CharField(max_length=200)
    group_name = models.CharField(
        max_length=40,
        default="primary",
        help_text="primary, dropdown, or footer",
    )
    display_order = models.PositiveIntegerField(default=1, db_index=True)
    is_visible = models.BooleanField(default=True, db_index=True)
    is_optional = models.BooleanField(default=False)
    open_in_new_tab = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["display_order", "id"]

    def __str__(self) -> str:
        return f"{self.display_order}. {self.label} ({self.path})"


class HomepageSection(models.Model):
    SECTION_CHOICES = [
        ("SECTION_A", "Section A: Top Announcement Bar"),
        ("SECTION_B", "Section B: Header and Navigation"),
        ("SECTION_C", "Section C: Premium Hero / Landing Section"),
        ("SECTION_D", "Section D: Live Cricket Matches"),
        ("SECTION_E", "Section E: Upcoming Matches"),
        ("SECTION_F", "Section F: Recent Match Results"),
        ("SECTION_G", "Section G: Tournament Information"),
        ("SECTION_H", "Section H: Featured Teams"),
        ("SECTION_I", "Section I: Points Table Preview"),
        ("SECTION_J", "Section J: Top Players"),
        ("SECTION_K", "Section K: Tournament Winners"),
        ("SECTION_L", "Section L: Photo Gallery"),
        ("SECTION_M", "Section M: Sponsors and Partners"),
        ("SECTION_N", "Section N: Latest News and Announcements"),
        ("SECTION_O", "Section O: Footer"),
    ]

    section_key = models.CharField(max_length=32, choices=SECTION_CHOICES, unique=True)
    title = models.CharField(max_length=140)
    title_kn = models.CharField(max_length=140, blank=True)
    subtitle = models.CharField(max_length=280, blank=True)
    display_order = models.PositiveIntegerField(default=1, db_index=True)
    is_visible = models.BooleanField(default=True, db_index=True)
    max_items = models.PositiveIntegerField(default=6)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["display_order", "section_key"]

    def __str__(self) -> str:
        return f"{self.section_key} - {self.title}"


class Announcement(models.Model):
    text = models.CharField(max_length=300)
    text_kn = models.CharField(max_length=300, blank=True)
    badge_label = models.CharField(max_length=40, default="LIVE UPDATE")
    link_url = models.CharField(max_length=300, blank=True)
    link_text = models.CharField(max_length=80, default="View Details", blank=True)
    start_date = models.DateTimeField(default=timezone.now)
    expiration_date = models.DateTimeField(null=True, blank=True)
    is_visible = models.BooleanField(default=True, db_index=True)
    priority = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-priority", "-created_at"]

    def __str__(self) -> str:
        return self.text[:80]

    @property
    def is_currently_active(self) -> bool:
        if not self.is_visible:
            return False
        now = timezone.now()
        if self.start_date and now < self.start_date:
            return False
        if self.expiration_date and now > self.expiration_date:
            return False
        return True


class Tournament(models.Model):
    STATUS_UPCOMING = "UPCOMING"
    STATUS_REGISTRATION_OPEN = "REGISTRATION_OPEN"
    STATUS_ONGOING = "ONGOING"
    STATUS_COMPLETED = "COMPLETED"
    STATUS_ARCHIVED = "ARCHIVED"

    STATUS_CHOICES = [
        (STATUS_UPCOMING, "Upcoming"),
        (STATUS_REGISTRATION_OPEN, "Registration Open"),
        (STATUS_ONGOING, "Active / Ongoing"),
        (STATUS_COMPLETED, "Completed"),
        (STATUS_ARCHIVED, "Archived"),
    ]

    FORMAT_TENNIS_BALL = "TENNIS_BALL"
    FORMAT_LEATHER_BALL = "LEATHER_BALL"
    FORMAT_T10 = "T10"
    FORMAT_T20 = "T20"
    FORMAT_EIGHT_OVER = "8_OVER_VILLAGE"
    FORMAT_TWELVE_OVER = "12_OVER_VILLAGE"

    FORMAT_CHOICES = [
        (FORMAT_EIGHT_OVER, "8-Over Village Knockout"),
        (FORMAT_T10, "T10 League (10 Overs)"),
        (FORMAT_TWELVE_OVER, "12-Over Panchayat Cup"),
        (FORMAT_T20, "T20 Championship (20 Overs)"),
        (FORMAT_TENNIS_BALL, "Tennis Ball Open"),
        (FORMAT_LEATHER_BALL, "Leather Ball Trophy"),
    ]

    name = models.CharField(max_length=160)
    slug = models.SlugField(max_length=180, unique=True, blank=True)
    season_year = models.PositiveIntegerField(default=2026, db_index=True)
    description = models.TextField(blank=True)
    poster_url = models.CharField(max_length=500, blank=True)
    banner_url = models.CharField(max_length=500, blank=True)
    organizer_name = models.CharField(max_length=140)
    organizer_contact = models.CharField(max_length=80, blank=True)
    village = models.CharField(max_length=120)
    ground_name = models.CharField(max_length=160)
    start_date = models.DateField()
    end_date = models.DateField()
    match_format = models.CharField(max_length=40, choices=FORMAT_CHOICES, default=FORMAT_T10)
    overs_per_innings = models.PositiveIntegerField(
        default=10,
        validators=[MinValueValidator(1), MaxValueValidator(50)],
    )
    registration_status = models.CharField(
        max_length=32,
        choices=[
            ("OPEN", "Open"),
            ("CLOSED", "Closed"),
            ("INVITE_ONLY", "Invite Only"),
        ],
        default="OPEN",
    )
    status = models.CharField(
        max_length=32,
        choices=STATUS_CHOICES,
        default=STATUS_ONGOING,
        db_index=True,
    )
    max_teams = models.PositiveIntegerField(default=8)

    # Points & NRR rules
    points_for_win = models.IntegerField(default=2)
    points_for_tie = models.IntegerField(default=1)
    points_for_no_result = models.IntegerField(default=1)
    points_for_loss = models.IntegerField(default=0)
    all_out_uses_full_overs_for_nrr = models.BooleanField(
        default=True,
        help_text="Standard cricket rule: if a team is bowled out, NRR uses full quota of overs.",
    )
    ranking_rule_summary = models.CharField(
        max_length=240,
        default="Points -> Net Run Rate (NRR) -> Wins -> Head-to-Head",
    )

    prize_details = models.CharField(
        max_length=240,
        default="Champion: ₹50,000 + Golden Trophy | Runner-Up: ₹25,000 + Trophy",
        blank=True,
    )
    is_featured = models.BooleanField(default=True, db_index=True)
    managed_by = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name="assigned_tournaments",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-season_year", "-start_date", "name"]

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(f"{self.name}-{self.season_year}") or "tournament"
            slug_candidate = base
            idx = 1
            while Tournament.objects.filter(slug=slug_candidate).exclude(pk=self.pk).exists():
                idx += 1
                slug_candidate = f"{base}-{idx}"
            self.slug = slug_candidate
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.name} ({self.season_year})"


class TournamentStage(models.Model):
    STAGE_LEAGUE = "LEAGUE"
    STAGE_GROUPS = "GROUPS"
    STAGE_QUARTER_FINAL = "QUARTER_FINAL"
    STAGE_SEMI_FINAL = "SEMI_FINAL"
    STAGE_FINAL = "FINAL"

    STAGE_CHOICES = [
        (STAGE_LEAGUE, "League Stage"),
        (STAGE_GROUPS, "Group Stage"),
        (STAGE_QUARTER_FINAL, "Quarter-Finals"),
        (STAGE_SEMI_FINAL, "Semi-Finals"),
        (STAGE_FINAL, "Grand Final"),
    ]

    tournament = models.ForeignKey(
        Tournament,
        on_delete=models.CASCADE,
        related_name="stages",
    )
    name = models.CharField(max_length=80)
    stage_type = models.CharField(max_length=32, choices=STAGE_CHOICES, default=STAGE_LEAGUE)
    stage_order = models.PositiveIntegerField(default=1)
    is_active = models.BooleanField(default=True)
    is_completed = models.BooleanField(default=False)

    class Meta:
        ordering = ["tournament", "stage_order"]
        unique_together = [("tournament", "name")]

    def __str__(self) -> str:
        return f"{self.tournament.name} — {self.name}"


class TournamentGroup(models.Model):
    tournament = models.ForeignKey(
        Tournament,
        on_delete=models.CASCADE,
        related_name="groups",
    )
    stage = models.ForeignKey(
        TournamentStage,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="groups",
    )
    name = models.CharField(max_length=60, default="Group A")
    qualifying_teams_count = models.PositiveIntegerField(default=2)
    display_order = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ["tournament", "display_order", "name"]
        unique_together = [("tournament", "name")]

    def __str__(self) -> str:
        return f"{self.tournament.name} - {self.name}"


class Team(models.Model):
    STATUS_ACTIVE = "ACTIVE"
    STATUS_INACTIVE = "INACTIVE"
    STATUS_SUSPENDED = "SUSPENDED"

    name = models.CharField(max_length=120, unique=True)
    short_name = models.CharField(max_length=16, db_index=True)
    slug = models.SlugField(max_length=140, unique=True, blank=True)
    logo_url = models.CharField(max_length=500, blank=True)
    primary_color = models.CharField(max_length=16, default="#10B981")
    village = models.CharField(max_length=120, db_index=True)
    captain_name = models.CharField(max_length=120, blank=True)
    vice_captain_name = models.CharField(max_length=120, blank=True)
    home_ground = models.CharField(max_length=140, blank=True)
    description = models.TextField(blank=True)
    achievements = models.TextField(blank=True)
    # Private admin-only contact fields
    manager_contact_name = models.CharField(max_length=120, blank=True)
    manager_contact_phone = models.CharField(max_length=32, blank=True)
    manager_contact_email = models.EmailField(blank=True)

    status = models.CharField(
        max_length=24,
        choices=[
            (STATUS_ACTIVE, "Active"),
            (STATUS_INACTIVE, "Inactive"),
            (STATUS_SUSPENDED, "Suspended"),
        ],
        default=STATUS_ACTIVE,
    )
    is_featured = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.name) or "team"
            slug_candidate = base
            idx = 1
            while Team.objects.filter(slug=slug_candidate).exclude(pk=self.pk).exists():
                idx += 1
                slug_candidate = f"{base}-{idx}"
            self.slug = slug_candidate
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.name} ({self.village})"


class Player(models.Model):
    ROLE_BATTER = "BATTER"
    ROLE_BOWLER = "BOWLER"
    ROLE_ALL_ROUNDER = "ALL_ROUNDER"
    ROLE_WICKET_KEEPER = "WICKET_KEEPER"

    ROLE_CHOICES = [
        (ROLE_BATTER, "Batter"),
        (ROLE_BOWLER, "Bowler"),
        (ROLE_ALL_ROUNDER, "All-Rounder"),
        (ROLE_WICKET_KEEPER, "Wicket-Keeper Batter"),
    ]

    name = models.CharField(max_length=120, db_index=True)
    slug = models.SlugField(max_length=150, unique=True, blank=True)
    photo_url = models.CharField(max_length=500, blank=True)
    village = models.CharField(max_length=120, blank=True)
    team = models.ForeignKey(
        Team,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="players",
    )
    playing_role = models.CharField(max_length=32, choices=ROLE_CHOICES, default=ROLE_ALL_ROUNDER)
    batting_style = models.CharField(max_length=60, default="Right-hand bat", blank=True)
    bowling_style = models.CharField(max_length=60, default="Right-arm medium-fast", blank=True)
    jersey_number = models.PositiveIntegerField(null=True, blank=True)
    is_captain = models.BooleanField(default=False)
    bio = models.TextField(blank=True)

    # Admin-approved manual/historical statistics (clearly distinguished from calculated stats)
    manual_matches = models.PositiveIntegerField(default=0)
    manual_runs = models.PositiveIntegerField(default=0)
    manual_balls_faced = models.PositiveIntegerField(default=0)
    manual_highest_score = models.PositiveIntegerField(default=0)
    manual_fifties = models.PositiveIntegerField(default=0)
    manual_hundreds = models.PositiveIntegerField(default=0)
    manual_wickets = models.PositiveIntegerField(default=0)
    manual_best_bowling = models.CharField(max_length=24, default="0/0", blank=True)
    manual_stats_approved = models.BooleanField(
        default=False,
        help_text="When True, manual baseline stats are combined or badged as Organizer-Verified Manual Stats.",
    )
    manual_award_title = models.CharField(max_length=160, blank=True)

    is_featured = models.BooleanField(default=False, db_index=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["name", "team", "jersey_number"],
                name="unique_player_identity_per_team_jersey",
            )
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(f"{self.name}-{self.village or 'player'}") or "player"
            slug_candidate = base
            idx = 1
            while Player.objects.filter(slug=slug_candidate).exclude(pk=self.pk).exists():
                idx += 1
                slug_candidate = f"{base}-{idx}"
            self.slug = slug_candidate
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.name} ({self.team.short_name if self.team else 'Free Agent'})"


class TeamMembership(models.Model):
    """Tracks player membership history across teams and tournaments."""
    player = models.ForeignKey(Player, on_delete=models.CASCADE, related_name="memberships")
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="memberships")
    tournament = models.ForeignKey(
        Tournament,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="player_memberships",
    )
    season_year = models.PositiveIntegerField(default=2026)
    jersey_number = models.PositiveIntegerField(null=True, blank=True)
    role_in_team = models.CharField(max_length=40, default="Player")
    is_captain = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    joined_at = models.DateField(default=timezone.localdate)
    left_at = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ["-season_year", "team__name", "player__name"]
        unique_together = [("player", "team", "tournament", "season_year")]

    def __str__(self) -> str:
        return f"{self.player.name} -> {self.team.name} ({self.season_year})"


class TournamentRegistration(models.Model):
    tournament = models.ForeignKey(
        Tournament,
        on_delete=models.CASCADE,
        related_name="registrations",
    )
    team = models.ForeignKey(
        Team,
        on_delete=models.CASCADE,
        related_name="tournament_registrations",
    )
    group = models.ForeignKey(
        TournamentGroup,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="registrations",
    )
    status = models.CharField(
        max_length=24,
        choices=[
            ("PENDING", "Pending Approval"),
            ("APPROVED", "Approved"),
            ("WITHDRAWN", "Withdrawn"),
        ],
        default="APPROVED",
    )
    seed_number = models.PositiveIntegerField(default=1)
    registered_at = models.DateTimeField(auto_now_add=True)
    notes = models.CharField(max_length=240, blank=True)

    class Meta:
        ordering = ["tournament", "seed_number", "team__name"]
        unique_together = [("tournament", "team")]

    def __str__(self) -> str:
        return f"{self.team.name} in {self.tournament.name}"


class Match(models.Model):
    TYPE_FRIENDLY = "FRIENDLY"
    TYPE_TOURNAMENT = "TOURNAMENT"

    TYPE_CHOICES = [
        (TYPE_FRIENDLY, "Friendly / Village Match"),
        (TYPE_TOURNAMENT, "Tournament Match"),
    ]

    STATUS_UPCOMING = "UPCOMING"
    STATUS_LIVE = "LIVE"
    STATUS_INNINGS_BREAK = "INNINGS_BREAK"
    STATUS_PAUSED = "PAUSED"
    STATUS_COMPLETED = "COMPLETED"
    STATUS_CANCELLED = "CANCELLED"
    STATUS_POSTPONED = "POSTPONED"
    STATUS_ABANDONED = "ABANDONED"
    STATUS_ARCHIVED = "ARCHIVED"

    STATUS_CHOICES = [
        (STATUS_UPCOMING, "Upcoming / Scheduled"),
        (STATUS_LIVE, "Live"),
        (STATUS_INNINGS_BREAK, "Innings Break"),
        (STATUS_PAUSED, "Paused / Interrupted"),
        (STATUS_COMPLETED, "Completed"),
        (STATUS_CANCELLED, "Cancelled"),
        (STATUS_POSTPONED, "Postponed"),
        (STATUS_ABANDONED, "Abandoned"),
        (STATUS_ARCHIVED, "Archived"),
    ]

    SCORING_MODE_MANUAL = "MANUAL"
    SCORING_MODE_BALL_BY_BALL = "BALL_BY_BALL"

    SCORING_MODE_CHOICES = [
        (SCORING_MODE_MANUAL, "Simple Manual Scoring"),
        (SCORING_MODE_BALL_BY_BALL, "Advanced Ball-by-Ball Scoring"),
    ]

    match_number = models.PositiveIntegerField(default=1)
    title = models.CharField(max_length=180)
    slug = models.SlugField(max_length=200, unique=True, blank=True)
    match_type = models.CharField(
        max_length=20,
        choices=TYPE_CHOICES,
        default=TYPE_TOURNAMENT,
        db_index=True,
    )
    tournament = models.ForeignKey(
        Tournament,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="matches",
    )
    stage = models.ForeignKey(
        TournamentStage,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="matches",
    )
    group = models.ForeignKey(
        TournamentGroup,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="matches",
    )
    team_a = models.ForeignKey(
        Team,
        on_delete=models.PROTECT,
        related_name="matches_as_team_a",
    )
    team_b = models.ForeignKey(
        Team,
        on_delete=models.PROTECT,
        related_name="matches_as_team_b",
    )
    venue = models.CharField(max_length=160, default="Hadinaru Main Cricket Ground")
    match_date = models.DateField(db_index=True)
    start_time = models.TimeField(default="14:00:00")
    overs_per_innings = models.PositiveIntegerField(
        default=10,
        validators=[MinValueValidator(1), MaxValueValidator(50)],
    )
    match_format = models.CharField(max_length=40, default="T10")
    status = models.CharField(
        max_length=24,
        choices=STATUS_CHOICES,
        default=STATUS_UPCOMING,
        db_index=True,
    )
    scoring_mode = models.CharField(
        max_length=24,
        choices=SCORING_MODE_CHOICES,
        default=SCORING_MODE_MANUAL,
    )
    current_innings_number = models.PositiveIntegerField(default=1)
    toss_winner = models.ForeignKey(
        Team,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tosses_won",
    )
    toss_decision = models.CharField(
        max_length=12,
        choices=[("BAT", "Bat First"), ("BOWL", "Bowl First")],
        blank=True,
    )
    target_score = models.PositiveIntegerField(null=True, blank=True)
    umpire_details = models.CharField(max_length=180, blank=True)
    assigned_scorer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_matches",
    )
    match_notes = models.TextField(blank=True)
    is_tournament_final = models.BooleanField(default=False)
    is_featured = models.BooleanField(default=True)
    version = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["match_date", "start_time", "id"]
        indexes = [
            models.Index(fields=["status", "match_date"]),
            models.Index(fields=["match_type", "status"]),
        ]

    def save(self, *args, **kwargs):
        if not self.title:
            self.title = f"{self.team_a.name} vs {self.team_b.name}"
        if not self.slug:
            base = slugify(f"{self.team_a.name}-vs-{self.team_b.name}") or "match"
            slug_candidate = base
            idx = 1
            while Match.objects.filter(slug=slug_candidate).exclude(pk=self.pk).exists():
                idx += 1
                slug_candidate = f"{base}-{idx}"
            self.slug = slug_candidate
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"#{self.id} {self.title} ({self.status})"


class MatchInnings(models.Model):
    STATUS_NOT_STARTED = "NOT_STARTED"
    STATUS_IN_PROGRESS = "IN_PROGRESS"
    STATUS_COMPLETED = "COMPLETED"
    STATUS_ALL_OUT = "ALL_OUT"
    STATUS_DECLARED = "DECLARED"

    STATUS_CHOICES = [
        (STATUS_NOT_STARTED, "Not Started"),
        (STATUS_IN_PROGRESS, "In Progress"),
        (STATUS_COMPLETED, "Completed"),
        (STATUS_ALL_OUT, "All Out"),
        (STATUS_DECLARED, "Declared"),
    ]

    match = models.ForeignKey(
        Match,
        on_delete=models.CASCADE,
        related_name="innings",
    )
    innings_number = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1), MaxValueValidator(4)],
    )
    batting_team = models.ForeignKey(
        Team,
        on_delete=models.PROTECT,
        related_name="batting_innings",
    )
    bowling_team = models.ForeignKey(
        Team,
        on_delete=models.PROTECT,
        related_name="bowling_innings",
    )
    runs = models.PositiveIntegerField(default=0)
    wickets = models.PositiveIntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(10)],
    )
    completed_overs = models.PositiveIntegerField(default=0)
    balls_in_over = models.PositiveIntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(5)],
    )
    max_overs = models.PositiveIntegerField(default=10)
    target_runs = models.PositiveIntegerField(null=True, blank=True)

    # Extras breakdown
    extras_wides = models.PositiveIntegerField(default=0)
    extras_no_balls = models.PositiveIntegerField(default=0)
    extras_byes = models.PositiveIntegerField(default=0)
    extras_leg_byes = models.PositiveIntegerField(default=0)
    extras_penalty = models.PositiveIntegerField(default=0)

    # Active players on field
    striker = models.ForeignKey(
        Player,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="striker_innings",
    )
    non_striker = models.ForeignKey(
        Player,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="non_striker_innings",
    )
    current_bowler = models.ForeignKey(
        Player,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="bowler_innings",
    )

    partnership_runs = models.PositiveIntegerField(default=0)
    partnership_balls = models.PositiveIntegerField(default=0)
    fall_of_wickets = models.JSONField(default=list, blank=True)

    status = models.CharField(
        max_length=24,
        choices=STATUS_CHOICES,
        default=STATUS_NOT_STARTED,
    )
    has_ball_events = models.BooleanField(default=False)
    is_reconciled_manual_override = models.BooleanField(default=False)
    last_reconciliation_reason = models.CharField(max_length=255, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["match", "innings_number"]
        unique_together = [("match", "innings_number")]

    @property
    def overs_display(self) -> str:
        return f"{self.completed_overs}.{self.balls_in_over}"

    @property
    def total_legal_balls(self) -> int:
        return (self.completed_overs * 6) + self.balls_in_over

    @property
    def total_extras(self) -> int:
        return (
            self.extras_wides
            + self.extras_no_balls
            + self.extras_byes
            + self.extras_leg_byes
            + self.extras_penalty
        )

    @property
    def current_run_rate(self) -> float:
        balls = self.total_legal_balls
        if balls == 0:
            return 0.0
        return round((self.runs * 6.0) / balls, 2)

    @property
    def required_run_rate(self) -> float | None:
        if not self.target_runs or self.innings_number < 2:
            return None
        runs_needed = self.target_runs - self.runs
        if runs_needed <= 0:
            return 0.0
        balls_remaining = (self.max_overs * 6) - self.total_legal_balls
        if balls_remaining <= 0:
            return None
        return round((runs_needed * 6.0) / balls_remaining, 2)

    def __str__(self) -> str:
        return f"{self.match.title} — Innings {self.innings_number}: {self.batting_team.short_name} {self.runs}/{self.wickets} ({self.overs_display})"


class BattingPerformance(models.Model):
    DISMISSAL_NOT_OUT = "NOT_OUT"
    DISMISSAL_BOWLED = "BOWLED"
    DISMISSAL_CAUGHT = "CAUGHT"
    DISMISSAL_LBW = "LBW"
    DISMISSAL_RUN_OUT = "RUN_OUT"
    DISMISSAL_STUMPED = "STUMPED"
    DISMISSAL_HIT_WICKET = "HIT_WICKET"
    DISMISSAL_RETIRED = "RETIRED_HURT"

    DISMISSAL_CHOICES = [
        (DISMISSAL_NOT_OUT, "Not Out"),
        (DISMISSAL_BOWLED, "Bowled"),
        (DISMISSAL_CAUGHT, "Caught"),
        (DISMISSAL_LBW, "LBW"),
        (DISMISSAL_RUN_OUT, "Run Out"),
        (DISMISSAL_STUMPED, "Stumped"),
        (DISMISSAL_HIT_WICKET, "Hit Wicket"),
        (DISMISSAL_RETIRED, "Retired Hurt"),
    ]

    innings = models.ForeignKey(
        MatchInnings,
        on_delete=models.CASCADE,
        related_name="batting_performances",
    )
    player = models.ForeignKey(
        Player,
        on_delete=models.CASCADE,
        related_name="batting_performances",
    )
    batting_order = models.PositiveIntegerField(default=1)
    runs = models.PositiveIntegerField(default=0)
    balls_faced = models.PositiveIntegerField(default=0)
    fours = models.PositiveIntegerField(default=0)
    sixes = models.PositiveIntegerField(default=0)
    dismissal_type = models.CharField(
        max_length=24,
        choices=DISMISSAL_CHOICES,
        default=DISMISSAL_NOT_OUT,
    )
    dismissal_text = models.CharField(max_length=140, default="not out", blank=True)
    dismissed_by_bowler = models.ForeignKey(
        Player,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="wickets_taken_cards",
    )
    fielder_name = models.CharField(max_length=80, blank=True)
    is_out = models.BooleanField(default=False)

    class Meta:
        ordering = ["innings", "batting_order", "id"]
        unique_together = [("innings", "player")]

    @property
    def strike_rate(self) -> float:
        if self.balls_faced == 0:
            return 0.0
        return round((self.runs * 100.0) / self.balls_faced, 2)

    def __str__(self) -> str:
        return f"{self.player.name}: {self.runs} ({self.balls_faced})"


class BowlingPerformance(models.Model):
    innings = models.ForeignKey(
        MatchInnings,
        on_delete=models.CASCADE,
        related_name="bowling_performances",
    )
    player = models.ForeignKey(
        Player,
        on_delete=models.CASCADE,
        related_name="bowling_performances",
    )
    bowling_order = models.PositiveIntegerField(default=1)
    completed_overs = models.PositiveIntegerField(default=0)
    balls_in_over = models.PositiveIntegerField(default=0)
    maidens = models.PositiveIntegerField(default=0)
    runs_conceded = models.PositiveIntegerField(default=0)
    wickets = models.PositiveIntegerField(default=0)
    wides = models.PositiveIntegerField(default=0)
    no_balls = models.PositiveIntegerField(default=0)
    dot_balls = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["innings", "bowling_order", "id"]
        unique_together = [("innings", "player")]

    @property
    def overs_display(self) -> str:
        return f"{self.completed_overs}.{self.balls_in_over}"

    @property
    def economy_rate(self) -> float:
        total_balls = (self.completed_overs * 6) + self.balls_in_over
        if total_balls == 0:
            return 0.0
        return round((self.runs_conceded * 6.0) / total_balls, 2)

    def __str__(self) -> str:
        return f"{self.player.name}: {self.overs_display}-{self.maidens}-{self.runs_conceded}-{self.wickets}"


class BallEvent(models.Model):
    EXTRA_NONE = "NONE"
    EXTRA_WIDE = "WIDE"
    EXTRA_NO_BALL = "NO_BALL"
    EXTRA_BYE = "BYE"
    EXTRA_LEG_BYE = "LEG_BYE"
    EXTRA_PENALTY = "PENALTY"

    EXTRA_CHOICES = [
        (EXTRA_NONE, "Legal Delivery (No Extra)"),
        (EXTRA_WIDE, "Wide"),
        (EXTRA_NO_BALL, "No Ball"),
        (EXTRA_BYE, "Bye"),
        (EXTRA_LEG_BYE, "Leg Bye"),
        (EXTRA_PENALTY, "Penalty Runs"),
    ]

    match = models.ForeignKey(Match, on_delete=models.CASCADE, related_name="ball_events")
    innings = models.ForeignKey(MatchInnings, on_delete=models.CASCADE, related_name="ball_events")
    sequence_number = models.PositiveIntegerField(db_index=True)
    idempotency_key = models.CharField(max_length=100, unique=True)

    over_number = models.PositiveIntegerField(default=0)
    ball_in_over = models.PositiveIntegerField(default=1)
    is_legal_delivery = models.BooleanField(default=True)

    striker = models.ForeignKey(
        Player,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="balls_faced_events",
    )
    non_striker = models.ForeignKey(
        Player,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="non_striker_events",
    )
    bowler = models.ForeignKey(
        Player,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="balls_bowled_events",
    )

    runs_off_bat = models.PositiveIntegerField(default=0)
    extra_type = models.CharField(max_length=16, choices=EXTRA_CHOICES, default=EXTRA_NONE)
    extra_runs = models.PositiveIntegerField(default=0)
    total_runs = models.PositiveIntegerField(default=0)

    is_wicket = models.BooleanField(default=False)
    wicket_type = models.CharField(
        max_length=24,
        choices=BattingPerformance.DISMISSAL_CHOICES,
        blank=True,
    )
    dismissed_player = models.ForeignKey(
        Player,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="dismissal_events",
    )
    fielder_name = models.CharField(max_length=80, blank=True)

    strike_rotated = models.BooleanField(default=False)
    over_completed = models.BooleanField(default=False)
    commentary = models.CharField(max_length=300, blank=True)

    # Snapshot before ball for deterministic Undo Last Ball
    pre_ball_snapshot = models.JSONField(default=dict, blank=True)
    is_undone = models.BooleanField(default=False, db_index=True)
    undone_at = models.DateTimeField(null=True, blank=True)
    undone_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="undone_ball_events",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="scored_ball_events",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["innings", "sequence_number"]

    def __str__(self) -> str:
        return f"Match #{self.match_id} Inn {self.innings.innings_number} Ball #{self.sequence_number} ({self.over_number}.{self.ball_in_over})"


class ScoreCorrection(models.Model):
    match = models.ForeignKey(Match, on_delete=models.CASCADE, related_name="score_corrections")
    innings = models.ForeignKey(
        MatchInnings,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="score_corrections",
    )
    correction_type = models.CharField(
        max_length=32,
        choices=[
            ("MANUAL_EDIT", "Manual Score Update"),
            ("BALL_RECONCILIATION", "Reconciliation Override Over Ball Events"),
            ("UNDO_BALL", "Undo Last Ball"),
            ("RESULT_CORRECTION", "Finalized Result Correction"),
        ],
        default="MANUAL_EDIT",
    )
    previous_state = models.JSONField(default=dict)
    new_state = models.JSONField(default=dict)
    reason = models.CharField(max_length=280)
    reconciled_from_ball_events = models.BooleanField(default=False)
    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="score_corrections",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.correction_type} on Match #{self.match_id} ({self.reason})"


class MatchResult(models.Model):
    RESULT_WON_BY_RUNS = "WON_BY_RUNS"
    RESULT_WON_BY_WICKETS = "WON_BY_WICKETS"
    RESULT_TIE = "TIE"
    RESULT_NO_RESULT = "NO_RESULT"
    RESULT_ABANDONED = "ABANDONED"
    RESULT_CUSTOM = "CUSTOM"

    RESULT_CHOICES = [
        (RESULT_WON_BY_RUNS, "Won by runs"),
        (RESULT_WON_BY_WICKETS, "Won by wickets"),
        (RESULT_TIE, "Tie"),
        (RESULT_NO_RESULT, "No Result"),
        (RESULT_ABANDONED, "Abandoned"),
        (RESULT_CUSTOM, "Custom Result"),
    ]

    match = models.OneToOneField(
        Match,
        on_delete=models.CASCADE,
        related_name="result",
    )
    winning_team = models.ForeignKey(
        Team,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="matches_won",
    )
    runner_up_team = models.ForeignKey(
        Team,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="matches_lost",
    )
    victory_type = models.CharField(
        max_length=24,
        choices=RESULT_CHOICES,
        default=RESULT_WON_BY_RUNS,
    )
    victory_margin = models.CharField(max_length=80, blank=True)
    result_summary = models.CharField(max_length=240)
    player_of_the_match = models.ForeignKey(
        Player,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="potm_awards",
    )
    player_of_the_match_name = models.CharField(max_length=120, blank=True)
    result_notes = models.TextField(blank=True)

    # Contradiction detection & explicit review
    has_score_contradiction = models.BooleanField(default=False)
    contradiction_warning = models.CharField(max_length=300, blank=True)
    contradiction_acknowledged = models.BooleanField(default=False)

    is_finalized = models.BooleanField(default=True)
    finalized_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="finalized_results",
    )
    finalized_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-finalized_at"]

    def __str__(self) -> str:
        return f"{self.match.title}: {self.result_summary}"


class MatchAward(models.Model):
    AWARD_POTM = "PLAYER_OF_THE_MATCH"
    AWARD_BEST_BATTER = "BEST_BATTER"
    AWARD_BEST_BOWLER = "BEST_BOWLER"
    AWARD_MOST_SIXES = "MOST_SIXES"
    AWARD_PLAYER_OF_TOURNAMENT = "PLAYER_OF_THE_TOURNAMENT"

    AWARD_CHOICES = [
        (AWARD_POTM, "Player of the Match"),
        (AWARD_BEST_BATTER, "Best Batting Performance"),
        (AWARD_BEST_BOWLER, "Best Bowling Performance"),
        (AWARD_MOST_SIXES, "Maximum Sixes Award"),
        (AWARD_PLAYER_OF_TOURNAMENT, "Player of the Tournament"),
    ]

    match = models.ForeignKey(
        Match,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="awards",
    )
    tournament = models.ForeignKey(
        Tournament,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="awards",
    )
    player = models.ForeignKey(
        Player,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="awards",
    )
    player_name = models.CharField(max_length=120)
    team = models.ForeignKey(
        Team,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="awards",
    )
    award_type = models.CharField(max_length=32, choices=AWARD_CHOICES, default=AWARD_POTM)
    performance_summary = models.CharField(max_length=160, blank=True)
    is_manual_award = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.get_award_type_display()}: {self.player_name}"


class TournamentStanding(models.Model):
    tournament = models.ForeignKey(
        Tournament,
        on_delete=models.CASCADE,
        related_name="standings",
    )
    group = models.ForeignKey(
        TournamentGroup,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="standings",
    )
    team = models.ForeignKey(
        Team,
        on_delete=models.CASCADE,
        related_name="tournament_standings",
    )
    rank = models.PositiveIntegerField(default=1, db_index=True)

    # Calculated fields from finalized tournament matches
    calculated_played = models.PositiveIntegerField(default=0)
    calculated_won = models.PositiveIntegerField(default=0)
    calculated_lost = models.PositiveIntegerField(default=0)
    calculated_tied = models.PositiveIntegerField(default=0)
    calculated_no_result = models.PositiveIntegerField(default=0)
    calculated_points = models.IntegerField(default=0)
    calculated_nrr = models.DecimalField(max_digits=7, decimal_places=3, default=Decimal("0.000"))

    runs_scored = models.PositiveIntegerField(default=0)
    balls_faced_for_nrr = models.PositiveIntegerField(default=0)
    runs_conceded = models.PositiveIntegerField(default=0)
    balls_bowled_for_nrr = models.PositiveIntegerField(default=0)

    # Effective display fields (incorporating active StandingAdjustment without overwriting manual adjustments)
    played = models.PositiveIntegerField(default=0)
    won = models.PositiveIntegerField(default=0)
    lost = models.PositiveIntegerField(default=0)
    tied = models.PositiveIntegerField(default=0)
    no_result = models.PositiveIntegerField(default=0)
    points = models.IntegerField(default=0)
    net_run_rate = models.DecimalField(max_digits=7, decimal_places=3, default=Decimal("0.000"))
    has_manual_adjustment = models.BooleanField(default=False)
    adjustment_note = models.CharField(max_length=240, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["tournament", "rank", "-points", "-net_run_rate"]
        unique_together = [("tournament", "team")]

    def __str__(self) -> str:
        return f"#{self.rank} {self.team.short_name} ({self.points} pts, NRR {self.net_run_rate})"


class StandingAdjustment(models.Model):
    """
    Authorized manual adjustment to a team's tournament standing.
    Preserved across automatic recalculations so manual adjustments are never silently overwritten.
    """
    standing = models.ForeignKey(
        TournamentStanding,
        on_delete=models.CASCADE,
        related_name="adjustments",
    )
    tournament = models.ForeignKey(
        Tournament,
        on_delete=models.CASCADE,
        related_name="standing_adjustments",
    )
    team = models.ForeignKey(
        Team,
        on_delete=models.CASCADE,
        related_name="standing_adjustments",
    )
    points_delta = models.IntegerField(default=0, help_text="Bonus or penalty points added to calculated points")
    nrr_delta = models.DecimalField(max_digits=6, decimal_places=3, default=Decimal("0.000"))
    override_played = models.PositiveIntegerField(null=True, blank=True)
    override_won = models.PositiveIntegerField(null=True, blank=True)
    override_lost = models.PositiveIntegerField(null=True, blank=True)
    override_tied = models.PositiveIntegerField(null=True, blank=True)
    override_no_result = models.PositiveIntegerField(null=True, blank=True)
    override_points = models.IntegerField(null=True, blank=True)
    override_nrr = models.DecimalField(max_digits=7, decimal_places=3, null=True, blank=True)
    reason = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="standing_adjustments",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Standing Adjustment: {self.team.short_name} in {self.tournament.name} ({self.reason})"


class TournamentWinner(models.Model):
    tournament = models.ForeignKey(
        Tournament,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="winner_records",
    )
    tournament_name = models.CharField(max_length=160)
    tournament_year = models.PositiveIntegerField(default=2026, db_index=True)
    winning_team = models.ForeignKey(
        Team,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="championships_won",
    )
    winning_team_name = models.CharField(max_length=120)
    winning_team_logo = models.CharField(max_length=500, blank=True)
    runner_up_team = models.ForeignKey(
        Team,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="runner_up_finishes",
    )
    runner_up_team_name = models.CharField(max_length=120)
    final_match = models.ForeignKey(
        Match,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="champion_showcase",
    )
    winner_photograph = models.CharField(max_length=500, blank=True)
    trophy_graphic = models.CharField(max_length=500, default="golden-cup", blank=True)
    final_match_summary = models.CharField(max_length=260)
    player_of_the_tournament = models.CharField(max_length=120, blank=True)
    prize_amount = models.CharField(max_length=100, blank=True)
    display_order = models.PositiveIntegerField(default=1)
    is_visible = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-tournament_year", "display_order"]

    def __str__(self) -> str:
        return f"{self.tournament_name} ({self.tournament_year}) — Champion: {self.winning_team_name}"


class NewsPost(models.Model):
    CATEGORY_ANNOUNCEMENT = "ANNOUNCEMENT"
    CATEGORY_REGISTRATION = "REGISTRATION"
    CATEGORY_SCHEDULE = "SCHEDULE_CHANGE"
    CATEGORY_POSTPONEMENT = "POSTPONEMENT"
    CATEGORY_FINALS = "UPCOMING_FINALS"
    CATEGORY_GENERAL = "GENERAL_NEWS"

    CATEGORY_CHOICES = [
        (CATEGORY_ANNOUNCEMENT, "Tournament Announcement"),
        (CATEGORY_REGISTRATION, "Team Registration Update"),
        (CATEGORY_SCHEDULE, "Schedule Change"),
        (CATEGORY_POSTPONEMENT, "Match Postponement"),
        (CATEGORY_FINALS, "Upcoming Finals"),
        (CATEGORY_GENERAL, "General Cricket News"),
    ]

    title = models.CharField(max_length=200)
    title_kn = models.CharField(max_length=200, blank=True)
    slug = models.SlugField(max_length=220, unique=True, blank=True)
    category = models.CharField(max_length=32, choices=CATEGORY_CHOICES, default=CATEGORY_ANNOUNCEMENT)
    summary = models.CharField(max_length=320)
    content = models.TextField()
    image_url = models.CharField(max_length=500, blank=True)
    tournament = models.ForeignKey(
        Tournament,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="news_posts",
    )
    is_pinned = models.BooleanField(default=False)
    is_published = models.BooleanField(default=True, db_index=True)
    published_at = models.DateTimeField(default=timezone.now)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="news_posts",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-is_pinned", "-published_at"]

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.title) or "news"
            slug_candidate = base
            idx = 1
            while NewsPost.objects.filter(slug=slug_candidate).exclude(pk=self.pk).exists():
                idx += 1
                slug_candidate = f"{base}-{idx}"
            self.slug = slug_candidate
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.title


class GalleryImage(models.Model):
    CATEGORY_MATCH = "MATCH"
    CATEGORY_CEREMONY = "OPENING_CEREMONY"
    CATEGORY_TEAM = "TEAM"
    CATEGORY_TROPHY = "TROPHY"
    CATEGORY_PLAYER = "PLAYER"
    CATEGORY_GROUND = "GROUND"

    CATEGORY_CHOICES = [
        (CATEGORY_MATCH, "Match Photographs"),
        (CATEGORY_CEREMONY, "Tournament Opening Ceremonies"),
        (CATEGORY_TEAM, "Team Photographs"),
        (CATEGORY_TROPHY, "Trophy Presentation Images"),
        (CATEGORY_PLAYER, "Player Photographs"),
        (CATEGORY_GROUND, "Ground Images"),
    ]

    title = models.CharField(max_length=160)
    caption = models.CharField(max_length=280, blank=True)
    category = models.CharField(max_length=32, choices=CATEGORY_CHOICES, default=CATEGORY_MATCH, db_index=True)
    image_url = models.CharField(max_length=500)
    alt_text = models.CharField(max_length=180, blank=True)
    tournament = models.ForeignKey(
        Tournament,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="gallery_images",
    )
    match = models.ForeignKey(
        Match,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="gallery_images",
    )
    display_order = models.PositiveIntegerField(default=1, db_index=True)
    is_visible = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["display_order", "-created_at"]

    def __str__(self) -> str:
        return f"{self.title} ({self.category})"


class Sponsor(models.Model):
    TIER_TITLE = "TITLE"
    TIER_GOLD = "GOLD"
    TIER_SILVER = "SILVER"
    TIER_COMMUNITY = "COMMUNITY"

    TIER_CHOICES = [
        (TIER_TITLE, "Title Sponsor"),
        (TIER_GOLD, "Gold Partner"),
        (TIER_SILVER, "Silver Partner"),
        (TIER_COMMUNITY, "Village & Community Supporter"),
    ]

    name = models.CharField(max_length=140)
    logo_url = models.CharField(max_length=500, blank=True)
    website_url = models.CharField(max_length=300, blank=True)
    tier = models.CharField(max_length=24, choices=TIER_CHOICES, default=TIER_GOLD)
    tagline = models.CharField(max_length=180, blank=True)
    tournament = models.ForeignKey(
        Tournament,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sponsors",
    )
    display_order = models.PositiveIntegerField(default=1, db_index=True)
    is_visible = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["display_order", "name"]

    def __str__(self) -> str:
        return f"{self.name} ({self.tier})"


class ContactMessage(models.Model):
    STATUS_NEW = "NEW"
    STATUS_READ = "READ"
    STATUS_RESOLVED = "RESOLVED"
    STATUS_SPAM = "SPAM"

    name = models.CharField(max_length=120)
    email = models.EmailField()
    phone = models.CharField(max_length=32, blank=True)
    village = models.CharField(max_length=120, blank=True)
    subject = models.CharField(max_length=180)
    message = models.TextField()
    honeypot = models.CharField(max_length=120, blank=True)
    ip_address = models.CharField(max_length=64, blank=True)
    status = models.CharField(
        max_length=20,
        choices=[
            (STATUS_NEW, "New"),
            (STATUS_READ, "Read"),
            (STATUS_RESOLVED, "Resolved"),
            (STATUS_SPAM, "Spam"),
        ],
        default=STATUS_NEW,
        db_index=True,
    )
    admin_reply_notes = models.TextField(blank=True)
    handled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="handled_messages",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.name} — {self.subject} ({self.status})"


class AuditLog(models.Model):
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    actor_name = models.CharField(max_length=120, default="System")
    actor_role = models.CharField(max_length=40, default="SUPER_ADMIN")
    action = models.CharField(max_length=80, db_index=True)
    module = models.CharField(max_length=60, db_index=True)
    target_type = models.CharField(max_length=60)
    target_id = models.CharField(max_length=60, blank=True)
    description = models.CharField(max_length=300)
    before_state = models.JSONField(default=dict, blank=True)
    after_state = models.JSONField(default=dict, blank=True)
    ip_address = models.CharField(max_length=64, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"[{self.created_at:%Y-%m-%d %H:%M}] {self.actor_name} - {self.action} ({self.module})"
