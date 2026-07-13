export type MemberStatus =
  | "pending_verification"
  | "pending_approval"
  | "active"
  | "suspended"
  | "rejected";

export type ResidentStatus = "owner" | "tenant";

export interface PrivilegeCategory {
  id: number;
  label: string;
  key: string;
  color: string;
  sortOrder?: number;
}

export type CodeMode = "shared" | "unique_pool";

export type PromoCodeStatus = "available" | "claimed" | "redeemed";

export interface Member {
  id: string;
  memberId: string;  // e.g. "TTC-2024-001"
  qrToken: string;   // unique token encoded in QR
  fullName: string;
  email: string;
  phone: string;
  whatsapp: string;
  gender: "male" | "female" | "other";
  age: number;
  nationality: string;
  residentStatus: ResidentStatus;
  projectName: string;
  status: MemberStatus;
  createdAt: string;
  approvedAt?: string;
  /** From profiles.is_admin — staff accounts are excluded from the approval queue */
  isAdmin?: boolean;
  password?: string; // hashed in real app; plain for mock
}

export interface Privilege {
  id: string;
  partnerId: string;
  title: string;
  partnerName: string;
  partnerLogo: string;
  coverImage: string;
  summary: string;       // short (for card)
  description: string;   // full
  terms: string;
  howToRedeem: string;
  categoryId: number;
  category: PrivilegeCategory;
  isActive: boolean;
  validFrom: string;
  validUntil?: string;
  sortOrder: number;
  createdAt: string;
  discountLabel: string; // e.g. "15% OFF"
  /** Encoded in redeem QR; set by admin (maps to privileges.privilege_code) */
  privilegeCode: string;
  /** shared = same code for all; unique_pool = codes from promo_codes table */
  codeMode: CodeMode;
}

export interface PromoCode {
  id: string;
  privilegeId: string;
  code: string;
  status: PromoCodeStatus;
  claimedBy?: string;
  claimedAt?: string;
  expiresAt?: string;
  redeemedAt?: string;
  createdAt: string;
}

/** Promo code with joined privilege info for member UI */
export interface MemberPromoCode extends PromoCode {
  privilegeTitle: string;
  partnerName: string;
  partnerLogo: string;
  discountLabel: string;
}

export interface PromoCodeStats {
  total: number;
  available: number;
  claimed: number;
  redeemed: number;
}

export interface CommunityMoment {
  id: string;
  imageUrl: string;
  caption: string;
  eventDate: string;
  isPublished: boolean;
  sortOrder: number;
}

export interface RedemptionLog {
  id: string;
  memberId: string;
  privilegeId: string;
  redeemedAt: string;
  method: "qr" | "visual";
}

export interface ShopPartner {
  id: string;
  name: string;
  logoUrl: string;
  websiteUrl: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  privilegeCount?: number;
}

export interface CreatePartnerInput {
  name: string;
  logoUrl?: string;
  websiteUrl?: string;
  description?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface CreatePrivilegeCategoryInput {
  label: string;
  key: string;
  color: string;
  sortOrder?: number;
}

export interface CreatePrivilegeInput {
  title: string;
  summary?: string;
  description?: string;
  terms?: string;
  howToRedeem?: string;
  categoryId: number;
  discountLabel?: string;
  coverImage?: string;
  validFrom?: string;
  validUntil?: string;
  isActive?: boolean;
  sortOrder?: number;
  codeMode?: CodeMode;
}

export interface Partner {
  id: string;
  name: string;
  imageUrl: string;
  link: string;
}