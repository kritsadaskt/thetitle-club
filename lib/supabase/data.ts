import type {
  CreatePartnerInput,
  CreatePrivilegeCategoryInput,
  CreatePrivilegeInput,
  MemberPromoCode,
  Privilege,
  PrivilegeCategory,
  PromoCode,
  PromoCodeStats,
  ShopPartner,
} from "@/lib/types";
import { createClient } from "./client";
import { uploadPartnerLogo, uploadPrivilegeCover } from "./storage";
import {
  mapCommunityRow,
  mapMemberPromoCodeRow,
  mapPartnerRow,
  mapPrivilegeCategoryRow,
  mapPrivilegeRow,
  mapPromoCodeRow,
  mapPromoCodeStats,
  type CommunityMomentRow,
  type PartnerRow,
  type PrivilegeCategoryRow,
  type PrivilegeRow,
  type PromoCodeRow,
  type PromoCodeWithPrivilegeRow,
} from "./mappers";
import type { CommunityMoment } from "@/lib/types";
import {
  MEMBER_PROMO_PRIVILEGE_SELECT,
  PRIVILEGE_SELECT,
  PUBLIC_PRIVILEGE_SELECT,
} from "./queries";

/** Member/public: only privileges whose partner is active */

const ADMIN_ACTIVE_CREATED_ORDER = [
  { column: "is_active", ascending: false },
  { column: "created_at", ascending: false },
] as const;

const PROMO_PRIVILEGE_SELECT =
  "*, privileges(title, discount_label, partner_name, partner_logo, partners(name, logo_url))";

export async function fetchActivePrivileges(): Promise<Privilege[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("privileges")
    .select(PUBLIC_PRIVILEGE_SELECT)
    .eq("is_active", true)
    .eq("partners.is_active", true)
    .order("sort_order");
  if (error) return [];
  return (data ?? []).map((r) => mapPrivilegeRow(r as PrivilegeRow));
}

export async function fetchAllPrivileges(): Promise<Privilege[]> {
  const supabase = createClient();
  let query = supabase.from("privileges").select(PRIVILEGE_SELECT);
  for (const { column, ascending } of ADMIN_ACTIVE_CREATED_ORDER) {
    query = query.order(column, { ascending });
  }
  const { data, error } = await query;
  if (error) return [];
  return (data ?? []).map((r) => mapPrivilegeRow(r as PrivilegeRow));
}

export async function fetchPrivilegesByPartner(partnerId: string): Promise<Privilege[]> {
  const supabase = createClient();
  let query = supabase.from("privileges").select(PRIVILEGE_SELECT).eq("partner_id", partnerId);
  for (const { column, ascending } of ADMIN_ACTIVE_CREATED_ORDER) {
    query = query.order(column, { ascending });
  }
  const { data, error } = await query;
  if (error) return [];
  return (data ?? []).map((r) => mapPrivilegeRow(r as PrivilegeRow));
}

export async function fetchPrivilegeById(id: string): Promise<Privilege | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("privileges")
    .select(PUBLIC_PRIVILEGE_SELECT)
    .eq("id", id)
    .eq("is_active", true)
    .eq("partners.is_active", true)
    .maybeSingle();
  if (error || !data) return null;
  return mapPrivilegeRow(data as PrivilegeRow);
}

