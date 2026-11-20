import type {
  ClubEvent,
  CreateEventInput,
  CreateEventSurveyQuestionInput,
  CreateEventVenueInput,
  CreatePartnerInput,
  CreatePrivilegeCategoryInput,
  CreatePrivilegeInput,
  EventRegistrant,
  EventRegistration,
  EventRegistrationLog,
  EventSurveyAnswerInput,
  EventSurveyQuestion,
  EventSurveyQuestionSummary,
  EventSurveyResponse,
  EventVenue,
  EventVenueSurvey,
  EventVenueSurveySummary,
  MemberPromoCode,
  Privilege,
  PrivilegeCategory,
  PromoCode,
  PromoCodeStats,
  SharedRedeemPeriod,
  ShopPartner,
  UpdateEventSurveyQuestionInput,
} from "@/lib/types";
import {
  ensureEventSlug,
  ensureVenueSlug,
  eventEarliestStartsAt,
  isEventUpcomingOrOngoing,
} from "@/lib/events";
import { bangkokTodayIsoDate, isPrivilegeInValidityWindow } from "@/lib/utils";
import { createClient } from "./client";
import { uploadPartnerLogo, uploadPrivilegeCover, uploadVenueBanner } from "./storage";
import {
  mapCommunityRow,
  mapEventRegistrantRow,
  mapEventRegistrationLogRow,
  mapEventRegistrationRow,
  mapEventRow,
  mapEventSurveyQuestionRow,
  mapEventSurveyResponseRow,
  mapEventVenueRow,
  mapEventVenueSurveyRow,
  mapMemberPromoCodeRow,
  mapPartnerRow,
  mapPrivilegeCategoryRow,
  mapPrivilegeRow,
  mapPromoCodeRow,
  mapPromoCodeStats,
  sanitizeMapLocations,
  serializeSurveyOptions,
  type CommunityMomentRow,
  type EventRegistrantRow,
  type EventRegistrationLogRow,
  type EventRegistrationRow,
  type EventRow,
  type EventSurveyQuestionRow,
  type EventSurveyResponseRow,
  type EventVenueRow,
  type EventVenueSurveyRow,
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

export async function fetchActivePrivileges(locale = "en"): Promise<Privilege[]> {
  const supabase = createClient();
  const today = bangkokTodayIsoDate();
  const { data, error } = await supabase
    .from("privileges")
    .select(PUBLIC_PRIVILEGE_SELECT)
    .eq("is_active", true)
    .eq("partners.is_active", true)
    .lte("valid_from", today)
    .or(`valid_until.is.null,valid_until.gte.${today}`)
    .order("sort_order");
  if (error) return [];
  return (data ?? [])
    .map((r) => mapPrivilegeRow(r as PrivilegeRow, locale))
    .filter((p) => isPrivilegeInValidityWindow(p.validFrom, p.validUntil, today));
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

export async function fetchPrivilegeById(
  id: string,
  locale = "en"
): Promise<Privilege | null> {
  const supabase = createClient();
  const today = bangkokTodayIsoDate();
  const { data, error } = await supabase
    .from("privileges")
    .select(PUBLIC_PRIVILEGE_SELECT)
    .eq("id", id)
    .eq("is_active", true)
    .eq("partners.is_active", true)
    .lte("valid_from", today)
    .or(`valid_until.is.null,valid_until.gte.${today}`)
    .maybeSingle();
  if (error || !data) return null;
  const privilege = mapPrivilegeRow(data as PrivilegeRow, locale);
  if (!isPrivilegeInValidityWindow(privilege.validFrom, privilege.validUntil, today)) {
    return null;
  }
  return privilege;
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
      i18n: input.i18n ?? {},
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
  if (input.i18n !== undefined) patch.i18n = input.i18n;

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
      shared_redeem_limit:
        input.codeMode === "unique_pool" ? null : normalizeSharedRedeemLimit(input.sharedRedeemLimit),
      shared_redeem_period:
        input.codeMode === "unique_pool"
          ? null
          : normalizeSharedRedeemPeriod(input.sharedRedeemLimit, input.sharedRedeemPeriod),
      map_locations: sanitizeMapLocations(input.mapLocations),
      i18n: input.i18n ?? {},
    })
    .select(PRIVILEGE_SELECT)
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: mapPrivilegeRow(data as PrivilegeRow) };
}

