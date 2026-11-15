"use client";

import React, { useEffect, useState } from "react";
import { apiFetch, AdminMetrics } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Users, UserCheck, CreditCard, Wallet, RefreshCw } from "lucide-react";

export function AdminMetricsTab() {
  const { showToast } = useToast();
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ metrics: AdminMetrics }>("/api/admin/metrics");
      setMetrics(data.metrics);
    } catch (err: any) {
      showToast(err.message || "Failed to load admin metrics", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">SaaS Business Analytics</h2>
          <p className="text-sm text-slate-500">
            Real-time subscriber metrics, revenue breakdown, and multi-tenant performance KPIs.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadMetrics}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Platform Users
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {metrics?.totalUsers ?? 0}
            </div>
          </div>
          <div className="p-3 bg-slate-100 text-slate-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Paid Subscribers
            </div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">
              {metrics?.paidUsers ?? 0}
            </div>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              PayU Revenue (INR)
            </div>
            <div className="text-2xl font-bold text-indigo-600 mt-1">
              ₹{(metrics?.totalRevenueINR ?? 0).toLocaleString()}
            </div>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              USDT Crypto Revenue
            </div>
            <div className="text-2xl font-bold text-emerald-700 mt-1">
              ${(metrics?.totalRevenueUSDT ?? 0).toLocaleString()} USDT
            </div>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
            <Wallet className="w-6 h-6" />
          </div>
        </div>
      </div>
    </div>
  );
}

