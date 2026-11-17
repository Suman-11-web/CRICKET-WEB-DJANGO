"use client";

import React, { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { TeamCrest } from "@/components/MatchCard";
import { StandingRow, TournamentData } from "@/types/cricket";

export default function PointsTablePage() {
  const [tournaments, setTournaments] = useState<TournamentData[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ results: TournamentData[] }>("/tournaments/")
      .then((res) => {
        const list = res.results || [];
        setTournaments(list);
        if (list.length > 0) {
          setSelectedId(list[0].id);
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    apiFetch<{ standings: StandingRow[] }>(
      `/standings/?tournament=${selectedId}`
    )
      .then((res) => setStandings(res.standings || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedId]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-700 dark:text-amber-400">
            Official Standings & Net Run Rate
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mt-1 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-amber-500" />
            Tournament Points Table
          </h1>
        </div>

        {tournaments.length > 0 && (
          <select
            value={selectedId || ""}
            onChange={(e) => setSelectedId(Number(e.target.value))}
            className="px-4 py-2.5 rounded-xl bg-white dark:bg-[#0D2118] border border-slate-300 dark:border-emerald-800/70 text-sm font-bold text-slate-900 dark:text-white shadow-sm"
          >
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.season_year})
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="bg-white dark:bg-[#0D2118] rounded-2xl border border-slate-200/90 dark:border-emerald-800/60 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 rounded-xl skeleton" />
            ))}
          </div>
        ) : standings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-emerald-950/70 border-b border-slate-200 dark:border-emerald-800/60 text-xs font-extrabold uppercase text-slate-600 dark:text-slate-300">
                  <th className="py-3.5 px-4">Rank</th>
                  <th className="py-3.5 px-4">Team</th>
                  <th className="py-3.5 px-3 text-center">Played</th>
                  <th className="py-3.5 px-3 text-center">Won</th>
                  <th className="py-3.5 px-3 text-center">Lost</th>
                  <th className="py-3.5 px-3 text-center">Tied</th>
                  <th className="py-3.5 px-3 text-center">NR</th>
                  <th className="py-3.5 px-4 text-right">Net Run Rate</th>
                  <th className="py-3.5 px-4 text-right">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-emerald-900/40 text-sm">
                {standings.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-emerald-900/20 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-600 dark:text-slate-300">
                      #{row.rank}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <TeamCrest
                          name={row.team.name}
                          shortName={row.team.short_name}
                          logoUrl={row.team.logo_url}
                          color={row.team.primary_color}
                          size="sm"
                        />
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">
                            {row.team.name}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {row.team.village}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-center font-mono">
                      {row.played}
                    </td>
                    <td className="py-3.5 px-3 text-center font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {row.won}
                    </td>
                    <td className="py-3.5 px-3 text-center font-mono text-slate-500">
                      {row.lost}
                    </td>
                    <td className="py-3.5 px-3 text-center font-mono text-slate-500">
                      {row.tied}
                    </td>
                    <td className="py-3.5 px-3 text-center font-mono text-slate-500">
                      {row.no_result}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-700 dark:text-slate-200">
                      {row.net_run_rate_display}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-base font-black text-slate-900 dark:text-amber-400">
                      {row.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
              No Points Table Standings Recorded Yet
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Standings and Net Run Rate (NRR) are calculated automatically when
              tournament matches are completed.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
