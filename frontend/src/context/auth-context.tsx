"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { UserProfile, apiFetch, getAuthToken, setAuthToken, clearAuthToken } from "@/lib/api";

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserProfile>;
  register: (email: string, password: string, fullName: string) => Promise<UserProfile>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const data = await apiFetch<{ user: UserProfile }>("/api/auth/me");
      setUser(data.user);
    } catch {
      setUser(null);
      clearAuthToken();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string) => {
    const data = await apiFetch<{ user: UserProfile; token: string }>("/api/auth/login", {
      method: "POST",
      body: { email, password } as any,
    });
    setAuthToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (email: string, password: string, fullName: string) => {
    const data = await apiFetch<{ user: UserProfile; token: string }>("/api/auth/register", {
      method: "POST",
      body: { email, password, full_name: fullName } as any,
    });
    setAuthToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore error during logout
    } finally {
      clearAuthToken();
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

