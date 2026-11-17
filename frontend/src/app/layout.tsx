import type { Metadata } from "next";
import "./globals.css";
import { SiteProvider } from "@/context/SiteContext";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Village Cricket Live — Official Tournament & Live Score Portal",
  description:
    "Follow ball-by-ball village cricket scores, local cricket tournaments, team profiles, player stats, points tables, and tournament champions.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col bg-[#07150E] text-slate-100 antialiased selection:bg-amber-400 selection:text-slate-950">
        <SiteProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </SiteProvider>
      </body>
    </html>
  );
}
