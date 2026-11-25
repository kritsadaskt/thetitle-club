/** Stable catalog for Loy Krathong 2026 public feedback microsite. */

export const LOY_KRATHONG_LOCATIONS = [
  {
    slug: "the-title-legendary-bang-tao",
    name: "The Title Legendary Bang-Tao",
  },
  {
    slug: "the-title-cielo-rawai",
    name: "The Title Cielo Rawai",
  },
  {
    slug: "the-title-serenity-naiyang",
    name: "The Title Serenity Nai-Yang",
  },
] as const;

export type LoyKrathongLocationSlug = (typeof LOY_KRATHONG_LOCATIONS)[number]["slug"];

export const LOY_KRATHONG_EVENT = {
  titleKey: "eventTitle",
  dateTime: "23 November 2026 · 17.00–20.00",
} as const;

export type FeedbackSide = "positive" | "improve";
export type FeedbackSection = "food" | "venue" | "activities";

export type FeedbackOption = {
  id: string;
  /** Message key under loyKrathong.options.<section>.<side>.<id> */
  exclusive?: boolean;
  opensOther?: boolean;
};

export type FeedbackSectionDef = {
  id: FeedbackSection;
  positive: FeedbackOption[];
  improve: FeedbackOption[];
};

export const FEEDBACK_SECTIONS: FeedbackSectionDef[] = [
  {
    id: "food",
    positive: [
      { id: "taste" },
      { id: "sufficient" },
      { id: "variety" },
      { id: "quality" },
      { id: "cleanliness" },
      { id: "presentation" },
      { id: "service" },
      { id: "others", opensOther: true },
    ],
    improve: [
      { id: "taste" },
      { id: "quantity" },
      { id: "variety" },
      { id: "temperature" },
      { id: "cleanliness" },
      { id: "waiting" },
      { id: "dietary" },
      { id: "none", exclusive: true },
      { id: "others", opensOther: true },
    ],
  },
  {
    id: "venue",
    positive: [
      { id: "decorations" },
      { id: "atmosphere" },
      { id: "venue_size" },
      { id: "crowd" },
      { id: "seating" },
      { id: "lighting_sound" },
      { id: "layout" },
      { id: "cleanliness_safety" },
      { id: "others", opensOther: true },
    ],
    improve: [
      { id: "decorations_atmosphere" },
      { id: "venue_size" },
      { id: "overcrowding" },
      { id: "seating" },
      { id: "lighting" },
      { id: "music_volume" },
      { id: "layout_access" },
      { id: "cleanliness_safety" },
      { id: "none", exclusive: true },
      { id: "others", opensOther: true },
    ],
  },
  {
    id: "activities",
    positive: [
      { id: "diy_krathong" },
      { id: "queen_contest" },
      { id: "dessert_workshop" },
      { id: "games_family" },
      { id: "fun_engaging" },
      { id: "all_ages" },
      { id: "duration" },
      { id: "staff" },
      { id: "others", opensOther: true },
    ],
    improve: [
      { id: "variety" },
      { id: "engagement" },
      { id: "materials" },
      { id: "waiting" },
      { id: "ages" },
      { id: "schedule" },
      { id: "communication" },
      { id: "staff" },
      { id: "none", exclusive: true },
      { id: "others", opensOther: true },
    ],
  },
];

/** English labels for Excel / admin (stable, not locale-dependent). */
export const OPTION_LABELS_EN: Record<FeedbackSection, Record<FeedbackSide, Record<string, string>>> = {
  food: {
    positive: {
      taste: "Taste of food",
      sufficient: "Sufficient food",
      variety: "Menu variety",
      quality: "Food and beverage quality",
      cleanliness: "Cleanliness and hygiene",
      presentation: "Food presentation",
      service: "Food and beverage service",
      others: "Others",
    },
    improve: {
      taste: "Taste of food",
      quantity: "Food and beverage quantity",
      variety: "Menu variety",
      temperature: "Food temperature",
      cleanliness: "Cleanliness",
      waiting: "Waiting time",
      dietary: "Children's meals and special dietary options",
      none: "No improvement needed",
      others: "Others",
    },
  },
  venue: {
    positive: {
      decorations: "Beautiful decorations",
      atmosphere: "Festive atmosphere",
      venue_size: "Suitable venue size",
      crowd: "Comfortable crowd size",
      seating: "Sufficient tables and seating",
      lighting_sound: "Appropriate lighting and sound",
      layout: "Convenient venue layout",
      cleanliness_safety: "Cleanliness and safety",
      others: "Others",
    },
    improve: {
      decorations_atmosphere: "Decorations and atmosphere",
      venue_size: "Venue size",
      overcrowding: "Overcrowding",
      seating: "Tables and seating",
      lighting: "Lighting",
      music_volume: "Music volume",
      layout_access: "Layout and accessibility",
      cleanliness_safety: "Cleanliness and safety",
      none: "No improvement needed",
      others: "Others",
    },
  },
  activities: {
    positive: {
      diy_krathong: "DIY Krathong making",
      queen_contest: "Queen of Loy Krathong contest",
      dessert_workshop: "Thai dessert workshop",
      games_family: "Games and family activities",
      fun_engaging: "Fun and engaging activities",
      all_ages: "Activities suitable for all ages",
      duration: "Suitable activity duration",
      staff: "Friendly and attentive staff",
      others: "Others",
    },
    improve: {
      variety: "Variety of activities",
      engagement: "Engagement and entertainment",
      materials: "Availability of activity materials",
      waiting: "Waiting time for activities",
      ages: "Activities for children and adults",
      schedule: "Activity schedule and duration",
      communication: "Communication and registration",
      staff: "Staff assistance and service",
      none: "No improvement needed",
      others: "Others",
    },
  },
};

