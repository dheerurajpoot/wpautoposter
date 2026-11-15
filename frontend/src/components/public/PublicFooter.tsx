import React from "react";
import Link from "next/link";
import { Sparkles, Shield, CheckCircle2, Heart } from "lucide-react";

export function PublicFooter() {
  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-900 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-800/80">
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-lg text-white tracking-tight">
                WP Content Autopilot
              </span>
            </Link>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              The autonomous, multi-tenant content operations pipeline for WordPress creators, SEO agencies, and digital publishers.
              From targeted keywords to RankMath 85+ published articles with AI featured images.
            </p>
            <div className="flex items-center space-x-2 text-xs text-emerald-400 pt-1 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>All Systems Operational (100% Uptime)</span>
            </div>
          </div>

          {/* Column 1: Product */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Product</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/#features" className="hover:text-white transition">
                  Features Overview
                </Link>
              </li>
              <li>
                <Link href="/#workflow" className="hover:text-white transition">
                  Content Ops Pipeline
                </Link>
              </li>
              <li>
                <Link href="/#pricing" className="hover:text-white transition">
                  Subscription Plans
                </Link>
              </li>
              <li>
                <Link href="/prompts" className="hover:text-white transition">
                  Prompt Studio
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-white transition">
                  Product FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Company */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Company</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/about" className="hover:text-white transition">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition">
                  Contact Support &amp; Sales
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-white transition">
                  Help Center &amp; Guides
                </Link>
              </li>
              <li>
                <span className="text-slate-600 cursor-not-allowed">Partner Program (Soon)</span>
              </li>
            </ul>
          </div>

          {/* Column 3: Legal & Trust */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Legal &amp; Trust</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/terms" className="hover:text-white transition">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white transition">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/privacy#gdpr" className="hover:text-white transition">
                  GDPR / CCPA Compliance
                </Link>
              </li>
              <li>
                <Link href="/terms#refund" className="hover:text-white transition">
                  Refund &amp; Cancellation
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Credits & Copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} WP Content Autopilot. All rights reserved.</p>
          <div className="flex items-center space-x-6">
            <Link href="/privacy" className="hover:text-slate-400 transition">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-slate-400 transition">
              Terms
            </Link>
            <Link href="/contact" className="hover:text-slate-400 transition">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

