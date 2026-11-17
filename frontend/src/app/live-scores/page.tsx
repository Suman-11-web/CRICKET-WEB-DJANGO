"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Radio, RefreshCw } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { MatchCard } from "@/components/MatchCard";
import { MatchData } from "@/types/cricket";

export default function LiveScoresPage() {
  const [liveMatches, setLiveMatches] = useState<MatchData[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<MatchData[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMatches = useCallback(async () => {
    try {
      const res = await apiFetch<{
        live_matches: MatchData[];
        upcoming_fixtures: MatchData[];
      }>("/matches/live/");
      setLiveMatches(res.live_matches || []);
      setUpcomingMatches(res.upcoming_fixtures || []);
    } catch {
      // Handled gracefully
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMatches();
    const timer = setInterval(loadMatches, 5000);
    return () => clearInterval(timer);
  }, [loadMatches]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/15 border border-red-500/40 text-red-400 text-xs font-extrabold uppercase tracking-wider mb-2">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
            Real-Time Live Scoreboard
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-black text-white flex items-center gap-3">
            <Radio className="w-8 h-8 text-red-500" />
            Live Cricket Scoreboard
          </h1>
        </div>
        <button
          onClick={loadMatches}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-charcoal-900 border border-emerald-800/60 text-xs font-bold text-emerald-300 shadow-sm hover:border-gold-500/40"
        >
          <RefreshCw className="w-4 h-4" /> Refresh Feed
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-6 w-full">
          {[1, 2].map((i) => (
            <div key={i} className="h-64 rounded-3xl skeleton" />
          ))}
        </div>
      ) : liveMatches.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 w-full">
          {liveMatches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl bg-charcoal-900 p-10 text-center border border-emerald-800/60 shadow-xl mb-10">
          <Radio className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
          <h2 className="font-display text-xl font-extrabold text-white">
            No Live Matches In Progress Right Now
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mt-1">
            Real-time ball-by-ball scores, striker, non-striker, and bowler
            figures appear here automatically as soon as a match starts.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Link
              href="/matches"
              className="px-5 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-charcoal-950 text-xs font-black"
            >
              View All Fixtures →
            </Link>
          </div>
        </div>
      )}

      {upcomingMatches.length > 0 && (
        <div className="mt-10 space-y-5">
          <h2 className="font-display text-xl font-extrabold text-white">
            Upcoming Fixtures
          </h2>
          <div className="grid grid-cols-1 gap-6 w-full">
            {upcomingMatches.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
