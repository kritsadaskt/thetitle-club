import type { Metadata } from "next";
import { Noto_Sans, Noto_Sans_Thai, Noto_Serif, Noto_Serif_Thai } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { SpeedInsights } from "@vercel/speed-insights/next";

const notoSans = Noto_Sans({
  subsets: ["latin", "cyrillic"],
  variable: "--font-noto-sans",
  display: "swap",
});

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai"],
  variable: "--font-noto-sans-thai",
  display: "swap",
});

const notoSerif = Noto_Serif({
  subsets: ["latin", "cyrillic"],
  variable: "--font-noto-serif",
  display: "swap",
});

const notoSerifThai = Noto_Serif_Thai({
  subsets: ["thai"],
  variable: "--font-noto-serif-thai",
  display: "swap",
});

export const metadata: Metadata = {
  title: "THE TITLE",
  description: "Exclusive community for The Title Residence residents",
  openGraph: {
    title: "THE TITLE",
    description: "Exclusive community for The Title Residence residents",
    type: "website",
    url: "https://thetitleresidence.com/club",
    siteName: "THE TITLE",
    locale: "en_US",
    images: [
      {
        url: "/club/thetitle-club_og.jpg",
        width: 1200,
        height: 630,
      },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${notoSans.variable} ${notoSansThai.variable} ${notoSerif.variable} ${notoSerifThai.variable} font-sans`}
      >
        <AuthProvider>{children}</AuthProvider>
        <SpeedInsights scriptSrc="/club/_vercel/speed-insights/script.js" />
      </body>
    </html>
  );
}
