"use client";

import React, { useEffect, useState } from "react";
import { apiFetch, SubscriptionPlan, PaymentRecord, UserProfile } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  CreditCard,
  Wallet,
  Check,
  Copy,
  Send,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Zap,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";

export function BillingTab() {
  const { showToast } = useToast();
  const { user: authUser, refreshUser } = useAuth();

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [cryptoInfo, setCryptoInfo] = useState<any>(null);
  const [currentSub, setCurrentSub] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Crypto Modal State
  const [isCryptoOpen, setIsCryptoOpen] = useState(false);
  const [selectedPlanForCrypto, setSelectedPlanForCrypto] = useState<SubscriptionPlan | null>(null);
  const [cryptoNetwork, setCryptoNetwork] = useState("TRC20");
  const [cryptoTxHash, setCryptoTxHash] = useState("");
  const [cryptoSenderWallet, setCryptoSenderWallet] = useState("");
  const [submittingCrypto, setSubmittingCrypto] = useState(false);

  const loadBillingData = async () => {
    setLoading(true);
    try {
      const [plansData, historyData, cryptoData] = await Promise.all([
        apiFetch<{ plans: SubscriptionPlan[]; currentSubscription?: any }>("/api/dashboard/billing/plans"),
        apiFetch<{ payments: PaymentRecord[] }>("/api/dashboard/billing/history"),
        apiFetch<any>("/api/dashboard/billing/crypto-info"),
      ]);

      setPlans(plansData.plans || []);
      setPayments(historyData.payments || []);
      setCryptoInfo(cryptoData);
      if (plansData.currentSubscription) {
        setCurrentSub(plansData.currentSubscription);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to load billing details", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBillingData();

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const paymentStatus = params.get("payment");
      if (paymentStatus === "success") {
        showToast("Payment completed successfully! Your subscription has been upgraded.", "success");
        refreshUser();
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (paymentStatus === "failed") {
        const reason = params.get("reason") || "Payment was canceled or declined";
        showToast(`Payment failed: ${reason}`, "error");
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (paymentStatus === "hash_failed") {
        showToast("Payment verification checksum failed. Contact support if charged.", "error");
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  // Effective subscription profile (prefers server payload, fallbacks to auth user)
  const effectiveProfile = currentSub || authUser;
  const currentTier = (effectiveProfile?.tier || effectiveProfile?.subscription_tier || "free").toLowerCase();
  const rawValidityDate = effectiveProfile?.validUntil || effectiveProfile?.quota_resets_at;

  const validityInfo = React.useMemo(() => {
    if (!rawValidityDate) return null;
    const d = new Date(rawValidityDate);
    if (isNaN(d.getTime())) return null;

    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    const dateStr = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    return {
      dateStr,
      diffDays,
      isExpired: diffDays <= 0,
      daysLeftText: diffDays > 0 ? `${diffDays} days remaining` : "Expired",
    };
  }, [rawValidityDate]);

  const quotaTotal = effectiveProfile?.monthly_quota ?? effectiveProfile?.quota ?? 30;
  const quotaUsed = effectiveProfile?.used_this_month ?? effectiveProfile?.usedThisMonth ?? 0;
  const quotaRemaining = Math.max(0, quotaTotal - quotaUsed);
  const quotaPercent = Math.min(100, Math.round((quotaUsed / (quotaTotal || 1)) * 100));

  const handlePayU = async (planId: string) => {
    showToast("Connecting to PayU India gateway...", "info");
    try {
      const data = await apiFetch("/api/dashboard/billing/payu/initiate", {
        method: "POST",
        body: { planId } as any,
      });

      const checkout = data.checkout || data;
      const payuUrl = data.payuUrl || checkout.action || checkout.payuUrl;
      const params = data.params || checkout.params;

      if (!payuUrl || !params) {
        throw new Error("PayU payment gateway initialization failed: missing payment URL or parameters");
      }

      // Create dynamic hidden form and submit
      const form = document.createElement("form");
      form.method = "POST";
      form.action = payuUrl;

      for (const [key, val] of Object.entries(params)) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = String(val);
        form.appendChild(input);
      }

      document.body.appendChild(form);
      form.submit();
    } catch (err: any) {
      showToast(err.message || "PayU checkout failed", "error");
    }
  };

  const openCryptoModal = (plan: SubscriptionPlan) => {
    setSelectedPlanForCrypto(plan);
    setCryptoTxHash("");
    setCryptoSenderWallet("");
    setIsCryptoOpen(true);
  };

  const getDepositAddress = () => {
    if (!cryptoInfo?.depositAddresses) return "Loading deposit address...";
    return cryptoInfo.depositAddresses[cryptoNetwork] || cryptoInfo.depositAddresses.TRC20 || "";
  };

  const copyAddressToClipboard = () => {
    const addr = getDepositAddress();
    if (!addr) return;
    navigator.clipboard.writeText(addr);
    showToast("Official deposit address copied to clipboard!", "info");
  };

  const handleCryptoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanForCrypto || !cryptoTxHash.trim()) {
      showToast("Transaction hash is required", "error");
      return;
    }

    setSubmittingCrypto(true);
    try {
      await apiFetch("/api/dashboard/billing/crypto/submit", {
        method: "POST",
        body: {
          planId: selectedPlanForCrypto.id,
          txHash: cryptoTxHash.trim(),
          network: cryptoNetwork,
          senderWallet: cryptoSenderWallet.trim() || undefined,
        } as any,
      });

      showToast("Crypto payment submitted! Admin will verify and activate your plan.", "success");
      setIsCryptoOpen(false);
      loadBillingData();
      refreshUser();
    } catch (err: any) {
      showToast(err.message || "Submission failed", "error");
    } finally {
      setSubmittingCrypto(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Subscription &amp; Billing</h2>
        <p className="text-sm text-slate-500">
          Manage your plan, check your active subscription validity, or upgrade with PayU India (Cards, UPI, NetBanking) or USDT Crypto.
        </p>
      </div>

      {/* User's Active Subscription & Validity Summary Card */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-850 to-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden border border-indigo-700/40">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          {/* Plan Info */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                Your Current Subscription
              </span>
              <Badge
                variant="success"
                className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-[11px] font-semibold"
              >
                {effectiveProfile?.status || effectiveProfile?.subscription_status || "Active"}
              </Badge>
            </div>

            <div className="flex items-baseline space-x-3">
              <h3 className="text-3xl font-extrabold tracking-tight capitalize text-white">
                {currentTier === "free" ? "Free Starter Plan" : `${currentTier} Plan`}
              </h3>
              {currentTier !== "free" && (
                <span className="text-xs text-indigo-200 font-medium">
                  • {quotaTotal} articles / month
                </span>
              )}
            </div>

            {/* Validity Date Highlight */}
            {validityInfo ? (
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <span className="flex items-center space-x-1.5 text-indigo-200 font-medium bg-white/10 px-3 py-1 rounded-full border border-white/10">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    Valid until: <strong className="text-white">{validityInfo.dateStr}</strong>
                  </span>
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    validityInfo.isExpired
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  }`}
                >
                  {validityInfo.daysLeftText}
                </span>
              </div>
            ) : (
              <div className="text-xs text-indigo-300 flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Subscription resets monthly based on active plan cycle</span>
              </div>
            )}
          </div>

          {/* Quota Progress Meter */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/15 w-full md:w-80 shrink-0 space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-indigo-200 font-semibold flex items-center space-x-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Monthly Quota</span>
              </span>
              <span className="font-bold text-white">
                {quotaUsed} / {quotaTotal} used
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-black/30 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-400 to-indigo-400 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${quotaPercent}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-[11px] text-indigo-200">
              <span>{quotaRemaining} articles remaining</span>
              <span>{100 - quotaPercent}% available</span>
            </div>
          </div>
        </div>
      </div>

      {/* Plan Cards Grid */}
      <div>
        <div className="mb-4">
          <h3 className="text-lg font-bold text-slate-900">Select or Upgrade Your Plan</h3>
          <p className="text-xs text-slate-500">
            Current active plan is highlighted below with your renewal validity date.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isPopular = !!plan.popular;
            const isCurrentPlan = currentTier === plan.id.toLowerCase();

            return (
              <div
                key={plan.id}
                className={`bg-white rounded-2xl p-6 shadow-sm flex flex-col justify-between relative transition duration-200 ${
                  isCurrentPlan
                    ? "border-2 border-emerald-500 ring-4 ring-emerald-500/15 shadow-xl shadow-emerald-500/5 bg-gradient-to-b from-emerald-50/30 via-white to-white"
                    : isPopular
                    ? "border-2 border-indigo-600 shadow-lg shadow-indigo-100"
                    : "border border-slate-200 hover:border-slate-300 hover:shadow-md"
                }`}
              >
                {/* Current Plan Badge */}
                {isCurrentPlan ? (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[11px] font-bold uppercase tracking-wider py-1 px-4 rounded-full shadow-md flex items-center space-x-1.5 whitespace-nowrap">
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    <span>Your Current Plan</span>
                  </div>
                ) : isPopular ? (
                  <div className="absolute -top-3 right-6 bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider py-1 px-3 rounded-full shadow-sm">
                    Most Popular
                  </div>
                ) : null}

                <div>
                  <div className="flex items-center justify-between">
                    <div
                      className={`text-xs font-bold uppercase tracking-wider ${
                        isCurrentPlan
                          ? "text-emerald-700"
                          : isPopular
                          ? "text-indigo-600"
                          : "text-slate-400"
                      }`}
                    >
                      {plan.name}
                    </div>

                    {isCurrentPlan && (
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                        ACTIVE
                      </span>
                    )}
                  </div>

                  <div className="text-3xl font-extrabold text-slate-900 mt-2">
                    ₹{plan.priceINR.toLocaleString()}{" "}
                    <span className="text-sm font-medium text-slate-500">/ mo</span>
                  </div>
                  <div className="text-xs text-indigo-600 font-semibold mb-4">
                    or ${plan.priceUSDT} USDT (Crypto)
                  </div>

                  {/* If this is the current active plan, show the validity date badge inside */}
                  {isCurrentPlan && validityInfo && (
                    <div className="my-3 p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Subscription Validity:</span>
                        </span>
                        <span className="text-[10px] bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-full">
                          {validityInfo.diffDays > 0 ? `${validityInfo.diffDays} Days Left` : "Renew Now"}
                        </span>
                      </div>
                      <div className="text-[11px] text-emerald-800">
                        Valid until: <strong>{validityInfo.dateStr}</strong>
                      </div>
                    </div>
                  )}

                  <ul className="space-y-2.5 text-xs text-slate-600 mt-5">
                    {plan.features?.map((feat, idx) => (
                      <li key={idx} className="flex items-center space-x-2">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Plan Action Buttons */}
                <div className="mt-8 space-y-2 pt-4 border-t border-slate-100">
                  {isCurrentPlan ? (
                    <div className="space-y-2">
                      <div className="w-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs py-2.5 rounded-lg flex items-center justify-center space-x-1.5 shadow-sm">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>Currently Subscribed &amp; Active</span>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => handlePayU(plan.id)}
                        className="w-full text-xs font-semibold h-9 border-slate-200 hover:bg-slate-50 text-slate-700"
                      >
                        <RefreshCw className="w-3.5 h-3.5 mr-1 text-slate-500" />
                        <span>Renew / Extend 30 Days (₹{plan.priceINR})</span>
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Button
                        onClick={() => handlePayU(plan.id)}
                        className={`w-full text-xs font-semibold py-2.5 h-10 shadow-sm ${
                          isPopular
                            ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white"
                        }`}
                      >
                        <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                        <span>Upgrade for ₹{plan.priceINR} (PayU)</span>
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => openCryptoModal(plan)}
                        className="w-full text-xs font-medium py-2 h-9 bg-slate-900 hover:bg-slate-800 text-white hover:text-white border-slate-900"
                      >
                        <Wallet className="w-3.5 h-3.5 mr-1.5" />
                        <span>Pay ${plan.priceUSDT} USDT Crypto</span>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Transaction History Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-8">
        <div className="p-5 border-b border-slate-200 font-bold text-slate-800 text-base flex items-center justify-between">
          <span>Invoices &amp; Transaction History</span>
          <Button
            size="sm"
            variant="outline"
            onClick={loadBillingData}
            className="text-xs flex items-center space-x-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Gateway</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                  Loading transactions...
                </TableCell>
              </TableRow>
            ) : payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                  No payment transactions recorded yet.
                </TableCell>
              </TableRow>
            ) : (
              payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-slate-500 text-xs">
                    {new Date(p.created_at).toLocaleDateString([], {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="capitalize text-xs font-medium">
                    {p.gateway === "usdt_crypto" ? "USDT Crypto" : p.gateway}
                  </TableCell>
                  <TableCell className="capitalize text-xs">{p.tier_requested} Plan</TableCell>
                  <TableCell className="text-xs font-semibold text-slate-900">
                    {p.currency === "INR" ? `₹${p.amount}` : `$${p.amount} USDT`}
                  </TableCell>
                  <TableCell>
                    {p.status === "completed" ? (
                      <Badge variant="success">Completed</Badge>
                    ) : p.status === "pending" ? (
                      <Badge variant="warning">Pending Verification</Badge>
                    ) : (
                      <Badge variant="destructive">{p.status}</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal: Manual USDT Crypto */}
      <Dialog open={isCryptoOpen} onOpenChange={setIsCryptoOpen}>
        <DialogContent onClose={() => setIsCryptoOpen(false)}>
          <DialogHeader>
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <Wallet className="w-5 h-5" />
              </div>
              <DialogTitle>USDT Crypto Payment</DialogTitle>
            </div>
            <DialogDescription>
              Transfer USDT to our official wallet and submit the blockchain transaction hash.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
              <span className="text-xs text-slate-500 font-semibold uppercase">Amount to Send</span>
              <div className="text-2xl font-bold text-slate-900 mt-0.5">
                ${selectedPlanForCrypto?.priceUSDT} USDT
              </div>
              <span className="text-[11px] text-emerald-600 font-medium capitalize">
                {selectedPlanForCrypto?.name} ({selectedPlanForCrypto?.monthlyQuota} Articles)
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Transfer Network
              </label>
              <select
                value={cryptoNetwork}
                onChange={(e) => setCryptoNetwork(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="TRC20">TRON (TRC-20) — Recommended (~1 USDT network fee)</option>
                <option value="BEP20">BNB Smart Chain (BEP-20) — (~0.5 USDT network fee)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Official Deposit Wallet Address
              </label>
              <div className="flex items-center space-x-1">
                <Input
                  type="text"
                  readOnly
                  value={getDepositAddress()}
                  className="font-mono text-xs bg-slate-100"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={copyAddressToClipboard}
                  className="shrink-0 text-xs px-3"
                >
                  <Copy className="w-3.5 h-3.5 mr-1" />
                  <span>Copy</span>
                </Button>
              </div>
            </div>

            <form onSubmit={handleCryptoSubmit} className="space-y-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Blockchain Transaction Hash (TXID) *
                </label>
                <Input
                  type="text"
                  required
                  value={cryptoTxHash}
                  onChange={(e) => setCryptoTxHash(e.target.value)}
                  placeholder="Paste the transaction hash here"
                  className="font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Your Sender Wallet Address (Optional)
                </label>
                <Input
                  type="text"
                  value={cryptoSenderWallet}
                  onChange={(e) => setCryptoSenderWallet(e.target.value)}
                  placeholder="Wallet you transferred from"
                  className="font-mono text-xs"
                />
              </div>
              <Button
                type="submit"
                disabled={submittingCrypto}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs py-2.5 h-10 flex items-center justify-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>
                  {submittingCrypto ? "Submitting..." : "Submit for Admin Verification"}
                </span>
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
