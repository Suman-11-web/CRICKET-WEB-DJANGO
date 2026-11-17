"use client";

import React, { useState } from "react";
import { Bug, CheckCircle2, Mail, MapPin, Phone, Send, Sparkles } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useSite } from "@/context/SiteContext";

export default function ContactPage() {
  const { settings } = useSite();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch("/contact/", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setSubmitted(true);
      setForm({ name: "", phone: "", email: "", subject: "", message: "" });
    } catch {
      // Ignore
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 rounded-3xl bg-charcoal-900 border border-emerald-800/60 p-7 shadow-xl space-y-6">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-widest text-gold-400">
              Get In Touch
            </span>
            <h1 className="font-display text-3xl font-black text-white mt-1">
              Contact & Support
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-2">
              Have questions about team registration, match fixtures, bug
              reports, or new feature requests? Reach out to us directly.
            </p>
          </div>

          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-turf-900 border border-emerald-700/50 flex items-center justify-center text-emerald-300 shrink-0">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Phone / WhatsApp</p>
                <p className="font-bold text-white">
                  {settings?.contact_phone || "+91 98765 43210"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-turf-900 border border-emerald-700/50 flex items-center justify-center text-gold-400 shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400">
                  Official Email (Bug Reports & New Features)
                </p>
                <a
                  href="mailto:sumanofficial@gmail.com"
                  className="font-bold text-gold-400 hover:underline"
                >
                  sumanofficial@gmail.com
                </a>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-turf-900 border border-emerald-700/50 flex items-center justify-center text-emerald-300 shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Cricket Ground</p>
                <p className="font-bold text-white">
                  {settings?.contact_address ||
                    "Main Cricket Ground, Karnataka, India"}
                </p>
              </div>
            </div>
          </div>

          {/* Dedicated Bug Reporting & Feature Request Box */}
          <div className="p-4 rounded-2xl bg-turf-950/80 border border-gold-500/40 space-y-2">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-gold-400">
              <Bug className="w-4 h-4" />
              <span>Bug Reporting & Feature Requests</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Found an issue or want to request a new cricket scoring feature?
              Send a direct email to{" "}
              <a
                href="mailto:sumanofficial@gmail.com?subject=Village%20Cricket%20Live%20-%20Bug%20Report%20/%20New%20Feature"
                className="text-gold-300 font-bold underline"
              >
                sumanofficial@gmail.com
              </a>
              .
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="lg:col-span-7 rounded-3xl bg-charcoal-900 border border-emerald-800/60 p-7 shadow-xl space-y-4"
        >
          <h2 className="font-display text-xl font-extrabold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-gold-400" />
            <span>Send a Message / Report Bug</span>
          </h2>

          {submitted && (
            <div className="p-3.5 rounded-xl bg-emerald-950 border border-emerald-600 text-emerald-200 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              Thank you! Your message has been received.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="text"
              required
              placeholder="Your Name *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="px-4 py-2.5 rounded-xl bg-charcoal-950 border border-emerald-800/70 text-xs text-white"
            />
            <input
              type="text"
              placeholder="Phone / WhatsApp Number"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="px-4 py-2.5 rounded-xl bg-charcoal-950 border border-emerald-800/70 text-xs text-white"
            />
            <input
              type="email"
              required
              placeholder="Email Address *"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="px-4 py-2.5 rounded-xl bg-charcoal-950 border border-emerald-800/70 text-xs text-white"
            />
            <input
              type="text"
              required
              placeholder="Subject (e.g. Bug Report / Feature Request / Team Entry) *"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="px-4 py-2.5 rounded-xl bg-charcoal-950 border border-emerald-800/70 text-xs text-white"
            />
            <textarea
              rows={4}
              required
              placeholder="Write your message here (minimum 10 characters)... *"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="sm:col-span-2 px-4 py-2.5 rounded-xl bg-charcoal-950 border border-emerald-800/70 text-xs text-white"
            />
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gold-500 hover:bg-gold-400 text-charcoal-950 font-black text-xs shadow-md"
          >
            <Send className="w-4 h-4" /> Send Message
          </button>
        </form>
      </div>
    </div>
  );
}
