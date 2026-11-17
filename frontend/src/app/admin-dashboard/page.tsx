"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  Award,
  BarChart3,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Database,
  Edit3,
  Eye,
  FileText,
  Globe,
  LayoutDashboard,
  Lock,
  LogOut,
  Megaphone,
  Menu as MenuIcon,
  MessageSquare,
  Palette,
  PlusCircle,
  Radio,
  RefreshCw,
  Shield,
  Sliders,
  Sparkles,
  Trash2,
  Trophy,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { apiFetch, setStoredAdminToken } from "@/lib/api";
import { useSite } from "@/context/SiteContext";
import { TeamCrest } from "@/components/MatchCard";
import {
  LiveMatchControlModule,
  WinnerControlModule,
} from "@/components/admin/LiveScoringAndWinnerModules";
import {
  Announcement,
  GalleryItem,
  HomepageSection,
  MatchData,
  NavigationItem,
  NewsItem,
  PlayerData,
  SponsorItem,
  StandingRow,
  TeamSummary,
  TournamentData,
  TournamentWinnerData,
  WebsiteSettings,
} from "@/types/cricket";

type AdminModuleKey =
  | "overview"
  | "live_control"
  | "all_matches"
  | "create_match"
  | "tournaments"
  | "teams"
  | "players"
  | "scores_results"
  | "winners"
  | "points_table"
  | "gallery"
  | "announcements"
  | "sponsors"
  | "homepage_cms"
  | "navigation_cms"
  | "site_settings"
  | "contact_messages"
  | "admin_users"
  | "activity_logs"
  | "backup_maintenance";

interface RosterRowInput {
  id?: number;
  name: string;
  playing_role: string;
  jersey_number: string;
  is_captain: boolean;
}

interface AdminOverviewMetrics {
  total_tournaments: number;
  active_tournaments: number;
  total_teams: number;
  total_players: number;
  total_matches: number;
  live_matches: number;
  upcoming_matches: number;
  completed_matches: number;
  cancelled_matches: number;
  unread_messages: number;
}

interface AuditLogEntry {
  id: number;
  actor_name: string;
  actor_role: string;
  action: string;
  module: string;
  description: string;
  created_at: string;
}

const DEFAULT_ROSTER_ROWS = (): RosterRowInput[] => [
  { name: "", playing_role: "ALL_ROUNDER", jersey_number: "1", is_captain: true },
  { name: "", playing_role: "BATTER", jersey_number: "2", is_captain: false },
  { name: "", playing_role: "BATTER", jersey_number: "3", is_captain: false },
  { name: "", playing_role: "WICKET_KEEPER", jersey_number: "4", is_captain: false },
  { name: "", playing_role: "ALL_ROUNDER", jersey_number: "5", is_captain: false },
  { name: "", playing_role: "ALL_ROUNDER", jersey_number: "6", is_captain: false },
  { name: "", playing_role: "BOWLER", jersey_number: "7", is_captain: false },
  { name: "", playing_role: "BOWLER", jersey_number: "8", is_captain: false },
  { name: "", playing_role: "BOWLER", jersey_number: "9", is_captain: false },
  { name: "", playing_role: "BOWLER", jersey_number: "10", is_captain: false },
  { name: "", playing_role: "ALL_ROUNDER", jersey_number: "11", is_captain: false },
];