function normalizeSharedRedeemLimit(limit?: number | null): number | null {
  if (limit == null || !Number.isFinite(limit) || limit <= 0) return null;
  return Math.floor(limit);
}

function normalizeSharedRedeemPeriod(
  limit?: number | null,
  period?: SharedRedeemPeriod | null
): SharedRedeemPeriod | null {
  const normalizedLimit = normalizeSharedRedeemLimit(limit);
  if (normalizedLimit == null) return null;
  if (period === "day" || period === "week" || period === "month" || period === "year") {
    return period;
  }
  return "month";
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
  if (input.codeMode === "unique_pool") {
    patch.shared_redeem_limit = null;
    patch.shared_redeem_period = null;
  } else if (
    input.sharedRedeemLimit !== undefined ||
    input.sharedRedeemPeriod !== undefined ||
    input.codeMode === "shared"
  ) {
    const limit = normalizeSharedRedeemLimit(input.sharedRedeemLimit);
    patch.shared_redeem_limit = limit;
    patch.shared_redeem_period = normalizeSharedRedeemPeriod(limit, input.sharedRedeemPeriod);
  }
  if (input.mapLocations !== undefined) {
    patch.map_locations = sanitizeMapLocations(input.mapLocations);
  }
  if (input.i18n !== undefined) patch.i18n = input.i18n;

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

export async function fetchPublishedCommunity(locale = "en"): Promise<CommunityMoment[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("community_moments")
    .select("*")
    .eq("is_published", true)
    .order("sort_order");
  if (error) return [];
  return (data ?? []).map((r) => mapCommunityRow(r as CommunityMomentRow, locale));
}

export async function releaseExpiredPromoCodes(): Promise<void> {
  const supabase = createClient();
  await supabase.rpc("release_expired_promo_codes");
}

export async function fetchMyPromoCodes(locale = "en"): Promise<MemberPromoCode[]> {
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
  return (data ?? []).map((r) =>
    mapMemberPromoCodeRow(r as PromoCodeWithPrivilegeRow, locale)
  );
}

export async function fetchMemberPromoCodeForPrivilege(
  privilegeId: string,
  locale = "en"
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
  return mapMemberPromoCodeRow(data as PromoCodeWithPrivilegeRow, locale);
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

export async function redeemPromoCode(
  codeId: string,
  options?: { method?: "qr" | "visual" }
): Promise<RedeemPromoCodeResult> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("redeem_promo_code", {
    p_code_id: codeId,
  });
  if (error) return { ok: false, error: error.message };
  const code = mapPromoCodeRow(data as PromoCodeRow);

  const { data: userData } = await supabase.auth.getUser();
  const memberId = userData.user?.id;
  if (memberId) {
    await supabase.from("redemption_logs").insert({
      member_id: memberId,
      privilege_id: code.privilegeId,
      method: options?.method ?? "qr",
    });
  }

  return { ok: true, code };
}

export type SharedRedeemQuota = {
  allowed: boolean;
  used: number;
  limit: number | null;
  period: SharedRedeemPeriod | null;
  redemptionId?: string | null;
};

function mapSharedRedeemQuota(raw: unknown): SharedRedeemQuota {
  const row = (raw ?? {}) as Record<string, unknown>;
  const period = row.period;
  return {
    allowed: Boolean(row.allowed),
    used: typeof row.used === "number" ? row.used : Number(row.used) || 0,
    limit:
      row.limit == null
        ? null
        : typeof row.limit === "number"
          ? row.limit
          : Number(row.limit) || null,
    period:
      period === "day" || period === "week" || period === "month" || period === "year"
        ? period
        : null,
    redemptionId:
      typeof row.redemption_id === "string" ? row.redemption_id : null,
  };
}

export type SharedRedeemResult =
  | { ok: true; quota: SharedRedeemQuota }
  | { ok: false; error: string; quota?: SharedRedeemQuota };

export async function getSharedRedeemQuota(
  privilegeId: string
): Promise<SharedRedeemResult> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_shared_redeem_quota", {
    p_privilege_id: privilegeId,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, quota: mapSharedRedeemQuota(data) };
}

