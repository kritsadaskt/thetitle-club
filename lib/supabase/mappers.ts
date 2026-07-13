import type { CommunityMoment, Member, MemberPromoCode, Privilege, PromoCode, PromoCodeStats, ShopPartner } from "@/lib/types";
import type { CodeMode, MemberStatus, PrivilegeCategory, PromoCodeStatus, ResidentStatus } from "@/lib/types";
import { FALLBACK_PRIVILEGE_CATEGORY } from "./queries";

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
  is_active: boolean;
  valid_from: string;
  valid_until: string | null;
  sort_order: number;
  created_at: string;
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

export function mapPrivilegeCategoryRow(row: PrivilegeCategoryRow): PrivilegeCategory {
  return {
    id: row.id,
    label: row.label,
    key: row.key,
    color: row.color,
    sortOrder: row.sort_order ?? 0,
  };
}

export function mapPartnerRow(row: PartnerRow): ShopPartner {
  const count = row.privileges?.[0]?.count;
  return {
    id: row.id,
    name: row.name,
    logoUrl: row.logo_url ?? "",
    websiteUrl: row.website_url ?? "",
    description: row.description ?? "",
    isActive: row.is_active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    privilegeCount: count !== undefined ? Number(count) : undefined,
  };
}

export function mapPrivilegeRow(row: PrivilegeRow): Privilege {
  const vf = row.valid_from?.slice?.(0, 10) ?? String(row.valid_from);
  const vu = row.valid_until ? row.valid_until.slice(0, 10) : undefined;
  const partner = row.partners;
  const partnerName = partner?.name ?? row.partner_name ?? "";
  const partnerLogo = partner?.logo_url ?? row.partner_logo ?? "";
  const category = row.privilege_categories
    ? mapPrivilegeCategoryRow(row.privilege_categories)
    : FALLBACK_PRIVILEGE_CATEGORY;
  return {
    id: row.id,
    partnerId: row.partner_id ?? partner?.id ?? "",
    title: row.title,
    partnerName,
    partnerLogo,
    coverImage: row.cover_image ?? "",
    summary: row.summary ?? "",
    description: row.description ?? "",
    terms: row.terms ?? "",
    howToRedeem: row.how_to_redeem ?? "",
    categoryId: row.category_id ?? category.id,
    category,
    isActive: row.is_active,
    validFrom: vf,
    validUntil: vu,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    discountLabel: row.discount_label ?? "",
    privilegeCode: row.privilege_code?.trim() ?? "",
    codeMode: row.code_mode ?? "shared",
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

export function mapMemberPromoCodeRow(row: PromoCodeWithPrivilegeRow): MemberPromoCode {
  const base = mapPromoCodeRow(row);
  const priv = row.privileges;
  const partnerName = priv?.partners?.name ?? priv?.partner_name ?? "";
  const partnerLogo = priv?.partners?.logo_url ?? priv?.partner_logo ?? "";
  return {
    ...base,
    privilegeTitle: priv?.title ?? "",
    partnerName,
    partnerLogo,
    discountLabel: priv?.discount_label ?? "",
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

export function mapCommunityRow(row: CommunityMomentRow): CommunityMoment {
  return {
    id: row.id,
    imageUrl: row.image_url,
    caption: row.caption ?? "",
    eventDate: row.event_date?.slice(0, 10) ?? "",
    isPublished: row.is_published,
    sortOrder: row.sort_order,
  };
}
