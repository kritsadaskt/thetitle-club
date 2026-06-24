import type {
  CreatePartnerInput,
  CreatePrivilegeInput,
  MemberPromoCode,
  PromoCode,
  PromoCodeStats,
  ShopPartner,
} from "@/lib/types";
import { createClient } from "./client";
import {
  mapCommunityRow,
  mapMemberPromoCodeRow,
  mapPartnerRow,
  mapPrivilegeRow,
  mapPromoCodeRow,
  mapPromoCodeStats,
  type CommunityMomentRow,
  type PartnerRow,
  type PrivilegeRow,
  type PromoCodeRow,
  type PromoCodeWithPrivilegeRow,
} from "./mappers";
import type { CommunityMoment, Privilege } from "@/lib/types";

const PRIVILEGE_SELECT = "*, partners(id, name, logo_url, website_url)";

const PROMO_PRIVILEGE_SELECT =
  "*, privileges(title, discount_label, partner_name, partner_logo, partners(name, logo_url))";

export async function fetchActivePrivileges(): Promise<Privilege[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("privileges")
    .select(PRIVILEGE_SELECT)
    .eq("is_active", true)
    .order("sort_order");
  if (error) return [];
  return (data ?? []).map((r) => mapPrivilegeRow(r as PrivilegeRow));
}

export async function fetchAllPrivileges(): Promise<Privilege[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("privileges")
    .select(PRIVILEGE_SELECT)
    .order("sort_order");
  if (error) return [];
  return (data ?? []).map((r) => mapPrivilegeRow(r as PrivilegeRow));
}

export async function fetchPrivilegesByPartner(partnerId: string): Promise<Privilege[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("privileges")
    .select(PRIVILEGE_SELECT)
    .eq("partner_id", partnerId)
    .order("sort_order");
  if (error) return [];
  return (data ?? []).map((r) => mapPrivilegeRow(r as PrivilegeRow));
}

export async function fetchPrivilegeById(id: string): Promise<Privilege | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("privileges")
    .select(PRIVILEGE_SELECT)
    .eq("id", id)
    .single();
  if (error || !data) return null;
  const p = mapPrivilegeRow(data as PrivilegeRow);
  if (!p.isActive) return null;
  return p;
}

export async function fetchAllPartners(): Promise<ShopPartner[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("partners")
    .select("*, privileges(count)")
    .order("sort_order")
    .order("name");
  if (error) return [];
  return (data ?? []).map((r) => mapPartnerRow(r as PartnerRow));
}

export async function fetchActivePartners(): Promise<ShopPartner[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("partners")
    .select("*")
    .eq("is_active", true)
    .order("sort_order")
    .order("name");
  if (error) return [];
  return (data ?? []).map((r) => mapPartnerRow(r as PartnerRow));
}

export async function fetchPartnerById(id: string): Promise<ShopPartner | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("partners")
    .select("*, privileges(count)")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return mapPartnerRow(data as PartnerRow);
}

export type MutateResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function createPartner(input: CreatePartnerInput): Promise<MutateResult<ShopPartner>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("partners")
    .insert({
      name: input.name.trim(),
      logo_url: input.logoUrl?.trim() || null,
      website_url: input.websiteUrl?.trim() || null,
      description: input.description?.trim() || null,
      is_active: input.isActive ?? true,
      sort_order: input.sortOrder ?? 0,
    })
    .select("*")
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: mapPartnerRow(data as PartnerRow) };
}

export async function updatePartner(
  id: string,
  input: Partial<CreatePartnerInput>
): Promise<MutateResult<ShopPartner>> {
  const supabase = createClient();
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.logoUrl !== undefined) patch.logo_url = input.logoUrl.trim() || null;
  if (input.websiteUrl !== undefined) patch.website_url = input.websiteUrl.trim() || null;
  if (input.description !== undefined) patch.description = input.description.trim() || null;
  if (input.isActive !== undefined) patch.is_active = input.isActive;
  if (input.sortOrder !== undefined) patch.sort_order = input.sortOrder;

  const { data, error } = await supabase
    .from("partners")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: mapPartnerRow(data as PartnerRow) };
}