export default function AdminDashboardPage() {
  const { refreshSiteData } = useSite();

  // Authentication state
  const [authUser, setAuthUser] = useState<{
    id: number;
    username: string;
    email: string;
    role: string;
  } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginUsername, setLoginUsername] = useState("admin");
  const [loginPassword, setLoginPassword] = useState("Admin@2026");
  const [loginError, setLoginError] = useState("");

  // Active module, mobile drawer & feedback toast
  const [activeModule, setActiveModule] = useState<AdminModuleKey>("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Core data stores
  const [metrics, setMetrics] = useState<AdminOverviewMetrics | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [tournaments, setTournaments] = useState<TournamentData[]>([]);
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [winners, setWinners] = useState<TournamentWinnerData[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [newsPosts, setNewsPosts] = useState<NewsItem[]>([]);
  const [sponsors, setSponsors] = useState<SponsorItem[]>([]);
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [navItems, setNavItems] = useState<NavigationItem[]>([]);
  const [siteSettings, setSiteSettings] = useState<WebsiteSettings | null>(null);
  const [contactMessages, setContactMessages] = useState<
    Array<{
      id: number;
      name: string;
      phone: string;
      email: string;
      subject: string;
      message: string;
      status: string;
      created_at: string;
    }>
  >([]);
  const [adminUsers, setAdminUsers] = useState<
    Array<{
      id: number;
      username: string;
      email: string;
      role: string;
      phone: string;
      is_active: boolean;
    }>
  >([]);

  // Points Table Admin state
  const [selectedPtTournamentId, setSelectedPtTournamentId] = useState<
    number | null
  >(null);
  const [ptStandings, setPtStandings] = useState<StandingRow[]>([]);
  const [adjForm, setAdjForm] = useState({
    team_id: "",
    points_delta: 0,
    nrr_delta: 0,
    reason: "",
  });

  // Match Create / Edit Form
  const [editingMatchId, setEditingMatchId] = useState<number | null>(null);
  const [newMatchForm, setNewMatchForm] = useState({
    title: "Match 01",
    match_type: "TOURNAMENT",
    tournament_id: "" as string | number,
    team_a_id: "" as string | number,
    team_b_id: "" as string | number,
    match_date: "2026-02-15",
    start_time: "14:00",
    venue: "Hadinaru Panchayat Main Cricket Ground",
    overs_per_innings: 10,
    umpire_details: "M. Shivanna & K. Basavaraj",
    match_notes: "",
    status: "UPCOMING",
    scoring_mode: "MANUAL",
    is_tournament_final: false,
  });

  // Tournament Create / Edit Form
  const [editingTournamentId, setEditingTournamentId] = useState<number | null>(
    null
  );
  const [newTournamentForm, setNewTournamentForm] = useState({
    name: "",
    season_year: 2026,
    organizer_name: "Hadinaru & District Gramina Cricket Association",
    ground_name: "Hadinaru Panchayat Main Cricket Ground",
    village: "Hadinaru",
    start_date: "2026-02-01",
    end_date: "2026-02-15",
    max_teams: 8,
    match_format: "T10",
    overs_per_innings: 10,
    status: "ONGOING",
    prize_details: "Champion: ₹75,000 + Trophy",
    poster_url: "",
    points_for_win: 2,
    points_for_tie: 1,
    points_for_no_result: 1,
    points_for_loss: 0,
  });

  // Team Create / Edit Form + Full Team Players Roster
  const [editingTeamId, setEditingTeamId] = useState<number | null>(null);
  const [newTeamForm, setNewTeamForm] = useState({
    name: "",
    short_name: "",
    village: "",
    captain_name: "",
    vice_captain_name: "",
    home_ground: "",
    primary_color: "#10B981",
    logo_url: "",
    description: "",
  });
  const [teamRosterRows, setTeamRosterRows] = useState<RosterRowInput[]>(
    DEFAULT_ROSTER_ROWS()
  );
  const [bulkPlayersText, setBulkPlayersText] = useState("");

  // Player Create / Edit Form
  const [editingPlayerId, setEditingPlayerId] = useState<number | null>(null);
  const [newPlayerForm, setNewPlayerForm] = useState({
    name: "",
    village: "",
    playing_role: "ALL_ROUNDER",
    batting_style: "Right-hand bat",
    bowling_style: "Right-arm medium",
    jersey_number: "18",
    photo_url: "",
    team_id: "" as string | number,
    manual_matches: 0,
    manual_runs: 0,
    manual_highest_score: 0,
    manual_wickets: 0,
    manual_best_bowling: "0/0",
    manual_stats_approved: true,
  });

  // Winner Create / Edit Form
  const [editingWinnerId, setEditingWinnerId] = useState<number | null>(null);
  const [newWinnerForm, setNewWinnerForm] = useState({
    tournament_name: "",
    tournament_year: 2026,
    winning_team_id: "" as string | number,
    runner_up_team_id: "" as string | number,
    final_match_summary: "",
    player_of_the_tournament: "",
    prize_amount: "",
    winner_photograph: "",
  });

  // Gallery Create / Edit Form
  const [editingGalleryId, setEditingGalleryId] = useState<number | null>(null);
  const [newGalleryForm, setNewGalleryForm] = useState({
    title: "",
    category: "MATCH",
    image_url: "",
    caption: "",
    display_order: 1,
    is_visible: true,
  });

  // Announcement & News Create / Edit Forms
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<
    number | null
  >(null);
  const [newAnnouncementForm, setNewAnnouncementForm] = useState({
    text: "",
    link_text: "Explore Fixtures",
    link_url: "/tournaments",
    is_visible: true,
  });
  const [editingNewsId, setEditingNewsId] = useState<number | null>(null);
  const [newNewsForm, setNewNewsForm] = useState({
    title: "",
    category: "ANNOUNCEMENT",
    summary: "",
    content: "",
    is_published: true,
    is_pinned: false,
  });

  // Sponsor Create / Edit Form
  const [editingSponsorId, setEditingSponsorId] = useState<number | null>(null);
  const [newSponsorForm, setNewSponsorForm] = useState({
    name: "",
    tier: "GOLD",
    website_url: "",
    logo_url: "",
    tagline: "",
    display_order: 1,
    is_visible: true,
  });

  // Admin User Form
  const [newUserForm, setNewUserForm] = useState({
    username: "",
    email: "",
    password: "",
    role_code: "SCORER",
    phone: "",
  });

  const showToast = useCallback(
    (text: string, type: "success" | "error" = "success") => {
      setToast({ text, type });
      setTimeout(() => setToast(null), 4000);
    },
    []
  );

  // Load All Admin Data
  const loadAllAdminData = useCallback(async () => {
    try {
      const [
        overviewRes,
        matchesRes,
        tournamentsRes,
        teamsRes,
        playersRes,
        winnersRes,
        galleryRes,
        annNewsRes,
        sponsorsRes,
        navSecRes,
        settingsRes,
        contactsRes,
        usersRes,
      ] = await Promise.all([
        apiFetch<{
          metrics: AdminOverviewMetrics;
          latest_activities: AuditLogEntry[];
        }>("/admin/overview/"),
        apiFetch<{ results: MatchData[] }>("/matches/"),
        apiFetch<{ results: TournamentData[] }>("/tournaments/"),
        apiFetch<{ results: TeamSummary[] }>("/teams/"),
        apiFetch<{ results: PlayerData[] }>("/players/"),
        apiFetch<{ results: TournamentWinnerData[] }>("/winners/"),
        apiFetch<{ results: GalleryItem[] }>("/gallery/"),
        apiFetch<{ announcements: Announcement[]; news: NewsItem[] }>(
          "/announcements/"
        ),
        apiFetch<{ results: SponsorItem[] }>("/sponsors/"),
        apiFetch<{
          navigation: NavigationItem[];
          sections: HomepageSection[];
        }>("/navigation/"),
        apiFetch<WebsiteSettings>("/settings/"),
        apiFetch<{ results: typeof contactMessages }>("/contact/"),
        apiFetch<{ users: typeof adminUsers }>("/admin/users/").catch(() => ({
          users: [],
        })),
      ]);

      setMetrics(overviewRes.metrics || null);
      setAuditLogs(overviewRes.latest_activities || []);
      setMatches(matchesRes.results || []);
      setTournaments(tournamentsRes.results || []);
      setTeams(teamsRes.results || []);
      setPlayers(playersRes.results || []);
      setWinners(winnersRes.results || []);
      setGallery(galleryRes.results || []);
      setAnnouncements(annNewsRes.announcements || []);
      setNewsPosts(annNewsRes.news || []);
      setSponsors(sponsorsRes.results || []);
      setNavItems(navSecRes.navigation || []);
      setSections(navSecRes.sections || []);
      setSiteSettings(settingsRes);
      setContactMessages(contactsRes.results || []);
      setAdminUsers(usersRes.users || []);

      if (!selectedPtTournamentId && tournamentsRes.results?.length > 0) {
        setSelectedPtTournamentId(tournamentsRes.results[0].id);
      }
    } catch {
      // Handled per-view
    }
  }, [selectedPtTournamentId]);

  useEffect(() => {
    apiFetch<{
      authenticated: boolean;
      user?: { id: number; username: string; email: string; role: string };
    }>("/auth/me/")
      .then((res) => {
        if (res.authenticated && res.user) {
          setAuthUser(res.user);
          loadAllAdminData();
        }
      })
      .catch(() => {})
      .finally(() => setAuthLoading(false));
  }, [loadAllAdminData]);

  const loadStandings = useCallback(async (tournamentId: number) => {
    try {
      const res = await apiFetch<{ standings: StandingRow[] }>(
        `/standings/?tournament=${tournamentId}`
      );
      setPtStandings(res.standings || []);
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    if (selectedPtTournamentId && authUser) {
      loadStandings(selectedPtTournamentId);
    } else {
      setPtStandings([]);
    }
  }, [selectedPtTournamentId, authUser, loadStandings]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    try {
      const res = await apiFetch<{
        authenticated: boolean;
        token?: string;
        user: { id: number; username: string; email: string; role: string };
      }>("/auth/login/", {
        method: "POST",
        body: JSON.stringify({
          username: loginUsername,
          password: loginPassword,
        }),
      });
      if (res.authenticated) {
        if (res.token) {
          setStoredAdminToken(res.token);
        }
        setAuthUser(res.user);
        loadAllAdminData();
        showToast(`Welcome back, ${res.user.username}!`);
      }
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : "Invalid credentials");
    }
  };

  const handleLogout = async () => {
    await apiFetch("/auth/logout/", { method: "POST" }).catch(() => {});
    setStoredAdminToken("");
    setAuthUser(null);
  };

  const handleClearAllTestData = async () => {
    try {
      await apiFetch("/admin/clear-data/", { method: "POST" });
      await loadAllAdminData();
      await refreshSiteData();
      showToast(
        "All test data deleted! Database is 100% clean for your step-by-step testing."
      );
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : "Failed to clear test data",
        "error"
      );
    }
  };

  const handleSaveSiteSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteSettings) return;
    try {
      const updated = await apiFetch<WebsiteSettings>("/settings/", {
        method: "PUT",
        body: JSON.stringify(siteSettings),
      });
      setSiteSettings(updated);
      await refreshSiteData();
      showToast("Website settings saved & published to public site!");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Save failed", "error");
    }
  };

  const startEditTeam = (t: TeamSummary) => {
    setEditingTeamId(t.id);
    setNewTeamForm({
      name: t.name || "",
      short_name: t.short_name || "",
      village: t.village || "",
      captain_name: t.captain_name || "",
      vice_captain_name: t.vice_captain_name || "",
      home_ground: t.home_ground || "",
      primary_color: t.primary_color || "#10B981",
      logo_url: t.logo_url || "",
      description: t.description || "",
    });
    if (t.players && t.players.length > 0) {
      setTeamRosterRows(
        t.players.map((p, idx) => ({
          id: p.id,
          name: p.name,
          playing_role: p.playing_role || "ALL_ROUNDER",
          jersey_number:
            p.jersey_number !== null && p.jersey_number !== undefined
              ? String(p.jersey_number)
              : String(idx + 1),
          is_captain: Boolean(p.is_captain),
        }))
      );
    } else {
      setTeamRosterRows(DEFAULT_ROSTER_ROWS());
    }
    setActiveModule("teams");
    setMobileMenuOpen(false);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const resetTeamForm = () => {
    setEditingTeamId(null);
    setNewTeamForm({
      name: "",
      short_name: "",
      village: "",
      captain_name: "",
      vice_captain_name: "",
      home_ground: "",
      primary_color: "#10B981",
      logo_url: "",
      description: "",
    });
    setTeamRosterRows(DEFAULT_ROSTER_ROWS());
    setBulkPlayersText("");
  };

  const applyBulkPlayersToRoster = () => {
    const names = bulkPlayersText
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (names.length === 0) return;
    const rows: RosterRowInput[] = names.map((name, idx) => ({
      name,
      playing_role:
        idx === 0
          ? "ALL_ROUNDER"
          : idx < 5
          ? "BATTER"
          : idx === 5
          ? "WICKET_KEEPER"
          : "BOWLER",
      jersey_number: String(idx + 1),
      is_captain: idx === 0,
    }));
    setTeamRosterRows(rows);
    if (!newTeamForm.captain_name && rows[0]) {
      setNewTeamForm((prev) => ({ ...prev, captain_name: rows[0].name }));
    }
    setBulkPlayersText("");
    showToast(`Populated ${rows.length} player rows!`);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#07150E] flex items-center justify-center p-6">
        <div className="w-64 h-12 skeleton rounded-xl" />
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="min-h-screen bg-[#07150E] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full glass-card rounded-3xl p-8 border border-emerald-700/40 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-[#0B3B24] border border-amber-400/50 flex items-center justify-center text-amber-400 shadow-lg">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-black text-white">
                Admin Studio Login
              </h1>
              <p className="text-xs text-emerald-400 font-semibold">
                Village Cricket Live — Control Room
              </p>
            </div>
          </div>

          {loginError && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/40 text-xs text-red-300 flex items-center gap-2 font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Username
              </label>
              <input
                type="text"
                required
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-charcoal-950 border border-emerald-800/70 text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-charcoal-950 border border-emerald-800/70 text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm shadow-lg transition-all"
            >
              Sign In to Admin Studio →
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-emerald-900/60 text-xs text-slate-400 space-y-1">
            <p className="font-bold text-slate-300">Default Role Accounts:</p>
            <p>
              Super Admin:{" "}
              <code className="text-amber-400 font-bold">admin</code> /{" "}
              <code className="text-amber-400 font-bold">Admin@2026</code>
            </p>
            <p>
              Match Scorer:{" "}
              <code className="text-emerald-300">scorer</code> /{" "}
              <code className="text-emerald-300">Scorer@2026</code>
            </p>
            <p>
              Content Editor:{" "}
              <code className="text-emerald-300">editor</code> /{" "}
              <code className="text-emerald-300">Editor@2026</code>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Exact 20 Admin Sidebar Navigation Modules (Section 7 of Master Prompt)
  const SIDEBAR_MODULES: Array<{
    key: AdminModuleKey;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { key: "overview", label: "1. Dashboard Overview", icon: LayoutDashboard },
    { key: "live_control", label: "2. Live Match Control", icon: Radio },
    { key: "all_matches", label: "3. All Matches", icon: Calendar },
    { key: "create_match", label: "4. Create Match", icon: PlusCircle },
    { key: "tournaments", label: "5. Tournaments", icon: Trophy },
    { key: "teams", label: "6. Teams", icon: Shield },
    { key: "players", label: "7. Players", icon: Users },
    { key: "scores_results", label: "8. Scores & Results", icon: Award },
    { key: "winners", label: "9. Winners Management", icon: Sparkles },
    { key: "points_table", label: "10. Points Table", icon: BarChart3 },
    { key: "gallery", label: "11. Gallery Management", icon: Camera },
    {
      key: "announcements",
      label: "12. News & Announcements",
      icon: Megaphone,
    },
    { key: "sponsors", label: "13. Sponsors", icon: Globe },
    { key: "homepage_cms", label: "14. Homepage Management", icon: Sliders },
    { key: "navigation_cms", label: "15. Navigation Management", icon: MenuIcon },
    { key: "site_settings", label: "16. Website Settings", icon: Palette },
    {
      key: "contact_messages",
      label: "17. Contact Messages",
      icon: MessageSquare,
    },
    { key: "admin_users", label: "18. Admin Users & Roles", icon: UserCheck },
    { key: "activity_logs", label: "19. Activity Logs", icon: ClipboardList },
    {
      key: "backup_maintenance",
      label: "20. Backup & Maintenance",
      icon: Database,
    },
  ];

  const liveCount = metrics?.live_matches || 0;
  const upcomingCount = metrics?.upcoming_matches || 0;
  const completedCount = metrics?.completed_matches || 0;
  const cancelledCount = metrics?.cancelled_matches || 0;
  const totalMatchesCount =
    metrics?.total_matches ||
    liveCount + upcomingCount + completedCount + cancelledCount;

  const liveMatchesList = matches.filter((m) =>
    ["LIVE", "INNINGS_BREAK", "PAUSED"].includes(m.status)
  );

  const currentModuleObj =
    SIDEBAR_MODULES.find((i) => i.key === activeModule) || SIDEBAR_MODULES[0];

  return (
    <div className="min-h-screen bg-[#07150E] text-white flex flex-col lg:flex-row">
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-2xl border flex items-center gap-2.5 text-xs font-extrabold ${
            toast.type === "success"
              ? "bg-[#0B3B24] border-amber-400 text-white"
              : "bg-red-950 border-red-500 text-red-100"
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toast.text}</span>
        </div>
      )}

      {/* 20-MODULE SIDEBAR (Fixed 288px lg:w-72 on Desktop + Collapsible Drawer on Mobile) */}
      <aside className="w-full lg:w-72 lg:shrink-0 bg-[#05120B] text-white border-b lg:border-b-0 lg:border-r border-emerald-900/70 flex flex-col lg:h-screen lg:sticky lg:top-0">
        <div className="p-4 border-b border-emerald-900/70 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-900 border border-amber-400/50 flex items-center justify-center text-white font-black shrink-0">
              🏏
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-sm font-extrabold text-white leading-tight truncate">
                Village Cricket{" "}
                <span className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 text-[9px] uppercase font-black">
                  ADMIN
                </span>
              </h1>
              <p className="text-[11px] text-emerald-400 font-medium truncate">
                20-Module Control Studio
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="lg:hidden inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-950 border border-emerald-700/60 text-amber-400 text-xs font-bold"
            >
              <MenuIcon className="w-4 h-4" />
              <span>Modules</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${
                  mobileMenuOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg bg-emerald-950 hover:bg-red-600/30 text-emerald-200 hover:text-red-200 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Quick Module Bar (when collapsed on mobile) */}
        <div className="lg:hidden px-3 py-2 bg-[#07150E]/90 border-b border-emerald-900/60 flex items-center justify-between text-xs">
          <span className="text-emerald-300 font-bold truncate">
            Active: <strong className="text-amber-400">{currentModuleObj.label}</strong>
          </span>
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="text-[11px] font-extrabold text-amber-400 underline shrink-0 ml-2"
          >
            {mobileMenuOpen ? "Hide Menu" : "Switch Module"}
          </button>
        </div>

        {/* Navigation List: Always visible on lg+, toggleable on mobile */}
        <div
          className={`${
            mobileMenuOpen ? "flex" : "hidden"
          } lg:flex p-3 overflow-y-auto flex-col gap-1 flex-1 max-h-[65vh] lg:max-h-none`}
        >
          {SIDEBAR_MODULES.map((item) => {
            const Icon = item.icon;
            const active = activeModule === item.key;
            return (
              <button
                key={item.key}
                onClick={() => {
                  setActiveModule(item.key);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-left transition-all ${
                  active
                    ? "bg-amber-400 text-slate-950 shadow-md font-black"
                    : "text-emerald-100/85 hover:text-white hover:bg-emerald-900/40"
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    active ? "text-slate-950" : "text-emerald-400"
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* MAIN ADMIN WORKSPACE (Side-by-side with sidebar on desktop, full width on mobile) */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
        <div className="max-w-6xl mx-auto w-full space-y-6">
          {/* TOP HEADER BAR */}
          <div className="glass-card rounded-2xl px-5 py-4 border border-emerald-800/60 shadow-lg flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-black text-white">
                {currentModuleObj.label}
              </h2>
              <p className="text-xs text-emerald-300/80 font-medium mt-0.5">
                Signed in as <strong>{authUser.username}</strong> ({authUser.role}
                ) — All changes sync live to the public website.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => {
                  loadAllAdminData();
                  refreshSiteData();
                  showToast("Synchronized with live database!");
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-xs font-bold text-emerald-200 border border-emerald-700/60 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>

              <Link
                href="/"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black shadow-sm transition-colors"
              >
                <Eye className="w-3.5 h-3.5" /> View Public Website ↗
              </Link>
            </div>
          </div>

        {/* =====================================================================
            MODULE 1: DASHBOARD OVERVIEW
        ===================================================================== */}
        {activeModule === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: "Tournaments",
                  val: metrics?.total_tournaments ?? tournaments.length,
                  sub: `${metrics?.active_tournaments ?? 0} Active`,
                  icon: Trophy,
                },
                {
                  label: "Village Teams",
                  val: metrics?.total_teams ?? teams.length,
                  sub: "Registered franchises",
                  icon: Shield,
                },
                {
                  label: "Players",
                  val: metrics?.total_players ?? players.length,
                  sub: "Verified squad players",
                  icon: Users,
                },
                {
                  label: "Matches",
                  val: metrics?.total_matches ?? matches.length,
                  sub: `${liveCount} Live • ${upcomingCount} Upcoming`,
                  icon: Activity,
                },
              ].map((kpi) => {
                const KpiIcon = kpi.icon;
                return (
                  <div
                    key={kpi.label}
                    className="glass-card rounded-2xl p-5 border border-emerald-800/60 flex items-start gap-4"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
                      <KpiIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-mono text-3xl font-black text-white leading-none">
                        {kpi.val}
                      </p>
                      <p className="text-xs font-bold text-slate-300 mt-1">
                        {kpi.label}
                      </p>
                      <p className="text-[11px] font-semibold text-emerald-400 mt-1">
                        {kpi.sub}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Match Breakdown */}
              <div className="lg:col-span-5 glass-card rounded-2xl p-5 border border-emerald-800/60 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-extrabold text-base text-white">
                    Match Status Overview ({totalMatchesCount} Total)
                  </h3>
                  <button
                    type="button"
                    onClick={handleClearAllTestData}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-[11px] font-bold text-red-300 transition-colors"
                    title="Delete all matches, teams, players & tournaments"
                  >
                    <Trash2 className="w-3 h-3" /> Reset All Data
                  </button>
                </div>
                <div className="space-y-2.5 text-xs">
                  {[
                    { label: "Live Matches", val: liveCount, dot: "bg-red-500" },
                    {
                      label: "Upcoming Fixtures",
                      val: upcomingCount,
                      dot: "bg-amber-400",
                    },
                    {
                      label: "Completed Results",
                      val: completedCount,
                      dot: "bg-emerald-400",
                    },
                    {
                      label: "Cancelled / Abandoned",
                      val: cancelledCount,
                      dot: "bg-slate-500",
                    },
                  ].map((r) => (
                    <div
                      key={r.label}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-[#05120B]/70 border border-emerald-900/50"
                    >
                      <span className="flex items-center gap-2 font-semibold text-slate-300">
                        <span className={`w-2.5 h-2.5 rounded-full ${r.dot}`} />
                        {r.label}
                      </span>
                      <span className="font-mono font-black text-white text-sm">
                        {r.val}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="lg:col-span-7 glass-card rounded-2xl p-5 border border-emerald-800/60 space-y-4">
                <h3 className="font-display font-extrabold text-base text-white">
                  Step-by-Step Quick Actions
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    {
                      label: "1. Add Team + Players",
                      mod: "teams" as AdminModuleKey,
                      icon: Shield,
                    },
                    {
                      label: "2. Create Tournament",
                      mod: "tournaments" as AdminModuleKey,
                      icon: Trophy,
                    },
                    {
                      label: "3. Create Match",
                      mod: "create_match" as AdminModuleKey,
                      icon: PlusCircle,
                    },
                    {
                      label: "4. Score Live Match",
                      mod: "live_control" as AdminModuleKey,
                      icon: Radio,
                    },
                    {
                      label: "5. Declare Winner",
                      mod: "scores_results" as AdminModuleKey,
                      icon: Award,
                    },
                    {
                      label: "6. Add Player",
                      mod: "players" as AdminModuleKey,
                      icon: UserPlus,
                    },
                  ].map((btn) => {
                    const ActionIcon = btn.icon;
                    return (
                      <button
                        key={btn.label}
                        onClick={() => setActiveModule(btn.mod)}
                        className="p-4 rounded-2xl bg-[#05120B]/80 hover:bg-emerald-900/50 border border-emerald-800/60 hover:border-amber-400/50 flex flex-col items-center justify-center text-center gap-2 transition-all"
                      >
                        <ActionIcon className="w-6 h-6 text-amber-400" />
                        <span className="text-xs font-extrabold text-white">
                          {btn.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Active Live Matches Strip */}
            <div className="glass-card rounded-2xl p-5 border border-emerald-800/60">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-emerald-900/60">
                <h3 className="font-display font-extrabold text-base text-white">
                  Active Live Matches ({liveMatchesList.length})
                </h3>
                <button
                  onClick={() => setActiveModule("all_matches")}
                  className="text-xs font-bold text-amber-400 hover:underline"
                >
                  View All Matches →
                </button>
              </div>
              {liveMatchesList.length > 0 ? (
                <div className="space-y-3">
                  {liveMatchesList.map((m) => {
                    const inn1 = m.innings?.find((i) => i.innings_number === 1);
                    const inn2 = m.innings?.find((i) => i.innings_number === 2);
                    return (
                      <div
                        key={m.id}
                        className="p-4 rounded-xl bg-[#05120B]/80 border border-emerald-800/60 flex flex-wrap items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <span className="px-2.5 py-1 rounded-md bg-red-600 text-white text-[10px] font-black uppercase">
                            LIVE
                          </span>
                          <div>
                            <p className="text-[11px] text-emerald-300 font-semibold">
                              {m.tournament?.name || "Friendly Match"} •{" "}
                              {m.overs_per_innings} Overs
                            </p>
                            <p className="text-sm font-black text-white">
                              {m.title}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="font-mono text-xs sm:text-sm text-white">
                            <strong>
                              {inn1
                                ? `${inn1.runs}/${inn1.wickets} (${inn1.overs_display})`
                                : "0/0"}
                            </strong>{" "}
                            vs{" "}
                            <strong>
                              {inn2
                                ? `${inn2.runs}/${inn2.wickets} (${inn2.overs_display})`
                                : "Yet to bat"}
                            </strong>
                          </div>
                          <button
                            onClick={() => setActiveModule("live_control")}
                            className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-black text-xs"
                          >
                            Open Scorer Console →
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-4 text-center">
                  No live matches currently active. Create teams and a match to start scoring!
                </p>
              )}
            </div>
          </div>
        )}

        {/* =====================================================================
            MODULE 2: LIVE MATCH CONTROL
        ===================================================================== */}
        {activeModule === "live_control" && (
          <LiveMatchControlModule
            matches={matches}
            teams={teams}
            players={players}
            tournaments={tournaments}
            onRefreshAll={loadAllAdminData}
            notify={showToast}
            onJumpToResult={() => setActiveModule("scores_results")}
          />
        )}

        {/* =====================================================================
            MODULE 3: ALL MATCHES
        ===================================================================== */}
        {activeModule === "all_matches" && (
          <div className="glass-card rounded-2xl p-6 border border-emerald-800/60 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-extrabold text-white">
                All Matches ({matches.length})
              </h3>
              <button
                onClick={() => {
                  setEditingMatchId(null);
                  setActiveModule("create_match");
                }}
                className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-black text-xs"
              >
                + Create Match
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-emerald-900/60 text-emerald-300 uppercase">
                    <th className="py-2.5 px-3">Match</th>
                    <th className="py-2.5 px-3">Teams</th>
                    <th className="py-2.5 px-3">Overs</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-900/40">
                  {matches.map((m) => (
                    <tr key={m.id} className="hover:bg-emerald-900/20">
                      <td className="py-3 px-3 font-bold text-white">
                        {m.title}
                        <span className="block text-[10px] text-slate-400 font-normal">
                          {m.tournament?.name || "Friendly"} • {m.venue}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {m.team_a.short_name} vs {m.team_b.short_name}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-amber-400">
                        {m.overs_per_innings} Ov
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-900 text-emerald-200 text-[10px] font-bold uppercase">
                          {m.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right space-x-1.5">
                        <button
                          onClick={() => setActiveModule("live_control")}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-700 text-white font-bold"
                        >
                          Score
                        </button>
                        <button
                          onClick={() => {
                            setEditingMatchId(m.id);
                            setNewMatchForm({
                              title: m.title,
                              match_type: m.match_type,
                              tournament_id: m.tournament?.id || "",
                              team_a_id: m.team_a.id,
                              team_b_id: m.team_b.id,
                              match_date: m.match_date || "2026-02-15",
                              start_time: m.start_time || "14:00",
                              venue: m.venue || "",
                              overs_per_innings: m.overs_per_innings || 10,
                              umpire_details: m.umpire_details || "",
                              match_notes: m.match_notes || "",
                              status: m.status,
                              scoring_mode: m.scoring_mode || "MANUAL",
                              is_tournament_final: Boolean(
                                m.is_tournament_final
                              ),
                            });
                            setActiveModule("create_match");
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-700/50 font-bold"
                        >
                          Edit
                        </button>
                        <button
                          onClick={async () => {
                            await apiFetch(
                              `/matches/${m.id}/?permanent=true`,
                              { method: "DELETE" }
                            );
                            loadAllAdminData();
                            showToast("Match deleted");
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-red-500/20 text-red-300 font-bold"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =====================================================================
            MODULE 4: CREATE / EDIT MATCH (Total Overs Editable)
        ===================================================================== */}
        {activeModule === "create_match" && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const payload = {
                  ...newMatchForm,
                  tournament_id: newMatchForm.tournament_id
                    ? Number(newMatchForm.tournament_id)
                    : null,
                  team_a_id: Number(newMatchForm.team_a_id),
                  team_b_id: Number(newMatchForm.team_b_id),
                  overs_per_innings: Number(newMatchForm.overs_per_innings),
                };
                if (editingMatchId) {
                  await apiFetch(`/matches/${editingMatchId}/`, {
                    method: "PUT",
                    body: JSON.stringify(payload),
                  });
                  showToast("Match updated!");
                  setEditingMatchId(null);
                  await loadAllAdminData();
                  setActiveModule("all_matches");
                } else {
                  const created = await apiFetch<MatchData>("/matches/", {
                    method: "POST",
                    body: JSON.stringify(payload),
                  });
                  showToast(`Match "${created.title}" created!`);
                  await loadAllAdminData();
                  setActiveModule("live_control");
                }
              } catch (err: unknown) {
                showToast(
                  err instanceof Error ? err.message : "Failed",
                  "error"
                );
              }
            }}
            className="glass-card rounded-2xl p-6 border border-emerald-800/60 space-y-5"
          >
            <h3 className="font-display text-lg font-extrabold text-white">
              {editingMatchId
                ? `Edit Match #${editingMatchId}`
                : "Create New Match (Friendly or Tournament)"}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Match Title *
                </label>
                <input
                  type="text"
                  required
                  value={newMatchForm.title}
                  onChange={(e) =>
                    setNewMatchForm({ ...newMatchForm, title: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-charcoal-950 border border-emerald-800/70 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Match Type
                </label>
                <select
                  value={newMatchForm.match_type}
                  onChange={(e) =>
                    setNewMatchForm({
                      ...newMatchForm,
                      match_type: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-charcoal-950 border border-emerald-800/70 text-sm text-white"
                >
                  <option value="TOURNAMENT">Tournament Match</option>
                  <option value="FRIENDLY">Friendly Match</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Tournament
                </label>
                <select
                  value={newMatchForm.tournament_id}
                  onChange={(e) =>
                    setNewMatchForm({
                      ...newMatchForm,
                      tournament_id: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-charcoal-950 border border-emerald-800/70 text-sm text-white"
                >
                  <option value="">Independent Friendly Match</option>
                  {tournaments.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Team A *
                </label>
                <select
                  required
                  value={newMatchForm.team_a_id}
                  onChange={(e) =>
                    setNewMatchForm({
                      ...newMatchForm,
                      team_a_id: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-charcoal-950 border border-emerald-800/70 text-sm text-white font-bold"
                >
                  <option value="">Select Team A</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.short_name})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Team B *
                </label>
                <select
                  required
                  value={newMatchForm.team_b_id}
                  onChange={(e) =>
                    setNewMatchForm({
                      ...newMatchForm,
                      team_b_id: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-charcoal-950 border border-emerald-800/70 text-sm text-white font-bold"
                >
                  <option value="">Select Team B</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.short_name})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-amber-400 mb-1">
                  Total Overs (Editable) *
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  required
                  value={newMatchForm.overs_per_innings}
                  onChange={(e) =>
                    setNewMatchForm({
                      ...newMatchForm,
                      overs_per_innings: Number(e.target.value),
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-charcoal-950 border-2 border-amber-400/60 text-sm font-mono font-black text-amber-300"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  required
                  value={newMatchForm.match_date}
                  onChange={(e) =>
                    setNewMatchForm({
                      ...newMatchForm,
                      match_date: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-charcoal-950 border border-emerald-800/70 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Start Time *
                </label>
                <input
                  type="time"
                  required
                  value={newMatchForm.start_time}
                  onChange={(e) =>
                    setNewMatchForm({
                      ...newMatchForm,
                      start_time: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-charcoal-950 border border-emerald-800/70 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Initial Status
                </label>
                <select
                  value={newMatchForm.status}
                  onChange={(e) =>
                    setNewMatchForm({ ...newMatchForm, status: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-charcoal-950 border border-emerald-800/70 text-sm text-white"
                >
                  <option value="UPCOMING">Upcoming</option>
                  <option value="LIVE">Live Now</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs"
            >
              {editingMatchId
                ? "Save Match Changes"
                : "Create Match & Initialize Scoreboard →"}
            </button>
          </form>
        )}

        {/* =====================================================================
            MODULE 5: TOURNAMENTS
        ===================================================================== */}
        {activeModule === "tournaments" && (
          <div className="space-y-6">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (editingTournamentId) {
                  await apiFetch(`/tournaments/${editingTournamentId}/`, {
                    method: "PUT",
                    body: JSON.stringify(newTournamentForm),
                  });
                  setEditingTournamentId(null);
                  showToast("Tournament updated!");
                } else {
                  await apiFetch("/tournaments/", {
                    method: "POST",
                    body: JSON.stringify(newTournamentForm),
                  });
                  showToast("Tournament created!");
                }
                setNewTournamentForm({ ...newTournamentForm, name: "" });
                loadAllAdminData();
              }}
              className="glass-card rounded-2xl p-6 border border-emerald-800/60 space-y-4"
            >
              <h3 className="font-display text-base font-extrabold text-white">
                {editingTournamentId
                  ? `Edit Tournament #${editingTournamentId}`
                  : "Create New Tournament"}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Tournament Name *"
                  value={newTournamentForm.name}
                  onChange={(e) =>
                    setNewTournamentForm({
                      ...newTournamentForm,
                      name: e.target.value,
                    })
                  }
                  className="sm:col-span-2 px-3 py-2 rounded-xl bg-charcoal-950 border border-emerald-800/70 text-xs text-white"
                />
                <input
                  type="text"
                  placeholder="Ground Name"
                  value={newTournamentForm.ground_name}
                  onChange={(e) =>
                    setNewTournamentForm({
                      ...newTournamentForm,
                      ground_name: e.target.value,
                    })
                  }
                  className="px-3 py-2 rounded-xl bg-charcoal-950 border border-emerald-800/70 text-xs text-white"
                />
                <input
                  type="number"
                  min={1}
                  max={50}
                  placeholder="Overs"
                  value={newTournamentForm.overs_per_innings}
                  onChange={(e) =>
                    setNewTournamentForm({
                      ...newTournamentForm,
                      overs_per_innings: Number(e.target.value),
                    })
                  }
                  className="px-3 py-2 rounded-xl bg-charcoal-950 border border-amber-400/50 text-xs font-mono text-amber-300"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-amber-400 text-slate-950 font-black text-xs"
              >
                {editingTournamentId
                  ? "Update Tournament"
                  : "+ Save Tournament"}
              </button>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tournaments.map((t) => (
                <div
                  key={t.id}
                  className="glass-card rounded-2xl p-4 border border-emerald-800/60 flex items-center justify-between"
                >
                  <div>
                    <span className="text-[10px] font-bold uppercase text-amber-400">
                      {t.status} • {t.overs_per_innings} Overs
                    </span>
                    <h4 className="font-display font-bold text-white">
                      {t.name}
                    </h4>
                    <p className="text-xs text-slate-400">{t.ground_name}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingTournamentId(t.id);
                        setNewTournamentForm({
                          name: t.name,
                          season_year: t.season_year || 2026,
                          organizer_name: t.organizer_name || "",
                          ground_name: t.ground_name || "",
                          village: t.village || "",
                          start_date: t.start_date,
                          end_date: t.end_date,
                          max_teams: t.max_teams || 8,
                          match_format: t.match_format || "T10",
                          overs_per_innings: t.overs_per_innings || 10,
                          status: t.status,
                          prize_details: t.prize_details || "",
                          poster_url: t.poster_url || "",
                          points_for_win: t.points_rules?.win ?? 2,
                          points_for_tie: t.points_rules?.tie ?? 1,
                          points_for_no_result: t.points_rules?.no_result ?? 1,
                          points_for_loss: t.points_rules?.loss ?? 0,
                        });
                      }}
                      className="p-2 rounded-lg bg-emerald-950 text-emerald-300"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={async () => {
                        await apiFetch(`/tournaments/${t.id}/`, {
                          method: "DELETE",
                        });
                        loadAllAdminData();
                        showToast("Tournament deleted");
                      }}
                      className="p-2 rounded-lg bg-red-500/20 text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =====================================================================
            MODULE 6: TEAMS & FULL SQUAD PLAYERS ROSTER
        ===================================================================== */}
        {activeModule === "teams" && (
          <div className="space-y-6">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const validPlayers = teamRosterRows
                    .filter((r) => r.name.trim().length > 0)
                    .map((r) => ({
                      id: r.id,
                      name: r.name.trim(),
                      playing_role: r.playing_role || "ALL_ROUNDER",
                      jersey_number: r.jersey_number || "",
                      is_captain: r.is_captain,
                    }));
                  const captainFromRow = validPlayers.find(
                    (p) => p.is_captain
                  )?.name;
                  const payload = {
                    ...newTeamForm,
                    captain_name:
                      newTeamForm.captain_name || captainFromRow || "",
                    players_input: validPlayers,
                  };
                  if (editingTeamId) {
                    await apiFetch(`/teams/${editingTeamId}/`, {
                      method: "PUT",
                      body: JSON.stringify(payload),
                    });
                    showToast(
                      `Team "${newTeamForm.name}" and ${validPlayers.length} players updated!`
                    );
                  } else {
                    await apiFetch("/teams/", {
                      method: "POST",
                      body: JSON.stringify(payload),
                    });
                    showToast(
                      `Team "${newTeamForm.name}" created with ${validPlayers.length} players!`
                    );
                  }
                  resetTeamForm();
                  await loadAllAdminData();
                } catch (err: unknown) {
                  showToast(
                    err instanceof Error ? err.message : "Failed",
                    "error"
                  );
                }
              }}
              className="glass-card rounded-2xl p-6 border border-emerald-800/60 space-y-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-lg font-extrabold text-white">
                    {editingTeamId
                      ? `Edit Team & Squad Players (#${editingTeamId})`
                      : "Create New Team & Full Team Players Roster"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Enter team details and all team players&apos; names below so
                    they display while playing.
                  </p>
                </div>
                {editingTeamId && (
                  <button
                    type="button"
                    onClick={resetTeamForm}
                    className="px-3 py-1.5 rounded-lg bg-emerald-950 text-xs font-bold"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
                <input
                  type="text"
                  required
                  placeholder="Team Name *"
                  value={newTeamForm.name}
                  onChange={(e) =>
                    setNewTeamForm({ ...newTeamForm, name: e.target.value })
                  }
                  className="px-3.5 py-2 rounded-xl bg-charcoal-950 border border-emerald-800/70 text-xs font-bold text-white"
                />
                <input
                  type="text"
                  required
                  placeholder="Short Code (e.g. RSH) *"
                  value={newTeamForm.short_name}
                  onChange={(e) =>
                    setNewTeamForm({
                      ...newTeamForm,
                      short_name: e.target.value.toUpperCase(),
                    })
                  }
                  className="px-3.5 py-2 rounded-xl bg-charcoal-950 border border-emerald-800/70 text-xs font-mono text-white"
                />
                <input
                  type="text"
                  required
                  placeholder="Home Village *"
                  value={newTeamForm.village}
                  onChange={(e) =>
                    setNewTeamForm({ ...newTeamForm, village: e.target.value })
                  }
                  className="px-3.5 py-2 rounded-xl bg-charcoal-950 border border-emerald-800/70 text-xs text-white"
                />
                <input
                  type="text"
                  placeholder="Captain Name"
                  value={newTeamForm.captain_name}
                  onChange={(e) =>
                    setNewTeamForm({
                      ...newTeamForm,
                      captain_name: e.target.value,
                    })
                  }
                  className="px-3.5 py-2 rounded-xl bg-charcoal-950 border border-emerald-800/70 text-xs text-white"
                />
              </div>

              {/* Squad Players Roster Builder */}
              <div className="p-4 rounded-2xl bg-[#05120B]/80 border border-emerald-800/60 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-extrabold text-amber-400">
                    Team Players Roster (Displayed While Playing)
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setTeamRosterRows((prev) => [
                        ...prev,
                        {
                          name: "",
                          playing_role: "ALL_ROUNDER",
                          jersey_number: String(prev.length + 1),
                          is_captain: false,
                        },
                      ])
                    }
                    className="px-3 py-1 rounded-lg bg-emerald-800 text-white text-xs font-bold"
                  >
                    + Add Player Row
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={bulkPlayersText}
                    onChange={(e) => setBulkPlayersText(e.target.value)}
                    placeholder="Quick Paste Players (comma separated): e.g. Rohit Kumar, Santosh P, Manjunath B..."
                    className="flex-1 px-3 py-2 rounded-xl bg-charcoal-950 border border-emerald-800/70 text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={applyBulkPlayersToRoster}
                    className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-black text-xs shrink-0"
                  >
                    Populate Roster Rows
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {teamRosterRows.map((row, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2 rounded-xl bg-charcoal-950 border border-emerald-900/60"
                    >
                      <span className="w-5 text-center font-mono text-[10px] text-slate-400">
                        #{idx + 1}
                      </span>
                      <input
                        type="text"
                        placeholder={`Player ${idx + 1} Name`}
                        value={row.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTeamRosterRows((prev) =>
                            prev.map((r, i) =>
                              i === idx ? { ...r, name: val } : r
                            )
                          );
                        }}
                        className="flex-1 px-2 py-1 rounded bg-[#07150E] border border-emerald-800/60 text-xs text-white"
                      />
                      <select
                        value={row.playing_role}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTeamRosterRows((prev) =>
                            prev.map((r, i) =>
                              i === idx ? { ...r, playing_role: val } : r
                            )
                          );
                        }}
                        className="px-2 py-1 rounded bg-[#07150E] border border-emerald-800/60 text-[11px] text-emerald-200"
                      >
                        <option value="BATTER">Batter</option>
                        <option value="BOWLER">Bowler</option>
                        <option value="ALL_ROUNDER">All-Rounder</option>
                        <option value="WICKET_KEEPER">WK</option>
                      </select>
                      <button
                        type="button"
                        onClick={() =>
                          setTeamRosterRows((prev) =>
                            prev.filter((_, i) => i !== idx)
                          )
                        }
                        className="text-slate-400 hover:text-red-400"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-amber-400 text-slate-950 font-black text-xs"
              >
                {editingTeamId
                  ? "Save Team & Players"
                  : "+ Create Team & Save All Players"}
              </button>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teams.map((t) => (
                <div
                  key={t.id}
                  className="glass-card rounded-2xl p-5 border border-emerald-800/60 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <TeamCrest
                        name={t.name}
                        shortName={t.short_name}
                        logoUrl={t.logo_url}
                        color={t.primary_color}
                        size="md"
                      />
                      <div>
                        <h4 className="font-display font-bold text-white">
                          {t.name} ({t.short_name})
                        </h4>
                        <p className="text-xs text-slate-400">
                          {t.village} • Captain: {t.captain_name || "TBA"}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => startEditTeam(t)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-950 text-emerald-300 text-xs font-bold"
                      >
                        Edit Squad
                      </button>
                      <button
                        onClick={async () => {
                          await apiFetch(`/teams/${t.id}/?permanent=true`, {
                            method: "DELETE",
                          });
                          loadAllAdminData();
                          showToast("Team deleted");
                        }}
                        className="p-1.5 rounded-lg bg-red-500/20 text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-emerald-900/50">
                    {(t.players || []).map((p) => (
                      <span
                        key={p.id}
                        className="px-2 py-0.5 rounded bg-[#05120B] text-[11px] text-emerald-200 border border-emerald-800/60"
                      >
                        {p.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =====================================================================
            MODULE 7: PLAYERS
        ===================================================================== */}
        {activeModule === "players" && (
          <div className="space-y-6">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const payload = {
                  ...newPlayerForm,
                  team_id: newPlayerForm.team_id
                    ? Number(newPlayerForm.team_id)
                    : null,
                };
                if (editingPlayerId) {
                  await apiFetch(`/players/${editingPlayerId}/`, {
                    method: "PUT",
                    body: JSON.stringify(payload),
                  });
                  setEditingPlayerId(null);
                  showToast("Player updated!");
                } else {
                  await apiFetch("/players/", {
                    method: "POST",
                    body: JSON.stringify(payload),
                  });
                  showToast("Player added!");
                }
                setNewPlayerForm({ ...newPlayerForm, name: "" });
                loadAllAdminData();
              }}
              className="glass-card rounded-2xl p-5 border border-emerald-800/60 space-y-4"
            >
              <h3 className="font-display text-base font-extrabold text-white">
                {editingPlayerId
                  ? `Edit Player #${editingPlayerId}`
                  : "Register New Player"}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Player Name *"
                  value={newPlayerForm.name}
                  onChange={(e) =>
                    setNewPlayerForm({ ...newPlayerForm, name: e.target.value })
                  }
                  className="px-3 py-2 rounded-xl bg-charcoal-950 border border-emerald-800/70 text-xs text-white"
                />
                <select
                  value={newPlayerForm.team_id}
                  onChange={(e) =>
                    setNewPlayerForm({
                      ...newPlayerForm,
                      team_id: e.target.value,
                    })
                  }
                  className="px-3 py-2 rounded-xl bg-charcoal-950 border border-emerald-800/70 text-xs text-white"
                >
                  <option value="">Select Team</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <select
                  value={newPlayerForm.playing_role}
                  onChange={(e) =>
                    setNewPlayerForm({
                      ...newPlayerForm,
                      playing_role: e.target.value,
                    })
                  }
                  className="px-3 py-2 rounded-xl bg-charcoal-950 border border-emerald-800/70 text-xs text-white"
                >
                  <option value="ALL_ROUNDER">All-Rounder</option>
                  <option value="BATTER">Batter</option>
                  <option value="BOWLER">Bowler</option>
                  <option value="WICKET_KEEPER">Wicket-Keeper</option>
                </select>
                <input
                  type="number"
                  placeholder="Manual Runs"
                  value={newPlayerForm.manual_runs}
                  onChange={(e) =>
                    setNewPlayerForm({
                      ...newPlayerForm,
                      manual_runs: Number(e.target.value),
                    })
                  }
                  className="px-3 py-2 rounded-xl bg-charcoal-950 border border-emerald-800/70 text-xs text-white"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-amber-400 text-slate-950 font-black text-xs"
              >
                {editingPlayerId ? "Update Player" : "+ Save Player"}
              </button>
            </form>

            <div className="glass-card rounded-2xl p-5 border border-emerald-800/60 overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-emerald-900/60 text-emerald-300 uppercase">
                    <th className="py-2 px-3">Player</th>
                    <th className="py-2 px-3">Team</th>
                    <th className="py-2 px-3">Role</th>
                    <th className="py-2 px-3 text-right">Runs</th>
                    <th className="py-2 px-3 text-right">Wickets</th>
                    <th className="py-2 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-900/40">
                  {players.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2.5 px-3 font-bold text-white">
                        {p.name}
                      </td>
                      <td className="py-2.5 px-3">{p.team_name}</td>
                      <td className="py-2.5 px-3 text-emerald-400">
                        {p.playing_role_display || p.playing_role}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-400">
                        {p.total_runs}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                        {p.total_wickets}
                      </td>
                      <td className="py-2.5 px-3 text-right space-x-1.5">
                        <button
                          onClick={() => {
                            setEditingPlayerId(p.id);
                            setNewPlayerForm({
                              name: p.name,
                              village: p.village || "",
                              playing_role: p.playing_role || "ALL_ROUNDER",
                              batting_style:
                                p.batting_style || "Right-hand bat",
                              bowling_style:
                                p.bowling_style || "Right-arm medium",
                              jersey_number: p.jersey_number
                                ? String(p.jersey_number)
                                : "",
                              photo_url: p.photo_url || "",
                              team_id: p.team_id || "",
                              manual_matches: p.manual_stats?.matches || 0,
                              manual_runs: p.manual_stats?.runs || 0,
                              manual_highest_score:
                                p.manual_stats?.highest_score || 0,
                              manual_wickets: p.manual_stats?.wickets || 0,
                              manual_best_bowling:
                                p.manual_stats?.best_bowling || "0/0",
                              manual_stats_approved: true,
                            });
                          }}
                          className="px-2.5 py-1 rounded bg-emerald-950 text-emerald-300 font-bold"
                        >
                          Edit
                        </button>
                        <button
                          onClick={async () => {
                            await apiFetch(`/players/${p.id}/`, {
                              method: "DELETE",
                            });
                            loadAllAdminData();
                            showToast("Player deleted");
                          }}
                          className="px-2.5 py-1 rounded bg-red-500/20 text-red-300 font-bold"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =====================================================================
            MODULE 8: SCORES & RESULTS
        ===================================================================== */}
        {activeModule === "scores_results" && (
          <WinnerControlModule
            matches={matches}
            teams={teams}
            players={players}
            tournaments={tournaments}
            onRefreshAll={loadAllAdminData}
            notify={showToast}
          />
        )}

        {/* =====================================================================
            MODULE 9: WINNERS MANAGEMENT
        ===================================================================== */}
        {activeModule === "winners" && (
          <div className="space-y-6">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await apiFetch("/winners/", {
                  method: editingWinnerId ? "PUT" : "POST",
                  body: JSON.stringify({
                    id: editingWinnerId,
                    ...newWinnerForm,
                    winning_team_id: newWinnerForm.winning_team_id
                      ? Number(newWinnerForm.winning_team_id)
                      : null,
                    runner_up_team_id: newWinnerForm.runner_up_team_id
                      ? Number(newWinnerForm.runner_up_team_id)
                      : null,
                  }),
                });
                setEditingWinnerId(null);
                loadAllAdminData();
                showToast("Winner record saved!");
              }}
              className="glass-card rounded-2xl p-5 border border-emerald-800/60 space-y-4"
            >
              <h3 className="font-display text-base font-extrabold text-white">
                Add / Edit Tournament Champion Record
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Tournament Name *"
                  value={newWinnerForm.tournament_name}
                  onChange={(e) =>
                    setNewWinnerForm({
                      ...newWinnerForm,
                      tournament_name: e.target.value,
                    })
                  }
                  className="px-3 py-2 rounded-xl bg-charcoal-950 border border-emerald-800/70 text-xs text-white"
                />
                <select
                  required
                  value={newWinnerForm.winning_team_id}
                  onChange={(e) =>
                    setNewWinnerForm({
                      ...newWinnerForm,
                      winning_team_id: e.target.value,
                    })
                  }
                  className="px-3 py-2 rounded-xl bg-charcoal-950 border border-emerald-800/70 text-xs text-white"
                >
                  <option value="">Select Winning Team *</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Final Match Summary"
                  value={newWinnerForm.final_match_summary}
                  onChange={(e) =>
                    setNewWinnerForm({
                      ...newWinnerForm,
                      final_match_summary: e.target.value,
                    })
                  }
                  className="px-3 py-2 rounded-xl bg-charcoal-950 border border-emerald-800/70 text-xs text-white"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-amber-400 text-slate-950 font-black text-xs"
              >
                + Publish Winner Record
              </button>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {winners.map((w) => (
                <div
                  key={w.id}
                  className="glass-card rounded-2xl p-4 border border-emerald-800/60 flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs font-mono text-amber-400 font-bold">
                      {w.tournament_year} • {w.tournament_name}
                    </span>
                    <h4 className="font-display font-bold text-white">
                      👑 {w.winning_team_name}
                    </h4>
                  </div>
                  <button
                    onClick={async () => {
                      await apiFetch(`/winners/?id=${w.id}`, {
                        method: "DELETE",
                      });
                      loadAllAdminData();
                    }}
                    className="p-2 text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =====================================================================
            MODULE 10: POINTS TABLE MANAGEMENT
        ===================================================================== */}
        {activeModule === "points_table" && (
          <div className="space-y-6">
            <div className="glass-card rounded-2xl p-5 border border-emerald-800/60 flex flex-wrap items-center justify-between gap-4">
              <select
                value={selectedPtTournamentId || ""}
                onChange={(e) =>
                  setSelectedPtTournamentId(Number(e.target.value))
                }
                className="px-3.5 py-2 rounded-xl bg-charcoal-950 border border-emerald-800/70 text-sm font-bold text-white"
              >
                {tournaments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <button
                onClick={async () => {
                  if (!selectedPtTournamentId) return;
                  const res = await apiFetch<{ standings: StandingRow[] }>(
                    "/standings/",
                    {
                      method: "POST",
                      body: JSON.stringify({
                        action: "recalculate",
                        tournament_id: selectedPtTournamentId,
                      }),
                    }
                  );
                  setPtStandings(res.standings || []);
                  showToast("Standings & Net Run Rate recalculated!");
                }}
                className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-black text-xs"
              >
                Recalculate Standings & NRR
              </button>
            </div>

            <div className="glass-card rounded-2xl p-5 border border-emerald-800/60 overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-emerald-900/60 text-emerald-300 uppercase">
                    <th className="py-2 px-3">#</th>
                    <th className="py-2 px-3">Team</th>
                    <th className="py-2 px-3 text-center">P</th>
                    <th className="py-2 px-3 text-center">W</th>
                    <th className="py-2 px-3 text-center">L</th>
                    <th className="py-2 px-3 text-right">NRR</th>
                    <th className="py-2 px-3 text-right">Pts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-900/40">
                  {ptStandings.map((r) => (
                    <tr key={r.id}>
                      <td className="py-2.5 px-3 font-mono font-bold text-amber-400">
                        {r.rank}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-white">
                        {r.team.name}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        {r.played}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-emerald-400 font-bold">
                        {r.won}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        {r.lost}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {r.net_run_rate_display}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-amber-400">
                        {r.points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!selectedPtTournamentId || !adjForm.team_id) return;
                await apiFetch("/standings/", {
                  method: "POST",
                  body: JSON.stringify({
                    action: "adjust",
                    tournament_id: selectedPtTournamentId,
                    ...adjForm,
                  }),
                });
                loadStandings(selectedPtTournamentId);
                setAdjForm({
                  team_id: "",
                  points_delta: 0,
                  nrr_delta: 0,
                  reason: "",
                });
                showToast("Manual adjustment applied!");
              }}
              className="glass-card rounded-2xl p-5 border border-emerald-800/60 space-y-3"
            >
              <h4 className="font-display text-sm font-bold text-white">
                Audited Manual Points / NRR Adjustment
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <select
                  required
                  value={adjForm.team_id}
                  onChange={(e) =>
                    setAdjForm({ ...adjForm, team_id: e.target.value })
                  }
                  className="px-3 py-2 rounded-xl bg-charcoal-950 border border-emerald-800/70 text-xs text-white"
                >
                  <option value="">Select Team</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Points Delta"
                  value={adjForm.points_delta}
                  onChange={(e) =>
                    setAdjForm({
                      ...adjForm,
                      points_delta: Number(e.target.value),
                    })
                  }
                  className="px-3 py-2 rounded-xl bg-charcoal-950 border border-emerald-800/70 text-xs text-white"
                />
                <input
                  type="number"
                  step="0.001"
                  placeholder="NRR Delta"
                  value={adjForm.nrr_delta}
                  onChange={(e) =>
                    setAdjForm({
                      ...adjForm,
                      nrr_delta: Number(e.target.value),
                    })
                  }
                  className="px-3 py-2 rounded-xl bg-charcoal-950 border border-emerald-800/70 text-xs text-white"
                />
                <input
                  type="text"
                  required
                  placeholder="Reason *"
                  value={adjForm.reason}
                  onChange={(e) =>
                    setAdjForm({ ...adjForm, reason: e.target.value })
                  }
                  className="px-3 py-2 rounded-xl bg-charcoal-950 border border-emerald-800/70 text-xs text-white"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-black text-xs"
              >
                Apply Adjustment
              </button>
            </form>
          </div>
        )}

        {/* =====================================================================
            MODULE 11: GALLERY MANAGEMENT
        ===================================================================== */}
        {activeModule === "gallery" && (
          <div className="space-y-6">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await apiFetch("/gallery/", {
                  method: editingGalleryId ? "PUT" : "POST",
                  body: JSON.stringify({
                    id: editingGalleryId,
                    ...newGalleryForm,
                  }),
                });
                setEditingGalleryId(null);
                setNewGalleryForm({
                  ...newGalleryForm,
                  title: "",
                  image_url: "",
                });
                loadAllAdminData();
                showToast("Gallery photo saved!");
              }}
              className="glass-card rounded-2xl p-5 border border-emerald-800/60 space-y-3"
            >
              <h3 className="font-display text-base font-extrabold text-white">
                Add Photograph to Gallery
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Title *"
                  value={newGalleryForm.title}
                  onChange={(e) =>
                    setNewGalleryForm({
                      ...newGalleryForm,
                      title: e.target.value,
                    })
                  }
                  className="px-3 py-2 rounded-xl bg-charcoal-950 border border-emerald-800/70 text-xs text-white"
                />
                <select
                  value={newGalleryForm.category}
                  onChange={(e) =>
                    setNewGalleryForm({
                      ...newGalleryForm,
                      category: e.target.value,
                    })
                  }
                  className="px-3 py-2 rounded-xl bg-charcoal-950 border border-emerald-800/70 text-xs text-white"
                >
                  <option value="MATCH">Match Action</option>
                  <option value="CEREMONY">Opening Ceremony</option>
                  <option value="TEAM">Team Photo</option>
                  <option value="TROPHY">Trophy Presentation</option>
                  <option value="GROUND">Village Ground</option>
                </select>
                <input
                  type="text"
                  required
                  placeholder="Image URL *"
                  value={newGalleryForm.image_url}
                  onChange={(e) =>
                    setNewGalleryForm({
                      ...newGalleryForm,
                      image_url: e.target.value,
                    })
                  }
                  className="px-3 py-2 rounded-xl bg-charcoal-950 border border-emerald-800/70 text-xs text-white"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-amber-400 text-slate-950 font-black text-xs"
              >
                + Add Photo
              </button>
            </form>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {gallery.map((g) => (
                <div
                  key={g.id}
                  className="glass-card rounded-2xl overflow-hidden border border-emerald-800/60"
                >
                  <img
                    src={g.image_url}
                    alt={g.title}
                    className="h-32 w-full object-cover"
                  />
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-xs font-bold truncate">
                      {g.title}
                    </span>
                    <button
                      onClick={async () => {
                        await apiFetch(`/gallery/?id=${g.id}`, {
                          method: "DELETE",
                        });
                        loadAllAdminData();
                      }}
                      className="text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =====================================================================
            MODULE 12: NEWS & ANNOUNCEMENTS
        ===================================================================== */}
        {activeModule === "announcements" && (
          <div className="space-y-6">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await apiFetch("/announcements/", {
                  method: "POST",
                  body: JSON.stringify({
                    item_type: "announcement",
                    id: editingAnnouncementId,
                    ...newAnnouncementForm,
                  }),
                });
                setEditingAnnouncementId(null);
                setNewAnnouncementForm({ ...newAnnouncementForm, text: "" });
                loadAllAdminData();
                refreshSiteData();
                showToast("Announcement updated!");
              }}
              className="glass-card rounded-2xl p-5 border border-emerald-800/60 space-y-3"
            >
              <h3 className="font-display text-base font-extrabold text-white">
                Top Announcement Bar
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Announcement Text *"
                  value={newAnnouncementForm.text}
                  onChange={(e) =>
                    setNewAnnouncementForm({
                      ...newAnnouncementForm,
                      text: e.target.value,
                    })
                  }
                  className="sm:col-span-2 px-3 py-2 rounded-xl bg-charcoal-950 border border-emerald-800/70 text-xs text-white"
                />
                <input
                  type="text"
                  placeholder="Link URL (/tournaments)"
                  value={newAnnouncementForm.link_url}
                  onChange={(e) =>
                    setNewAnnouncementForm({
                      ...newAnnouncementForm,
                      link_url: e.target.value,
                    })
                  }
                  className="px-3 py-2 rounded-xl bg-charcoal-950 border border-emerald-800/70 text-xs text-white"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-black text-xs"
              >
                + Save Announcement
              </button>
            </form>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await apiFetch("/news/", {
                  method: "POST",
                  body: JSON.stringify({
                    item_type: "news",
                    id: editingNewsId,
                    ...newNewsForm,
                  }),
                });
                setEditingNewsId(null);
                setNewNewsForm({ ...newNewsForm, title: "", summary: "" });
                loadAllAdminData();
                showToast("News post published!");
              }}
              className="glass-card rounded-2xl p-5 border border-emerald-800/60 space-y-3"
            >
              <h3 className="font-display text-base font-extrabold text-white">
                Publish Official News Bulletin
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Headline *"
                  value={newNewsForm.title}
                  onChange={(e) =>
                    setNewNewsForm({ ...newNewsForm, title: e.target.value })
                  }
                  className="px-3 py-2 rounded-xl bg-charcoal-950 border border-emerald-800/70 text-xs text-white"
                />
                <input
                  type="text"
                  required
                  placeholder="Summary *"
                  value={newNewsForm.summary}
                  onChange={(e) =>
                    setNewNewsForm({ ...newNewsForm, summary: e.target.value })
                  }
                  className="px-3 py-2 rounded-xl bg-charcoal-950 border border-emerald-800/70 text-xs text-white"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-700 text-white font-black text-xs"
              >
                + Publish News
              </button>
            </form>
          </div>
        )}

        {/* =====================================================================
            MODULE 13: SPONSORS
        ===================================================================== */}
        {activeModule === "sponsors" && (
          <div className="space-y-6">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await apiFetch("/sponsors/", {
                  method: editingSponsorId ? "PUT" : "POST",
                  body: JSON.stringify({
                    id: editingSponsorId,
                    ...newSponsorForm,
                  }),
                });
                setEditingSponsorId(null);
                setNewSponsorForm({ ...newSponsorForm, name: "" });
                loadAllAdminData();
                showToast("Sponsor saved!");
              }}
              className="glass-card rounded-2xl p-5 border border-emerald-800/60 space-y-3"
            >
              <h3 className="font-display text-base font-extrabold text-white">
                Add Sponsor / Partner
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Sponsor Name *"
                  value={newSponsorForm.name}
                  onChange={(e) =>
                    setNewSponsorForm({
                      ...newSponsorForm,
                      name: e.target.value,
                    })
                  }
                  className="px-3 py-2 rounded-xl bg-charcoal-950 border border-emerald-800/70 text-xs text-white"
                />
                <select
                  value={newSponsorForm.tier}
                  onChange={(e) =>
                    setNewSponsorForm({
                      ...newSponsorForm,
                      tier: e.target.value,
                    })
                  }
                  className="px-3 py-2 rounded-xl bg-charcoal-950 border border-emerald-800/70 text-xs text-white"
                >
                  <option value="TITLE">Title Sponsor</option>
                  <option value="GOLD">Gold Partner</option>
                  <option value="SILVER">Silver Partner</option>
                  <option value="COMMUNITY">Community Partner</option>
                </select>
                <input
                  type="text"
                  placeholder="Tagline"
                  value={newSponsorForm.tagline}
                  onChange={(e) =>
                    setNewSponsorForm({
                      ...newSponsorForm,
                      tagline: e.target.value,
                    })
                  }
                  className="px-3 py-2 rounded-xl bg-charcoal-950 border border-emerald-800/70 text-xs text-white"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-black text-xs"
              >
                + Save Sponsor
              </button>
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {sponsors.map((s) => (
                <div
                  key={s.id}
                  className="glass-card rounded-xl p-4 border border-emerald-800/60 flex items-center justify-between"
                >
                  <div>
                    <span className="text-[10px] uppercase text-amber-400 font-bold">
                      {s.tier_display || s.tier}
                    </span>
                    <p className="font-bold text-sm text-white">{s.name}</p>
                  </div>
                  <button
                    onClick={async () => {
                      await apiFetch(`/sponsors/?id=${s.id}`, {
                        method: "DELETE",
                      });
                      loadAllAdminData();
                    }}
                    className="text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =====================================================================
            MODULE 14: HOMEPAGE MANAGEMENT (Hero + Sections A-O Ordering)
        ===================================================================== */}
        {activeModule === "homepage_cms" && siteSettings && (
          <div className="space-y-6">
            <form
              onSubmit={handleSaveSiteSettings}
              className="glass-card rounded-2xl p-6 border border-emerald-800/60 space-y-4"
            >
              <h3 className="font-display text-lg font-extrabold text-white">
                Homepage Hero Banner Editor
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Hero Title
                  </label>
                  <input
                    type="text"
                    value={siteSettings.hero_title}
                    onChange={(e) =>
                      setSiteSettings({
                        ...siteSettings,
                        hero_title: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-charcoal-950 border border-emerald-800/70 text-sm font-bold text-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Hero Subtitle
                  </label>
                  <textarea
                    rows={2}
                    value={siteSettings.hero_subtitle}
                    onChange={(e) =>
                      setSiteSettings({
                        ...siteSettings,
                        hero_subtitle: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-charcoal-950 border border-emerald-800/70 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Hero Background Image URL
                  </label>
                  <input
                    type="text"
                    value={siteSettings.hero_background_image}
                    onChange={(e) =>
                      setSiteSettings({
                        ...siteSettings,
                        hero_background_image: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-charcoal-950 border border-emerald-800/70 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Upcoming Banner Pill
                  </label>
                  <input
                    type="text"
                    value={siteSettings.upcoming_tournament_banner}
                    onChange={(e) =>
                      setSiteSettings({
                        ...siteSettings,
                        upcoming_tournament_banner: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-charcoal-950 border border-emerald-800/70 text-xs text-white"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-amber-400 text-slate-950 font-black text-xs"
              >
                Save Hero Settings
              </button>
            </form>

            <div className="glass-card rounded-2xl p-6 border border-emerald-800/60 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-extrabold text-white">
                  Homepage Sections Visibility & Ordering
                </h3>
                <button
                  onClick={async () => {
                    await apiFetch("/navigation/", {
                      method: "PUT",
                      body: JSON.stringify({ sections }),
                    });
                    await refreshSiteData();
                    showToast("Homepage sections updated!");
                  }}
                  className="px-5 py-2 rounded-xl bg-emerald-700 text-white font-black text-xs"
                >
                  Save Section Order
                </button>
              </div>
              <div className="space-y-2">
                {sections.map((sec, idx) => (
                  <div
                    key={sec.id}
                    className="p-3 rounded-xl bg-charcoal-950 border border-emerald-900/60 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        value={sec.display_order}
                        onChange={(e) => {
                          const next = [...sections];
                          next[idx].display_order = Number(e.target.value);
                          setSections(next);
                        }}
                        className="w-14 px-2 py-1 rounded bg-[#07150E] border border-emerald-800 text-xs font-mono text-center text-white"
                      />
                      <span className="font-bold text-xs text-white">
                        {sec.title}
                      </span>
                    </div>
                    <label className="inline-flex items-center gap-2 text-xs font-bold">
                      <input
                        type="checkbox"
                        checked={sec.is_visible}
                        onChange={(e) => {
                          const next = [...sections];
                          next[idx].is_visible = e.target.checked;
                          setSections(next);
                        }}
                      />
                      Visible
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            MODULE 15: NAVIGATION MANAGEMENT
        ===================================================================== */}
        {activeModule === "navigation_cms" && (
          <div className="glass-card rounded-2xl p-6 border border-emerald-800/60 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-extrabold text-white">
                Public Navigation Links (12 Links)
              </h3>
              <button
                onClick={async () => {
                  await apiFetch("/navigation/", {
                    method: "PUT",
                    body: JSON.stringify({ navigation: navItems }),
                  });
                  await refreshSiteData();
                  showToast("Navigation updated!");
                }}
                className="px-5 py-2 rounded-xl bg-amber-400 text-slate-950 font-black text-xs"
              >
                Save Navigation
              </button>
            </div>
            <div className="space-y-2">
              {navItems.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-charcoal-950 border border-emerald-900/60 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={item.display_order}
                      onChange={(e) => {
                        const next = [...navItems];
                        next[idx].display_order = Number(e.target.value);
                        setNavItems(next);
                      }}
                      className="w-14 px-2 py-1 rounded bg-[#07150E] border border-emerald-800 text-xs font-mono text-center text-white"
                    />
                    <input
                      type="text"
                      value={item.label}
                      onChange={(e) => {
                        const next = [...navItems];
                        next[idx].label = e.target.value;
                        setNavItems(next);
                      }}
                      className="px-3 py-1 rounded bg-[#07150E] border border-emerald-800 text-xs font-bold text-white"
                    />
                    <span className="text-xs font-mono text-slate-400">
                      {item.path}
                    </span>
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs font-bold">
                    <input
                      type="checkbox"
                      checked={item.is_visible}
                      onChange={(e) => {
                        const next = [...navItems];
                        next[idx].is_visible = e.target.checked;
                        setNavItems(next);
                      }}
                    />
                    Visible
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =====================================================================
            MODULE 16: WEBSITE SETTINGS
        ===================================================================== */}
        {activeModule === "site_settings" && siteSettings && (
          <form
            onSubmit={handleSaveSiteSettings}
            className="glass-card rounded-2xl p-6 border border-emerald-800/60 space-y-4"
          >
            <h3 className="font-display text-lg font-extrabold text-white">
              Website Branding, About, Contact & Footer Settings
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Website Name
                </label>
                <input
                  type="text"
                  value={siteSettings.site_name}
                  onChange={(e) =>
                    setSiteSettings({
                      ...siteSettings,
                      site_name: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-charcoal-950 border border-emerald-800/70 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Contact / Bug Report Email
                </label>
                <input
                  type="email"
                  value={siteSettings.contact_email}
                  onChange={(e) =>
                    setSiteSettings({
                      ...siteSettings,
                      contact_email: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-charcoal-950 border border-emerald-800/70 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Contact Phone
                </label>
                <input
                  type="text"
                  value={siteSettings.contact_phone}
                  onChange={(e) =>
                    setSiteSettings({
                      ...siteSettings,
                      contact_phone: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-charcoal-950 border border-emerald-800/70 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Copyright Text
                </label>
                <input
                  type="text"
                  value={siteSettings.copyright_text}
                  onChange={(e) =>
                    setSiteSettings({
                      ...siteSettings,
                      copyright_text: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-charcoal-950 border border-emerald-800/70 text-sm text-white"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Footer Description
                </label>
                <input
                  type="text"
                  value={siteSettings.footer_description}
                  onChange={(e) =>
                    setSiteSettings({
                      ...siteSettings,
                      footer_description: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-charcoal-950 border border-emerald-800/70 text-xs text-white"
                />
              </div>
            </div>
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-amber-400 text-slate-950 font-black text-xs"
            >
              Save All Website Settings
            </button>
          </form>
        )}

        {/* =====================================================================
            MODULE 17: CONTACT MESSAGES
        ===================================================================== */}
        {activeModule === "contact_messages" && (
          <div className="glass-card rounded-2xl p-6 border border-emerald-800/60 space-y-4">
            <h3 className="font-display text-lg font-extrabold text-white">
              Public Contact Messages ({contactMessages.length})
            </h3>
            {contactMessages.length > 0 ? (
              <div className="space-y-3">
                {contactMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="p-4 rounded-xl bg-charcoal-950 border border-emerald-900/60 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-white">
                        {msg.subject} — {msg.name} ({msg.phone})
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {msg.message}
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        await apiFetch("/contact/", {
                          method: "PATCH",
                          body: JSON.stringify({
                            id: msg.id,
                            status:
                              msg.status === "RESOLVED" ? "NEW" : "RESOLVED",
                          }),
                        });
                        loadAllAdminData();
                      }}
                      className="px-3 py-1 rounded-lg bg-emerald-800 text-white text-xs font-bold"
                    >
                      {msg.status}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">No contact messages yet.</p>
            )}
          </div>
        )}

        {/* =====================================================================
            MODULE 18: ADMIN USERS & ROLES
        ===================================================================== */}
        {activeModule === "admin_users" && (
          <div className="space-y-6">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await apiFetch("/admin/users/", {
                  method: "POST",
                  body: JSON.stringify(newUserForm),
                });
                setNewUserForm({
                  username: "",
                  email: "",
                  password: "",
                  role_code: "SCORER",
                  phone: "",
                });
                loadAllAdminData();
                showToast("User created!");
              }}
              className="glass-card rounded-2xl p-5 border border-emerald-800/60 space-y-4"
            >
              <h3 className="font-display text-base font-extrabold text-white">
                Create Admin / Scorer / Editor Account
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Username *"
                  value={newUserForm.username}
                  onChange={(e) =>
                    setNewUserForm({ ...newUserForm, username: e.target.value })
                  }
                  className="px-3 py-2 rounded-xl bg-charcoal-950 border border-emerald-800/70 text-xs text-white"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={newUserForm.email}
                  onChange={(e) =>
                    setNewUserForm({ ...newUserForm, email: e.target.value })
                  }
                  className="px-3 py-2 rounded-xl bg-charcoal-950 border border-emerald-800/70 text-xs text-white"
                />
                <input
                  type="password"
                  required
                  placeholder="Password *"
                  value={newUserForm.password}
                  onChange={(e) =>
                    setNewUserForm({ ...newUserForm, password: e.target.value })
                  }
                  className="px-3 py-2 rounded-xl bg-charcoal-950 border border-emerald-800/70 text-xs text-white"
                />
                <select
                  value={newUserForm.role_code}
                  onChange={(e) =>
                    setNewUserForm({
                      ...newUserForm,
                      role_code: e.target.value,
                    })
                  }
                  className="px-3 py-2 rounded-xl bg-charcoal-950 border border-emerald-800/70 text-xs text-white"
                >
                  <option value="SUPER_ADMIN">Super Admin</option>
                  <option value="TOURNAMENT_ADMIN">Tournament Admin</option>
                  <option value="SCORER">Match Scorer</option>
                  <option value="CONTENT_EDITOR">Content Editor</option>
                </select>
              </div>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-amber-400 text-slate-950 font-black text-xs"
              >
                + Create Account
              </button>
            </form>

            <div className="glass-card rounded-2xl p-5 border border-emerald-800/60 space-y-2">
              {adminUsers.map((u) => (
                <div
                  key={u.id}
                  className="p-3 rounded-xl bg-charcoal-950 flex items-center justify-between text-xs"
                >
                  <span className="font-bold text-white">
                    {u.username} ({u.email})
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold uppercase text-[10px]">
                    {u.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =====================================================================
            MODULE 19: ACTIVITY LOGS
        ===================================================================== */}
        {activeModule === "activity_logs" && (
          <div className="glass-card rounded-2xl p-6 border border-emerald-800/60 space-y-3">
            <h3 className="font-display text-lg font-extrabold text-white">
              System Audit & Activity Logs
            </h3>
            <div className="space-y-2">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-charcoal-950 border border-emerald-900/50 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-amber-400">
                      [{log.action}]
                    </span>{" "}
                    <span className="text-slate-200">{log.description}</span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-400">
                    {log.actor_name}
                  </span>
                </div>
              ))}
              {auditLogs.length === 0 && (
                <p className="text-xs text-slate-400">No activity logs recorded yet.</p>
              )}
            </div>
          </div>
        )}

        {/* =====================================================================
            MODULE 20: BACKUP & MAINTENANCE
        ===================================================================== */}
        {activeModule === "backup_maintenance" && (
          <div className="glass-card rounded-2xl p-6 border border-emerald-800/60 space-y-4">
            <h3 className="font-display text-lg font-extrabold text-white">
              Database Backup & Clean Slate Maintenance
            </h3>
            <p className="text-xs text-slate-300">
              Export a full JSON snapshot of all tournaments, teams, players,
              matches, scorecards, and CMS settings, or reset all test data to start fresh.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={async () => {
                  const dump = await apiFetch("/admin/backup/");
                  const blob = new Blob([JSON.stringify(dump, null, 2)], {
                    type: "application/json",
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "village-cricket-live-backup.json";
                  a.click();
                  showToast("Backup exported!");
                }}
                className="px-5 py-2.5 rounded-xl bg-amber-400 text-slate-950 font-black text-xs inline-flex items-center gap-2"
              >
                <FileText className="w-4 h-4" /> Export Full JSON Backup
              </button>

              <button
                type="button"
                onClick={handleClearAllTestData}
                className="px-5 py-2.5 rounded-xl bg-red-600/25 hover:bg-red-600/40 border border-red-500/50 text-red-200 font-black text-xs inline-flex items-center gap-2 transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Delete All Test Data (Reset to 0)
              </button>
            </div>
          </div>
        )}
        </div>
      </main>
    </div>
  );
}
