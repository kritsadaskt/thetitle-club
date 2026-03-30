import { Member, Privilege, CommunityMoment } from "./types";

export const MOCK_MEMBERS: Member[] = [
  {
    id: "mem-001",
    memberId: "TTC-2024-001",
    qrToken: "TTC-QR-mem001-a1b2c3d4",
    fullName: "Somchai Jaidee",
    email: "somchai@example.com",
    phone: "+66 81 234 5678",
    whatsapp: "+66 81 234 5678",
    gender: "male",
    age: 38,
    nationality: "Thai",
    residentStatus: "owner",
    projectName: "The Title Rawai Phase 3",
    status: "active",
    createdAt: "2024-01-15T10:00:00Z",
    approvedAt: "2024-01-16T09:00:00Z",
    password: "password123",
  },
  {
    id: "mem-002",
    memberId: "TTC-2024-002",
    qrToken: "TTC-QR-mem002-e5f6g7h8",
    fullName: "Sarah Johnson",
    email: "sarah@example.com",
    phone: "+44 7911 123456",
    whatsapp: "+44 7911 123456",
    gender: "female",
    age: 45,
    nationality: "British",
    residentStatus: "owner",
    projectName: "The Title Rawai Phase 4",
    status: "active",
    createdAt: "2024-02-10T08:00:00Z",
    approvedAt: "2024-02-11T10:00:00Z",
    password: "password123",
  },
  {
    id: "mem-003",
    memberId: "TTC-2024-003",
    qrToken: "TTC-QR-mem003-i9j0k1l2",
    fullName: "Patcharee Manop",
    email: "patcharee@example.com",
    phone: "+66 89 876 5432",
    whatsapp: "+66 89 876 5432",
    gender: "female",
    age: 29,
    nationality: "Thai",
    residentStatus: "tenant",
    projectName: "The Title Serenity Bangtao",
    status: "pending_approval",
    createdAt: "2024-03-20T14:00:00Z",
    password: "password123",
  },
  {
    id: "mem-004",
    memberId: "TTC-2024-004",
    qrToken: "TTC-QR-mem004-m3n4o5p6",
    fullName: "Klaus Müller",
    email: "klaus@example.com",
    phone: "+49 151 12345678",
    whatsapp: "+49 151 12345678",
    gender: "male",
    age: 52,
    nationality: "German",
    residentStatus: "owner",
    projectName: "The Title Rawai Phase 3",
    status: "pending_approval",
    createdAt: "2024-03-22T11:00:00Z",
    password: "password123",
  },
];

