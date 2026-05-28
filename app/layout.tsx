import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { SpeedInsights } from "@vercel/speed-insights/next"

export const metadata: Metadata = {
  title: "THE TITLE CLUB",
  description: "Exclusive community for The Title Residence residents",
  openGraph: {
    title: "THE TITLE CLUB",
    description: "Exclusive community for The Title Residence residents",
    type: "website",
    url: "https://thetitleresidence.com/club",
    siteName: "THE TITLE CLUB",
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
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
