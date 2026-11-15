"use client";

import React, { useState } from "react";
import { PublicNavbar } from "@/components/public/PublicNavbar";
import { PublicFooter } from "@/components/public/PublicFooter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  HelpCircle,
  Search,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
  Zap,
  Shield,
  CreditCard,
  Layers,
} from "lucide-react";

interface FaqItem {
  q: string;
  a: string;
  category: "wordpress" | "seo" | "ai" | "billing" | "security";
}

const FAQ_ITEMS: FaqItem[] = [
  // WordPress
  {
    category: "wordpress",
    q: "How do I connect my WordPress website?",
    a: "Connecting is simple and takes under 1 minute. In your WordPress admin dashboard, navigate to Users → Profile, scroll down to 'Application Passwords', type 'Autopilot' as the name, and click 'Add New Application Password'. Copy the generated password, paste it into WP Content Autopilot along with your WordPress site URL and username, and click 'Test Connection'.",
  },
  {
    category: "wordpress",
    q: "Do I need to install a custom WordPress plugin?",
    a: "No plugin is required! WP Content Autopilot communicates natively using WordPress's official core REST API (introduced in WordPress 4.7+). It automatically handles post creation, category mapping, tag association, and media library uploads without bloating your site with third-party plugins.",
  },
  {
    category: "wordpress",
    q: "Can I connect multiple WordPress sites?",
    a: "Yes! Our Agency Plan supports multi-site management, allowing you to configure different WordPress sites and publish content across multiple domains from a single dashboard.",
  },

  // SEO & RankMath
  {
    category: "seo",
    q: "How does the system achieve a RankMath 85+ score?",
    a: "RankMath evaluates post titles, focus keyword occurrences, meta descriptions, headings, and internal linking. Our pipeline formats every article specifically for RankMath: it ensures the focus keyword appears in the title, first 100 words, subheadings, and meta description, injects kebab-case IDs on all headings, formats structured FAQ blocks, and writes the verified 85 score directly into the post meta.",
  },
  {
    category: "seo",
    q: "What happens if a keyword is already covered on my site?",
    a: "Our Stage 1 engine features an automated Deduplication & Cannibalization Gate. It scans your existing published articles and content index to ensure you never accidentally publish two articles targeting the same primary focus keyword, protecting your site from Google keyword cannibalization penalties.",
  },
  {
    category: "seo",
    q: "Are the meta titles and descriptions customizable?",
    a: "Yes! While the engine generates highly optimized 50-60 character titles and 120-155 character meta descriptions automatically, you can edit them directly in Prompt Studio or preview them before publishing.",
  },

  // AI & Content
  {
    category: "ai",
    q: "How does the system prevent AI hallucinations and fake facts?",
    a: "Unlike generic chatbots, our pipeline includes a mandatory Stage 2 Research Agent. This agent conducts grounded factual research, extracts verified statistics and definitions, and attaches credible sources. If a fact cannot be verified, it is placed in an unknowns list and never invented.",
  },
  {
    category: "ai",
    q: "Can I adjust the writing tone or inject my brand's voice?",
    a: "Yes! Prompt Studio includes one-click tone presets (Professional & Authoritative, Conversational & Engaging, Educational & Step-by-Step, Bold & Persuasive) and article length presets (~1,500 words, ~2,000 words, ~2,500+ words). You can also add custom brand rules (e.g. 'Use Indian Rupees', 'Keep intros punchy').",
  },
  {
    category: "ai",
    q: "How are the featured hero images created?",
    a: "Stage 4 generates specialized image briefs that instruct advanced image generation models (Gemini Imagen / DALL-E) to produce photorealistic 3D editorial visuals or clean vector illustrations. Every prompt strictly forbids broken text, letters, and watermarks.",
  },

  // Billing
  {
    category: "billing",
    q: "What payment methods are supported?",
    a: "We support Credit/Debit Cards, UPI, Netbanking via PayU (INR), as well as manual USDT cryptocurrency payments (TRC20, BEP20, ERC20) for international subscribers. We also offer a 3-article free trial with no credit card required.",
  },
  {
    category: "billing",
    q: "Can I cancel or upgrade my subscription at any time?",
    a: "Yes, you can upgrade, downgrade, or cancel your subscription at any time from your Billing tab. When you upgrade, your quota increases immediately.",
  },

  // Security
  {
    category: "security",
    q: "Are my WordPress credentials and AI keys safe?",
    a: "Yes. All WordPress Application Passwords and custom AI API keys are stored encrypted at rest with AES-256 encryption. Our database uses strict tenant isolation, ensuring your credentials and publication queues are completely private.",
  },
];

export default function FaqPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [openItems, setOpenItems] = useState<Record<number, boolean>>({ 0: true });

  const toggleItem = (index: number) => {
    setOpenItems((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const filteredFaqs = FAQ_ITEMS.filter((item) => {
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    const matchesSearch =
      search.trim() === "" ||
      item.q.toLowerCase().includes(search.toLowerCase()) ||
      item.a.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans">
      <PublicNavbar />

      {/* Header */}
      <section className="pt-20 pb-12 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Help Center &amp; Knowledge Base</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-950 tracking-tight">
            Frequently Asked Questions
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
            Find quick answers to common questions about setting up WordPress, achieving RankMath 85+ scores, customizing prompts, and subscription plans.
          </p>

          {/* Search Bar */}
          <div className="max-w-md mx-auto pt-2 relative">
            <Input
              type="text"
              placeholder="Search questions or keywords..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 text-xs pl-9 pr-4 rounded-xl border-slate-300 focus:border-indigo-500 shadow-xs"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-5" />
          </div>
        </div>
      </section>

      {/* FAQ Content Area */}
      <section className="py-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {[
            { id: "all", label: "All Questions" },
            { id: "wordpress", label: "WordPress Integration" },
            { id: "seo", label: "RankMath & SEO" },
            { id: "ai", label: "AI Content & Quality" },
            { id: "billing", label: "Billing & Plans" },
            { id: "security", label: "Security & Privacy" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
                selectedCategory === cat.id
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Accordion List */}
        <div className="space-y-3">
          {filteredFaqs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No matching questions found for &quot;{search}&quot;. Try searching with another keyword or{" "}
              <Link href="/contact" className="text-indigo-600 font-semibold underline">
                contact our support team
              </Link>
              .
            </div>
          ) : (
            filteredFaqs.map((faq, idx) => {
              const isOpen = Boolean(openItems[idx]);
              return (
                <div
                  key={idx}
                  className="border border-slate-200 rounded-xl overflow-hidden bg-white transition hover:border-slate-300"
                >
                  <button
                    onClick={() => toggleItem(idx)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 bg-slate-50/40 hover:bg-slate-50 transition"
                  >
                    <span className="text-xs sm:text-sm font-bold text-slate-900">{faq.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-indigo-600 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="p-4 sm:p-5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 bg-white">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Support Banner */}
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-center space-y-3">
          <h3 className="text-sm font-bold text-slate-900">Still have a question?</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Our engineering and support team is here to assist you with custom configurations, WordPress setups, or enterprise volume.
          </p>
          <div className="pt-1 flex items-center justify-center gap-3">
            <Link href="/contact">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4">
                Contact Support Team
              </Button>
            </Link>
            <Link href="/login">
              <Button size="sm" variant="outline" className="text-xs font-semibold px-4">
                Start Free Trial
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

