"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PublicNavbar } from "@/components/public/PublicNavbar";
import { PublicFooter } from "@/components/public/PublicFooter";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  Zap,
  Shield,
  Layers,
  Search,
  PenTool,
  Image as ImageIcon,
  Clock,
  Sliders,
  ChevronDown,
  ChevronUp,
  Star,
  Check,
  X,
  Play,
  RotateCcw,
  Award,
  CheckCheck,
  Globe,
  Flame,
  FileText,
  MousePointerClick,
  Wand2,
  Cpu,
  Bot,
  AlertTriangle,
  ArrowRightLeft,
  Gauge,
  Workflow,
} from "lucide-react";

export function LandingPage() {
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [selectedWorkflowStep, setSelectedWorkflowStep] = useState(0);

  // ── UNIQUE HERO ELEMENT 1: "GENERIC CHATGPT vs WP AUTOPILOT" COMPARISON TOGGLE ──
  const [comparisonMode, setComparisonMode] = useState<"autopilot" | "chatgpt">("autopilot");

  // ── UNIQUE HERO ELEMENT 2: LIVE SIMULATOR KEYWORDS ──
  const samplePresets = [
    {
      keyword: "Best CRM Software for Startups in 2026",
      cluster: "B2B SaaS",
      words: 2450,
      score: 91,
      readTime: "9 min",
      facts: "G2 quadrant scores & pricing tiers verified",
      headings: 8,
    },
    {
      keyword: "How to Optimize WordPress SEO with RankMath to 85+",
      cluster: "SEO Marketing",
      words: 2180,
      score: 93,
      readTime: "8 min",
      facts: "RankMath schema API & JSON-LD specifications",
      headings: 7,
    },
    {
      keyword: "Top Electric Vehicles with 400+ Mile Range",
      cluster: "Automotive Tech",
      words: 2620,
      score: 88,
      readTime: "10 min",
      facts: "EPA battery efficiency & fast-charging specs",
      headings: 9,
    },
  ];

  const [activePresetIdx, setActivePresetIdx] = useState(0);
  const [customKeyword, setCustomKeyword] = useState("");
  const [isSimulating, setIsSimulating] = useState(false);
  const [pipelineProgress, setPipelineProgress] = useState(100);

  const activeDemo = {
    ...samplePresets[activePresetIdx],
    keyword: customKeyword.trim() ? customKeyword.trim() : samplePresets[activePresetIdx].keyword,
  };

  const handleSimulate = () => {
    setIsSimulating(true);
    setPipelineProgress(15);

    const t1 = setTimeout(() => setPipelineProgress(40), 400);
    const t2 = setTimeout(() => setPipelineProgress(70), 900);
    const t3 = setTimeout(() => setPipelineProgress(90), 1500);
    const t4 = setTimeout(() => {
      setPipelineProgress(100);
      setIsSimulating(false);
    }, 2000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  };

  // ── ROI CALCULATOR STATE ──
  const [monthlyArticles, setMonthlyArticles] = useState(60);
  const freelanceCost = monthlyArticles * 50;
  const platformCost = monthlyArticles <= 30 ? 10 : monthlyArticles <= 100 ? 25 : 70;
  const hoursSaved = Math.round(monthlyArticles * 3.5);
  const netSavings = freelanceCost - platformCost;

  // ── 5 AUTONOMOUS AGENTS (MULTI-AGENT ARCHITECTURE) ──
  const agentTeam = [
    {
      role: "SEO Strategist",
      icon: Search,
      action: "Analyzes search intent (TOFU/MOFU) & guards against cannibalization",
      color: "text-blue-600 bg-blue-50 border-blue-200",
    },
    {
      role: "Fact Researcher",
      icon: Layers,
      action: "Gathers verified benchmarks & citations with zero hallucinations",
      color: "text-purple-600 bg-purple-50 border-purple-200",
    },
    {
      role: "Senior AI Author",
      icon: PenTool,
      action: "Drafts 2,400+ words with dense H2/H3s & anti-fluff editor filter",
      color: "text-indigo-600 bg-indigo-50 border-indigo-200",
    },
    {
      role: "AI Art Director",
      icon: ImageIcon,
      action: "Renders bespoke studio-grade 16:9 landscape featured image",
      color: "text-pink-600 bg-pink-50 border-pink-200",
    },
    {
      role: "WordPress Publisher",
      icon: Zap,
      action: "Executes REST API upload & writes RankMath 85+ score into metadata",
      color: "text-emerald-600 bg-emerald-50 border-emerald-200",
    },
  ];

  // ── WORKFLOW PIPELINE ──
  const workflowSteps = [
    {
      step: "01",
      title: "Keyword & Cannibalization Shield",
      icon: Search,
      badge: "Stage 1",
      desc: "Upload CSV batches or add individual keywords. The engine analyzes search intent, verifies category clusters, and prevents keyword cannibalization across existing published posts.",
      preview: {
        keyword: activeDemo.keyword,
        cluster: activeDemo.cluster,
        intent: "Commercial / Buying Guide",
        cannibalizationRisk: "0.0% (Clean & Unique)",
      },
    },
    {
      step: "02",
      title: "Neural Fact Grounding & Citations",
      icon: Layers,
      badge: "Stage 2",
      desc: "Deep research agent scrapes live authoritative sources, extracts real-world statistics, dates, and definitions to guarantee fact-checked content with zero AI hallucinations.",
      preview: {
        factsGathered: activeDemo.facts,
        sources: "Government records & verified industry publications",
        confidence: "99.8% Grounded Truth",
      },
    },
    {
      step: "03",
      title: "Long-Form 2,000+ Word Authoring",
      icon: PenTool,
      badge: "Stage 3 & 3.5",
      desc: "Drafts comprehensive articles with dense H2/H3 subheadings, jump Table of Contents (TOC), and FAQ blocks. A dedicated senior editor filter strips repetitive AI fluff words.",
      preview: {
        wordCount: `${activeDemo.words} words`,
        headingsCount: `${activeDemo.headings} H2/H3 sections`,
        editorAudit: "Stripped buzzwords: 'delve', 'tapestry', 'pivotal'",
      },
    },
    {
      step: "04",
      title: "AI Studio Featured Hero Image",
      icon: ImageIcon,
      badge: "Stage 4",
      desc: "Produces bespoke, studio-grade 16:9 landscape featured images without distorted text or watermarks. Auto-uploads to the WordPress Media Library and links as the featured media.",
      preview: {
        prompt: "Ultra-sharp modern visual with studio lighting & vibrant depth of field",
        dimensions: "1200 x 675 (Landscape)",
        textFree: "100% verified no text / no watermarks",
      },
    },
    {
      step: "05",
      title: "WordPress REST API & RankMath 85+",
      icon: Zap,
      badge: "Stage 5 & 6",
      desc: "Publishes directly to your WordPress site with semantic HTML. Automatically sets RankMath focus keyword, crafts optimal meta description, and writes verified 85+ score to post meta.",
      preview: {
        rankMathScore: `${activeDemo.score} / 100 (Green SEO)`,
        schemaType: "Article + FAQPage JSON-LD",
        metaLength: "142 / 155 characters",
        status: "Published Live on WordPress",
      },
    },
  ];

  const faqs = [
    {
      q: "How does the WordPress integration work? Is a plugin required?",
      a: "No custom plugin is required! WP Content Autopilot connects directly to your WordPress website using the official WordPress REST API and Application Passwords. You simply create an Application Password in your WordPress User Profile, enter it into our dashboard, and you're connected in 30 seconds.",
    },
    {
      q: "How does it achieve RankMath 85+ SEO scores?",
      a: "Our engine performs native RankMath optimization on every single article: it automatically sets the focus keyword, crafts a compelling 120-155 character meta description containing the keyword, formats dense H2/H3 headings, creates a structured FAQ schema, and writes the RankMath score directly into WordPress post metadata.",
    },
    {
      q: "Can I customize the writing tone and article length?",
      a: "Yes! Our built-in Prompt Studio allows you to customize the writing tone (Professional, Conversational, Educational, or Bold), select target length (Standard, In-Depth, or Comprehensive Pillar), and inject custom brand rules (such as 'Use ₹ Indian Rupees' or 'Mention our brand name').",
    },
    {
      q: "Will the published articles sound like generic AI spam?",
      a: "No. Unlike basic ChatGPT copy-pasting, our engine uses a multi-stage pipeline: Stage 2 gathers factual citations, Stage 3 drafts structured content, Stage 3.5 runs a dedicated senior editor pass that strips repetitive AI buzzwords (like 'delve', 'tapestry', 'pivotal'), and Stage 6 verifies clean HTML formatting.",
    },
    {
      q: "Can I schedule articles to publish automatically on a drip feed?",
      a: "Yes! You can configure an automated daily quota and cron schedule in your Settings. The autopilot engine will automatically pick the next planned keyword from your queue and publish articles at your chosen schedule.",
    },
    {
      q: "What AI models power the content engine?",
      a: "We support both Google Gemini (Gemini 2.5 Pro / Flash) and OpenAI (GPT-4o, GPT-5 / reasoning models). You can use our platform-provided high-speed AI keys or connect your own API keys for zero-markup billing.",
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      <PublicNavbar />

      {/* ── TOP ANNOUNCEMENT TICKER ── */}
      <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border-b border-indigo-100 py-2.5 px-4 overflow-hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 overflow-hidden text-slate-600">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="font-bold text-indigo-700 uppercase tracking-wider text-[11px] shrink-0">
              Live Engine Activity:
            </span>
            <span className="truncate text-slate-700">
              Just published on authority tech site: <strong className="text-slate-900">&quot;10 Best Noise Canceling Headphones 2026&quot;</strong> · RankMath Score: <span className="text-emerald-600 font-bold">91/100</span> · 2,480 words in 42s
            </span>
          </div>
          <div className="hidden lg:flex items-center gap-4 text-slate-500 font-medium text-[11px] shrink-0">
            <span className="bg-white/90 px-2.5 py-0.5 rounded-full border border-indigo-200 text-indigo-700 font-bold">
              ⚡ Multi-Agent Pipeline
            </span>
            <span>🛡️ Anti-Fluff Verified</span>
          </div>
        </div>
      </div>

      {/* ── HERO SECTION ── */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-32 overflow-hidden bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(99,102,241,0.18),transparent_70%)]">
        {/* Decorative Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-70 pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          {/* Top Pill Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold shadow-xs">
            <Sparkles className="w-4 h-4 text-indigo-600 animate-spin" style={{ animationDuration: "5s" }} />
            <span>Autonomous Content Ops · RankMath 85+ Guaranteed · Drip Scheduling</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-slate-950 tracking-tight max-w-5xl mx-auto leading-[1.08]">
            Publish 100+ Rank-Ready SEO Articles Directly to WordPress on{" "}
            <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
              Full Autopilot
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-base sm:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed font-normal">
            Turn raw keywords into in-depth, fact-checked, beautifully formatted articles with
            AI-crafted featured images, automated RankMath meta tags, and smart drip scheduling.
          </p>

          {/* ── PROMINENT, TALL HERO CTA BUTTONS ── */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link href="/login" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto h-16 sm:h-17 px-10 sm:px-12 text-base sm:text-lg font-black rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-xl shadow-indigo-600/30 transition-all hover:scale-103 flex items-center justify-center gap-3"
              >
                <span>Start Free Trial (3 Posts Free)</span>
                <ArrowRight className="w-5 h-5 ml-1" />
              </Button>
            </Link>
            <a href="#interactive-hero" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto h-16 sm:h-17 px-8 sm:px-10 text-base font-bold rounded-2xl border-2 border-slate-300 hover:border-indigo-400 bg-white hover:bg-slate-50 text-slate-800 shadow-md transition-all hover:scale-102 flex items-center justify-center gap-2.5"
              >
                <Play className="w-5 h-5 text-indigo-600 fill-indigo-600" />
                <span>See the Live Comparison Below</span>
              </Button>
            </a>
          </div>

          {/* Trust Highlights */}
          <div className="pt-1 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs sm:text-sm text-slate-600 font-semibold">
            <span className="flex items-center gap-1.5 text-slate-700">
              <Check className="w-4 h-4 text-emerald-600 stroke-[3]" /> 3 Articles Free Trial
            </span>
            <span className="flex items-center gap-1.5 text-slate-700">
              <Check className="w-4 h-4 text-emerald-600 stroke-[3]" /> No Credit Card Required
            </span>
            <span className="flex items-center gap-1.5 text-slate-700">
              <Check className="w-4 h-4 text-emerald-600 stroke-[3]" /> Connects in 30 Seconds (No Plugin)
            </span>
            <span className="flex items-center gap-1.5 text-slate-700">
              <Check className="w-4 h-4 text-emerald-600 stroke-[3]" /> RankMath 85+ Guaranteed
            </span>
          </div>

          {/* ── UNIQUE HERO ELEMENT 1: 5 AUTONOMOUS AI AGENTS SHOWCASE ── */}
          <div className="pt-6 max-w-5xl mx-auto">
            <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 border-b border-slate-200/80 pb-3 mb-3">
                <span className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-indigo-600" />
                  <span>The 5 Specialized AI Agents Collaborating on Every Single Article:</span>
                </span>
                <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-full">
                  Autonomous Multi-Agent Crew
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 text-left">
                {agentTeam.map((agent, i) => {
                  const Icon = agent.icon;
                  return (
                    <div
                      key={agent.role}
                      className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-sm transition"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${agent.color}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[11px] font-bold text-slate-900 leading-tight">
                          {agent.role}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-normal line-clamp-2">
                        {agent.action}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── UNIQUE HERO ELEMENT 2: INTERACTIVE LIVE BEFORE/AFTER BATTLE ── */}
          <div id="interactive-hero" className="pt-6 text-left max-w-5xl mx-auto">
            <div className="bg-white border-2 border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-indigo-500/10 space-y-6">
              {/* Interactive Mode Switcher Bar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold text-[11px] border border-indigo-200">
                      LIVE COMPARISON INSPECTOR
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-slate-900">
                      Why Typical AI Tools Fail SEO vs. How Autopilot Wins
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Toggle between standard ChatGPT output and WP Content Autopilot to see the exact metadata difference:
                  </p>
                </div>

                {/* The Comparison Switch Toggle */}
                <div className="inline-flex p-1 rounded-2xl bg-slate-100 border border-slate-200 shrink-0">
                  <button
                    onClick={() => setComparisonMode("chatgpt")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      comparisonMode === "chatgpt"
                        ? "bg-rose-600 text-white shadow-md shadow-rose-600/20"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <X className="w-4 h-4" />
                    <span>Generic ChatGPT (48/100)</span>
                  </button>
                  <button
                    onClick={() => setComparisonMode("autopilot")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      comparisonMode === "autopilot"
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <CheckCheck className="w-4 h-4" />
                    <span>WP Autopilot (91/100)</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Comparison Card Body */}
              {comparisonMode === "autopilot" ? (
                /* ── AUTOPILOT MODE (GREEN / 91/100 SCORE) ── */
                <div className="space-y-6 animate-fadeIn">
                  {/* Keyword Input & Action Bar */}
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <div className="relative flex-1">
                      <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Enter any keyword to test e.g. Best Running Shoes 2026..."
                        value={customKeyword}
                        onChange={(e) => setCustomKeyword(e.target.value)}
                        className="w-full pl-11 pr-4 h-12 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                      />
                    </div>
                    <Button
                      onClick={handleSimulate}
                      disabled={isSimulating}
                      className="h-12 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md shadow-indigo-600/20 transition shrink-0"
                    >
                      {isSimulating ? (
                        <>
                          <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
                          Running 5 Stages ({pipelineProgress}%)...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 mr-2" />
                          Simulate Pipeline Run
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Sample Pills */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-slate-400 font-semibold text-[11px]">Popular Presets:</span>
                    {samplePresets.map((preset, idx) => (
                      <button
                        key={preset.keyword}
                        onClick={() => {
                          setCustomKeyword("");
                          setActivePresetIdx(idx);
                          handleSimulate();
                        }}
                        className={`px-3 py-1 rounded-lg border text-xs transition font-medium ${
                          activePresetIdx === idx && !customKeyword
                            ? "bg-indigo-50 border-indigo-400 text-indigo-700 font-bold"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {preset.keyword}
                      </button>
                    ))}
                  </div>

                  {/* Split Preview Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-1">
                    {/* Left: Article Mockup */}
                    <div className="lg:col-span-7 bg-slate-50/70 rounded-2xl border border-slate-200 overflow-hidden flex flex-col justify-between">
                      <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between text-xs text-slate-600">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          <span className="font-semibold text-slate-800">
                            WordPress Live Article Preview
                          </span>
                        </div>
                        <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-300">
                          Auto-Published via REST API
                        </span>
                      </div>

                      <div className="p-5 sm:p-6 space-y-4 text-left">
                        <div className="inline-flex items-center gap-2 text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-md">
                          <span>{activeDemo.cluster}</span>
                          <span>•</span>
                          <span>{activeDemo.readTime} read</span>
                          <span>•</span>
                          <span>{activeDemo.words} words</span>
                        </div>

                        <h4 className="text-xl font-black text-slate-950 leading-snug">
                          {activeDemo.keyword}: The Complete 2026 Strategy Guide
                        </h4>

                        {/* AI Hero Image */}
                        <div className="relative rounded-xl overflow-hidden border border-slate-200 h-40 bg-gradient-to-tr from-indigo-100 via-purple-50 to-pink-50 flex items-center justify-center p-4">
                          <div className="text-center space-y-1.5">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-indigo-700 text-xs font-bold shadow-sm border border-indigo-100">
                              <ImageIcon className="w-4 h-4 text-indigo-600" />
                              <span>AI Studio Featured Image (1200x675)</span>
                            </div>
                            <p className="text-[11px] text-slate-500">
                              100% text-free studio lighting · Auto-attached to post media
                            </p>
                          </div>
                        </div>

                        {/* Table of Contents */}
                        <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            Table of Contents (Jump Anchors)
                          </div>
                          <div className="text-slate-600 space-y-1 text-[11px]">
                            <div className="hover:text-indigo-600 cursor-pointer">1. Executive Summary &amp; Key Industry Benchmarks</div>
                            <div className="hover:text-indigo-600 cursor-pointer">2. Evaluation Criteria &amp; Comparative Analysis</div>
                            <div className="hover:text-indigo-600 cursor-pointer">3. Frequently Asked Questions (FAQ Schema Attached)</div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white border-t border-slate-200 px-5 py-3 flex items-center justify-between text-xs text-slate-500">
                        <span>Generated in 42 seconds</span>
                        <span className="text-emerald-700 font-bold">{activeDemo.words} words · Grade 8 Readability</span>
                      </div>
                    </div>

                    {/* Right: RankMath 91 Scorecard */}
                    <div className="lg:col-span-5 bg-white rounded-2xl border-2 border-emerald-100 p-5 sm:p-6 space-y-4 text-left shadow-sm flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <div>
                            <div className="text-xs text-slate-500 font-semibold">RankMath SEO Analysis</div>
                            <div className="text-sm font-bold text-slate-900">Scorecard (Autopilot)</div>
                          </div>
                          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-300 px-3.5 py-1.5 rounded-xl">
                            <Award className="w-6 h-6 text-emerald-600" />
                            <div>
                              <div className="text-2xl font-black text-emerald-700 leading-none">
                                {activeDemo.score}
                                <span className="text-xs font-normal text-emerald-600">/100</span>
                              </div>
                              <div className="text-[9px] uppercase font-extrabold text-emerald-700">100% Green Score</div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2 text-xs">
                          <div className="flex items-start gap-2.5 p-2 rounded-lg bg-emerald-50/50 border border-emerald-100">
                            <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <div>
                              <div className="font-bold text-slate-900">Focus Keyword in SEO Title</div>
                              <div className="text-[11px] text-slate-500">Positioned in the first 50% of title tag</div>
                            </div>
                          </div>

                          <div className="flex items-start gap-2.5 p-2 rounded-lg bg-emerald-50/50 border border-emerald-100">
                            <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <div>
                              <div className="font-bold text-slate-900">Focus Keyword in Meta Description</div>
                              <div className="text-[11px] text-slate-500">142 / 155 characters (Optimal length)</div>
                            </div>
                          </div>

                          <div className="flex items-start gap-2.5 p-2 rounded-lg bg-emerald-50/50 border border-emerald-100">
                            <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <div>
                              <div className="font-bold text-slate-900">Keyword in First 100 Words</div>
                              <div className="text-[11px] text-slate-500">Natural insertion into introduction paragraph</div>
                            </div>
                          </div>

                          <div className="flex items-start gap-2.5 p-2 rounded-lg bg-emerald-50/50 border border-emerald-100">
                            <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <div>
                              <div className="font-bold text-slate-900">Headings &amp; Kebab-Case Anchor IDs</div>
                              <div className="text-[11px] text-slate-500">All H2/H3 subheadings indexed with jump anchors</div>
                            </div>
                          </div>

                          <div className="flex items-start gap-2.5 p-2 rounded-lg bg-emerald-50/50 border border-emerald-100">
                            <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <div>
                              <div className="font-bold text-slate-900">Schema JSON-LD &amp; FAQ Accordion</div>
                              <div className="text-[11px] text-slate-500">Google Rich Snippet FAQ schema enabled</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <Link href="/login" className="block pt-1">
                        <Button className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-600/20">
                          <span>Publish Real Posts on Your WordPress Site</span>
                          <ArrowRight className="w-4 h-4 ml-1.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ) : (
                /* ── GENERIC CHATGPT MODE (FAILING / 48/100 SCORE) ── */
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
                  {/* Left: What ChatGPT generates */}
                  <div className="lg:col-span-7 bg-rose-50/40 rounded-2xl border-2 border-dashed border-rose-200 p-6 space-y-4 text-left">
                    <div className="flex items-center justify-between border-b border-rose-200 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                        <span className="text-xs font-bold text-rose-900">
                          Typical ChatGPT / LLM Copy-Paste
                        </span>
                      </div>
                      <span className="text-[10px] font-bold uppercase bg-rose-100 text-rose-700 px-2 py-0.5 rounded-md border border-rose-300">
                        Manual Copy-Paste Needed
                      </span>
                    </div>

                    <h4 className="text-lg font-bold text-slate-800 leading-snug">
                      Unveiling the Tapestry of CRM Solutions for Modern Enterprises in Today&apos;s Fast-Paced World
                    </h4>

                    <div className="bg-white p-4 rounded-xl border border-rose-200 text-xs text-slate-600 space-y-2 font-mono">
                      <p className="italic text-rose-700 font-sans">
                        &quot;In today&apos;s fast-paced digital landscape, delving into customer relationship management is pivotal for unlocking synergies...&quot;
                      </p>
                      <div className="p-2 rounded bg-rose-50 text-[11px] text-rose-800 flex items-center gap-1.5 font-sans font-bold">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>Warning: Generic AI buzzwords detected (&apos;tapestry&apos;, &apos;delve&apos;, &apos;pivotal&apos;)</span>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2 text-rose-700">
                        <X className="w-4 h-4 text-rose-600" />
                        <span>No Featured Image generated (You must buy stock photos manually)</span>
                      </div>
                      <div className="flex items-center gap-2 text-rose-700">
                        <X className="w-4 h-4 text-rose-600" />
                        <span>Zero WordPress integration (Takes 20 minutes to format &amp; upload manually)</span>
                      </div>
                      <div className="flex items-center gap-2 text-rose-700">
                        <X className="w-4 h-4 text-rose-600" />
                        <span>No JSON-LD Schema markup or Table of Contents anchors</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Failing RankMath 48 Score */}
                  <div className="lg:col-span-5 bg-white rounded-2xl border-2 border-rose-200 p-6 space-y-5 text-left flex flex-col justify-between shadow-sm">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div>
                          <div className="text-xs text-slate-500 font-semibold">RankMath SEO Analysis</div>
                          <div className="text-sm font-bold text-slate-900">Scorecard (ChatGPT)</div>
                        </div>
                        <div className="flex items-center gap-2 bg-rose-50 border border-rose-300 px-3.5 py-1.5 rounded-xl">
                          <AlertTriangle className="w-6 h-6 text-rose-600" />
                          <div>
                            <div className="text-2xl font-black text-rose-600 leading-none">
                              48<span className="text-xs font-normal text-rose-500">/100</span>
                            </div>
                            <div className="text-[9px] uppercase font-extrabold text-rose-600">Failing Red Score</div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex items-start gap-2.5 p-2 rounded-lg bg-rose-50 border border-rose-100">
                          <X className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <div className="font-bold text-rose-900">Focus Keyword Not in Title</div>
                            <div className="text-[11px] text-rose-700">ChatGPT generated vague, flowery title</div>
                          </div>
                        </div>

                        <div className="flex items-start gap-2.5 p-2 rounded-lg bg-rose-50 border border-rose-100">
                          <X className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <div className="font-bold text-rose-900">No Meta Description Provided</div>
                            <div className="text-[11px] text-rose-700">Google will randomly scrape first paragraph</div>
                          </div>
                        </div>

                        <div className="flex items-start gap-2.5 p-2 rounded-lg bg-rose-50 border border-rose-100">
                          <X className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <div className="font-bold text-rose-900">Missing Anchor IDs &amp; TOC</div>
                            <div className="text-[11px] text-rose-700">Headings lack kebab-case anchor targets</div>
                          </div>
                        </div>

                        <div className="flex items-start gap-2.5 p-2 rounded-lg bg-rose-50 border border-rose-100">
                          <X className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <div className="font-bold text-rose-900">Zero Structured Schema</div>
                            <div className="text-[11px] text-rose-700">No Article or FAQPage Rich Snippet markup</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setComparisonMode("autopilot")}
                      className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2"
                    >
                      <span>Switch to WP Autopilot (See 91/100 Solution)</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Trust Metrics Bar */}
          <div className="pt-10 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-4xl mx-auto border-t border-slate-200">
            <div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900">50,000+</div>
              <div className="text-xs text-slate-500 font-semibold mt-0.5">Articles Published</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-indigo-600">85+</div>
              <div className="text-xs text-slate-500 font-semibold mt-0.5">Average RankMath Score</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-600">99.4%</div>
              <div className="text-xs text-slate-500 font-semibold mt-0.5">SEO Pass Rate</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-purple-600">10x</div>
              <div className="text-xs text-slate-500 font-semibold mt-0.5">Organic Traffic Velocity</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── INTERACTIVE ROI CALCULATOR (LIGHT THEME) ── */}
      <section className="py-20 md:py-28 bg-slate-50 border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              Interactive ROI Calculator
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight">
              See How Much Time &amp; Money Autopilot Saves You
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Freelance writers charge $40 to $100 per 2,000-word article. Compare that against automated AI publishing:
            </p>
          </div>

          <div className="bg-white p-6 sm:p-10 rounded-3xl border border-slate-200 shadow-xl space-y-8">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <label className="text-sm font-bold text-slate-900">
                  How many articles do you want to publish per month?
                </label>
                <div className="text-2xl font-black text-indigo-700 bg-indigo-50 px-4 py-1.5 rounded-xl border border-indigo-200">
                  {monthlyArticles} articles / month
                </div>
              </div>

              <input
                type="range"
                min="10"
                max="300"
                step="5"
                value={monthlyArticles}
                onChange={(e) => setMonthlyArticles(parseInt(e.target.value, 10))}
                className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-xs text-slate-500 font-semibold">
                <span>10 articles/mo (Casual Blog)</span>
                <span>100 articles/mo (Pro Publisher)</span>
                <span>300 articles/mo (Authority Network)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t border-slate-100">
              <div className="bg-rose-50/60 p-5 rounded-2xl border border-rose-200/80 space-y-1.5">
                <div className="text-xs font-bold text-rose-800">Traditional Freelance Writers</div>
                <div className="text-2xl sm:text-3xl font-black text-rose-600">
                  ${freelanceCost.toLocaleString()}
                  <span className="text-xs font-normal text-slate-500">/mo</span>
                </div>
                <div className="text-xs text-slate-600">Based on standard $50/article rate</div>
              </div>

              <div className="bg-indigo-50/60 p-5 rounded-2xl border border-indigo-200 space-y-1.5">
                <div className="text-xs font-bold text-indigo-800">WP Content Autopilot Cost</div>
                <div className="text-2xl sm:text-3xl font-black text-indigo-700">
                  ${platformCost}
                  <span className="text-xs font-normal text-slate-500">/mo</span>
                </div>
                <div className="text-xs text-indigo-600 font-semibold">Includes RankMath 85+ &amp; AI images</div>
              </div>

              <div className="bg-emerald-50/60 p-5 rounded-2xl border border-emerald-200 space-y-1.5">
                <div className="text-xs font-bold text-emerald-800">Your Net Monthly Savings</div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-600">
                  ${netSavings.toLocaleString()}
                  <span className="text-xs font-normal text-slate-500">/mo</span>
                </div>
                <div className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Saves ~{hoursSaved} hours of writing time
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── WORKFLOW SECTION ── */}
      <section id="workflow" className="py-20 md:py-28 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              The 5-Stage Content Ops Pipeline
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight">
              From Raw Keyword to Published Masterpiece in 60 Seconds
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Most AI tools generate shallow markdown text. Our autonomous pipeline coordinates 5 specialized AI agents to write, polish, design, and upload complete articles to WordPress.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5 space-y-3">
              {workflowSteps.map((step, idx) => {
                const Icon = step.icon;
                const isSelected = selectedWorkflowStep === idx;
                return (
                  <div
                    key={step.step}
                    onClick={() => setSelectedWorkflowStep(idx)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-indigo-50/80 border-indigo-500 shadow-md ring-2 ring-indigo-500/20"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isSelected ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100/70 border border-indigo-200 px-2 py-0.5 rounded">
                            {step.badge}
                          </span>
                          <h4 className="text-sm font-bold text-slate-900">{step.title}</h4>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="lg:col-span-7 bg-slate-900 rounded-3xl p-6 sm:p-8 text-white border border-slate-800 shadow-xl space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-full bg-red-500/80" />
                  <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="text-xs font-mono text-slate-400 ml-2">
                    pipeline_trace // stage_{selectedWorkflowStep + 1}_telemetry
                  </span>
                </div>
                <span className="text-xs text-indigo-400 font-semibold uppercase tracking-wider">
                  Live Engine Inspection
                </span>
              </div>

              <div className="space-y-4 font-mono text-xs">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-2">
                  <div className="text-slate-400 flex justify-between">
                    <span>// STAGE SPECIFICATION</span>
                    <span className="text-emerald-400">STATUS: VERIFIED OK</span>
                  </div>
                  <div className="text-indigo-300 font-bold text-sm">
                    {workflowSteps[selectedWorkflowStep].title}
                  </div>
                  <p className="text-slate-300 font-sans text-xs leading-relaxed pt-1">
                    {workflowSteps[selectedWorkflowStep].desc}
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-3">
                  <div className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                    Execution Output Snapshot:
                  </div>
                  <pre className="text-slate-200 text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed font-mono">
                    {JSON.stringify(workflowSteps[selectedWorkflowStep].preview, null, 2)}
                  </pre>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" /> Zero duplicate titles · RankMath score 85+ guaranteed
                </span>
                <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1">
                  <span>Try It Live</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CORE FEATURES GRID ── */}
      <section id="features" className="py-20 md:py-28 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              Built for Scale &amp; Performance
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight">
              Enterprise SEO Capabilities Out of the Box
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Everything you need to automate your WordPress editorial calendar without sacrificing quality, search rankings, or brand voice.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition space-y-3">
              <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">RankMath 85+ SEO Guarantee</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Automatically attaches primary focus keywords, writes meta descriptions under 155 characters, injects heading kebab-case IDs, and registers the verified 85+ score in WordPress post meta.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition space-y-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Multi-Stage Anti-Fluff Engine</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Dedicated editing stage removes repetitive phrasing and generic filler words. Ensures focus keyword appears naturally in the opening 100 words with dense H2/H3 subheadings and structured FAQs.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition space-y-3">
              <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <ImageIcon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">AI Studio Featured Images</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Generates high-resolution featured hero images without broken letters or text artifacts. Automatically uploads to your WordPress media library and binds it as the post featured media.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition space-y-3">
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Autonomous Drip Scheduler</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Set your daily quota and publishing times. The built-in cron engine automatically picks queued keywords and publishes articles seamlessly around the clock without manual intervention.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition space-y-3">
              <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                <Sliders className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Dynamic Prompt Studio</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Choose between Professional, Conversational, Educational, or Bold tone presets. Inject custom brand voice guidelines, specific currency requirements, or edit raw prompts anytime.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition space-y-3">
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Agency &amp; Multi-Tenant Ready</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Built with full tenant isolation. Supports individual team quotas, custom WordPress credentials per user, PayU and USDT crypto billing, and role-based access control.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── COMPARISON TABLE ── */}
      <section className="py-20 md:py-28 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              Why Creators Choose Autopilot
            </span>
            <h2 className="text-3xl font-black text-slate-950">
              WP Autopilot vs. Traditional Alternatives
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <thead>
                <tr className="bg-slate-50 text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                  <th className="p-4">Feature / Capability</th>
                  <th className="p-4 bg-indigo-50/70 text-indigo-900 border-x border-indigo-200 font-extrabold">
                    WP Content Autopilot
                  </th>
                  <th className="p-4">Manual Freelance Writers</th>
                  <th className="p-4">Generic ChatGPT Copy-Paste</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                <tr>
                  <td className="p-4 font-semibold text-slate-800">Cost Per 2,000-Word Article</td>
                  <td className="p-4 bg-indigo-50/40 font-bold text-indigo-700 border-x border-indigo-100">
                    ~$0.30 – $0.90 / post
                  </td>
                  <td className="p-4 text-slate-500">$40 – $100 / post</td>
                  <td className="p-4 text-slate-500">Free, but hours of manual work</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-slate-800">WordPress Upload &amp; Publishing</td>
                  <td className="p-4 bg-indigo-50/40 font-bold text-emerald-600 border-x border-indigo-100 flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600 stroke-[3]" /> Fully Automated 1-Click
                  </td>
                  <td className="p-4 text-slate-500">Manual copy-paste by you</td>
                  <td className="p-4 text-slate-500">Manual copy-paste by you</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-slate-800">RankMath SEO 85+ Optimization</td>
                  <td className="p-4 bg-indigo-50/40 font-bold text-emerald-600 border-x border-indigo-100 flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600 stroke-[3]" /> Native (Focus keyword &amp; meta)
                  </td>
                  <td className="p-4 text-slate-500">Inconsistent / depends on writer</td>
                  <td className="p-4 text-red-500 flex items-center gap-1.5">
                    <X className="w-4 h-4 text-red-500 stroke-[3]" /> None (Manual configuration)
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-slate-800">AI Featured Image Generation</td>
                  <td className="p-4 bg-indigo-50/40 font-bold text-emerald-600 border-x border-indigo-100 flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600 stroke-[3]" /> Included &amp; Auto-Attached
                  </td>
                  <td className="p-4 text-slate-500">Extra charge for stock photos</td>
                  <td className="p-4 text-red-500 flex items-center gap-1.5">
                    <X className="w-4 h-4 text-red-500 stroke-[3]" /> None
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-slate-800">Fact-Checking &amp; Grounding</td>
                  <td className="p-4 bg-indigo-50/40 font-bold text-emerald-600 border-x border-indigo-100 flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600 stroke-[3]" /> Stage 2 Research Agent
                  </td>
                  <td className="p-4 text-slate-500">Variable accuracy</td>
                  <td className="p-4 text-amber-600">Frequent hallucinations</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── PRICING SECTION ── */}
      <section id="pricing" className="py-20 md:py-28 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              Simple, Transparent Pricing
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight">
              Start Free, Scale as Your Traffic Explodes
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Every plan includes full RankMath 85+ optimization, AI featured images, automated scheduling, and Prompt Studio access.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Free Trial</h3>
                  <p className="text-xs text-slate-500">Test the platform risk-free</p>
                </div>
                <div className="text-3xl font-black text-slate-900">$0</div>
                <ul className="space-y-2 text-xs text-slate-600 font-medium">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 stroke-[3]" /> 3 Articles Free Trial
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 stroke-[3]" /> RankMath 85+ Score
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 stroke-[3]" /> 1 WordPress Site
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 stroke-[3]" /> Prompt Studio Access
                  </li>
                </ul>
              </div>

              <Link href="/login">
                <Button variant="outline" className="w-full h-11 border-slate-300 hover:border-slate-400 text-slate-800 font-bold text-xs rounded-xl">
                  Get Started Free
                </Button>
              </Link>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Starter</h3>
                  <p className="text-xs text-slate-500">For bloggers &amp; niche sites</p>
                </div>
                <div className="text-3xl font-black text-slate-900">
                  ₹9 <span className="text-xs font-normal text-slate-500">/mo (or $10 USDT)</span>
                </div>
                <ul className="space-y-2 text-xs text-slate-600 font-medium">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 stroke-[3]" /> 30 Articles / month
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 stroke-[3]" /> Full RankMath Optimization
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 stroke-[3]" /> Automated AI Research
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 stroke-[3]" /> Featured Images Included
                  </li>
                </ul>
              </div>

              <Link href="/login">
                <Button className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl">
                  Choose Starter
                </Button>
              </Link>
            </div>

            <div className="bg-gradient-to-b from-indigo-50/80 via-white to-white p-6 rounded-2xl border-2 border-indigo-600 shadow-xl flex flex-col justify-between space-y-6 relative">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-indigo-600 text-[10px] font-black text-white uppercase tracking-wider shadow-md">
                Most Popular
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-black text-indigo-950">Pro Publisher</h3>
                  <p className="text-xs text-indigo-700">For scaling content sites</p>
                </div>
                <div className="text-3xl font-black text-slate-900">
                  ₹2,499 <span className="text-xs font-normal text-slate-500">/mo (or $25 USDT)</span>
                </div>
                <ul className="space-y-2 text-xs text-slate-700 font-semibold">
                  <li className="flex items-center gap-2 text-indigo-950">
                    <Check className="w-4 h-4 text-indigo-600 stroke-[3]" /> 100 Articles / month
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-indigo-600 stroke-[3]" /> Priority Drip Scheduling
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-indigo-600 stroke-[3]" /> Multi-Model (Gemini + OpenAI)
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-indigo-600 stroke-[3]" /> Custom Prompt Studio Overrides
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-indigo-600 stroke-[3]" /> Priority Support
                  </li>
                </ul>
              </div>

              <Link href="/login">
                <Button className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-md shadow-indigo-600/25">
                  Upgrade to Pro
                </Button>
              </Link>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Agency Scale</h3>
                  <p className="text-xs text-slate-500">For digital agencies &amp; networks</p>
                </div>
                <div className="text-3xl font-black text-slate-900">
                  ₹6,999 <span className="text-xs font-normal text-slate-500">/mo (or $70 USDT)</span>
                </div>
                <ul className="space-y-2 text-xs text-slate-600 font-medium">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 stroke-[3]" /> 300 Articles / month
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 stroke-[3]" /> Multiple WordPress Sites
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 stroke-[3]" /> High-Speed Batch Ingestion
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 stroke-[3]" /> Dedicated 1-on-1 Support
                  </li>
                </ul>
              </div>

              <Link href="/login">
                <Button variant="outline" className="w-full h-11 border-slate-300 hover:border-slate-400 text-slate-800 font-bold text-xs rounded-xl">
                  Choose Agency
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ SECTION ── */}
      <section id="faq" className="py-20 md:py-28 bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              Got Questions?
            </span>
            <h2 className="text-3xl font-black text-slate-950">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div
                key={faq.q}
                className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden transition"
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-sm sm:text-base text-slate-900 hover:text-indigo-600 transition"
                >
                  <span>{faq.q}</span>
                  {activeFaq === idx ? (
                    <ChevronUp className="w-5 h-5 text-indigo-600 shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
                  )}
                </button>
                {activeFaq === idx && (
                  <div className="px-5 pb-5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-200 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA SECTION ── */}
      <section className="py-20 md:py-28 bg-gradient-to-b from-slate-50 via-indigo-50/50 to-white relative overflow-hidden border-b border-slate-200">
        <div className="relative max-w-4xl mx-auto px-4 text-center space-y-7">
          <h2 className="text-3xl sm:text-5xl font-black text-slate-950 tracking-tight">
            Ready to Dominate Search Rankings on Autopilot?
          </h2>
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Join forward-thinking bloggers, agencies, and publishers. Connect your WordPress site and publish your first RankMath 85+ article in under 3 minutes.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login">
              <Button
                size="lg"
                className="h-16 px-11 text-base font-extrabold rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-600/25 transition-all hover:scale-103"
              >
                <span>Start Your Free Trial (3 Posts Free)</span>
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
