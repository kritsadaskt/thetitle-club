import type {
  ClubEvent,
  CommunityMoment,
  EventRegistrant,
  EventRegistration,
  EventRegistrationAction,
  EventRegistrationLog,
  EventSurveyAnswer,
  EventSurveyOption,
  EventSurveyQuestion,
  EventSurveyQuestionType,
  EventSurveyResponse,
  EventVenue,
  EventVenueSurvey,
  Member,
  MemberPromoCode,
  Privilege,
  PrivilegeMapLocation,
  PromoCode,
  PromoCodeStats,
  ShopPartner,
} from "@/lib/types";
import { sortedEventVenues } from "@/lib/events";
import type { CodeMode, I18nLocaleMap, MemberStatus, PrivilegeCategory, PromoCodeStatus, ResidentStatus } from "@/lib/types";
import { pickLocalized } from "@/lib/i18n";
import { FALLBACK_PRIVILEGE_CATEGORY } from "./queries";

export function parseI18n(raw: unknown): I18nLocaleMap {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: I18nLocaleMap = {};
  for (const loc of ["th", "ru"] as const) {
    const block = (raw as Record<string, unknown>)[loc];
    if (!block || typeof block !== "object" || Array.isArray(block)) continue;
    const cleaned: Record<string, string> = {};
    for (const [key, val] of Object.entries(block as Record<string, unknown>)) {
      if (typeof val === "string" && val.trim() !== "") cleaned[key] = val;
    }
    if (Object.keys(cleaned).length > 0) out[loc] = cleaned;
  }
  return out;
}

export function parseMapLocations(raw: unknown): PrivilegeMapLocation[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const name = typeof row.name === "string" ? row.name.trim() : "";
      const mapUrl =
        typeof row.mapUrl === "string"
          ? row.mapUrl.trim()
          : typeof row.map_url === "string"
            ? row.map_url.trim()
            : "";
      if (!name && !mapUrl) return null;
      return { name, mapUrl };
    })
    .filter((item): item is PrivilegeMapLocation => item !== null);
}

export function sanitizeMapLocations(locations: PrivilegeMapLocation[] | undefined): PrivilegeMapLocation[] {
  if (!locations?.length) return [];
  return locations
    .map((loc) => ({
      name: loc.name.trim(),
      mapUrl: loc.mapUrl.trim(),
    }))
    .filter((loc) => loc.name && loc.mapUrl);
}

export type ProfileRow = {
  id: string;
  member_id: string;
  qr_token: string;
  full_name: string;
  /** Present after running supabase/profiles_email_insert_policy.sql */
  email?: string | null;
  gender: "male" | "female" | "other" | null;
  age: number | null;
  nationality: string | null;
  phone: string | null;
  whatsapp: string | null;
  resident_status: ResidentStatus | null;
  project_name: string | null;
  status: MemberStatus;
  is_admin: boolean;
  created_at: string;
  approved_at: string | null;
};

export type PartnerRow = {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  i18n?: unknown;
  privileges?: { count: number }[];
};

export type PartnerJoin = {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  is_active?: boolean;
};

export type PrivilegeCategoryRow = {
  id: number;
  label: string;
  key: string;
  color: string;
  sort_order?: number;
  i18n?: unknown;
};

export type PrivilegeRow = {
  id: string;
  partner_id?: string | null;
  title: string;
  partner_name?: string;
  partner_logo?: string | null;
  partners?: PartnerJoin | null;
  cover_image: string | null;
  summary: string | null;
  description: string | null;
  terms: string | null;
  how_to_redeem: string | null;
  category_id: number;
  privilege_categories?: PrivilegeCategoryRow | null;
  discount_label: string | null;
  privilege_code: string | null;
  code_mode?: CodeMode;
  shared_redeem_limit?: number | null;
  shared_redeem_period?: string | null;
  map_locations?: unknown;
  is_active: boolean;
  valid_from: string;
  valid_until: string | null;
  sort_order: number;
  created_at: string;
  i18n?: unknown;
};

export type PromoCodeRow = {
  id: string;
  privilege_id: string;
  code: string;
  status: PromoCodeStatus;
  claimed_by: string | null;
  claimed_at: string | null;
  expires_at: string | null;
  redeemed_at: string | null;
  created_at: string;
};

export type PromoCodeWithPrivilegeRow = PromoCodeRow & {
  privileges: {
    title: string;
    discount_label: string | null;
    i18n?: unknown;
    partners: {
      name: string;
      logo_url: string | null;
      is_active?: boolean;
    } | null;
    partner_name?: string;
    partner_logo?: string | null;
    is_active?: boolean;
  } | null;
};

