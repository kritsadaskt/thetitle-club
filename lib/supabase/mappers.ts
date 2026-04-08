import type { CommunityMoment, Member, Privilege } from "@/lib/types";
import type { MemberStatus, PrivilegeCategory, ResidentStatus } from "@/lib/types";

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

export type PrivilegeRow = {
  id: string;
  title: string;
  partner_name: string;
  partner_logo: string | null;
  cover_image: string | null;
  summary: string | null;
  description: string | null;
  terms: string | null;
  how_to_redeem: string | null;
  category: PrivilegeCategory;
  discount_label: string | null;
  is_active: boolean;
  valid_from: string;
  valid_until: string | null;
  sort_order: number;
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

export function mapPrivilegeRow(row: PrivilegeRow): Privilege {
  const vf = row.valid_from?.slice?.(0, 10) ?? String(row.valid_from);
  const vu = row.valid_until ? row.valid_until.slice(0, 10) : undefined;
  return {
    id: row.id,
    title: row.title,
    partnerName: row.partner_name,
    partnerLogo: row.partner_logo ?? "",
    coverImage: row.cover_image ?? "",
    summary: row.summary ?? "",
    description: row.description ?? "",
    terms: row.terms ?? "",
    howToRedeem: row.how_to_redeem ?? "",
    category: row.category,
    isActive: row.is_active,
    validFrom: vf,
    validUntil: vu,
    sortOrder: row.sort_order,
    discountLabel: row.discount_label ?? "",
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