export async function beginSharedRedeem(
  privilegeId: string
): Promise<SharedRedeemResult> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("begin_shared_redeem", {
    p_privilege_id: privilegeId,
  });
  if (error) return { ok: false, error: error.message };
  const quota = mapSharedRedeemQuota(data);
  if (!quota.allowed) {
    return { ok: false, error: "Shared redeem limit reached", quota };
  }
  return { ok: true, quota };
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
      i18n: input.i18n ?? {},
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
  if (input.i18n !== undefined) patch.i18n = input.i18n;

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

const EVENT_WITH_VENUES_SELECT = "*, event_venues(*)";

const EVENT_REGISTRANT_SELECT =
  "id, event_id, venue_id, member_id, registered_at, cancelled_at, profiles!event_registrations_member_id_fkey(member_id, full_name, email, phone), event_venues!event_registrations_venue_id_fkey(id, name, slug)";

const EVENT_LOG_SELECT =
  "id, event_id, venue_id, member_id, action, occurred_at, profiles!event_registration_logs_member_id_fkey(member_id, full_name), event_venues!event_registration_logs_venue_id_fkey(name)";

function eventWriteError(message: string): string {
  if (/events_slug_unique|event_venues_event_slug_unique|duplicate key value/i.test(message)) {
    return "That link slug is already in use.";
  }
  if (/events_ends_after_start|event_venues_ends_after_start/i.test(message)) {
    return "End time must be after the start time.";
  }
  if (/events_slug_format|event_venues_slug_format/i.test(message)) {
    return "Slug can use lowercase letters, numbers, and hyphens only.";
  }
  if (/venue does not belong to event/i.test(message)) {
    return "That location does not belong to this event.";
  }
  if (/row-level security/i.test(message)) {
    return "Registration is closed for this location.";
  }
  return message;
}

function eventMetaPatch(input: Partial<CreateEventInput>): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.slug !== undefined) patch.slug = ensureEventSlug(input.title ?? "", input.slug);
  if (input.description !== undefined) patch.description = input.description.trim() || null;
  if (input.isActive !== undefined) patch.is_active = input.isActive;
  if (input.i18n !== undefined) patch.i18n = input.i18n;
  return patch;
}

function venueInsertPayload(eventId: string, venue: CreateEventVenueInput, index: number) {
  return {
    event_id: eventId,
    slug: ensureVenueSlug(venue.name, venue.slug),
    name: venue.name.trim(),
    description: venue.description?.trim() || null,
    location: venue.location?.trim() || null,
    banner_image: venue.bannerImage?.trim() || null,
    starts_at: venue.startsAt,
    ends_at: venue.endsAt || null,
    sort_order: venue.sortOrder ?? index,
    i18n: venue.i18n ?? {},
  };
}

type EventWithVenuesRow = EventRow & { event_venues: EventVenueRow[] | null };

function mapEventWithVenues(row: EventWithVenuesRow, locale = "en"): ClubEvent {
  return mapEventRow(row, row.event_venues ?? [], locale);
}

async function fetchEventById(id: string): Promise<ClubEvent | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_WITH_VENUES_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return mapEventWithVenues(data as unknown as EventWithVenuesRow);
}

