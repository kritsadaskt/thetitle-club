"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import type { MemberStatus } from "./types";
import { Member } from "./types";
import { createClient } from "./supabase/client";
import { mapProfileToMember, type ProfileRow } from "./supabase/mappers";

interface AuthContextType {
  member: Member | null;
  isLoading: boolean;
  login: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string; redirectTo?: string }>;
  logout: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

/** Dev / staging: set NEXT_PUBLIC_BYPASS_MEMBERSHIP_APPROVAL=true — pending users can use the member app without admin approval. */
function bypassMembershipApproval(): boolean {
  return process.env.NEXT_PUBLIC_BYPASS_MEMBERSHIP_APPROVAL === "true";
}

function memberCanAccessMemberArea(status: MemberStatus): boolean {
  if (status === "rejected" || status === "suspended") return false;
  if (status === "active") return true;
  if (bypassMembershipApproval()) {
    return status === "pending_verification" || status === "pending_approval";
  }
  return false;
}

/** Fallback when RPC is not deployed: direct insert (needs RLS insert policy). */
async function ensureProfileExists(
  supabase: ReturnType<typeof createClient>,
  user: User
): Promise<{ ok: true } | { ok: false; message: string }> {
  const fullName =
    (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()) ||
    user.email?.split("@")[0] ||
    "Member";
  const { error } = await supabase.from("profiles").insert({
    id: user.id,
    full_name: fullName,
  });
  if (!error) return { ok: true };
  if (error.code === "23505") return { ok: true };
  return { ok: false, message: error.message };
}

async function loadMemberFromUser(
  supabase: ReturnType<typeof createClient>,
  user: User
): Promise<
  | { member: Member; isAdmin: boolean }
  | { error: string }
> {
  const metaName =
    typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null;

  let { data: row, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (error) {
    return { error: `${error.message} (${error.code ?? "unknown"})` };
  }
  if (!row) {
    const { error: rpcErr } = await supabase.rpc("ensure_my_profile", {
      p_full_name: metaName,
    });
    if (rpcErr) {
      const fallback = await ensureProfileExists(supabase, user);
      if (!fallback.ok) {
        return {
          error: [
            rpcErr.message,
            fallback.message,
            "Deploy supabase/ensure_my_profile_rpc.sql and/or supabase/profiles_email_insert_policy.sql in the SQL Editor.",
          ].join(" "),
        };
      }
    }
    const again = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    if (again.error) {
      return { error: again.error.message };
    }
    row = again.data;
    if (!row) {
      return {
        error:
          "Profile row still missing after ensure. Run supabase/ensure_my_profile_rpc.sql in Supabase SQL Editor.",
      };
    }
  }
  const profile = row as ProfileRow;
  const member = mapProfileToMember(profile, user.email ?? "");
  return { member, isAdmin: profile.is_admin };
}

/** Applies session to React state. Signs out if profile missing or member not allowed. */
async function syncAuthState(
  supabase: ReturnType<typeof createClient>,
  setMember: (m: Member | null) => void,
  setIsAdmin: (a: boolean) => void
) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) {
    setMember(null);
    setIsAdmin(false);
    return;
  }
  const loaded = await loadMemberFromUser(supabase, session.user);
  if ("error" in loaded) {
    await supabase.auth.signOut();
    setMember(null);
    setIsAdmin(false);
    return;
  }
  if (loaded.isAdmin) {
    setIsAdmin(true);
    setMember(loaded.member);
    return;
  }
  if (!memberCanAccessMemberArea(loaded.member.status)) {
    await supabase.auth.signOut();
    setMember(null);
    setIsAdmin(false);
    return;
  }
  setIsAdmin(false);
  setMember(loaded.member);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [member, setMember] = useState<Member | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function init() {
      await syncAuthState(supabase, setMember, setIsAdmin);
      setIsLoading(false);
    }
    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void (async () => {
        await syncAuthState(supabase, setMember, setIsAdmin);
        setIsLoading(false);
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      return { success: false, error: error.message };
    }
    if (!data.user) {
      return { success: false, error: "Login failed." };
    }
    await supabase.auth.getSession();
    const loaded = await loadMemberFromUser(supabase, data.user);
    if ("error" in loaded) {
      await supabase.auth.signOut();
      return { success: false, error: loaded.error };
    }
    if (loaded.isAdmin) {
      setIsAdmin(true);
      setMember(loaded.member);
      router.refresh();
      return { success: true, redirectTo: "/admin" };
    }
    if (!memberCanAccessMemberArea(loaded.member.status)) {
      await supabase.auth.signOut();
      return {
        success: false,
        error: `Your account is ${loaded.member.status.replace(/_/g, " ")}. Please wait or contact support.`,
      };
    }
    setIsAdmin(false);
    setMember(loaded.member);
    router.refresh();
    return { success: true, redirectTo: "/dashboard" };
  };

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setMember(null);
    setIsAdmin(false);
    router.push("/login");
    router.refresh();
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
