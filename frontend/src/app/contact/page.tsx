"use client";

import React, { useState } from "react";
import { PublicNavbar } from "@/components/public/PublicNavbar";
import { PublicFooter } from "@/components/public/PublicFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import {
  Mail,
  MessageSquare,
  Clock,
  Send,
  HelpCircle,
  Building,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

export default function ContactPage() {
  const { showToast } = useToast();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [inquiryType, setInquiryType] = useState("support");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    // Simulate submission
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      showToast("Thank you! Your message has been received. Our team will get back to you shortly.", "success");
    }, 800);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans">
      <PublicNavbar />

      {/* Header */}
      <section className="pt-20 pb-12 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>We&apos;re Here to Help</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-950 tracking-tight">
            Get in Touch with Our Team
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
            Have questions about our WordPress integration, custom enterprise agency limits, or technical troubleshooting? Send us a message and our engineers will assist you.
          </p>
        </div>
      </section>

      {/* Main Contact Grid */}
      <section className="py-16 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left Form Column */}
          <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            {submitted ? (
              <div className="text-center py-12 space-y-4">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Message Delivered!</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Thank you for reaching out, <strong>{fullName}</strong>. A support specialist has received your inquiry and will email you back at <strong>{email}</strong> within 12 hours.
                </p>
                <Button
                  onClick={() => {
                    setSubmitted(false);
                    setMessage("");
                    setSubject("");
                  }}
                  variant="outline"
                  size="sm"
                  className="text-xs font-semibold"
                >
                  Send Another Message
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      required
                      placeholder="Jane Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="h-10 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="email"
                      required
                      placeholder="jane@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-10 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                      Inquiry Category
                    </label>
                    <select
                      value={inquiryType}
                      onChange={(e) => setInquiryType(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="support">Technical Support</option>
                      <option value="sales">Sales &amp; Agency Pricing</option>
                      <option value="billing">Billing &amp; Payments</option>
                      <option value="partnership">Feature Request &amp; Partnership</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                      Subject <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      required
                      placeholder="e.g. Question about WordPress Application Passwords"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="h-10 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                    Your Message <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    required
                    rows={5}
                    placeholder="Describe how we can help you in detail..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-6 py-2.5 h-11 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5 mr-2" />
                  <span>{submitting ? "Sending Message..." : "Send Message"}</span>
                </Button>
              </form>
            )}
          </div>

          {/* Right Information Column */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Direct Support Channels</h3>
              <ul className="space-y-3.5 text-xs text-slate-600">
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">Email Inquiries</div>
                    <a href="mailto:support@wpautopilot.com" className="text-indigo-600 hover:underline">
                      support@wpautopilot.com
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">Support Hours &amp; SLA</div>
                    <p className="text-slate-500">Monday – Saturday: 9:00 AM – 8:00 PM (IST / UTC+5:30)</p>
                    <p className="text-[11px] text-emerald-600 font-medium">Average ticket resolution: under 12 hours</p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="p-6 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-3">
              <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm">
                <HelpCircle className="w-4 h-4 text-indigo-600" />
                <span>Looking for Immediate Answers?</span>
              </div>
              <p className="text-xs text-indigo-800 leading-relaxed">
                Many common questions regarding WordPress Application Passwords, RankMath SEO metadata, and PayU/crypto billing are answered in our FAQ.
              </p>
              <Link href="/faq" className="inline-block text-xs font-bold text-indigo-700 hover:text-indigo-900 underline">
                Browse Frequently Asked Questions →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

