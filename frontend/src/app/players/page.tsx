"use client";

import React, { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { PlayerData } from "@/types/cricket";

export default function PlayersPage() {
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ results: PlayerData[] }>("/players/")
      .then((res) => setPlayers(res.results || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = players.filter((p) => {
    if (
      roleFilter !== "all" &&
      p.playing_role.toUpperCase() !== roleFilter.toUpperCase()
    ) {
      return false;
    }
    if (
      search &&
      !p.name.toLowerCase().includes(search.toLowerCase()) &&
      !(p.team_name || "").toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-700 dark:text-amber-400">
            Registered Cricketers & Career Stats
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mt-1 flex items-center gap-3">
            <Users className="w-8 h-8 text-emerald-700 dark:text-emerald-400" />
            Village Cricket Players
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search player or team..."
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#0D2118] border border-slate-300 dark:border-emerald-800/70 text-xs text-slate-900 dark:text-white"
          />
          {["all", "BATTER", "BOWLER", "ALL_ROUNDER", "WICKET_KEEPER"].map(
            (role) => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`px-3 py-2 rounded-xl text-xs font-extrabold transition-all ${
                  roleFilter === role
                    ? "bg-[#15803D] text-white"
                    : "bg-white dark:bg-[#0D2118] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-emerald-800/60"
                }`}
              >
                {role === "all" ? "All Roles" : role.replace("_", " ")}
              </button>
            )
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-52 rounded-2xl skeleton" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="bg-white dark:bg-[#0D2118] rounded-2xl p-5 border border-slate-200/90 dark:border-emerald-800/60 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-extrabold uppercase">
                    {p.playing_role_display || p.playing_role}
                  </span>
                  {p.jersey_number && (
                    <span className="font-mono text-xs font-black text-amber-600 dark:text-amber-400">
                      #{p.jersey_number}
                    </span>
                  )}
                </div>
                <h2 className="font-display text-lg font-black text-slate-900 dark:text-white">
                  {p.name}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                  {p.team_name || p.village || "Village Cricketer"}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-emerald-900/50 grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-charcoal-900/60">
                  <p className="text-[10px] text-slate-500 uppercase font-bold">
                    Runs
                  </p>
                  <p className="font-mono font-black text-sm text-slate-900 dark:text-white">
                    {p.total_runs}
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-charcoal-900/60">
                  <p className="text-[10px] text-slate-500 uppercase font-bold">
                    Wkts
                  </p>
                  <p className="font-mono font-black text-sm text-emerald-700 dark:text-emerald-400">
                    {p.total_wickets}
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-charcoal-900/60">
                  <p className="text-[10px] text-slate-500 uppercase font-bold">
                    HS
                  </p>
                  <p className="font-mono font-black text-sm text-amber-600 dark:text-amber-400">
                    {p.highest_score}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-[#0D2118] rounded-2xl p-10 text-center border border-slate-200 dark:border-emerald-800/60">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
            No Players Found
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Add players when creating a Team or in the Players module of the
            Admin Dashboard.
          </p>
        </div>
      )}
    </div>
  );
}
