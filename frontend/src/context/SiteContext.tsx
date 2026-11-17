"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  Announcement,
  HomepagePayload,
  HomepageSection,
  NavigationItem,
  WebsiteSettings,
} from "@/types/cricket";

interface SiteContextValue {
  settings: WebsiteSettings;
  homepage: HomepagePayload | null;
  navigation: NavigationItem[];
  sections: HomepageSection[];
  announcements: Announcement[];
  theme: "dark" | "light";
  toggleTheme: () => void;
  language: "en" | "kn";
  setLanguage: (lang: "en" | "kn") => void;
  adminUser: {
    id: number;
    username: string;
    email: string;
    role: string;
  } | null;
  refreshSiteData: () => Promise<void>;
}

const DEFAULT_SETTINGS: WebsiteSettings = {
  site_name: "Village Cricket Live",
  site_name_kn: "ಗ್ರಾಮ ಕ್ರಿಕೆಟ್ ಲೈವ್",
  tagline: "Where Village Cricket Comes Alive",
  logo_url: "",
  favicon_url: "",
  primary_color: "#064E3B",
  accent_color: "#F59E0B",
  hero_visible: true,
  hero_title: "Where Village Cricket Comes Alive",
  hero_title_kn: "ಗ್ರಾಮೀಣ ಕ್ರಿಕೆಟ್ ಸಂಭ್ರಮ",
  hero_subtitle:
    "Follow live scores, discover teams, celebrate champions and stay connected with every local cricket tournament.",
  hero_subtitle_kn:
    "ಲೈವ್ ಸ್ಕೋರ್, ತಂಡಗಳು, ಪಂದ್ಯಾವಳಿಗಳು ಮತ್ತು ವಿಜೇತರ ಸಂಪೂರ್ಣ ಮಾಹಿತಿ.",
  hero_background_image: "",
  hero_video_url: "",
  hero_primary_cta_text: "View Live Matches",
  hero_primary_cta_link: "/live-scores",
  hero_secondary_cta_text: "Explore Tournaments",
  hero_secondary_cta_link: "/tournaments",
  upcoming_tournament_banner:
    "Village Premier League 2026 — Registration & Live Fixtures Open!",
  about_title: "Celebrating Our Village Cricket Heritage",
  about_content:
    "Founded by passionate local cricketers and community organizers, Village Cricket Live brings international-grade live scoring, verifiable statistics, and tournament management to every village tournament and friendly match.",
  about_mission:
    "Empowering rural cricket talent with transparent scoring and digital archiving.",
  contact_email: "sumanofficial@gmail.com",
  contact_phone: "+91 98765 43210",
  contact_whatsapp: "+91 98765 43210",
  contact_address:
    "Hadinaru Panchayat Main Cricket Ground, Mysuru District, Karnataka",
  footer_description:
    "The official digital home for village cricket tournaments, live ball-by-ball scores, team franchises, and community sports archives.",
  copyright_text: "© 2026 Village Cricket Live. All rights reserved.",
  privacy_policy:
    "We respect community privacy and store only match and tournament records.",
  terms_conditions:
    "Official tournament rules and scoring decisions are governed by the Organizing Committee.",
  social_facebook: "#facebook",
  social_instagram: "#instagram",
  social_youtube: "#youtube",
  social_x: "#x",
  seo_title: "Village Cricket Live — Official Tournament & Live Score Hub",
  seo_description:
    "Live village cricket scores, points tables, squads, and tournament archives.",
  default_theme: "dark",
  default_language: "en",
};

const SiteContext = createContext<SiteContextValue>({
  settings: DEFAULT_SETTINGS,
  homepage: null,
  navigation: [],
  sections: [],
  announcements: [],
  theme: "dark",
  toggleTheme: () => {},
  language: "en",
  setLanguage: () => {},
  adminUser: null,
  refreshSiteData: async () => {},
});

export function SiteProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<WebsiteSettings>(DEFAULT_SETTINGS);
  const [homepage, setHomepage] = useState<HomepagePayload | null>(null);
  const [navigation, setNavigation] = useState<NavigationItem[]>([]);
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [language, setLanguage] = useState<"en" | "kn">("en");
  const [adminUser, setAdminUser] = useState<{
    id: number;
    username: string;
    email: string;
    role: string;
  } | null>(null);

  const applyDomTheme = (nextTheme: "dark" | "light") => {
    if (typeof document === "undefined") return;
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }
  };

  const refreshSiteData = async () => {
    try {
      const data = await apiFetch<HomepagePayload>("/homepage/");
      setHomepage(data);
      if (data.settings) {
        setSettings({
          ...DEFAULT_SETTINGS,
          ...data.settings,
          contact_email:
            data.settings.contact_email || "sumanofficial@gmail.com",
        });
      }
      if (data.navigation) setNavigation(data.navigation);
      if (data.sections) setSections(data.sections);
      if (data.announcements) setAnnouncements(data.announcements);
    } catch {
      // Keep default settings if backend is offline
    }

    try {
      const me = await apiFetch<{
        authenticated: boolean;
        user?: { id: number; username: string; email: string; role: string };
      }>("/auth/me/");
      if (me.authenticated && me.user) {
        setAdminUser(me.user);
      } else {
        setAdminUser(null);
      }
    } catch {
      setAdminUser(null);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("vcl_theme", "dark");
      setTheme("dark");
      applyDomTheme("dark");
    }
    refreshSiteData();
    const timer = setInterval(refreshSiteData, 6000);
    return () => clearInterval(timer);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("vcl_theme", next);
    }
    applyDomTheme(next);
  };

  return (
    <SiteContext.Provider
      value={{
        settings,
        homepage,
        navigation,
        sections,
        announcements,
        theme,
        toggleTheme,
        language,
        setLanguage,
        adminUser,
        refreshSiteData,
      }}
    >
      {children}
    </SiteContext.Provider>
  );
}

export const useSite = () => useContext(SiteContext);