export type CommunityMomentRow = {
  id: string;
  image_url: string;
  caption: string | null;
  event_date: string | null;
  is_published: boolean;
  sort_order: number;
  i18n?: unknown;
};

export function mapProfileToMember(row: ProfileRow, fallbackEmail: string): Member {
  return {
    id: row.id,
    memberId: row.member_id,
    qrToken: row.qr_token,
    fullName: row.full_name,
    email: row.email?.trim() || fallbackEmail,
    phone: row.phone ?? "",
    whatsapp: row.whatsapp ?? "",
    gender: row.gender ?? "other",
    age: row.age ?? 0,
    nationality: row.nationality ?? "",
    residentStatus: row.resident_status ?? "owner",
    projectName: row.project_name ?? "",
    status: row.status,
    createdAt: row.created_at,
    approvedAt: row.approved_at ?? undefined,
    isAdmin: row.is_admin,
  };
}

export function mapPrivilegeCategoryRow(
  row: PrivilegeCategoryRow,
  locale = "en"
): PrivilegeCategory {
  const i18n = parseI18n(row.i18n);
  return {
    id: row.id,
    label: pickLocalized(locale, row.label, i18n, "label"),
    key: row.key,
    color: row.color,
    sortOrder: row.sort_order ?? 0,
    i18n,
  };
}

export function mapPartnerRow(row: PartnerRow, locale = "en"): ShopPartner {
  const count = row.privileges?.[0]?.count;
  const i18n = parseI18n(row.i18n);
  return {
    id: row.id,
    name: row.name,
    logoUrl: row.logo_url ?? "",
    websiteUrl: row.website_url ?? "",
    description: pickLocalized(locale, row.description ?? "", i18n, "description"),
    isActive: row.is_active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    privilegeCount: count !== undefined ? Number(count) : undefined,
    i18n,
  };
}

export function mapPrivilegeRow(row: PrivilegeRow, locale = "en"): Privilege {
  const vf = row.valid_from?.slice?.(0, 10) ?? String(row.valid_from);
  const vu = row.valid_until ? row.valid_until.slice(0, 10) : undefined;
  const partner = row.partners;
  const partnerName = partner?.name ?? row.partner_name ?? "";
  const partnerLogo = partner?.logo_url ?? row.partner_logo ?? "";
  const category = row.privilege_categories
    ? mapPrivilegeCategoryRow(row.privilege_categories, locale)
    : FALLBACK_PRIVILEGE_CATEGORY;
  const i18n = parseI18n(row.i18n);
  return {
    id: row.id,
    partnerId: row.partner_id ?? partner?.id ?? "",
    title: pickLocalized(locale, row.title, i18n, "title"),
    partnerName,
    partnerLogo,
    coverImage: row.cover_image ?? "",
    summary: pickLocalized(locale, row.summary ?? "", i18n, "summary"),
    description: pickLocalized(locale, row.description ?? "", i18n, "description"),
    terms: pickLocalized(locale, row.terms ?? "", i18n, "terms"),
    howToRedeem: pickLocalized(locale, row.how_to_redeem ?? "", i18n, "how_to_redeem"),
    categoryId: row.category_id ?? category.id,
    category,
    isActive: row.is_active,
    validFrom: vf,
    validUntil: vu,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    discountLabel: pickLocalized(locale, row.discount_label ?? "", i18n, "discount_label"),
    privilegeCode: row.privilege_code?.trim() ?? "",
    codeMode: row.code_mode ?? "shared",
    sharedRedeemLimit: row.shared_redeem_limit ?? null,
    sharedRedeemPeriod:
      row.shared_redeem_period === "day" ||
      row.shared_redeem_period === "week" ||
      row.shared_redeem_period === "month" ||
      row.shared_redeem_period === "year"
        ? row.shared_redeem_period
        : null,
    mapLocations: parseMapLocations(row.map_locations),
    i18n,
  };
}

export function mapPromoCodeRow(row: PromoCodeRow): PromoCode {
  return {
    id: row.id,
    privilegeId: row.privilege_id,
    code: row.code,
    status: row.status,
    claimedBy: row.claimed_by ?? undefined,
    claimedAt: row.claimed_at ?? undefined,
    expiresAt: row.expires_at ?? undefined,
    redeemedAt: row.redeemed_at ?? undefined,
    createdAt: row.created_at,
  };
}

