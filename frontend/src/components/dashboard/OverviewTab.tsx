"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, PipelineRunRecord } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Play,
  CheckCircle,
  Zap,
  Layers,
  Globe,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  Cpu,
  Sparkles,
  ShieldCheck,
  Search,
  BookOpen,
  PieChart,
  Calendar,
  FileText,
} from "lucide-react";

interface OverviewStats {
  totalKeywords: number;
  publishedCount: number;
  draftedCount: number;
  failedCount: number;
  inProgressCount: number;
  queueCount: number;
  monthlyQuota: number;
  usedQuota: number;
  remainingQuota: number;
  quotaResetsAt?: string;
  tierName: string;
  successRate: number;
  avgDurationSeconds: number;
  clusterBreakdown?: Array<{ name: string; count: number }>;
  funnelBreakdown?: { TOFU: number; MOFU: number; BOFU: number; OTHER: number };
  upcomingPlanned?: Array<{
    id: string;
    keyword: string;
    cluster: string;
    funnel_stage: string;
    priority: number;
    canonical_category?: string;
  }>;
  recentRuns?: PipelineRunRecord[];
  wpStatus: {
    isConnected: boolean;
    url: string;
    user?: string;
  };
  automationStatus: {
    enabled: boolean;
    dailyLimit: number;
    schedule: string;
    timezone: string;
    nextRunTime?: string;
    lastRunAt?: string | null;
    publishPosture?: string;
    aiProvider?: string;
  };
}

