"use client";

import React, { useEffect, useState } from "react";
import { apiFetch, UserProfile } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, ShieldAlert, Edit, Ban, CheckCircle, RefreshCw } from "lucide-react";

export function AdminUsersTab() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Tier Modal State
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editTier, setEditTier] = useState("pro");
  const [bonusQuota, setBonusQuota] = useState(0);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ users: UserProfile[] }>("/api/admin/users");
      setUsers(data.users || []);
    } catch (err: any) {
      showToast(err.message || "Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const openEditModal = (u: UserProfile) => {
    setSelectedUser(u);
    setEditTier(u.subscription_tier || "starter");
    setBonusQuota(0);
    setIsEditOpen(true);
  };

  const handleUpdateTier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      await apiFetch("/api/admin/users/tier", {
        method: "POST",
        body: {
          userId: selectedUser.id,
          tier: editTier,
          bonusQuota: Number(bonusQuota),
        } as any,
      });

      showToast(`User upgraded to ${editTier} successfully!`, "success");
      setIsEditOpen(false);
      loadUsers();
    } catch (err: any) {
      showToast(err.message || "Failed to update tier", "error");
    }
  };

  const handleToggleSuspend = async (u: UserProfile) => {
    const shouldSuspend = !u.is_suspended;
    const actionLabel = shouldSuspend ? "suspend" : "unsuspend";
    if (!confirm(`Are you sure you want to ${actionLabel} ${u.email}?`)) return;

    try {
      await apiFetch("/api/admin/users/suspend", {
        method: "POST",
        body: {
          userId: u.id,
          suspend: shouldSuspend,
        } as any,
      });

      showToast(`User account ${shouldSuspend ? "suspended" : "reactivated"}`, "info");
      loadUsers();
    } catch (err: any) {
      showToast(err.message || "Action failed", "error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">User Management</h2>
          <p className="text-sm text-slate-500">
            Manage all registered platform users, change subscription tiers, or suspend accounts.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadUsers}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User / Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Plan Tier</TableHead>
              <TableHead>Quota Used</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-slate-400">
                  Loading users...
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-slate-400">
                  No users registered.
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="font-semibold text-slate-900 text-xs">{u.full_name || "—"}</div>
                    <div className="text-[11px] text-slate-400">{u.email}</div>
                  </TableCell>
                  <TableCell>
                    {u.role === "admin" ? (
                      <Badge variant="warning" className="text-[10px]">
                        Admin
                      </Badge>
                    ) : (
                      <span className="text-xs text-slate-500">User</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize text-xs font-semibold">
                      {u.subscription_tier}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-mono">
                    {u.used_this_month} / {u.monthly_quota}
                  </TableCell>
                  <TableCell>
                    {u.is_suspended ? (
                      <Badge variant="destructive">Suspended</Badge>
                    ) : (
                      <Badge variant="success">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditModal(u)}
                      className="text-xs h-8 px-2.5"
                    >
                      <Edit className="w-3.5 h-3.5 mr-1" />
                      <span>Edit Plan</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleSuspend(u)}
                      className={`text-xs h-8 px-2.5 ${
                        u.is_suspended
                          ? "text-emerald-700 hover:bg-emerald-50 border-emerald-300"
                          : "text-rose-600 hover:bg-rose-50 border-rose-200"
                      }`}
                    >
                      {u.is_suspended ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5 mr-1" />
                          <span>Reactivate</span>
                        </>
                      ) : (
                        <>
                          <Ban className="w-3.5 h-3.5 mr-1" />
                          <span>Suspend</span>
                        </>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal: Edit Tier & Bonus Quota */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent onClose={() => setIsEditOpen(false)}>
          <DialogHeader>
            <DialogTitle>Update Subscription Tier</DialogTitle>
            <DialogDescription>
              Modify plan tier and assign bonus article quotas for {selectedUser?.email}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateTier} className="space-y-4 mt-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Select Tier</label>
              <select
                value={editTier}
                onChange={(e) => setEditTier(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="free">Free (3 articles / mo)</option>
                <option value="starter">Starter (30 articles / mo)</option>
                <option value="pro">Pro Publisher (100 articles / mo)</option>
                <option value="agency">Agency Scale (300 articles / mo)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Additional Bonus Quota
              </label>
              <Input
                type="number"
                min={0}
                value={bonusQuota}
                onChange={(e) => setBonusQuota(parseInt(e.target.value) || 0)}
                placeholder="0"
              />
              <span className="text-[11px] text-slate-400">
                Extra articles added immediately to current month quota.
              </span>
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

