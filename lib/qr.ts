/**
 * Plain-text QR payloads for THE TITLE CLUB.
 *
 * Membership card: TTC:{qrToken}:{memberId}
 * Privilege redeem: privileges.privilege_code (set in admin)
 */

export function buildMembershipCardQrValue(qrToken: string, memberId: string): string {
  const token = qrToken?.trim();
  const id = memberId?.trim();
  if (!token || !id) return "";
  return `TTC:${token}:${id}`;
}

/** Redeem QR encodes the admin-defined privilege code as-is. */
export function buildRedeemQrValue(privilegeCode: string): string {
  return privilegeCode?.trim() ?? "";
}
