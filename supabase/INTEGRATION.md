# Supabase Integration Guide — The Title Club

## 1. Apply Schema

Supabase Dashboard → **SQL Editor** → วาง `schema.sql` ทั้งหมดแล้วกด Run

---

## 2. Install Client

```bash
npm install @supabase/supabase-js --legacy-peer-deps
```

---

## 3. Environment Variables

สร้างไฟล์ `.env.local` ที่ root ของ project:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

ค่าเหล่านี้อยู่ใน Supabase Dashboard → **Settings → API**

---

## 4. สร้าง Supabase Client

สร้างไฟล์ `lib/supabase.ts`:

```ts
import { createBrowserClient } from "@supabase/ssr";

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

---

## 5. แทนที่ Auth Context

`lib/auth-context.tsx` — เปลี่ยนจาก mock เป็น Supabase Auth:

```ts
// Login
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});

// Get current user profile
const { data: profile } = await supabase
  .from("profiles")
  .select("*")
  .eq("id", data.user.id)
  .single();

// Logout
await supabase.auth.signOut();

// Listen to auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  // update context state
});
```

---

## 6. แทนที่ Mock Data

### Privileges (แทน `MOCK_PRIVILEGES`)
```ts
const { data: privileges } = await supabase
  .from("privileges")
  .select("*")
  .eq("is_active", true)
  .order("sort_order");
```

### Community Moments (แทน `MOCK_COMMUNITY`)
```ts
const { data: moments } = await supabase
  .from("community_moments")
  .select("*")
  .eq("is_published", true)
  .order("sort_order");
```

### Admin: Members List
```ts
const { data: members } = await supabase
  .from("profiles")
  .select("*")
  .order("created_at", { ascending: false });
```

### Admin: Approve Member
```ts
await supabase
  .from("profiles")
  .update({
    status: "active",
    approved_at: new Date().toISOString(),
    approved_by: adminUserId,
  })
  .eq("id", memberId);
```

---

## 7. Registration Flow

Registration form → `supabase.auth.signUp()` → Supabase ส่ง email verification → trigger `on_auth_user_created` สร้าง profile row อัตโนมัติ → admin approve

```ts
// register/page.tsx
const { data, error } = await supabase.auth.signUp({
  email: form.email,
  password: form.password, // ต้องเพิ่ม password field ใน form
  options: {
    data: { full_name: form.fullName }, // ส่งเข้า raw_user_meta_data
    emailRedirectTo: `${window.location.origin}/club/verify`,
  },
});

// หลัง signUp สำเร็จ → update profile ด้วยข้อมูล form ที่เหลือ
await supabase.from("profiles").update({
  gender: form.gender,
  age: parseInt(form.age),
  nationality: form.nationality,
  phone: form.phone,
  whatsapp: form.whatsapp,
  resident_status: form.residentStatus,
  project_name: form.projectName,
}).eq("id", data.user!.id);
```

---

## 8. Log Redemption

```ts
// privileges/[id]/redeem/page.tsx
await supabase.from("redemption_logs").insert({
  member_id: currentUser.id,
  privilege_id: privilegeId,
  method: "qr",
});
```

---

## 9. Admin User

หลัง apply schema → สมัคร account ปกติ → ไปที่ SQL Editor แล้วรัน:

```sql
update profiles set is_admin = true
where id = (
  select id from auth.users where email = 'admin@thetitleresidence.com'
);
```

---

## 10. Storage (ถ้าต้องการ upload รูป)

Supabase Dashboard → **Storage** → New bucket ชื่อ `club-assets` (public)

```ts
// Upload partner logo
const { data } = await supabase.storage
  .from("club-assets")
  .upload(`logos/${file.name}`, file);

const publicUrl = supabase.storage
  .from("club-assets")
  .getPublicUrl(data!.path).data.publicUrl;
```

---

## ลำดับการทำ (Recommended Order)

1. Run `schema.sql` ใน Supabase
2. Install `@supabase/supabase-js`
3. สร้าง `.env.local`
4. สร้าง `lib/supabase.ts`
5. เพิ่ม `password` field ใน registration form
6. แทนที่ `auth-context.tsx`
7. แทนที่ data fetching ทีละหน้า (Privileges → Community → Admin)
8. ตั้ง admin user ด้วย SQL
