import type {
  ClubEvent,
  CreateEventInput,
  CreatePartnerInput,
  CreatePrivilegeCategoryInput,
  CreatePrivilegeInput,
  EventRegistrant,
  EventRegistration,
  EventRegistrationLog,
  MemberPromoCode,
  Privilege,
  PrivilegeCategory,
  PromoCode,
  PromoCodeStats,
  ShopPartner,
} from "@/lib/types";
import { ensureEventSlug, isUpcomingOrOngoing } from "@/lib/events";
import { createClient } from "./client";
import { uploadEventCover, uploadPartnerLogo, uploadPrivilegeCover } from "./storage";
import {
  mapCommunityRow,
  mapEventRegistrantRow,
  mapEventRegistrationLogRow,
  mapEventRegistrationRow,
  mapEventRow,
  mapMemberPromoCodeRow,
  mapPartnerRow,
  mapPrivilegeCategoryRow,
  mapPrivilegeRow,
  mapPromoCodeRow,
  mapPromoCodeStats,
  type CommunityMomentRow,
  type EventRegistrantRow,
  type EventRegistrationLogRow,
  type EventRegistrationRow,
  type EventRow,
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

const EVENT_REGISTRANT_SELECT =
  "id, event_id, member_id, registered_at, cancelled_at, profiles!event_registrations_member_id_fkey(member_id, full_name, email, phone)";

const EVENT_LOG_SELECT =
  "id, event_id, member_id, action, occurred_at, profiles!event_registration_logs_member_id_fkey(member_id, full_name)";

function eventWriteError(message: string): string {
  if (/events_slug_unique|duplicate key value/i.test(message)) {
    return "That link slug is already in use.";
  }
  if (/events_ends_after_start/i.test(message)) {
    return "End time must be after the start time.";
  }
  if (/events_slug_format/i.test(message)) {
    return "Slug can use lowercase letters, numbers, and hyphens only.";
  }
  if (/row-level security/i.test(message)) {
    return "Registration is closed for this event.";
  }
  return message;
}

function eventPatch(input: Partial<CreateEventInput>): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.slug !== undefined) patch.slug = ensureEventSlug(input.title ?? "", input.slug);
  if (input.description !== undefined) patch.description = input.description.trim() || null;
  if (input.location !== undefined) patch.location = input.location.trim() || null;
  if (input.coverImage !== undefined) patch.cover_image = input.coverImage.trim() || null;
  if (input.startsAt !== undefined) patch.starts_at = input.startsAt;
  if (input.endsAt !== undefined) patch.ends_at = input.endsAt || null;
  if (input.isActive !== undefined) patch.is_active = input.isActive;
  return patch;
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

export async function fetchUpcomingEvents(): Promise<ClubEvent[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("is_active", true)
    .order("starts_at", { ascending: true });
  if (error) return [];
  return (data ?? [])
    .map((row) => mapEventRow(row as EventRow))
    .filter((event) => isUpcomingOrOngoing(event));
}

export async function fetchAllEvents(): Promise<ClubEvent[]> {
  const supabase = createClient();
  let query = supabase.from("events").select("*");
  for (const { column, ascending } of ADMIN_ACTIVE_CREATED_ORDER) {
    query = query.order(column, { ascending });
  }
  const { data, error } = await query;
  if (error) return [];
  return (data ?? []).map((row) => mapEventRow(row as EventRow));
}

export async function fetchEventBySlug(slug: string): Promise<ClubEvent | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from("events").select("*").eq("slug", slug).maybeSingle();
  if (error || !data) return null;
  return mapEventRow(data as EventRow);
}

export async function createEvent(input: CreateEventInput): Promise<MutateResult<ClubEvent>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("events")
    .insert({
      title: input.title.trim(),
      slug: ensureEventSlug(input.title, input.slug),
      description: input.description?.trim() || null,
      location: input.location?.trim() || null,
      cover_image: input.coverImage?.trim() || null,
      starts_at: input.startsAt,
      ends_at: input.endsAt || null,
      is_active: input.isActive ?? true,
    })
    .select("*")
    .single();
  if (error) return { ok: false, error: eventWriteError(error.message) };
  return { ok: true, data: mapEventRow(data as EventRow) };
}

export async function updateEvent(
  id: string,
  input: Partial<CreateEventInput>
): Promise<MutateResult<ClubEvent>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("events")
    .update(eventPatch(input))
    .eq("id", id)
    .select("*")
    .single();
  if (error) return { ok: false, error: eventWriteError(error.message) };
  return { ok: true, data: mapEventRow(data as EventRow) };
}

export async function createEventWithCover(
  input: CreateEventInput,
  coverFile?: File | null
): Promise<MutateResult<ClubEvent>> {
  const created = await createEvent(input);
  if (!created.ok || !coverFile) return created;

  const uploaded = await uploadEventCover(created.data.id, coverFile);
  if (!uploaded.ok) {
    return { ok: false, error: `Event created but cover upload failed: ${uploaded.error}` };
  }
  return updateEvent(created.data.id, { coverImage: uploaded.url });
}

export async function updateEventWithCover(
  id: string,
  input: Partial<CreateEventInput>,
  coverFile?: File | null
): Promise<MutateResult<ClubEvent>> {
  if (coverFile) {
    const uploaded = await uploadEventCover(id, coverFile);
    if (!uploaded.ok) return { ok: false, error: uploaded.error };
    input = { ...input, coverImage: uploaded.url };
  }
  return updateEvent(id, input);
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

export async function registerForEvent(eventId: string): Promise<MutateResult<EventRegistration>> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to register." };

  const existing = await fetchMyEventRegistration(eventId);
  if (existing && !existing.cancelledAt) {
    return { ok: true, data: existing };
  }

  if (existing) {
    const { data, error } = await supabase
      .from("event_registrations")
      .update({ cancelled_at: null, registered_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) return { ok: false, error: eventWriteError(error.message) };
    return { ok: true, data: mapEventRegistrationRow(data as EventRegistrationRow) };
  }

  const { data, error } = await supabase
    .from("event_registrations")
    .insert({ event_id: eventId, member_id: user.id })
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