async function syncEventVenues(
  eventId: string,
  venues: CreateEventVenueInput[]
): Promise<{ ok: true; venues: EventVenue[] } | { ok: false; error: string }> {
  if (venues.length === 0) {
    return { ok: false, error: "Add at least one location." };
  }

  const supabase = createClient();
  const { data: existingRows, error: existingError } = await supabase
    .from("event_venues")
    .select("*")
    .eq("event_id", eventId);
  if (existingError) return { ok: false, error: eventWriteError(existingError.message) };

  const existing = (existingRows ?? []) as EventVenueRow[];
  const keepIds = new Set(venues.map((v) => v.id).filter(Boolean) as string[]);
  const toDelete = existing.filter((row) => !keepIds.has(row.id));

  for (const row of toDelete) {
    const { count, error: countError } = await supabase
      .from("event_registrations")
      .select("id", { count: "exact", head: true })
      .eq("venue_id", row.id)
      .is("cancelled_at", null);
    if (countError) return { ok: false, error: eventWriteError(countError.message) };
    if ((count ?? 0) > 0) {
      return {
        ok: false,
        error: `Cannot remove “${row.name}” while members are still registered there. Cancel those registrations first.`,
      };
    }
    const { error: deleteError } = await supabase.from("event_venues").delete().eq("id", row.id);
    if (deleteError) return { ok: false, error: eventWriteError(deleteError.message) };
  }

  const saved: EventVenue[] = [];
  for (let index = 0; index < venues.length; index++) {
    const venue = venues[index];
    const payload = venueInsertPayload(eventId, venue, index);
    if (venue.id) {
      const { data, error } = await supabase
        .from("event_venues")
        .update(payload)
        .eq("id", venue.id)
        .eq("event_id", eventId)
        .select("*")
        .single();
      if (error) return { ok: false, error: eventWriteError(error.message) };
      saved.push(mapEventVenueRow(data as EventVenueRow));
    } else {
      const { data, error } = await supabase.from("event_venues").insert(payload).select("*").single();
      if (error) return { ok: false, error: eventWriteError(error.message) };
      saved.push(mapEventVenueRow(data as EventVenueRow));
    }
  }

  return { ok: true, venues: saved };
}

/** Event ids the signed-in member is currently registered for. Cancelled rows are excluded. */
export async function fetchMyRegisteredEventIds(): Promise<Set<string>> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Set();

  const { data, error } = await supabase
    .from("event_registrations")
    .select("event_id")
    .eq("member_id", user.id)
    .is("cancelled_at", null);
  if (error || !data) return new Set();
  return new Set(data.map((row) => row.event_id as string));
}

/** Map of eventId → venueId for the member's active registrations. */
export async function fetchMyRegisteredVenueByEventId(): Promise<Map<string, string>> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Map();

  const { data, error } = await supabase
    .from("event_registrations")
    .select("event_id, venue_id")
    .eq("member_id", user.id)
    .is("cancelled_at", null);
  if (error || !data) return new Map();
  return new Map(data.map((row) => [row.event_id as string, row.venue_id as string]));
}

export async function fetchUpcomingEvents(locale = "en"): Promise<ClubEvent[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_WITH_VENUES_SELECT)
    .eq("is_active", true);
  if (error) return [];
  return (data ?? [])
    .map((row) => mapEventWithVenues(row as unknown as EventWithVenuesRow, locale))
    .filter((event) => isEventUpcomingOrOngoing(event))
    .sort((a, b) => {
      const aStart = eventEarliestStartsAt(a) ?? "";
      const bStart = eventEarliestStartsAt(b) ?? "";
      return aStart.localeCompare(bStart);
    });
}

export async function fetchAllEvents(): Promise<ClubEvent[]> {
  const supabase = createClient();
  let query = supabase.from("events").select(EVENT_WITH_VENUES_SELECT);
  for (const { column, ascending } of ADMIN_ACTIVE_CREATED_ORDER) {
    query = query.order(column, { ascending });
  }
  const { data, error } = await query;
  if (error) return [];
  return (data ?? []).map((row) => mapEventWithVenues(row as unknown as EventWithVenuesRow));
}

export async function fetchEventBySlug(
  slug: string,
  locale = "en"
): Promise<ClubEvent | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_WITH_VENUES_SELECT)
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) return null;
  return mapEventWithVenues(data as unknown as EventWithVenuesRow, locale);
}

export async function fetchEventVenue(
  eventSlug: string,
  venueSlug: string,
  locale = "en"
): Promise<{ event: ClubEvent; venue: EventVenue } | null> {
  const event = await fetchEventBySlug(eventSlug, locale);
  if (!event) return null;
  const venue = event.venues.find((v) => v.slug === venueSlug);
  if (!venue) return null;
  return { event, venue };
}