export function mapMemberPromoCodeRow(
  row: PromoCodeWithPrivilegeRow,
  locale = "en"
): MemberPromoCode {
  const base = mapPromoCodeRow(row);
  const priv = row.privileges;
  const partnerName = priv?.partners?.name ?? priv?.partner_name ?? "";
  const partnerLogo = priv?.partners?.logo_url ?? priv?.partner_logo ?? "";
  const i18n = parseI18n(priv?.i18n);
  return {
    ...base,
    privilegeTitle: pickLocalized(locale, priv?.title ?? "", i18n, "title"),
    partnerName,
    partnerLogo,
    discountLabel: pickLocalized(locale, priv?.discount_label ?? "", i18n, "discount_label"),
  };
}

export function mapPromoCodeStats(row: {
  total: number;
  available: number;
  claimed: number;
  redeemed: number;
}): PromoCodeStats {
  return {
    total: Number(row.total) || 0,
    available: Number(row.available) || 0,
    claimed: Number(row.claimed) || 0,
    redeemed: Number(row.redeemed) || 0,
  };
}

export type EventRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  i18n?: unknown;
};

export type EventVenueRow = {
  id: string;
  event_id: string;
  slug: string;
  name: string;
  description: string | null;
  location: string | null;
  banner_image: string | null;
  starts_at: string;
  ends_at: string | null;
  sort_order: number;
  created_at: string;
  i18n?: unknown;
};

export type EventRegistrationRow = {
  id: string;
  event_id: string;
  venue_id: string;
  member_id: string;
  registered_at: string;
  cancelled_at: string | null;
};

