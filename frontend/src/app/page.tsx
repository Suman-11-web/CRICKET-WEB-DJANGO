"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  BarChart3,
  Calendar,
  Camera,
  Crown,
  Flame,
  MapPin,
  Megaphone,
  Radio,
  Shield,
  Sparkles,
  Star,
  Trophy,
  Users,
} from "lucide-react";
import { useSite } from "@/context/SiteContext";
import {
  MatchCard,
  TeamCrest,
  VictoryCrackersBanner,
} from "@/components/MatchCard";

export default function HomePage() {
  const { homepage, settings, language } = useSite();
  const data = homepage;

  const isSectionVisible = (key: string) => {
    if (!data?.sections || data.sections.length === 0) return true;
    const found = data.sections.find(
      (s) => s.section_key.toLowerCase() === key.toLowerCase()
    );
    return found ? found.is_visible : true;
  };

  const heroTitle =
    language === "kn" && settings.hero_title_kn
      ? settings.hero_title_kn
      : settings.hero_title || "Where Village Cricket Comes Alive";
  const heroSubtitle =
    language === "kn" && settings.hero_subtitle_kn
      ? settings.hero_subtitle_kn
      : settings.hero_subtitle ||
        "Follow live scores, discover teams, celebrate champions and stay connected with every local cricket tournament.";

  const statsCounters = {
    tournaments:
      data?.stats_counters?.tournaments ?? data?.tournaments?.length ?? 0,
    teams: data?.stats_counters?.teams ?? data?.featured_teams?.length ?? 0,
    players:
      data?.stats_counters?.players ??
      data?.top_players?.most_runs?.length ??
      0,
    matches:
      data?.stats_counters?.matches ??
      (data?.live_matches?.length || 0) +
        (data?.upcoming_matches?.length || 0) +
        (data?.recent_results?.length || 0),
  };

  // Detect latest winning team from completed matches or tournament winners for Home Victory Celebration
  const latestWonMatch = data?.recent_results?.find(
    (m) => m.result?.winning_team_id || m.result?.winning_team_name
  );
  const latestChampion = data?.winners?.[0];
  const celebratedWinnerIds = new Set<number>();
  if (latestWonMatch?.result?.winning_team_id) {
    celebratedWinnerIds.add(latestWonMatch.result.winning_team_id);
  }
  data?.recent_results?.forEach((m) => {
    if (m.result?.winning_team_id) {
      celebratedWinnerIds.add(m.result.winning_team_id);
    }
  });
  data?.winners?.forEach((w) => {
    if (w.winning_team_id) {
      celebratedWinnerIds.add(w.winning_team_id);
    }
  });

  return (
    <div className="min-h-screen bg-charcoal-950 text-slate-100 pb-20">
      {/* =======================================================================
          SECTION C: PREMIUM HERO / LANDING SECTION (Desktop & Mobile Optimized)
      ======================================================================= */}
      {settings.hero_visible !== false && isSectionVisible("SECTION_C") && (
        <section className="relative overflow-hidden bg-gradient-to-br from-turf-950 via-charcoal-950 to-charcoal-900 border-b border-emerald-900/70">
          {settings.hero_background_image && (
            <div
              className="absolute inset-0 bg-cover bg-[position:65%_center] sm:bg-center bg-no-repeat opacity-30"
              style={{
                backgroundImage: `url('${settings.hero_background_image}')`,
              }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-charcoal-950 via-turf-950/90 to-charcoal-950/70" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 lg:py-20">
            <div className="space-y-8">
              {/* Top Hero Content */}
              <div className="max-w-3xl space-y-5">
                {settings.upcoming_tournament_banner && (
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-turf-900/90 border border-gold-500/40 text-gold-300 text-[11px] sm:text-xs font-extrabold uppercase tracking-wider shadow-lg">
                    <Sparkles className="w-3.5 h-3.5 text-gold-400 shrink-0" />
                    <span>{settings.upcoming_tournament_banner}</span>
                  </div>
                )}

                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08] text-white">
                  {heroTitle.split(" ").slice(0, -2).join(" ")}{" "}
                  <span className="gold-gradient-text block sm:inline">
                    {heroTitle.split(" ").slice(-2).join(" ")}
                  </span>
                </h1>

                <p className="text-sm sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
                  {heroSubtitle}
                </p>

                <div className="flex flex-wrap items-center gap-3.5 pt-1">
                  <Link
                    href={settings.hero_primary_cta_link || "/live-scores"}
                    className="inline-flex items-center gap-2.5 px-5 sm:px-6 py-3 sm:py-3.5 rounded-2xl bg-gold-500 hover:bg-gold-400 text-charcoal-950 font-black text-xs sm:text-sm shadow-xl transition-all transform hover:-translate-y-0.5"
                  >
                    <Radio className="w-4 h-4 text-red-700 animate-pulse" />
                    <span>
                      {settings.hero_primary_cta_text || "View Live Matches"}
                    </span>
                  </Link>

                  <Link
                    href={settings.hero_secondary_cta_link || "/tournaments"}
                    className="inline-flex items-center gap-2.5 px-5 sm:px-6 py-3 sm:py-3.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] text-white font-bold text-xs sm:text-sm border border-emerald-700/60 transition-all"
                  >
                    <Trophy className="w-4 h-4 text-gold-400" />
                    <span>
                      {settings.hero_secondary_cta_text ||
                        "Explore Tournaments"}
                    </span>
                  </Link>
                </div>

                {/* 4 KPI Stat Boxes */}
                <div className="pt-5 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10">
                    <p className="font-mono text-xl sm:text-2xl font-black text-gold-400">
                      {statsCounters.tournaments}
                    </p>
                    <p className="text-xs text-slate-400 font-semibold mt-0.5">
                      Tournaments
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10">
                    <p className="font-mono text-xl sm:text-2xl font-black text-emerald-400">
                      {statsCounters.teams}
                    </p>
                    <p className="text-xs text-slate-400 font-semibold mt-0.5">
                      Village Teams
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10">
                    <p className="font-mono text-xl sm:text-2xl font-black text-white">
                      {statsCounters.players}
                    </p>
                    <p className="text-xs text-slate-400 font-semibold mt-0.5">
                      Players
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10">
                    <p className="font-mono text-xl sm:text-2xl font-black text-gold-300">
                      {statsCounters.matches}
                    </p>
                    <p className="text-xs text-slate-400 font-semibold mt-0.5">
                      Matches
                    </p>
                  </div>
                </div>
              </div>

              {/* Victory Crackers Celebration Banner (Displays automatically on Home Page when a Team Wins!) */}
              {(latestWonMatch?.result?.winning_team_name ||
                latestChampion?.winning_team_name) && (
                <VictoryCrackersBanner
                  winnerName={
                    latestWonMatch?.result?.winning_team_name ||
                    latestChampion?.winning_team_name ||
                    ""
                  }
                  summary={
                    latestWonMatch?.result?.result_summary ||
                    latestChampion?.final_match_summary
                  }
                />
              )}

              {/* 100% Full-Width Hero Live Match Spotlight */}
              {data?.live_matches && data.live_matches.length > 0 && (
                <div className="w-full space-y-2.5 pt-2">
                  <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-gold-400 px-1">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                      Featured Live Match Spotlight
                    </span>
                    <Link
                      href="/live-scores"
                      className="text-emerald-300 hover:text-white"
                    >
                      All Live Scores →
                    </Link>
                  </div>
                  <MatchCard match={data.live_matches[0]} />
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14 sm:space-y-16 pt-10 sm:pt-12">
        {/* =====================================================================
            SECTION D: LIVE CRICKET MATCHES (100% Full Width Match Boxes)
        ===================================================================== */}
        {isSectionVisible("SECTION_D") && (
          <section className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-red-400">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                  Real-Time Stadium Scoreboard
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
                  Live Cricket Matches
                </h2>
              </div>
              <Link
                href="/live-scores"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-gold-400 hover:text-gold-300"
              >
                <span>Open Live Match Center</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {data?.live_matches && data.live_matches.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 w-full">
                {data.live_matches.map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            ) : (
              <div className="rounded-3xl bg-charcoal-900 border border-emerald-900/60 p-8 text-center space-y-2">
                <Radio className="w-8 h-8 text-emerald-400 mx-auto" />
                <h3 className="text-lg font-bold text-white">
                  No Live Matches Right This Moment
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Live ball-by-ball scores, striker, non-striker, and bowler
                  updates appear here automatically as soon as a match starts.
                </p>
              </div>
            )}
          </section>
        )}

        {/* =====================================================================
            SECTION E: UPCOMING MATCHES (100% Full Width Match Boxes)
        ===================================================================== */}
        {isSectionVisible("SECTION_E") && (
          <section className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400">
                  Scheduled Fixtures
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white mt-1 flex items-center gap-2.5">
                  <Calendar className="w-7 h-7 text-gold-400" />
                  <span>Upcoming Matches</span>
                </h2>
              </div>
              <Link
                href="/matches"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-gold-400 hover:text-gold-300"
              >
                <span>View Full Schedule</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {data?.upcoming_matches && data.upcoming_matches.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 w-full">
                {data.upcoming_matches.map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            ) : (
              <div className="rounded-3xl bg-charcoal-900 border border-emerald-900/60 p-8 text-center text-xs text-slate-400">
                No upcoming fixtures scheduled yet.
              </div>
            )}
          </section>
        )}

        {/* =====================================================================
            SECTION F: RECENT MATCH RESULTS (100% Full Width + Winner Crown & Crackers)
        ===================================================================== */}
        {isSectionVisible("SECTION_F") && (
          <section className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-widest text-gold-400">
                  Completed Scorecards & Victory Margins
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white mt-1 flex items-center gap-2.5">
                  <Trophy className="w-7 h-7 text-emerald-400" />
                  <span>Recent Match Results</span>
                </h2>
              </div>
              <Link
                href="/results"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-gold-400 hover:text-gold-300"
              >
                <span>All Match Results</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {data?.recent_results && data.recent_results.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 w-full">
                {data.recent_results.map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            ) : (
              <div className="rounded-3xl bg-charcoal-900 border border-emerald-900/60 p-8 text-center text-xs text-slate-400">
                No completed match results yet.
              </div>
            )}
          </section>
        )}

        {/* =====================================================================
            SECTION G: TOURNAMENT INFORMATION
        ===================================================================== */}
        {isSectionVisible("SECTION_G") && (
          <section className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-widest text-gold-400">
                  Official Panchayat & District Cups
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
                  Active & Past Tournaments
                </h2>
              </div>
              <Link
                href="/tournaments"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-gold-400 hover:text-gold-300"
              >
                <span>Explore All Tournaments</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {data?.tournaments && data.tournaments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {data.tournaments.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-3xl bg-gradient-to-br from-turf-900 via-charcoal-900 to-charcoal-950 border border-emerald-800/70 hover:border-gold-500/50 p-6 sm:p-8 flex flex-col justify-between shadow-2xl transition-all"
                  >
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="px-3.5 py-1 rounded-full text-xs font-extrabold bg-gold-500 text-charcoal-950">
                          {t.status_display} • Season {t.season_year}
                        </span>
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-emerald-300">
                          {t.match_format_display} ({t.overs_per_innings} Overs)
                        </span>
                      </div>

                      <h3 className="text-2xl sm:text-3xl font-black text-white">
                        {t.name}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                        {t.description}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-slate-200">
                        <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-2.5">
                          <MapPin className="w-4 h-4 text-gold-400 shrink-0" />
                          <span className="truncate">
                            {t.ground_name}, {t.village}
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-2.5">
                          <Calendar className="w-4 h-4 text-gold-400 shrink-0" />
                          <span>
                            {t.start_date} to {t.end_date}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                      <span className="text-xs font-bold text-gold-300">
                        🏆 {t.prize_details || `${t.max_teams} Teams`}
                      </span>
                      <Link
                        href={`/tournaments/${t.id}`}
                        className="px-4 py-2 rounded-xl bg-gold-500 hover:bg-gold-400 text-charcoal-950 text-xs font-black transition-colors"
                      >
                        View Tournament →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-3xl bg-charcoal-900 border border-emerald-900/60 p-8 text-center text-xs text-slate-400">
                No tournaments created yet.
              </div>
            )}
          </section>
        )}

        {/* =====================================================================
            SECTION H: FEATURED TEAMS (Highlights Winning Teams with King Crown Ring)
        ===================================================================== */}
        {isSectionVisible("SECTION_H") && (
          <section className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400">
                  Registered Squads & Franchises
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white mt-1 flex items-center gap-2.5">
                  <Shield className="w-7 h-7 text-gold-400" />
                  <span>Featured Village Teams</span>
                </h2>
              </div>
              <Link
                href="/teams"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-gold-400 hover:text-gold-300"
              >
                <span>All Village Teams</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {data?.featured_teams && data.featured_teams.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.featured_teams.slice(0, 6).map((team) => {
                  const isWinnerTeam =
                    celebratedWinnerIds.has(team.id) || (team.wins || 0) > 0;
                  return (
                    <div
                      key={team.id}
                      className={`rounded-3xl p-6 flex flex-col justify-between shadow-xl transition-all relative ${
                        isWinnerTeam
                          ? "bg-gradient-to-br from-charcoal-900 via-turf-950 to-charcoal-900 border-2 border-gold-400/70 shadow-[0_0_25px_rgba(212,175,55,0.2)]"
                          : "bg-charcoal-900 border border-emerald-900/60 hover:border-gold-500/50"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-4 mb-4 pt-2">
                          <TeamCrest
                            name={team.name}
                            shortName={team.short_name}
                            logoUrl={team.logo_url}
                            color={team.primary_color}
                            size="lg"
                            isWinner={isWinnerTeam}
                          />
                          <div className="min-w-0">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                              <MapPin className="w-3 h-3 shrink-0" />{" "}
                              {team.village}
                            </span>
                            <h3 className="text-lg font-black text-white truncate">
                              {team.name}
                            </h3>
                            <p className="text-xs text-slate-400">
                              Captain:{" "}
                              <strong className="text-gold-300">
                                {team.captain_name || "TBA"}
                              </strong>
                            </p>
                          </div>
                        </div>

                        {team.description && (
                          <p className="text-xs text-slate-300 line-clamp-2 mb-4">
                            {team.description}
                          </p>
                        )}
                      </div>

                      <div className="space-y-3 pt-3 border-t border-white/10">
                        <div className="grid grid-cols-4 gap-2 text-center text-xs">
                          <div className="p-2 rounded-xl bg-white/[0.03]">
                            <span className="text-[10px] text-slate-400 block">
                              Played
                            </span>
                            <strong className="text-white font-mono">
                              {team.matches_played || 0}
                            </strong>
                          </div>
                          <div className="p-2 rounded-xl bg-white/[0.03]">
                            <span className="text-[10px] text-emerald-400 block">
                              Won
                            </span>
                            <strong className="text-emerald-400 font-mono">
                              {team.wins || 0}
                            </strong>
                          </div>
                          <div className="p-2 rounded-xl bg-white/[0.03]">
                            <span className="text-[10px] text-red-400 block">
                              Lost
                            </span>
                            <strong className="text-red-400 font-mono">
                              {team.losses || 0}
                            </strong>
                          </div>
                          <div className="p-2 rounded-xl bg-white/[0.03]">
                            <span className="text-[10px] text-amber-400 block">
                              Squad
                            </span>
                            <strong className="text-amber-400 font-mono">
                              {team.players_count || team.players?.length || 0}
                            </strong>
                          </div>
                        </div>

                        <Link
                          href={`/teams/${team.id}`}
                          className="block w-full py-2.5 rounded-xl bg-white/[0.06] hover:bg-gold-500 hover:text-charcoal-950 text-center text-xs font-extrabold text-white transition-colors"
                        >
                          View Team Profile & Squad →
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-3xl bg-charcoal-900 border border-emerald-900/60 p-8 text-center text-xs text-slate-400">
                No village teams registered yet.
              </div>
            )}
          </section>
        )}

        {/* =====================================================================
            SECTION I: POINTS TABLE PREVIEW
        ===================================================================== */}
        {isSectionVisible("SECTION_I") && (
          <section className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400">
                  Live Standings & Net Run Rate
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white mt-1 flex items-center gap-2.5">
                  <BarChart3 className="w-7 h-7 text-gold-400" />
                  <span>
                    Points Table{" "}
                    {data?.active_tournament_for_standings
                      ? `— ${data.active_tournament_for_standings.name}`
                      : ""}
                  </span>
                </h2>
              </div>
              <Link
                href="/points-table"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-gold-400 hover:text-gold-300"
              >
                <span>Open Full Points Table</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="rounded-3xl bg-charcoal-900 border border-emerald-900/60 overflow-hidden shadow-2xl">
              {data?.standings_preview && data.standings_preview.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-turf-950 text-[11px] uppercase text-emerald-300 font-bold border-b border-white/10">
                        <th className="py-3.5 px-4">Rank</th>
                        <th className="py-3.5 px-4">Team</th>
                        <th className="py-3.5 px-3 text-center">Played</th>
                        <th className="py-3.5 px-3 text-center">Won</th>
                        <th className="py-3.5 px-3 text-center">Lost</th>
                        <th className="py-3.5 px-3 text-center">Tied</th>
                        <th className="py-3.5 px-3 text-center">No Result</th>
                        <th className="py-3.5 px-4 text-right">Net Run Rate</th>
                        <th className="py-3.5 px-5 text-right">Points</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {data.standings_preview.map((row) => (
                        <tr
                          key={row.id}
                          className={`transition-colors ${
                            row.rank === 1
                              ? "bg-gold-500/10 hover:bg-gold-500/15"
                              : "hover:bg-white/[0.02]"
                          }`}
                        >
                          <td className="py-3.5 px-4 font-mono font-black text-gold-400">
                            #{row.rank}
                          </td>
                          <td className="py-3.5 px-4">
                            <Link
                              href={`/teams/${row.team.id}`}
                              className="flex items-center gap-3 font-bold text-white hover:text-gold-400 py-1"
                            >
                              <TeamCrest
                                name={row.team.name}
                                shortName={row.team.short_name}
                                logoUrl={row.team.logo_url}
                                color={row.team.primary_color}
                                size="sm"
                                isWinner={row.rank === 1 && row.won > 0}
                              />
                              <span>{row.team.name}</span>
                            </Link>
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono">
                            {row.played}
                          </td>
                          <td className="py-3.5 px-3 text-center text-emerald-400 font-mono font-bold">
                            {row.won}
                          </td>
                          <td className="py-3.5 px-3 text-center text-red-400 font-mono">
                            {row.lost}
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono">
                            {row.tied}
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono">
                            {row.no_result}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono">
                            {row.net_run_rate_display}
                          </td>
                          <td className="py-3.5 px-5 text-right font-mono font-black text-gold-400 text-base">
                            {row.points}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-400">
                  Points Table standings will update automatically as tournament
                  matches are finalized.
                </div>
              )}
            </div>
          </section>
        )}

        {/* =====================================================================
            SECTION J: TOP PLAYERS (Most Runs, Most Wickets & Awards)
        ===================================================================== */}
        {isSectionVisible("SECTION_J") && (
          <section className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-widest text-gold-400">
                  Orange Cap, Purple Cap & MVP Honours
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white mt-1 flex items-center gap-2.5">
                  <Award className="w-7 h-7 text-gold-400" />
                  <span>Tournament Top Players</span>
                </h2>
              </div>
              <Link
                href="/players"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-gold-400 hover:text-gold-300"
              >
                <span>All Registered Players</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Most Runs Column */}
              <div className="rounded-3xl bg-charcoal-900 border border-emerald-900/60 p-6 space-y-4 shadow-xl">
                <h3 className="text-base font-black text-gold-400 flex items-center gap-2">
                  <Flame className="w-5 h-5" />
                  <span>Most Runs (Batting Leaders)</span>
                </h3>
                {data?.top_players?.most_runs &&
                data.top_players.most_runs.length > 0 ? (
                  <div className="space-y-3">
                    {data.top_players.most_runs.map((p, idx) => (
                      <Link
                        key={p.id}
                        href={`/players/${p.id}`}
                        className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-8 h-8 rounded-xl bg-gold-500 text-charcoal-950 font-black text-xs flex items-center justify-center shrink-0">
                            #{idx + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="font-bold text-white text-sm truncate">
                              {p.name}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate">
                              {p.team_name} • HS: {p.highest_score}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0 pl-2">
                          <span className="font-mono text-xl font-black text-gold-400">
                            {p.total_runs}
                          </span>
                          <span className="block text-[10px] uppercase text-slate-400">
                            Runs
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 py-4 text-center">
                    No batting leaders recorded yet.
                  </p>
                )}
              </div>

              {/* Most Wickets Column */}
              <div className="rounded-3xl bg-charcoal-900 border border-emerald-900/60 p-6 space-y-4 shadow-xl">
                <h3 className="text-base font-black text-emerald-400 flex items-center gap-2">
                  <Star className="w-5 h-5" />
                  <span>Most Wickets (Bowling Leaders)</span>
                </h3>
                {data?.top_players?.most_wickets &&
                data.top_players.most_wickets.length > 0 ? (
                  <div className="space-y-3">
                    {data.top_players.most_wickets.map((p, idx) => (
                      <Link
                        key={p.id}
                        href={`/players/${p.id}`}
                        className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-8 h-8 rounded-xl bg-emerald-500 text-charcoal-950 font-black text-xs flex items-center justify-center shrink-0">
                            #{idx + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="font-bold text-white text-sm truncate">
                              {p.name}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate">
                              {p.team_name} • Best:{" "}
                              {p.manual_stats?.best_bowling || "-"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0 pl-2">
                          <span className="font-mono text-xl font-black text-emerald-400">
                            {p.total_wickets}
                          </span>
                          <span className="block text-[10px] uppercase text-slate-400">
                            Wickets
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 py-4 text-center">
                    No bowling leaders recorded yet.
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* =====================================================================
            SECTION K: TOURNAMENT WINNERS SHOWCASE (With King Crown & Crackers)
        ===================================================================== */}
        {isSectionVisible("SECTION_K") &&
          data?.winners &&
          data.winners.length > 0 && (
            <section className="space-y-5">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-widest text-gold-400">
                    Hall of Champions
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-white mt-1 flex items-center gap-2">
                    <Crown className="w-7 h-7 text-gold-400" />
                    <span>Tournament Winners Showcase</span>
                  </h2>
                </div>
                <Link
                  href="/winners"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-gold-400 hover:text-gold-300"
                >
                  <span>Search Champions Archive</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {data.winners.map((w) => (
                  <div
                    key={w.id}
                    className="rounded-3xl bg-gradient-to-br from-charcoal-900 via-charcoal-900 to-turf-950 border-2 border-gold-400/60 overflow-hidden shadow-[0_0_30px_rgba(212,175,55,0.2)] flex flex-col sm:flex-row relative"
                  >
                    <div className="pointer-events-none absolute top-3 right-4 flex gap-1.5 text-base">
                      <span className="animate-bounce">🎆</span>
                      <span className="animate-pulse">🎇</span>
                    </div>
                    {w.winner_photograph && (
                      <div className="sm:w-52 h-52 sm:h-auto shrink-0 relative">
                        <img
                          src={w.winner_photograph}
                          alt={w.winning_team_name}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-gold-500 text-charcoal-950 font-black text-xs">
                          👑 {w.tournament_year}
                        </span>
                      </div>
                    )}
                    <div className="p-6 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-gold-400">
                          {w.tournament_name}
                        </p>
                        <div className="flex items-center gap-3 mt-2 pt-2">
                          <TeamCrest
                            name={w.winning_team_name}
                            shortName={w.winning_team_name
                              .slice(0, 3)
                              .toUpperCase()}
                            logoUrl={w.winning_team_logo}
                            size="sm"
                            isWinner={true}
                          />
                          <h3 className="text-xl sm:text-2xl font-black text-gold-300">
                            {w.winning_team_name}
                          </h3>
                        </div>
                        <p className="text-xs text-slate-400 mt-2">
                          Runner-Up:{" "}
                          <strong className="text-slate-200">
                            {w.runner_up_team_name}
                          </strong>
                        </p>
                        <p className="text-xs text-emerald-200/90 mt-3 leading-relaxed">
                          {w.final_match_summary}
                        </p>
                      </div>
                      <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                        <span className="text-slate-300">
                          MVP:{" "}
                          <strong className="text-white">
                            {w.player_of_the_tournament}
                          </strong>
                        </span>
                        <span className="font-bold text-gold-400">
                          {w.prize_amount}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

        {/* =====================================================================
            SECTION L: PHOTO GALLERY
        ===================================================================== */}
        {isSectionVisible("SECTION_L") &&
          data?.gallery &&
          data.gallery.length > 0 && (
            <section className="space-y-5">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400">
                    Moments from the Pitch
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-white mt-1 flex items-center gap-2.5">
                    <Camera className="w-7 h-7 text-gold-400" />
                    <span>Cricket Photo Gallery</span>
                  </h2>
                </div>
                <Link
                  href="/gallery"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-gold-400 hover:text-gold-300"
                >
                  <span>Open Full Gallery</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {data.gallery.slice(0, 4).map((g) => (
                  <Link
                    key={g.id}
                    href="/gallery"
                    className="group rounded-3xl bg-charcoal-900 border border-white/10 hover:border-gold-500/40 overflow-hidden shadow-xl transition-all"
                  >
                    <div className="h-48 overflow-hidden relative">
                      <img
                        src={g.image_url}
                        alt={g.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full bg-charcoal-950/90 text-gold-400 text-[10px] font-bold uppercase">
                        {g.category_display || g.category}
                      </span>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-white text-sm line-clamp-1">
                        {g.title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {g.caption}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

        {/* =====================================================================
            SECTION M & SECTION N: SPONSORS + LATEST NEWS & ANNOUNCEMENTS
        ===================================================================== */}
        {((isSectionVisible("SECTION_N") &&
          data?.news &&
          data.news.length > 0) ||
          (isSectionVisible("SECTION_M") &&
            data?.sponsors &&
            data.sponsors.length > 0)) && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* SECTION N: LATEST NEWS (7 Cols) */}
            {isSectionVisible("SECTION_N") && (
              <div className="lg:col-span-7 space-y-5">
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-widest text-gold-400">
                    Official Organizer Updates
                  </span>
                  <h2 className="text-2xl font-black text-white mt-1 flex items-center gap-2">
                    <Megaphone className="w-6 h-6 text-emerald-400" />
                    <span>Latest News & Announcements</span>
                  </h2>
                </div>

                <div className="space-y-4">
                  {(data?.news || []).map((item) => (
                    <div
                      key={item.id}
                      className="rounded-3xl bg-charcoal-900 border border-emerald-900/60 p-6 space-y-2 shadow-xl"
                    >
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-turf-800 text-emerald-300 text-[10px] font-bold uppercase">
                          {item.category_display || item.category}
                        </span>
                        {item.is_pinned && (
                          <span className="px-2.5 py-0.5 rounded-full bg-gold-500/20 text-gold-300 text-[10px] font-bold uppercase">
                            Pinned
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-extrabold text-white">
                        {item.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                        {item.summary}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECTION M: SPONSORS & PARTNERS (5 Cols) */}
            {isSectionVisible("SECTION_M") && (
              <div className="lg:col-span-5 space-y-5">
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400">
                    Community Backers
                  </span>
                  <h2 className="text-2xl font-black text-white mt-1">
                    Sponsors & Partners
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(data?.sponsors || []).map((sp) => (
                    <div
                      key={sp.id}
                      className="rounded-3xl bg-charcoal-900 border border-emerald-900/60 p-5 space-y-2 shadow-xl"
                    >
                      <span className="px-2.5 py-0.5 rounded-full bg-gold-500/20 text-gold-300 text-[10px] font-bold uppercase">
                        {sp.tier_display || sp.tier}
                      </span>
                      <h3 className="font-bold text-white text-sm pt-1">
                        {sp.name}
                      </h3>
                      <p className="text-xs text-slate-400">{sp.tagline}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
