"""
Management command: `python manage.py seed_village_cricket`
Seeds demonstration data for Village Cricket Live:
- Admin roles & default accounts (`admin` / `Admin@2026`, `scorer` / `Scorer@2026`, `editor` / `Editor@2026`)
- Website CMS settings, 12 navigation items, and Homepage Sections A through O
- Announcements, News posts, Sponsors, and Gallery images
- Active tournament ("Gramina Premier League 2026") + Past tournament ("Cauvery Village Cup 2025")
- 6 authentic village teams (Hadinaru Royal Strikers, Nanjangud Warriors, Mysuru Mavericks, Kabini Kings, Chamundi Tigers, Cauvery Challengers)
- 24 players with roles, styles, and stats
- Live match in progress, upcoming fixtures, completed matches with scorecards, and tournament standings
"""
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from cricket.models import (
    AdminRole,
    Announcement,
    BattingPerformance,
    BowlingPerformance,
    GalleryImage,
    HomepageSection,
    Match,
    MatchAward,
    MatchInnings,
    NavigationItem,
    NewsPost,
    Player,
    Sponsor,
    Team,
    TeamMembership,
    Tournament,
    TournamentGroup,
    TournamentRegistration,
    TournamentStage,
    TournamentWinner,
    User,
    WebsiteSettings,
)
from cricket.services import (
    CricketScoringService,
    StandingsCalculationService,
    ensure_match_innings,
)


