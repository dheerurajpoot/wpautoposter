import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/auth-context";
import { ToastProvider } from "@/components/ui/toast";
import { DashboardShell } from "@/components/layout/DashboardShell";

export const metadata: Metadata = {
  title: "WP Content Autopilot — SaaS User & Admin Dashboard",
  description: "AI-Powered WordPress Multi-Tenant Automation Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressContentEditableWarning>
      <body className="min-h-screen font-sans antialiased bg-slate-50 text-slate-900" suppressHydrationWarning>
        <ToastProvider>
          <AuthProvider>
            <DashboardShell>{children}</DashboardShell>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
