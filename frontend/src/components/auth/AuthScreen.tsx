"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import {
  Sparkles,
  ArrowRight,
  UserPlus,
  KeyRound,
  Mail,
  Lock,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react";

interface AuthScreenProps {
  initialMode?: "login" | "register" | "forgot";
  onSuccess?: () => void;
}

export function AuthScreen({ initialMode = "login", onSuccess }: AuthScreenProps) {
  const { login, register } = useAuth();
  const { showToast } = useToast();
  const [mode, setMode] = useState<"login" | "register" | "forgot" | "reset">(initialMode);
  const [loading, setLoading] = useState(false);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [codePreview, setCodePreview] = useState<string | null>(null);

  const handleDemoFill = (type: "user" | "admin") => {
    setMode("login");
    if (type === "admin") {
      setEmail("admin@autopilot.com");
      setPassword("admin123");
    } else {
      setEmail("user@autopilot.com");
      setPassword("user123");
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.trim()) {
      showToast("Please enter your email address", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch<{ ok: boolean; message: string; code?: string }>("/api/auth/forgot-password", {
        method: "POST",
        body: { email } as any,
      });

      showToast(res.message || "Reset verification code generated!", "success");
      if (res.code) {
        setCodePreview(res.code);
        setResetCode(res.code);
      }
      setMode("reset");
    } catch (err: any) {
      showToast(err.message || "Failed to request password reset", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetCode || !resetCode.trim()) {
      showToast("Please enter the 6-digit verification code", "error");
      return;
    }
    if (password.length < 6) {
      showToast("Password must be at least 6 characters", "error");
      return;
    }
    if (password !== confirmPassword) {
      showToast("Passwords do not match", "error");
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch<{ ok: boolean; message: string }>("/api/auth/reset-password", {
        method: "POST",
        body: {
          email,
          code: resetCode,
          new_password: password,
        } as any,
      });

      showToast(res.message || "Password reset successfully! Please log in.", "success");
      setMode("login");
      setPassword("");
      setConfirmPassword("");
      setResetCode("");
      setCodePreview(null);
    } catch (err: any) {
      showToast(err.message || "Failed to reset password", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "login") {
        await login(email, password);
        showToast("Welcome back!", "success");
        if (onSuccess) onSuccess();
      } else if (mode === "register") {
        await register(email, password, fullName || email.split("@")[0]);
        showToast("Account created successfully! Free trial active.", "success");
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      showToast(err.message || "Authentication failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 border border-slate-100 relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex p-3 bg-indigo-50 text-indigo-600 rounded-xl mb-3 shadow-xs hover:scale-105 transition">
            <Sparkles className="w-8 h-8" />
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">WP Content Autopilot</h1>
          <p className="text-xs text-slate-500 mt-1">Autonomous WordPress SEO Publishing Platform</p>
        </div>

        {/* ── Mode 1 & 2: Sign In / Create Account ── */}
        {(mode === "login" || mode === "register") && (
          <>
            {/* Auth Tabs */}
            <div className="flex border-b border-slate-200 mb-6">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`flex-1 py-2 text-sm font-semibold border-b-2 transition ${
                  mode === "login"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setMode("register")}
                className={`flex-1 py-2 text-sm font-semibold border-b-2 transition ${
                  mode === "register"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                    Full Name
                  </label>
                  <Input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    className="h-10 text-xs"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Email Address
                </label>
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@domain.com"
                  className="h-10 text-xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold uppercase text-slate-600">
                    {mode === "login" ? "Password" : "Create Password"}
                  </label>
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => setMode("forgot")}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-10 text-xs pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition p-1"
                    title={showPassword ? "Hide password" : "View password"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-slate-500" />
                    ) : (
                      <Eye className="w-4 h-4 text-slate-500" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 h-11"
              >
                {loading ? (
                  <span>Processing...</span>
                ) : mode === "login" ? (
                  <span className="flex items-center justify-center space-x-2">
                    <span>Sign In to Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </span>
                ) : (
                  <span className="flex items-center justify-center space-x-2">
                    <span>Create Account (Free Trial)</span>
                    <UserPlus className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </form>
          </>
        )}

        {/* ── Mode 3: Forgot Password (Request Code) ── */}
        {mode === "forgot" && (
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-2">
                <KeyRound className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Forgot Password?</h2>
              <p className="text-xs text-slate-500">
                Enter your account email and we&apos;ll send you a 6-digit verification code to reset your password.
              </p>
            </div>

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Your Account Email
                </label>
                <div className="relative">
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@domain.com"
                    className="h-10 text-xs pl-8"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-2.5 top-3" />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 h-11 text-xs"
              >
                {loading ? "Generating Code..." : "Send Verification Code"}
              </Button>

              <button
                type="button"
                onClick={() => setMode("login")}
                className="w-full text-center text-xs text-slate-500 hover:text-slate-800 font-medium flex items-center justify-center gap-1.5 pt-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </button>
            </form>
          </div>
        )}

        {/* ── Mode 4: Reset Password (Enter Code & New Password) ── */}
        {mode === "reset" && (
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Set New Password</h2>
              <p className="text-xs text-slate-500">
                Enter the 6-digit code sent to <span className="font-semibold text-slate-700">{email}</span>.
              </p>
            </div>

            {codePreview && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg p-2.5 text-center text-xs font-mono">
                Verification Code: <strong className="text-sm font-bold tracking-widest">{codePreview}</strong>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  6-Digit Verification Code
                </label>
                <Input
                  type="text"
                  required
                  maxLength={6}
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  placeholder="123456"
                  className="h-10 text-center font-mono tracking-widest text-base font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-10 text-xs pl-8 pr-10"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-2.5 top-3" />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition p-1"
                    title={showPassword ? "Hide password" : "View password"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-slate-500" />
                    ) : (
                      <Eye className="w-4 h-4 text-slate-500" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-10 text-xs pl-8 pr-10"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-2.5 top-3" />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition p-1"
                    title={showConfirmPassword ? "Hide password" : "View password"}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4 text-slate-500" />
                    ) : (
                      <Eye className="w-4 h-4 text-slate-500" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 h-11 text-xs"
              >
                {loading ? "Updating Password..." : "Update Password & Sign In"}
              </Button>

              <button
                type="button"
                onClick={() => setMode("login")}
                className="w-full text-center text-xs text-slate-500 hover:text-slate-800 font-medium flex items-center justify-center gap-1.5 pt-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </button>
            </form>
          </div>
        )}

        {/* Back to Home Link */}
        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <Link href="/" className="text-xs text-slate-400 hover:text-indigo-600 transition inline-flex items-center gap-1">
            <span>← Back to Homepage</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
