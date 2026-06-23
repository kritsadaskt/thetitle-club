import { Member, Privilege, CommunityMoment, Partner } from "./types";

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
      "• Valid for THE TITLE members only\n• Present your Digital Membership Card at reception\n• Discount applies to room charges and medication only\n• Cannot be combined with other promotions or insurance coverage\n• Valid for member and immediate family members",
    howToRedeem:
      "1. Open your Membership Card on the app\n2. Show the QR Code to the hospital reception\n3. Staff will verify your membership\n4. Discount will be applied to your bill",
    category: "health",
    isActive: true,
    validFrom: "2024-01-01",
    validUntil: "2024-12-31",
    sortOrder: 1,
    discountLabel: "15% OFF",
    privilegeCode: "TTC-BDMS-15",
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
      "• Valid for THE TITLE members and up to 3 guests\n• Advance booking required (minimum 48 hours)\n• Subject to weather conditions\n• Life jackets provided\n• Includes snorkeling equipment",
    howToRedeem:
      "1. Contact SAWANU via Line or phone to book\n2. Mention THE TITLE membership\n3. Show your Membership Card on the day\n4. Enjoy your trip!",
    category: "lifestyle",
    isActive: true,
    validFrom: "2024-01-01",
    validUntil: "2024-12-31",
    sortOrder: 2,
    discountLabel: "Special Rate",
    privilegeCode: "TTC-SAWANU",
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
      "1. Go to the ticket counter at Splash Beach Resort\n2. Inform staff you are a THE TITLE member\n3. Show your QR Code on the Membership Card\n4. Enjoy the water park!",
    category: "lifestyle",
    isActive: true,
    validFrom: "2024-01-01",
    validUntil: "2024-12-31",
    sortOrder: 3,
    discountLabel: "10–15% OFF",
    privilegeCode: "TTC-SPLASH-10",
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
      "• Valid for THE TITLE members only\n• Minimum booking: 3-hour session\n• Discount on labor cost only\n• Advance booking required\n• Available Monday–Saturday",
    howToRedeem:
      "1. Call or Line Clean Pro Phuket to schedule\n2. Mention THE TITLE membership\n3. Staff will verify at time of service\n4. Discount applied to invoice",
    category: "service",
    isActive: true,
    validFrom: "2024-01-01",
    sortOrder: 4,
    discountLabel: "10% OFF",
    privilegeCode: "TTC-CLEAN-10",
  },
];