export async function createEvent(input: CreateEventInput): Promise<MutateResult<ClubEvent>> {
  if (!input.venues?.length) {
    return { ok: false, error: "Add at least one location." };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("events")
    .insert({
      title: input.title.trim(),
      slug: ensureEventSlug(input.title, input.slug),
      description: input.description?.trim() || null,
      is_active: input.isActive ?? true,
      i18n: input.i18n ?? {},
    })
    .select("*")
    .single();
  if (error) return { ok: false, error: eventWriteError(error.message) };

  const eventId = (data as EventRow).id;
  const synced = await syncEventVenues(eventId, input.venues);
  if (!synced.ok) {
    await supabase.from("events").delete().eq("id", eventId);
    return { ok: false, error: synced.error };
  }

  const full = await fetchEventById(eventId);
  if (!full) return { ok: false, error: "Event created but could not be reloaded." };
  return { ok: true, data: full };
}

export async function updateEvent(
  id: string,
  input: Partial<CreateEventInput>
): Promise<MutateResult<ClubEvent>> {
  const supabase = createClient();
  const meta = eventMetaPatch(input);
  if (Object.keys(meta).length > 0) {
    const { error } = await supabase.from("events").update(meta).eq("id", id);
    if (error) return { ok: false, error: eventWriteError(error.message) };
  }

  if (input.venues) {
    const synced = await syncEventVenues(id, input.venues);
    if (!synced.ok) return { ok: false, error: synced.error };
  }

  const full = await fetchEventById(id);
  if (!full) return { ok: false, error: "Event not found after update." };
  return { ok: true, data: full };
}

export type VenueBannerFiles = Record<string, File | null | undefined>;

/**
 * Create event + venues, then upload banners.
 * Keys in `bannerFiles` are venue slug (or temp key matching CreateEventVenueInput.slug).
 */
export async function createEventWithVenues(
  input: CreateEventInput,
  bannerFiles?: VenueBannerFiles
): Promise<MutateResult<ClubEvent>> {
  const created = await createEvent(input);
  if (!created.ok) return created;
  if (!bannerFiles) return created;

  const venues = [...created.data.venues];
  for (let i = 0; i < venues.length; i++) {
    const venue = venues[i];
    const file = bannerFiles[venue.slug] ?? bannerFiles[input.venues[i]?.slug ?? ""];
    if (!file) continue;
    const uploaded = await uploadVenueBanner(created.data.id, venue.id, file);
    if (!uploaded.ok) {
      return { ok: false, error: `Event created but banner upload failed: ${uploaded.error}` };
    }
    const { error } = await createClient()
      .from("event_venues")
      .update({ banner_image: uploaded.url })
      .eq("id", venue.id);
    if (error) return { ok: false, error: eventWriteError(error.message) };
  }

  const full = await fetchEventById(created.data.id);
  if (!full) return created;
  return { ok: true, data: full };
}

export async function updateEventWithVenues(
  id: string,
  input: Partial<CreateEventInput>,
  bannerFiles?: VenueBannerFiles
): Promise<MutateResult<ClubEvent>> {
  const updated = await updateEvent(id, input);
  if (!updated.ok) return updated;
  if (!bannerFiles || !input.venues) return updated;

  for (const venue of updated.data.venues) {
    const file = bannerFiles[venue.slug] ?? (venue.id ? bannerFiles[venue.id] : undefined);
    if (!file) continue;
    const uploaded = await uploadVenueBanner(id, venue.id, file);
    if (!uploaded.ok) return { ok: false, error: uploaded.error };
    const { error } = await createClient()
      .from("event_venues")
      .update({ banner_image: uploaded.url })
      .eq("id", venue.id);
    if (error) return { ok: false, error: eventWriteError(error.message) };
  }

  const full = await fetchEventById(id);
  if (!full) return updated;
  return { ok: true, data: full };
}

export async function fetchMyEventRegistration(eventId: string): Promise<EventRegistration | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("event_registrations")
    .select("*")
    .eq("event_id", eventId)
    .eq("member_id", user.id)
    .maybeSingle();
  if (error || !data) return null;
  return mapEventRegistrationRow(data as EventRegistrationRow);
}

