import type { PrivilegeCategory } from "@/lib/types";

/** Privileges visible to members/public: active privilege + active partner */
export const PUBLIC_PRIVILEGE_SELECT =
  "*, partners!inner(id, name, logo_url, website_url, is_active), privilege_categories(id, label, key, color)";

export const PRIVILEGE_SELECT =
  "*, partners(id, name, logo_url, website_url), privilege_categories(id, label, key, color)";

export const MEMBER_PROMO_PRIVILEGE_SELECT =
  "*, privileges!inner(title, discount_label, partner_name, partner_logo, is_active, partners!inner(name, logo_url, is_active))";

export const FALLBACK_PRIVILEGE_CATEGORY: PrivilegeCategory = {
  id: 0,
  label: "Other",
  key: "other",
  color: "bg-gray-100 text-gray-700 border-gray-200",
};