export const MOCK_PRIVILEGES: Privilege[] = [
  {
    id: "priv-001",
    title: "BDMS Private Hospital Discount",
    partnerName: "Bangkok Hospital Phuket",
    partnerLogo: "https://placehold.co/120x60/1a1a2e/C9A96E?text=BDMS",
    coverImage: "https://placehold.co/800x400/1a1a2e/C9A96E?text=Bangkok+Hospital+Phuket",
    summary: "15% off room charges & medication",
    description:
      "Enjoy a 15% discount on room charges and a 15% discount on medication costs for both inpatient and outpatient services at BDMS-affiliated private hospitals in Phuket, including Bangkok Hospital Phuket.",
    terms:
      "• Valid for THE TITLE CLUB members only\n• Present your Digital Membership Card at reception\n• Discount applies to room charges and medication only\n• Cannot be combined with other promotions or insurance coverage\n• Valid for member and immediate family members",
    howToRedeem:
      "1. Open your Membership Card on the app\n2. Show the QR Code to the hospital reception\n3. Staff will verify your membership\n4. Discount will be applied to your bill",
    category: "health",
    isActive: true,
    validFrom: "2024-01-01",
    validUntil: "2024-12-31",
    sortOrder: 1,
    discountLabel: "15% OFF",
  },
  {
    id: "priv-002",
    title: "SAWANU One-Day Boat Trip",
    partnerName: "SAWANU Phuket",
    partnerLogo: "https://placehold.co/120x60/1a1a2e/C9A96E?text=SAWANU",
    coverImage: "https://placehold.co/800x400/0f3460/C9A96E?text=SAWANU+Boat+Trip",
    summary: "Special discount on island hopping day trip",
    description:
      "Receive special discounted rates on a one-day boat trip with SAWANU, perfect for island hopping, sightseeing, and relaxing by the sea around Phuket's stunning islands.",
    terms:
      "• Valid for THE TITLE CLUB members and up to 3 guests\n• Advance booking required (minimum 48 hours)\n• Subject to weather conditions\n• Life jackets provided\n• Includes snorkeling equipment",
    howToRedeem:
      "1. Contact SAWANU via Line or phone to book\n2. Mention THE TITLE CLUB membership\n3. Show your Membership Card on the day\n4. Enjoy your trip!",
    category: "lifestyle",
    isActive: true,
    validFrom: "2024-01-01",
    validUntil: "2024-12-31",
    sortOrder: 2,
    discountLabel: "Special Rate",
  },
  {
    id: "priv-003",
    title: "Splash Beach Resort Water Park",
    partnerName: "Splash Beach Resort",
    partnerLogo: "https://placehold.co/120x60/1a1a2e/C9A96E?text=Splash",
    coverImage: "https://placehold.co/800x400/16213e/C9A96E?text=Splash+Beach+Resort",
    summary: "10–15% off water park admission",
    description:
      "Get 10–15% off water park admission for walk-in guests at Splash Beach Resort, offering a fun and exciting experience for all ages with thrilling slides, lazy rivers, and kids' zones.",
    terms:
      "• Valid for walk-in guests only (not applicable for online bookings)\n• Discount applies per person\n• Maximum 5 guests per membership per visit\n• Children under 3 years old are free\n• No re-entry once exited",
    howToRedeem:
      "1. Go to the ticket counter at Splash Beach Resort\n2. Inform staff you are a THE TITLE CLUB member\n3. Show your QR Code on the Membership Card\n4. Enjoy the water park!",
    category: "lifestyle",
    isActive: true,
    validFrom: "2024-01-01",
    validUntil: "2024-12-31",
    sortOrder: 3,
    discountLabel: "10–15% OFF",
  },
  {
    id: "priv-004",
    title: "Villa Cleaning Service Discount",
    partnerName: "Clean Pro Phuket",
    partnerLogo: "https://placehold.co/120x60/1a1a2e/C9A96E?text=CleanPro",
    coverImage: "https://placehold.co/800x400/1e2a3a/C9A96E?text=Cleaning+Service",
    summary: "10% off professional villa cleaning",
    description:
      "Enjoy 10% off professional villa and condo cleaning services by Clean Pro Phuket. Experienced, insured, and trusted by The Title residents.",
    terms:
      "• Valid for THE TITLE CLUB members only\n• Minimum booking: 3-hour session\n• Discount on labor cost only\n• Advance booking required\n• Available Monday–Saturday",
    howToRedeem:
      "1. Call or Line Clean Pro Phuket to schedule\n2. Mention THE TITLE CLUB membership\n3. Staff will verify at time of service\n4. Discount applied to invoice",
    category: "service",
    isActive: true,
    validFrom: "2024-01-01",
    sortOrder: 4,
    discountLabel: "10% OFF",
  },
];

export const MOCK_COMMUNITY: CommunityMoment[] = [
  {
    id: "cm-001",
    imageUrl: "https://placehold.co/800x600/0f1923/C9A96E?text=New+Year+Party+2024",
    caption: "New Year Celebration 2024",
    eventDate: "2024-01-01",
    isPublished: true,
    sortOrder: 1,
  },
  {
    id: "cm-002",
    imageUrl: "https://placehold.co/800x600/16213e/C9A96E?text=Pool+Party",
    caption: "Summer Pool Party",
    eventDate: "2024-03-15",
    isPublished: true,
    sortOrder: 2,
  },
  {
    id: "cm-003",
    imageUrl: "https://placehold.co/800x600/1a1a2e/C9A96E?text=BBQ+Evening",
    caption: "Resident BBQ Evening",
    eventDate: "2024-05-20",
    isPublished: true,
    sortOrder: 3,
  },
  {
    id: "cm-004",
    imageUrl: "https://placehold.co/800x600/0f3460/C9A96E?text=Songkran+Festival",
    caption: "Songkran Festival",
    eventDate: "2024-04-13",
    isPublished: true,
    sortOrder: 4,
  },
  {
    id: "cm-005",
    imageUrl: "https://placehold.co/800x600/16213e/C9A96E?text=Yoga+Morning",
    caption: "Morning Yoga by the Pool",
    eventDate: "2024-06-01",
    isPublished: true,
    sortOrder: 5,
  },
  {
    id: "cm-006",
    imageUrl: "https://placehold.co/800x600/0f1923/C9A96E?text=Sunset+Drinks",
    caption: "Resident Sunset Gathering",
    eventDate: "2024-07-12",
    isPublished: true,
    sortOrder: 6,
  },
];

// Simulate auth: find member by email + password
export function findMemberByCredentials(email: string, password: string): Member | null {
  return MOCK_MEMBERS.find(
    (m) => m.email === email && m.password === password && m.status === "active"
  ) ?? null;
}
