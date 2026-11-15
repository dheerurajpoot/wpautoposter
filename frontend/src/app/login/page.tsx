"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { AuthScreen } from "@/components/auth/AuthScreen";

export default function LoginPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push("/");
    }
  }, [user, router]);

  if (user) {
    return null;
  }

  return (
    <AuthScreen
      onSuccess={() => {
        router.push("/");
      }}
    />
  );
}

