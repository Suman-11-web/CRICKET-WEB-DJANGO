"use client";

import React, { useEffect, useState } from "react";
import { MapPin, Shield, Users } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { TeamCrest } from "@/components/MatchCard";
import { TeamSummary } from "@/types/cricket";

export default function TeamsPage() {
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ results: TeamSummary[] }>("/teams/")
      .then((res) => setTeams(res.results || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = teams.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.village || "").toLowerCase().includes(search.toLowerCase()) ||
      (t.captain_name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-700 dark:text-amber-400">
            Registered Franchises & Village Squads
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mt-1 flex items-center gap-3">
            <Shield className="w-8 h-8 text-emerald-700 dark:text-emerald-400" />
            Village Cricket Teams & Squads
          </h1>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by team, village, or captain..."
          className="px-4 py-2.5 rounded-xl bg-white dark:bg-[#0D2118] border border-slate-300 dark:border-emerald-800/70 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 w-full sm:w-72 shadow-sm"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-60 rounded-2xl skeleton" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((team) => (
            <div
              key={team.id}
              className="bg-white dark:bg-[#0D2118] rounded-2xl p-6 border border-slate-200/90 dark:border-emerald-800/60 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <TeamCrest
                    name={team.name}
                    shortName={team.short_name}
                    logoUrl={team.logo_url}
                    color={team.primary_color}
                    size="lg"
                  />
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-amber-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {team.village || "Village"}
                    </span>
                    <h2 className="font-display text-xl font-black text-slate-900 dark:text-white">
                      {team.name}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Captain:{" "}
                      <span className="text-slate-800 dark:text-slate-200 font-bold">
                        {team.captain_name || "TBA"}
                      </span>
                    </p>
                  </div>
                </div>

                {team.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                    {team.description}
                  </p>
                )}

                <div className="mb-4 pt-3 border-t border-slate-100 dark:border-emerald-900/50">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                    Team Squad ({team.players?.length || 0} Players)
                  </p>
                  {team.players && team.players.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {team.players.map((p) => (
                        <span
                          key={p.id}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-emerald-950/70 text-[11px] font-semibold text-slate-800 dark:text-emerald-200 border border-slate-200/70 dark:border-emerald-800/50"
                        >
                          {p.jersey_number ? `#${p.jersey_number} ` : ""}
                          {p.name}
                          {p.is_captain ? " (C)" : ""}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      Squad players will appear here once added in Admin Studio.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 pt-4 border-t border-slate-100 dark:border-emerald-900/60 text-center">
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-charcoal-900/70">
                  <p className="text-[10px] text-slate-500 uppercase font-bold">
                    Mat
                  </p>
                  <p className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                    {team.matches_played || 0}
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-charcoal-900/70">
                  <p className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase font-bold">
                    Won
                  </p>
                  <p className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                    {team.wins || 0}
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-charcoal-900/70">
                  <p className="text-[10px] text-slate-500 uppercase font-bold">
                    Lost
                  </p>
                  <p className="font-mono font-bold text-slate-700 dark:text-slate-300 text-sm">
                    {team.losses || 0}
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-charcoal-900/70">
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 uppercase font-bold">
                    Tied
                  </p>
                  <p className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">
                    {team.ties || 0}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-[#0D2118] rounded-2xl p-10 text-center border border-slate-200 dark:border-emerald-800/60">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
            No Teams Registered Yet
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Create teams and their player rosters in the Admin Dashboard to view
            them here.
          </p>
        </div>
      )}
    </div>
  );
}
