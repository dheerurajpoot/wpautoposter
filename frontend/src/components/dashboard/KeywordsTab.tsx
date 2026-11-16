"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/auth-context";
import { apiFetch, KeywordRecord, getAuthToken } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  FileUp,
  FileDown,
  Search,
  Play,
  Trash2,
  ExternalLink,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Edit,
  Tag,
  FolderTree,
  AlertTriangle,
  Clock,
  HelpCircle,
  RefreshCw,
  SlidersHorizontal,
  CheckCircle2,
} from "lucide-react";

/**
 * Clean & simplified keyword form state.
 * Contains only the essential fields needed by writers & publishers,
 * with optional technical fields hidden and pre-filled with smart defaults.
 */
interface KeywordFormState {
  id?: string;
  row_order: number;
  keyword: string;
  canonical_category: string;
  suggested_tags: string;
  cluster: string;
  notes: string;
  // Optional background defaults:
  content_type: string;
  blogpost_subtype: string;
  funnel_stage: string;
  class_hint: string;
  priority: number;
  pass_risk: string;
  local_modifier: string;
  local_data_required: string;
  cannibalization_group: string;
  phase: number | "";
  planned_month: number | "";
  planned_week: string;
}

const DEFAULT_FORM: KeywordFormState = {
  row_order: 1,
  keyword: "",
  canonical_category: "",
  suggested_tags: "",
  cluster: "",
  notes: "",
  content_type: "BlogPost",
  blogpost_subtype: "Guide",
  funnel_stage: "TOFU",
  class_hint: "B",
  priority: 1,
  pass_risk: "MED",
  local_modifier: "",
  local_data_required: "NO",
  cannibalization_group: "",
  phase: 1,
  planned_month: 11,
  planned_week: "W48",
};

function renderDateTime(kw: KeywordRecord) {
  const isPlanned = (kw.status || "planned") === "planned";

  // For planned keywords in queue: display a clean queue badge
  if (isPlanned) {
    return (
      <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200/80 text-slate-600">
        <Clock className="w-3.5 h-3.5 text-indigo-500" />
        <span className="font-semibold text-xs text-slate-700">In Queue</span>
      </div>
    );
  }

  if (kw.status === "in_progress") {
    return (
      <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-700">
        <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
        <span className="font-semibold text-xs">Generating...</span>
      </div>
    );
  }

  // For published, failed, or draft: display exact execution/publish/failure time
  const rawDate =
    (kw as any).executed_at ||
    (kw as any).published_at ||
    (kw as any).updated_at ||
    "";
  if (!rawDate) return <span className="text-slate-400 text-xs font-mono">—</span>;

  try {
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return <span className="text-slate-400 text-xs font-mono">—</span>;

    const dateStr = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const timeStr = d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

    return (
      <div className="flex flex-col text-xs leading-tight min-w-[110px]">
        <span className="font-semibold text-slate-800">{dateStr}</span>
        <span className="text-slate-500 flex items-center gap-1 mt-0.5 font-mono text-[11px]">
          <Clock className="w-3 h-3 text-slate-400" />
          {timeStr}
        </span>
      </div>
    );
  } catch {
    return <span className="text-slate-400 text-xs font-mono">—</span>;
  }
}

