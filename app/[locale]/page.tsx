import { type ReactNode } from "react";
import NextLink from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  mapPrivilegeRow,
  mapCommunityRow,
  mapPartnerRow,
  type PrivilegeRow,
  type CommunityMomentRow,
  type PartnerRow,
} from "@/lib/supabase/mappers";
import { PUBLIC_PRIVILEGE_SELECT } from "@/lib/supabase/queries";
import { bangkokTodayIsoDate, categoryLabel, categoryColor, isPrivilegeInValidityWindow } from "@/lib/utils";
import { LandingNav } from "@/components/landing-nav";
import HowToJoinSection from "@/components/ui/howtojoinsection";

/** Member entry link: /admin lives outside [locale], so it uses plain next/link. */
function MemberEntryLink({
  href,
  isAdmin,
  className,
  children,
}: {
  href: string;
  isAdmin: boolean;
  className?: string;
  children: ReactNode;
}) {
  if (isAdmin) {
    return (
      <NextLink href={href} className={className}>
        {children}
      </NextLink>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

export default async function LandingPage() {
  const locale = await getLocale();
  const t = await getTranslations("landing");
  const tNav = await getTranslations("nav");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();
    isAdmin = profile?.is_admin ?? false;
  }

  const isSignedIn = Boolean(user);
  const memberEntryHref = isAdmin ? "/admin" : "/profile";
  const memberEntryLabel = isAdmin ? t("nav.goToDashboard") : t("nav.viewProfile");
  const memberHeroLabel = isAdmin ? t("hero.openAdmin") : t("hero.goToProfile");
  const memberCtaTitle = isAdmin ? t("cta.welcomeBackAdmin") : t("cta.welcomeBack");
  const memberCtaDescription = isAdmin
    ? t("cta.continueAdminBody")
    : t("cta.continueMemberBody");

  const today = bangkokTodayIsoDate();
  const { data: privRows } = await supabase
    .from("privileges")
    .select(PUBLIC_PRIVILEGE_SELECT)
    .eq("is_active", true)
    .eq("partners.is_active", true)
    .lte("valid_from", today)
    .or(`valid_until.is.null,valid_until.gte.${today}`)
    .order("sort_order");
  const { data: commRows } = await supabase
    .from("community_moments")
    .select("*")
    .eq("is_published", true)
    .order("sort_order");
  const { data: partnerRows } = await supabase
    .from("partners")
    .select("*")
    .eq("is_active", true)
    .order("sort_order")
    .order("name");

  const privileges = (privRows ?? [])
    .map((r) => mapPrivilegeRow(r as PrivilegeRow, locale))
    .filter((p) => isPrivilegeInValidityWindow(p.validFrom, p.validUntil, today));
  const community = (commRows ?? []).map((r) => mapCommunityRow(r as CommunityMomentRow, locale));
  const partners = (partnerRows ?? []).map((r) => mapPartnerRow(r as PartnerRow, locale));

  const featuredPrivileges = privileges.filter((p) => p.isActive).slice(0, 3);
  const featuredCommunity = community.filter((c) => c.isPublished).slice(0, 5);

  return (
    <main className="min-h-screen">

      <LandingNav
        isSignedIn={isSignedIn}
        memberEntryHref={memberEntryHref}
        memberEntryLabel={memberEntryLabel}
      />

      {/* ─── HERO (Midnight Green) ────────────────── */}
      <section className="pt-16 min-h-screen flex items-center relative overflow-hidden bg-cover bg-center bg-linear-to-b from-middle-blue to-deep-blue">
        <div className="absolute inset-0 bg-cover bg-center opacity-15" style={{ backgroundImage: "url('/club/thetitle_sky-bg.webp')" }}></div>
        {/* Subtle grid */}
        <div className="relative max-w-6xl mx-auto px-6 py-28">
          <div className="max-w-2xl">
            <p className="section-eyebrow text-primary mb-5">{t("hero.eyebrow")}</p>
            <h1 className="text-5xl md:text-[64px] font-light text-white leading-[1.12] mb-6 tracking-tight">
              {t("hero.titleLine1")}<br />
              <span className="text-primary font-semibold">{t("hero.titleHighlight")}</span>
            </h1>
            <p className="text-lg text-white/70 max-w-lg leading-relaxed mb-10">
              {t("hero.body")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              {isSignedIn ? (
                <MemberEntryLink
                  href={memberEntryHref}
                  isAdmin={isAdmin}
                  className="bg-primary text-base font-semibold px-8 py-4 inline-block text-center rounded-lg"
                >
                  {memberHeroLabel}
                </MemberEntryLink>
              ) : (
                <>
                  <Link href="/register" className="bg-primary text-base font-semibold px-8 py-4 inline-block text-center rounded-lg">
                    {t("hero.becomeFamily")}
                  </Link>
                  <Link href="/login" className="btn-ghost-dark text-base px-8 py-4 inline-block text-center">
                    {t("hero.memberLogin")}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ─── DISCOVER (Cream) ─────────────────────── */}
      <section className="py-28 bg-cream-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="section-eyebrow text-primary-dark mb-4">{t("community.eyebrow")}</p>
              <h2 className="text-4xl font-light text-forest leading-tight mb-6">
                {t("community.titleLine1")}<br />
                <em className="not-italic text-primary-dark font-serif">{t("community.titleHighlight")}</em>
              </h2>
              <p className="text-ink-light leading-relaxed mb-8">
                {t("community.body")}</p>
              <Link href="/register" className="font-semibold px-5 py-2.5 rounded-lg border border-primary-dark text-primary-dark hover:bg-primary-dark hover:text-white">
                {t("community.learnMore")}
              </Link>
            </div>
            {/* Community grid preview */}
            <div className="grid grid-cols-2 gap-3">
              {featuredCommunity.slice(0, 5).map((item, i) => (
                <div key={item.id}
                  className={`relative overflow-hidden rounded-2xl group ${i === 0 ? "row-span-2" : ""}`}>
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.caption}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  ) : (
                    <div className="w-full h-full bg-cream-200" aria-hidden />
                  )}
                  <div className="absolute inset-0 bg-linear-to-t from-forest-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                    <p className="text-white text-xs font-medium">{item.caption}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── PRIVILEGES (Ivory) ───────────────────── */}
      <section className="py-20 bg-cream-200">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="section-eyebrow text-primary-dark mb-4">{t("privileges.eyebrow")}</p>
            <h2 className="text-4xl font-light text-forest">{t("privileges.title")}</h2>
            <p className="text-ink-light mt-3 max-w-md mx-auto">
              {t("privileges.body")}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredPrivileges.map((priv) => (
              <Link href={`/privileges/${priv.id}`} key={priv.id}>
              <div key={priv.id} className="card card-hover h-full overflow-hidden">
                {/* Cover image */}
                <div className="relative h-44 overflow-hidden">
                  {priv.coverImage ? (
                    <img
                      src={priv.coverImage}
                      alt={priv.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-cream-300" aria-hidden />
                  )}
                  <div className="absolute inset-0 bg-linear-to-t from-forest-900/50 to-transparent" />
                  <span className="absolute top-3 right-3 bg-primary text-forest-900 text-xs font-bold px-3 py-1 rounded-full shadow-primary-sm">
                    {priv.discountLabel}
                  </span>
                  <span className={`absolute bottom-3 left-3 text-xs px-2 py-0.5 rounded border ${categoryColor(priv.category)}`}>
                    {categoryLabel(priv.category)}
                  </span>
                </div>
                {/* Body */}
                <div className="p-5">
                  <p className="text-xs text-ink-muted mb-1">{priv.partnerName}</p>
                  <h3 className="text-forest font-semibold mb-2">{priv.title}</h3>
                  <p className="text-ink-light text-sm leading-relaxed">{priv.summary}</p>
                </div>
              </div>
              </Link>
            ))}
          </div>
          <div className="text-center mt-10">
            {isSignedIn ? (
              <Link href="/privileges" className="btn-outline-primary text-sm">
                {t("privileges.viewAll")}
              </Link>
            ) : (
              <Link href="/register" className="btn-outline-primary text-sm">
                {t("privileges.joinToSee")}
              </Link>
            )}
          </div>
        </div>
      </section>

      <HowToJoinSection />

      {/* ─── CTA (Midnight Green) ─────────────────── */}
      <section className="py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_60%_50%,#163B2B_0%,#0A1F14_70%)]" />
        <div className="absolute top-0 left-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-x-1/2" />
        <div className="absolute inset-0" style={{ backgroundImage: "url('/club/club-bg.webp')" }} />
        <div className="relative max-w-2xl mx-auto px-6 text-center">
          <p className="section-eyebrow text-primary mb-5">{isSignedIn ? t("cta.memberAccess") : t("cta.joinFamily")}</p>
          <h2 className="text-4xl md:text-5xl font-light text-white mb-6 leading-tight">
            {isSignedIn ? (
              <>
                {memberCtaTitle}<br />
                <span className="text-primary-gradient font-semibold">{t("cta.continueJourney")}</span>
              </>
            ) : (
              <>
                {t("cta.becomePartOf")}<br />
                <span className="text-primary-gradient font-semibold">{t("cta.theFamily")}</span>
              </>
            )}
          </h2>
          <p className="text-white/80 mb-10 max-w-md mx-auto leading-relaxed">
            {isSignedIn
              ? memberCtaDescription
              : t("cta.registerBody")}
          </p>
          <MemberEntryLink
            href={isSignedIn ? memberEntryHref : "/register"}
            isAdmin={isSignedIn && isAdmin}
            className="btn-primary rounded-lg font-semibold text-base px-10 py-4 inline-block"
          >
            {isSignedIn ? memberEntryLabel : t("cta.becomePartOfFamily")}
          </MemberEntryLink>
        </div>
      </section>

      {/* ─── Our Partners ─────────────────── */}
      <section className="py-28 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="section-eyebrow text-primary-dark mb-4">{t("partners.eyebrow")}</p>
            <h2 className="text-4xl font-light text-forest">{t("partners.title")}</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {partners.map((partner) => (
              <NextLink
                href={partner.websiteUrl || "#"}
                target={partner.websiteUrl ? "_blank" : undefined}
                key={partner.id}
                className="w-full h-auto flex items-center justify-center"
              >
                {partner.logoUrl ? (
                  <img
                    src={partner.logoUrl}
                    alt={partner.name}
                    className="object-contain object-center w-2/3 h-auto"
                  />
                ) : (
                  <div className="w-2/3 aspect-3/2 bg-cream-200 rounded flex items-center justify-center text-ink-muted text-sm">
                    {partner.name}
                  </div>
                )}
              </NextLink>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FOOTER ──────────────────────────────── */}
      <footer className="bg-neutral-700 py-5 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <img src={process.env.NEXT_PUBLIC_LOGO_IMAGE_URL_WHITE} alt={tNav("logoAlt")} className="w-20 h-auto object-contain" />
          </div>
          <p className="text-white">
            {t("footer.rights", { year: new Date().getFullYear() })}
          </p>
        </div>
      </footer>
    </main>
  );
}
