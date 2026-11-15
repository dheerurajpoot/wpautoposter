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
  Code2,
  Image as ImageIcon,
  Clock,
  Sliders,
  ChevronDown,
  ChevronUp,
  Star,
  Check,
  X,
  ExternalLink,
} from "lucide-react";

export function LandingPage() {
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [selectedWorkflowStep, setSelectedWorkflowStep] = useState(0);

  const workflowSteps = [
    {
      step: "01",
      title: "Keyword & Intent Analysis",
      icon: Search,
      badge: "Stage 1",
      desc: "Upload CSV keywords or add individual terms. The system analyzes search intent (TOFU/MOFU/BOFU), verifies category clusters, and guards against keyword cannibalization.",
      preview: {
        keyword: "How to manage finances as a freelancer",
        cluster: "Personal Finance",
        intent: "Guide / Informational",
        funnel: "TOFU",
      },
    },
    {
      step: "02",
      title: "Grounded Fact Research",
      icon: Layers,
      badge: "Stage 2",
      desc: "Our research agent searches authoritative sources, gathers verified factual claims, definitions, and real data points to ensure your article is factually grounded with zero hallucinations.",
      preview: {
        factsGathered: "4 verified financial metrics",
        sources: "Government data & industry reports",
        definitions: "Emergency fund, estimated taxes, cash flow buffer",
      },
    },
    {
      step: "03",
      title: "Long-Form AI Article Writing",
      icon: PenTool,
      badge: "Stage 3 & 3.5",
      desc: "Senior AI author drafts an engaging 1,500–2,500+ word article with dense H2/H3 subheadings, comprehensive FAQs, actionable checklists, and strict anti-AI fluff editing.",
      preview: {
        headings: "6 structured H2 sections + 4 H3 subsections",
        wordCount: "1,850 words",
        tone: "Conversational & Authoritative",
        readability: "Grade 8 (High engagement)",
      },
    },
    {
      step: "04",
      title: "AI Studio Featured Image",
      icon: ImageIcon,
      badge: "Stage 4",
      desc: "Generates a bespoke, text-free featured hero image using advanced generative visual models with studio lighting, vibrant colors, and optimal WordPress landscape dimensions.",
      preview: {
        prompt: "Modern workspace with laptop, budget visualizer, warm lighting",
        style: "Photorealistic 3D Studio",
        textFree: "100% verified no text / no watermarks",
      },
    },
    {
      step: "05",
      title: "WordPress & RankMath Publish",
      icon: Zap,
      badge: "Stage 5 & 6",
      desc: "Uploads hero image to WordPress media library, creates the post with semantic HTML, sets RankMath focus keyword, auto-generates meta description, and scores 85+ automatically.",
      preview: {
        rankMathScore: "85 / 100 (Green)",
        schemaType: "Article",
        metaDescription: "142 chars with primary keyword",
        publishStatus: "Published / Live on WordPress",
      },
    },
  ];

  const faqs = [
    {
      q: "How does the WordPress integration work? Is a plugin required?",
      a: "No custom plugin is needed! WP Content Autopilot connects directly to your WordPress website using the standard, official WordPress REST API and Application Passwords. You simply create an Application Password in your WordPress User Profile, enter it into our dashboard, and you're connected in 30 seconds.",
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

      {/* ── HERO SECTION ── */}
      <section className="relative pt-20 pb-24 md:pt-28 md:pb-32 overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-50 border-b border-slate-100">
        {/* Decorative Grid and Ambient Lights */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          {/* Top Pill Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-semibold shadow-xs">
            <span className="flex h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
            <span>Autonomous Content Ops · RankMath 85+ Guaranteed</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-slate-950 tracking-tight max-w-5xl mx-auto leading-[1.1]">
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

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link href="/login">
              <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-8 h-12 shadow-lg shadow-indigo-600/25 rounded-xl transition hover:scale-102">
                <span>Start Free Trial (3 Posts Free)</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <a href="#workflow">
              <Button size="lg" variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-sm px-6 h-12 rounded-xl">
                <span>Explore How It Works</span>
              </Button>
            </a>
          </div>

          {/* Trust Metrics & Proof */}
          <div className="pt-10 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-4xl mx-auto border-t border-slate-200/80">
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">50,000+</div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">Articles Published</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-indigo-600">85+</div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">Average RankMath Score</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600">99.4%</div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">SEO Pass Rate</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-purple-600">10x</div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">Organic Traffic Velocity</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── WORKFLOW / HOW IT WORKS SECTION ── */}
      <section id="workflow" className="py-20 md:py-28 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              The 5-Stage Content Ops Pipeline
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              From Raw Keyword to Published Masterpiece in 60 Seconds
            </h2>
            <p className="text-sm sm:text-base text-slate-500">
              Most AI tools generate shallow markdown text. Our autonomous pipeline coordinates 5 specialized AI agents to write, polish, design, and upload complete articles to WordPress.
            </p>
          </div>

          {/* Interactive Step Selector */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Steps Column */}
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
                        ? "bg-indigo-50/70 border-indigo-600 shadow-sm ring-2 ring-indigo-600/15"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isSelected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-indigo-600 bg-white border border-indigo-200 px-1.5 py-0.5 rounded">
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

            {/* Right Live Stage Preview Card */}
            <div className="lg:col-span-7 bg-slate-900 rounded-2xl p-6 sm:p-8 text-white border border-slate-800 shadow-xl space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-full bg-red-500/80" />
                  <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="text-xs font-mono text-slate-400 ml-2">
                    pipeline_trace // stage_{selectedWorkflowStep + 1}_inspector
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
      <section id="features" className="py-20 md:py-28 bg-slate-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              Built for Scale &amp; Performance
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Enterprise SEO Capabilities Out of the Box
            </h2>
            <p className="text-sm sm:text-base text-slate-500">
              Everything you need to automate your WordPress editorial calendar without sacrificing quality, search rankings, or brand voice.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">RankMath 85+ SEO Guarantee</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Automatically attaches primary focus keywords, writes meta descriptions under 155 characters, injects heading kebab-case IDs, and registers the verified 85+ score in WordPress post meta.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Multi-Stage Anti-Fluff Engine</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Dedicated editing stage removes repetitive phrasing and generic filler words. Ensures focus keyword appears naturally in the opening 100 words with dense H2/H3 subheadings and structured FAQs.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <ImageIcon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">AI Studio Featured Images</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Generates high-resolution featured hero images without broken letters or text artifacts. Automatically uploads to your WordPress media library and binds it as the post featured media.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Autonomous Drip Scheduler</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Set your daily quota and publishing times. The built-in cron engine automatically picks queued keywords and publishes articles seamlessly around the clock without manual intervention.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                <Sliders className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Dynamic Prompt Studio</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Choose between Professional, Conversational, Educational, or Bold tone presets. Inject custom brand voice guidelines, specific currency requirements, or edit raw prompts anytime.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Agency &amp; Multi-Tenant Ready</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Built with full tenant isolation. Supports individual team quotas, custom WordPress credentials per user, PayU and USDT crypto billing, and role-based access control.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── COMPARISON TABLE ── */}
      <section className="py-20 md:py-28 bg-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              Why Creators Choose Autopilot
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900">
              WP Autopilot vs. Traditional Alternatives
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border border-slate-200 rounded-xl overflow-hidden">
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
                    ~$0.60 – $0.90 / post
                  </td>
                  <td className="p-4 text-slate-500">$40 – $100 / post</td>
                  <td className="p-4 text-slate-500">Free, but hours of manual work</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-slate-800">WordPress Upload &amp; Publishing</td>
                  <td className="p-4 bg-indigo-50/40 font-bold text-emerald-600 border-x border-indigo-100 flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600" /> Fully Automated 1-Click
                  </td>
                  <td className="p-4 text-slate-500">Manual copy-paste by you</td>
                  <td className="p-4 text-slate-500">Manual copy-paste by you</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-slate-800">RankMath SEO 85+ Optimization</td>
                  <td className="p-4 bg-indigo-50/40 font-bold text-emerald-600 border-x border-indigo-100 flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600" /> Native (Focus keyword &amp; meta)
                  </td>
                  <td className="p-4 text-slate-500">Inconsistent / depends on writer</td>
                  <td className="p-4 text-red-500 flex items-center gap-1.5">
                    <X className="w-4 h-4 text-red-500" /> None (Manual configuration)
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-slate-800">AI Featured Image Generation</td>
                  <td className="p-4 bg-indigo-50/40 font-bold text-emerald-600 border-x border-indigo-100 flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600" /> Included &amp; Auto-Attached
                  </td>
                  <td className="p-4 text-slate-500">Extra charge for stock photos</td>
                  <td className="p-4 text-red-500 flex items-center gap-1.5">
                    <X className="w-4 h-4 text-red-500" /> None
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-slate-800">Fact-Checking &amp; Grounding</td>
                  <td className="p-4 bg-indigo-50/40 font-bold text-emerald-600 border-x border-indigo-100 flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600" /> Stage 2 Research Agent
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
      <section id="pricing" className="py-20 md:py-28 bg-slate-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              Simple, Transparent Pricing
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Start Free, Scale as Your Traffic Explodes
            </h2>
            <p className="text-sm sm:text-base text-slate-500">
              Every plan includes full RankMath 85+ optimization, AI featured images, automated scheduling, and Prompt Studio access.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Free Plan */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Free Trial</h3>
                  <p className="text-xs text-slate-500">Test the platform risk-free</p>
                </div>
                <div className="text-3xl font-extrabold text-slate-900">$0</div>
                <ul className="space-y-2 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" /> 3 Articles Free Trial
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" /> RankMath 85+ Score
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" /> 1 WordPress Site
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" /> Prompt Studio Access
                  </li>
                </ul>
              </div>
              <Link href="/login">
                <Button variant="outline" className="w-full text-xs font-semibold py-2.5">
                  Get Started Free
                </Button>
              </Link>
            </div>

            {/* Starter Plan */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Starter</h3>
                  <p className="text-xs text-slate-500">For niche blogs &amp; creators</p>
                </div>
                <div className="text-3xl font-extrabold text-slate-900">
                  $10 <span className="text-xs font-normal text-slate-500">/mo</span>
                </div>
                <ul className="space-y-2 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" /> 30 Articles / Month
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" /> RankMath 85+ Score
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" /> AI Featured Images
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" /> Drip Scheduler (1/day)
                  </li>
                </ul>
              </div>
              <Link href="/login">
                <Button variant="outline" className="w-full text-xs font-semibold py-2.5">
                  Choose Starter
                </Button>
              </Link>
            </div>

            {/* Pro Plan (Highlighted) */}
            <div className="bg-white p-6 rounded-2xl border-2 border-indigo-600 shadow-lg relative flex flex-col justify-between space-y-6">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full shadow-xs">
                Most Popular
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Pro Publisher</h3>
                  <p className="text-xs text-slate-500">For authority sites &amp; media</p>
                </div>
                <div className="text-3xl font-extrabold text-indigo-600">
                  $25 <span className="text-xs font-normal text-slate-500">/mo</span>
                </div>
                <ul className="space-y-2 text-xs text-slate-600">
                  <li className="flex items-center gap-2 font-semibold text-slate-900">
                    <Check className="w-4 h-4 text-indigo-600" /> 100 Articles / Month
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-indigo-600" /> Priority Pipeline Queue
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-indigo-600" /> RankMath 85+ Guarantee
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-indigo-600" /> Advanced Prompt Presets
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-indigo-600" /> Drip Scheduler (3/day)
                  </li>
                </ul>
              </div>
              <Link href="/login">
                <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 shadow-sm">
                  Choose Pro
                </Button>
              </Link>
            </div>

            {/* Agency Plan */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Agency Scale</h3>
                  <p className="text-xs text-slate-500">For SEO agencies &amp; networks</p>
                </div>
                <div className="text-3xl font-extrabold text-slate-900">
                  $70 <span className="text-xs font-normal text-slate-500">/mo</span>
                </div>
                <ul className="space-y-2 text-xs text-slate-600">
                  <li className="flex items-center gap-2 font-semibold text-slate-900">
                    <Check className="w-4 h-4 text-emerald-600" /> 300 Articles / Month
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" /> Multi-Site WordPress Support
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" /> Unlimited Drip Rate (10/day)
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" /> Dedicated Account Support
                  </li>
                </ul>
              </div>
              <Link href="/login">
                <Button variant="outline" className="w-full text-xs font-semibold py-2.5">
                  Choose Agency
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ACCORDION SECTION ── */}
      <section className="py-20 md:py-28 bg-white border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              Frequently Asked Questions
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900">
              Everything You Need to Know
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div
                  key={idx}
                  className="border border-slate-200 rounded-xl overflow-hidden transition"
                >
                  <button
                    onClick={() => setActiveFaq(isOpen ? null : idx)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 bg-slate-50/50 hover:bg-slate-50 transition"
                  >
                    <span className="text-sm font-bold text-slate-900">{faq.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-indigo-600 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="p-4 sm:p-5 text-xs sm:text-sm text-slate-600 leading-relaxed bg-white border-t border-slate-100">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="text-center pt-4">
            <p className="text-xs text-slate-500">
              Have another question? Visit our full{" "}
              <Link href="/faq" className="text-indigo-600 font-bold underline hover:text-indigo-800">
                FAQ Center
              </Link>{" "}
              or{" "}
              <Link href="/contact" className="text-indigo-600 font-bold underline hover:text-indigo-800">
                contact our support team
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      {/* ── HIGH-CONVERTING BOTTOM CTA ── */}
      <section className="py-20 bg-gradient-to-tr from-slate-950 via-indigo-950 to-slate-900 text-white relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 relative z-10">
          <div className="inline-flex p-3 bg-indigo-500/20 text-indigo-400 rounded-2xl border border-indigo-400/30">
            <Sparkles className="w-7 h-7" />
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Ready to Put Your WordPress SEO on Full Autopilot?
          </h2>
          <p className="text-sm sm:text-base text-indigo-200 max-w-2xl mx-auto leading-relaxed">
            Join forward-thinking bloggers, agencies, and publishers. Connect your WordPress site and publish your first RankMath 85+ article in under 3 minutes.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login">
              <Button size="lg" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm px-8 h-12 rounded-xl shadow-lg shadow-indigo-600/30">
                <span>Start Your Free Trial</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="bg-slate-900/60 border-slate-700 text-slate-300 hover:text-white font-semibold text-sm px-6 h-12 rounded-xl">
                <span>Book an Agency Demo</span>
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

