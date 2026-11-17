"use client";

import React, { useEffect, useState } from "react";
import { Calendar } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { MatchCard } from "@/components/MatchCard";
import { MatchData } from "@/types/cricket";

export default function MatchesPage() {
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ results: MatchData[] }>("/matches/")
      .then((res) => setMatches(res.results || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = matches.filter((m) => {
    if (
      filterStatus !== "all" &&
      m.status.toUpperCase() !== filterStatus.toUpperCase()
    ) {
      return false;
    }
    if (
      filterType !== "all" &&
      m.match_type.toUpperCase() !== filterType.toUpperCase()
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-widest text-gold-400">
            Fixtures, Live & Results
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-black text-white mt-1 flex items-center gap-3">
            <Calendar className="w-8 h-8 text-emerald-400" />
            All Cricket Matches
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {["all", "LIVE", "UPCOMING", "COMPLETED", "CANCELLED"].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold uppercase transition-all ${
                filterStatus === st
                  ? "bg-gold-500 text-charcoal-950 font-black shadow-sm"
                  : "bg-charcoal-900 text-slate-300 border border-emerald-800/60"
              }`}
            >
              {st}
            </button>
          ))}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-charcoal-900 border border-emerald-800/60 text-xs font-bold text-white"
          >
            <option value="all">All Types</option>
            <option value="TOURNAMENT">Tournament Matches</option>
            <option value="FRIENDLY">Friendly Matches</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-6 w-full">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-60 rounded-3xl skeleton" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 w-full">
          {filtered.map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl bg-charcoal-900 p-10 text-center border border-emerald-800/60">
          <p className="text-sm font-bold text-slate-200">
            No Matches Found Matching Your Filter
          </p>
        </div>
      )}
    </div>
  );
}