export async function registerForEvent(
  eventId: string,
  venueId: string
): Promise<MutateResult<EventRegistration>> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to register." };

  const existing = await fetchMyEventRegistration(eventId);
  if (existing && !existing.cancelledAt) {
    if (existing.venueId === venueId) {
      return { ok: true, data: existing };
    }
    return {
      ok: false,
      error: "You are already registered at another location for this event. Cancel that registration first.",
    };
  }

  if (existing) {
    const { data, error } = await supabase
      .from("event_registrations")
      .update({
        cancelled_at: null,
        registered_at: new Date().toISOString(),
        venue_id: venueId,
      })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) return { ok: false, error: eventWriteError(error.message) };
    return { ok: true, data: mapEventRegistrationRow(data as EventRegistrationRow) };
  }

  const { data, error } = await supabase
    .from("event_registrations")
    .insert({ event_id: eventId, venue_id: venueId, member_id: user.id })
    .select("*")
    .single();
  if (error) return { ok: false, error: eventWriteError(error.message) };
  return { ok: true, data: mapEventRegistrationRow(data as EventRegistrationRow) };
}

export async function cancelEventRegistration(eventId: string): Promise<MutateResult<EventRegistration>> {
  const supabase = createClient();
  const existing = await fetchMyEventRegistration(eventId);
  if (!existing || existing.cancelledAt) {
    return { ok: false, error: "You are not registered for this event." };
  }

  const { data, error } = await supabase
    .from("event_registrations")
    .update({ cancelled_at: new Date().toISOString() })
    .eq("id", existing.id)
    .select("*")
    .single();
  if (error) return { ok: false, error: eventWriteError(error.message) };
  return { ok: true, data: mapEventRegistrationRow(data as EventRegistrationRow) };
}

export async function fetchEventRegistrants(
  eventId: string
): Promise<{ rows: EventRegistrant[]; error?: string }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("event_registrations")
    .select(EVENT_REGISTRANT_SELECT)
    .eq("event_id", eventId)
    .is("cancelled_at", null)
    .order("registered_at", { ascending: true });
  if (error) return { rows: [], error: error.message };
  return { rows: (data ?? []).map((row) => mapEventRegistrantRow(row as unknown as EventRegistrantRow)) };
}

export async function fetchEventRegistrationLogs(
  eventId: string
): Promise<{ rows: EventRegistrationLog[]; error?: string }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("event_registration_logs")
    .select(EVENT_LOG_SELECT)
    .eq("event_id", eventId)
    .order("occurred_at", { ascending: true });
  if (error) return { rows: [], error: error.message };
  return { rows: (data ?? []).map((row) => mapEventRegistrationLogRow(row as unknown as EventRegistrationLogRow)) };
}

function surveyWriteError(message: string): string {
  if (/already submitted/i.test(message)) return "You have already submitted this survey.";
  if (/only registered/i.test(message)) return "Only members registered at this location can submit.";
  if (/not open yet/i.test(message)) return "The survey is not open yet.";
  if (/not active/i.test(message)) return "The survey is not open.";
  if (/membership must be active/i.test(message)) return "Your membership must be active.";
  if (/cannot delete a question/i.test(message)) return "Cannot delete a question that already has answers.";
  if (/cannot change type/i.test(message)) return "Cannot change the type of a question that already has answers.";
  if (/cannot remove an option/i.test(message)) return "Cannot remove an option that already has answers.";
  if (/at least 2 options/i.test(message)) return "Single-choice questions need at least 2 options.";
  if (/prompt is required/i.test(message)) return "Question text is required.";
  return message;
}

export async function fetchVenueSurvey(venueId: string): Promise<EventVenueSurvey | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("event_venue_surveys")
    .select("*")
    .eq("venue_id", venueId)
    .maybeSingle();
  if (error || !data) return null;
  return mapEventVenueSurveyRow(data as EventVenueSurveyRow);
}

