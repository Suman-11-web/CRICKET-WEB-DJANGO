"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  ChevronRight,
  Crown,
  Flame,
  Home,
  MapPin,
  Sparkles,
  Wifi,
} from "lucide-react";
import { useLiveMatchSocket } from "@/lib/api";
import { TeamCrest, VictoryCrackersBanner } from "@/components/MatchCard";

export default function MatchDetailsPage() {
  const params = useParams();
  const matchId = Number(params?.id || 0);
  const { match, connectionState, lastUpdated, refresh } =
    useLiveMatchSocket(matchId);
  const [activeTab, setActiveTab] = useState<
    "live" | "scorecard" | "commentary" | "stats" | "squad" | "info"
  >("live");
  const [selectedInningsTab, setSelectedInningsTab] = useState<number | null>(
    null
  );

  if (!match) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 space-y-6">
        <div className="h-48 rounded-2xl bg-charcoal-900 border border-white/10 animate-pulse p-8" />
        <div className="h-80 rounded-2xl bg-charcoal-900 border border-white/10 animate-pulse p-8" />
      </div>
    );
  }

  const activeInningsNum =
    selectedInningsTab || match.current_innings_number || 1;
  const currentInnings =
    match.innings.find((i) => i.innings_number === activeInningsNum) ||
    match.innings[0];

  const innA = match.innings.find((i) => i.batting_team.id === match.team_a.id);
  const innB = match.innings.find((i) => i.batting_team.id === match.team_b.id);

  const isLive = ["LIVE", "INNINGS_BREAK", "PAUSED"].includes(match.status);
  const isCompleted = ["COMPLETED", "ABANDONED"].includes(match.status);

  const winningTeamId = isCompleted ? match.result?.winning_team_id : null;
  const isTeamAWinner = Boolean(
    winningTeamId && winningTeamId === match.team_a.id
  );
  const isTeamBWinner = Boolean(
    winningTeamId && winningTeamId === match.team_b.id
  );

  // Compute chase requirement text when 2nd innings is in progress with a target
  let chaseBannerText = "";
  if (currentInnings && currentInnings.target_runs) {
    const runsNeeded = currentInnings.target_runs - currentInnings.runs;
    const ballsRemaining =
      currentInnings.max_overs * 6 -
      (currentInnings.completed_overs * 6 + currentInnings.balls_in_over);
    if (runsNeeded > 0 && ballsRemaining > 0) {
      chaseBannerText = `${currentInnings.batting_team.name} need ${runsNeeded} run${
        runsNeeded !== 1 ? "s" : ""
      } from ${ballsRemaining} ball${ballsRemaining !== 1 ? "s" : ""} to win`;
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Breadcrumb Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Link href="/" className="hover:text-gold-400 flex items-center gap-1">
            <Home className="w-3.5 h-3.5" />
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href="/matches" className="hover:text-gold-400 font-medium">
            Matches
          </Link>
          {match.tournament && (
            <>
              <ChevronRight className="w-3.5 h-3.5" />
              <Link
                href={`/tournaments/${match.tournament.id}`}
                className="hover:text-gold-400 font-medium"
              >
                {match.tournament.name}
              </Link>
            </>
          )}
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="font-bold text-white">{match.title}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-charcoal-900 border border-emerald-800 text-[11px] font-semibold text-emerald-300">
            <Wifi className="w-3 h-3 text-emerald-400" />
            <span>
              {connectionState === "connected"
                ? "Live WebSocket"
                : "Auto-Sync"}
            </span>
            {lastUpdated && <span>({lastUpdated})</span>}
          </span>
          <button
            type="button"
            onClick={refresh}
            className="px-2.5 py-1 rounded-lg bg-charcoal-900 border border-white/10 text-[11px] font-bold text-white hover:border-gold-400/50"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Victory Crackers Banner when completed */}
      {isCompleted && match.result?.winning_team_name && (
        <VictoryCrackersBanner
          winnerName={match.result.winning_team_name}
          summary={match.result.result_summary}
        />
      )}

      {/* Main Match Scoreboard Card */}
      <div className="rounded-3xl glass-card border border-emerald-800/60 shadow-2xl overflow-hidden">
        {/* Card Header */}
        <div className="px-6 py-4 border-b border-white/10 bg-white/[0.02] flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg sm:text-xl font-black text-white">
            {match.tournament
              ? `${match.tournament.name} • Match 0${match.match_number || match.id}`
              : match.title}
          </h1>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-gold-400" />
              {match.match_date}, {match.start_time?.slice(0, 5)}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-gold-400" />
              {match.venue}
            </span>
            <span className="font-semibold text-emerald-300">
              {match.match_format} ({match.overs_per_innings} Overs)
            </span>
            {isLive ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600 text-white text-[11px] font-black uppercase">
                <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                <span>LIVE</span>
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-emerald-700 text-white text-[11px] font-black uppercase">
                {match.status}
              </span>
            )}
          </div>
        </div>

        {/* Score Comparison Box with King Crown Highlight */}
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-11 items-stretch gap-4">
            {/* Team A */}
            <div
              className={`md:col-span-5 rounded-2xl p-5 flex items-center justify-between gap-4 border transition-all ${
                isTeamAWinner
                  ? "bg-gradient-to-r from-amber-500/20 via-emerald-950/85 to-charcoal-950 border-2 border-gold-400 shadow-[0_0_25px_rgba(212,175,55,0.28)]"
                  : "bg-charcoal-950/85 border-white/10"
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <TeamCrest
                  name={match.team_a.name}
                  shortName={match.team_a.short_name}
                  logoUrl={match.team_a.logo_url}
                  color={match.team_a.primary_color}
                  size="lg"
                  isWinner={isTeamAWinner}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p
                      className={`text-sm sm:text-base font-extrabold truncate ${
                        isTeamAWinner ? "text-gold-400" : "text-white"
                      }`}
                    >
                      {match.team_a.name}
                    </p>
                    {isTeamAWinner && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gold-500 text-charcoal-950 text-[9px] font-black uppercase">
                        <Crown className="w-2.5 h-2.5" /> KING
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate">
                    {match.team_a.village}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <p
                  className={`font-mono text-2xl sm:text-3xl font-black tabular-nums ${
                    isTeamAWinner ? "text-gold-400" : "text-white"
                  }`}
                >
                  {innA ? `${innA.runs}/${innA.wickets}` : "0/0"}
                </p>
                <p className="font-mono text-xs text-slate-400">
                  ({innA ? innA.overs_display : "0.0"} / {match.overs_per_innings}{" "}
                  Ov)
                </p>
              </div>
            </div>

            {/* VS Circle */}
            <div className="md:col-span-1 flex items-center justify-center">
              <span className="w-10 h-10 rounded-full bg-charcoal-900 border border-gold-500/30 flex items-center justify-center text-xs font-black text-gold-400 shadow-sm">
                VS
              </span>
            </div>

            {/* Team B */}
            <div
              className={`md:col-span-5 rounded-2xl p-5 flex items-center justify-between gap-4 border transition-all ${
                isTeamBWinner
                  ? "bg-gradient-to-r from-amber-500/20 via-emerald-950/85 to-charcoal-950 border-2 border-gold-400 shadow-[0_0_25px_rgba(212,175,55,0.28)]"
                  : "bg-charcoal-950/85 border-white/10"
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <TeamCrest
                  name={match.team_b.name}
                  shortName={match.team_b.short_name}
                  logoUrl={match.team_b.logo_url}
                  color={match.team_b.primary_color}
                  size="lg"
                  isWinner={isTeamBWinner}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p
                      className={`text-sm sm:text-base font-extrabold truncate ${
                        isTeamBWinner ? "text-gold-400" : "text-white"
                      }`}
                    >
                      {match.team_b.name}
                    </p>
                    {isTeamBWinner && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gold-500 text-charcoal-950 text-[9px] font-black uppercase">
                        <Crown className="w-2.5 h-2.5" /> KING
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate">
                    {match.team_b.village}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <p
                  className={`font-mono text-2xl sm:text-3xl font-black tabular-nums ${
                    isTeamBWinner ? "text-gold-400" : "text-white"
                  }`}
                >
                  {innB ? `${innB.runs}/${innB.wickets}` : "0/0"}
                </p>
                <p className="font-mono text-xs text-slate-400">
                  ({innB ? innB.overs_display : "0.0"} / {match.overs_per_innings}{" "}
                  Ov)
                </p>
              </div>
            </div>
          </div>

          {/* Chase Banner / Result Summary + Target | RRR | CRR Stat Boxes */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            <div className="lg:col-span-8 rounded-xl bg-emerald-950/60 border border-emerald-800/60 px-4 py-3 text-sm font-extrabold text-emerald-200 flex items-center gap-2">
              {isCompleted && match.result ? (
                <>
                  <Sparkles className="w-4 h-4 text-gold-400 shrink-0" />
                  <span>🏆 {match.result.result_summary}</span>
                </>
              ) : (
                <>
                  <Flame className="w-4 h-4 text-gold-400 shrink-0" />
                  <span>
                    {chaseBannerText ||
                      match.match_notes ||
                      `${
                        currentInnings?.batting_team.name || match.team_a.name
                      } — Innings ${
                        currentInnings?.innings_number || 1
                      } in progress`}
                  </span>
                </>
              )}
            </div>

            <div className="lg:col-span-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-white/5 border border-white/10 p-2">
                <span className="block text-[10px] uppercase text-slate-400">
                  Target
                </span>
                <strong className="text-sm font-black text-gold-400 font-mono">
                  {currentInnings?.target_runs ?? match.target_score ?? "-"}
                </strong>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-2">
                <span className="block text-[10px] uppercase text-slate-400">
                  RRR
                </span>
                <strong className="text-sm font-black text-white font-mono">
                  {currentInnings?.required_run_rate ?? "-"}
                </strong>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-2">
                <span className="block text-[10px] uppercase text-slate-400">
                  CRR
                </span>
                <strong className="text-sm font-black text-emerald-400 font-mono">
                  {currentInnings?.current_run_rate ?? "0.00"}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs: Live | Scorecard | Commentary | Stats | Squad | Info */}
        <div className="px-6 border-t border-white/10 flex flex-wrap gap-6 text-xs sm:text-sm font-bold">
          {[
            { key: "live", label: "Live" },
            { key: "scorecard", label: "Scorecard" },
            { key: "commentary", label: "Commentary" },
            { key: "stats", label: "Stats" },
            { key: "squad", label: "Squad" },
            { key: "info", label: "Info" },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key as typeof activeTab)}
              className={`py-3.5 border-b-2 transition-colors ${
                activeTab === t.key
                  ? "border-gold-400 text-gold-400 font-black"
                  : "border-transparent text-slate-400 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: LIVE VIEW (Striker + Non-Striker + Current Bowler + Last 6 Balls + Match Info) */}
      {activeTab === "live" && currentInnings && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Current Players on Field (7 Cols) */}
          <div className="lg:col-span-7 rounded-2xl glass-card border border-emerald-800/60 shadow-sm p-5 space-y-5">
            <h2 className="text-base font-black text-white">
              Current Players on Field
            </h2>

            {/* Batsmen Table */}
            <div className="space-y-2">
              <div className="grid grid-cols-12 text-[11px] font-bold uppercase text-slate-400 border-b border-white/10 pb-1.5">
                <span className="col-span-6">Batsman (Striker / Non-Striker)</span>
                <span className="col-span-3 text-right">R (B)</span>
                <span className="col-span-3 text-right">SR</span>
              </div>

              {currentInnings.striker ? (
                <div className="grid grid-cols-12 items-center py-2.5 text-xs sm:text-sm border-b border-white/5">
                  <div className="col-span-6 flex items-center gap-2.5 font-extrabold text-white">
                    <span className="w-7 h-7 rounded-full bg-emerald-800 text-gold-400 text-[10px] font-black flex items-center justify-center shrink-0">
                      {currentInnings.striker.name.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="truncate">
                      {currentInnings.striker.name}{" "}
                      <strong className="text-gold-400">*</strong>
                    </span>
                  </div>
                  <div className="col-span-3 text-right font-mono font-black text-gold-400 tabular-nums">
                    {currentInnings.striker.runs}{" "}
                    <span className="font-normal text-slate-400">
                      ({currentInnings.striker.balls_faced})
                    </span>
                  </div>
                  <div className="col-span-3 text-right font-mono text-xs text-slate-400 tabular-nums">
                    SR {currentInnings.striker.strike_rate.toFixed(1)}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-2">
                  Striker not selected yet.
                </p>
              )}

              {currentInnings.non_striker ? (
                <div className="grid grid-cols-12 items-center py-2.5 text-xs sm:text-sm">
                  <div className="col-span-6 flex items-center gap-2.5 font-bold text-slate-200">
                    <span className="w-7 h-7 rounded-full bg-white/10 text-slate-200 text-[10px] font-black flex items-center justify-center shrink-0">
                      {currentInnings.non_striker.name.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="truncate">{currentInnings.non_striker.name}</span>
                  </div>
                  <div className="col-span-3 text-right font-mono font-black text-white tabular-nums">
                    {currentInnings.non_striker.runs}{" "}
                    <span className="font-normal text-slate-400">
                      ({currentInnings.non_striker.balls_faced})
                    </span>
                  </div>
                  <div className="col-span-3 text-right font-mono text-xs text-slate-400 tabular-nums">
                    SR {currentInnings.non_striker.strike_rate.toFixed(1)}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-2">
                  Non-Striker not selected yet.
                </p>
              )}
            </div>

            {/* Bowler Table */}
            <div className="space-y-2 pt-2">
              <div className="grid grid-cols-12 text-[11px] font-bold uppercase text-slate-400 border-b border-white/10 pb-1.5">
                <span className="col-span-6">Current Bowler</span>
                <span className="col-span-3 text-right">O - M - R - W</span>
                <span className="col-span-3 text-right">Econ</span>
              </div>

              {currentInnings.current_bowler ? (
                <div className="grid grid-cols-12 items-center py-2.5 text-xs sm:text-sm">
                  <div className="col-span-6 flex items-center gap-2.5 font-extrabold text-white">
                    <span className="w-7 h-7 rounded-full bg-amber-500/20 text-gold-400 text-[10px] font-black flex items-center justify-center shrink-0">
                      {currentInnings.current_bowler.name
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                    <span className="truncate">
                      {currentInnings.current_bowler.name}
                    </span>
                  </div>
                  <div className="col-span-3 text-right font-mono font-black text-emerald-400 tabular-nums">
                    {currentInnings.current_bowler.overs} -{" "}
                    {currentInnings.current_bowler.maidens} -{" "}
                    {currentInnings.current_bowler.runs_conceded} -{" "}
                    {currentInnings.current_bowler.wickets}
                  </div>
                  <div className="col-span-3 text-right font-mono text-xs text-slate-400 tabular-nums">
                    Econ {currentInnings.current_bowler.economy.toFixed(2)}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-2">
                  Current bowler not selected yet.
                </p>
              )}
            </div>
          </div>

          {/* Right: Last 6 Balls + Match Info (5 Cols) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="rounded-2xl glass-card border border-emerald-800/60 shadow-sm p-5 space-y-3">
              <h3 className="text-sm font-black text-white">Last 6 Balls</h3>
              <div className="flex flex-wrap items-center gap-2.5">
                {match.recent_balls
                  .slice(0, 6)
                  .reverse()
                  .map((b) => (
                    <span
                      key={b.id}
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shadow-sm ${
                        b.is_wicket
                          ? "bg-red-600 text-white"
                          : b.runs_off_bat === 6 || b.runs_off_bat === 4
                          ? "bg-emerald-700 text-white"
                          : b.extra_type !== "NONE"
                          ? "bg-amber-400 text-slate-950"
                          : "bg-white/10 text-slate-200 border border-white/15"
                      }`}
                    >
                      {b.is_wicket
                        ? "W"
                        : b.extra_type === "WIDE"
                        ? "WD"
                        : b.extra_type === "NO_BALL"
                        ? "NB"
                        : b.total_runs}
                    </span>
                  ))}
                {match.recent_balls.length === 0 && (
                  <span className="text-xs text-slate-400">
                    Manual total scoring active
                  </span>
                )}
              </div>
            </div>

            <div className="rounded-2xl glass-card border border-emerald-800/60 shadow-sm p-5 space-y-3">
              <h3 className="text-sm font-black text-white">Match Info</h3>
              <div className="divide-y divide-white/5 text-xs">
                <div className="py-2 flex justify-between">
                  <span className="text-slate-400">Toss</span>
                  <span className="font-bold text-white">
                    {match.toss_winner_name
                      ? `${match.toss_winner_name} won the toss`
                      : "Pending"}
                  </span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-400">Decision</span>
                  <span className="font-bold text-white">
                    {match.toss_decision || "-"}
                  </span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-400">Umpire</span>
                  <span className="font-bold text-white">
                    {match.umpire_details || "Village Cricket Committee"}
                  </span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-400">Total Overs</span>
                  <span className="font-bold text-gold-400">
                    {match.overs_per_innings} Overs per side
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FULL SCORECARD */}
      {activeTab === "scorecard" && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {match.innings.map((inn) => (
              <button
                key={inn.id}
                type="button"
                onClick={() => setSelectedInningsTab(inn.innings_number)}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold ${
                  activeInningsNum === inn.innings_number
                    ? "bg-gold-500 text-charcoal-950"
                    : "bg-charcoal-900 text-slate-300 border border-white/10"
                }`}
              >
                Innings {inn.innings_number}: {inn.batting_team.name} (
                {inn.runs}/{inn.wickets})
              </button>
            ))}
          </div>

          {currentInnings && (
            <div className="rounded-2xl glass-card border border-emerald-800/60 overflow-hidden shadow-sm">
              <div className="px-5 py-3 bg-[#0B3B24] text-white flex justify-between items-center">
                <span className="font-bold text-sm">
                  {currentInnings.batting_team.name} Batting
                </span>
                <span className="text-xs font-extrabold text-gold-400 font-mono">
                  {currentInnings.runs}/{currentInnings.wickets} (
                  {currentInnings.overs_display}/{currentInnings.max_overs} ov)
                </span>
              </div>
              {currentInnings.batting_card.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-400">
                        <th className="py-3 px-4">Batter</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3 text-right">R</th>
                        <th className="py-3 px-3 text-right">B</th>
                        <th className="py-3 px-3 text-right">4s</th>
                        <th className="py-3 px-3 text-right">6s</th>
                        <th className="py-3 px-4 text-right">SR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {currentInnings.batting_card.map((row) => (
                        <tr key={row.id}>
                          <td className="py-3 px-4 font-bold text-white">
                            {row.player_name}
                          </td>
                          <td className="py-3 px-3 text-xs text-slate-400">
                            {row.dismissal_text}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-black text-gold-400">
                            {row.runs}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-300">
                            {row.balls_faced}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-300">
                            {row.fours}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-300">
                            {row.sixes}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-400">
                            {row.strike_rate.toFixed(1)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 text-xs text-slate-400">
                  Total Score: {currentInnings.runs}/{currentInnings.wickets} in{" "}
                  {currentInnings.overs_display} overs.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: COMMENTARY */}
      {activeTab === "commentary" && (
        <div className="rounded-2xl glass-card border border-emerald-800/60 p-5 space-y-3">
          <h2 className="text-base font-black text-white">
            Ball-by-Ball Commentary
          </h2>
          {match.recent_balls.length > 0 ? (
            match.recent_balls.map((b) => (
              <div
                key={b.id}
                className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3 text-xs"
              >
                <span className="px-2.5 py-1 rounded bg-[#0B3B24] text-gold-400 font-mono font-black">
                  {b.over_ball}
                </span>
                <span className="font-medium text-slate-200">
                  {b.commentary}
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400">
              No ball-by-ball events recorded for this match yet.
            </p>
          )}
        </div>
      )}

      {/* TAB 4 & 5: SQUAD (Displays All Players of Both Playing Teams!) */}
      {(activeTab === "squad" ||
        activeTab === "stats" ||
        activeTab === "info") && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[match.team_a, match.team_b].map((t) => (
            <div
              key={t.id}
              className="rounded-2xl glass-card border border-emerald-800/60 p-5 space-y-3 shadow-sm"
            >
              <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                <TeamCrest
                  name={t.name}
                  shortName={t.short_name}
                  logoUrl={t.logo_url}
                  color={t.primary_color}
                  size="sm"
                  isWinner={winningTeamId === t.id}
                />
                <div>
                  <h3 className="text-sm font-black text-white">
                    {t.name} — Playing Squad
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Captain: {t.captain_name || "TBA"}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(t.players || []).map((p, idx) => (
                  <div
                    key={p.id}
                    className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs"
                  >
                    <span className="font-bold text-white truncate">
                      {idx + 1}. {p.name}{" "}
                      {p.is_captain && (
                        <span className="text-gold-400">(C)</span>
                      )}
                    </span>
                    <span className="text-[10px] text-emerald-300">
                      {p.playing_role_display || p.playing_role}
                    </span>
                  </div>
                ))}
                {(!t.players || t.players.length === 0) && (
                  <p className="text-xs text-slate-400 col-span-2">
                    No squad players added to this team yet.
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