export const MOCK_COMMUNITY: CommunityMoment[] = [
  {
    id: "cm-001",
    imageUrl: "https://scontent.fbkk5-6.fna.fbcdn.net/v/t39.30808-6/611271949_122217486842052360_4965096532042243705_n.jpg?_nc_cat=102&ccb=1-7&_nc_sid=7b2446&_nc_ohc=0EZz22tSYmoQ7kNvwGkCKRV&_nc_oc=AdqdHjyvTHATz6e_e0FvwHeGTxkdwugDmo08vmS-gT-1YsIM0xxAG-J0rm7QLs6WG2c&_nc_zt=23&_nc_ht=scontent.fbkk5-6.fna&_nc_gid=lU57yjCr3nTShmBXE-E9bg&_nc_ss=7a3a8&oh=00_Af2Y3oA8BAFR1ddaKgZ1maDOYLi5vgWUIrtYtyNq1Hh0QQ&oe=69DBA34F",
    caption: "Excepteur sint occaecat",
    eventDate: "2024-01-01",
    isPublished: true,
    sortOrder: 1,
  },
  {
    id: "cm-002",
    imageUrl: "https://scontent.fbkk5-4.fna.fbcdn.net/v/t39.30808-6/615892107_122218279382052360_1583726914096791565_n.jpg?_nc_cat=103&ccb=1-7&_nc_sid=13d280&_nc_ohc=-6cfErSZeL4Q7kNvwEtELFm&_nc_oc=AdqIqhmLBOlHoKviSYiqOFYJSBFmo64-2toyEPnhw7I5nX4SJKt6NHNNswD7E0o5Sls&_nc_zt=23&_nc_ht=scontent.fbkk5-4.fna&_nc_gid=rI5MoLwOJRAIcS30tmDGEg&_nc_ss=7a3a8&oh=00_Af2uSdH0qhk2gv3DmDiY2xcfhWbPLk6BWD-LWasEqnPPdg&oe=69DB94F6",
    caption: "Sed ut perspiciatis unde omnis",
    eventDate: "2024-03-15",
    isPublished: true,
    sortOrder: 2,
  },
  {
    id: "cm-003",
    imageUrl: "https://scontent.fbkk5-3.fna.fbcdn.net/v/t39.30808-6/660513107_122225301938052360_5281109952698241705_n.jpg?_nc_cat=105&ccb=1-7&_nc_sid=13d280&_nc_ohc=JfuYg2xrjk0Q7kNvwFgmVRd&_nc_oc=AdqHUxjY43eI9l6FUbOPn2sPinWsgID6YGcSs5CEvDCxpB7muS-WhR9SwudR9Pn2-3g&_nc_zt=23&_nc_ht=scontent.fbkk5-3.fna&_nc_gid=ZLmN6plFS1HNkIzBOrJcnQ&_nc_ss=7a3a8&oh=00_Af0Jz0Rcb2dVe5FCjXt-CP0fNYFpuZbTWDXHPlHK0ZwH7g&oe=69DB9DFE",
    caption: "exercitationem ullam corporis",
    eventDate: "2024-05-20",
    isPublished: true,
    sortOrder: 3,
  },
  {
    id: "cm-004",
    imageUrl: "https://scontent.fbkk5-6.fna.fbcdn.net/v/t39.30808-6/579093416_122211860516052360_3999910566976489382_n.jpg?_nc_cat=101&ccb=1-7&_nc_sid=7b2446&_nc_ohc=l0xR2AjVbL8Q7kNvwHbGlKD&_nc_oc=AdoKkT983O7ZqbQMzBLDe60zdyuETjoLgWlGqSbV0S3amnbBbKPRsBlrE_3InsY13-g&_nc_zt=23&_nc_ht=scontent.fbkk5-6.fna&_nc_gid=bNHKSQZPYPFSQRT_RHI6JQ&_nc_ss=7a3a8&oh=00_Af2nUvhjSsdw4ztLV6PNhuonFSWh23MfFvydscwkVyx3bw&oe=69DB90B1",
    caption: "Lorem ipsum dolor sit amet",
    eventDate: "2024-04-13",
    isPublished: true,
    sortOrder: 4,
  },
  {
    id: "cm-005",
    imageUrl: "https://scontent.fbkk5-4.fna.fbcdn.net/v/t51.82787-15/587552880_17928308682154155_2403100673086112784_n.jpg?_nc_cat=103&ccb=1-7&_nc_sid=13d280&_nc_ohc=pJysTBnFCAYQ7kNvwHTInJl&_nc_oc=Ado69CzrvrS76UHqrfk65boULw_zql4jFzXXhLsTvAuqlrnqFFnbQJCCdqwhh993Kb0&_nc_zt=23&_nc_ht=scontent.fbkk5-4.fna&_nc_gid=h_kRDsGYyE3ygHmI545HVw&_nc_ss=7a3a8&oh=00_Af2B2E2ZBz-MEwpY7a4j9ODEnxl0ya_WTP5lcGcwLwGoZA&oe=69DBB5A3",
    caption: "Nemo enim ipsam voluptatem",
    eventDate: "2024-06-01",
    isPublished: true,
    sortOrder: 5,
  },
  {
    id: "cm-006",
    imageUrl: "https://placehold.co/800x600/0f1923/C9A96E?text=Sunset+Drinks",
    caption: "Neque porro quisquam est, qui dolorem ipsum quia",
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

export const MOCK_PARTNERS: Partner[] = [
  {
    id: "001",
    name: "Intercontinental Phuket",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/2/2c/F05237-3d-logo1-rgb-lp.png",
    link: "",
  },
  {
    id: "002",
    name: "SAWANU Phuket",
    imageUrl: "https://thanyapura.com/wp-content/uploads/sites/37/2025/01/Thanyapura_Portrait.svg",
    link: "https://www.sawanuphuket.com",
  },
  {
    id: "003",
    name: "BDMS",
    imageUrl: "https://upload.wikimedia.org/wikipedia/en/thumb/4/4a/BDMS_Logo.svg/1280px-BDMS_Logo.svg.png",
    link: "https://bdms.co.th/",
  },
  {
    id: "004",
    name: "Splash Beach Resort",
    imageUrl: "https://assets-au-01.kc-usercontent.com/8501b3be-ee9d-02d5-1c38-08f2f60063fa/a7203ef6-ab12-4d4c-9290-f9f7c5daa7f5/VTL%20Phuket%20Logo%201.png",
    link: "https://www.splashbeachresort.com",
  },
  {
    id: "005",
    name: "Clean Pro Phuket",
    imageUrl: "https://lirp.cdn-website.com/4246b69b/dms3rep/multi/opt/357091694_662318679261116_4935783886843566529_n-96c537a8-640w.png",
    link: "https://www.cleanprophuket.com",
  },
  {
    id: "006",
    name: "Phuket Vegetarian Festival",
    imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR8GqCEcxwuljDVRvuyVBbX_uZq1TheVaTKoA&s",
    link: "https://www.phuketvegetarianfestival.com",
  },
  {
    id: "007",
    name: "Phuket Vegetarian Festival",
    imageUrl: "https://cdn.shopify.com/s/files/1/0262/7741/2898/files/D_C_NEW_LOGO_1.png?height=628&pad_color=fff&v=1635475374&width=1200",
    link: "https://www.phuketvegetarianfestival.com",
  },
  {
    id: "008",
    name: "Phuket Vegetarian Festival",
    imageUrl: "https://static.wixstatic.com/media/5bf034_4b243907dd0a46eba34ad47ebbde8152~mv2.png",
    link: "https://www.phuketvegetarianfestival.com",
  },
];