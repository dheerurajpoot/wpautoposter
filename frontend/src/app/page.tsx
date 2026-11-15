"use client";

import React from "react";
import { useAuth } from "@/context/auth-context";
import { OverviewTab } from "@/components/dashboard/OverviewTab";
import { LandingPage } from "@/components/landing/LandingPage";

export default function HomePage() {
  const { user } = useAuth();

  if (!user) {
    return <LandingPage />;
  }

  return <OverviewTab />;
}
