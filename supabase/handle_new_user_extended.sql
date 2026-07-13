-- Profile fields are filled from auth.users.raw_user_meta_data on signUp.
-- New members start as pending_approval (admin must approve before login).
-- Run in Supabase SQL Editor after schema.sql.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    full_name,
    email,
    gender,
    age,
    nationality,
    phone,
    whatsapp,
    resident_status,
    project_name,
    status
  )
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), split_part(new.email, '@', 1)),
    new.email,
    case
      when new.raw_user_meta_data->>'gender' in ('male', 'female', 'other')
      then (new.raw_user_meta_data->>'gender')::gender_type
      else null
    end,
    case
      when (new.raw_user_meta_data->>'age') ~ '^[0-9]+$'
      then (new.raw_user_meta_data->>'age')::smallint
      else null
    end,
    nullif(trim(new.raw_user_meta_data->>'nationality'), ''),
    nullif(trim(new.raw_user_meta_data->>'phone'), ''),
    nullif(trim(new.raw_user_meta_data->>'whatsapp'), ''),
    case
      when new.raw_user_meta_data->>'resident_status' in ('owner', 'tenant')
      then (new.raw_user_meta_data->>'resident_status')::resident_status
      else null
    end,
    nullif(trim(new.raw_user_meta_data->>'project_name'), ''),
    'pending_approval'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
