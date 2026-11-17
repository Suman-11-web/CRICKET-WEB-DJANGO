"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Award, MapPin, Shield, Trophy, Users } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { MatchData, PlayerData, TeamSummary, TournamentData } from "@/types/cricket";
import { MatchCard } from "@/components/MatchCard";

interface TeamProfilePayload extends TeamSummary {
  players: PlayerData[];
  recent_matches: MatchData[];
  tournaments: TournamentData[];
}

export default function TeamProfilePage() {
  const params = useParams();
  const teamId = Number(params?.id || 0);
  const [team, setTeam] = useState<TeamProfilePayload | null>(null);

  useEffect(() => {
    if (!teamId) return;
    apiFetch<TeamProfilePayload>(`/teams/${teamId}/`)
      .then(setTeam)
      .catch(() => {});
  }, [teamId]);

  if (!team) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="h-64 rounded-2xl bg-charcoal-900 border border-white/10 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      <Link
        href="/teams"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-gold-400"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>All Village Teams</span>
      </Link>

      {/* Team Hero Header */}
      <div className="rounded-3xl bg-gradient-to-br from-turf-950 via-charcoal-900 to-charcoal-950 border border-emerald-800/70 p-6 sm:p-10 space-y-6 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div
              style={{ backgroundColor: team.primary_color || "#10B981" }}
              className="w-20 h-20 rounded-3xl flex items-center justify-center text-2xl font-black text-white shadow-xl border-2 border-white/20 shrink-0"
            >
              {team.short_name}
            </div>
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-emerald-400">
                <MapPin className="w-3.5 h-3.5" />
                <span>{team.village} Village Squad</span>
              </span>
              <h1 className="text-3xl sm:text-4xl font-black text-white">{team.name}</h1>
              <p className="text-xs text-slate-300">
                Captain: <strong className="text-gold-400">{team.captain_name || "TBA"}</strong> •
                Home Ground: <strong>{team.home_ground || "Village Main Ground"}</strong>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 bg-charcoal-950/80 border border-white/10 rounded-2xl p-4 text-center">
            <div>
              <p className="text-[11px] uppercase text-slate-400">Played</p>
              <p className="text-xl font-black text-white">{team.matches_played || 0}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase text-emerald-400">Wins</p>
              <p className="text-xl font-black text-emerald-400">{team.wins || 0}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase text-red-400">Losses</p>
              <p className="text-xl font-black text-red-400">{team.losses || 0}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase text-amber-400">Tied/NR</p>
              <p className="text-xl font-black text-amber-400">
                {(team.ties || 0) + (team.no_results || 0)}
              </p>
            </div>
          </div>
        </div>

        {team.description && (
          <p className="text-sm text-slate-300 max-w-3xl">{team.description}</p>
        )}

        {team.achievements && (
          <div className="rounded-xl bg-gold-500/10 border border-gold-500/30 p-3.5 flex items-center gap-2.5 text-xs text-gold-300 font-semibold">
            <Trophy className="w-4 h-4 text-gold-400 shrink-0" />
            <span>Honours & Achievements: {team.achievements}</span>
          </div>
        )}
      </div>

      {/* Squad Roster */}
      <section className="space-y-4">
        <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-emerald-400" />
          <span>Team Squad ({team.players?.length || 0} Players)</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(team.players || []).map((p) => (
            <Link
              key={p.id}
              href={`/players/${p.id}`}
              className="rounded-2xl bg-charcoal-900 border border-white/10 hover:border-gold-500/40 p-4 space-y-3 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-turf-800 text-emerald-300">
                  {p.playing_role_display}
                </span>
                {p.jersey_number !== null && (
                  <span className="text-xs font-black text-gold-400">
                    #{p.jersey_number}
                  </span>
                )}
              </div>
              <div>
                <h3 className="font-bold text-white">
                  {p.name} {p.is_captain && <span className="text-gold-400">(C)</span>}
                </h3>
                <p className="text-xs text-slate-400">{p.batting_style}</p>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10 text-center text-xs">
                <div>
                  <span className="block text-[10px] text-slate-400">Matches</span>
                  <strong className="text-white">{p.total_matches}</strong>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400">Runs</span>
                  <strong className="text-amber-400">{p.total_runs}</strong>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400">Wickets</span>
                  <strong className="text-purple-300">{p.total_wickets}</strong>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Matches & Fixtures */}
      {team.recent_matches && team.recent_matches.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-2xl font-extrabold text-white">
            Team Matches & Recent Results
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {team.recent_matches.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
