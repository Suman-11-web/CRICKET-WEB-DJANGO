"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, MapPin, Trophy } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { TournamentData } from "@/types/cricket";

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<TournamentData[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ results: TournamentData[] }>("/tournaments/")
      .then((res) => setTournaments(res.results || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    filter === "all"
      ? tournaments
      : tournaments.filter(
          (t) => t.status.toUpperCase() === filter.toUpperCase()
        );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-700 dark:text-amber-400">
            Leagues & Championships
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mt-1 flex items-center gap-3">
            <Trophy className="w-8 h-8 text-amber-500" />
            Village Cricket Tournaments
          </h1>
        </div>
        <div className="flex gap-2">
          {["all", "ONGOING", "UPCOMING", "COMPLETED"].map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase transition-all ${
                filter === st
                  ? "bg-[#15803D] text-white shadow-sm"
                  : "bg-white dark:bg-[#0D2118] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-emerald-800/60"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="h-64 rounded-2xl skeleton" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((t) => (
            <div
              key={t.id}
              className="bg-white dark:bg-[#0D2118] rounded-2xl overflow-hidden border border-slate-200/90 dark:border-emerald-800/60 shadow-sm hover:shadow-md transition-all flex flex-col justify-between p-6"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span
                    className={`px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider ${
                      t.status === "ONGOING"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300"
                        : t.status === "UPCOMING"
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300"
                        : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {t.status_display || t.status}
                  </span>
                  <span className="text-xs font-mono text-emerald-700 dark:text-amber-400 font-bold">
                    {t.match_format} • {t.overs_per_innings} Overs
                  </span>
                </div>

                <h2 className="font-display text-2xl font-black text-slate-900 dark:text-white mb-2">
                  {t.name}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
                  {t.description || `Organized by ${t.organizer_name}`}
                </p>

                <div className="grid grid-cols-2 gap-3 text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-charcoal-900/60 p-3.5 rounded-xl border border-slate-200/70 dark:border-emerald-900/50 mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                    <span>
                      {t.start_date} to {t.end_date}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="truncate">
                      {t.ground_name}, {t.village}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-emerald-900/50 flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-700 dark:text-amber-400">
                  {t.prize_details || `${t.max_teams} Teams`}
                </span>
                <div className="flex gap-2">
                  <Link
                    href="/points-table"
                    className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-emerald-950 hover:bg-slate-200 text-xs font-bold text-slate-800 dark:text-emerald-200"
                  >
                    Standings
                  </Link>
                  <Link
                    href="/matches"
                    className="px-3.5 py-2 rounded-xl bg-[#15803D] hover:bg-[#166534] text-xs font-bold text-white"
                  >
                    Fixtures →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-[#0D2118] rounded-2xl p-10 text-center border border-slate-200 dark:border-emerald-800/60">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
            No Tournaments Found
          </p>
        </div>
      )}
    </div>
  );
}
