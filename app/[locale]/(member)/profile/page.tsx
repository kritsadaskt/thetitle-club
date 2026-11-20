"use client";

import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { localeToBcp47 } from "@/lib/i18n";
import type { AppLocale } from "@/i18n/routing";
import { User, Phone, Mail, MapPin, LogOut, Shield, Globe } from "lucide-react";

export default function ProfilePage() {
  const t = useTranslations("member.profile");
  const locale = useLocale() as AppLocale;
  const { member, logout } = useAuth();
  if (!member) return null;

  const rows = [
    { icon: User,   label: t("fields.fullName"),    value: member.fullName },
    { icon: Mail,   label: t("fields.email"),       value: member.email },
    { icon: Phone,  label: t("fields.phone"),       value: member.phone },
    { icon: Phone,  label: t("fields.whatsapp"),    value: member.whatsapp || "—" },
    { icon: MapPin, label: t("fields.project"),     value: member.projectName },
    { icon: Shield, label: t("fields.resident"),    value: t(`residentStatus.${member.residentStatus}`) },
    { icon: Globe,  label: t("fields.nationality"), value: member.nationality },
    { icon: User,   label: t("fields.memberSince"), value: member.approvedAt
      ? new Date(member.approvedAt).toLocaleDateString(localeToBcp47[locale] ?? "en-US", {
          day: "numeric", month: "long", year: "numeric",
        })
      : "—" },
  ];

  return (
    <div className="p-6 lg:p-10 max-w-2xl mx-auto">
      <h1 className="text-2xl font-light text-forest mb-8">{t("title")}</h1>

      {/* Avatar card */}
      <div className="bg-white border border-cream-300 rounded-2xl p-6 flex items-center gap-5 mb-6 shadow-card">
        <div className="w-16 h-16 rounded-full bg-forest-900 flex items-center justify-center text-primary text-2xl font-semibold flex-shrink-0 shadow-md">
          {member.fullName.charAt(0)}
        </div>
        <div>
          <p className="text-forest font-semibold text-lg">{member.fullName}</p>
          <p className="text-primary-dark font-mono text-sm tracking-widest mt-1">{member.memberId}</p>
          <span className="inline-block mt-2 text-xs bg-forest-50 text-forest-700 border border-forest-100 px-3 py-0.5 rounded-full font-medium">
            {t("activeMember")}
          </span>
        </div>
      </div>

      {/* Info table */}
      <div className="bg-white border border-cream-300 rounded-2xl overflow-hidden shadow-card mb-6">
        {rows.map(({ icon: Icon, label, value }, i) => (
          <div key={label}
            className={`flex items-center gap-4 px-6 py-4 ${i < rows.length - 1 ? "border-b border-cream-200" : ""}`}>
            <div className="w-8 h-8 rounded-lg bg-forest-50 flex items-center justify-center flex-shrink-0">
              <Icon size={14} className="text-forest-600" strokeWidth={1.5} />
            </div>
            <span className="text-ink-muted text-sm w-32 flex-shrink-0">{label}</span>
            <span className="text-forest text-sm flex-1 text-right">{value}</span>
          </div>
        ))}
      </div>

      {/* Logout */}
      <button onClick={logout}
        className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-500 hover:bg-red-50 transition-colors py-3.5 rounded-2xl text-sm font-medium mb-6">
        <LogOut size={15} /> {t("signOut")}
      </button>

      <p className="text-ink-muted text-xs text-center">
        {t("contactToUpdate")}{" "}
        <a href="mailto:club@thetitleresidence.com" className="text-primary-dark hover:text-primary underline transition-colors">
          club@thetitleresidence.com
        </a>
      </p>
    </div>
  );
}
