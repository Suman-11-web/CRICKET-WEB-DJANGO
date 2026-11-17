"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Award, CheckCircle2, Shield, Trophy } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { PlayerData } from "@/types/cricket";

interface PlayerDetailPayload extends PlayerData {
  membership_history: Array<{
    id: number;
    team_id: number;
    team_name: string;
    tournament_name: string;
    season_year: number;
    role_in_team: string;
    is_active: boolean;
  }>;
  recent_performances: Array<{
    match_id: number;
    match_title: string;
    match_date: string;
    runs: number;
    balls_faced: number;
    fours: number;
    sixes: number;
    dismissal_text: string;
  }>;
  awards: Array<{
    id: number;
    award_type: string;
    performance_summary: string;
    match_title: string;
  }>;
}

export default function PlayerProfilePage() {
  const params = useParams();
  const playerId = Number(params?.id || 0);
  const [player, setPlayer] = useState<PlayerDetailPayload | null>(null);

  useEffect(() => {
    if (!playerId) return;
    apiFetch<PlayerDetailPayload>(`/players/${playerId}/`)
      .then(setPlayer)
      .catch(() => {});
  }, [playerId]);

  if (!player) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="h-64 rounded-2xl bg-charcoal-900 border border-white/10 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <Link
        href="/players"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-gold-400"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>All Players</span>
      </Link>

      {/* Player Card Header */}
      <div className="rounded-3xl bg-gradient-to-br from-turf-950 via-charcoal-900 to-charcoal-950 border border-emerald-800/70 p-6 sm:p-10 space-y-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-3xl bg-turf-800 border-2 border-gold-500/50 flex items-center justify-center text-2xl font-black text-gold-300">
              {player.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-gold-500 text-charcoal-950">
                  {player.playing_role_display}
                </span>
                {player.jersey_number !== null && (
                  <span className="text-sm font-black text-gold-400">
                    Jersey #{player.jersey_number}
                  </span>
                )}
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white">
                {player.name} {player.is_captain && <span className="text-gold-400">(Captain)</span>}
              </h1>
              <p className="text-sm text-emerald-300 font-semibold">
                Team:{" "}
                {player.team_id ? (
                  <Link href={`/teams/${player.team_id}`} className="underline">
                    {player.team_name}
                  </Link>
                ) : (
                  player.team_name
                )}{" "}
                • Village: {player.village || "Local"}
              </p>
              <p className="text-xs text-slate-400">
                Batting: {player.batting_style} • Bowling: {player.bowling_style}
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-charcoal-950/80 border border-white/10 p-4 text-xs space-y-1">
            <span className="text-emerald-400 font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Statistics Provenance</span>
            </span>
            <p className="text-slate-300">
              {player.stats_source === "CALCULATED_AND_MANUAL_VERIFIED"
                ? "Includes Match Scorecard Records + Organizer-Approved Historical Stats"
                : "Calculated Strictly from Official Match Scorecards"}
            </p>
          </div>
        </div>

        {/* Combined & Segregated Statistics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
            <p className="text-xs text-slate-400">Total Matches</p>
            <p className="text-2xl font-black text-white mt-1">{player.total_matches}</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Scorecards: {player.calculated_stats.matches} | Manual:{" "}
              {player.manual_stats.matches}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
            <p className="text-xs text-slate-400">Total Runs</p>
            <p className="text-2xl font-black text-amber-400 mt-1">{player.total_runs}</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Scorecards: {player.calculated_stats.runs} | Manual: {player.manual_stats.runs}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
            <p className="text-xs text-slate-400">Highest Score</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">
              {player.highest_score}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              4s: {player.calculated_stats.fours} • 6s: {player.calculated_stats.sixes}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
            <p className="text-xs text-slate-400">Total Wickets</p>
            <p className="text-2xl font-black text-purple-300 mt-1">
              {player.total_wickets}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Best Bowling: {player.manual_stats.best_bowling || "-"}
            </p>
          </div>
        </div>
      </div>

      {/* Recent Match Performances */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-charcoal-900 border border-emerald-900/60 p-6 space-y-4">
          <h2 className="text-lg font-extrabold text-white">
            Recent Scorecard Performances
          </h2>
          {player.recent_performances?.length > 0 ? (
            <div className="space-y-3">
              {player.recent_performances.map((perf, i) => (
                <Link
                  key={i}
                  href={`/matches/${perf.match_id}`}
                  className="block p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-white">{perf.match_title}</span>
                    <span className="font-black text-gold-400">
                      {perf.runs} ({perf.balls_faced}b)
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {perf.match_date} • 4s: {perf.fours}, 6s: {perf.sixes} •{" "}
                    {perf.dismissal_text}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">
              No individual ball-by-ball batting cards recorded yet.
            </p>
          )}
        </div>

        {/* Team Membership History & Awards */}
        <div className="rounded-2xl bg-charcoal-900 border border-emerald-900/60 p-6 space-y-4">
          <h2 className="text-lg font-extrabold text-white">
            Team History & Official Honours
          </h2>
          {player.manual_stats.award_title && (
            <div className="p-3.5 rounded-xl bg-gold-500/15 border border-gold-500/40 flex items-center gap-2.5 text-xs font-bold text-gold-300">
              <Trophy className="w-4 h-4 text-gold-400 shrink-0" />
              <span>{player.manual_stats.award_title}</span>
            </div>
          )}
          <div className="space-y-2.5">
            {(player.membership_history || []).map((m) => (
              <div
                key={m.id}
                className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-bold text-white">{m.team_name}</p>
                  <p className="text-slate-400">
                    {m.tournament_name} • {m.role_in_team}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-turf-800 text-emerald-300 font-bold">
                  Season {m.season_year}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
