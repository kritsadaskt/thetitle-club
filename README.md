# THE TITLE CLUB — Next.js App

Exclusive membership portal for The Title Residence residents.
Served at `thetitleresidence.com/club` via Cloudflare Worker reverse proxy.

## Quick Start

```bash
cd the-title-club
npm install --legacy-peer-deps
npm run dev
```

> **Note:** ต้องใช้ `--legacy-peer-deps` เนื่องจาก Next.js 16 ต้องการ eslint ^9 แต่ eslint-config-next มี peer dependency ที่ conflicting กัน

Open [http://localhost:3000/club](http://localhost:3000/club)

---

## Demo Accounts

| Role   | Email                          | Password   |
|--------|--------------------------------|------------|
| Member | somchai@example.com            | password123 |
| Member | sarah@example.com              | password123 |
| Admin  | admin@thetitleresidence.com    | admin123   |

---

## Project Structure

```
the-title-club/
├── app/
│   ├── page.tsx                          # Landing page (/)
│   ├── (auth)/
│   │   ├── login/page.tsx                # /login
│   │   └── register/page.tsx             # /register
│   ├── (member)/
│   │   ├── layout.tsx                    # Protected layout + sidebar nav
│   │   ├── dashboard/page.tsx            # /dashboard
│   │   ├── card/page.tsx                 # /card  — Digital membership card + QR
│   │   ├── privileges/
│   │   │   ├── page.tsx                  # /privileges — Listing + filter
│   │   │   └── [id]/
│   │   │       ├── page.tsx              # /privileges/:id — Detail
│   │   │       └── redeem/page.tsx       # /privileges/:id/redeem — Full-screen QR
│   │   ├── community/page.tsx            # /community — Gallery + lightbox
│   │   └── profile/page.tsx             # /profile
│   └── (admin)/
│       └── admin/page.tsx               # /admin — Member approval + privilege mgmt
├── lib/
│   ├── types.ts                         # TypeScript interfaces
│   ├── mock-data.ts                     # Mock members, privileges, community
│   ├── auth-context.tsx                 # Auth state (localStorage-based mock)
│   └── utils.ts                         # cn(), formatDate(), categoryLabel()
├── next.config.ts                       # basePath: '/club'
└── tailwind.config.ts                  # Gold + Navy theme
```

---

## Architecture

```
thetitleresidence.com        ← WordPress on Shared Hosting
         │
         │  /club/*
         ▼
Cloudflare Worker            ← reverse proxy
         │
         ▼
This Next.js App             ← Cloud Server (Vercel / Railway / VPS)
(basePath: '/club')
```

### Cloudflare Worker (example)

```js
export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/club')) {
      return fetch('https://your-cloud-server.com' + url.pathname + url.search, {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });
    }
    return fetch(request); // WordPress
  }
}
```

---

## Key Features

- **Landing Page** — Hero, Community gallery preview, Privileges preview, CTA
- **Registration** — Multi-step form with validation + PDPA consent
- **Login** — Email/password with status-aware errors
- **Member Dashboard** — Quick access, featured privileges, community snapshot
- **Digital Membership Card** — QR Code generation (unique per member)
- **Privileges** — Search + category filter, detail view
- **Redeem Screen** — Full-screen QR with real-time clock, no distractions
- **Community Gallery** — Masonry grid + lightbox
- **Admin Panel** — Member approval/rejection, privilege management

---

## Next Steps (Backend Integration)

1. Replace `lib/mock-data.ts` with real API calls
2. Replace `lib/auth-context.tsx` with NextAuth.js or JWT
3. Use `qrtoken` from DB (not hardcoded)
4. Add email service (Resend / SendGrid) for verification & welcome emails
5. Deploy to Vercel/Railway, point Cloudflare Worker proxy

---

## Tech Stack

| Layer     | Technology          |
|-----------|---------------------|
| Framework | Next.js 14 App Router |
| Styling   | Tailwind CSS (dark luxury theme) |
| QR Code   | qrcode.react        |
| Icons     | lucide-react        |
| Auth      | Mock (→ replace with NextAuth) |
| DB        | Mock (→ replace with PostgreSQL) |