class Command(BaseCommand):
    help = "Seed demonstration teams, players, tournaments, live/upcoming/completed matches, and CMS content for Village Cricket Live."

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write("Seeding Village Cricket Live database...")

        # 1. Admin Roles
        roles_spec = [
            (
                AdminRole.ROLE_SUPER_ADMIN,
                "Super Admin",
                "Full control over all settings, users, tournaments, matches, and CMS.",
                True,
            ),
            (
                AdminRole.ROLE_TOURNAMENT_ADMIN,
                "Tournament Admin",
                "Manages assigned tournaments, teams, players, fixtures, and standings.",
                False,
            ),
            (
                AdminRole.ROLE_SCORER,
                "Match Scorer",
                "Operates live manual and ball-by-ball scoring for assigned matches.",
                False,
            ),
            (
                AdminRole.ROLE_CONTENT_EDITOR,
                "Content Editor",
                "Manages homepage CMS, gallery, announcements, news, and sponsors.",
                False,
            ),
        ]
        role_map = {}
        for code, name, desc, full in roles_spec:
            role_obj, _ = AdminRole.objects.update_or_create(
                code=code,
                defaults={
                    "name": name,
                    "description": desc,
                    "can_manage_users": full,
                    "can_manage_settings": full,
                    "can_manage_tournaments": code in (AdminRole.ROLE_SUPER_ADMIN, AdminRole.ROLE_TOURNAMENT_ADMIN),
                    "can_manage_teams_players": code in (AdminRole.ROLE_SUPER_ADMIN, AdminRole.ROLE_TOURNAMENT_ADMIN),
                    "can_manage_matches": code != AdminRole.ROLE_CONTENT_EDITOR,
                    "can_score_matches": code in (AdminRole.ROLE_SUPER_ADMIN, AdminRole.ROLE_TOURNAMENT_ADMIN, AdminRole.ROLE_SCORER),
                    "can_finalize_results": code in (AdminRole.ROLE_SUPER_ADMIN, AdminRole.ROLE_TOURNAMENT_ADMIN, AdminRole.ROLE_SCORER),
                    "can_manage_cms": code in (AdminRole.ROLE_SUPER_ADMIN, AdminRole.ROLE_CONTENT_EDITOR),
                },
            )
            role_map[code] = role_obj

        # 2. Admin Users
        admin_user, created = User.objects.get_or_create(
            username="admin",
            defaults={
                "email": "admin@villagecricketlive.in",
                "first_name": "Suman",
                "last_name": "Administrator",
                "role_code": User.ROLE_SUPER_ADMIN,
                "admin_role": role_map[AdminRole.ROLE_SUPER_ADMIN],
                "village": "Hadinaru",
                "phone": "+91 98450 11223",
                "is_staff": True,
                "is_superuser": True,
            },
        )
        if created:
            admin_user.set_password("Admin@2026")
            admin_user.save()

        scorer_user, created = User.objects.get_or_create(
            username="scorer",
            defaults={
                "email": "scorer@villagecricketlive.in",
                "first_name": "Ramesh",
                "last_name": "Official Scorer",
                "role_code": User.ROLE_SCORER,
                "admin_role": role_map[AdminRole.ROLE_SCORER],
                "village": "Hadinaru",
                "is_staff": True,
            },
        )
        if created:
            scorer_user.set_password("Scorer@2026")
            scorer_user.save()

        editor_user, created = User.objects.get_or_create(
            username="editor",
            defaults={
                "email": "editor@villagecricketlive.in",
                "first_name": "Kiran",
                "last_name": "Media Editor",
                "role_code": User.ROLE_CONTENT_EDITOR,
                "admin_role": role_map[AdminRole.ROLE_CONTENT_EDITOR],
                "village": "Nanjangud",
                "is_staff": True,
            },
        )
        if created:
            editor_user.set_password("Editor@2026")
            editor_user.save()

        # 3. Website Settings & Navigation Items (12 links)
        WebsiteSettings.get_solo()

        nav_items = [
            ("Home", "ಮುಖಪುಟ", "home", "/", "primary", 1, False),
            ("Live Scores", "ಲೈವ್ ಸ್ಕೋರ್", "live-scores", "/live-scores", "primary", 2, False),
            ("Matches", "ಪಂದ್ಯಗಳು", "matches", "/matches", "primary", 3, False),
            ("Tournaments", "ಪಂದ್ಯಾವಳಿಗಳು", "tournaments", "/tournaments", "primary", 4, False),
            ("Teams", "ತಂಡಗಳು", "teams", "/teams", "primary", 5, False),
            ("Players", "ಆಟಗಾರರು", "players", "/players", "primary", 6, False),
            ("Points Table", "ಅಂಕಪಟ್ಟಿ", "points-table", "/points-table", "primary", 7, False),
            ("Results", "ಫಲಿತಾಂಶಗಳು", "results", "/results", "dropdown", 8, True),
            ("Winners", "ವಿಜೇತರು", "winners", "/winners", "dropdown", 9, True),
            ("Gallery", "ಗ್ಯಾಲರಿ", "gallery", "/gallery", "dropdown", 10, True),
            ("About Us", "ನಮ್ಮ ಬಗ್ಗೆ", "about", "/about", "dropdown", 11, True),
            ("Contact Us", "ಸಂಪರ್ಕಿಸಿ", "contact", "/contact", "dropdown", 12, True),
        ]
        for label, label_kn, slug, path, group, order, is_opt in nav_items:
            NavigationItem.objects.update_or_create(
                slug=slug,
                defaults={
                    "label": label,
                    "label_kn": label_kn,
                    "path": path,
                    "group_name": group,
                    "display_order": order,
                    "is_visible": True,
                    "is_optional": is_opt,
                },
            )

        # 4. Homepage Sections A through O
        sections_spec = [
            ("SECTION_A", "Top Announcement Bar", "ಪ್ರಮುಖ ಪ್ರಕಟಣೆ", "Breaking tournament alerts", 1),
            ("SECTION_B", "Header and Navigation", "ಮುಖ್ಯ ನ್ಯಾವಿಗೇಷನ್", "Sticky header", 2),
            ("SECTION_C", "Hero Banner", "ಹೀರೋ ವಿಭಾಗ", "Where Village Cricket Comes Alive", 3),
            ("SECTION_D", "Live Cricket Matches", "ನೇರ ಕ್ರಿಕೆಟ್ ಪಂದ್ಯಗಳು", "Real-time ball-by-ball action from village grounds", 4),
            ("SECTION_E", "Upcoming Matches", "ಮುಂಬರುವ ಪಂದ್ಯಗಳು", "Scheduled tournament & friendly fixtures", 5),
            ("SECTION_F", "Recent Match Results", "ಇತ್ತೀಚಿನ ಫಲಿತಾಂಶಗಳು", "Finalized scorecards and victory margins", 6),
            ("SECTION_G", "Active & Upcoming Tournaments", "ಪಂದ್ಯಾವಳಿಗಳ ಮಾಹಿತಿ", "Official panchayat and district cricket cups", 7),
            ("SECTION_H", "Featured Village Teams", "ಪ್ರಮುಖ ಹಳ್ಳಿ ತಂಡಗಳು", "Registered squads representing local villages", 8),
            ("SECTION_I", "Points Table Standings", "ಅಂಕಪಟ್ಟಿ ಮುನ್ನೋಟ", "Live tournament standings and Net Run Rate", 9),
            ("SECTION_J", "Tournament Top Players", "ಶ್ರೇಷ್ಠ ಆಟಗಾರರು", "Orange Cap, Purple Cap & MVP leaders", 10),
            ("SECTION_K", "Hall of Champions", "ಪಂದ್ಯಾವಳಿ ವಿಜೇತರು", "Celebrating past and present trophy winners", 11),
            ("SECTION_L", "Cricket Photo Gallery", "ಫೋಟೋ ಗ್ಯಾಲರಿ", "Memorable moments from ceremonies and finals", 12),
            ("SECTION_M", "Official Sponsors & Partners", "ಪ್ರಾಯೋಜಕರು", "Local businesses supporting village sports", 13),
            ("SECTION_N", "Latest News & Announcements", "ಇತ್ತೀಚಿನ ಸುದ್ದಿಗಳು", "Official updates from tournament organizers", 14),
            ("SECTION_O", "Footer", "ಫೂಟರ್", "Quick links and organizer contact", 15),
        ]
        for key, title, title_kn, sub, order in sections_spec:
            HomepageSection.objects.update_or_create(
                section_key=key,
                defaults={
                    "title": title,
                    "title_kn": title_kn,
                    "subtitle": sub,
                    "display_order": order,
                    "is_visible": True,
                },
            )

        # 5. Announcements
        Announcement.objects.update_or_create(
            text="Village Premier League 2026 — Team Registration & Knockout Fixtures Live!",
            defaults={
                "text_kn": "ಗ್ರಾಮೀಣ ಪ್ರೀಮಿಯರ್ ಲೀಗ್ 2026 — ತಂಡಗಳ ನೋಂದಣಿ ಮತ್ತು ವೇಳಾಪಟ್ಟಿ ಪ್ರಕಟವಾಗಿದೆ!",
                "badge_label": "SEASON 2026",
                "link_url": "/tournaments",
                "link_text": "Explore Fixtures",
                "is_visible": True,
                "priority": 10,
            },
        )

        # 6. Teams (6 Village Teams)
        teams_spec = [
            (
                "Royal Strikers Hadinaru",
                "RSH",
                "#10B981",
                "Hadinaru",
                "Darshan Gowda",
                "Hadinaru Panchayat Main Ground",
                "Two-time Gramina Cup finalists known for explosive top-order batting and disciplined death bowling.",
                "Champions — Cauvery Cup 2024, Finalists — Mysuru Gramina Shield 2025",
            ),
            (
                "Village Warriors Nanjangud",
                "VWN",
                "#F59E0B",
                "Nanjangud",
                "Chethan Kumar",
                "Kapila Riverfront Sports Arena",
                "Fierce pace attack and athletic fielding unit representing Nanjangud Taluk.",
                "Winners — Kapila Floodlight Trophy 2025",
            ),
            (
                "Mysuru Mavericks XI",
                "MMX",
                "#3B82F6",
                "Mysuru South",
                "Pavan Raj",
                "Chamundi Foothills Cricket Oval",
                "Balanced all-round squad blending experienced tournament veterans with emerging U-21 talent.",
                "Semi-Finalists — District Panchayat League 2025",
            ),
            (
                "Kabini Kings Sutturu",
                "KKS",
                "#8B5CF6",
                "Sutturu",
                "Manjunath S",
                "Sutturu Riverbank Ground",
                "Renowned for spin-choke middle overs and high-pressure chase finishes.",
                "Champions — Sutturu Jathre Cricket Cup 2025",
            ),
            (
                "Chamundi Tigers Varuna",
                "CTV",
                "#EF4444",
                "Varuna",
                "Sharath Chandra",
                "Varuna High School Stadium",
                "Aggressive power-hitting side holding the tournament record for highest T10 total (148/3).",
                "Winners — Varuna Super Sixes 2024",
            ),
            (
                "Cauvery Challengers T. Narasipura",
                "CCT",
                "#EC4899",
                "T. Narasipura",
                "Naveen Murthy",
                "Triveni Sangama Sports Complex",
                "Tactical unit built around sharp wicket-keeping and yorker specialists.",
                "Runners-Up — Cauvery Village Cup 2025",
            ),
        ]
        teams = {}
        for name, short, color, village, captain, ground, desc, ach in teams_spec:
            team_obj, _ = Team.objects.update_or_create(
                name=name,
                defaults={
                    "short_name": short,
                    "primary_color": color,
                    "village": village,
                    "captain_name": captain,
                    "home_ground": ground,
                    "description": desc,
                    "achievements": ach,
                    "manager_contact_name": f"{captain} (Captain)",
                    "manager_contact_phone": "+91 98450 99000",
                    "is_featured": True,
                },
            )
            teams[short] = team_obj

        # 7. Players (4 key players per team = 24 players)
        players_spec = [
            # RSH
            ("Darshan Gowda", "RSH", Player.ROLE_ALL_ROUNDER, 7, True, 14, 412, 84, 14, "3/12", True, "Player of the Series 2025"),
            ("Abhishek Urs", "RSH", Player.ROLE_BATTER, 18, False, 12, 345, 76, 2, "1/14", True, ""),
            ("Kiran Nayak", "RSH", Player.ROLE_WICKET_KEEPER, 1, False, 12, 260, 62, 0, "0/0", True, ""),
            ("Pradeep Shetty", "RSH", Player.ROLE_BOWLER, 99, False, 14, 88, 28, 21, "4/9", True, "Purple Cap Winner 2025"),
            # VWN
            ("Chethan Kumar", "VWN", Player.ROLE_BATTER, 10, True, 13, 388, 79, 4, "1/18", True, "Best Batter 2025"),
            ("Harish Babu", "VWN", Player.ROLE_ALL_ROUNDER, 45, False, 13, 274, 65, 15, "3/15", True, ""),
            ("Lokesh M", "VWN", Player.ROLE_BOWLER, 23, False, 11, 54, 19, 18, "4/14", True, ""),
            ("Suresh Acharya", "VWN", Player.ROLE_WICKET_KEEPER, 17, False, 11, 198, 52, 0, "0/0", False, ""),
            # MMX
            ("Pavan Raj", "MMX", Player.ROLE_ALL_ROUNDER, 8, True, 10, 290, 71, 12, "3/18", True, ""),
            ("Rohit Kulkarni", "MMX", Player.ROLE_BATTER, 12, False, 10, 310, 81, 0, "0/0", True, ""),
            ("Sagar Devegowda", "MMX", Player.ROLE_BOWLER, 33, False, 10, 42, 16, 16, "3/11", True, ""),
            ("Vinay Prasad", "MMX", Player.ROLE_WICKET_KEEPER, 5, False, 9, 175, 48, 0, "0/0", False, ""),
            # KKS
            ("Manjunath S", "KKS", Player.ROLE_ALL_ROUNDER, 11, True, 12, 325, 68, 17, "4/10", True, ""),
            ("Deepak Hegde", "KKS", Player.ROLE_BATTER, 9, False, 12, 284, 64, 1, "1/12", False, ""),
            ("Anil Kumar", "KKS", Player.ROLE_BOWLER, 44, False, 12, 39, 15, 19, "4/8", True, ""),
            ("Mahesh Poojary", "KKS", Player.ROLE_WICKET_KEEPER, 21, False, 11, 165, 44, 0, "0/0", False, ""),
            # CTV
            ("Sharath Chandra", "CTV", Player.ROLE_BATTER, 3, True, 11, 402, 92, 3, "1/20", True, "Maximum Sixes Award"),
            ("Yogesh Rao", "CTV", Player.ROLE_ALL_ROUNDER, 27, False, 11, 215, 58, 11, "2/14", False, ""),
            ("Nitin Shenoy", "CTV", Player.ROLE_BOWLER, 66, False, 11, 48, 21, 14, "3/16", False, ""),
            ("Karthik Pai", "CTV", Player.ROLE_WICKET_KEEPER, 14, False, 10, 180, 51, 0, "0/0", False, ""),
            # CCT
            ("Naveen Murthy", "CCT", Player.ROLE_WICKET_KEEPER, 77, True, 11, 295, 73, 0, "0/0", True, ""),
            ("Sunil Ramesh", "CCT", Player.ROLE_ALL_ROUNDER, 19, False, 11, 240, 60, 13, "3/13", False, ""),
            ("Arjun Bhat", "CCT", Player.ROLE_BATTER, 24, False, 10, 268, 66, 0, "0/0", False, ""),
            ("Ganesh Kamath", "CCT", Player.ROLE_BOWLER, 88, False, 11, 31, 14, 15, "3/10", False, ""),
        ]
        players_map = {}
        for (
            p_name,
            t_short,
            role,
            jersey,
            is_capt,
            m_matches,
            m_runs,
            m_high,
            m_wkts,
            m_bb,
            approved,
            award_title,
        ) in players_spec:
            team_obj = teams[t_short]
            player_obj, _ = Player.objects.update_or_create(
                name=p_name,
                team=team_obj,
                jersey_number=jersey,
                defaults={
                    "village": team_obj.village,
                    "playing_role": role,
                    "is_captain": is_capt,
                    "batting_style": "Right-hand bat",
                    "bowling_style": "Right-arm medium-fast",
                    "manual_matches": m_matches,
                    "manual_runs": m_runs,
                    "manual_highest_score": m_high,
                    "manual_wickets": m_wkts,
                    "manual_best_bowling": m_bb,
                    "manual_stats_approved": approved,
                    "manual_award_title": award_title,
                    "is_featured": is_capt or m_runs > 340 or m_wkts >= 18,
                },
            )
            players_map[p_name] = player_obj
            TeamMembership.objects.get_or_create(
                player=player_obj,
                team=team_obj,
                season_year=2026,
                defaults={
                    "jersey_number": jersey,
                    "role_in_team": player_obj.get_playing_role_display(),
                    "is_captain": is_capt,
                    "is_active": True,
                },
            )

        # 8. Tournaments
        today = date.today()
        active_tournament, _ = Tournament.objects.update_or_create(
            name="Village Premier League 2026",
            season_year=2026,
            defaults={
                "description": (
                    "The flagship 10-over inter-village cricket championship uniting 6 premier panchayat squads "
                    "across Hadinaru, Nanjangud, Sutturu, Varuna, and Mysuru."
                ),
                "organizer_name": "Hadinaru & District Gramina Cricket Association",
                "organizer_contact": "+91 98450 11223",
                "village": "Hadinaru",
                "ground_name": "Hadinaru Panchayat Main Cricket Ground",
                "start_date": today - timedelta(days=5),
                "end_date": today + timedelta(days=10),
                "match_format": Tournament.FORMAT_T10,
                "overs_per_innings": 10,
                "registration_status": "OPEN",
                "status": Tournament.STATUS_ONGOING,
                "max_teams": 8,
                "points_for_win": 2,
                "points_for_tie": 1,
                "points_for_no_result": 1,
                "prize_details": "Champion: ₹75,000 + Golden Gramina Trophy | Runner-Up: ₹40,000 + Silver Shield",
                "is_featured": True,
            },
        )

        past_tournament, _ = Tournament.objects.update_or_create(
            name="Cauvery Village Championship 2025",
            season_year=2025,
            defaults={
                "description": "Annual river-belt knockout and league cricket fiesta held across Mysuru district.",
                "organizer_name": "Cauvery Youth Sports Trust",
                "organizer_contact": "+91 98450 22334",
                "village": "Sutturu",
                "ground_name": "Sutturu Riverbank Stadium",
                "start_date": date(2025, 11, 1),
                "end_date": date(2025, 11, 15),
                "match_format": Tournament.FORMAT_T10,
                "overs_per_innings": 10,
                "registration_status": "CLOSED",
                "status": Tournament.STATUS_COMPLETED,
                "max_teams": 6,
                "prize_details": "Champion: ₹50,000 + Trophy | Runner-Up: ₹25,000",
                "is_featured": True,
            },
        )

        league_stage, _ = TournamentStage.objects.get_or_create(
            tournament=active_tournament,
            name="League Stage",
            defaults={"stage_type": TournamentStage.STAGE_LEAGUE, "stage_order": 1},
        )
        group_a, _ = TournamentGroup.objects.get_or_create(
            tournament=active_tournament,
            name="Pool A — Elite",
            defaults={"stage": league_stage, "qualifying_teams_count": 4, "display_order": 1},
        )

        for idx, team_obj in enumerate(teams.values(), start=1):
            TournamentRegistration.objects.get_or_create(
                tournament=active_tournament,
                team=team_obj,
                defaults={"group": group_a, "seed_number": idx, "status": "APPROVED"},
            )

        # 9. Matches (Completed, Live, Upcoming, and Friendly)
        # Match 1: Completed Tournament Match (RSH defeated VWN by 25 runs)
        m1, _ = Match.objects.update_or_create(
            title="Royal Strikers Hadinaru vs Village Warriors Nanjangud",
            match_date=today - timedelta(days=2),
            defaults={
                "match_number": 1,
                "match_type": Match.TYPE_TOURNAMENT,
                "tournament": active_tournament,
                "stage": league_stage,
                "group": group_a,
                "team_a": teams["RSH"],
                "team_b": teams["VWN"],
                "venue": "Hadinaru Panchayat Main Cricket Ground",
                "start_time": "10:00:00",
                "overs_per_innings": 10,
                "match_format": "T10",
                "status": Match.STATUS_COMPLETED,
                "scoring_mode": Match.SCORING_MODE_MANUAL,
                "toss_winner": teams["RSH"],
                "toss_decision": "BAT",
                "target_score": 119,
                "umpire_details": "M.shivanna & K. Basavaraj",
                "match_notes": "Opening blockbuster of Village Premier League 2026.",
            },
        )
        inn1_m1, inn2_m1 = ensure_match_innings(m1)
        inn1_m1.runs = 118
        inn1_m1.wickets = 4
        inn1_m1.completed_overs = 10
        inn1_m1.balls_in_over = 0
        inn1_m1.status = MatchInnings.STATUS_COMPLETED
        inn1_m1.save()

        inn2_m1.runs = 93
        inn2_m1.wickets = 7
        inn2_m1.completed_overs = 10
        inn2_m1.balls_in_over = 0
        inn2_m1.target_runs = 119
        inn2_m1.status = MatchInnings.STATUS_COMPLETED
        inn2_m1.save()

        BattingPerformance.objects.update_or_create(
            innings=inn1_m1,
            player=players_map["Darshan Gowda"],
            defaults={
                "batting_order": 1,
                "runs": 64,
                "balls_faced": 29,
                "fours": 6,
                "sixes": 5,
                "dismissal_text": "not out",
                "is_out": False,
            },
        )
        BowlingPerformance.objects.update_or_create(
            innings=inn2_m1,
            player=players_map["Pradeep Shetty"],
            defaults={
                "bowling_order": 1,
                "completed_overs": 2,
                "balls_in_over": 0,
                "runs_conceded": 12,
                "wickets": 3,
            },
        )
        CricketScoringService.finalize_match_result(
            match_id=m1.id,
            winning_team_id=teams["RSH"].id,
            victory_type="WON_BY_RUNS",
            victory_margin="25 runs",
            player_of_the_match_id=players_map["Darshan Gowda"].id,
            result_notes="Darshan Gowda smashed 64* (29) and Pradeep Shetty took 3/12.",
            actor=admin_user,
        )

        # Match 2: Completed Tournament Match (KKS defeated MMX by 6 wickets)
        m2, _ = Match.objects.update_or_create(
            title="Mysuru Mavericks XI vs Kabini Kings Sutturu",
            match_date=today - timedelta(days=1),
            defaults={
                "match_number": 2,
                "match_type": Match.TYPE_TOURNAMENT,
                "tournament": active_tournament,
                "stage": league_stage,
                "group": group_a,
                "team_a": teams["MMX"],
                "team_b": teams["KKS"],
                "venue": "Hadinaru Panchayat Main Cricket Ground",
                "start_time": "14:30:00",
                "overs_per_innings": 10,
                "match_format": "T10",
                "status": Match.STATUS_COMPLETED,
                "scoring_mode": Match.SCORING_MODE_MANUAL,
                "toss_winner": teams["KKS"],
                "toss_decision": "BOWL",
                "target_score": 96,
                "umpire_details": "R. Mahadev & S. Lokesh",
            },
        )
        inn1_m2, inn2_m2 = ensure_match_innings(m2)
        inn1_m2.batting_team = teams["MMX"]
        inn1_m2.bowling_team = teams["KKS"]
        inn1_m2.runs = 95
        inn1_m2.wickets = 6
        inn1_m2.completed_overs = 10
        inn1_m2.balls_in_over = 0
        inn1_m2.status = MatchInnings.STATUS_COMPLETED
        inn1_m2.save()

        inn2_m2.batting_team = teams["KKS"]
        inn2_m2.bowling_team = teams["MMX"]
        inn2_m2.runs = 98
        inn2_m2.wickets = 4
        inn2_m2.completed_overs = 8
        inn2_m2.balls_in_over = 4
        inn2_m2.target_runs = 96
        inn2_m2.status = MatchInnings.STATUS_COMPLETED
        inn2_m2.save()

        CricketScoringService.finalize_match_result(
            match_id=m2.id,
            winning_team_id=teams["KKS"].id,
            victory_type="WON_BY_WICKETS",
            victory_margin="6 wickets",
            player_of_the_match_id=players_map["Manjunath S"].id,
            result_notes="Kabini Kings chased 96 in 8.4 overs.",
            actor=admin_user,
        )

        # Match 3: Active LIVE Match (Royal Strikers Hadinaru vs Chamundi Tigers Varuna)
        m3, _ = Match.objects.update_or_create(
            title="Royal Strikers Hadinaru vs Chamundi Tigers Varuna",
            match_date=today,
            defaults={
                "match_number": 3,
                "match_type": Match.TYPE_TOURNAMENT,
                "tournament": active_tournament,
                "stage": league_stage,
                "group": group_a,
                "team_a": teams["RSH"],
                "team_b": teams["CTV"],
                "venue": "Hadinaru Panchayat Main Cricket Ground",
                "start_time": "15:00:00",
                "overs_per_innings": 10,
                "match_format": "T10",
                "status": Match.STATUS_LIVE,
                "scoring_mode": Match.SCORING_MODE_BALL_BY_BALL,
                "current_innings_number": 2,
                "toss_winner": teams["CTV"],
                "toss_decision": "BAT",
                "target_score": 112,
                "umpire_details": "M. Shivanna & K. Basavaraj",
                "assigned_scorer": scorer_user,
                "match_notes": "High-voltage clash under bright village sunshine! Royal Strikers chasing 112 in 10 overs.",
            },
        )
        inn1_m3, inn2_m3 = ensure_match_innings(m3)
        inn1_m3.batting_team = teams["CTV"]
        inn1_m3.bowling_team = teams["RSH"]
        inn1_m3.runs = 111
        inn1_m3.wickets = 5
        inn1_m3.completed_overs = 10
        inn1_m3.balls_in_over = 0
        inn1_m3.status = MatchInnings.STATUS_COMPLETED
        inn1_m3.save()

        inn2_m3.batting_team = teams["RSH"]
        inn2_m3.bowling_team = teams["CTV"]
        inn2_m3.runs = 78
        inn2_m3.wickets = 2
        inn2_m3.completed_overs = 6
        inn2_m3.balls_in_over = 3
        inn2_m3.target_runs = 112
        inn2_m3.striker = players_map["Darshan Gowda"]
        inn2_m3.non_striker = players_map["Abhishek Urs"]
        inn2_m3.current_bowler = players_map["Nitin Shenoy"]
        inn2_m3.partnership_runs = 44
        inn2_m3.partnership_balls = 21
        inn2_m3.status = MatchInnings.STATUS_IN_PROGRESS
        inn2_m3.save()

        BattingPerformance.objects.update_or_create(
            innings=inn2_m3,
            player=players_map["Darshan Gowda"],
            defaults={
                "batting_order": 1,
                "runs": 46,
                "balls_faced": 22,
                "fours": 5,
                "sixes": 3,
                "dismissal_text": "not out",
                "is_out": False,
            },
        )
        BattingPerformance.objects.update_or_create(
            innings=inn2_m3,
            player=players_map["Abhishek Urs"],
            defaults={
                "batting_order": 2,
                "runs": 24,
                "balls_faced": 14,
                "fours": 3,
                "sixes": 1,
                "dismissal_text": "not out",
                "is_out": False,
            },
        )
        BowlingPerformance.objects.update_or_create(
            innings=inn2_m3,
            player=players_map["Nitin Shenoy"],
            defaults={
                "bowling_order": 1,
                "completed_overs": 1,
                "balls_in_over": 3,
                "runs_conceded": 16,
                "wickets": 1,
            },
        )

        # Match 4: Upcoming Tournament Match
        m4, _ = Match.objects.update_or_create(
            title="Village Warriors Nanjangud vs Cauvery Challengers T. Narasipura",
            match_date=today + timedelta(days=1),
            defaults={
                "match_number": 4,
                "match_type": Match.TYPE_TOURNAMENT,
                "tournament": active_tournament,
                "stage": league_stage,
                "group": group_a,
                "team_a": teams["VWN"],
                "team_b": teams["CCT"],
                "venue": "Hadinaru Panchayat Main Cricket Ground",
                "start_time": "14:00:00",
                "overs_per_innings": 10,
                "match_format": "T10",
                "status": Match.STATUS_UPCOMING,
                "scoring_mode": Match.SCORING_MODE_MANUAL,
                "match_notes": "Crucial Pool A encounter for semi-final qualification.",
            },
        )
        ensure_match_innings(m4)

        # Match 5: Upcoming Friendly Match (Independent of Tournament)
        m5, _ = Match.objects.update_or_create(
            title="Hadinaru Festival Friendly XI vs Sutturu Brothers",
            match_date=today + timedelta(days=2),
            defaults={
                "match_number": 5,
                "match_type": Match.TYPE_FRIENDLY,
                "tournament": None,
                "team_a": teams["RSH"],
                "team_b": teams["KKS"],
                "venue": "Hadinaru Panchayat Main Cricket Ground",
                "start_time": "16:00:00",
                "overs_per_innings": 8,
                "match_format": "8-Over Friendly",
                "status": Match.STATUS_UPCOMING,
                "scoring_mode": Match.SCORING_MODE_MANUAL,
                "match_notes": "Sunday afternoon goodwill village exhibition match.",
            },
        )
        ensure_match_innings(m5)

        # Recalculate Standings for Active Tournament
        StandingsCalculationService.recalculate_tournament_standings(active_tournament)

        # 10. Tournament Winners Showcase (Past Years' Champions)
        TournamentWinner.objects.update_or_create(
            tournament_name="Cauvery Village Championship 2025",
            tournament_year=2025,
            defaults={
                "tournament": past_tournament,
                "winning_team": teams["KKS"],
                "winning_team_name": teams["KKS"].name,
                "runner_up_team": teams["CCT"],
                "runner_up_team_name": teams["CCT"].name,
                "winner_photograph": "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1200&q=80",
                "trophy_graphic": "golden-cup",
                "final_match_summary": "Kabini Kings Sutturu defeated Cauvery Challengers by 18 runs in a packed floodlit final.",
                "player_of_the_tournament": "Manjunath S (325 runs & 17 wickets)",
                "prize_amount": "₹50,000 + Golden Cauvery Trophy",
                "display_order": 1,
                "is_visible": True,
            },
        )
        TournamentWinner.objects.update_or_create(
            tournament_name="Gramina Panchayat Super Cup 2024",
            tournament_year=2024,
            defaults={
                "winning_team": teams["RSH"],
                "winning_team_name": teams["RSH"].name,
                "runner_up_team": teams["VWN"],
                "runner_up_team_name": teams["VWN"].name,
                "winner_photograph": "https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=1200&q=80",
                "trophy_graphic": "champions-shield",
                "final_match_summary": "Royal Strikers Hadinaru chased 104 in the final over with 4 wickets in hand.",
                "player_of_the_tournament": "Darshan Gowda",
                "prize_amount": "₹40,000 + Championship Shield",
                "display_order": 2,
                "is_visible": True,
            },
        )

        # 11. Gallery Images
        gallery_spec = [
            (
                "Grand Opening Ceremony at Hadinaru Ground",
                "Village elders, panchayat leaders, and all 6 team captains inaugurating Village Premier League 2026.",
                GalleryImage.CATEGORY_CEREMONY,
                "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1000&q=80",
                1,
            ),
            (
                "Darshan Gowda's Unbeaten 64* off 29 Balls",
                "Royal Strikers skipper launching a towering six over long-on during the season opener.",
                GalleryImage.CATEGORY_MATCH,
                "https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=1000&q=80",
                2,
            ),
            (
                "Champions Trophy Presentation",
                "Golden Gramina Cup gleaming at the scorer's pavilion ahead of the knockout rounds.",
                GalleryImage.CATEGORY_TROPHY,
                "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1000&q=80",
                3,
            ),
            (
                "Hadinaru Main Cricket Ground Prepared for Finals",
                "Freshly rolled turf pitch and boundary flags ready for weekend village crowds.",
                GalleryImage.CATEGORY_GROUND,
                "https://images.unsplash.com/photo-1589487391730-58f20eb2c308?auto=format&fit=crop&w=1000&q=80",
                4,
            ),
        ]
        for title, caption, cat, url, order in gallery_spec:
            GalleryImage.objects.update_or_create(
                title=title,
                defaults={
                    "caption": caption,
                    "category": cat,
                    "image_url": url,
                    "alt_text": title,
                    "tournament": active_tournament,
                    "display_order": order,
                    "is_visible": True,
                },
            )

        # 12. Sponsors
        sponsors_spec = [
            ("Cauvery Agro & Plantation Exports", Sponsor.TIER_TITLE, "https://example.com", "Official Title Sponsor of VPL 2026", 1),
            ("Nandi Digital Studio & Xerox", Sponsor.TIER_GOLD, "https://example.com", "Official Scoreboard & Media Partner", 2),
            ("Sri Chamundeshwari Sports Emporium", Sponsor.TIER_GOLD, "https://example.com", "Official Kit & Trophy Partner", 3),
            ("Hadinaru Youth Sports Welfare Trust", Sponsor.TIER_COMMUNITY, "https://example.com", "Ground & Hospitality Partner", 4),
        ]
        for name, tier, url, tag, order in sponsors_spec:
            Sponsor.objects.update_or_create(
                name=name,
                defaults={
                    "tier": tier,
                    "website_url": url,
                    "tagline": tag,
                    "tournament": active_tournament,
                    "display_order": order,
                    "is_visible": True,
                },
            )

        # 13. News & Organizer Announcements
        news_spec = [
            (
                "Village Premier League 2026 Knockout Schedule Confirmed",
                NewsPost.CATEGORY_FINALS,
                "Top 4 teams from Pool A will advance to the Semi-Finals this Sunday at Hadinaru Main Ground.",
                "The organizing committee has confirmed that Net Run Rate (NRR) will serve as the primary tie-breaker if two village teams finish level on points.",
                True,
            ),
            (
                "New Digital Live Scoreboard Launched for Spectators",
                NewsPost.CATEGORY_ANNOUNCEMENT,
                "Every ball, boundary, wicket, and points table change now updates live on mobile phones without refreshing.",
                "Spectators across Hadinaru, Nanjangud, and Mysuru can follow real-time scores directly on Village Cricket Live.",
                False,
            ),
        ]
        for title, cat, summary, content, pinned in news_spec:
            NewsPost.objects.update_or_create(
                title=title,
                defaults={
                    "category": cat,
                    "summary": summary,
                    "content": content,
                    "tournament": active_tournament,
                    "is_pinned": pinned,
                    "is_published": True,
                    "created_by": admin_user,
                },
            )

        self.stdout.write(self.style.SUCCESS("Successfully seeded Village Cricket Live!"))
        self.stdout.write("Default Admin Credentials: username='admin' / pass='Admin@2026'")
