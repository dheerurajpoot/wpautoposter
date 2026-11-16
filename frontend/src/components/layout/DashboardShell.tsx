"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { Sidebar } from "@/components/layout/Sidebar";
import { QuotaAlertBanner } from "@/components/dashboard/QuotaAlertBanner";
import { Sparkles, Zap, Menu, X } from "lucide-react";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Automatically close mobile drawer whenever the pathname changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Public marketing and informational routes that render standalone without sidebar
  const publicRoutes = ["/about", "/contact", "/terms", "/privacy", "/faq", "/login"];
  const isPublicRoute = publicRoutes.includes(pathname || "");
  const isHomePage = pathname === "/" || pathname === "";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center space-y-3 text-white">
          <div className="p-3 bg-indigo-600/30 text-indigo-400 rounded-2xl animate-pulse">
            <Sparkles className="w-8 h-8" />
          </div>
          <p className="text-sm font-medium text-slate-300">Loading WP Autopilot...</p>
        </div>
      </div>
    );
  }

  // If user visits public informational pages, let them view without forcing authentication
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // If user visits home page and is not logged in, render the LandingPage directly
  if (isHomePage && !user) {
    return <>{children}</>;
  }

  // For protected routes, require login
  if (!user) {
    return <AuthScreen />;
  }

  // Authenticated user in dashboard view: fixed sidebar with independently scrollable content pane
  return (
    <div className="h-screen max-h-screen overflow-hidden flex flex-col md:flex-row bg-slate-50">
      {/* Mobile Top Header (only visible on mobile screens) */}
      <header className="md:hidden h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 shrink-0 z-30">
        <Link href="/" className="flex items-center space-x-2.5">
          <div className="p-1.5 bg-indigo-600 text-white rounded-lg shadow-sm">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-white text-sm leading-tight">WP Autopilot</div>
            <div className="text-[10px] text-slate-400">SaaS Automation</div>
          </div>
        </Link>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Backdrop Overlay */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-200"
        />
      )}

      {/* Persistent Docked Sidebar (Desktop) / Slide Drawer (Mobile) */}
      <Sidebar
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area - ONLY this scrolls, sidebar remains fixed */}
      <main className="flex-1 h-full min-w-0 overflow-y-auto p-4 sm:p-6 md:p-8">
        <QuotaAlertBanner />
        {children}
      </main>
    </div>
  );
}
