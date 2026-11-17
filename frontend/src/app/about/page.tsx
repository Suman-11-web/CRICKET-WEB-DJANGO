"use client";

import React from "react";
import { MapPin, Trophy, Users } from "lucide-react";
import { useSite } from "@/context/SiteContext";

export default function AboutPage() {
  const { settings } = useSite();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="bg-white dark:bg-[#0D2118] rounded-3xl p-8 border border-slate-200/90 dark:border-emerald-800/60 shadow-sm">
        <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-700 dark:text-amber-400">
          Our Community & Heritage
        </span>
        <h1 className="font-display text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mt-2">
          {settings?.about_title || "Celebrating Our Village Cricket Heritage"}
        </h1>
        <p className="mt-4 text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
          {settings?.about_content ||
            "Founded by passionate local cricketers and community organizers, Village Cricket Live brings international-grade live scoring, verifiable statistics, and tournament management to every village tournament and friendly match."}
        </p>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-charcoal-900/60 border border-slate-200/70 dark:border-emerald-900/50">
            <Trophy className="w-6 h-6 text-amber-500 mb-2" />
            <h3 className="font-display font-bold text-slate-900 dark:text-white text-sm">
              Mission & Fair Play
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              {settings?.about_mission ||
                "Empowering rural cricket talent with transparent scoring and digital archiving."}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-charcoal-900/60 border border-slate-200/70 dark:border-emerald-900/50">
            <Users className="w-6 h-6 text-emerald-700 dark:text-emerald-400 mb-2" />
            <h3 className="font-display font-bold text-slate-900 dark:text-white text-sm">
              Every Player Recognized
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Complete squad rosters, live striker/bowler tracking, and permanent
              career statistics for every village cricketer.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-charcoal-900/60 border border-slate-200/70 dark:border-emerald-900/50">
            <MapPin className="w-6 h-6 text-emerald-700 dark:text-emerald-400 mb-2" />
            <h3 className="font-display font-bold text-slate-900 dark:text-white text-sm">
              Home Ground
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              {settings?.contact_address ||
                "Main Village Cricket Ground, Karnataka, India"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
