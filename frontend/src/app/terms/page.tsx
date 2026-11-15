import React from "react";
import { PublicNavbar } from "@/components/public/PublicNavbar";
import { PublicFooter } from "@/components/public/PublicFooter";
import Link from "next/link";
import { Shield, FileText } from "lucide-react";

export const metadata = {
  title: "Terms of Service — WP Content Autopilot",
  description: "Terms and conditions governing the use of WP Content Autopilot SaaS platform and WordPress content automation services.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans">
      <PublicNavbar />

      <section className="pt-20 pb-12 bg-slate-50 border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold">
            <FileText className="w-3.5 h-3.5" />
            <span>Legal Documentation</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
            Terms of Service
          </h1>
          <p className="text-xs text-slate-500">
            Effective Date: November 3, 2026 · Last Updated: November 2026
          </p>
        </div>
      </section>

      <section className="py-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 text-xs sm:text-sm text-slate-600 leading-relaxed">
        <div className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900">1. Agreement to Terms</h2>
          <p>
            By accessing or using the WP Content Autopilot software-as-a-service application (&quot;Service&quot;, &quot;Platform&quot;), provided by WP Content Autopilot (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, you must not access or use the Service.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900">2. Account Registration &amp; Security</h2>
          <p>
            You must provide accurate, complete, and current information when creating an account. You are solely responsible for maintaining the confidentiality of your account credentials, passwords, and API tokens. You agree to notify us immediately upon suspecting any unauthorized access to your account.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900">3. WordPress Site Access &amp; Permissions</h2>
          <p>
            To enable autonomous publishing, the Service utilizes your WordPress website&apos;s standard REST API and Application Passwords. By connecting your WordPress site, you represent and warrant that you own or have explicit administrative authorization to publish content, upload media, and alter post metadata on that domain.
          </p>
          <p>
            All WordPress credentials provided by you are stored encrypted and are utilized exclusively for executing your instructed publication tasks.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900">4. Subscription Plans, Quotas &amp; Billing</h2>
          <p>
            Our Service offers tiered subscription plans (Free Trial, Starter, Pro Publisher, Agency Scale). Each tier provides a predetermined monthly quota of generated and published articles. Quotas automatically reset every 30 days from your billing date.
          </p>
          <p>
            Payments are processed via authorized third-party payment gateways, including PayU (INR Credit/Debit, UPI, Netbanking) and manual USDT cryptocurrency transfers. Unused article generation quotas do not carry over to subsequent billing cycles.
          </p>
        </div>

        <div id="refund" className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900">5. Cancellation &amp; Refund Policy</h2>
          <p>
            You may cancel your subscription at any time via your account Billing tab. Upon cancellation, your plan remains active until the conclusion of your current billing period. Due to the high compute, LLM token, and image generation costs incurred instantly upon generation, fees paid are non-refundable once content generation quotas have been utilized.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900">6. AI-Generated Content Disclaimer</h2>
          <p>
            While WP Content Autopilot incorporates advanced multi-stage fact verification and RankMath SEO optimization, artificial intelligence models may occasionally generate unexpected or imperfect output. You acknowledge and agree that you maintain ultimate responsibility for reviewing and verifying content published to your websites.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900">7. Prohibited Uses</h2>
          <p>You agree not to use the Service to:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Generate or publish illegal, defamatory, abusive, or infringing content.</li>
            <li>Promote spam networks, phishing campaigns, malware, or deceptive affiliate scams.</li>
            <li>Attempt to reverse-engineer, decompile, or bypass the Service&apos;s security and quota limits.</li>
            <li>Interfere with or disrupt the platform infrastructure or other tenants&apos; workloads.</li>
          </ul>
        </div>

        <div className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900">8. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by applicable law, WP Content Autopilot shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, search engine ranking fluctuations, data loss, or business interruption arising from the use of the Service.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900">9. Modifications to Service and Terms</h2>
          <p>
            We reserve the right to modify or discontinue features of the Service or update these Terms periodically. Continued use of the Service following published updates constitutes your acceptance of the revised Terms.
          </p>
        </div>

        <div className="space-y-3 pt-4 border-t border-slate-200">
          <h2 className="text-base font-bold text-slate-900">10. Contact Us</h2>
          <p>
            For legal inquiries or questions regarding these Terms of Service, please contact us at{" "}
            <a href="mailto:legal@wpautopilot.com" className="text-indigo-600 font-semibold underline">
              legal@wpautopilot.com
            </a>{" "}
            or submit a request via our{" "}
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