export async function upsertVenueSurveyActive(
  venueId: string,
  eventId: string,
  isActive: boolean
): Promise<MutateResult<EventVenueSurvey>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("event_venue_surveys")
    .upsert(
      { venue_id: venueId, event_id: eventId, is_active: isActive },
      { onConflict: "venue_id" }
    )
    .select("*")
    .single();
  if (error) return { ok: false, error: surveyWriteError(error.message) };
  return { ok: true, data: mapEventVenueSurveyRow(data as EventVenueSurveyRow) };
}

export async function fetchVenueSurveyQuestions(
  venueId: string,
  locale = "en"
): Promise<EventSurveyQuestion[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("event_survey_questions")
    .select("*")
    .eq("venue_id", venueId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error || !data) return [];

  const questionIds = data.map((row) => (row as EventSurveyQuestionRow).id);
  const answered = new Set<string>();
  if (questionIds.length > 0) {
    const { data: answerRows } = await supabase
      .from("event_survey_answers")
      .select("question_id")
      .in("question_id", questionIds);
    for (const row of answerRows ?? []) {
      const qid = (row as { question_id: string }).question_id;
      if (qid) answered.add(qid);
    }
  }

  return data.map((row) => {
    const mapped = mapEventSurveyQuestionRow(row as EventSurveyQuestionRow, locale);
    return { ...mapped, hasAnswers: answered.has(mapped.id) };
  });
}

export async function createSurveyQuestion(
  venueId: string,
  input: CreateEventSurveyQuestionInput
): Promise<MutateResult<EventSurveyQuestion>> {
  const supabase = createClient();
  const options =
    input.questionType === "single" ? serializeSurveyOptions(input.options) : [];
  const { data, error } = await supabase
    .from("event_survey_questions")
    .insert({
      venue_id: venueId,
      prompt: input.prompt.trim(),
      question_type: input.questionType,
      options,
      required: input.required ?? true,
      sort_order: input.sortOrder ?? 0,
      i18n: input.i18n ?? {},
    })
    .select("*")
    .single();
  if (error) return { ok: false, error: surveyWriteError(error.message) };
  return { ok: true, data: mapEventSurveyQuestionRow(data as EventSurveyQuestionRow) };
}

export async function updateSurveyQuestion(
  questionId: string,
  input: UpdateEventSurveyQuestionInput
): Promise<MutateResult<EventSurveyQuestion>> {
  const supabase = createClient();
  const patch: Record<string, unknown> = {};
  if (input.prompt !== undefined) patch.prompt = input.prompt.trim();
  if (input.questionType !== undefined) patch.question_type = input.questionType;
  if (input.required !== undefined) patch.required = input.required;
  if (input.sortOrder !== undefined) patch.sort_order = input.sortOrder;
  if (input.i18n !== undefined) patch.i18n = input.i18n;
  if (input.questionType === "single") {
    patch.options = serializeSurveyOptions(input.options);
  } else if (input.questionType !== undefined) {
    patch.options = [];
  } else if (input.options !== undefined) {
    patch.options = serializeSurveyOptions(input.options);
  }

  const { data, error } = await supabase
    .from("event_survey_questions")
    .update(patch)
    .eq("id", questionId)
    .select("*")
    .single();
  if (error) return { ok: false, error: surveyWriteError(error.message) };
  return { ok: true, data: mapEventSurveyQuestionRow(data as EventSurveyQuestionRow) };
}

export async function deleteSurveyQuestion(questionId: string): Promise<MutateResult<true>> {
  const supabase = createClient();
  const { error } = await supabase.from("event_survey_questions").delete().eq("id", questionId);
  if (error) return { ok: false, error: surveyWriteError(error.message) };
  return { ok: true, data: true };
}

export async function reorderSurveyQuestions(
  venueId: string,
  orderedIds: string[]
): Promise<MutateResult<true>> {
  const supabase = createClient();
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from("event_survey_questions")
      .update({ sort_order: i })
      .eq("id", orderedIds[i])
      .eq("venue_id", venueId);
    if (error) return { ok: false, error: surveyWriteError(error.message) };
  }
  return { ok: true, data: true };
}

export async function fetchMyVenueSurveyResponse(
  venueId: string
): Promise<EventSurveyResponse | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("event_survey_responses")
    .select("*, event_survey_answers(*)")
    .eq("venue_id", venueId)
    .eq("member_id", user.id)
    .maybeSingle();
  if (error || !data) return null;
  return mapEventSurveyResponseRow(data as unknown as EventSurveyResponseRow);
}

