"use client";

import React, { useEffect, useState, useMemo } from "react";
import { apiFetch, UserSettings } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Globe,
  Activity,
  Cpu,
  Clock,
  Check,
  AlertCircle,
  CheckCircle2,
  Play,
  Zap,
  Calendar,
  Sparkles,
  Layers,
  HelpCircle,
  Eye,
  EyeOff,
} from "lucide-react";

const POPULAR_TIMEZONES = [
  { label: "India Standard Time (IST - UTC+5:30)", value: "Asia/Kolkata" },
  { label: "US Eastern Time (New York / EDT - UTC-4)", value: "America/New_York" },
  { label: "US Central Time (Chicago / CDT - UTC-5)", value: "America/Chicago" },
  { label: "US Mountain Time (Denver / MDT - UTC-6)", value: "America/Denver" },
  { label: "US Pacific Time (Los Angeles / PDT - UTC-7)", value: "America/Los_Angeles" },
  { label: "United Kingdom (London / GMT/BST)", value: "Europe/London" },
  { label: "Central Europe (Berlin, Paris / CET - UTC+1)", value: "Europe/Berlin" },
  { label: "United Arab Emirates (Dubai / GST - UTC+4)", value: "Asia/Dubai" },
  { label: "Singapore & Malaysia (SGT - UTC+8)", value: "Asia/Singapore" },
  { label: "Japan Standard Time (Tokyo / JST - UTC+9)", value: "Asia/Tokyo" },
  { label: "Australia Eastern (Sydney / AEST - UTC+10)", value: "Australia/Sydney" },
  { label: "Coordinated Universal Time (UTC)", value: "UTC" },
];

/**
 * Builds an evenly distributed 24-hour schedule based on daily post quota and preferred start time.
 */
function buildDistributedSchedule(dailyQuota: number, startHour = 9, startMinute = 0) {
  const quota = Math.max(1, Math.min(24, Math.floor(dailyQuota || 1)));
  const cleanMinute = Math.max(0, Math.min(59, Math.floor(startMinute || 0)));
  const cleanStartHour = Math.max(0, Math.min(23, Math.floor(startHour || 9)));

  if (quota === 1) {
    const timeFormatted = `${String(cleanStartHour).padStart(2, "0")}:${String(cleanMinute).padStart(2, "0")}`;
    return {
      cron: `${cleanMinute} ${cleanStartHour} * * *`,
      hours: [cleanStartHour],
      intervalHours: 24,
      description: `1 post per day at ${formatHour12(timeFormatted)}`,
      slotsFormatted: [timeFormatted],
    };
  }

  const stepHours = 24 / quota;
  const hoursSet = new Set<number>();
  for (let i = 0; i < quota; i++) {
    const h = Math.round((cleanStartHour + i * stepHours) % 24);
    hoursSet.add(h);
  }
  const sortedHours = Array.from(hoursSet).sort((a, b) => a - b);
  const cron = `${cleanMinute} ${sortedHours.join(",")} * * *`;
  const intervalRounded = Math.round(stepHours * 10) / 10;
  const slotsFormatted = sortedHours.map(
    (h) => `${String(h).padStart(2, "0")}:${String(cleanMinute).padStart(2, "0")}`
  );

  return {
    cron,
    hours: sortedHours,
    intervalHours: intervalRounded,
    description: `${quota} posts per day (spaced every ~${intervalRounded} hours)`,
    slotsFormatted,
  };
}

function formatHour12(hhmm: string): string {
  try {
    const [hStr, mStr] = hhmm.split(":");
    let h = parseInt(hStr, 10);
    const m = mStr || "00";
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12;
    if (h === 0) h = 12;
    return `${String(h).padStart(2, "0")}:${m} ${ampm}`;
  } catch {
    return hhmm;
  }
}

