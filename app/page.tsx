import Link from "next/link";
import { MOCK_PARTNERS } from "@/lib/mock-data";
import { createClient } from "@/lib/supabase/server";
import {
  mapPrivilegeRow,
  mapCommunityRow,
  type PrivilegeRow,
  type CommunityMomentRow,
} from "@/lib/supabase/mappers";
import { categoryLabel, categoryColor } from "@/lib/utils";

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: privRows } = await supabase
    .from("privileges")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  const { data: commRows } = await supabase
    .from("community_moments")
    .select("*")
    .eq("is_published", true)
    .order("sort_order");

  const privileges = (privRows ?? []).map((r) => mapPrivilegeRow(r as PrivilegeRow));
  const community = (commRows ?? []).map((r) => mapCommunityRow(r as CommunityMomentRow));

  const featuredPrivileges = privileges.filter((p) => p.isActive).slice(0, 3);
  const featuredCommunity = community.filter((c) => c.isPublished).slice(0, 5);

  return (
    <main className="min-h-screen bg-cream-100">

      {/* ─── NAV ─────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-cream-100/90 backdrop-blur-md border-b border-cream-300">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div>
            <span className="section-eyebrow text-gold-dark">The Title</span>
            <div className="text-forest font-semibold tracking-[3px] text-sm leading-tight">CLUB</div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-ink-light hover:text-gold-dark transition-colors font-medium">
              Sign In
            </Link>
            <Link href="/register" className="btn-gold text-sm px-5 py-2.5">
              Become a Member
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── HERO (Midnight Green) ────────────────── */}
      <section className="pt-16 min-h-screen flex items-center relative overflow-hidden bg-forest-900">
        {/* Texture layers */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_40%,#163B2B_0%,#0A1F14_70%)]" />
        <div className="absolute top-20 right-0 w-[600px] h-[600px] bg-gold/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-20 w-80 h-80 bg-forest-700/40 rounded-full blur-3xl" />
        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "linear-gradient(#C9A96E 1px, transparent 1px), linear-gradient(90deg, #C9A96E 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

        <div className="relative max-w-6xl mx-auto px-6 py-28">
          <div className="max-w-2xl">
            <p className="section-eyebrow text-gold mb-5">Exclusive Membership</p>
            <h1 className="text-5xl md:text-[64px] font-light text-white leading-[1.12] mb-6 tracking-tight">
              Discover,<br />
              <span className="text-gold-gradient font-semibold">Our Community.</span>
            </h1>
            <p className="text-lg text-white/50 max-w-lg leading-relaxed mb-10">
              At THE TITLE, we believe that owning a home is more than holding a title — it is becoming part of a family. THE TITLE CLUB is our exclusive community designed to bring residents together through curated experiences, lifestyle privileges, and meaningful connections. Because here, every title belongs to a family.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/register" className="btn-gold text-base px-8 py-4 inline-block text-center">
                Become Part of the Family
              </Link>
              <Link href="/login" className="btn-ghost-dark text-base px-8 py-4 inline-block text-center">
                Member Login
              </Link>
            </div>
          </div>

          {/* Stats strip */}
          <div className="mt-20 pt-8 border-t border-white/10 grid grid-cols-3 gap-8 max-w-lg">
            {[
              { num: "3+", label: "Projects" },
              { num: `${privileges.length}`, label: "Privileges" },
              { num: "100%", label: "Exclusive" },
            ].map(({ num, label }) => (
              <div key={label}>
                <p className="text-3xl font-light text-gold">{num}</p>
                <p className="text-white/30 text-xs mt-1 tracking-wide">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── DISCOVER (Cream) ─────────────────────── */}
      <section className="py-28 bg-cream-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="section-eyebrow text-gold-dark mb-4">Our Community</p>
              <h2 className="text-4xl font-light text-forest leading-tight mb-6">
                Community<br />
                <em className="not-italic text-gold-dark font-serif">Moments</em>
              </h2>
              <p className="text-ink-light leading-relaxed mb-8">
              Within Community Moments, every experience is intentionally crafted for those who appreciate the art of living well. From intimate soirées to exceptional cultural encounters, it is where a global community connects in style and distinction.</p>
              <Link href="/register" className="btn-outline-gold inline-block">
                Learn More
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
                  <div className="absolute inset-0 bg-gradient-to-t from-forest-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                    <p className="text-white text-xs font-medium">{item.caption}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── PRIVILEGES (Ivory) ───────────────────── */}
      <section className="py-28 bg-cream-200">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="section-eyebrow text-gold-dark mb-4">Member Benefits</p>
            <h2 className="text-4xl font-light text-forest">Exclusive Privileges</h2>
            <p className="text-ink-light mt-3 max-w-md mx-auto">
              Unlock a curated collection of lifestyle benefits, health perks, and leisure experiences
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredPrivileges.map((priv) => (
              <div key={priv.id} className="card card-hover overflow-hidden">
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
                  <div className="absolute inset-0 bg-gradient-to-t from-forest-900/50 to-transparent" />
                  <span className="absolute top-3 right-3 bg-gold text-forest-900 text-xs font-bold px-3 py-1 rounded-full shadow-gold-sm">
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
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/register" className="btn-outline-gold text-sm">
              Join to See All {privileges.length} Privileges →
            </Link>
          </div>
        </div>
      </section>

      {/* ─── CTA (Midnight Green) ─────────────────── */}
      <section className="py-28 bg-forest-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_60%_50%,#163B2B_0%,#0A1F14_70%)]" />
        <div className="absolute top-0 left-1/2 w-96 h-96 bg-gold/5 rounded-full blur-3xl -translate-x-1/2" />
        <div className="relative max-w-2xl mx-auto px-6 text-center">
          <p className="section-eyebrow text-gold mb-5">Join the Family</p>
          <h2 className="text-4xl md:text-5xl font-light text-white mb-6 leading-tight">
            Become Part of<br />
            <span className="text-gold-gradient font-semibold">the Family</span>
          </h2>
          <p className="text-white/40 mb-10 max-w-md mx-auto leading-relaxed">
            Register now to receive your digital membership card, access exclusive privileges,
            and connect with your community.
          </p>
          <Link href="/register" className="btn-gold text-base px-10 py-4 inline-block">
            Become a part of the family
          </Link>
        </div>
      </section>

      {/* ─── Our Partners ─────────────────── */}
      <section className="py-28 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="section-eyebrow text-gold-dark mb-4">let's meet</p>
            <h2 className="text-4xl font-light text-forest">Our Partners</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {MOCK_PARTNERS.map((partner) => (
              <Link href={partner.link} target="_blank" key={partner.id} className="w-full h-auto flex items-center justify-center">
                {partner.imageUrl ? (
                  <img
                    src={partner.imageUrl}
                    alt={partner.name}
                    className="object-contain object-center w-2/3 h-auto"
                  />
                ) : (
                  <div className="w-2/3 aspect-[3/2] bg-cream-200 rounded" aria-hidden />
                )}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FOOTER ──────────────────────────────── */}
      <footer className="bg-forest-950 py-10 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <span className="text-gold font-semibold tracking-[3px] text-sm">THE TITLE CLUB</span>
            <p className="text-white/20 text-xs mt-1">thetitleresidence.com/club</p>
          </div>
          <p className="text-white/20 text-xs">
            © {new Date().getFullYear()} The Title Residence. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
