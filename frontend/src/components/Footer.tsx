"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bug, Mail, MapPin, Phone, Sparkles, Trophy } from "lucide-react";
import { useSite } from "@/context/SiteContext";

export function Footer() {
  const pathname = usePathname();
  const { settings } = useSite();
  const [legalModal, setLegalModal] = useState<"privacy" | "terms" | null>(
    null
  );

  if (pathname?.startsWith("/admin-dashboard")) {
    return null;
  }

  const supportEmail = settings.contact_email || "sumanofficial@gmail.com";

  return (
    <footer className="bg-charcoal-950 border-t border-emerald-900/70 text-slate-300 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Column 1: Brand & Description */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-turf-700 to-turf-950 border border-gold-500/50 flex items-center justify-center shrink-0">
                <Trophy className="w-5 h-5 text-gold-400" />
              </div>
              <div>
                <span className="text-lg font-black text-white block leading-none">
                  {settings.site_name}
                </span>
                <span className="text-[11px] text-emerald-400 font-semibold">
                  {settings.tagline}
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {settings.footer_description}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {settings.social_youtube && (
                <a
                  href={settings.social_youtube}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-gold-500 hover:text-charcoal-950 text-xs font-bold transition-colors border border-white/10"
                >
                  YouTube
                </a>
              )}
              {settings.social_instagram && (
                <a
                  href={settings.social_instagram}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-gold-500 hover:text-charcoal-950 text-xs font-bold transition-colors border border-white/10"
                >
                  Instagram
                </a>
              )}
              {settings.social_facebook && (
                <a
                  href={settings.social_facebook}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-gold-500 hover:text-charcoal-950 text-xs font-bold transition-colors border border-white/10"
                >
                  Facebook
                </a>
              )}
            </div>
          </div>

          {/* Column 2: Quick Navigation */}
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-gold-400 mb-4">
              Quick Navigation
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link
                  href="/live-scores"
                  className="hover:text-gold-400 transition-colors"
                >
                  Live Scores
                </Link>
              </li>
              <li>
                <Link
                  href="/matches"
                  className="hover:text-gold-400 transition-colors"
                >
                  Matches & Fixtures
                </Link>
              </li>
              <li>
                <Link
                  href="/tournaments"
                  className="hover:text-gold-400 transition-colors"
                >
                  Tournaments
                </Link>
              </li>
              <li>
                <Link
                  href="/teams"
                  className="hover:text-gold-400 transition-colors"
                >
                  Village Teams
                </Link>
              </li>
              <li>
                <Link
                  href="/players"
                  className="hover:text-gold-400 transition-colors"
                >
                  Registered Players
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Records & Archives */}
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-gold-400 mb-4">
              Records & Archives
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link
                  href="/points-table"
                  className="hover:text-gold-400 transition-colors"
                >
                  Points Table & NRR
                </Link>
              </li>
              <li>
                <Link
                  href="/results"
                  className="hover:text-gold-400 transition-colors"
                >
                  Match Results
                </Link>
              </li>
              <li>
                <Link
                  href="/winners"
                  className="hover:text-gold-400 transition-colors"
                >
                  Hall of Champions
                </Link>
              </li>
              <li>
                <Link
                  href="/gallery"
                  className="hover:text-gold-400 transition-colors"
                >
                  Photo Gallery
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="hover:text-gold-400 transition-colors"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="hover:text-gold-400 transition-colors"
                >
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Organizer Contact & Bug / Feature Reporting */}
          <div className="space-y-3 text-xs">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-gold-400 mb-4">
              Contact & Support
            </h4>
            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{settings.contact_address}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{settings.contact_phone}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
              <a
                href={`mailto:${supportEmail}`}
                className="hover:text-gold-400 font-semibold break-all"
              >
                {supportEmail}
              </a>
            </div>

            {/* Bug Report & Feature Request Box */}
            <div className="pt-2">
              <a
                href="mailto:sumanofficial@gmail.com?subject=Village%20Cricket%20Live%20-%20Bug%20Report%20/%20New%20Feature%20Request"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-turf-900/80 hover:bg-gold-500 hover:text-charcoal-950 border border-gold-500/40 text-gold-300 font-bold text-[11px] transition-all"
              >
                <Bug className="w-3.5 h-3.5 shrink-0" />
                <span>Report Bug / Request Feature</span>
              </a>
              <p className="text-[11px] text-slate-400 mt-1">
                Email:{" "}
                <a
                  href="mailto:sumanofficial@gmail.com"
                  className="text-emerald-400 hover:underline font-semibold"
                >
                  sumanofficial@gmail.com
                </a>
              </p>
            </div>

            <div className="pt-1 flex flex-wrap gap-3 text-[11px] text-slate-400">
              <button
                type="button"
                onClick={() => setLegalModal("privacy")}
                className="hover:text-gold-400 underline"
              >
                Privacy Policy
              </button>
              <button
                type="button"
                onClick={() => setLegalModal("terms")}
                className="hover:text-gold-400 underline"
              >
                Terms & Conditions
              </button>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-3">
          <p>{settings.copyright_text}</p>
          <span className="inline-flex items-center gap-1.5 text-emerald-300 font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-gold-400" />
            <span>Feedback & New Features: sumanofficial@gmail.com</span>
          </span>
        </div>
      </div>

      {legalModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-charcoal-900 border border-emerald-800 rounded-2xl max-w-lg w-full p-6 space-y-4 text-white">
            <h3 className="text-lg font-bold text-gold-400">
              {legalModal === "privacy"
                ? "Privacy Policy"
                : "Terms and Conditions"}
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
              {legalModal === "privacy"
                ? settings.privacy_policy
                : settings.terms_conditions}
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                className="px-4 py-2 rounded-xl bg-gold-500 text-charcoal-950 font-black text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
}
