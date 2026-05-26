-- Add privilege_code for partner QR scanning (run in Supabase SQL Editor).

alter table public.privileges
  add column if not exists privilege_code text;

comment on column public.privileges.privilege_code is
  'Plain-text value encoded in the redeem QR code; editable by admins.';

-- Optional sample codes for existing seed rows (adjust titles if your data differs).
update public.privileges set privilege_code = 'TTC-BDMS-15' where title = 'BDMS Private Hospital Discount' and privilege_code is null;
update public.privileges set privilege_code = 'TTC-SAWANU' where title = 'SAWANU One-Day Boat Trip' and privilege_code is null;
update public.privileges set privilege_code = 'TTC-SPLASH-10' where title = 'Splash Beach Resort Water Park' and privilege_code is null;
update public.privileges set privilege_code = 'TTC-CLEAN-10' where title = 'Villa Cleaning Service Discount' and privilege_code is null;
