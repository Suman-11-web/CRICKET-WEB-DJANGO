"use client";

import React from "react";
import Link from "next/link";
import { Award, Calendar, Crown, MapPin, Radio, Sparkles } from "lucide-react";
import type { MatchData } from "@/types/cricket";

export function VictoryCrackersBanner({
  winnerName,
  summary,
}: {
  winnerName: string;
  summary?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500/20 via-emerald-600/20 to-amber-500/20 border-2 border-gold-400/60 p-5 sm:p-6 shadow-[0_0_35px_rgba(212,175,55,0.25)]">
      {/* Animated Firework / Cracker Sparks */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <span className="cracker-spark absolute top-3 left-[8%] text-lg animate-bounce">
          🎆
        </span>
        <span className="cracker-spark absolute top-2 left-[24%] text-base animate-ping">
          ✨
        </span>
        <span className="cracker-spark absolute bottom-2 left-[42%] text-lg animate-pulse">
          🎇
        </span>
        <span className="cracker-spark absolute top-3 right-[28%] text-base animate-ping">
          ✨
        </span>
        <span className="cracker-spark absolute top-2 right-[10%] text-lg animate-bounce">
          🎆
        </span>
        <span className="cracker-spark absolute bottom-3 right-[18%] text-base animate-pulse">
          🎉
        </span>
      </div>

      <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div className="flex flex-col sm:flex-row items-center gap-3.5">
          <div className="relative w-12 h-12 rounded-2xl bg-gold-500 text-charcoal-950 flex items-center justify-center shadow-xl ring-4 ring-gold-400/40 animate-pulse shrink-0">
            <Crown className="w-7 h-7 fill-current" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-gold-300">
              <Sparkles className="w-3.5 h-3.5 text-gold-400" />
              <span>Victory Celebration • Match Winner</span>
            </div>
            <h3 className="text-lg sm:text-2xl font-black text-white mt-0.5">
              👑 {winnerName}
            </h3>
            {summary && (
              <p className="text-xs sm:text-sm font-bold text-emerald-300 mt-0.5">
                {summary}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-2xl select-none">
          <span className="animate-bounce">🎆</span>
          <span className="animate-pulse">🏆</span>
          <span className="animate-bounce">🎇</span>
        </div>
      </div>
    </div>
  );
}

export function TeamCrest({
  name,
  shortName,
  logoUrl,
  color = "#10B981",
  size = "md",
  isWinner = false,
}: {
  name: string;
  shortName: string;
  logoUrl?: string;
  color?: string;
  size?: "sm" | "md" | "lg";
  isWinner?: boolean;
}) {
  const dims =
    size === "lg"
      ? "w-14 h-14 text-base rounded-2xl"
      : size === "sm"
      ? "w-8 h-8 text-[11px] rounded-xl"
      : "w-12 h-12 text-xs rounded-2xl";

  return (
    <div className="relative inline-flex items-center justify-center shrink-0">
      {/* Animated King Crown + Golden Ring on Head of Winning Team */}
      {isWinner && (
        <>
          <div
            className="absolute -inset-1.5 rounded-2xl border-2 border-gold-400/90 animate-pulse pointer-events-none shadow-[0_0_18px_rgba(244,223,143,0.75)]"
            aria-hidden="true"
          />
          <div
            className="absolute -top-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center pointer-events-none"
            title="Match Winner"
          >
            <span className="px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-300 via-gold-400 to-amber-500 text-charcoal-950 shadow-lg ring-2 ring-white/40 flex items-center justify-center animate-bounce">
              <Crown className="w-3.5 h-3.5 fill-current" />
            </span>
          </div>
        </>
      )}

      {logoUrl ? (
        <img
          src={logoUrl}
          alt={name}
          className={`${dims} object-cover ${
            isWinner
              ? "border-2 border-gold-400 shadow-[0_0_16px_rgba(212,175,55,0.6)]"
              : "border border-gold-500/50 shadow-md"
          } shrink-0`}
        />
      ) : (
        <div
          style={{ backgroundColor: color }}
          className={`${dims} flex items-center justify-center font-black text-white ${
            isWinner
              ? "border-2 border-gold-300 shadow-[0_0_16px_rgba(212,175,55,0.6)]"
              : "border border-white/20 shadow-lg"
          } shrink-0`}
        >
          {shortName?.slice(0, 3) || name.slice(0, 2).toUpperCase()}
        </div>
      )}
    </div>
  );
}

export function MatchCard({ match }: { match: MatchData }) {
  const isLive = ["LIVE", "INNINGS_BREAK", "PAUSED"].includes(match.status);
  const isCompleted = ["COMPLETED", "ABANDONED"].includes(match.status);

  const getTeamInnings = (teamId: number) =>
    match.innings?.find((i) => i.batting_team?.id === teamId);

  const innA = getTeamInnings(match.team_a.id);
  const innB = getTeamInnings(match.team_b.id);

  const activeInnings =
    match.innings?.find(
      (i) => i.innings_number === match.current_innings_number
    ) || match.innings?.[0];

  const winningTeamId = match.result?.winning_team_id || null;
  const teamAWon = Boolean(
    isCompleted && winningTeamId && winningTeamId === match.team_a.id
  );
  const teamBWon = Boolean(
    isCompleted && winningTeamId && winningTeamId === match.team_b.id
  );

  return (
    <div className="w-full rounded-3xl bg-gradient-to-br from-charcoal-900 via-charcoal-900 to-turf-950 border border-emerald-800/70 hover:border-gold-500/60 transition-all shadow-2xl overflow-hidden flex flex-col justify-between relative">
      {/* Subtle Celebratory Crackers Header Overlay if Completed with a Winner */}
      {isCompleted && winningTeamId && (
        <div className="pointer-events-none absolute top-2 right-24 flex items-center gap-2 text-sm opacity-90 select-none">
          <span className="animate-bounce">🎆</span>
          <span className="animate-pulse">✨</span>
          <span className="animate-bounce">🎇</span>
        </div>
      )}

      {/* Top Match Meta Header Bar */}
      <div className="px-4 sm:px-6 py-3 bg-turf-950/90 border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="text-xs sm:text-sm font-extrabold text-emerald-300 truncate">
            {match.tournament
              ? `${match.tournament.name} • Match #${match.match_number || match.id}`
              : `${match.title} • ${match.match_format}`}
          </span>
          <span className="hidden sm:inline text-slate-600">•</span>
          <span className="hidden sm:inline-flex items-center gap-1 text-xs text-slate-400">
            <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            {match.venue}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-mono text-gold-300 font-bold px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10">
            {match.overs_per_innings} Overs
          </span>

          {isLive ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-red-600 text-white shadow-lg">
              <span className="h-2 w-2 rounded-full bg-white animate-ping" />
              <span>LIVE</span>
            </span>
          ) : isCompleted ? (
            <span className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              Completed
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase bg-gold-500/20 text-gold-300 border border-gold-500/40">
              {match.status}
            </span>
          )}
        </div>
      </div>

      {/* Main 100% Full-Width Scoreboard Body */}
      <div className="p-4 sm:p-6 space-y-5">
        {/* Teams & Scores Alignment Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-11 gap-4 items-center">
          {/* Team A Box */}
          <div
            className={`lg:col-span-5 p-4 rounded-2xl transition-all flex items-center justify-between gap-3 ${
              teamAWon
                ? "bg-gradient-to-r from-gold-500/20 via-emerald-500/15 to-charcoal-950/80 border-2 border-gold-400 shadow-[0_0_25px_rgba(212,175,55,0.28)]"
                : "bg-charcoal-950/60 border border-white/10"
            }`}
          >
            <div className="flex items-center gap-3.5 min-w-0 pt-1">
              <TeamCrest
                name={match.team_a.name}
                shortName={match.team_a.short_name}
                logoUrl={match.team_a.logo_url}
                color={match.team_a.primary_color}
                size="md"
                isWinner={teamAWon}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p
                    className={`text-sm sm:text-base font-black truncate ${
                      teamAWon ? "text-gold-300" : "text-white"
                    }`}
                  >
                    {match.team_a.name}
                  </p>
                  {teamAWon && (
                    <span className="px-2 py-0.5 rounded-full bg-gold-500 text-charcoal-950 text-[10px] font-black uppercase tracking-wider shrink-0">
                      👑 Winner
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  {match.team_a.village || "Village Squad"}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <p
                className={`font-mono text-2xl sm:text-3xl font-black tabular-nums leading-none ${
                  teamAWon ? "text-gold-300" : "text-white"
                }`}
              >
                {innA &&
                (innA.status !== "NOT_STARTED" ||
                  innA.runs > 0 ||
                  innA.completed_overs > 0 ||
                  innA.balls_in_over > 0)
                  ? `${innA.runs}/${innA.wickets}`
                  : "0/0"}
              </p>
              <p className="font-mono text-xs text-emerald-300/90 mt-1">
                ({innA ? innA.overs_display : "0.0"} /{" "}
                {innA?.max_overs || match.overs_per_innings} ov)
              </p>
            </div>
          </div>

          {/* Center VS Divider */}
          <div className="lg:col-span-1 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-turf-900 border border-gold-500/40 flex items-center justify-center text-xs font-black text-gold-300 shadow-inner">
              VS
            </div>
          </div>

          {/* Team B Box */}
          <div
            className={`lg:col-span-5 p-4 rounded-2xl transition-all flex items-center justify-between gap-3 ${
              teamBWon
                ? "bg-gradient-to-r from-gold-500/20 via-emerald-500/15 to-charcoal-950/80 border-2 border-gold-400 shadow-[0_0_25px_rgba(212,175,55,0.28)]"
                : "bg-charcoal-950/60 border border-white/10"
            }`}
          >
            <div className="flex items-center gap-3.5 min-w-0 pt-1">
              <TeamCrest
                name={match.team_b.name}
                shortName={match.team_b.short_name}
                logoUrl={match.team_b.logo_url}
                color={match.team_b.primary_color}
                size="md"
                isWinner={teamBWon}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p
                    className={`text-sm sm:text-base font-black truncate ${
                      teamBWon ? "text-gold-300" : "text-white"
                    }`}
                  >
                    {match.team_b.name}
                  </p>
                  {teamBWon && (
                    <span className="px-2 py-0.5 rounded-full bg-gold-500 text-charcoal-950 text-[10px] font-black uppercase tracking-wider shrink-0">
                      👑 Winner
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  {match.team_b.village || "Village Squad"}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <p
                className={`font-mono text-2xl sm:text-3xl font-black tabular-nums leading-none ${
                  teamBWon ? "text-gold-300" : "text-white"
                }`}
              >
                {innB &&
                (innB.status !== "NOT_STARTED" ||
                  innB.runs > 0 ||
                  innB.completed_overs > 0 ||
                  innB.balls_in_over > 0)
                  ? `${innB.runs}/${innB.wickets}`
                  : "Yet to bat"}
              </p>
              <p className="font-mono text-xs text-emerald-300/90 mt-1">
                ({innB ? innB.overs_display : "0.0"} /{" "}
                {innB?.max_overs || match.overs_per_innings} ov)
              </p>
            </div>
          </div>
        </div>

        {/* Normal Cricket App Live Player Details Bar: Striker, Non-Striker & Bowler */}
        {(isLive ||
          activeInnings?.striker ||
          activeInnings?.non_striker ||
          activeInnings?.current_bowler) &&
          activeInnings && (
            <div className="rounded-2xl bg-charcoal-950/90 border border-emerald-800/70 p-3.5 sm:p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 divide-y md:divide-y-0 md:divide-x divide-white/10 text-xs">
                {/* 1. Striker */}
                <div className="flex items-center justify-between md:pr-3 pt-1 md:pt-0">
                  <div className="min-w-0">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-gold-400 block">
                      🏏 Striker (On Strike)
                    </span>
                    <p className="font-black text-white text-sm truncate mt-0.5">
                      {activeInnings.striker
                        ? `${activeInnings.striker.name} *`
                        : "Striker TBA"}
                    </p>
                  </div>
                  <div className="text-right shrink-0 pl-2">
                    {activeInnings.striker ? (
                      <>
                        <p className="font-mono text-sm font-black text-gold-300 tabular-nums">
                          {activeInnings.striker.runs}{" "}
                          <span className="text-xs font-normal text-slate-400">
                            ({activeInnings.striker.balls_faced}b)
                          </span>
                        </p>
                        <p className="font-mono text-[10px] text-slate-400">
                          4s: {activeInnings.striker.fours} • 6s:{" "}
                          {activeInnings.striker.sixes} • SR:{" "}
                          {activeInnings.striker.strike_rate.toFixed(1)}
                        </p>
                      </>
                    ) : (
                      <span className="font-mono text-xs text-slate-500">
                        0 (0b)
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Non-Striker */}
                <div className="flex items-center justify-between md:px-3 pt-2.5 md:pt-0">
                  <div className="min-w-0">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 block">
                      🏏 Non-Striker
                    </span>
                    <p className="font-bold text-slate-200 text-sm truncate mt-0.5">
                      {activeInnings.non_striker
                        ? activeInnings.non_striker.name
                        : "Non-Striker TBA"}
                    </p>
                  </div>
                  <div className="text-right shrink-0 pl-2">
                    {activeInnings.non_striker ? (
                      <>
                        <p className="font-mono text-sm font-black text-white tabular-nums">
                          {activeInnings.non_striker.runs}{" "}
                          <span className="text-xs font-normal text-slate-400">
                            ({activeInnings.non_striker.balls_faced}b)
                          </span>
                        </p>
                        <p className="font-mono text-[10px] text-slate-400">
                          4s: {activeInnings.non_striker.fours} • 6s:{" "}
                          {activeInnings.non_striker.sixes} • SR:{" "}
                          {activeInnings.non_striker.strike_rate.toFixed(1)}
                        </p>
                      </>
                    ) : (
                      <span className="font-mono text-xs text-slate-500">
                        0 (0b)
                      </span>
                    )}
                  </div>
                </div>

                {/* 3. Current Bowler */}
                <div className="flex items-center justify-between md:pl-3 pt-2.5 md:pt-0">
                  <div className="min-w-0">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 block">
                      ⚾ Current Bowler
                    </span>
                    <p className="font-bold text-white text-sm truncate mt-0.5">
                      {activeInnings.current_bowler
                        ? activeInnings.current_bowler.name
                        : "Bowler TBA"}
                    </p>
                  </div>
                  <div className="text-right shrink-0 pl-2">
                    {activeInnings.current_bowler ? (
                      <>
                        <p className="font-mono text-sm font-black text-emerald-300 tabular-nums">
                          {activeInnings.current_bowler.wickets}-
                          {activeInnings.current_bowler.runs_conceded}{" "}
                          <span className="text-xs font-normal text-slate-400">
                            ({activeInnings.current_bowler.overs} ov)
                          </span>
                        </p>
                        <p className="font-mono text-[10px] text-slate-400">
                          M: {activeInnings.current_bowler.maidens} • Econ:{" "}
                          {activeInnings.current_bowler.economy.toFixed(2)}
                        </p>
                      </>
                    ) : (
                      <span className="font-mono text-xs text-slate-500">
                        0-0 (0.0 ov)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

        {/* Completed Match Winner Highlight Banner */}
        {isCompleted && match.result && (
          <div className="rounded-2xl bg-gradient-to-r from-gold-500/20 via-emerald-500/15 to-gold-500/20 border border-gold-400/50 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
            <div className="flex items-center gap-2 font-black text-xs sm:text-sm text-gold-300">
              <span>🎆 👑</span>
              <span>{match.result.result_summary}</span>
            </div>
            {match.result.player_of_the_match_name && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-charcoal-950/80 border border-gold-500/40 text-[11px] font-bold text-amber-300">
                <Award className="w-3.5 h-3.5 text-gold-400" />
                <span>Player of the Match: {match.result.player_of_the_match_name}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bottom Action & Info Bar */}
      <div className="px-4 sm:px-6 py-3 bg-charcoal-950/90 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 text-slate-300">
          <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
            <Calendar className="w-3.5 h-3.5 text-gold-400" />
            {match.match_date} • {match.start_time?.slice(0, 5)}
          </span>
          {isLive && activeInnings && (
            <span className="px-2.5 py-0.5 rounded-lg bg-emerald-950 border border-emerald-700/60 font-mono text-[11px] font-bold text-gold-300">
              {activeInnings.target_runs
                ? `Target: ${activeInnings.target_runs} | RRR: ${
                    activeInnings.required_run_rate ?? "-"
                  } | CRR: ${activeInnings.current_run_rate}`
                : `Innings ${activeInnings.innings_number} | CRR: ${activeInnings.current_run_rate}`}
            </span>
          )}
        </div>

        <Link
          href={`/matches/${match.id}/${match.slug}`}
          className="px-4 py-2 rounded-xl bg-gold-500 hover:bg-gold-400 text-charcoal-950 text-xs font-black inline-flex items-center gap-1.5 shrink-0 transition-colors shadow-md"
        >
          <span>Full Scorecard & Live Center</span>
          <span>→</span>
        </Link>
      </div>
    </div>
  );
}