export const SECTION_LABELS_EN: Record<FeedbackSection, string> = {
  food: "Food & Beverages",
  venue: "Decorations, Venue & Suitability",
  activities: "Activities",
};

export const SIDE_LABELS_EN: Record<FeedbackSide, string> = {
  positive: "Positive",
  improve: "Areas for improvement",
};

export function isLoyKrathongLocationSlug(value: string): value is LoyKrathongLocationSlug {
  return LOY_KRATHONG_LOCATIONS.some((loc) => loc.slug === value);
}

export function getLoyKrathongLocation(slug: string) {
  return LOY_KRATHONG_LOCATIONS.find((loc) => loc.slug === slug) ?? null;
}

export function feedbackPublicPath(locationSlug: LoyKrathongLocationSlug, locale = "en") {
  return `/${locale}/feedback/loy-krathong-2026/${locationSlug}`;
}

export type LoyKrathongFeedbackPayload = {
  locationSlug: LoyKrathongLocationSlug;
  locale: "en" | "th" | "ru";
  foodPositive: string[];
  foodImprove: string[];
  foodPositiveOther?: string | null;
  foodImproveOther?: string | null;
  venuePositive: string[];
  venueImprove: string[];
  venuePositiveOther?: string | null;
  venueImproveOther?: string | null;
  activitiesPositive: string[];
  activitiesImprove: string[];
  activitiesPositiveOther?: string | null;
  activitiesImproveOther?: string | null;
};

export type LoyKrathongFeedbackRow = {
  id: string;
  locationSlug: LoyKrathongLocationSlug;
  locale: string;
  foodPositive: string[];
  foodImprove: string[];
  foodPositiveOther: string | null;
  foodImproveOther: string | null;
  venuePositive: string[];
  venueImprove: string[];
  venuePositiveOther: string | null;
  venueImproveOther: string | null;
  activitiesPositive: string[];
  activitiesImprove: string[];
  activitiesPositiveOther: string | null;
  activitiesImproveOther: string | null;
  submittedAt: string;
};

export type DbLoyKrathongFeedbackRow = {
  id: string;
  location_slug: string;
  locale: string;
  food_positive: string[] | null;
  food_improve: string[] | null;
  food_positive_other: string | null;
  food_improve_other: string | null;
  venue_positive: string[] | null;
  venue_improve: string[] | null;
  venue_positive_other: string | null;
  venue_improve_other: string | null;
  activities_positive: string[] | null;
  activities_improve: string[] | null;
  activities_positive_other: string | null;
  activities_improve_other: string | null;
  submitted_at: string;
};

export function mapLoyKrathongFeedbackRow(row: DbLoyKrathongFeedbackRow): LoyKrathongFeedbackRow {
  return {
    id: row.id,
    locationSlug: row.location_slug as LoyKrathongLocationSlug,
    locale: row.locale,
    foodPositive: row.food_positive ?? [],
    foodImprove: row.food_improve ?? [],
    foodPositiveOther: row.food_positive_other,
    foodImproveOther: row.food_improve_other,
    venuePositive: row.venue_positive ?? [],
    venueImprove: row.venue_improve ?? [],
    venuePositiveOther: row.venue_positive_other,
    venueImproveOther: row.venue_improve_other,
    activitiesPositive: row.activities_positive ?? [],
    activitiesImprove: row.activities_improve ?? [],
    activitiesPositiveOther: row.activities_positive_other,
    activitiesImproveOther: row.activities_improve_other,
    submittedAt: row.submitted_at,
  };
}

export function formatOptionList(section: FeedbackSection, side: FeedbackSide, ids: string[]): string {
  return ids
    .map((id) => OPTION_LABELS_EN[section][side][id] ?? id)
    .join("; ");
}

export function countSelections(
  rows: LoyKrathongFeedbackRow[],
  section: FeedbackSection,
  side: FeedbackSide
): { id: string; label: string; count: number }[] {
  const sectionDef = FEEDBACK_SECTIONS.find((s) => s.id === section)!;
  const options = side === "positive" ? sectionDef.positive : sectionDef.improve;
  const counts = new Map<string, number>();
  for (const opt of options) counts.set(opt.id, 0);

  for (const row of rows) {
    const ids =
      section === "food"
        ? side === "positive"
          ? row.foodPositive
          : row.foodImprove
        : section === "venue"
          ? side === "positive"
            ? row.venuePositive
            : row.venueImprove
          : side === "positive"
            ? row.activitiesPositive
            : row.activitiesImprove;
    for (const id of ids) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }

  return options
    .map((opt) => ({
      id: opt.id,
      label: OPTION_LABELS_EN[section][side][opt.id] ?? opt.id,
      count: counts.get(opt.id) ?? 0,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}
