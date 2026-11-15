import React from "react";
import { PublicNavbar } from "@/components/public/PublicNavbar";
import { PublicFooter } from "@/components/public/PublicFooter";
import Link from "next/link";
import { Shield, Lock, EyeOff } from "lucide-react";

export const metadata = {
  title: "Privacy Policy — WP Content Autopilot",
  description: "Learn how WP Content Autopilot protects and encrypts user data, WordPress credentials, and complies with global privacy regulations.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans">
      <PublicNavbar />

      <section className="pt-20 pb-12 bg-slate-50 border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold">
            <Lock className="w-3.5 h-3.5" />
            <span>Data Protection &amp; Security</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-xs text-slate-500">
            Effective Date: November 3, 2026 · Last Updated: November 2026
          </p>
        </div>
      </section>

      <section className="py-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 text-xs sm:text-sm text-slate-600 leading-relaxed">
        <div className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900">1. Introduction</h2>
          <p>
            At WP Content Autopilot (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;), we take your privacy and data security seriously. This Privacy Policy describes how we collect, store, encrypt, and handle personal and operational information when you access our multi-tenant WordPress content automation platform.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900">2. Information We Collect</h2>
          <p>We collect the following categories of data to provide and improve the Service:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Account Data:</strong> Email address, name, password hash, and subscription plan tier.</li>
            <li><strong>WordPress Integration Credentials:</strong> WordPress base site URL, username, and encrypted Application Passwords necessary to publish articles and upload images via the WP REST API.</li>
            <li><strong>Keyword &amp; Content Data:</strong> Target keywords, categories, custom prompt studio instructions, and generated article drafts.</li>
            <li><strong>Billing Information:</strong> Payment transaction references, order IDs, and cryptocurrency transaction hashes (TXIDs). Sensitive card numbers and CVVs are handled directly by payment gateways (PayU) and are never stored on our servers.</li>
          </ul>
        </div>

        <div className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900">3. How We Protect Your WordPress &amp; AI Credentials</h2>
          <p>
            Security is central to our engineering architecture:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>All WordPress Application Passwords and custom AI API keys are encrypted at rest using AES-256 standard encryption.</li>
            <li>We utilize tenant isolation: your credentials and queue items are strictly partitioned and inaccessible to any other user.</li>
            <li>All network communication occurs over encrypted TLS 1.3 / HTTPS connections.</li>
          </ul>
        </div>

        <div className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900">4. Zero Selling Guarantee</h2>
          <p className="font-semibold text-slate-800">
            We will never sell, rent, monetize, or trade your personal data, WordPress credentials, or private keywords to data brokers, advertisers, or third parties under any circumstances.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900">5. AI Model Training Disclaimer</h2>
          <p>
            We do not use your private drafts, unpublished keywords, or confidential business instructions to train public or foundational artificial intelligence models. Your content operations remain exclusively yours.
          </p>
        </div>

        <div id="gdpr" className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900">6. GDPR &amp; CCPA Compliance (Your Rights)</h2>
          <p>
            Depending on your location, you have rights regarding your personal information, including:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>The right to access and obtain a copy of your stored personal data.</li>
            <li>The right to rectify inaccurate or incomplete information.</li>
            <li>The right to request complete deletion (erasure) of your account and all associated keywords and settings.</li>
            <li>The right to restrict or object to certain processing activities.</li>
          </ul>
          <p>
            To exercise these rights, please email us at <a href="mailto:privacy@wpautopilot.com" className="text-indigo-600 font-semibold underline">privacy@wpautopilot.com</a>.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900">7. Cookies &amp; Local Storage</h2>
          <p>
            We use browser Local Storage and secure cookies strictly for session authentication, preventing unauthorized access, and maintaining user preferences. We do not use intrusive third-party cross-site tracking cookies.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900">8. Data Retention</h2>
          <p>
            We retain account data and publication history for as long as your account is active. If you delete your account, your profile data, stored WordPress credentials, and keywords will be permanently expunged from our active databases within 30 days.
          </p>
        </div>

        <div className="space-y-3 pt-4 border-t border-slate-200">
          <h2 className="text-base font-bold text-slate-900">9. Contact Our Privacy Officer</h2>
          <p>
            If you have questions or concerns regarding this Privacy Policy or our security practices, contact us at{" "}
            <a href="mailto:privacy@wpautopilot.com" className="text-indigo-600 font-semibold underline">
              privacy@wpautopilot.com
            </a>{" "}
            or visit our{" "}
            <Link href="/contact" className="text-indigo-600 font-semibold underline">
              Contact Page
            </Link>
            .
          </p>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

