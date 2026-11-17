import React from "react";
import Link from "next/link";
import { Trophy } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center space-y-5">
      <div className="w-16 h-16 rounded-2xl bg-turf-800 border border-gold-500/40 flex items-center justify-center text-gold-400">
        <Trophy className="w-8 h-8" />
      </div>
      <h1 className="text-4xl font-black text-white">404 — Hit Out of the Ground!</h1>
      <p className="text-sm text-slate-400 max-w-md">
        The page or scorecard you are looking for could not be found. Return to the main pavilion to view live village cricket scores.
      </p>
      <div className="flex gap-3">
        <Link
          href="/"
          className="px-5 py-2.5 rounded-xl bg-gold-500 text-charcoal-950 font-extrabold text-sm"
        >
          Back to Homepage
        </Link>
        <Link
          href="/live-scores"
          className="px-5 py-2.5 rounded-xl bg-turf-800 text-white font-bold text-sm border border-emerald-600/40"
        >
          Live Scores
        </Link>
      </div>
    </div>
  );
}
