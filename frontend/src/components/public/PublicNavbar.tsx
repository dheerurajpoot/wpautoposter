"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { Sparkles, ArrowRight, Menu, X, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PublicNavbar() {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Top Launch Announcement Bar */}
      <div className="bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-800 text-white py-2 px-4 text-center text-xs font-medium tracking-wide flex items-center justify-center gap-2">
        <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
          New
        </span>
        <span>
          Autonomous Content Ops with RankMath 85+ Score Guarantee &amp; Dynamic Prompt Studio!
        </span>
        <Link href="/billing" className="underline font-bold hover:text-indigo-100 hidden sm:inline ml-1">
          Explore Plans →
        </Link>
      </div>

      {/* Main Navigation Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100 transition">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center space-x-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:scale-105 transition">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-slate-900 group-hover:text-indigo-600 transition">
                WP Content Autopilot
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200/60 px-1.5 py-0.5 rounded">
                SEO Platform
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center space-x-8 text-xs font-semibold text-slate-600">
            <Link href="/#features" className="hover:text-indigo-600 transition">
              Features
            </Link>
            <Link href="/#workflow" className="hover:text-indigo-600 transition">
              How It Works
            </Link>
            <Link href="/#pricing" className="hover:text-indigo-600 transition">
              Pricing
            </Link>
            <Link href="/faq" className="hover:text-indigo-600 transition">
              FAQ
            </Link>
            <Link href="/about" className="hover:text-indigo-600 transition">
              About
            </Link>
            <Link href="/contact" className="hover:text-indigo-600 transition">
              Contact
            </Link>
          </nav>

          {/* CTA / Auth Actions */}
          <div className="hidden sm:flex items-center space-x-3">
            {user ? (
              <Link href="/">
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 h-9 shadow-sm">
                  <span>Go to Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-xs font-semibold text-slate-700 hover:text-indigo-600 px-3 py-1.5 transition">
                  Sign In
                </Link>
                <Link href="/login">
                  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 h-9 shadow-sm shadow-indigo-600/20">
                    <span>Start Free Trial</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-2 pb-6 space-y-3 shadow-xl animate-in slide-in-from-top-2 duration-200">
            <div className="flex flex-col space-y-2 text-sm font-semibold text-slate-700">
              <Link href="/#features" onClick={() => setMobileMenuOpen(false)} className="py-2 px-3 rounded-lg hover:bg-slate-50">
                Features
              </Link>
              <Link href="/#workflow" onClick={() => setMobileMenuOpen(false)} className="py-2 px-3 rounded-lg hover:bg-slate-50">
                How It Works
              </Link>
              <Link href="/#pricing" onClick={() => setMobileMenuOpen(false)} className="py-2 px-3 rounded-lg hover:bg-slate-50">
                Pricing
              </Link>
              <Link href="/faq" onClick={() => setMobileMenuOpen(false)} className="py-2 px-3 rounded-lg hover:bg-slate-50">
                FAQ
              </Link>
              <Link href="/about" onClick={() => setMobileMenuOpen(false)} className="py-2 px-3 rounded-lg hover:bg-slate-50">
                About Us
              </Link>
              <Link href="/contact" onClick={() => setMobileMenuOpen(false)} className="py-2 px-3 rounded-lg hover:bg-slate-50">
                Contact
              </Link>
            </div>
            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              {user ? (
                <Link href="/" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full bg-indigo-600 text-white font-semibold text-xs py-2.5">
                    Open Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full font-semibold text-xs py-2.5">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full bg-indigo-600 text-white font-semibold text-xs py-2.5">
                      Start Free Trial
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  );
}