function cronToTimeString(cron: string): string {
  try {
    const parts = (cron || "0 9 * * *").trim().split(/\s+/);
    if (parts.length >= 2) {
      const min = parseInt(parts[0], 10) || 0;
      let hr = 9;
      if (parts[1].includes(",")) {
        const hrs = parts[1].split(",").map((h) => parseInt(h, 10));
        hr = hrs.find((h) => h >= 8 && h <= 11) ?? hrs[0] ?? 9;
      } else {
        hr = parseInt(parts[1], 10) || 9;
      }
      return `${String(hr).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
    }
  } catch {
    // fallback
  }
  return "09:00";
}

function formatDisplayDate(dateStr: string | null | undefined, tz: string): string {
  if (!dateStr) return "Never";
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("en-US", {
      timeZone: tz || "Asia/Kolkata",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  } catch {
    return dateStr;
  }
}

export function SettingsTab() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Manual scheduled test state
  const [runningBatch, setRunningBatch] = useState(false);
  const [batchResult, setBatchResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Settings form states
  const [wpBaseUrl, setWpBaseUrl] = useState("");
  const [wpApiUser, setWpApiUser] = useState("");
  const [wpAppPassword, setWpAppPassword] = useState("");
  const [showWpPassword, setShowWpPassword] = useState(false);
  const [hasWpPassword, setHasWpPassword] = useState(false);
  const [aiProvider, setAiProvider] = useState<"gemini" | "openai">("gemini");
  const [aiApiKey, setAiApiKey] = useState("");
  const [publishPosture, setPublishPosture] = useState<"always_draft" | "auto_publish">("always_draft");
  const [dailyQuota, setDailyQuota] = useState(1);
  const [scheduledTime, setScheduledTime] = useState("09:00");
  const [cronTz, setCronTz] = useState("Asia/Kolkata");
  const [isAutomationEnabled, setIsAutomationEnabled] = useState(false);
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);
  const [nextRunAt, setNextRunAt] = useState<string | null>(null);

  // Computed distributed schedule preview
  const distributedSchedule = useMemo(() => {
    const [hStr, mStr] = scheduledTime.split(":");
    const h = parseInt(hStr, 10) || 9;
    const m = parseInt(mStr, 10) || 0;
    return buildDistributedSchedule(dailyQuota, h, m);
  }, [dailyQuota, scheduledTime]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ settings: UserSettings & { has_wp_password?: boolean } }>("/api/dashboard/settings");
      if (data.settings) {
        setWpBaseUrl(data.settings.wp_base_url || "");
        setWpApiUser(data.settings.wp_api_user || "");
        setWpAppPassword((data.settings as any).wp_app_password || data.settings.wp_app_password_encrypted || "");
        setHasWpPassword(Boolean(data.settings.has_wp_password));
        setAiProvider(data.settings.ai_provider || "gemini");
        setPublishPosture(data.settings.publish_posture || "always_draft");
        setDailyQuota(data.settings.daily_quota || 1);
        setScheduledTime(cronToTimeString(data.settings.cron_schedule));
        setCronTz(data.settings.cron_timezone || "Asia/Kolkata");
        setIsAutomationEnabled(Boolean(data.settings.is_automation_enabled));
        setLastRunAt(data.settings.last_run_at || null);
        setNextRunAt(data.settings.next_run_at || null);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to load settings", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleTestWordPress = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await apiFetch<{ ok: boolean; message?: string; error?: string }>("/api/dashboard/settings/test-wp", {
        method: "POST",
        body: {
          wp_base_url: wpBaseUrl,
          wp_api_user: wpApiUser,
          wp_app_password: wpAppPassword,
        } as any,
      });

      if (res.ok) {
        setTestResult({ ok: true, message: res.message || "Connection verified successfully!" });
        showToast("WordPress connected successfully!", "success");
      } else {
        setTestResult({ ok: false, message: res.error || "Connection refused" });
        showToast(res.error || "Connection failed", "error");
      }
    } catch (err: any) {
      setTestResult({ ok: false, message: err.message || "Connection failed" });
      showToast(err.message || "WordPress test failed", "error");
    } finally {
      setTesting(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch("/api/dashboard/settings", {
        method: "POST",
        body: {
          wp_base_url: wpBaseUrl.trim(),
          wp_api_user: wpApiUser.trim(),
          wp_app_password: wpAppPassword || undefined,
          ai_provider: aiProvider,
          ai_api_key: aiApiKey || undefined,
          publish_posture: publishPosture,
          daily_quota: Number(dailyQuota),
          cron_schedule: distributedSchedule.cron,
          cron_timezone: cronTz.trim(),
          is_automation_enabled: isAutomationEnabled,
        } as any,
      });

      showToast("Settings and distributed posting schedule saved!", "success");
      await loadSettings();
    } catch (err: any) {
      showToast(err.message || "Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleRunScheduledBatchNow = async () => {
    setRunningBatch(true);
    setBatchResult(null);
    try {
      showToast("Starting scheduled run... Please wait.", "info");
      const res = await apiFetch<{
        ok: boolean;
        successCount: number;
        failedCount: number;
        messages: string[];
        keywordsProcessed: string[];
      }>("/api/dashboard/settings/run-scheduled-now", {
        method: "POST",
      });

      if (res.ok && res.successCount > 0) {
        setBatchResult({
          ok: true,
          message: `Successfully posted ${res.successCount} article(s) to WordPress!`,
        });
        showToast(`Scheduled run successful! (${res.successCount} posted)`, "success");
      } else if (res.ok && res.keywordsProcessed.length === 0) {
        setBatchResult({
          ok: false,
          message: res.messages[0] || "No planned keywords found in your queue to publish.",
        });
        showToast("No planned keywords found in queue", "error");
      } else {
        const errorDetail = res.messages.join("; ") || "Scheduled run encountered errors.";
        setBatchResult({
          ok: false,
          message: errorDetail,
        });
        showToast(`Run completed with warnings: ${errorDetail}`, "error");
      }
      await loadSettings();
    } catch (err: any) {
      setBatchResult({ ok: false, message: err.message || "Execution failed" });
      showToast(err.message || "Execution failed", "error");
    } finally {
      setRunningBatch(false);
    }
  };

  const handleDetectDeviceTimezone = () => {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected) {
        setCronTz(detected);
        showToast(`Timezone set to ${detected}`, "success");
      }
    } catch {
      showToast("Could not detect device timezone", "error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">WordPress & Automation Settings</h2>
          <p className="text-sm text-slate-500">
            Configure your WordPress connection, AI engine, and multi-post daily automated schedule.
          </p>
        </div>

        {/* Live Automation Status Pill */}
        <div className="flex items-center space-x-2">
          {isAutomationEnabled ? (
            <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Daily Automation Active</span>
            </div>
          ) : (
            <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-600">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span>Daily Automation Paused</span>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6" autoComplete="off">
        {/* Hidden dummy fields to prevent browser password managers from injecting site login into WordPress inputs */}
        <input type="text" name="prevent_autofill_username" className="hidden" tabIndex={-1} autoComplete="off" />
        <input type="password" name="prevent_autofill_password" className="hidden" tabIndex={-1} autoComplete="new-password" />

        {/* WordPress Connection Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2 text-slate-800 font-bold">
              <Globe className="w-5 h-5 text-indigo-600" />
              <span>WordPress REST API Connection</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={testing}
              onClick={handleTestWordPress}
              className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 flex items-center space-x-1"
            >
              <Activity className={`w-3.5 h-3.5 ${testing ? "animate-spin" : ""}`} />
              <span>{testing ? "Testing..." : "Test Connection"}</span>
            </Button>
          </div>

          {testResult && (
            <div
              className={`p-3 rounded-lg text-xs font-medium flex items-center space-x-2 ${
                testResult.ok
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-rose-50 text-rose-800 border border-rose-200"
              }`}
            >
              {testResult.ok ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                WordPress Base URL
              </label>
              <Input
                type="url"
                name="wp_remote_site_base_url"
                value={wpBaseUrl}
                onChange={(e) => setWpBaseUrl(e.target.value)}
                placeholder="https://yourblog.com"
                required
                autoComplete="off"
              />
              <span className="text-[11px] text-slate-400">Root URL of your WordPress site</span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">WP Username</label>
              <Input
                type="text"
                name="wp_remote_site_username_field"
                value={wpApiUser}
                onChange={(e) => setWpApiUser(e.target.value)}
                placeholder="admin"
                required
                autoComplete="off"
                data-lpignore="true"
                data-1p-ignore="true"
              />
              <span className="text-[11px] text-slate-400">Author or Admin user on WordPress</span>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-600">Application Password</label>
                {hasWpPassword && (
                  <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    ✓ Saved
                  </span>
                )}
              </div>
              <div className="relative">
                <Input
                  type={showWpPassword ? "text" : "password"}
                  name="wp_remote_site_app_password_field"
                  value={wpAppPassword}
                  onChange={(e) => setWpAppPassword(e.target.value)}
                  placeholder={hasWpPassword ? "•••••••••••••••• (Leave blank to keep)" : "Enter Application Password"}
                  className="pr-10 text-xs font-mono"
                  autoComplete="new-password"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-form-type="other"
                />
                <button
                  type="button"
                  onClick={() => setShowWpPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition p-1"
                  title={showWpPassword ? "Hide password" : "View password"}
                >
                  {showWpPassword ? (
                    <EyeOff className="w-4 h-4 text-slate-500" />
                  ) : (
                    <Eye className="w-4 h-4 text-slate-500" />
                  )}
                </button>
              </div>
              <span className="text-[11px] text-slate-400">
                WP Admin → Users → Profile → Application Passwords
              </span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-[11px] text-slate-600 space-y-1 mt-2">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
              <span>How to create and maintain your WordPress Application Password:</span>
            </div>
            <div className="space-y-0.5 text-slate-600">
              <p>• In WordPress Admin, navigate to <strong>Users &gt; Profile</strong>, scroll down to <strong>Application Passwords</strong>, type a name like <code className="bg-white px-1 py-0.5 rounded border border-slate-200">AutoPoster</code>, and click <strong>Add New Application Password</strong>.</p>
              <p>• Copy the generated code and paste it above (spaces are accepted automatically).</p>
              <p className="text-amber-800 font-medium pt-0.5">
                💡 <strong>Why does an Application Password stop working?</strong> WordPress instantly revokes and deletes all existing application passwords if your main user account password is changed/reset or if &quot;Log out of all other sessions&quot; is clicked in WordPress. Also, security plugins (like Wordfence) can temporarily block rapid API calls. If you receive a 401 error, generate a fresh password in WordPress and save it here.
              </p>
            </div>
          </div>
        </div>

        {/* AI Provider & Automation Rules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* AI Provider */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 text-slate-800 font-bold border-b border-slate-100 pb-3">
              <Cpu className="w-5 h-5 text-indigo-600" />
              <span>AI Provider & Model</span>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-600">Select AI Engine</label>
              <div className="grid grid-cols-2 gap-2">
                <label
                  className={`flex items-center space-x-2 p-3 border rounded-lg cursor-pointer transition ${
                    aiProvider === "gemini"
                      ? "border-indigo-600 bg-indigo-50/40"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="ai-provider"
                    value="gemini"
                    checked={aiProvider === "gemini"}
                    onChange={() => setAiProvider("gemini")}
                    className="text-indigo-600"
                  />
                  <div>
                    <span className="text-xs font-semibold block">Google Gemini</span>
                    <span className="text-[10px] text-slate-500">Fast, Grounded & Accurate</span>
                  </div>
                </label>

                <label
                  className={`flex items-center space-x-2 p-3 border rounded-lg cursor-pointer transition ${
                    aiProvider === "openai"
                      ? "border-indigo-600 bg-indigo-50/40"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="ai-provider"
                    value="openai"
                    checked={aiProvider === "openai"}
                    onChange={() => setAiProvider("openai")}
                    className="text-indigo-600"
                  />
                  <div>
                    <span className="text-xs font-semibold block">OpenAI GPT-4o</span>
                    <span className="text-[10px] text-slate-500">Premium Creative Output</span>
                  </div>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Custom AI API Key (Optional)
                </label>
                <Input
                  type="password"
                  value={aiApiKey}
                  onChange={(e) => setAiApiKey(e.target.value)}
                  placeholder="Leave empty to use Platform AI credits"
                />
                <span className="text-[11px] text-slate-400">
                  Optional. Provide your own key to bypass monthly platform token limits.
                </span>
              </div>
            </div>
          </div>

          {/* Daily Automation & Scheduler */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-slate-800 font-bold">
                <Clock className="w-5 h-5 text-indigo-600" />
                <span>Daily Scheduled Posting</span>
              </div>

              {/* Automation Toggle Switch */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAutomationEnabled}
                  onChange={(e) => setIsAutomationEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                <span className="ml-2 text-xs font-semibold text-slate-700">
                  {isAutomationEnabled ? "Enabled" : "Disabled"}
                </span>
              </label>
            </div>

            <div className="space-y-4">
              {/* Daily Autopilot Banner */}
              <div
                className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                  isAutomationEnabled
                    ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                    : "bg-slate-50 border-slate-200 text-slate-600"
                }`}
              >
                <div>
                  <div className="font-semibold flex items-center space-x-1.5">
                    <span>{isAutomationEnabled ? "Daily Autopilot is ON" : "Daily Autopilot is currently OFF"}</span>
                    {isAutomationEnabled && (
                      <span className="text-[10px] bg-emerald-600 text-white font-bold px-1.5 py-0.2 rounded-full">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {isAutomationEnabled
                      ? `${distributedSchedule.description} in ${cronTz}.`
                      : "Turn on to automatically publish from your planned keyword queue every day."}
                  </div>
                </div>
              </div>

              {/* Scheduled Time & Daily Quota */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Daily Start Time
                  </label>
                  <Input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="font-medium"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {["06:00", "09:00", "12:00", "18:00"].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setScheduledTime(t)}
                        className={`text-[10px] px-1.5 py-0.5 rounded border transition ${
                          scheduledTime === t
                            ? "bg-indigo-50 border-indigo-400 text-indigo-700 font-bold"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {t === "09:00" ? "09:00 AM (Recommended)" : formatHour12(t)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Daily Posts Count
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    value={dailyQuota}
                    onChange={(e) => setDailyQuota(Math.max(1, Math.min(12, parseInt(e.target.value) || 1)))}
                  />
                  <span className="text-[11px] text-slate-400">
                    Articles to publish per day (evenly spaced)
                  </span>
                </div>
              </div>

              {/* Distributed Slots Preview Box */}
              <div className="bg-indigo-50/50 border border-indigo-100 p-3 rounded-lg text-xs space-y-2">
                <div className="flex items-center justify-between text-indigo-950 font-semibold">
                  <div className="flex items-center space-x-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Hourly Distribution ({dailyQuota} {dailyQuota === 1 ? "post" : "posts"} / day)</span>
                  </div>
                  {dailyQuota > 1 && (
                    <span className="text-[11px] text-indigo-600 font-bold">
                      Every ~{distributedSchedule.intervalHours} hours
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {distributedSchedule.slotsFormatted.map((slot, idx) => (
                    <span
                      key={slot}
                      className="inline-flex items-center space-x-1 bg-white text-indigo-800 border border-indigo-200 px-2 py-1 rounded-md text-[11px] font-semibold shadow-xs"
                    >
                      <Clock className="w-3 h-3 text-indigo-500" />
                      <span>{formatHour12(slot)}</span>
                      {dailyQuota > 1 && (
                        <span className="text-[10px] text-slate-400 font-normal">
                          (Post {idx + 1})
                        </span>
                      )}
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {dailyQuota === 1
                    ? "Posts 1 article daily at your preferred start time."
                    : `Your ${dailyQuota} daily posts will be published 1 by 1 at these exact times, perfectly distributed across the day.`}
                </p>
              </div>

              {/* Timezone Selector */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">Publishing Timezone</label>
                  <button
                    type="button"
                    onClick={handleDetectDeviceTimezone}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium underline"
                  >
                    Detect My Timezone
                  </button>
                </div>
                <select
                  value={cronTz}
                  onChange={(e) => setCronTz(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {POPULAR_TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                  {!POPULAR_TIMEZONES.some((tz) => tz.value === cronTz) && (
                    <option value={cronTz}>{cronTz} (Custom)</option>
                  )}
                </select>
              </div>

              {/* Publishing Posture */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Publishing Posture
                </label>
                <select
                  value={publishPosture}
                  onChange={(e) => setPublishPosture(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="auto_publish">Auto Publish (Live on WordPress directly)</option>
                  <option value="always_draft">Create Drafts Only (Manual review before live)</option>
                </select>
              </div>

              {/* Next & Last Run Info */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Last Automated Run</span>
                  <span className="font-semibold text-slate-700">
                    {formatDisplayDate(lastRunAt, cronTz)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Next Scheduled Run</span>
                  <span className="font-semibold text-indigo-700">
                    {isAutomationEnabled ? formatDisplayDate(nextRunAt, cronTz) : "Paused"}
                  </span>
                </div>
              </div>

              {/* Strict On-Time Execution Reassurance */}
              <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200/80 text-[11px] text-emerald-800 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Strict On-Time Scheduled Execution Active</span>
                </div>
                <p className="text-emerald-700 leading-relaxed">
                  Automation strictly executes only when your scheduled time arrives. Saving settings or changing schedules will never trigger unexpected immediate posts.
                </p>
              </div>

              {/* Run Scheduled Batch Now (Manual Verification) */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-700 block">
                    Verify Next Scheduled Post Now
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Publishes the next keyword immediately to verify your settings & prompts
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={runningBatch}
                  onClick={handleRunScheduledBatchNow}
                  className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 flex items-center space-x-1 shrink-0 ml-3"
                >
                  <Play className={`w-3.5 h-3.5 ${runningBatch ? "animate-spin" : ""}`} />
                  <span>{runningBatch ? "Publishing..." : "Run Post Now"}</span>
                </Button>
              </div>

              {batchResult && (
                <div
                  className={`p-3 rounded-lg text-xs font-medium flex items-center space-x-2 ${
                    batchResult.ok
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-amber-50 text-amber-800 border border-amber-200"
                  }`}
                >
                  {batchResult.ok ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                  )}
                  <span>{batchResult.message}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-slate-500">
            Make sure your WordPress Application Password has permissions to publish posts.
          </div>
          <Button
            type="submit"
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center space-x-2 px-6"
          >
            <Check className="w-4 h-4" />
            <span>{saving ? "Saving Changes..." : "Save Settings & Schedule"}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
