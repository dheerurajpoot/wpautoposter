import React from "react";
import { PublicNavbar } from "@/components/public/PublicNavbar";
import { PublicFooter } from "@/components/public/PublicFooter";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  ShieldCheck,
  Target,
  Zap,
  CheckCircle2,
  Users,
  Award,
  ArrowRight,
} from "lucide-react";

export const metadata = {
  title: "About Us — WP Content Autopilot",
  description:
    "Learn how WP Content Autopilot is revolutionizing WordPress content operations with autonomous AI workflows and RankMath 85+ score guarantees.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans">
      <PublicNavbar />

      {/* Header */}
      <section className="pt-20 pb-16 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Our Mission &amp; Vision</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-950 tracking-tight">
            Building the Future of Autonomous Content Operations
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            We built WP Content Autopilot to solve a critical industry problem: the internet is flooded with low-effort, unformatted AI spam that never ranks. We believe creators and publishers deserve genuine, fact-grounded content operations.
          </p>
        </div>
      </section>

      {/* Story & Philosophy */}
      <section className="py-16 md:py-24 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div className="space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">The Problem</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
              Why 95% of AI Content Fails to Rank on Google
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Traditional AI writers generate a raw block of markdown with generic filler words (&quot;in this digital tapestry&quot;, &quot;delve into&quot;). They don&apos;t verify facts, they don&apos;t research real numbers, they don&apos;t generate images, and they don&apos;t connect to your SEO plugin.
            </p>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Publishers spend 45 minutes fixing headings, writing meta descriptions, hunting for featured images, and configuring WordPress tags. That is not automation—that is manual labor with extra steps.
            </p>
          </div>
          <div className="bg-slate-900 p-8 rounded-2xl text-white border border-slate-800 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-indigo-300">The Autopilot Standard</h3>
            <ul className="space-y-3 text-xs text-slate-300">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Multi-Stage Orchestration:</strong> Specialized research, drafting, editing, and formatting agents work in harmony.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>RankMath Native:</strong> Direct integration with RankMath SEO registers verified scores (85+) on every post.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>AI Studio Visuals:</strong> Clean, high-impact landscape hero images uploaded directly to WordPress media.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Zero-Friction Scheduling:</strong> Set your publishing drip rate and let the engine execute 24/7.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Core Values Grid */}
        <div className="space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Our Principles</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">What Drives Us</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                <Target className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Factual Grounding First</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                We never sacrifice accuracy for speed. Our Stage 2 grounding agent verifies key claims and definitions before drafting begins.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Privacy &amp; Security</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Your WordPress credentials and AI keys are securely handled with tenant isolation. We never sell your data or train models on private articles.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Uncompromising SEO</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                From heading kebab-case IDs to meta description character lengths, every detail is tuned to maximize search engine visibility.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Banner */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-8 sm:p-12 text-center space-y-4">
          <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Experience Autonomous SEO Publishing</h3>
          <p className="text-xs sm:text-sm text-indigo-200 max-w-xl mx-auto">
            Join thousands of modern publishers scaling organic traffic without the headache of manual content production.
          </p>
          <div className="pt-2">
            <Link href="/login">
              <Button className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-6 py-2.5 h-11 rounded-xl">
                <span>Start Your Free Trial</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

