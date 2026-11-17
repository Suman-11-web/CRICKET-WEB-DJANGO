"use client";

import React, { useEffect, useState } from "react";
import { Award, Crown, Sparkles, Trophy } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { TeamCrest, VictoryCrackersBanner } from "@/components/MatchCard";
import { TournamentWinnerData } from "@/types/cricket";

export default function WinnersPage() {
  const [winners, setWinners] = useState<TournamentWinnerData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ results: TournamentWinnerData[] }>("/winners/")
      .then((res) => setWinners(res.results || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <div>
        <span className="text-xs font-extrabold uppercase tracking-widest text-gold-400">
          Hall of Champions
        </span>
        <h1 className="font-display text-3xl sm:text-4xl font-black text-white mt-1 flex items-center gap-3">
          <Trophy className="w-8 h-8 text-gold-400" />
          Tournament Winners & Champions
        </h1>
      </div>

      {winners.length > 0 && (
        <VictoryCrackersBanner
          winnerName={winners[0].winning_team_name}
          summary={`${winners[0].tournament_name} (${winners[0].tournament_year})`}
        />
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="h-60 rounded-2xl skeleton" />
          ))}
        </div>
      ) : winners.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {winners.map((w) => (
            <div
              key={w.id}
              className="glass-card rounded-3xl p-6 border-2 border-gold-400/50 shadow-[0_0_25px_rgba(212,175,55,0.2)] transition-all"
            >
              <div className="flex items-center justify-between mb-5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-500 text-charcoal-950 text-xs font-black uppercase">
                  <Crown className="w-3.5 h-3.5" /> {w.tournament_year} Champions
                </span>
                <span className="text-xs font-bold text-emerald-300">
                  {w.tournament_name}
                </span>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <TeamCrest
                  name={w.winning_team_name}
                  shortName={w.winning_team_name.slice(0, 3).toUpperCase()}
                  logoUrl={w.winning_team_logo}
                  size="lg"
                  isWinner={true}
                />
                <div>
                  <h2 className="font-display text-2xl font-black text-gold-400 flex items-center gap-2">
                    <span>{w.winning_team_name}</span>
                    <span>🎆</span>
                  </h2>
                  {w.runner_up_team_name && (
                    <p className="text-xs text-slate-400">
                      Runner-Up:{" "}
                      <strong className="text-slate-200">
                        {w.runner_up_team_name}
                      </strong>
                    </p>
                  )}
                </div>
              </div>

              {w.final_match_summary && (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/50 text-emerald-200 text-xs font-bold mb-4 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-gold-400 shrink-0" />
                  <span>{w.final_match_summary}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/10 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Player of the Tournament
                  </span>
                  <span className="font-bold text-white">
                    {w.player_of_the_tournament || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Prize / Honour
                  </span>
                  <span className="font-bold text-gold-400">
                    {w.prize_amount || "Championship Trophy"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card rounded-3xl p-10 text-center border border-emerald-800/60">
          <Award className="w-10 h-10 text-gold-400 mx-auto mb-2" />
          <p className="text-sm font-bold text-white">
            No Tournament Winners Recorded Yet
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Once a match or tournament winner is declared, the winning team will appear here with the animated King Crown Ring and celebratory crackers.
          </p>
        </div>
      )}
    </div>
  );
}
