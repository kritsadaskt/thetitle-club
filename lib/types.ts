import type { I18nLocaleMap } from "@/lib/i18n";

export type MemberStatus =
  | "pending_verification"
  | "pending_approval"
  | "active"
  | "suspended"
  | "rejected";

export type ResidentStatus = "owner" | "tenant";

export type { I18nLocaleMap };

export interface PrivilegeCategory {
  id: number;
  label: string;
  key: string;
  color: string;
  sortOrder?: number;
  /** Raw th/ru map for admin editing; display fields are already resolved */
  i18n?: I18nLocaleMap;
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
  /** Store branches with Google Maps links (maps to privileges.map_locations) */
  mapLocations: PrivilegeMapLocation[];
  i18n?: I18nLocaleMap;
}

/** One store branch for privilege directions */
export interface PrivilegeMapLocation {
  name: string;
  mapUrl: string;
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
  i18n?: I18nLocaleMap;
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
  i18n?: I18nLocaleMap;
}

export interface CreatePartnerInput {
  name: string;
  logoUrl?: string;
  websiteUrl?: string;
  description?: string;
  isActive?: boolean;
  sortOrder?: number;
  i18n?: I18nLocaleMap;
}

export interface CreatePrivilegeCategoryInput {
  label: string;
  key: string;
  color: string;
  sortOrder?: number;
  i18n?: I18nLocaleMap;
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
  mapLocations?: PrivilegeMapLocation[];
  i18n?: I18nLocaleMap;
}

export interface Partner {
  id: string;
  name: string;
  imageUrl: string;
  link: string;
}

export interface EventVenue {
  id: string;
  eventId: string;
  slug: string;
  name: string;
  description: string;
  location: string;
  bannerImage: string;
  startsAt: string;
  endsAt?: string;
  sortOrder: number;
  createdAt: string;
  i18n?: I18nLocaleMap;
}

export interface ClubEvent {
  id: string;
  slug: string;
  title: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  venues: EventVenue[];
  i18n?: I18nLocaleMap;
}

export interface CreateEventVenueInput {
  /** Present when updating an existing venue */
  id?: string;
  slug: string;
  name: string;
  description?: string;
  location?: string;
  bannerImage?: string;
  startsAt: string;
  endsAt?: string | null;
  sortOrder?: number;
  i18n?: I18nLocaleMap;
}

export interface CreateEventInput {
  title: string;
  slug: string;
  description?: string;
  isActive?: boolean;
  venues: CreateEventVenueInput[];
  i18n?: I18nLocaleMap;
}

export interface EventRegistration {
  id: string;
  eventId: string;
  venueId: string;
  memberId: string;
  registeredAt: string;
  cancelledAt?: string;
}

export interface EventRegistrant {
  id: string;
  /** profiles.id — used when admin resends confirm email to one registrant */
  memberId: string;
  memberCode: string;
  fullName: string;
  email: string;
  phone: string;
  registeredAt: string;
  venueId: string;
  venueName: string;
  venueSlug: string;
}

export type EventRegistrationAction = "registered" | "cancelled";

export interface EventRegistrationLog {
  id: string;
  eventId: string;
  venueId?: string;
  venueName: string;
  memberId: string;
  memberCode: string;
  fullName: string;
  action: EventRegistrationAction;
  occurredAt: string;
}

export type EventSurveyQuestionType = "rating" | "single" | "text" | "yesno";

export interface EventSurveyOption {
  id: string;
  /** Localized label for the current viewer locale */
  label: string;
  /** Raw th/ru map for admin editing */
  i18n?: I18nLocaleMap;
}

export interface EventVenueSurvey {
  venueId: string;
  eventId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EventSurveyQuestion {
  id: string;
  venueId: string;
  /** Localized prompt for the current viewer locale */
  prompt: string;
  questionType: EventSurveyQuestionType;
  options: EventSurveyOption[];
  required: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  /** Raw th/ru map for admin editing */
  i18n?: I18nLocaleMap;
  /** True when at least one answer exists (admin UI locks type/delete) */
  hasAnswers?: boolean;
}

export interface CreateEventSurveyQuestionInput {
  prompt: string;
  questionType: EventSurveyQuestionType;
  options?: EventSurveyOptionInput[];
  required?: boolean;
  sortOrder?: number;
  i18n?: I18nLocaleMap;
}

export interface EventSurveyOptionInput {
  /** Preserve existing option id when editing */
  id?: string;
  label: string;
  i18n?: I18nLocaleMap;
}

export interface UpdateEventSurveyQuestionInput {
  prompt?: string;
  questionType?: EventSurveyQuestionType;
  options?: EventSurveyOptionInput[];
  required?: boolean;
  sortOrder?: number;
  i18n?: I18nLocaleMap;
}

export interface EventSurveyAnswerInput {
  questionId: string;
  rating?: number;
  optionId?: string;
  yesno?: boolean;
  text?: string;
}

export interface EventSurveyAnswer {
  id: string;
  responseId: string;
  questionId: string;
  questionType: EventSurveyQuestionType;
  promptSnapshot: string;
  ratingValue?: number;
  optionId?: string;
  optionLabelSnapshot?: string;
  yesnoValue?: boolean;
  textValue?: string;
}

export interface EventSurveyResponse {
  id: string;
  venueId: string;
  eventId: string;
  memberId: string;
  registrationId: string;
  submittedAt: string;
  memberCode?: string;
  fullName?: string;
  email?: string;
  answers: EventSurveyAnswer[];
}

export interface EventSurveyQuestionSummary {
  questionId: string;
  prompt: string;
  questionType: EventSurveyQuestionType;
  responseCount: number;
  /** rating */
  averageRating?: number;
  ratingDistribution?: Record<1 | 2 | 3 | 4 | 5, number>;
  /** single */
  optionCounts?: { optionId: string; label: string; count: number }[];
  /** yesno */
  yesCount?: number;
  noCount?: number;
  /** text */
  textAnswers?: { memberName: string; text: string; submittedAt: string }[];
}

export interface EventVenueSurveySummary {
  venueId: string;
  responseCount: number;
  questions: EventSurveyQuestionSummary[];
}