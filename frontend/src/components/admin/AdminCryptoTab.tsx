"use client";

import React, { useEffect, useState } from "react";
import { apiFetch, PaymentRecord } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExternalLink, Check, X, RefreshCw } from "lucide-react";

export function AdminCryptoTab() {
  const { showToast } = useToast();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    loadPendingPayments();
  }, []);

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
          <h2 className="text-2xl font-bold text-slate-900">USDT Crypto Payment Approvals</h2>
          <p className="text-sm text-slate-500">
            Review pending manual USDT payments, verify on block explorer, and activate user subscriptions.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadPendingPayments}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
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
                  Loading pending payments...
                </TableCell>
              </TableRow>
            ) : payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-slate-400">
                  No pending crypto payments waiting for verification.
                </TableCell>
              </TableRow>
            ) : (
              payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium text-slate-900 text-xs">
                    {p.user_email || p.user_id}
                  </TableCell>
                  <TableCell className="capitalize text-xs font-semibold">
                    {p.tier_requested}
                  </TableCell>
                  <TableCell className="text-xs font-bold text-indigo-700">
                    ${p.amount} USDT
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {p.crypto_network || "TRC20"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-mono text-xs text-slate-600 truncate max-w-[160px]">
                        {p.crypto_tx_hash}
                      </span>
                      <a
                        href={getExplorerLink(p)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 hover:text-indigo-800 p-1"
                        title="Inspect on Block Explorer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </TableCell>
                  <TableCell className="text-right space-x-1.5">
                    <Button
                      size="sm"
                      onClick={() => handleVerify(p.id, true)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-2.5"
                    >
                      <Check className="w-3.5 h-3.5 mr-1" />
                      <span>Approve</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleVerify(p.id, false)}
                      className="text-rose-600 hover:bg-rose-50 border-rose-200 text-xs h-8 px-2.5"
                    >
                      <X className="w-3.5 h-3.5 mr-1" />
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

