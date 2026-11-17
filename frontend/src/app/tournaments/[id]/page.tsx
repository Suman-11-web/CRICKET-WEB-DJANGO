"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, MapPin, Shield, Trophy, Users } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { TournamentData } from "@/types/cricket";
import { MatchCard } from "@/components/MatchCard";

export default function TournamentDetailPage() {
  const params = useParams();
  const tournamentId = Number(params?.id || 0);
  const [tournament, setTournament] = useState<TournamentData | null>(null);
  const [activeTab, setActiveTab] = useState<"fixtures" | "standings" | "teams" | "gallery">(
    "fixtures"
  );

  useEffect(() => {
    if (!tournamentId) return;
    apiFetch<TournamentData>(`/tournaments/${tournamentId}/`)
      .then(setTournament)
      .catch(() => {});
  }, [tournamentId]);

  if (!tournament) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="h-64 rounded-2xl bg-charcoal-900 border border-white/10 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <Link
        href="/tournaments"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-gold-400"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>All Tournaments</span>
      </Link>

      {/* Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-turf-900 via-charcoal-900 to-charcoal-950 border border-emerald-800/70 p-6 sm:p-10 space-y-5 shadow-2xl">
        <div className="flex flex-wrap items-center gap-3">
          <span className="px-3.5 py-1 rounded-full text-xs font-extrabold bg-gold-500 text-charcoal-950">
            {tournament.status_display} • Season {tournament.season_year}
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-emerald-300">
            {tournament.match_format_display} ({tournament.overs_per_innings} Overs)
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-slate-300">
            Registration: {tournament.registration_status}
          </span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-white">{tournament.name}</h1>
        <p className="text-base text-slate-300 max-w-3xl">{tournament.description}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 text-xs text-slate-200">
          <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-3">
            <MapPin className="w-5 h-5 text-gold-400 shrink-0" />
            <div>
              <p className="text-slate-400">Ground & Village</p>
              <p className="font-bold">
                {tournament.ground_name}, {tournament.village}
              </p>
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-3">
            <Shield className="w-5 h-5 text-gold-400 shrink-0" />
            <div>
              <p className="text-slate-400">Organizer</p>
              <p className="font-bold">{tournament.organizer_name}</p>
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-3">
            <Calendar className="w-5 h-5 text-gold-400 shrink-0" />
            <div>
              <p className="text-slate-400">Dates</p>
              <p className="font-bold">
                {tournament.start_date} to {tournament.end_date}
              </p>
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-3">
            <Trophy className="w-5 h-5 text-gold-400 shrink-0" />
            <div>
              <p className="text-slate-400">Prizes & Honours</p>
              <p className="font-bold truncate">{tournament.prize_details}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
        {[
          { key: "fixtures", label: `Fixtures & Results (${tournament.matches?.length || 0})` },
          { key: "standings", label: `Points Table (${tournament.standings?.length || 0})` },
          { key: "teams", label: `Registered Teams (${tournament.teams?.length || 0})` },
          { key: "gallery", label: `Photos (${tournament.gallery?.length || 0})` },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 rounded-xl text-sm font-bold ${
              activeTab === tab.key
                ? "bg-gold-500 text-charcoal-950"
                : "bg-charcoal-900 text-slate-300 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "fixtures" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(tournament.matches || []).map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
        </div>
      )}

      {activeTab === "standings" && (
        <div className="rounded-2xl bg-charcoal-900 border border-emerald-900/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-turf-950 text-[11px] uppercase text-emerald-300 font-bold border-b border-white/10">
                  <th className="py-3.5 px-4">Rank</th>
                  <th className="py-3.5 px-4">Team</th>
                  <th className="py-3.5 px-3 text-center">P</th>
                  <th className="py-3.5 px-3 text-center">W</th>
                  <th className="py-3.5 px-3 text-center">L</th>
                  <th className="py-3.5 px-3 text-center">T</th>
                  <th className="py-3.5 px-3 text-center">NR</th>
                  <th className="py-3.5 px-4 text-right">NRR</th>
                  <th className="py-3.5 px-5 text-right">Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(tournament.standings || []).map((row) => (
                  <tr key={row.id}>
                    <td className="py-3.5 px-4 font-black text-gold-400">#{row.rank}</td>
                    <td className="py-3.5 px-4 font-bold text-white">{row.team.name}</td>
                    <td className="py-3.5 px-3 text-center">{row.played}</td>
                    <td className="py-3.5 px-3 text-center text-emerald-400 font-bold">
                      {row.won}
                    </td>
                    <td className="py-3.5 px-3 text-center text-red-400">{row.lost}</td>
                    <td className="py-3.5 px-3 text-center">{row.tied}</td>
                    <td className="py-3.5 px-3 text-center">{row.no_result}</td>
                    <td className="py-3.5 px-4 text-right font-mono">
                      {row.net_run_rate_display}
                    </td>
                    <td className="py-3.5 px-5 text-right font-black text-gold-400">
                      {row.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "teams" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {(tournament.teams || []).map((team) => (
            <Link
              key={team.id}
              href={`/teams/${team.id}`}
              className="rounded-2xl bg-charcoal-900 border border-white/10 hover:border-gold-500/40 p-5 flex items-center gap-4"
            >
              <div
                style={{ backgroundColor: team.primary_color || "#10B981" }}
                className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white"
              >
                {team.short_name}
              </div>
              <div>
                <h3 className="font-bold text-white">{team.name}</h3>
                <p className="text-xs text-slate-400">
                  Village: {team.village} • Capt: {team.captain_name}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {activeTab === "gallery" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {(tournament.gallery || []).map((g) => (
            <div
              key={g.id}
              className="rounded-2xl bg-charcoal-900 border border-white/10 overflow-hidden"
            >
              <img src={g.image_url} alt={g.title} className="w-full h-52 object-cover" />
              <div className="p-4">
                <h3 className="font-bold text-white text-sm">{g.title}</h3>
                <p className="text-xs text-slate-400 mt-1">{g.caption}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
