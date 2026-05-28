import type { CommunityMoment, Privilege } from "@/lib/types";
import { createClient } from "./client";
import {
  mapCommunityRow,
  mapPrivilegeRow,
  type CommunityMomentRow,
  type PrivilegeRow,
} from "./mappers";

export async function fetchActivePrivileges(): Promise<Privilege[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("privileges")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  if (error) return [];
  return (data ?? []).map((r) => mapPrivilegeRow(r as PrivilegeRow));
}

export async function fetchAllPrivileges(): Promise<Privilege[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("privileges").select("*").order("sort_order");
  if (error) return [];
  return (data ?? []).map((r) => mapPrivilegeRow(r as PrivilegeRow));
}

export async function fetchPrivilegeById(id: string): Promise<Privilege | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from("privileges").select("*").eq("id", id).single();
  if (error || !data) return null;
  const p = mapPrivilegeRow(data as PrivilegeRow);
  if (!p.isActive) return null;
  return p;
}

export async function fetchPublishedCommunity(): Promise<CommunityMoment[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("community_moments")
    .select("*")
    .eq("is_published", true)
    .order("sort_order");
  if (error) return [];
  return (data ?? []).map((r) => mapCommunityRow(r as CommunityMomentRow));
}
