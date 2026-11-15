"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { apiFetch } from "@/lib/api";
import {
  Zap,
  LayoutDashboard,
  ListTodo,
  FileCode2,
  Settings,
  CreditCard,
  ShieldCheck,
  BadgeCheck,
  Users,
  BarChart3,
  LogOut,
  X,
} from "lucide-react";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
}

export function Sidebar({ isOpen = false, onClose, className = "" }: SidebarProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [pendingCryptoCount, setPendingCryptoCount] = useState<number>(0);

  useEffect(() => {
    if (user?.role === "admin") {
      apiFetch<any>("/api/admin/crypto/pending")
        .then((data) => setPendingCryptoCount(data?.payments?.length || data?.pending?.length || 0))
        .catch(() => {});
    }
  }, [user]);

  const quotaPercent = user
    ? Math.min(100, Math.round((user.used_this_month / (user.monthly_quota || 1)) * 100))
    : 0;

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    if (path === "/admin") return pathname === "/admin";
    return pathname?.startsWith(path);
  };

  return (
    <aside
      className={`bg-slate-900 text-slate-300 flex flex-col justify-between border-r border-slate-800 z-30 select-none ${
        isOpen
          ? "fixed inset-y-0 left-0 w-72 max-w-[85vw] h-full shadow-2xl flex md:relative md:w-64 md:h-screen md:shadow-none"
          : "hidden md:flex md:w-64 md:h-screen md:shrink-0"
      } ${className}`}
    >
      <div className="flex flex-col min-h-0 flex-1">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <Link
            href="/"
            onClick={onClose}
            className="flex items-center space-x-3 hover:opacity-90 transition"
          >
            <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-sm">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-white text-base leading-tight">WP Autopilot</div>
              <div className="text-[11px] text-slate-400">SaaS Automation Engine</div>
            </div>
          </Link>
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1.5 sidebar-scrollbar">
          <Link
            href="/"
            onClick={onClose}
            className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition ${
              isActive("/")
                ? "bg-indigo-600 text-white shadow"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Overview</span>
          </Link>

          <Link
            href="/keywords"
            onClick={onClose}
            className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition ${
              isActive("/keywords")
                ? "bg-indigo-600 text-white shadow"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <ListTodo className="w-4 h-4" />
            <span>Keywords Manager</span>
          </Link>

          <Link
            href="/prompts"
            onClick={onClose}
            className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition ${
              isActive("/prompts")
                ? "bg-indigo-600 text-white shadow"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <FileCode2 className="w-4 h-4" />
            <span>Prompt Studio</span>
          </Link>

          <Link
            href="/settings"
            onClick={onClose}
            className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition ${
              isActive("/settings")
                ? "bg-indigo-600 text-white shadow"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>WordPress & Settings</span>
          </Link>

          <Link
            href="/billing"
            onClick={onClose}
            className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition ${
              isActive("/billing")
                ? "bg-indigo-600 text-white shadow"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Subscription & Billing</span>
          </Link>

          {/* ADMIN SECTION */}
          {user?.role === "admin" && (
            <div className="pt-5 mt-4 border-t border-slate-800">
              <div className="px-3.5 pb-2 text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Admin Center</span>
              </div>

              <Link
                href="/admin"
                onClick={onClose}
                className={`w-full flex items-center space-x-3 px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                  isActive("/admin")
                    ? "bg-indigo-600 text-white shadow"
                    : "text-amber-200 hover:bg-slate-800"
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Command Center</span>
              </Link>

              <Link
                href="/admin/crypto"
                onClick={onClose}
                className={`w-full flex items-center justify-between px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                  isActive("/admin/crypto")
                    ? "bg-indigo-600 text-white shadow"
                    : "text-amber-200 hover:bg-slate-800"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <BadgeCheck className="w-4 h-4" />
                  <span>Crypto Approvals</span>
                </div>
                {pendingCryptoCount > 0 && (
                  <span className="px-2 py-0.5 text-[11px] bg-amber-500 text-slate-900 font-bold rounded-full">
                    {pendingCryptoCount}
                  </span>
                )}
              </Link>

              <Link
                href="/admin/users"
                onClick={onClose}
                className={`w-full flex items-center space-x-3 px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                  isActive("/admin/users")
                    ? "bg-indigo-600 text-white shadow"
                    : "text-amber-200 hover:bg-slate-800"
                }`}
              >
                <Users className="w-4 h-4" />
                <span>User Management</span>
              </Link>

              <Link
                href="/admin/metrics"
                onClick={onClose}
                className={`w-full flex items-center space-x-3 px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                  isActive("/admin/metrics")
                    ? "bg-indigo-600 text-white shadow"
                    : "text-amber-200 hover:bg-slate-800"
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>SaaS KPI Analytics</span>
              </Link>
            </div>
          )}
        </nav>
      </div>

      {/* User Footer Profile & Quota */}
      <div className="p-4 border-t border-slate-800 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-indigo-700 text-white font-bold flex items-center justify-center text-xs shadow">
              {user?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="truncate max-w-[120px]">
              <div className="text-xs font-semibold text-white truncate">{user?.full_name || "User"}</div>
              <div className="text-[10px] text-slate-400 capitalize">
                {user?.subscription_tier || "Free"} Plan {user?.role === "admin" && "• Admin"}
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign Out"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Quota Progress Bar */}
        <div className="bg-slate-800 rounded-lg p-2.5 text-xs">
          <div className="flex justify-between text-slate-400 mb-1">
            <span>Monthly Quota</span>
            <span className="text-white font-semibold">
              {user?.used_this_month || 0} / {user?.monthly_quota || 0}
            </span>
          </div>
          <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-indigo-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${quotaPercent}%` }}
            />
          </div>
        </div>
      </div>
    </aside>
  );
}