export async function fetchAllPartners(): Promise<ShopPartner[]> {
  const supabase = createClient();
  let query = supabase.from("partners").select("*, privileges(count)");
  for (const { column, ascending } of ADMIN_ACTIVE_CREATED_ORDER) {
    query = query.order(column, { ascending });
  }
  const { data, error } = await query;
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

export async function createPartnerWithLogo(
  input: CreatePartnerInput,
  logoFile?: File | null
): Promise<MutateResult<ShopPartner>> {
  const created = await createPartner(input);
  if (!created.ok) return created;
  if (!logoFile) return created;

  const uploaded = await uploadPartnerLogo(created.data.id, logoFile);
  if (!uploaded.ok) {
    return { ok: false, error: `Partner created but logo upload failed: ${uploaded.error}` };
  }

  const updated = await updatePartner(created.data.id, { logoUrl: uploaded.url });
  return updated;
}

async function syncPartnerLogoOnPrivileges(partnerId: string, logoUrl: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("privileges").update({ partner_logo: logoUrl }).eq("partner_id", partnerId);
}

export async function updatePartnerWithLogo(
  id: string,
  input: Partial<CreatePartnerInput>,
  logoFile?: File | null
): Promise<MutateResult<ShopPartner>> {
  if (logoFile) {
    const uploaded = await uploadPartnerLogo(id, logoFile);
    if (!uploaded.ok) return { ok: false, error: uploaded.error };
    input = { ...input, logoUrl: uploaded.url };
  }
  const result = await updatePartner(id, input);
  if (!result.ok) return result;
  if (input.logoUrl) {
    await syncPartnerLogoOnPrivileges(id, input.logoUrl);
  }
  return result;
}

export async function createPrivilegeWithCover(
  partnerId: string,
  input: CreatePrivilegeInput,
  coverFile?: File | null
): Promise<MutateResult<Privilege>> {
  const created = await createPrivilege(partnerId, input);
  if (!created.ok) return created;
  if (!coverFile) return created;

  const uploaded = await uploadPrivilegeCover(created.data.id, coverFile);
  if (!uploaded.ok) {
    return { ok: false, error: `Privilege created but cover upload failed: ${uploaded.error}` };
  }

  return updatePrivilege(created.data.id, { coverImage: uploaded.url });
}

export async function updatePrivilegeCover(
  privilegeId: string,
  coverFile: File
): Promise<MutateResult<Privilege>> {
  const uploaded = await uploadPrivilegeCover(privilegeId, coverFile);
  if (!uploaded.ok) return { ok: false, error: uploaded.error };
  return updatePrivilege(privilegeId, { coverImage: uploaded.url });
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
      category_id: input.categoryId,
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

export async function updatePrivilege(
  id: string,
  input: Partial<CreatePrivilegeInput>
): Promise<MutateResult<Privilege>> {
  const supabase = createClient();
  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.summary !== undefined) patch.summary = input.summary.trim() || null;
  if (input.description !== undefined) patch.description = input.description.trim() || null;
  if (input.terms !== undefined) patch.terms = input.terms.trim() || null;
  if (input.howToRedeem !== undefined) patch.how_to_redeem = input.howToRedeem.trim() || null;
  if (input.categoryId !== undefined) patch.category_id = input.categoryId;
  if (input.discountLabel !== undefined) patch.discount_label = input.discountLabel.trim() || null;
  if (input.coverImage !== undefined) patch.cover_image = input.coverImage.trim() || null;
  if (input.validFrom !== undefined) patch.valid_from = input.validFrom;
  if (input.validUntil !== undefined) patch.valid_until = input.validUntil || null;
  if (input.isActive !== undefined) patch.is_active = input.isActive;
  if (input.sortOrder !== undefined) patch.sort_order = input.sortOrder;
  if (input.codeMode !== undefined) patch.code_mode = input.codeMode;

  const { data, error } = await supabase
    .from("privileges")
    .update(patch)
    .eq("id", id)
    .select(PRIVILEGE_SELECT)
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: mapPrivilegeRow(data as PrivilegeRow) };
}

export async function updatePrivilegeWithCover(
  id: string,
  input: Partial<CreatePrivilegeInput>,
  coverFile?: File | null
): Promise<MutateResult<Privilege>> {
  if (coverFile) {
    const uploaded = await uploadPrivilegeCover(id, coverFile);
    if (!uploaded.ok) return { ok: false, error: uploaded.error };
    input = { ...input, coverImage: uploaded.url };
  }
  return updatePrivilege(id, input);
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
    .select(MEMBER_PROMO_PRIVILEGE_SELECT)
    .not("claimed_by", "is", null)
    .eq("privileges.is_active", true)
    .eq("privileges.partners.is_active", true)
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
    .select(MEMBER_PROMO_PRIVILEGE_SELECT)
    .eq("privilege_id", privilegeId)
    .eq("privileges.is_active", true)
    .eq("privileges.partners.is_active", true)
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

export async function fetchAllPrivilegeCategories(): Promise<PrivilegeCategory[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("privilege_categories")
    .select("*")
    .order("sort_order")
    .order("label");
  if (error) return [];
  return (data ?? []).map((r) => mapPrivilegeCategoryRow(r as PrivilegeCategoryRow));
}

export async function createPrivilegeCategory(
  input: CreatePrivilegeCategoryInput
): Promise<MutateResult<PrivilegeCategory>> {
  const supabase = createClient();
  const key = input.key.trim().toLowerCase().replace(/\s+/g, "_");
  const { data, error } = await supabase
    .from("privilege_categories")
    .insert({
      label: input.label.trim(),
      key,
      color: input.color.trim(),
      sort_order: input.sortOrder ?? 0,
    })
    .select("*")
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: mapPrivilegeCategoryRow(data as PrivilegeCategoryRow) };
}

export async function updatePrivilegeCategory(
  id: number,
  input: Partial<CreatePrivilegeCategoryInput>
): Promise<MutateResult<PrivilegeCategory>> {
  const supabase = createClient();
  const patch: Record<string, unknown> = {};
  if (input.label !== undefined) patch.label = input.label.trim();
  if (input.key !== undefined) patch.key = input.key.trim().toLowerCase().replace(/\s+/g, "_");
  if (input.color !== undefined) patch.color = input.color.trim();
  if (input.sortOrder !== undefined) patch.sort_order = input.sortOrder;

  const { data, error } = await supabase
    .from("privilege_categories")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: mapPrivilegeCategoryRow(data as PrivilegeCategoryRow) };
}

export async function deletePrivilegeCategory(id: number): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await supabase.from("privilege_categories").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
