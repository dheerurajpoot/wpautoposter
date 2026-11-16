"use client";

import React, { useEffect, useState } from "react";
import { apiFetch, PaymentRecord } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExternalLink, Check, X, RefreshCw, Wallet, Save, Copy, CheckCircle2 } from "lucide-react";

export function AdminCryptoTab() {
  const { showToast } = useToast();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Wallet address settings state
  const [trc20Address, setTrc20Address] = useState("");
  const [bep20Address, setBep20Address] = useState("");
  const [savingWallets, setSavingWallets] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const loadPendingPayments = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<any>("/api/admin/crypto-approvals");
      const list = data?.payments || data?.pending || [];
      setPayments(list);
    } catch (err: any) {
      showToast(err.message || "Failed to load pending crypto payments", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadWallets = async () => {
    try {
      const data = await apiFetch<any>("/api/admin/crypto/wallets");
      if (data) {
        setTrc20Address(data.trc20Address || "");
        setBep20Address(data.bep20Address || "");
      }
    } catch (err: any) {
      console.error("Failed to load crypto deposit addresses:", err);
    }
  };

  useEffect(() => {
    loadPendingPayments();
    loadWallets();
  }, []);

  const handleSaveWallets = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingWallets(true);
    try {
      await apiFetch("/api/admin/crypto/wallets", {
        method: "POST",
        body: {
          trc20Address: trc20Address.trim(),
          bep20Address: bep20Address.trim(),
        } as any,
      });
      showToast("Subscription deposit wallet addresses updated successfully!", "success");
      await loadWallets();
    } catch (err: any) {
      showToast(err.message || "Failed to update wallet addresses", "error");
    } finally {
      setSavingWallets(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast("Wallet address copied to clipboard!", "info");
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleVerify = async (paymentId: string, approved: boolean) => {
    const actionLabel = approved ? "approve and upgrade this user" : "reject this payment";
    if (!confirm(`Are you sure you want to ${actionLabel}?`)) return;

    try {
      await apiFetch("/api/admin/crypto/verify", {
        method: "POST",
        body: { paymentId, approved } as any,
      });

      showToast(
        approved ? "Payment approved and subscription activated!" : "Payment rejected",
        approved ? "success" : "info"
      );
      loadPendingPayments();
    } catch (err: any) {
      showToast(err.message || "Action failed", "error");
    }
  };

  const getExplorerLink = (p: PaymentRecord) => {
    if (!p.crypto_tx_hash) return "#";
    if (p.crypto_network === "BEP20") {
      return `https://bscscan.com/tx/${p.crypto_tx_hash}`;
    }
    return `https://tronscan.org/#/transaction/${p.crypto_tx_hash}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">USDT Crypto Payment &amp; Wallet Management</h2>
          <p className="text-sm text-slate-500">
            Configure your official subscription receiving wallet addresses and review pending blockchain transactions.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { loadPendingPayments(); loadWallets(); }}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* ── OFFICIAL DEPOSIT WALLET SETTINGS CARD ───────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 md:p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-200/60">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">Official Subscription Receiving Wallets</h3>
            <p className="text-xs text-slate-500">
              These addresses are displayed to users in the checkout modal when they choose &quot;Pay with USDT Crypto&quot;.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveWallets} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* TRON (TRC-20) */}
            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-xs text-slate-800">TRON Network (TRC-20)</span>
                  <Badge variant="success" className="text-[10px] py-0 px-2">Recommended</Badge>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(trc20Address, "trc")}
                  className="text-xs text-slate-500 hover:text-indigo-600 flex items-center space-x-1"
                >
                  {copiedKey === "trc" ? (
                    <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /><span className="text-emerald-600">Copied</span></>
                  ) : (
                    <><Copy className="w-3.5 h-3.5" /><span>Copy</span></>
                  )}
                </button>
              </div>
              <Input
                type="text"
                required
                value={trc20Address}
                onChange={(e) => setTrc20Address(e.target.value)}
                placeholder="e.g. TW1234567890abcdefghijklmnopqrstuvwxyz"
                className="font-mono text-xs bg-white"
              />
              <p className="text-[11px] text-slate-400 mt-1.5">
                Fastest transfer speeds with ~1-2 USDT network fee.
              </p>
            </div>

            {/* BNB Smart Chain (BEP-20) */}
            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs text-slate-800">BNB Smart Chain (BEP-20)</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(bep20Address, "bep")}
                  className="text-xs text-slate-500 hover:text-indigo-600 flex items-center space-x-1"
                >
                  {copiedKey === "bep" ? (
                    <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /><span className="text-emerald-600">Copied</span></>
                  ) : (
                    <><Copy className="w-3.5 h-3.5" /><span>Copy</span></>
                  )}
                </button>
              </div>
              <Input
                type="text"
                required
                value={bep20Address}
                onChange={(e) => setBep20Address(e.target.value)}
                placeholder="e.g. 0x1234567890abcdef1234567890abcdef12345678"
                className="font-mono text-xs bg-white"
              />
              <p className="text-[11px] text-slate-400 mt-1.5">
                Low fees with ~0.5 USDT network fee.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-500">
              Saved changes update immediately for all subscribing users.
            </span>
            <Button
              type="submit"
              disabled={savingWallets}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              <span>{savingWallets ? "Saving..." : "Save Wallet Addresses"}</span>
            </Button>
          </div>
        </form>
      </div>

      {/* ── PENDING APPROVALS QUEUE TABLE ──────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Pending USDT Crypto Verification Queue</h3>
            <p className="text-xs text-slate-500">
              Users who submitted blockchain transaction hashes for subscription activation.
            </p>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User Email</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Network</TableHead>
              <TableHead>Transaction Hash (TXID)</TableHead>
              <TableHead className="text-right">Verification</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-slate-400">
                  <div className="flex items-center justify-center space-x-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                    <span>Loading pending crypto requests...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                  No pending crypto payments. All user subscriptions are verified!
                </TableCell>
              </TableRow>
            ) : (
              payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium text-slate-900 text-xs">
                    {(p as any).user_email || (p as any).profiles?.email || p.user_id}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize text-[11px]">
                      {p.tier_requested}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-bold text-xs text-slate-900">
                    ${p.amount} USDT
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono text-[10px]">
                      {p.crypto_network || "TRC20"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {p.crypto_tx_hash ? (
                      <a
                        href={getExplorerLink(p)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 hover:underline flex items-center space-x-1"
                        title={p.crypto_tx_hash}
                      >
                        <span className="truncate max-w-[140px]">{p.crypto_tx_hash}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-emerald-600 hover:bg-emerald-50 border-emerald-200 text-xs h-7 px-2.5"
                      onClick={() => handleVerify(p.id, true)}
                    >
                      <Check className="w-3 h-3 mr-1" />
                      <span>Approve</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-rose-600 hover:bg-rose-50 border-rose-200 text-xs h-7 px-2.5"
                      onClick={() => handleVerify(p.id, false)}
                    >
                      <X className="w-3 h-3 mr-1" />
                      <span>Reject</span>
                    </Button>
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
