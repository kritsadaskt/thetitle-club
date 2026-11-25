import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { LoyKrathongFeedbackForm } from "@/components/loy-krathong-feedback-form";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import {
  getLoyKrathongLocation,
  LOY_KRATHONG_LOCATIONS,
} from "@/lib/loy-krathong-feedback";

type Props = {
  params: Promise<{ locale: string; location: string }>;
};

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    LOY_KRATHONG_LOCATIONS.map((loc) => ({
      locale,
      location: loc.slug,
    }))
  );
}

export default async function LoyKrathongFeedbackPage({ params }: Props) {
  const { locale, location } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const venue = getLoyKrathongLocation(decodeURIComponent(location));
  if (!venue) {
    notFound();
  }

  return (
    <LoyKrathongFeedbackForm locationSlug={venue.slug} locationName={venue.name} />
  );
}
