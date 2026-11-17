"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  Globe,
  Megaphone,
  Menu,
  Moon,
  Radio,
  Sun,
  Trophy,
  X,
} from "lucide-react";
import { useSite } from "@/context/SiteContext";

export function Navbar() {
  const pathname = usePathname();
  const {
    homepage,
    settings,
    navigation,
    language,
    setLanguage,
    theme,
    toggleTheme,
  } = useSite();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  if (pathname?.startsWith("/admin-dashboard")) {
    return null;
  }

  const visibleNav = navigation.filter((n) => n.is_visible);
  const primaryNav = visibleNav.filter((n) => n.group_name !== "dropdown");
  const dropdownNav = visibleNav.filter((n) => n.group_name === "dropdown");
  const activeAnnouncement = homepage?.announcements?.[0];
  const liveCount = homepage?.live_matches?.length || 0;

  return (
    <header className="sticky top-0 z-50 w-full shadow-2xl">
      {/* Section A: Top Announcement Bar */}
      {activeAnnouncement && !bannerDismissed && (
        <div className="bg-gradient-to-r from-turf-900 via-emerald-800 to-turf-900 border-b border-gold-500/30 text-white px-4 py-2 text-xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center justify-center gap-2.5 flex-1 text-center flex-wrap">
              <span className="px-2 py-0.5 rounded-full bg-gold-500 text-charcoal-950 font-black text-[10px] uppercase tracking-wider shrink-0">
                {activeAnnouncement.badge_label || "ANNOUNCEMENT"}
              </span>
              <Megaphone className="w-3.5 h-3.5 text-gold-400 shrink-0 hidden sm:inline" />
              <span className="font-semibold text-emerald-50">
                {language === "kn" && activeAnnouncement.text_kn
                  ? activeAnnouncement.text_kn
                  : activeAnnouncement.text}
              </span>
              {activeAnnouncement.link_url && (
                <Link
                  href={activeAnnouncement.link_url}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/10 hover:bg-gold-500 hover:text-charcoal-950 text-gold-300 font-bold text-[11px] transition-colors shrink-0"
                >
                  <span>{activeAnnouncement.link_text || "Explore"}</span>
                  <span>→</span>
                </Link>
              )}
            </div>
            <button
              type="button"
              onClick={() => setBannerDismissed(true)}
              aria-label="Dismiss Announcement"
              className="text-emerald-200 hover:text-white p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Section B: Header and Navigation (No Admin links exposed to public spectators) */}
      <nav
        aria-label="Main Navigation"
        className="bg-charcoal-950/95 backdrop-blur-xl text-white border-b border-emerald-900/70"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
          {/* Brand Logo & Website Name */}
          <Link
            href="/"
            className="flex items-center gap-2.5 sm:gap-3 min-w-0 group"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-turf-700 to-turf-950 border border-gold-500/50 flex items-center justify-center shadow-lg shrink-0">
              {settings.logo_url ? (
                <img
                  src={settings.logo_url}
                  alt={settings.site_name}
                  className="w-7 h-7 object-contain"
                />
              ) : (
                <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-gold-400" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-xl font-black tracking-tight text-white group-hover:text-gold-400 transition-colors truncate">
                  {language === "kn" && settings.site_name_kn
                    ? settings.site_name_kn
                    : settings.site_name}
                </span>
                {liveCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600/20 border border-red-500/40 text-red-400 text-[10px] font-extrabold uppercase shrink-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />
                    {liveCount} LIVE
                  </span>
                )}
              </div>
              <span className="block text-[10px] sm:text-[11px] font-medium text-emerald-400/90 truncate">
                {settings.tagline}
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links + Dropdown */}
          <div className="hidden lg:flex items-center gap-1">
            {primaryNav.map((item) => {
              const isActive =
                item.path === "/"
                  ? pathname === "/"
                  : pathname?.startsWith(item.path);
              const isLiveLink = item.slug === "live-scores";

              return (
                <Link
                  key={item.slug}
                  href={item.path}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isActive
                      ? "bg-gold-500 text-charcoal-950 font-black shadow-md"
                      : "text-slate-200 hover:text-gold-400 hover:bg-white/5"
                  }`}
                >
                  {isLiveLink && (
                    <Radio
                      className={`w-3.5 h-3.5 ${
                        isActive
                          ? "text-charcoal-950"
                          : "text-red-400 animate-pulse"
                      }`}
                    />
                  )}
                  <span>
                    {language === "kn" && item.label_kn
                      ? item.label_kn
                      : item.label}
                  </span>
                </Link>
              );
            })}

            {dropdownNav.length > 0 && (
              <div
                className="relative"
                onMouseEnter={() => setMoreOpen(true)}
                onMouseLeave={() => setMoreOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => setMoreOpen((o) => !o)}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-slate-200 hover:text-gold-400 hover:bg-white/5 flex items-center gap-1"
                >
                  <span>More</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {moreOpen && (
                  <div className="absolute right-0 mt-1 w-48 rounded-2xl bg-charcoal-900 border border-emerald-800/80 shadow-2xl py-2 z-50">
                    {dropdownNav.map((item) => (
                      <Link
                        key={item.slug}
                        href={item.path}
                        onClick={() => setMoreOpen(false)}
                        className={`block px-4 py-2 text-xs font-bold transition-colors ${
                          pathname?.startsWith(item.path)
                            ? "text-gold-400 bg-white/5"
                            : "text-slate-200 hover:text-gold-400 hover:bg-white/5"
                        }`}
                      >
                        {language === "kn" && item.label_kn
                          ? item.label_kn
                          : item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Controls: Language, Theme, Mobile Hamburger */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setLanguage(language === "en" ? "kn" : "en")}
              title="Switch Language (English / Kannada)"
              className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-emerald-300 flex items-center gap-1"
            >
              <Globe className="w-3.5 h-3.5 text-gold-400" />
              <span>{language === "en" ? "ಕನ್ನಡ" : "EN"}</span>
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle Theme"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gold-400 transition-colors"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-label="Open Navigation Menu"
              className="lg:hidden p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white"
            >
              {mobileOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Expandable Menu */}
        {mobileOpen && (
          <div className="lg:hidden bg-charcoal-950 border-t border-emerald-900/60 px-4 pt-3 pb-5 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {visibleNav.map((item) => (
              <Link
                key={item.slug}
                href={item.path}
                onClick={() => setMobileOpen(false)}
                className={`px-3 py-2.5 rounded-xl text-xs font-bold ${
                  pathname === item.path
                    ? "bg-gold-500 text-charcoal-950 font-black"
                    : "text-slate-200 hover:bg-white/5"
                }`}
              >
                {language === "kn" && item.label_kn
                  ? item.label_kn
                  : item.label}
              </Link>
            ))}
          </div>
        )}
      </nav>
    </header>
  );
}
