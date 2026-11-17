-- Add display name for staff portal login (name + username + password).
-- Run in Supabase SQL Editor, then Redeploy Vercel.

alter table public.staff_users
  add column if not exists display_name text;

update public.staff_users
set display_name = username
where display_name is null or btrim(display_name) = '';

alter table public.staff_users
  alter column display_name set default '';

do $$
begin
  -- Backfill complete; enforce non-empty for new rows via app validation.
  -- Keep column nullable-safe for any race during migrate; app requires it on create/login.
  null;
end $$;

comment on column public.staff_users.display_name is
  'Human display name required at login together with username + password.';
