export type MemberStatus =
  | "pending_verification"
  | "pending_approval"
  | "active"
  | "suspended"
  | "rejected";

export type ResidentStatus = "owner" | "tenant";

export type PrivilegeCategory = "health" | "fnb" | "service" | "lifestyle";

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
  password?: string; // hashed in real app; plain for mock
}

export interface Privilege {
  id: string;
  title: string;
  partnerName: string;
  partnerLogo: string;
  coverImage: string;
  summary: string;       // short (for card)
  description: string;   // full
  terms: string;
  howToRedeem: string;
  category: PrivilegeCategory;
  isActive: boolean;
  validFrom: string;
  validUntil?: string;
  sortOrder: number;
  discountLabel: string; // e.g. "15% OFF"
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
