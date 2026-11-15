"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, PipelineRunRecord, UserProfile } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ShieldCheck,
  Users,
  UserCheck,
  CreditCard,
  Wallet,
  Activity,
  Server,
  RefreshCw,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  Database,
  Layers,
  Settings,
  Sparkles,
} from "lucide-react";

interface AdminOverviewData {
  metrics: {
    totalUsers: number;
    totalPaidUsers: number;
    totalFreeUsers: number;
    totalSuspendedUsers: number;
    totalKeywords: number;
    totalPublished: number;
    payuRevenueINR: number;
    usdtRevenueUSD: number;
    pendingCryptoCount: number;
    activeAutomatedTenants: number;
    globalSuccessRate: number;
  };
  recentUsers: UserProfile[];
  recentRuns: PipelineRunRecord[];
  pendingCrypto: any[];
  systemHealth: {
    databaseMode: string;
    schedulerStatus: string;
    nodeVersion: string;
    uptimeSeconds: number;
  };
}

export function AdminDashboardTab() {
  const { showToast } = useToast();
  const [data, setData] = useState<AdminOverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<AdminOverviewData>("/api/admin/overview");
      setData(res);
    } catch (err: any) {
      showToast(err.message || "Failed to load admin overview", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const metrics = data?.metrics;
  const system = data?.systemHealth;

  return (
    <div className="space-y-8 pb-12">
      {/* ── HEADER BANNER ───────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 text-white p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <ShieldCheck className="w-3.5 h-3.5 mr-1 text-amber-400" />
                Root System Administration
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
                Live Cloud Engine
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Platform Command Center
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl">
              Global multi-tenant overview, live subscriber health, revenue realization, and server orchestration telemetry.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              onClick={loadData}
              disabled={loading}
              variant="outline"
              className="bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-200 font-medium px-4 py-2.5 rounded-xl flex items-center space-x-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh Telemetry</span>
            </Button>

            <Link href="/admin/crypto">
              <Button className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-amber-500/20 flex items-center space-x-2">
                <Wallet className="w-4 h-4" />
                <span>Crypto Approvals</span>
                {(metrics?.pendingCryptoCount ?? 0) > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 bg-slate-900 text-amber-300 text-xs font-black rounded-full">
                    {metrics?.pendingCryptoCount}
                  </span>
                )}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── TOP-LEVEL BUSINESS & PLATFORM METRICS ───────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Tenants</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900">{metrics?.totalUsers ?? 0}</div>
          <div className="flex items-center space-x-2 text-xs font-medium text-slate-500 mt-2">
            <span className="text-indigo-600 font-semibold">{metrics?.totalPaidUsers ?? 0} Paid</span>
            <span>•</span>
            <span>{metrics?.totalFreeUsers ?? 0} Free</span>
          </div>
        </div>

        {/* Realized Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Realized Revenue</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900">
            ₹{(metrics?.payuRevenueINR ?? 0).toLocaleString()}
          </div>
          <div className="flex items-center space-x-2 text-xs font-medium text-emerald-600 mt-2">
            <span>+ ${(metrics?.usdtRevenueUSD ?? 0).toLocaleString()} USDT</span>
            <span className="text-slate-400">• Multi-gateway</span>
          </div>
        </div>

        {/* Global Published Articles */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Global Articles Published</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900">{metrics?.totalPublished ?? 0}</div>
          <div className="flex items-center space-x-2 text-xs font-medium text-blue-600 mt-2">
            <span>{metrics?.globalSuccessRate ?? 100}% Success Rate</span>
            <span className="text-slate-400">• Across all tenants</span>
          </div>
        </div>

        {/* Pending Crypto Approvals */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Crypto Txns</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900">{metrics?.pendingCryptoCount ?? 0}</div>
          <div className="flex items-center space-x-2 text-xs font-medium mt-2">
            {(metrics?.pendingCryptoCount ?? 0) > 0 ? (
              <span className="text-amber-600 font-bold flex items-center">
                <AlertCircle className="w-3.5 h-3.5 mr-1" /> Requires Admin Verification
              </span>
            ) : (
              <span className="text-emerald-600 font-medium">All Transactions Verified</span>
            )}
          </div>
        </div>
      </div>

      {/* ── SYSTEM ARCHITECTURE & HEALTH CARDS ──────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Server className="w-4 h-4 text-indigo-600" />
              <span>Core Architecture & Cloud Telemetry</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Runtime health of persistent databases and background workers</p>
          </div>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
            Engine Nominal
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div className="text-xs font-medium text-slate-500">Database Engine</div>
            <div className="text-sm font-bold text-slate-900 mt-1 flex items-center space-x-1.5">
              <Database className="w-4 h-4 text-indigo-600" />
              <span>{system?.databaseMode || "Supabase Cloud"}</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Multi-tenant partition active</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div className="text-xs font-medium text-slate-500">Scheduler Daemon</div>
            <div className="text-sm font-bold text-slate-900 mt-1 flex items-center space-x-1.5">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>{system?.schedulerStatus || "Active Multi-Tenant Loop"}</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {metrics?.activeAutomatedTenants ?? 0} Tenants Automated
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div className="text-xs font-medium text-slate-500">Node Runtime</div>
            <div className="text-sm font-bold text-slate-900 mt-1">{system?.nodeVersion || process.version}</div>
            <div className="text-[11px] text-slate-400 mt-1">V8 JIT compilation enabled</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div className="text-xs font-medium text-slate-500">Daemon Uptime</div>
            <div className="text-sm font-bold text-slate-900 mt-1 font-mono">
              {system?.uptimeSeconds ? formatUptime(system.uptimeSeconds) : "Active"}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Zero downtime continuous worker</div>
          </div>
        </div>
      </div>

      {/* ── QUICK ADMIN ACTIONS ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/admin/crypto"
          className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:border-amber-400 hover:shadow-md transition group"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl group-hover:scale-105 transition">
              <Wallet className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-1 transition" />
          </div>
          <div className="mt-4 font-bold text-slate-900 text-sm">Crypto Payment Approvals</div>
          <p className="text-xs text-slate-500 mt-1">
            Review USDT transaction hashes and approve manual wallet upgrades.
          </p>
        </Link>

        <Link
          href="/admin/users"
          className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:border-indigo-400 hover:shadow-md transition group"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl group-hover:scale-105 transition">
              <Users className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition" />
          </div>
          <div className="mt-4 font-bold text-slate-900 text-sm">User & Quota Management</div>
          <p className="text-xs text-slate-500 mt-1">
            Change subscription tiers, adjust monthly limits, or suspend accounts.
          </p>
        </Link>

        <Link
          href="/admin/metrics"
          className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:border-blue-400 hover:shadow-md transition group"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-105 transition">
              <TrendingUp className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition" />
          </div>
          <div className="mt-4 font-bold text-slate-900 text-sm">Detailed SaaS Analytics</div>
          <p className="text-xs text-slate-500 mt-1">
            In-depth MRR, churn rate, plan distribution, and subscriber breakdowns.
          </p>
        </Link>
      </div>

      {/* ── TWO-COLUMN TABLES: RECENT USERS & GLOBAL RUNS ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Recent User Registrations */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900 text-base">Recent Tenant Registrations</h2>
              <p className="text-xs text-slate-500 mt-0.5">Latest users onboarded to the SaaS platform</p>
            </div>
            <Link
              href="/admin/users"
              className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center space-x-1"
            >
              <span>Manage All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="font-semibold text-slate-700">User / Email</TableHead>
                <TableHead className="font-semibold text-slate-700">Tier</TableHead>
                <TableHead className="font-semibold text-slate-700">Quota</TableHead>
                <TableHead className="font-semibold text-slate-700">Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-slate-400 text-xs">
                    Loading tenants...
                  </TableCell>
                </TableRow>
              ) : !data?.recentUsers || data.recentUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-slate-400 text-xs">
                    No users registered yet.
                  </TableCell>
                </TableRow>
              ) : (
                data.recentUsers.map((user) => (
                  <TableRow key={user.id} className="hover:bg-slate-50/80 transition text-xs">
                    <TableCell className="font-medium text-slate-900">
                      <div>{user.full_name || "User"}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{user.email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={user.subscription_tier === "agency" ? "default" : user.subscription_tier === "pro" ? "secondary" : "outline"}
                        className="capitalize font-semibold text-[10px]"
                      >
                        {user.subscription_tier || "free"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-600 font-mono text-[11px]">
                      {user.used_this_month || 0} / {user.monthly_quota || 30}
                    </TableCell>
                    <TableCell className="text-slate-400 text-[11px]">
                      {new Date(user.created_at).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Right: Global Real-Time Execution Feed */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900 text-base">Global Real-Time Pipeline Feed</h2>
              <p className="text-xs text-slate-500 mt-0.5">Live execution telemetry across all SaaS tenants</p>
            </div>
            <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              Live Stream
            </span>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="font-semibold text-slate-700">Keyword</TableHead>
                <TableHead className="font-semibold text-slate-700">Status</TableHead>
                <TableHead className="font-semibold text-slate-700">Speed</TableHead>
                <TableHead className="font-semibold text-slate-700">Published</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-slate-400 text-xs">
                    Loading pipeline stream...
                  </TableCell>
                </TableRow>
              ) : !data?.recentRuns || data.recentRuns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-slate-400 text-xs">
                    No execution activity recorded across tenants yet.
                  </TableCell>
                </TableRow>
              ) : (
                data.recentRuns.slice(0, 8).map((run) => (
                  <TableRow key={run.id} className="hover:bg-slate-50/80 transition text-xs">
                    <TableCell className="font-medium text-slate-900 truncate max-w-[180px]" title={run.keyword_text}>
                      {run.keyword_text}
                    </TableCell>
                    <TableCell>
                      {run.status === "success" ? (
                        <Badge variant="success" className="text-[10px] font-semibold">
                          Success
                        </Badge>
                      ) : run.status === "cost_blocked" ? (
                        <Badge variant="warning" className="text-[10px] font-semibold">
                          Quota Limit
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px] font-semibold" title={run.fail_reasons || ""}>
                          Failed
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-500 font-mono text-[11px]">
                      {run.duration_seconds ? `${run.duration_seconds}s` : "—"}
                    </TableCell>
                    <TableCell>
                      {run.wp_post_url ? (
                        <a
                          href={run.wp_post_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 hover:underline flex items-center space-x-1 text-[11px] font-semibold"
                        >
                          <span>Article</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