export type EventRegistrantRow = EventRegistrationRow & {
  profiles: {
    member_id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
  } | null;
  event_venues: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

export function mapEventVenueRow(row: EventVenueRow, locale = "en"): EventVenue {
  const i18n = parseI18n(row.i18n);
  return {
    id: row.id,
    eventId: row.event_id,
    slug: row.slug,
    name: pickLocalized(locale, row.name, i18n, "name"),
    description: pickLocalized(locale, row.description ?? "", i18n, "description"),
    location: pickLocalized(locale, row.location ?? "", i18n, "location"),
    bannerImage: row.banner_image ?? "",
    startsAt: row.starts_at,
    endsAt: row.ends_at ?? undefined,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    i18n,
  };
}

export function mapEventRow(
  row: EventRow,
  venues: EventVenueRow[] = [],
  locale = "en"
): ClubEvent {
  const i18n = parseI18n(row.i18n);
  return {
    id: row.id,
    slug: row.slug,
    title: pickLocalized(locale, row.title, i18n, "title"),
    description: pickLocalized(locale, row.description ?? "", i18n, "description"),
    isActive: row.is_active,
    createdAt: row.created_at,
    venues: sortedEventVenues(venues.map((v) => mapEventVenueRow(v, locale))),
    i18n,
  };
}

export function mapEventRegistrationRow(row: EventRegistrationRow): EventRegistration {
  return {
    id: row.id,
    eventId: row.event_id,
    venueId: row.venue_id,
    memberId: row.member_id,
    registeredAt: row.registered_at,
    cancelledAt: row.cancelled_at ?? undefined,
  };
}

export type EventRegistrationLogRow = {
  id: string;
  event_id: string;
  venue_id: string | null;
  member_id: string;
  action: EventRegistrationAction;
  occurred_at: string;
  profiles: {
    member_id: string;
    full_name: string;
  } | null;
  event_venues: {
    name: string;
  } | null;
};

export function mapEventRegistrationLogRow(row: EventRegistrationLogRow): EventRegistrationLog {
  return {
    id: row.id,
    eventId: row.event_id,
    venueId: row.venue_id ?? undefined,
    venueName: row.event_venues?.name ?? "",
    memberId: row.member_id,
    memberCode: row.profiles?.member_id ?? "",
    fullName: row.profiles?.full_name ?? "",
    action: row.action,
    occurredAt: row.occurred_at,
  };
}

export function mapEventRegistrantRow(row: EventRegistrantRow): EventRegistrant {
  return {
    id: row.id,
    memberId: row.member_id,
    memberCode: row.profiles?.member_id ?? "",
    fullName: row.profiles?.full_name ?? "",
    email: row.profiles?.email ?? "",
    phone: row.profiles?.phone ?? "",
    registeredAt: row.registered_at,
    venueId: row.venue_id,
    venueName: row.event_venues?.name ?? "",
    venueSlug: row.event_venues?.slug ?? "",
  };
}

export function mapCommunityRow(row: CommunityMomentRow, locale = "en"): CommunityMoment {
  const i18n = parseI18n(row.i18n);
  return {
    id: row.id,
    imageUrl: row.image_url,
    caption: pickLocalized(locale, row.caption ?? "", i18n, "caption"),
    eventDate: row.event_date?.slice(0, 10) ?? "",
    isPublished: row.is_published,
    sortOrder: row.sort_order,
    i18n,
  };
}

export type EventVenueSurveyRow = {
  venue_id: string;
  event_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type EventSurveyQuestionRow = {
  id: string;
  venue_id: string;
  prompt: string;
  i18n?: unknown;
  question_type: EventSurveyQuestionType;
  options: unknown;
  required: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  has_answers?: boolean | null;
};

export type EventSurveyAnswerRow = {
  id: string;
  response_id: string;
  question_id: string;
  question_type: EventSurveyQuestionType;
  prompt_snapshot: string;
  rating_value: number | null;
  option_id: string | null;
  option_label_snapshot: string | null;
  yesno_value: boolean | null;
  text_value: string | null;
};

export type EventSurveyResponseRow = {
  id: string;
  venue_id: string;
  event_id: string;
  member_id: string;
  registration_id: string;
  submitted_at: string;
  profiles?: {
    member_id: string | null;
    full_name: string | null;
    email: string | null;
  } | null;
  event_survey_answers?: EventSurveyAnswerRow[] | null;
};

function parseSurveyOptionI18n(raw: unknown): I18nLocaleMap {
  return parseI18n(raw);
}

export function parseSurveyOptions(raw: unknown, locale = "en"): EventSurveyOption[] {
  if (!Array.isArray(raw)) return [];
  const out: EventSurveyOption[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const id = typeof row.id === "string" ? row.id.trim() : "";
    const label = typeof row.label === "string" ? row.label.trim() : "";
    if (!id || !label) continue;
    const i18n = parseSurveyOptionI18n(row.i18n);
    out.push({
      id,
      label: pickLocalized(locale, label, i18n, "label"),
      i18n,
    });
  }
  return out;
}

/** Serialize options for insert/update — keep English label + raw i18n. */
export function serializeSurveyOptions(
  options: { id?: string; label: string; i18n?: I18nLocaleMap }[] | undefined
): { id: string; label: string; i18n: I18nLocaleMap }[] {
  if (!options?.length) return [];
  const out: { id: string; label: string; i18n: I18nLocaleMap }[] = [];
  for (const opt of options) {
    const label = opt.label.trim();
    if (!label) continue;
    out.push({
      id: opt.id?.trim() || crypto.randomUUID(),
      label,
      i18n: opt.i18n ?? {},
    });
  }
  return out;
}

export function mapEventVenueSurveyRow(row: EventVenueSurveyRow): EventVenueSurvey {
  return {
    venueId: row.venue_id,
    eventId: row.event_id,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapEventSurveyQuestionRow(
  row: EventSurveyQuestionRow,
  locale = "en"
): EventSurveyQuestion {
  const i18n = parseI18n(row.i18n);
  return {
    id: row.id,
    venueId: row.venue_id,
    prompt: pickLocalized(locale, row.prompt, i18n, "prompt"),
    questionType: row.question_type,
    options: parseSurveyOptions(row.options, locale),
    required: row.required,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    i18n,
    hasAnswers: Boolean(row.has_answers),
  };
}

export function mapEventSurveyAnswerRow(row: EventSurveyAnswerRow): EventSurveyAnswer {
  return {
    id: row.id,
    responseId: row.response_id,
    questionId: row.question_id,
    questionType: row.question_type,
    promptSnapshot: row.prompt_snapshot,
    ratingValue: row.rating_value ?? undefined,
    optionId: row.option_id ?? undefined,
    optionLabelSnapshot: row.option_label_snapshot ?? undefined,
    yesnoValue: row.yesno_value ?? undefined,
    textValue: row.text_value ?? undefined,
  };
}

export function mapEventSurveyResponseRow(row: EventSurveyResponseRow): EventSurveyResponse {
  return {
    id: row.id,
    venueId: row.venue_id,
    eventId: row.event_id,
    memberId: row.member_id,
    registrationId: row.registration_id,
    submittedAt: row.submitted_at,
    memberCode: row.profiles?.member_id ?? undefined,
    fullName: row.profiles?.full_name ?? undefined,
    email: row.profiles?.email ?? undefined,
    answers: (row.event_survey_answers ?? []).map(mapEventSurveyAnswerRow),
  };
}
