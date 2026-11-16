"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { AlertTriangle, ArrowRight, Zap, Sparkles } from "lucide-react";

export function QuotaAlertBanner() {
  const { user } = useAuth();
  const pathname = usePathname();

  if (!user || user.role === "admin") {
    return null;
  }

  const quota = user.monthly_quota ?? 0;
  const used = user.used_this_month ?? 0;
  const remaining = Math.max(0, quota - used);

  // Only render banner when credits are fully exhausted
  if (remaining > 0) {
    return null;
  }

  const isBillingPage = pathname === "/billing";

  // Format quota reset date nicely
  let formattedReset = "";
  if (user.quota_resets_at) {
    try {
      const d = new Date(user.quota_resets_at);
      if (!isNaN(d.getTime())) {
        formattedReset = d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      }
    } catch {}
  }

  const tierName = (user.subscription_tier || "free").toUpperCase();

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-amber-500/10 border-2 border-amber-400/80 p-4 sm:p-5 shadow-md shadow-amber-500/5 mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Decorative ambient gradient backdrop */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-44 h-44 bg-gradient-to-br from-amber-400/20 to-rose-400/20 rounded-full blur-2xl pointer-events-none" />

      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Icon & Alert Messaging */}
        <div className="flex items-start space-x-3.5">
          <div className="p-2.5 bg-gradient-to-br from-amber-500 to-rose-500 text-white rounded-xl shadow-sm shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1 mb-1">
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-rose-600 text-white shadow-xs">
                <span>0 Credits Left</span>
              </span>
              <span className="text-xs font-semibold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                {tierName} Plan ({quota} posts/mo)
              </span>
            </div>
            <h4 className="text-base font-bold text-slate-900 leading-snug">
              Monthly Publishing Limit Reached ({used}/{quota} Used)
            </h4>
            <p className="text-xs sm:text-sm text-slate-700 mt-1 max-w-2xl leading-relaxed">
              You have exhausted all publishing credits for this billing cycle. Automated daily posting and on-demand generation are currently paused.
              {formattedReset ? (
                <> Quota automatically renews on <strong className="text-slate-900 font-semibold">{formattedReset}</strong>, or upgrade your plan to continue publishing immediately.</>
              ) : (
                <> Upgrade your plan to unlock more monthly articles immediately.</>
              )}
            </p>
          </div>
        </div>

        {/* Right: Call to Action Button */}
        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-amber-200">
          {!isBillingPage ? (
            <Link
              href="/billing"
              className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 hover:from-indigo-500 hover:to-violet-600 shadow-md shadow-indigo-600/30 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-150"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>Upgrade Plan</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <a
              href="#pricing-tiers"
              className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-150"
            >
              <Sparkles className="w-4 h-4" />
              <span>Select a Plan Below</span>
            </a>
          )}
          <span className="text-[11px] text-amber-800 font-medium mt-1">
            Instant activation & credits
          </span>
        </div>
      </div>
    </div>
  );
}
