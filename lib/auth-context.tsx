"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Member } from "./types";
import { findMemberByCredentials, MOCK_MEMBERS } from "./mock-data";

interface AuthContextType {
  member: Member | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Admin credentials (mock)
const ADMIN_EMAIL = "admin@thetitleresidence.com";
const ADMIN_PASSWORD = "admin123";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [member, setMember] = useState<Member | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Restore session from localStorage on mount
    const stored = localStorage.getItem("ttc_member_id");
    const adminFlag = localStorage.getItem("ttc_is_admin");

    if (adminFlag === "true") {
      setIsAdmin(true);
      setIsLoading(false);
      return;
    }
    if (stored) {
      const found = MOCK_MEMBERS.find((m) => m.id === stored && m.status === "active");
      if (found) setMember(found);
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    // Admin login
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      setIsAdmin(true);
      localStorage.setItem("ttc_is_admin", "true");
      return { success: true };
    }

    const found = findMemberByCredentials(email, password);
    if (!found) {
      // Check if email exists but wrong password / pending
      const existing = MOCK_MEMBERS.find((m) => m.email === email);
      if (existing && existing.status !== "active") {
        return { success: false, error: `Your account is ${existing.status.replace("_", " ")}. Please wait for approval.` };
      }
      return { success: false, error: "Invalid email or password." };
    }
    setMember(found);
    localStorage.setItem("ttc_member_id", found.id);
    return { success: true };
  };

  const logout = () => {
    setMember(null);
    setIsAdmin(false);
    localStorage.removeItem("ttc_member_id");
    localStorage.removeItem("ttc_is_admin");
    window.location.href = "/club/login";
  };

  return (
    <AuthContext.Provider value={{ member, isLoading, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