export async function submitVenueSurvey(
  venueId: string,
  answers: EventSurveyAnswerInput[]
): Promise<MutateResult<{ responseId: string }>> {
  const supabase = createClient();
  const payload = answers.map((a) => ({
    questionId: a.questionId,
    ...(a.rating !== undefined ? { rating: a.rating } : {}),
    ...(a.optionId !== undefined ? { optionId: a.optionId } : {}),
    ...(a.yesno !== undefined ? { yesno: a.yesno } : {}),
    ...(a.text !== undefined ? { text: a.text } : {}),
  }));
  const { data, error } = await supabase.rpc("submit_venue_survey", {
    p_venue_id: venueId,
    p_answers: payload,
  });
  if (error) return { ok: false, error: surveyWriteError(error.message) };
  return { ok: true, data: { responseId: data as string } };
}

export async function fetchVenueSurveyResponses(
  venueId: string
): Promise<{ rows: EventSurveyResponse[]; error?: string }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("event_survey_responses")
    .select(
      "*, profiles!event_survey_responses_member_id_fkey(member_id, full_name, email), event_survey_answers(*)"
    )
    .eq("venue_id", venueId)
    .order("submitted_at", { ascending: true });
  if (error) return { rows: [], error: error.message };
  return {
    rows: (data ?? []).map((row) =>
      mapEventSurveyResponseRow(row as unknown as EventSurveyResponseRow)
    ),
  };
}

export async function fetchVenueSurveySummary(
  venueId: string
): Promise<EventVenueSurveySummary> {
  const questions = await fetchVenueSurveyQuestions(venueId, "en");
  const { rows } = await fetchVenueSurveyResponses(venueId);

  const questionSummaries: EventSurveyQuestionSummary[] = questions.map((q) => {
    const answers = rows.flatMap((r) =>
      r.answers
        .filter((a) => a.questionId === q.id)
        .map((a) => ({ answer: a, response: r }))
    );
    const base: EventSurveyQuestionSummary = {
      questionId: q.id,
      prompt: q.prompt,
      questionType: q.questionType,
      responseCount: answers.length,
    };

    if (q.questionType === "rating") {
      const dist: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      let sum = 0;
      for (const { answer } of answers) {
        const v = answer.ratingValue;
        if (v && v >= 1 && v <= 5) {
          dist[v as 1 | 2 | 3 | 4 | 5] += 1;
          sum += v;
        }
      }
      return {
        ...base,
        averageRating: answers.length ? sum / answers.length : undefined,
        ratingDistribution: dist,
      };
    }

    if (q.questionType === "single") {
      const counts = new Map<string, { label: string; count: number }>();
      for (const opt of q.options) {
        counts.set(opt.id, { label: opt.label, count: 0 });
      }
      for (const { answer } of answers) {
        if (!answer.optionId) continue;
        const existing = counts.get(answer.optionId);
        if (existing) existing.count += 1;
        else {
          counts.set(answer.optionId, {
            label: answer.optionLabelSnapshot ?? answer.optionId,
            count: 1,
          });
        }
      }
      return {
        ...base,
        optionCounts: [...counts.entries()].map(([optionId, v]) => ({
          optionId,
          label: v.label,
          count: v.count,
        })),
      };
    }

    if (q.questionType === "yesno") {
      let yesCount = 0;
      let noCount = 0;
      for (const { answer } of answers) {
        if (answer.yesnoValue === true) yesCount += 1;
        else if (answer.yesnoValue === false) noCount += 1;
      }
      return { ...base, yesCount, noCount };
    }

    return {
      ...base,
      textAnswers: answers
        .filter(({ answer }) => Boolean(answer.textValue))
        .map(({ answer, response }) => ({
          memberName: response.fullName ?? response.memberCode ?? "Member",
          text: answer.textValue ?? "",
          submittedAt: response.submittedAt,
        })),
    };
  });

  return {
    venueId,
    responseCount: rows.length,
    questions: questionSummaries,
  };
}
