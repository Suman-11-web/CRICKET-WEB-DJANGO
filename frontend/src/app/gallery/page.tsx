"use client";

import React, { useEffect, useState } from "react";
import { Camera } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { GalleryItem } from "@/types/cricket";

export default function GalleryPage() {
  const [images, setImages] = useState<GalleryItem[]>([]);
  const [category, setCategory] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ results: GalleryItem[] }>("/gallery/")
      .then((res) => setImages(res.results || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    category === "all"
      ? images
      : images.filter(
          (img) => img.category.toUpperCase() === category.toUpperCase()
        );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-700 dark:text-amber-400">
            Photos & Moments
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mt-1 flex items-center gap-3">
            <Camera className="w-8 h-8 text-emerald-700 dark:text-emerald-400" />
            Village Cricket Gallery
          </h1>
        </div>

        <div className="flex flex-wrap gap-2">
          {["all", "MATCH", "CEREMONY", "TEAM", "TROPHY", "GROUND"].map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold uppercase transition-all ${
                category === c
                  ? "bg-[#15803D] text-white"
                  : "bg-white dark:bg-[#0D2118] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-emerald-800/60"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 rounded-2xl skeleton" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((img) => (
            <div
              key={img.id}
              className="bg-white dark:bg-[#0D2118] rounded-2xl overflow-hidden border border-slate-200/90 dark:border-emerald-800/60 shadow-sm hover:shadow-md transition-all"
            >
              <img
                src={img.image_url}
                alt={img.title}
                className="w-full h-56 object-cover"
              />
              <div className="p-4">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-amber-400">
                  {img.category_display || img.category}
                </span>
                <h2 className="font-display font-bold text-base text-slate-900 dark:text-white mt-0.5">
                  {img.title}
                </h2>
                {img.caption && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {img.caption}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-[#0D2118] rounded-2xl p-10 text-center border border-slate-200 dark:border-emerald-800/60">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
            No Photographs Uploaded Yet
          </p>
        </div>
      )}
    </div>
  );
}