export function OverviewTab() {
  const { showToast } = useToast();
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [runs, setRuns] = useState<PipelineRunRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [overviewData, runsData] = await Promise.all([
        apiFetch<{ stats: OverviewStats }>("/api/dashboard/overview"),
        apiFetch<{ runs: PipelineRunRecord[] }>("/api/dashboard/runs?limit=10"),
      ]);
      setStats(overviewData.stats);
      setRuns(runsData.runs || []);
    } catch (err: any) {
      showToast(err.message || "Failed to load dashboard overview", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRunNow = async () => {
    setRunning(true);
    showToast("Triggering article generation pipeline...", "info");
    try {
      const res = await apiFetch("/api/dashboard/run-now", { method: "POST" });
      if (res.ok) {
        showToast("Article published successfully to WordPress!", "success");
        await loadData();
        return;
      } else {
        showToast(res.message || "Pipeline execution completed with warning", "error");
      }
    } catch (err: any) {
      showToast("Publishing in progress. Monitoring pipeline status...", "info");
      let attempts = 0;
      let completed = false;
      while (attempts < 30) {
        await new Promise((r) => setTimeout(r, 3000));
        attempts++;
        try {
          const overviewRes = await apiFetch<{ stats: OverviewStats }>("/api/dashboard/overview");
          const latestRun = overviewRes.stats?.recentRuns?.[0];
          if (latestRun && Date.now() - new Date(latestRun.created_at).getTime() < 180000) {
            if (latestRun.status === "success") {
              showToast("Article published successfully to WordPress!", "success");
              await loadData();
              completed = true;
              break;
            } else if (latestRun.status === "failed") {
              showToast(latestRun.fail_reasons || "Pipeline execution failed", "error");
              await loadData();
              completed = true;
              break;
            }
          }
        } catch {}
      }
      if (!completed) {
        showToast(err.message || "Pipeline failed to execute", "error");
        await loadData();
      }
    } finally {
      setRunning(false);
    }
  };

  // Quota calculation
  const monthlyQuota = stats?.monthlyQuota ?? (stats?.tierName === "free" ? 3 : 30);
  const usedQuota = stats?.usedQuota || 0;
  const quotaPercent = Math.min(100, Math.round((usedQuota / Math.max(1, monthlyQuota)) * 100));

  // Funnel calculations
  const totalFunnel =
    (stats?.funnelBreakdown?.TOFU || 0) +
    (stats?.funnelBreakdown?.MOFU || 0) +
    (stats?.funnelBreakdown?.BOFU || 0) +
    (stats?.funnelBreakdown?.OTHER || 0);

  const tofuPct = totalFunnel > 0 ? Math.round(((stats?.funnelBreakdown?.TOFU || 0) / totalFunnel) * 100) : 40;
  const mofuPct = totalFunnel > 0 ? Math.round(((stats?.funnelBreakdown?.MOFU || 0) / totalFunnel) * 100) : 35;
  const bofuPct = totalFunnel > 0 ? Math.round(((stats?.funnelBreakdown?.BOFU || 0) / totalFunnel) * 100) : 25;

  return (
    <div className="space-y-8 pb-10">
      {/* ── TOP HERO COMMAND BANNER ─────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 shadow-xl text-white p-6 sm:p-8">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                <Sparkles className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
                Autonomous Engine Active
              </span>

              {stats?.wpStatus?.isConnected ? (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
                  WP Connected: {stats.wpStatus.url.replace(/^https?:\/\//, "")}
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <AlertCircle className="w-3.5 h-3.5 mr-1 text-amber-400" />
                  WP Needs Configuration
                </span>
              )}

              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                <Cpu className="w-3.5 h-3.5 mr-1 text-slate-400" />
                AI: {stats?.automationStatus?.aiProvider === "openai" ? "OpenAI GPT-4o" : "Google Gemini 2.5"}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Automated Publishing Command Center
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              Your multi-stage autopilot continuously writes, fact-checks, formats, and publishes SEO-dominant articles
              directly to your WordPress blog.
            </p>

            {/* Next scheduled run preview */}
            {stats?.automationStatus?.enabled && stats?.automationStatus?.nextRunTime && (
              <div className="flex items-center space-x-2 text-xs text-indigo-200 font-medium pt-1">
                <Clock className="w-4 h-4 text-indigo-400" />
                <span>Next automated release:</span>
                <span className="bg-indigo-900/60 px-2 py-0.5 rounded border border-indigo-700 text-white font-mono">
                  {new Date(stats.automationStatus.nextRunTime).toLocaleString([], {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
                <span className="text-slate-400">({stats.automationStatus.timezone})</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap lg:flex-col sm:flex-row gap-3">
            <Button
              onClick={handleRunNow}
              disabled={running}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/30 px-5 py-3 rounded-xl flex items-center space-x-2 transition"
            >
              {running ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Generating & Publishing...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current text-white" />
                  <span>Generate & Post Next</span>
                </>
              )}
            </Button>

            <Link href="/keywords">
              <Button
                variant="outline"
                className="w-full bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-200 font-medium px-4 py-3 rounded-xl flex items-center justify-center space-x-2"
              >
                <Layers className="w-4 h-4 text-slate-400" />
                <span>Manage Keywords</span>
              </Button>
            </Link>

            <Link href="/settings">
              <Button
                variant="outline"
                className="w-full bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-200 font-medium px-4 py-3 rounded-xl flex items-center justify-center space-x-2"
              >
                <Globe className="w-4 h-4 text-slate-400" />
                <span>WP Settings</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── HIGH-DENSITY KPI CARDS ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Card 1: Published Articles */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Live Articles</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats?.publishedCount ?? 0}</div>
          <div className="flex items-center space-x-1.5 text-xs text-emerald-600 font-medium mt-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Active on WordPress</span>
          </div>
        </div>

        {/* Card 2: Planned Queue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Queue Backlog</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats?.queueCount ?? 0}</div>
          <div className="text-xs text-slate-500 font-medium mt-1">Ready for generation</div>
        </div>

        {/* Card 3: Monthly Quota */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Monthly Quota</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {stats?.remainingQuota ?? 0}
            <span className="text-xs font-normal text-slate-400 ml-1">/ {stats?.monthlyQuota ?? (stats?.tierName === "free" ? 3 : 30)}</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                quotaPercent > 90 ? "bg-red-500" : quotaPercent > 70 ? "bg-amber-500" : "bg-indigo-600"
              }`}
              style={{ width: `${quotaPercent}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-400 mt-1 capitalize font-medium">{stats?.tierName || "free"} plan</div>
        </div>

        {/* Card 4: Success Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Success Rate</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats?.successRate ?? 100}%</div>
          <div className="text-xs text-emerald-600 font-medium mt-1">Pipeline reliability</div>
        </div>

        {/* Card 5: Avg Speed */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Avg Speed</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats?.avgDurationSeconds ?? 45}s</div>
          <div className="text-xs text-slate-500 font-medium mt-1">Per 4,000+ word article</div>
        </div>

        {/* Card 6: WordPress Target */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Target Site</span>
            <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
              <Globe className="w-4 h-4" />
            </div>
          </div>
          <div className="text-sm font-bold text-slate-900 truncate" title={stats?.wpStatus?.url}>
            {stats?.wpStatus?.url ? stats.wpStatus.url.replace(/^https?:\/\//, "").replace(/\/$/, "") : "Not Set"}
          </div>
          <div className="mt-1">
            {stats?.wpStatus?.isConnected ? (
              <span className="inline-flex items-center text-[11px] font-semibold text-emerald-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1" />
                Live & Verified
              </span>
            ) : (
              <span className="inline-flex items-center text-[11px] font-semibold text-amber-600">
                <AlertCircle className="w-3 h-3 mr-1" />
                Action Required
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── VISUAL MULTI-STAGE PIPELINE TRACKER ─────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Multi-Stage Automated Content Architecture</h2>
            <p className="text-xs text-slate-500">
              Each queued keyword is processed through 6 rigorous production gates to guarantee human-grade editorial quality.
            </p>
          </div>
          <span className="inline-flex items-center text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
            Zero-Shot Automation Active
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/50 flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Stage 1</div>
              <div className="text-xs font-bold text-slate-900 mt-1">SERP & Intent</div>
              <p className="text-[11px] text-slate-500 mt-1">Search intent, keyword classification & clustering</p>
            </div>
            <div className="mt-3 flex items-center text-[10px] font-semibold text-emerald-600">
              <CheckCircle className="w-3 h-3 mr-1" /> Complete
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/50 flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Stage 2</div>
              <div className="text-xs font-bold text-slate-900 mt-1">Deep Research</div>
              <p className="text-[11px] text-slate-500 mt-1">Live web grounding, fresh data & competitor analysis</p>
            </div>
            <div className="mt-3 flex items-center text-[10px] font-semibold text-emerald-600">
              <CheckCircle className="w-3 h-3 mr-1" /> Complete
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-purple-100 bg-purple-50/50 flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">Stage 3</div>
              <div className="text-xs font-bold text-slate-900 mt-1">4000+ Word Writer</div>
              <p className="text-[11px] text-slate-500 mt-1">Long-form editorial drafting with zero robotic repetition</p>
            </div>
            <div className="mt-3 flex items-center text-[10px] font-semibold text-emerald-600">
              <CheckCircle className="w-3 h-3 mr-1" /> Complete
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-teal-100 bg-teal-50/50 flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-bold text-teal-600 uppercase tracking-wider">Stage 3.5</div>
              <div className="text-xs font-bold text-slate-900 mt-1">Semantic HTML</div>
              <p className="text-[11px] text-slate-500 mt-1">Tables, callout cards, FAQ accordions & schema tags</p>
            </div>
            <div className="mt-3 flex items-center text-[10px] font-semibold text-emerald-600">
              <CheckCircle className="w-3 h-3 mr-1" /> Complete
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-amber-100 bg-amber-50/50 flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Stage 4 & 5</div>
              <div className="text-xs font-bold text-slate-900 mt-1">Fact Check & QA</div>
              <p className="text-[11px] text-slate-500 mt-1">Hallucination audit, readability score & QA gate</p>
            </div>
            <div className="mt-3 flex items-center text-[10px] font-semibold text-emerald-600">
              <CheckCircle className="w-3 h-3 mr-1" /> Complete
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/50 flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Stage 6</div>
              <div className="text-xs font-bold text-slate-900 mt-1">WordPress Post</div>
              <p className="text-[11px] text-slate-500 mt-1">Auto category & tags resolution, slug & live push</p>
            </div>
            <div className="mt-3 flex items-center text-[10px] font-semibold text-emerald-600">
              <CheckCircle className="w-3 h-3 mr-1" /> Complete
            </div>
          </div>
        </div>
      </div>

      {/* ── TWO-COLUMN STRATEGY & QUEUE PREVIEW ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Content Strategy & Funnel */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <PieChart className="w-4 h-4 text-indigo-600" />
                <span>Search Funnel & Topical Clusters</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Top-of-funnel to bottom-of-funnel content balance</p>
            </div>
          </div>

          {/* Funnel Progress Distribution */}
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700">Top of Funnel (TOFU - Informational)</span>
                <span className="text-indigo-600 font-bold">{tofuPct}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${tofuPct}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700">Middle of Funnel (MOFU - Comparison/Guide)</span>
                <span className="text-blue-600 font-bold">{mofuPct}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div className="bg-blue-600 h-full rounded-full" style={{ width: `${mofuPct}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700">Bottom of Funnel (BOFU - Decision/Reviews)</span>
                <span className="text-emerald-600 font-bold">{bofuPct}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${bofuPct}%` }} />
              </div>
            </div>
          </div>

          {/* Top Topical Clusters */}
          <div>
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
              Active Content Clusters
            </div>
            {stats?.clusterBreakdown && stats.clusterBreakdown.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {stats.clusterBreakdown.map((cluster) => (
                  <span
                    key={cluster.name}
                    className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200"
                  >
                    <span className="font-semibold">{cluster.name}</span>
                    <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-800 font-bold">
                      {cluster.count}
                    </span>
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-400 italic">No topical clusters imported yet.</div>
            )}
          </div>
        </div>

        {/* Right: Upcoming In Pipeline */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>Next in Publishing Queue</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Upcoming scheduled keywords awaiting release</p>
            </div>
            <Link href="/keywords" className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center space-x-1">
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {stats?.upcomingPlanned && stats.upcomingPlanned.length > 0 ? (
              stats.upcomingPlanned.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition flex items-center justify-between gap-3"
                >
                  <div className="flex items-center space-x-3 truncate">
                    <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="truncate">
                      <div className="text-xs font-bold text-slate-900 truncate">{item.keyword}</div>
                      <div className="text-[11px] text-slate-500 truncate flex items-center space-x-2 mt-0.5">
                        <span>Cluster: {item.cluster}</span>
                        <span>•</span>
                        <span className="capitalize">{item.canonical_category || "General"}</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="shrink-0 text-[10px] font-semibold">
                    {item.funnel_stage || "TOFU"}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                No planned keywords found. Import a CSV or add keywords in Keywords Manager!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── RECENT EXECUTION LOGS TABLE ─────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-900 text-base">Recent Pipeline Execution Activity</h2>
            <p className="text-xs text-slate-500 mt-0.5">Live audit trail of articles created, timed, and published</p>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-indigo-200 hover:bg-indigo-50 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh Activity</span>
          </button>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/50">
              <TableHead className="font-semibold text-slate-700">Keyword</TableHead>
              <TableHead className="font-semibold text-slate-700">Status</TableHead>
              <TableHead className="font-semibold text-slate-700">WordPress Article</TableHead>
              <TableHead className="font-semibold text-slate-700">Duration</TableHead>
              <TableHead className="font-semibold text-slate-700">Completed At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-slate-400">
                  <div className="flex items-center justify-center space-x-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                    <span>Loading real-time execution logs...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : runs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-slate-400">
                  No execution runs recorded yet. Click &quot;Generate &amp; Post Next&quot; to begin!
                </TableCell>
              </TableRow>
            ) : (
              runs.map((run) => (
                <TableRow key={run.id} className="hover:bg-slate-50/80 transition">
                  <TableCell className="font-medium text-slate-900">{run.keyword_text}</TableCell>
                  <TableCell>
                    {run.status === "success" ? (
                      <Badge variant="success" className="font-semibold">
                        Published
                      </Badge>
                    ) : run.status === "cost_blocked" ? (
                      <Badge variant="warning" className="font-semibold">
                        Quota Exceeded
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="font-semibold" title={run.fail_reasons || ""}>
                        Failed
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {run.wp_post_url ? (
                      <a
                        href={run.wp_post_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                      >
                        <span>View Live Article</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-600 text-xs font-mono">
                    {run.duration_seconds ? `${run.duration_seconds}s` : "—"}
                  </TableCell>
                  <TableCell className="text-slate-400 text-xs">
                    {new Date(run.created_at).toLocaleString([], {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