export async function createPrivilege(
  partnerId: string,
  input: CreatePrivilegeInput
): Promise<MutateResult<Privilege>> {
  const supabase = createClient();
  const { data: partner, error: partnerError } = await supabase
    .from("partners")
    .select("id, name, logo_url")
    .eq("id", partnerId)
    .single();
  if (partnerError || !partner) {
    return { ok: false, error: partnerError?.message ?? "Partner not found" };
  }

  const { data, error } = await supabase
    .from("privileges")
    .insert({
      partner_id: partnerId,
      partner_name: partner.name,
      partner_logo: partner.logo_url,
      title: input.title.trim(),
      summary: input.summary?.trim() || null,
      description: input.description?.trim() || null,
      terms: input.terms?.trim() || null,
      how_to_redeem: input.howToRedeem?.trim() || null,
      category: input.category,
      discount_label: input.discountLabel?.trim() || null,
      cover_image: input.coverImage?.trim() || null,
      valid_from: input.validFrom ?? new Date().toISOString().slice(0, 10),
      valid_until: input.validUntil || null,
      is_active: input.isActive ?? true,
      sort_order: input.sortOrder ?? 0,
      code_mode: input.codeMode ?? "shared",
    })
    .select(PRIVILEGE_SELECT)
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: mapPrivilegeRow(data as PrivilegeRow) };
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

export async function releaseExpiredPromoCodes(): Promise<void> {
  const supabase = createClient();
  await supabase.rpc("release_expired_promo_codes");
}

export async function fetchMyPromoCodes(): Promise<MemberPromoCode[]> {
  const supabase = createClient();
  await releaseExpiredPromoCodes();
  const { data, error } = await supabase
    .from("promo_codes")
    .select(PROMO_PRIVILEGE_SELECT)
    .not("claimed_by", "is", null)
    .order("claimed_at", { ascending: false });
  if (error) return [];
  return (data ?? []).map((r) => mapMemberPromoCodeRow(r as PromoCodeWithPrivilegeRow));
}

export async function fetchMemberPromoCodeForPrivilege(
  privilegeId: string
): Promise<MemberPromoCode | null> {
  const supabase = createClient();
  await releaseExpiredPromoCodes();
  const { data, error } = await supabase
    .from("promo_codes")
    .select(PROMO_PRIVILEGE_SELECT)
    .eq("privilege_id", privilegeId)
    .order("claimed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return mapMemberPromoCodeRow(data as PromoCodeWithPrivilegeRow);
}

export type ClaimPromoCodeResult =
  | { ok: true; code: PromoCode }
  | { ok: false; error: string };

export async function claimPromoCode(privilegeId: string): Promise<ClaimPromoCodeResult> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("claim_promo_code", {
    p_privilege_id: privilegeId,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, code: mapPromoCodeRow(data as PromoCodeRow) };
}

export type RedeemPromoCodeResult =
  | { ok: true; code: PromoCode }
  | { ok: false; error: string };

export async function redeemPromoCode(codeId: string): Promise<RedeemPromoCodeResult> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("redeem_promo_code", {
    p_code_id: codeId,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, code: mapPromoCodeRow(data as PromoCodeRow) };
}

export async function fetchPromoCodeStats(privilegeId: string): Promise<PromoCodeStats> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("promo_code_stats", {
    p_privilege_id: privilegeId,
  });
  if (error || !data?.[0]) {
    return { total: 0, available: 0, claimed: 0, redeemed: 0 };
  }
  return mapPromoCodeStats(data[0]);
}

export async function fetchPromoCodesForPrivilege(
  privilegeId: string,
  limit = 50
): Promise<PromoCode[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("promo_codes")
    .select("*")
    .eq("privilege_id", privilegeId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []).map((r) => mapPromoCodeRow(r as PromoCodeRow));
}

export type BulkInsertResult = { inserted: number; skipped: number; error?: string };

export async function bulkInsertPromoCodes(
  privilegeId: string,
  codes: string[]
): Promise<BulkInsertResult> {
  if (codes.length === 0) return { inserted: 0, skipped: 0 };

  const supabase = createClient();
  const rows = codes.map((code) => ({
    privilege_id: privilegeId,
    code,
    status: "available" as const,
  }));

  const { data, error } = await supabase
    .from("promo_codes")
    .upsert(rows, { onConflict: "privilege_id,code", ignoreDuplicates: true })
    .select("id");

  if (error) return { inserted: 0, skipped: codes.length, error: error.message };
  const inserted = data?.length ?? 0;
  return { inserted, skipped: codes.length - inserted };
}

export async function updatePrivilegeCodeMode(
  privilegeId: string,
  codeMode: "shared" | "unique_pool"
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("privileges")
    .update({ code_mode: codeMode })
    .eq("id", privilegeId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
