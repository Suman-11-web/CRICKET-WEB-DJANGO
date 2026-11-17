"use client";

import React, { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { MatchCard, VictoryCrackersBanner } from "@/components/MatchCard";
import { MatchData } from "@/types/cricket";

export default function ResultsPage() {
  const [results, setResults] = useState<MatchData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ results: MatchData[] }>("/results/")
      .then((res) => setResults(res.results || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const latestWin = results.find((m) => m.result?.winning_team_name);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <span className="text-xs font-extrabold uppercase tracking-widest text-gold-400">
          Completed Fixtures & Scorecards
        </span>
        <h1 className="font-display text-3xl sm:text-4xl font-black text-white mt-1 flex items-center gap-3">
          <Trophy className="w-8 h-8 text-emerald-400" />
          Match Results
        </h1>
      </div>

      {latestWin?.result?.winning_team_name && (
        <VictoryCrackersBanner
          winnerName={latestWin.result.winning_team_name}
          summary={latestWin.result.result_summary}
        />
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-6 w-full">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-60 rounded-3xl skeleton" />
          ))}
        </div>
      ) : results.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 w-full">
          {results.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl bg-charcoal-900 p-10 text-center border border-emerald-800/60">
          <p className="text-sm font-bold text-slate-200">
            No Completed Match Results Yet
          </p>
        </div>
      )}
    </div>
  );
}