export function KeywordsTab() {
  const { showToast } = useToast();
  const { refreshUser } = useAuth();
  const [keywords, setKeywords] = useState<KeywordRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningId, setRunningId] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [clusterFilter, setClusterFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Expanded row details
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [formData, setFormData] = useState<KeywordFormState>(DEFAULT_FORM);

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [importing, setImporting] = useState(false);

  const loadKeywords = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (clusterFilter !== "all") params.append("cluster", clusterFilter);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());
      params.append("limit", "1000");

      const data = await apiFetch<any>(`/api/dashboard/keywords?${params.toString()}`);
      const list: KeywordRecord[] = data.items || data.keywords || [];
      setKeywords(list);
    } catch (err: any) {
      showToast(err.message || "Failed to load keywords", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKeywords();
  }, [statusFilter, clusterFilter, searchQuery]);

  // Derived filter options
  const clusters = useMemo(() => {
    const set = new Set<string>();
    keywords.forEach((k) => {
      if (k.cluster?.trim()) set.add(k.cluster.trim());
    });
    return Array.from(set).sort();
  }, [keywords]);

  // Clean, ordered view:
  // Planned (queue) on top, completed/published/failed below in chronological order (newest first)
  const filteredKeywords = useMemo(() => {
    return [...keywords].sort((a, b) => {
      const aStatus = a.status || "planned";
      const bStatus = b.status || "planned";
      const aIsPlanned = aStatus === "planned";
      const bIsPlanned = bStatus === "planned";

      // 1. Planned keywords always on top
      if (aIsPlanned && !bIsPlanned) return -1;
      if (!aIsPlanned && bIsPlanned) return 1;

      // 2. Both are planned: sort by priority (1, 2, 3...), row_order, then newest
      if (aIsPlanned && bIsPlanned) {
        const pA = Number(a.priority) || 1;
        const pB = Number(b.priority) || 1;
        if (pA !== pB) return pA - pB;

        const rA = Number(a.row_order) || 0;
        const rB = Number(b.row_order) || 0;
        if (rA !== rB) return rA - rB;

        const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tB - tA;
      }

      // 3. In-progress items placed immediately after planned queue
      if (aStatus === "in_progress" && bStatus !== "in_progress") return -1;
      if (aStatus !== "in_progress" && bStatus === "in_progress") return 1;

      // 4. Completed, published, drafted, failed: strictly time-based order (newest first)
      const timeA = (a as any).executed_at || (a as any).updated_at || (a as any).published_at || a.created_at || "";
      const timeB = (b as any).executed_at || (b as any).updated_at || (b as any).published_at || b.created_at || "";
      const tA = timeA ? new Date(timeA).getTime() : 0;
      const tB = timeB ? new Date(timeB).getTime() : 0;
      return tB - tA;
    });
  }, [keywords]);

  // Clean, writer-focused KPI Calculations
  const stats = useMemo(() => {
    const total = keywords.length;
    const planned = keywords.filter((k) => k.status === "planned").length;
    const published = keywords.filter((k) => k.status === "published").length;
    const drafts = keywords.filter((k) => k.status === "drafted").length;
    const failed = keywords.filter((k) => k.status === "failed").length;
    const inProgress = keywords.filter((k) => k.status === "in_progress").length;
    return { total, planned, published, drafts, failed, inProgress };
  }, [keywords]);

  const toggleRowExpand = (id: string) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Open modal for new keyword
  const handleOpenAdd = () => {
    setIsEditing(false);
    setShowAdvanced(false);
    setFormData({
      ...DEFAULT_FORM,
      row_order: (keywords.length > 0 ? Math.max(...keywords.map((k) => k.row_order || 0)) : 0) + 1,
    });
    setIsFormOpen(true);
  };

  // Open modal for editing existing keyword
  const handleOpenEdit = (kw: KeywordRecord) => {
    setIsEditing(true);
    setShowAdvanced(false);
    setFormData({
      id: kw.id,
      row_order: kw.row_order || 1,
      keyword: kw.keyword || "",
      canonical_category: kw.canonical_category || "",
      suggested_tags: kw.suggested_tags || "",
      cluster: kw.cluster || "",
      notes: kw.notes || "",
      content_type: kw.content_type || "BlogPost",
      blogpost_subtype: kw.blogpost_subtype || "Guide",
      funnel_stage: kw.funnel_stage || "TOFU",
      class_hint: kw.class_hint || "B",
      priority: kw.priority || 1,
      pass_risk: kw.pass_risk || "MED",
      local_modifier: kw.local_modifier || "",
      local_data_required: kw.local_data_required || "NO",
      cannibalization_group: kw.cannibalization_group || "",
      phase: kw.phase ?? 1,
      planned_month: kw.planned_month ?? 11,
      planned_week: kw.planned_week || "W48",
    });
    setIsFormOpen(true);
  };

  // Save (Create or Update)
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.keyword.trim()) {
      showToast("Blog focus keyword is required", "error");
      return;
    }

    try {
      const payload: Partial<KeywordRecord> = {
        keyword: formData.keyword.trim(),
        canonical_category: formData.canonical_category.trim() || null,
        suggested_tags: formData.suggested_tags.trim() || null,
        cluster: formData.cluster.trim(),
        notes: formData.notes.trim() || null,
        row_order: Number(formData.row_order) || 1,
        content_type: formData.content_type || "BlogPost",
        blogpost_subtype: formData.blogpost_subtype || "Guide",
        funnel_stage: formData.funnel_stage as any,
        class_hint: formData.class_hint || "B",
        priority: Number(formData.priority) || 1,
        pass_risk: formData.pass_risk as any,
        local_modifier: formData.local_modifier.trim() || null,
        local_data_required: formData.local_data_required as any,
        cannibalization_group: formData.cannibalization_group.trim() || null,
        phase: formData.phase !== "" ? Number(formData.phase) : null,
        planned_month: formData.planned_month !== "" ? Number(formData.planned_month) : null,
        planned_week: formData.planned_week.trim() || null,
      };

      if (isEditing && formData.id) {
        await apiFetch(`/api/dashboard/keywords/${formData.id}`, {
          method: "PUT",
          body: payload as any,
        });
        showToast("Keyword updated successfully!", "success");
      } else {
        await apiFetch("/api/dashboard/keywords", {
          method: "POST",
          body: payload as any,
        });
        showToast("Keyword added to queue!", "success");
      }

      setIsFormOpen(false);
      loadKeywords();
    } catch (err: any) {
      showToast(err.message || "Failed to save keyword", "error");
    }
  };

  // CSV Import
  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvText((event.target?.result as string) || "");
    };
    reader.readAsText(file);
  };

  const handleImportSubmit = async () => {
    if (!csvText.trim()) {
      showToast("Please provide or paste CSV content", "error");
      return;
    }

    setImporting(true);
    try {
      const res = await apiFetch<any>("/api/dashboard/keywords/import-csv", {
        method: "POST",
        body: { csvText } as any,
      });
      showToast(`Successfully imported ${res.count || "all"} keywords!`, "success");
      setIsImportOpen(false);
      setCsvText("");
      loadKeywords();
    } catch (err: any) {
      showToast(err.message || "Failed to import CSV", "error");
    } finally {
      setImporting(false);
    }
  };

  // Download Clean CSV Sample Template
  const handleDownloadTemplate = () => {
    const templateContent = [
      "keyword,category,tags,cluster,notes",
      '"Best travel credit cards for airport lounge access in India","Finance","credit cards, travel, lounges","Credit Cards","Compare annual fee, lounge limits, and rewards point value"',
      '"How to invest in mutual funds for beginners","Investing","mutual funds, sip, investing","Mutual Funds","Step-by-step guide with SIP calculation table and tax implications"',
      '"Top health insurance plans for elderly parents","Insurance","health insurance, parents, senior citizen","Health Insurance","Explain waiting periods, pre-existing illnesses, and cashless claims"',
    ].join("\n");

    const blob = new Blob([templateContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "keyword_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Trigger Immediate Pipeline Execution for a Single Keyword
  const handleRunSingleKeyword = async (id: string, keyword: string) => {
    setRunningId(id);
    showToast(`Generating article for "${keyword}"...`, "info");
    try {
      const res = await apiFetch<any>(`/api/dashboard/keywords/${id}/run`, {
        method: "POST",
      });

      if (res.ok) {
        showToast(`Article published to WordPress!`, "success");
        await loadKeywords();
        refreshUser().catch(() => {});
        return;
      } else {
        showToast(res.message || "Pipeline execution completed with warnings", "error");
      }
    } catch (err: any) {
      showToast(`Pipeline execution in progress. Monitoring status...`, "info");
      let attempts = 0;
      let completed = false;
      while (attempts < 25) {
        await new Promise((r) => setTimeout(r, 3000));
        attempts++;
        try {
          const freshData = await apiFetch<any>(`/api/dashboard/keywords?limit=1000`);
          const items: KeywordRecord[] = freshData.items || freshData.keywords || [];
          const updated = items.find((k) => k.id === id);
          if (updated && updated.status !== "in_progress" && updated.status !== "planned") {
            if (updated.status === "published") {
              showToast(`Article published successfully!`, "success");
              refreshUser().catch(() => {});
            } else if (updated.status === "failed") {
              showToast(updated.last_error || "Publishing failed", "error");
            }
            await loadKeywords();
            completed = true;
            break;
          }
        } catch {}
      }
      if (!completed) {
        await loadKeywords();
        refreshUser().catch(() => {});
      }
    } finally {
      setRunningId(null);
    }
  };

  // Delete Keyword
  const handleDeleteKeyword = async (id: string, keyword: string) => {
    if (!confirm(`Are you sure you want to remove "${keyword}"?`)) return;

    try {
      await apiFetch(`/api/dashboard/keywords/${id}`, { method: "DELETE" });
      showToast("Keyword deleted successfully", "success");
      loadKeywords();
    } catch (err: any) {
      showToast(err.message || "Failed to delete keyword", "error");
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ── HEADER & PRIMARY ACTIONS ───────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Keyword & Content Planner</h1>
          <p className="text-sm text-slate-500">
            Manage your blog topic ideas, assigned WordPress categories, and automated publishing queue.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            onClick={handleOpenAdd}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center space-x-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Topic Idea</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => setIsImportOpen(true)}
            className="border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center space-x-1.5"
          >
            <FileUp className="w-4 h-4 text-slate-500" />
            <span>Import CSV</span>
          </Button>

          <a
            href={`/api/dashboard/keywords/export-csv?token=${encodeURIComponent(getAuthToken() || "")}`}
            download="keyword.csv"
            className="inline-flex items-center space-x-1.5 px-3 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold transition"
          >
            <FileDown className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* ── CLEAN, WRITER-FOCUSED KPI STATS ────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Topics</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</div>
          <div className="text-xs text-slate-400 mt-1">In your content library</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">In Queue (Planned)</div>
          <div className="text-2xl font-bold text-indigo-600 mt-1">{stats.planned}</div>
          <div className="text-xs text-indigo-400 mt-1">Awaiting auto-publish</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Live on WordPress</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{stats.published}</div>
          <div className="text-xs text-emerald-500 mt-1">Active blog posts</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Drafts &amp; Others</div>
          <div className="text-2xl font-bold text-slate-800 mt-1">{stats.drafts + stats.failed + stats.inProgress}</div>
          <div className="text-xs text-slate-400 mt-1">
            {stats.drafts} drafts • {stats.failed} failed
          </div>
        </div>
      </div>

      {/* ── FILTER & SEARCH BAR ────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by topic, category, tags, or notes..."
              className="pl-9 text-xs"
            />
          </div>

          {/* Quick Status Tabs */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 lg:pb-0">
            {[
              { id: "all", label: "All Topics" },
              { id: "planned", label: "In Queue" },
              { id: "published", label: "Published" },
              { id: "drafted", label: "WP Drafts" },
              { id: "in_progress", label: "Generating" },
              { id: "failed", label: "Failed" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                  statusFilter === tab.id
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cluster / Category Secondary Filter */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-100 text-xs">
          <div className="flex items-center space-x-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium">Filter by Topic Cluster:</span>
            <select
              value={clusterFilter}
              onChange={(e) => setClusterFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Topic Clusters ({clusters.length})</option>
              {clusters.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="text-slate-400 text-xs">
            Showing <strong className="text-slate-700">{filteredKeywords.length}</strong> of{" "}
            {keywords.length} topics
          </div>
        </div>
      </div>

      {/* ── SIMPLIFIED & STREAMLINED KEYWORDS TABLE ───────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80">
              <TableHead className="w-12 text-center text-xs font-bold text-slate-600">#</TableHead>
              <TableHead className="text-xs font-bold text-slate-600 min-w-[260px]">
                Blog Topic &amp; Focus Keyword
              </TableHead>
              <TableHead className="text-xs font-bold text-slate-600">WordPress Category</TableHead>
              <TableHead className="text-xs font-bold text-slate-600">Cluster &amp; Tags</TableHead>
              <TableHead className="text-xs font-bold text-slate-600">Status</TableHead>
              <TableHead className="text-xs font-bold text-slate-600 min-w-[140px]">
                Date &amp; Time
              </TableHead>
              <TableHead className="text-right text-xs font-bold text-slate-600 min-w-[130px]">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
                    <span className="text-xs">Loading content planner...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredKeywords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-slate-400">
                  <div className="max-w-md mx-auto space-y-3">
                    <Layers className="w-8 h-8 mx-auto text-slate-300" />
                    <div className="text-sm font-semibold text-slate-700">No Topics Found</div>
                    <p className="text-xs text-slate-400">
                      No blog topics match your current filter. Add a new topic idea or import your topics from a CSV!
                    </p>
                    <div className="pt-2 flex justify-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setStatusFilter("all");
                          setClusterFilter("all");
                          setSearchQuery("");
                        }}
                      >
                        Reset Filters
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleOpenAdd}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                      >
                        Add Topic Idea
                      </Button>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredKeywords.map((kw, index) => {
                const isExpanded = !!expandedRows[kw.id];
                const isRunningThis = runningId === kw.id;

                return (
                  <React.Fragment key={kw.id}>
                    <TableRow className="hover:bg-slate-50/70 transition-colors">
                      {/* Numbering (1-series) */}
                      <TableCell className="text-center font-mono text-xs font-semibold text-slate-500">
                        {index + 1}
                      </TableCell>

                      {/* Topic & Focus Keyword */}
                      <TableCell>
                        <div className="flex items-start space-x-2">
                          <button
                            onClick={() => toggleRowExpand(kw.id)}
                            className="p-0.5 mt-0.5 text-slate-400 hover:text-indigo-600 transition"
                            title={isExpanded ? "Collapse details" : "Expand details"}
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-indigo-600" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                          <div className="space-y-0.5">
                            <div
                              onClick={() => toggleRowExpand(kw.id)}
                              className="font-bold text-slate-900 text-sm hover:text-indigo-600 cursor-pointer"
                            >
                              {kw.keyword}
                            </div>
                            {kw.notes && (
                              <div className="text-xs text-slate-500 line-clamp-1 italic max-w-md">
                                📝 {kw.notes}
                              </div>
                            )}
                            {kw.status === "failed" && kw.last_error && (
                              <div className="mt-1 flex items-start gap-1.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-2 py-1 max-w-md">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                                <span className="line-clamp-2 font-medium">{kw.last_error}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* WordPress Category */}
                      <TableCell>
                        {kw.canonical_category ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {kw.canonical_category}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Uncategorized</span>
                        )}
                      </TableCell>

                      {/* Cluster & Tags */}
                      <TableCell>
                        <div className="space-y-1">
                          {kw.cluster && (
                            <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                              {kw.cluster}
                            </span>
                          )}
                          {kw.suggested_tags && (
                            <div className="text-[11px] text-slate-400 truncate max-w-[160px]" title={kw.suggested_tags}>
                              #{kw.suggested_tags.split(",")[0]?.trim()}
                              {kw.suggested_tags.split(",").length > 1 && ` +${kw.suggested_tags.split(",").length - 1}`}
                            </div>
                          )}
                          {!kw.cluster && !kw.suggested_tags && (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        {kw.status === "published" ? (
                          <Badge variant="success" className="font-semibold text-xs">
                            Published
                          </Badge>
                        ) : kw.status === "drafted" ? (
                          <Badge variant="info" className="font-semibold text-xs">
                            WP Draft
                          </Badge>
                        ) : kw.status === "in_progress" ? (
                          <Badge variant="warning" className="font-semibold text-xs flex items-center space-x-1">
                            <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                            <span>Generating</span>
                          </Badge>
                        ) : kw.status === "failed" ? (
                          <Badge
                            variant="destructive"
                            className="font-semibold text-xs cursor-help"
                            title={kw.last_error || "Pipeline execution failed"}
                          >
                            Failed
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="font-semibold text-xs text-slate-600">
                            In Queue
                          </Badge>
                        )}
                      </TableCell>

                      {/* Date & Time */}
                      <TableCell className="whitespace-nowrap">
                        {renderDateTime(kw)}
                      </TableCell>

                      {/* Action buttons */}
                      <TableCell className="text-right space-x-1">
                        {kw.published_url && (
                          <a
                            href={kw.published_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                            title="Open published article on WordPress"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        <button
                          onClick={() => handleRunSingleKeyword(kw.id, kw.keyword)}
                          disabled={isRunningThis}
                          className="inline-flex p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition disabled:opacity-50"
                          title="Generate & Publish this article now"
                        >
                          {isRunningThis ? (
                            <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleOpenEdit(kw)}
                          className="inline-flex p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                          title="Edit topic details"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteKeyword(kw.id, kw.keyword)}
                          className="inline-flex p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Delete topic"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </TableCell>
                    </TableRow>

                    {/* Expandable Topic Details Drawer */}
                    {isExpanded && (
                      <TableRow className="bg-slate-50/95 border-b border-indigo-100/60">
                        <TableCell colSpan={7} className="p-4 sm:p-5">
                          <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                              <div className="flex items-center space-x-2">
                                <Sparkles className="w-4 h-4 text-indigo-600" />
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                  Blog Topic Specifications
                                </span>
                              </div>
                              <span className="text-xs text-slate-400 font-mono">
                                ID: {kw.id}
                              </span>
                            </div>

                            {/* Writer Instructions / Notes */}
                            <div>
                              <div className="text-xs font-bold text-slate-800 mb-1">
                                Writing Instructions &amp; Outline Notes:
                              </div>
                              <div className="bg-slate-50 border border-slate-200/70 rounded-lg p-3 text-xs text-slate-700 leading-relaxed">
                                {kw.notes || (
                                  <span className="text-slate-400 italic">
                                    No custom outline instructions provided. The autonomous research engine will structure the article automatically.
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Category & Tags Row */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                  WordPress Category
                                </span>
                                <span className="font-semibold text-slate-800 mt-0.5 block truncate">
                                  {kw.canonical_category || "Uncategorized"}
                                </span>
                              </div>

                              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                  Topic Cluster
                                </span>
                                <span className="font-semibold text-slate-800 mt-0.5 block truncate">
                                  {kw.cluster || "None"}
                                </span>
                              </div>

                              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                  WordPress Post Status
                                </span>
                                <span className="font-semibold text-slate-800 mt-0.5 block capitalize">
                                  {kw.status}
                                </span>
                              </div>
                            </div>

                            {/* Suggested Tags */}
                            {kw.suggested_tags && (
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                                  Assigned WordPress Tags
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {kw.suggested_tags.split(",").map((t, idx) => (
                                    <span
                                      key={idx}
                                      className="inline-flex items-center space-x-1 text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-mono"
                                    >
                                      <Tag className="w-3 h-3 text-slate-400" />
                                      <span>{t.trim()}</span>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Error diagnostic banner if failed */}
                            {kw.last_error && (
                              <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-700">
                                <strong className="font-semibold">Last Execution Failure: </strong>
                                {kw.last_error}
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── MODAL: ADD / EDIT BLOG TOPIC (CLEAN & SIMPLE) ─────────── */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen} maxWidthClass="max-w-xl">
        <DialogContent onClose={() => setIsFormOpen(false)}>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Blog Topic" : "Add New Blog Topic"}</DialogTitle>
            <DialogDescription>
              Enter the target keyword or title you want to write and publish. Category and outline notes are optional.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleFormSubmit} className="space-y-4 mt-4 text-xs">
            {/* 1. Focus Keyword (Primary & Required) */}
            <div className="bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-100">
              <label className="block font-bold text-slate-900 mb-1 text-sm">
                Blog Focus Keyword or Title <span className="text-rose-500 font-extrabold">*</span>
              </label>
              <Input
                type="text"
                required
                autoFocus
                value={formData.keyword}
                onChange={(e) => setFormData({ ...formData, keyword: e.target.value })}
                placeholder="e.g. Best credit cards for airport lounge access in India"
                className="text-sm bg-white font-medium"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                The core subject your 4,000+ word article will be researched, written, and optimized for.
              </p>
            </div>

            {/* 2. WordPress Category & Cluster */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  WordPress Category <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <Input
                  type="text"
                  value={formData.canonical_category}
                  onChange={(e) => setFormData({ ...formData, canonical_category: e.target.value })}
                  placeholder="e.g. Finance, Technology, Health"
                  className="text-xs"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Publishes under this category (auto-created if missing).
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Topic Cluster <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <Input
                  type="text"
                  value={formData.cluster}
                  onChange={(e) => setFormData({ ...formData, cluster: e.target.value })}
                  placeholder="e.g. Credit Cards, Real Estate"
                  className="text-xs"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Organizes related topics together in reports.
                </p>
              </div>
            </div>

            {/* 3. Tags */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                WordPress Tags <span className="text-slate-400 font-normal">(Optional, comma-separated)</span>
              </label>
              <Input
                type="text"
                value={formData.suggested_tags}
                onChange={(e) => setFormData({ ...formData, suggested_tags: e.target.value })}
                placeholder="e.g. credit cards, travel, lounges"
                className="text-xs"
              />
            </div>

            {/* 4. Writing Instructions / Notes */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700 flex items-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Custom Writing Instructions / Outline <span className="text-slate-400 font-normal">(Optional)</span></span>
                </label>
                <span className="text-[10px] text-slate-400">Leave empty for auto-research</span>
              </div>
              <Textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Mention specific comparison factors, subheadings to cover, or exclusions. Leave empty for automated AI research."
                className="text-xs"
              />
            </div>

            {/* 5. Optional Advanced Options Accordion (Cleanly Collapsed) */}
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center justify-between w-full py-2 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 transition text-xs font-semibold"
              >
                <span>{showAdvanced ? "Hide Advanced Options" : "Show Advanced Options (Optional)"}</span>
                {showAdvanced ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>

              {showAdvanced && (
                <div className="mt-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200/80 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-medium text-slate-600 mb-1">Content Type</label>
                    <select
                      value={formData.content_type}
                      onChange={(e) => setFormData({ ...formData, content_type: e.target.value })}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-md bg-white text-xs"
                    >
                      <option value="BlogPost">BlogPost (Standard Article)</option>
                      <option value="Glossary">Glossary (Definition / Explainer)</option>
                      <option value="CategoryPage">CategoryPage (Hub Page)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-600 mb-1">Subtype</label>
                    <select
                      value={formData.blogpost_subtype}
                      onChange={(e) => setFormData({ ...formData, blogpost_subtype: e.target.value })}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-md bg-white text-xs"
                    >
                      <option value="Guide">Guide (Comprehensive Guide)</option>
                      <option value="HowTo">HowTo (Step-by-Step Tutorial)</option>
                      <option value="Comparison">Comparison (Versus / Alternative)</option>
                      <option value="BuyingGuide">BuyingGuide (Buyer's Decision Guide)</option>
                      <option value="Explainer">Explainer (Concept / Topic Explainer)</option>
                      <option value="Review">Review (Product / Service Review)</option>
                      <option value="Roundup">Roundup (Best-of List / Roundup)</option>
                      <option value="Listicle">Listicle (Top Tips / Numbered List)</option>
                      <option value="CaseStudy">CaseStudy (Real-World Case Study)</option>
                      <option value="News">News (Breaking News & Analysis)</option>
                      <option value="Checklist">Checklist (Actionable Checklist)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                <span className="text-rose-500 font-bold">*</span> Mandatory field
              </span>
              <div className="flex space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
                  {isEditing ? "Save Changes" : "Add to Publishing Queue"}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: BULK IMPORT CSV (SIMPLE & INTUITIVE) ───────────── */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen} maxWidthClass="max-w-2xl">
        <DialogContent onClose={() => setIsImportOpen(false)}>
          <DialogHeader>
            <DialogTitle>Bulk Import Topics (CSV)</DialogTitle>
            <DialogDescription>
              Upload a CSV file or paste topics directly. Only the keyword is required; category and notes are optional.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4 text-xs">
            {/* Template Download & Help Banner */}
            <div className="p-3.5 bg-indigo-50/70 rounded-xl border border-indigo-100 flex items-center justify-between gap-3">
              <div>
                <div className="font-bold text-indigo-900">Need a simple template?</div>
                <div className="text-[11px] text-indigo-700 mt-0.5">
                  Columns: <code className="font-mono font-bold">keyword, category, tags, notes</code> (or simply paste 1 keyword per line).
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                className="bg-white hover:bg-indigo-50 border-indigo-200 text-indigo-700 shrink-0 font-semibold"
              >
                <FileDown className="w-3.5 h-3.5 mr-1" />
                <span>Download Sample CSV</span>
              </Button>
            </div>

            {/* File Upload Trigger */}
            <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl p-4 text-center cursor-pointer transition bg-slate-50/50">
              <label htmlFor="csv-upload-input" className="cursor-pointer block space-y-1">
                <FileUp className="w-6 h-6 mx-auto text-indigo-600" />
                <div className="font-semibold text-slate-800">Click to choose a CSV file</div>
                <div className="text-[11px] text-slate-400">Supports .csv or .txt files</div>
              </label>
              <input
                id="csv-upload-input"
                type="file"
                accept=".csv,.txt"
                onChange={handleCsvFileUpload}
                className="hidden"
              />
            </div>

            {/* Textarea for Direct Paste */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Or paste CSV text / list of topics below:
              </label>
              <Textarea
                rows={6}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder={`keyword, category, tags, notes\n"Best travel credit cards for airport lounge access", "Finance", "credit cards, travel", "Compare annual fees"\n"Top electric cars in India 2026", "Automotive", "ev, cars", "Range and battery warranty"`}
                className="font-mono text-xs"
              />
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Supports both simple CSVs and legacy 19-column files.
              </span>
              <div className="flex space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsImportOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleImportSubmit}
                  disabled={importing || !csvText.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center space-x-1.5"
                >
                  {importing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{importing ? "Importing Topics..." : "Import Topics"}</span>
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
